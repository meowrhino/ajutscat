// AjutsCat — small presentational components
const { useState, useEffect, useMemo, useRef } = React;
const H = window.Helpers;

function Brand() {
  return React.createElement('div', { className: 'brand' },
    React.createElement('span', { className: 'brand-mark' }, 'A'),
    React.createElement('span', null, 'AjutsCat'),
    React.createElement('span', { style: { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-muted)', fontWeight: 400, marginLeft: 4 } }, 'v0.1'),
  );
}

function LangSwitch({ lang, setLang }) {
  return React.createElement('div', { className: 'lang', role: 'group', 'aria-label': 'Language' },
    React.createElement('button', {
      className: lang === 'ca' ? 'active' : '',
      onClick: () => setLang('ca'),
      'aria-pressed': lang === 'ca',
    }, 'CA'),
    React.createElement('button', {
      className: lang === 'es' ? 'active' : '',
      onClick: () => setLang('es'),
      'aria-pressed': lang === 'es',
    }, 'ES'),
  );
}

function Topbar({ lang, setLang, t, onBack }) {
  return React.createElement('header', { className: 'topbar' },
    React.createElement('div', { className: 'topbar-inner' },
      React.createElement('button', {
        onClick: onBack,
        style: { display: 'flex', alignItems: 'center' },
        'aria-label': t.site_name,
      }, React.createElement(Brand)),
      React.createElement('nav', { className: 'topbar-nav keep' },
        React.createElement('a', { href: '#', onClick: (e) => e.preventDefault() }, lang === 'ca' ? 'Habitatge' : 'Vivienda'),
        React.createElement('a', { href: '#', onClick: (e) => e.preventDefault(), style: { color: 'var(--ink-faint)' } }, lang === 'ca' ? 'Autònoms' : 'Autónomos'),
        React.createElement('a', { href: '#', onClick: (e) => e.preventDefault(), style: { color: 'var(--ink-faint)' } }, lang === 'ca' ? 'Estudis' : 'Estudios'),
        React.createElement(LangSwitch, { lang, setLang }),
      ),
    ),
  );
}

function StatusChip({ status, daysLeft, urgent, t }) {
  const label = urgent ? t.card_urgent
    : status === 'abierta' ? t.status_abierta
    : status === 'cerrada' ? t.status_cerrada
    : status === 'proxima' ? t.status_proxima
    : t.status_desconegut;
  const kind = urgent ? 'urgent' : status === 'abierta' ? 'ok' : status === 'proxima' ? 'warn' : 'danger';
  return React.createElement('span', { className: `card-status ${kind}` },
    React.createElement('span', { className: 'dot' }),
    label,
  );
}

function Countdown({ status, daysLeft, aid, t, urgent }) {
  if (status === 'abierta') {
    if (aid.duracion_ventana_dias >= 300) {
      return React.createElement('span', { className: 'card-countdown' }, t.card_long_window);
    }
    const word = daysLeft === 1 ? t.card_days_left_single : t.card_days_left;
    return React.createElement('span', { className: `card-countdown ${urgent ? 'urgent' : ''}` },
      `${daysLeft} ${word}`
    );
  }
  if (status === 'proxima') {
    const days = H.daysBetween(null, aid.fecha_apertura);
    return React.createElement('span', { className: 'card-countdown' },
      `${t.card_opens} ${H.formatDateShort(aid.fecha_apertura, t === window.I18N.ca ? 'ca' : 'es')}`
    );
  }
  return React.createElement('span', { className: 'card-countdown', style: { opacity: 0.7 } },
    `${t.card_closed_on} ${H.formatDateShort(aid.fecha_cierre, t === window.I18N.ca ? 'ca' : 'es')}`
  );
}

function AidCard({ aid, lang, t, onOpen }) {
  const { status, daysLeft, urgent } = H.computeStatus(aid);
  const bar = H.barKind(status, urgent);
  const progress = status === 'abierta' ? H.windowProgress(aid) : null;
  const progressKind = progress == null ? '' : progress > 0.85 ? 'danger' : progress > 0.65 ? 'warn' : '';

  return React.createElement('button', {
    className: 'card',
    onClick: () => onOpen(aid.id),
    'aria-label': aid[`nombre_${lang}`],
  },
    React.createElement('div', { className: `card-bar ${bar}` }),
    React.createElement('div', { className: 'card-body' },
      React.createElement('div', { className: 'card-top' },
        React.createElement('span', { style: { display: 'inline-flex', gap: 6, flexWrap: 'wrap' } },
          React.createElement(StatusChip, { status, daysLeft, urgent, t }),
          aid.stale && React.createElement('span', { className: 'stale-badge' }, '⚠'),
        ),
        React.createElement(Countdown, { status, daysLeft, aid, t, urgent }),
      ),
      React.createElement('div', null,
        React.createElement('h3', { className: 'card-title' }, aid[`nombre_${lang}`]),
        React.createElement('p', { className: 'card-subtitle' }, aid[`subtitle_${lang}`]),
      ),
      React.createElement('div', { className: 'card-meta' },
        React.createElement('div', { className: 'meta-row' },
          React.createElement('span', { className: 'meta-label' }, t.card_amount),
          React.createElement('span', { className: 'meta-value' }, aid[`cuantia_${lang}`]),
        ),
        React.createElement('div', { className: 'meta-row' },
          React.createElement('span', { className: 'meta-label' }, t.card_age),
          React.createElement('span', { className: 'meta-value mono' },
            aid.edad_max >= 120 ? `${aid.edad_min}+` : `${aid.edad_min}–${aid.edad_max}`
          ),
        ),
      ),
      progress != null && aid.duracion_ventana_dias < 300 && React.createElement('div', null,
        React.createElement('div', { className: 'card-progress' },
          React.createElement('div', {
            className: `card-progress-fill ${progressKind}`,
            style: { width: `${progress * 100}%` }
          }),
        ),
        React.createElement('div', { className: 'card-progress-label' },
          React.createElement('span', null, H.formatDateShort(aid.fecha_apertura, lang)),
          React.createElement('span', null, H.formatDateShort(aid.fecha_cierre, lang)),
        ),
      ),
    ),
  );
}

Object.assign(window, { Brand, LangSwitch, Topbar, StatusChip, Countdown, AidCard });
