// AjutsCat — main app + tweaks
const { useState: useStateA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "blue",
  "density": "default",
  "cardStyle": "default",
  "defaultLang": "ca"
}/*EDITMODE-END*/;

function TweaksPanel({ tweaks, setTweaks, visible, onClose }) {
  if (!visible) return null;
  const set = (k, v) => setTweaks({ ...tweaks, [k]: v });
  const Opt = (k, v, label) => React.createElement('button', {
    key: v,
    className: tweaks[k] === v ? 'active' : '',
    onClick: () => set(k, v),
  }, label);
  return React.createElement('div', { className: 'tweaks-panel', role: 'dialog', 'aria-label': 'Tweaks' },
    React.createElement('h4', null,
      React.createElement('span', null, 'Tweaks'),
      React.createElement('button', { onClick: onClose, style: { color: 'var(--ink-muted)', fontSize: 14 }, 'aria-label': 'Close' }, '×'),
    ),
    React.createElement('div', { className: 'tweak-row' },
      React.createElement('label', null, 'Accent'),
      React.createElement('div', { className: 'opts' },
        Opt('accent', 'blue', 'Blue'),
        Opt('accent', 'green', 'Green'),
        Opt('accent', 'plum', 'Plum'),
        Opt('accent', 'terracotta', 'Terracotta'),
      ),
    ),
    React.createElement('div', { className: 'tweak-row' },
      React.createElement('label', null, 'Density'),
      React.createElement('div', { className: 'opts' },
        Opt('density', 'default', 'Default'),
        Opt('density', 'compact', 'Compact'),
      ),
    ),
    React.createElement('div', { className: 'tweak-row' },
      React.createElement('label', null, 'Card style'),
      React.createElement('div', { className: 'opts' },
        Opt('cardStyle', 'default', 'Bordered'),
        Opt('cardStyle', 'filled', 'Filled'),
        Opt('cardStyle', 'flat', 'Flat list'),
      ),
    ),
    React.createElement('div', { className: 'tweak-row' },
      React.createElement('label', null, 'Default language'),
      React.createElement('div', { className: 'opts' },
        Opt('defaultLang', 'ca', 'Català'),
        Opt('defaultLang', 'es', 'Castellano'),
      ),
    ),
    React.createElement('p', { style: { fontSize: 11, color: 'var(--ink-faint)', margin: '10px 0 0', lineHeight: 1.4 } },
      'Cambios en vivo. Se guardan en el archivo.'
    ),
  );
}

function Disclaimer({ lang, t }) {
  return React.createElement('div', { className: 'disclaimer' },
    React.createElement('span', { className: 'disclaimer-icon' }, 'i'),
    React.createElement('div', null,
      React.createElement('strong', null, t.disclaimer_title),
      '. ',
      t.disclaimer,
    ),
  );
}

function Footer({ lang, t }) {
  return React.createElement('footer', { className: 'footer' },
    React.createElement('span', { className: 'footer-brand' }, 'AjutsCat'),
    React.createElement('a', { href: '#', onClick: (e) => e.preventDefault() }, t.footer_about),
    React.createElement('a', { href: '#', onClick: (e) => e.preventDefault() }, t.footer_source),
    React.createElement('a', { href: 'mailto:hola@ajuts.cat' }, t.footer_contact),
    React.createElement('span', { style: { marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' } },
      lang === 'ca' ? 'Dades públiques · sense tracking · accessible AA' : 'Datos públicos · sin tracking · accesible AA'
    ),
  );
}

function App() {
  const [tweaks, setTweaks] = useStateA(TWEAK_DEFAULTS);
  const [lang, setLang] = useStateA(() => {
    try { return localStorage.getItem('ajutscat_lang') || TWEAK_DEFAULTS.defaultLang; } catch { return TWEAK_DEFAULTS.defaultLang; }
  });
  const [route, setRoute] = useStateA(() => {
    try { return JSON.parse(localStorage.getItem('ajutscat_route') || '{"view":"list"}'); } catch { return { view: 'list' }; }
  });
  const [profile, setProfile] = useStateA({ age: null, zone: 'any' });
  const [filters, setFilters] = useStateA({ status: 'all', type: 'all' });
  const [sortBy, setSortBy] = useStateA('urgency');
  const [tweaksVisible, setTweaksVisible] = useStateA(false);
  const [wizardOpen, setWizardOpen] = useStateA(false);

  useEffectA(() => { try { localStorage.setItem('ajutscat_lang', lang); } catch {} }, [lang]);
  useEffectA(() => { try { localStorage.setItem('ajutscat_route', JSON.stringify(route)); } catch {} }, [route]);

  // Apply tweaks to body
  useEffectA(() => {
    document.body.dataset.accent = tweaks.accent;
    document.body.dataset.density = tweaks.density;
    document.body.dataset.cardStyle = tweaks.cardStyle;
  }, [tweaks]);

  // Tweaks host protocol
  useEffectA(() => {
    const handler = (e) => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === '__activate_edit_mode') setTweaksVisible(true);
      if (d.type === '__deactivate_edit_mode') setTweaksVisible(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  // Persist tweaks to host
  const updateTweaks = (next) => {
    setTweaks(next);
    try {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: next }, '*');
    } catch {}
  };

  const t = window.I18N[lang];

  const openAid = (id) => {
    setRoute({ view: 'detail', aidId: id });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const goHome = () => {
    setRoute({ view: 'list' });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return React.createElement(React.Fragment, null,
    React.createElement(Topbar, { lang, setLang, t, onBack: goHome }),
    route.view === 'detail'
      ? React.createElement(DetailView, { aidId: route.aidId, lang, t, onBack: goHome })
      : React.createElement(ListView, { lang, t, profile, setProfile, filters, setFilters, sortBy, setSortBy, onOpen: openAid, onOpenWizard: () => setWizardOpen(true) }),
    wizardOpen && React.createElement(Wizard, { lang, t, onClose: () => setWizardOpen(false), onOpen: openAid }),
    React.createElement(Disclaimer, { lang, t }),
    React.createElement(Footer, { lang, t }),
    React.createElement(TweaksPanel, {
      tweaks,
      setTweaks: updateTweaks,
      visible: tweaksVisible,
      onClose: () => {
        setTweaksVisible(false);
        window.parent.postMessage({ type: '__edit_mode_exit' }, '*');
      },
    }),
  );
}

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(React.createElement(App));
