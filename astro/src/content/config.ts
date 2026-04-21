import { defineCollection, z } from 'astro:content';

// YAML auto-parses unquoted ISO dates/timestamps as JS Date objects.
// These helpers accept either form and normalize to strings so authors
// don't have to quote every date in frontmatter.
const isoDate = z.union([z.string(), z.date()]).transform(v =>
  typeof v === 'string' ? v : v.toISOString().slice(0, 10)
);
const isoTimestamp = z.union([z.string(), z.date()]).transform(v =>
  typeof v === 'string' ? v : v.toISOString()
);

// Zod schema — the single source of truth for aid data.
// The fetcher writes frontmatter that MUST validate against this.
const aids = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    nombre_ca: z.string(),
    nombre_es: z.string(),
    subtitle_ca: z.string(),
    subtitle_es: z.string(),
    categoria: z.enum(['vivienda', 'autonomos', 'estudios', 'familia', 'dependencia']),
    subcategoria: z.enum(['lloguer', 'compra', 'rehabilitacio', 'urgencia', 'beca', 'alta', 'formacio', 'contractacio']),
    bdns_id: z.string().optional(),      // Base de Datos Nacional de Subvenciones ID — key for the fetcher
    dogc_ref: z.string().optional(),     // DOGC reference for fallback
    boe_ref: z.string().optional(),      // BOE reference for state-level aids
    cuantia_ca: z.string(),
    cuantia_es: z.string(),
    cuantia_total_max: z.number().nullable(),
    edad_min: z.number().int().min(0).max(120),
    edad_max: z.number().int().min(0).max(120),
    ingresos_max: z.number().nullable(),
    ambito: z.enum(['catalunya', 'barcelona']),
    zonas_especificas: z.array(z.string()).default([]),
    estado: z.enum(['abierta', 'cerrada', 'proxima']),
    fecha_apertura: isoDate,
    fecha_cierre: isoDate,
    duracion_ventana_dias: z.number().int(),
    fuente_oficial: z.string().url(),
    fuente_bases: z.string().url().optional(),
    organismo_ca: z.string(),
    organismo_es: z.string(),
    ultima_actualizacion: isoDate,          // touched every successful fetch
    fetcher_last_ok: isoTimestamp.optional(), // full ISO timestamp — last successful scrape
    stale: z.boolean().default(false),  // true when fetcher_last_ok > 48h old
    archivada: z.boolean().default(false), // true after 90d past fecha_cierre — hidden from home, URL still works
    draft: z.boolean().default(false),   // auto-created by fetcher, not yet reviewed — hidden from build
    requisitos_ca: z.array(z.string()),
    requisitos_es: z.array(z.string()),
    documentacion_ca: z.array(z.string()),
    documentacion_es: z.array(z.string()),
    historico: z.array(z.object({
      ano: z.number().int(),
      apertura: isoDate,
      cierre: isoDate,
      dias: z.number().int(),
    })).default([]),
  }),
});

export const collections = { aids };
