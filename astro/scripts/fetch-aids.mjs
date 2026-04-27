#!/usr/bin/env node
/**
 * AjutsCat — daily fetcher.
 *
 * Runs in GitHub Actions (cron 08:00 Europe/Madrid). Does four things:
 *
 * 1) UPDATE existing aids.
 *    For each .md with a bdns_id, queries BDNS and patches volatile fields
 *    (estado, fecha_apertura, fecha_cierre, ultima_actualizacion,
 *    fetcher_last_ok). Handwritten fields (requisitos, documentacion,
 *    subtitle, etc.) are NEVER touched.
 *
 * 2) STALE detection.
 *    If fetch fails and fetcher_last_ok is >48h old → stale:true.
 *    UI shows a yellow badge + banner ("principio rector: nunca mentir").
 *
 * 3) ARCHIVE old aids.
 *    If estado=cerrada and fecha_cierre was >90 days ago → archivada:true.
 *    Archived aids are hidden from home but URLs keep working (key for
 *    the WhatsApp-sharing habit mentioned in the brief).
 *
 * 4) DISCOVER new convocatorias.
 *    Queries BDNS search for Catalunya-relevant organs + materias.
 *    For each hit not already in content/aids/, writes a GitHub Issue
 *    to $ISSUES_OUT (json lines, one per issue), consumed by the
 *    workflow step that calls the GitHub API to actually file them.
 *    We NEVER auto-create .md files — humans review and publish.
 *
 * Env:
 *   ISSUES_OUT=tmp/new-convocatorias.jsonl  (for workflow to read)
 *
 * CLI:
 *   --dry-run         don't write files or issue records
 *   --id=ID           only process this aid
 *   --skip-discovery  skip step 4 (useful in tests)
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

// ——— Config ———

const AIDS_DIR = 'src/content/aids';
const TODAY = new Date().toISOString().slice(0, 10);
const STALE_THRESHOLD_HOURS = 48;
const ARCHIVE_AFTER_DAYS = 90;
const ISSUES_OUT = process.env.ISSUES_OUT || 'tmp/new-convocatorias.jsonl';

// BDNS — official public API, no auth.
// Docs: https://www.infosubvenciones.es/bdnstrans/GE/es/api
const BDNS = 'https://www.infosubvenciones.es/bdnstrans/api';

// Relevant organs for Catalunya. BDNS stores names in Spanish uppercase
// (e.g. "CATALUÑA", "DIPUTACIÓN PROVINCIAL DE BARCELONA") — include both
// Catalan and Spanish forms since isRelevant() lowercases before matching.
const CATALAN_ORGANS_HINTS = [
  'cataluña', 'catalunya',
  'generalitat',
  'consorci de l\'habitatge', 'consorcio de la vivienda',
  'ajuntament de barcelona', 'ayuntamiento de barcelona',
  'diputació de barcelona', 'diputación provincial de barcelona',
  'institut català',
  'agència de l\'habitatge', 'agencia de la vivienda',
];
// Materias de interés (mapeo conceptual — BDNS usa un árbol de sectores).
const MATERIAS_INTERES = [
  'vivienda', 'habitatge', 'alquiler', 'lloguer',
  'educación', 'estudios', 'beca', 'universitat',
  'autónomo', 'autonomo', 'emprendimiento', 'trabajador',
];
// Ministerio de Vivienda — nacionales, aplican a catalanes también.
const STATE_ORGANS_HINTS = ['ministerio de vivienda', 'ministerio para la transición'];

// ——— CLI ———

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const SKIP_DISCOVERY = args.includes('--skip-discovery');
const ONE_ID = (args.find(a => a.startsWith('--id=')) || '').split('=')[1] || null;

// ——— Minimal YAML patcher (no deps) ———

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('Missing frontmatter');
  const yaml = m[1];
  const fm = {};
  for (const line of yaml.split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) {
      const v = kv[2].trim();
      if (v && !v.startsWith('[') && !v.startsWith('-')) {
        fm[kv[1]] = v.replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return { fm, rawYaml: yaml, body: m[2] };
}

function patchYaml(rawYaml, patch) {
  let out = rawYaml;
  for (const [k, v] of Object.entries(patch)) {
    const esc = typeof v === 'boolean' || typeof v === 'number' ? String(v) : (typeof v === 'string' ? v : JSON.stringify(v));
    const re = new RegExp(`^(${k}:).*$`, 'm');
    if (re.test(out)) out = out.replace(re, `$1 ${esc}`);
    else out += `\n${k}: ${esc}`;
  }
  return out;
}

// ——— BDNS adapter ———

async function bdnsFetch(bdnsId) {
  // Detail endpoint. vpd=GE (General) is the only public portal.
  // Shape verified against live API 2026-04-21: returns a bare object
  // with fechaInicioSolicitud/fechaFinSolicitud and organo.nivel{1,2,3}.
  // codigoBDNS in the response matches the numConv we sent.
  const url = `${BDNS}/convocatorias?numConv=${encodeURIComponent(bdnsId)}&vpd=GE`;
  const res = await fetch(url, { headers: { Accept: 'application/json' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`BDNS ${bdnsId}: HTTP ${res.status}`);
  const data = await res.json();
  if (!data || data.codigo === 'ERR_VALIDACION') throw new Error(`BDNS ${bdnsId}: ${data?.errores?.join('; ') || 'empty response'}`);
  const apertura = data.fechaInicioSolicitud || data.fechaRecepcion;
  const cierre   = data.fechaFinSolicitud;
  if (!apertura || !cierre) throw new Error(`BDNS ${bdnsId}: missing solicitud dates (maybe text-only window)`);
  return {
    fecha_apertura: String(apertura).slice(0, 10),
    fecha_cierre: String(cierre).slice(0, 10),
    organo: data.organo?.nivel3 || data.organo?.nivel2 || data.organo?.nivel1 || '',
    titulo: data.descripcion || '',
  };
}

async function bdnsSearch(page = 0, pageSize = 50, descripcion = null) {
  // Paginated search ordered by reception date desc (most recent first).
  // Pass `descripcion` for server-side text filtering (the API honors this);
  // without it we get the global feed where Catalunya items are sparse.
  const params = new URLSearchParams({
    page, pageSize,
    order: 'fechaRecepcion', direccion: 'desc', vpd: 'GE',
  });
  if (descripcion) params.set('descripcion', descripcion);
  const res = await fetch(`${BDNS}/convocatorias/busqueda?${params}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`BDNS search: HTTP ${res.status}`);
  const raw = await res.json();
  return raw?.content || [];
}

// Topic queries — server-side filter by descripcion. Each query returns
// ~30 hits; the union (after Catalan-organ + dedupe filtering) is what
// goes to issues. Verified empirically: this surfaces ~20 real Catalan
// candidates vs. the 0 we got from scanning 150 of the global feed.
const DISCOVER_QUERIES = [
  'lloguer', 'alquiler', 'habitatge', 'vivienda',
  'rehabilitació', 'rehabilitacion',
  'beca', 'jove', 'joven',
  'autònom', 'autonomo', 'emprendimiento',
];

// ——— Core helpers ———

function computeStatus(apertura, cierre, today = TODAY) {
  if (today < apertura) return 'proxima';
  if (today > cierre) return 'cerrada';
  return 'abierta';
}

function daysBetween(a, b) {
  // Inclusive: a window of 2026-03-09 → 2026-03-13 is 5 days (both endpoints count).
  // Matches how the admin/historico phrases "hasta el X" in Spanish convocatorias.
  return Math.round((new Date(b) - new Date(a)) / 86400000) + 1;
}

function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function isRelevant(conv) {
  // Search items are flat: nivel1/2/3 + descripcion (no organo wrapper, no titulo).
  const t = `${conv.nivel1 || ''} ${conv.nivel2 || ''} ${conv.nivel3 || ''} ${conv.descripcion || ''}`.toLowerCase();
  const isCatalan = [...CATALAN_ORGANS_HINTS, ...STATE_ORGANS_HINTS]
    .some(h => t.includes(h.toLowerCase()));
  const isInteresante = MATERIAS_INTERES.some(m => t.includes(m));
  return isCatalan && isInteresante;
}

// ——— Steps ———

async function stepUpdate() {
  const files = (await readdir(AIDS_DIR)).filter(f => f.endsWith('.md'));
  let changed = 0;
  for (const file of files) {
    const path = join(AIDS_DIR, file);
    const src = await readFile(path, 'utf8');
    const { fm, rawYaml, body } = parseFrontmatter(src);
    if (ONE_ID && fm.id !== ONE_ID) continue;

    const patch = { ultima_actualizacion: TODAY };
    let ok = false;

    if (fm.bdns_id) {
      try {
        const data = await bdnsFetch(fm.bdns_id);
        patch.fecha_apertura = data.fecha_apertura;
        patch.fecha_cierre = data.fecha_cierre;
        patch.duracion_ventana_dias = daysBetween(data.fecha_apertura, data.fecha_cierre);
        patch.estado = computeStatus(data.fecha_apertura, data.fecha_cierre);
        patch.fetcher_last_ok = new Date().toISOString();
        patch.stale = false;
        ok = true;
      } catch (e) {
        console.warn(`[${fm.id}] fetch failed:`, e.message);
      }
    }

    // Stale flag — independent of whether we have a bdns_id
    if (!ok) {
      const lastOk = fm.fetcher_last_ok ? new Date(fm.fetcher_last_ok) : null;
      const hoursSince = lastOk ? (Date.now() - lastOk.getTime()) / 3600000 : Infinity;
      if (fm.bdns_id && hoursSince > STALE_THRESHOLD_HOURS) patch.stale = true;
    }

    // Archive flag — no API needed, just clock math
    const cierre = patch.fecha_cierre || fm.fecha_cierre;
    const estado = patch.estado || fm.estado;
    if (estado === 'cerrada' && cierre && daysSince(cierre) > ARCHIVE_AFTER_DAYS) {
      patch.archivada = true;
    }

    // Recompute estado from dates even without fetch (so yesterday's
    // "abierta" rolls to "cerrada" at midnight without waiting for a
    // successful scrape).
    if ((fm.fecha_apertura || patch.fecha_apertura) && (fm.fecha_cierre || patch.fecha_cierre)) {
      const s = computeStatus(patch.fecha_apertura || fm.fecha_apertura, patch.fecha_cierre || fm.fecha_cierre);
      if (s !== fm.estado) patch.estado = s;
    }

    const newYaml = patchYaml(rawYaml, patch);
    const next = `---\n${newYaml}\n---\n${body}`;
    if (next !== src) {
      if (!DRY) await writeFile(path, next, 'utf8');
      console.log(`${DRY ? '· [dry]' : '✓'} [${fm.id}] ${Object.keys(patch).join(', ')}`);
      changed++;
    }
  }
  console.log(`\nstep 1-3 (update/stale/archive): ${changed} file(s) ${DRY ? 'would change' : 'touched'}`);
}

async function stepDiscover() {
  if (SKIP_DISCOVERY) return;
  const files = (await readdir(AIDS_DIR)).filter(f => f.endsWith('.md'));
  const known = new Set();
  for (const f of files) {
    const src = await readFile(join(AIDS_DIR, f), 'utf8');
    const m = src.match(/^bdns_id:\s*(.*)$/m);
    if (m) known.add(m[1].trim().replace(/^['"]|['"]$/g, ''));
  }

  // Run topic queries serially (BDNS rate-limits at ~10 req/s and 429s
  // any burst). Merge into a single map keyed by numeroConvocatoria.
  const seen = new Map();
  for (const q of DISCOVER_QUERIES) {
    let chunk;
    try {
      chunk = await bdnsSearch(0, 30, q);
    } catch (e) {
      console.warn(`discovery query "${q}" failed:`, e.message);
      continue;
    }
    for (const c of chunk) {
      const id = String(c.numeroConvocatoria || '');
      if (!id || seen.has(id) || known.has(id)) continue;
      // Skip very old items (>2 years) — they're typically conventions/extensions.
      if (c.fechaRecepcion && c.fechaRecepcion < '2024-01-01') continue;
      if (!isRelevant(c)) continue;
      seen.set(id, c);
    }
  }
  const relevant = [...seen.values()];

  if (!relevant.length) {
    console.log('step 4 (discovery): no new relevant convocatorias');
    return;
  }

  await mkdir(dirname(ISSUES_OUT), { recursive: true });
  const lines = relevant.map(c => JSON.stringify({
    title: `[ajut] ${c.descripcion || 'Convocatòria detectada'}`.slice(0, 120),
    body: [
      '**Nova convocatòria detectada pel fetcher BDNS.**',
      '',
      `- **BDNS ID:** \`${c.numeroConvocatoria}\``,
      `- **Organisme:** ${[c.nivel3, c.nivel2, c.nivel1].filter(Boolean).join(' · ') || '?'}`,
      `- **Títol:** ${c.descripcion || '?'}`,
      `- **Fetxa publicació:** ${c.fechaRecepcion || '?'}`,
      '',
      'Accions per afegir-la al catàleg:',
      '1. Validar que realment aplica a Catalunya + és rellevant',
      '2. Crear `src/content/aids/<id>.md` seguint la plantilla',
      '3. Afegir `bdns_id` perquè el fetcher la mantingui viva',
      '4. Tancar aquesta issue',
      '',
      '_Generat automàticament per `scripts/fetch-aids.mjs`._',
    ].join('\n'),
    labels: ['new-aid', 'auto-detected'],
  }));
  if (!DRY) await writeFile(ISSUES_OUT, lines.join('\n') + '\n', 'utf8');
  console.log(`step 4 (discovery): ${relevant.length} new convocatorias → ${ISSUES_OUT}`);
}

// ——— Main ———

(async () => {
  await stepUpdate();
  await stepDiscover();
  console.log('\ndone.');
})().catch(e => { console.error(e); process.exit(1); });
