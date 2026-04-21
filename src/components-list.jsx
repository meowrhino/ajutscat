// AjutsCat — Profile bar, filter bar, and list view
const { useState: useStateL, useMemo: useMemoL } = React;
const HL = window.Helpers;

function ProfileBar({ lang, t, profile, setProfile }) {
  const ageOptions = [null, 22, 28, 33, 40, 55, 68];
  const zoneOptions = [
    { v: 'any', label: t.profile_any_zone },
    { v: 'catalunya', label: t.filter_zone_catalunya },
    { v: 'bcn', label: t.filter_zone_bcn },
  ];

  const hasFilter = profile.age != null || profile.zone !== 'any';

  return React.createElement('div', { className: 'profile-bar' },
    React.createElement('span', null, t.profile_prompt),
    React.createElement('select', {
      className: 'inline-select mono',
      value: profile.age == null ? '' : profile.age,
      onChange: (e) => setProfile({ ...profile, age: e.target.value === '' ? null : Number(e.target.value) }),
      'aria-label': 'Edat',
    },
      ageOptions.map(a =>
        React.createElement('option', { key: String(a), value: a == null ? '' : a },
          a == null ? `— ${t.profile_any_age}` : `${a} ${t.profile_age}`
        )
      )
    ),
    React.createElement('span', null, t.profile_live),
    React.createElement('select', {
      className: 'inline-select',
      value: profile.zone,
      onChange: (e) => setProfile({ ...profile, zone: e.target.value }),
      'aria-label': 'Zona',
    },
      zoneOptions.map(z => React.createElement('option', { key: z.v, value: z.v }, z.label))
    ),
    hasFilter && React.createElement('button', {
      className: 'muted-btn',
      onClick: () => setProfile({ age: null, zone: 'any' }),
    }, t.profile_clear),
  );
}

function FilterBar({ lang, t, filters, setFilters, sortBy, setSortBy, count }) {
  const stati = [
    { v: 'all', label: t.filter_all },
    { v: 'abierta', label: t.status_abierta },
    { v: 'proxima', label: t.status_proxima },
    { v: 'cerrada', label: t.status_cerrada },
  ];
  const types = [
    { v: 'all', label: t.filter_all },
    { v: 'lloguer', label: t.filter_type_lloguer },
    { v: 'compra', label: t.filter_type_compra },
    { v: 'rehabilitacio', label: t.filter_type_rehabilitacio },
    { v: 'urgencia', label: t.filter_type_urgencia },
  ];

  return React.createElement('div', { className: 'filter-bar' },
    React.createElement('div', { className: 'chip-group', role: 'group', 'aria-label': t.filter_status },
      React.createElement('span', { className: 'chip-label' }, t.filter_status),
      stati.map(s => React.createElement('button', {
        key: s.v,
        className: 'chip' + (filters.status === s.v ? ' active' : ''),
        onClick: () => setFilters({ ...filters, status: s.v }),
        'aria-pressed': filters.status === s.v,
      }, s.label)),
    ),
    React.createElement('div', { className: 'chip-divider' }),
    React.createElement('div', { className: 'chip-group', role: 'group', 'aria-label': t.filter_type },
      React.createElement('span', { className: 'chip-label' }, t.filter_type),
      types.map(s => React.createElement('button', {
        key: s.v,
        className: 'chip' + (filters.type === s.v ? ' active' : ''),
        onClick: () => setFilters({ ...filters, type: s.v }),
        'aria-pressed': filters.type === s.v,
      }, s.label)),
    ),
    React.createElement('div', { className: 'sort-wrap' },
      React.createElement('span', null, t.sort_by),
      React.createElement('select', {
        value: sortBy,
        onChange: (e) => setSortBy(e.target.value),
        'aria-label': t.sort_by,
      },
        React.createElement('option', { value: 'urgency' }, t.sort_urgency),
        React.createElement('option', { value: 'amount' }, t.sort_amount),
        React.createElement('option', { value: 'alpha' }, t.sort_alpha),
      ),
    ),
  );
}

function UrgentBanner({ aids, lang, t, onOpen }) {
  const urgent = aids
    .map(a => ({ a, s: HL.computeStatus(a) }))
    .filter(({ s }) => s.status === 'abierta' && s.daysLeft <= 2);
  if (!urgent.length) return null;
  return React.createElement('div', { className: 'urgent-banner', role: 'alert' },
    React.createElement('span', { style: { fontSize: 16 } }, '⚠'),
    React.createElement('strong', null, t.banner_urgent),
    ...urgent.slice(0, 3).flatMap(({ a, s }, i) => [
      i > 0 && React.createElement('span', { key: `sep-${i}`, style: { color: 'var(--ink-faint)' } }, '·'),
      React.createElement('button', {
        key: a.id,
        className: 'link',
        onClick: () => onOpen(a.id),
      }, a[`nombre_${lang}`],
        React.createElement('span', { className: 'mono', style: { marginLeft: 6, opacity: 0.8 } },
          `(${s.daysLeft}${s.daysLeft === 1 ? 'd' : 'd'})`
        )
      )
    ].filter(Boolean)),
  );
}

