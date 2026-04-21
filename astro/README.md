# AjutsCat

Catàleg viu de les ajudes de **habitatge, estudis i autònoms** a Catalunya.
JAMstack · Astro · GitHub Pages · dades actualitzades cada dia a les 08:00.

## Què fa el cron diari

Cada nit (`06:00 UTC` = `08:00 Europe/Madrid`) el workflow
`.github/workflows/update-aids.yml` corre `scripts/fetch-aids.mjs` i:

1. **Actualitza** les ajudes existents que tenen `bdns_id` contra la API
   pública de BDNS (`infosubvenciones.es`). Només toca camps volàtils
   (`estado`, `fecha_apertura`, `fecha_cierre`, `ultima_actualizacion`,
   `fetcher_last_ok`). Els camps redactats a mà (requisits, documentació,
   subtítols bilingües) **mai** es toquen.
2. **Detecta `stale`** — si una ajuda amb `bdns_id` no s'ha pogut refrescar
   en >48h, marca `stale: true`. La UI ensenya badge groc i banner
   ("principi rector: mai mentir sobre l'estat").
3. **Arxiva** — 90 dies després de `fecha_cierre`, `archivada: true`.
   Desapareix del home però la URL segueix funcionant (clau per als
   enllaços que circulen per WhatsApp).
4. **Descobreix novetats** — consulta les últimes 150 convocatòries de
   BDNS, filtra per organisme català + matèria (habitatge/estudis/autònoms),
   i per cada una que no tinguem al catàleg **obre una issue a GitHub**
   amb plantilla prellenada. Nosaltres redactem el contingut a mà i fem
   PR. Mai es crea un `.md` automàticament — la qualitat del llenguatge
   clar és el diferencial.
5. **Commit + push** si hi ha canvis. Això dispara `deploy.yml` i el lloc
   es reconstrueix automàticament.

## Posar-lo en marxa

### 1. Crear repo

```bash
git init
git add .
git commit -m "chore: initial commit"
git branch -M main
git remote add origin https://github.com/meowrhino/ajutscat.git
git push -u origin main
```

### 2. Activar GitHub Pages

Settings → Pages → **Source: GitHub Actions**.

Ja està. El primer `git push` dispara `deploy.yml` → build → publica a
`https://meowrhino.github.io/ajutscat/`.

### 3. Esperar a l'endemà al matí

O forçar manualment la primera execució del cron: Actions → *Update aids
daily* → Run workflow.

### 4. (Opcional) Domini propi

Compra `ajuts.cat`, posa `public/CNAME` amb el text `ajuts.cat`, i a
`astro.config.mjs`:

```js
site: 'https://ajuts.cat',
base: '/',
```

## Cicle de vida d'una ajuda

```
     [descobrir]              [redactar a mà]
  BDNS search  ─────→  GitHub Issue  ─────→  .md + PR
                                               │
                                               ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  proxima  →  abierta  →  cerrada  →  archivada  →  (mai borrar)
  │   ↑                                                         │
  │   └──── re-obertura anual (cron actualitza fechas) ─────────┘
  └─────────────────────────────────────────────────────────────┘
             ↑
         stale:true si fetcher falla >48h
```

**Per què no esborrar mai?** Els enllaços d'ajudes cerradas seguiran
circulant per WhatsApp. Quan algú hi clica ha de veure: *"Va tancar el X.
La pròxima sol obrir-se en [mes]. Activa avís →"*. Això és captura d'usuari
en el moment de màxim interès.

## Afegir una ajuda a mà

Plantilla mínima — copia i adapta:

```yaml
---
id: nom-unic-sense-espais
nombre_ca: ...
nombre_es: ...
subtitle_ca: ...
subtitle_es: ...
categoria: vivienda | estudios | autonomos | familia | dependencia
subcategoria: lloguer | compra | rehabilitacio | urgencia | beca | alta | formacio | contractacio
bdns_id: "756347"   # sense això el fetcher no l'actualitza
cuantia_ca: ...
cuantia_es: ...
edad_min: 18
edad_max: 35
ingresos_max: 25200 | null
ambito: catalunya | barcelona
estado: abierta | cerrada | proxima
fecha_apertura: YYYY-MM-DD
fecha_cierre: YYYY-MM-DD
duracion_ventana_dias: 5
fuente_oficial: https://...
organismo_ca: ...
organismo_es: ...
ultima_actualizacion: YYYY-MM-DD
requisitos_ca: [..., ...]
requisitos_es: [..., ...]
documentacion_ca: [..., ...]
documentacion_es: [..., ...]
historico:
  - ano: 2025
    apertura: 2025-03-10
    cierre: 2025-03-14
    dias: 5
---
```

El schema Zod a `src/content/config.ts` valida al build. Si no compleix,
el build falla amb error clar.

## Comandes

```bash
npm install
npm run dev            # localhost:4321
npm run build          # dist/ + índex de Pagefind
npm run fetch          # prova el fetcher contra BDNS real (escriu canvis!)
npm run fetch -- --dry-run              # sense escriure
npm run fetch -- --id=bo-lloguer-jove   # només una ajuda
npm run fetch -- --skip-discovery       # no obre issues
```

## Què queda pendent per ser v1 sòlid

- [ ] **Validar el parser de BDNS amb una resposta real.** El shape és
      defensiu però cal verificar-ho al primer `run_workflow` real.
      Si falla, ajustar els noms de camp a `scripts/fetch-aids.mjs`.
- [ ] Ampliar de 10 a 15–20 ajudes cobrint millor autònoms i estudis.
- [ ] Connectar Pagefind UI al site (1 línia de `<script>` a `Base.astro`).
- [ ] Comprar `ajuts.cat` i afegir `public/CNAME`.
- [ ] v2: alertes per email (Resend + Cloudflare Worker — depèn de tràfic real).

## Principis no negociables

1. **Mai mentir sobre l'estat.** `stale: true` quan el fetcher falla.
2. **Sempre enllaçar a la font oficial.** Som capa, no substitut.
3. **Mai autogenerar continguts.** Detectem, redactem a mà.
4. **Mai esborrar.** Arxivar sí. Els enllaços han de seguir viva.
5. **Tot bilingüe CA/ES.** Català primer.
6. **Zero tracking.**
7. **Accessibilitat AA mínim.**
