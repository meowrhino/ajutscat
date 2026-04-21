// AjutsCat — Detail view
const HD = window.Helpers;

function DocChecklist({ docs }) {
  const [checked, setChecked] = React.useState({});
  const pct = docs.length === 0 ? 0 : Math.round((Object.values(checked).filter(Boolean).length / docs.length) * 100);
  return React.createElement('div', null,
    React.createElement('div', { className: 'doc-progress' },
      React.createElement('span', null, `${Object.values(checked).filter(Boolean).length}/${docs.length}`),
      React.createElement('div', { className: 'doc-progress-bar' },
        React.createElement('div', { className: 'doc-progress-fill', style: { width: `${pct}%` } }),
      ),
      React.createElement('span', null, `${pct}%`),
    ),
    React.createElement('ul', { className: 'doc-list' },
      docs.map((d, i) => React.createElement('li', {
        key: i,
        className: checked[i] ? 'checked' : '',
        onClick: () => setChecked({ ...checked, [i]: !checked[i] }),
        role: 'checkbox',
        'aria-checked': !!checked[i],
        tabIndex: 0,
        onKeyDown: (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setChecked({ ...checked, [i]: !checked[i] }); } },
      },
        React.createElement('span', { className: 'doc-check' },
          React.createElement('svg', { width: 10, height: 10, viewBox: '0 0 10 10' },
            React.createElement('path', { d: 'M2 5l2 2 4-4', stroke: '#fff', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' })
          ),
        ),
        React.createElement('span', { className: 'doc-label' }, d),
      ))
    ),
  );
}

function HistoryTable({ aid, lang, t }) {
  const rows = aid.historico.slice().sort((a, b) => b.ano - a.ano);
  const currentYear = 2026;
  const maxDias = Math.max(...rows.map(r => r.dias), 1);
  return React.createElement('div', { className: 'history-table' },
    React.createElement('div', { className: 'history-row header' },
      React.createElement('span', null, t.history_year),
      React.createElement('span', null, t.history_open),
      React.createElement('span', null, t.history_close),
      React.createElement('span', null, t.history_days),
      React.createElement('span', null, lang === 'ca' ? 'Durada visual' : 'Duración visual'),
    ),
    rows.map(r => {
      const barClass = r.dias <= 7 ? 'short' : r.dias <= 30 ? 'medium' : 'long';
      const barWidth = Math.max(4, (r.dias / maxDias) * 100);
      return React.createElement('div', {
        key: r.ano,
        className: 'history-row' + (r.ano === currentYear ? ' this-year' : ''),
      },
        React.createElement('span', { className: 'mono' }, r.ano),
        React.createElement('span', { className: 'mono' }, HD.formatDateShort(r.apertura, lang)),
        React.createElement('span', { className: 'mono' }, HD.formatDateShort(r.cierre, lang)),
        React.createElement('span', { className: 'mono' }, `${r.dias}d`),
        React.createElement('span', null,
          React.createElement('span', {
            className: `history-bar ${barClass}`,
            style: { width: `${barWidth}%` },
            title: `${r.dias} dies`,
          }),
        ),
      );
    }),
  );
}

function DetailView({ aidId, lang, t, onBack }) {
  const aid = window.AIDS.find(a => a.id === aidId);
  if (!aid) return null;
  const { status, daysLeft, urgent } = HD.computeStatus(aid);
  const bar = HD.barKind(status, urgent);

  const statusLine = status === 'abierta'
    ? (aid.duracion_ventana_dias >= 300
        ? { big: t.card_long_window, small: lang === 'ca' ? 'La convocatòria es manté oberta durant tot el 2026.' : 'La convocatoria permanece abierta durante todo 2026.', big_class: '' }
        : { big: `${daysLeft} ${daysLeft === 1 ? t.card_days_left_single : t.card_days_left}`,
            small: `${t.card_deadline} ${HD.formatDate(aid.fecha_cierre, lang)}`,
            big_class: urgent ? 'danger' : '' })
    : status === 'proxima'
      ? { big: HD.formatDate(aid.fecha_apertura, lang), small: lang === 'ca' ? 'Data prevista d\'obertura segons convocatòries passades.' : 'Fecha prevista de apertura según convocatorias pasadas.', big_class: '' }
      : { big: HD.formatDate(aid.fecha_cierre, lang), small: lang === 'ca' ? 'La pròxima convocatòria se sol obrir a la primavera.' : 'La próxima convocatoria suele abrirse en primavera.', big_class: '' };

  return React.createElement('div', { className: 'detail-page' },
    React.createElement('button', { className: 'back-link', onClick: onBack }, t.detail_back),
    React.createElement('div', { className: 'detail-hero' },
      React.createElement('div', { className: `detail-hero-bar ${bar}` }),
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', { style: { marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
          React.createElement(StatusChip, { status, daysLeft, urgent, t }),
          aid.stale && React.createElement('span', { className: 'stale-badge' }, lang === 'ca' ? '⚠ Desactualitzat' : '⚠ Desactualizado'),
        ),
        React.createElement('h1', null, aid[`nombre_${lang}`]),
        React.createElement('p', { className: 'detail-hero-sub' }, aid[`subtitle_${lang}`]),
        React.createElement('div', { className: 'detail-hero-meta' },
          React.createElement('div', { className: 'detail-meta-item' },
            React.createElement('span', { className: 'detail-meta-label' }, t.card_amount),
            React.createElement('span', { className: 'detail-meta-value' }, aid[`cuantia_${lang}`]),
          ),
          React.createElement('div', { className: 'detail-meta-item' },
            React.createElement('span', { className: 'detail-meta-label' }, t.card_age),
            React.createElement('span', { className: 'detail-meta-value mono' },
              aid.edad_max >= 120 ? `${aid.edad_min}+` : `${aid.edad_min}–${aid.edad_max}`
            ),
          ),
          aid.ingresos_max && React.createElement('div', { className: 'detail-meta-item' },
            React.createElement('span', { className: 'detail-meta-label' }, lang === 'ca' ? 'Ingressos màx' : 'Ingresos máx'),
            React.createElement('span', { className: 'detail-meta-value mono' }, `${aid.ingresos_max.toLocaleString('es-ES')} €`),
          ),
          React.createElement('div', { className: 'detail-meta-item' },
            React.createElement('span', { className: 'detail-meta-label' }, lang === 'ca' ? 'Organisme' : 'Organismo'),
            React.createElement('span', { className: 'detail-meta-value' }, aid[`organismo_${lang}`]),
          ),
        ),
        React.createElement('div', { className: `detail-status-block ${urgent ? 'urgent' : ''}` },
          React.createElement('div', { className: 'detail-status-line' },
            React.createElement('span', { className: `big mono ${statusLine.big_class}` }, statusLine.big),
          ),
          React.createElement('div', { style: { fontSize: 13, color: 'var(--ink-muted)' } }, statusLine.small),
        ),
        React.createElement('div', { className: 'detail-cta' },
          React.createElement('a', {
            className: 'btn primary',
            href: aid.url_oficial,
            target: '_blank',
            rel: 'noopener noreferrer',
          }, t.detail_official),
          React.createElement('span', { style: { fontSize: 12, color: 'var(--ink-muted)', fontFamily: 'var(--mono)', alignSelf: 'center' } },
            `${t.detail_updated} ${HD.formatDate(aid.ultima_actualizacion, lang)}`
          ),
        ),
        aid.stale && React.createElement('div', { className: 'stale-banner' },
          React.createElement('span', { style: { fontSize: 14 } }, '⚠'),
          React.createElement('span', null,
            React.createElement('strong', null, lang === 'ca' ? 'Info desactualitzada. ' : 'Info desactualizada. '),
            lang === 'ca' ? 'No hem pogut confirmar l\'estat d\'aquesta ajuda en les últimes 48h. Consulta la font oficial abans de fer res.' : 'No hemos podido confirmar el estado de esta ayuda en las últimas 48h. Consulta la fuente oficial antes de hacer nada.'
          ),
        ),
        React.createElement('div', { className: 'share-row' },
          React.createElement('span', null, lang === 'ca' ? 'Passa-ho:' : 'Pásalo:'),
          React.createElement('a', {
            className: 'share-btn wa',
            href: `https://wa.me/?text=${encodeURIComponent(
              (lang === 'ca'
                ? `${aid.nombre_ca} — ${statusLine.big}. Info clara a AjutsCat: `
                : `${aid.nombre_es} — ${statusLine.big}. Info clara en AjutsCat: `) +
              `https://ajuts.cat/${aid.id}`
            )}`,
            target: '_blank', rel: 'noopener noreferrer',
          },
            React.createElement('svg', { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'currentColor' },
              React.createElement('path', { d: 'M17.5 14.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7 0-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7.1-.1.3-.4.4-.5.1-.2.2-.3.3-.5 0-.2 0-.4-.1-.5-.1-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.1.2 2 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.4zM12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2z'}),
            ),
            'WhatsApp'
          ),
          React.createElement('button', {
            className: 'share-btn',
            onClick: () => {
              const url = `https://ajuts.cat/${aid.id}`;
              if (navigator.clipboard) navigator.clipboard.writeText(url);
            },
          }, lang === 'ca' ? 'Copiar enllaç' : 'Copiar enlace'),
        ),
      ),
    ),
    React.createElement('section', { className: 'section' },
      React.createElement('h2', { className: 'section-title' }, t.detail_requirements),
      React.createElement('ul', { className: 'req-list' },
        aid[`requisitos_${lang}`].map((r, i) => React.createElement('li', { key: i }, r)),
      ),
    ),
    React.createElement('section', { className: 'section' },
      React.createElement('h2', { className: 'section-title' }, t.detail_docs),
      React.createElement(DocChecklist, { docs: aid[`documentacion_${lang}`] }),
    ),
    React.createElement('section', { className: 'section' },
      React.createElement('h2', { className: 'section-title' }, t.detail_history),
      React.createElement(HistoryTable, { aid, lang, t }),
      React.createElement('p', { style: { fontSize: 13, color: 'var(--ink-muted)', marginTop: 12 } },
        lang === 'ca'
          ? 'Les finestres solen ser curtes i no s\'anuncien amb antelació. Aquest històric et dóna una idea del patró.'
          : 'Las ventanas suelen ser cortas y no se anuncian con antelación. Este histórico te da una idea del patrón.'
      ),
    ),
  );
}

Object.assign(window, { DocChecklist, HistoryTable, DetailView });