function ListView({ lang, t, profile, setProfile, filters, setFilters, sortBy, setSortBy, onOpen, onOpenWizard }) {
  const filtered = useMemoL(() => {
    let list = window.AIDS.slice();
    // Profile
    list = list.filter(a => HL.ageMatches(a, profile.age) && HL.zoneMatches(a, profile.zone));
    // Filters
    if (filters.status !== 'all') {
      list = list.filter(a => HL.computeStatus(a).status === filters.status);
    }
    if (filters.type !== 'all') {
      list = list.filter(a => a.subcategoria === filters.type);
    }
    // Sort
    if (sortBy === 'urgency') {
      list.sort((a, b) => {
        const sa = HL.computeStatus(a), sb = HL.computeStatus(b);
        const rank = (s) => s.status === 'abierta' ? 0 : s.status === 'proxima' ? 1 : 2;
        if (rank(sa) !== rank(sb)) return rank(sa) - rank(sb);
        if (sa.status === 'abierta' && sb.status === 'abierta') return sa.daysLeft - sb.daysLeft;
        if (sa.status === 'proxima' && sb.status === 'proxima') {
          return HL.parseDate(a.fecha_apertura) - HL.parseDate(b.fecha_apertura);
        }
        return HL.parseDate(b.fecha_cierre) - HL.parseDate(a.fecha_cierre);
      });
    } else if (sortBy === 'amount') {
      list.sort((a, b) => b.cuantia_total_max - a.cuantia_total_max);
    } else if (sortBy === 'alpha') {
      list.sort((a, b) => a[`nombre_${lang}`].localeCompare(b[`nombre_${lang}`]));
    }
    return list;
  }, [profile, filters, sortBy, lang]);

  // Stats for hero
  const stats = useMemoL(() => {
    const all = window.AIDS;
    let open = 0, soon = 0, closing = 0;
    all.forEach(a => {
      const s = HL.computeStatus(a);
      if (s.status === 'abierta') { open++; if (s.daysLeft <= 7 && a.duracion_ventana_dias < 300) closing++; }
      if (s.status === 'proxima') soon++;
    });
    return { open, soon, closing };
  }, []);

  const allAids = window.AIDS;

  return React.createElement(React.Fragment, null,
    React.createElement('section', { className: 'hero' },
      React.createElement('div', { className: 'hero-eyebrow' },
        React.createElement('span', { className: 'dot' }),
        lang === 'ca' ? 'CATALUNYA · HABITATGE · ABRIL 2026' : 'CATALUNYA · VIVIENDA · ABRIL 2026',
      ),
      React.createElement('h1', null, t.tagline),
      React.createElement('p', { className: 'hero-intro' }, t.intro),
      React.createElement('button', { className: 'hero-cta', onClick: onOpenWizard },
        lang === 'ca' ? 'A què tinc dret?' : '¿A qué tengo derecho?',
        React.createElement('span', { className: 'arrow' }, '→'),
      ),
      React.createElement('div', { className: 'hero-stats' },
        React.createElement('div', { className: 'hero-stat ok' },
          React.createElement('span', { className: 'hero-stat-num' }, stats.open),
          React.createElement('span', { className: 'hero-stat-label' }, t.hero_stat_open),
        ),
        React.createElement('div', { className: 'hero-stat warn' },
          React.createElement('span', { className: 'hero-stat-num' }, stats.soon),
          React.createElement('span', { className: 'hero-stat-label' }, t.hero_stat_soon),
        ),
        React.createElement('div', { className: 'hero-stat' },
          React.createElement('span', { className: 'hero-stat-num' }, stats.closing),
          React.createElement('span', { className: 'hero-stat-label' }, t.hero_stat_closing),
        ),
      ),
    ),
    React.createElement('div', { style: { maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 var(--s-6)' } },
      React.createElement(ProfileBar, { lang, t, profile, setProfile }),
    ),
    React.createElement(UrgentBanner, { aids: allAids, lang, t, onOpen }),
    React.createElement(FilterBar, { lang, t, filters, setFilters, sortBy, setSortBy, count: filtered.length }),
    React.createElement('main', { className: 'main' },
      React.createElement('div', { className: 'result-count' },
        React.createElement('span', { className: 'mono' }, String(filtered.length).padStart(2, '0')),
        ' / ',
        String(allAids.length).padStart(2, '0'), ' ', t.results_count,
      ),
      filtered.length === 0
        ? React.createElement('div', { className: 'empty' },
            React.createElement('h3', null, t.no_results),
            React.createElement('p', { style: { maxWidth: 420, margin: '8px auto 0' } },
              lang === 'ca' ? 'Prova a eixamplar els filtres o deixa que et guiem amb unes preguntes ràpides.' : 'Prueba a ampliar los filtros o deja que te guiemos con unas preguntas rápidas.'
            ),
            React.createElement('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' } },
              React.createElement('button', {
                className: 'btn ghost',
                onClick: () => { setFilters({ status: 'all', type: 'all' }); setProfile({ age: null, zone: 'any' }); },
              }, t.clear_filters),
              React.createElement('button', {
                className: 'btn primary',
                onClick: onOpenWizard,
              }, lang === 'ca' ? 'A què tinc dret?' : '¿A qué tengo derecho?'),
            ),
          )
        : React.createElement('div', { className: 'grid' },
            filtered.map(a => React.createElement(AidCard, { key: a.id, aid: a, lang, t, onOpen }))
          ),
    ),
  );
}

Object.assign(window, { ProfileBar, FilterBar, UrgentBanner, ListView });
