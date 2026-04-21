// AjutsCat — Wizard "¿a qué tengo derecho?"
const HW = window.Helpers;

const WIZARD_STEPS_CA = [
  { id: 'age', q: 'Quants anys tens?', type: 'number', placeholder: 'Ex: 28', unit: 'anys' },
  { id: 'situation', q: 'Quina és la teva situació d\'habitatge?', type: 'choice',
    options: [
      { v: 'lloguer', label: 'Visc de lloguer', hint: '' },
      { v: 'compra', label: 'Vull comprar un habitatge', hint: '' },
      { v: 'rehabilitacio', label: 'Necessito rehabilitar el meu edifici', hint: '' },
      { v: 'urgencia', label: 'Estic en una situació d\'emergència', hint: 'Risc de desnonament, deutes de lloguer' },
    ] },
  { id: 'income', q: 'Quin és el teu ingrés anual aproximat?', type: 'choice',
    options: [
      { v: 15000, label: 'Menys de 15.000 €' },
      { v: 22000, label: '15.000 – 25.000 €' },
      { v: 30000, label: '25.000 – 35.000 €' },
      { v: 45000, label: 'Més de 35.000 €' },
    ] },
  { id: 'zone', q: 'On vius a Catalunya?', type: 'choice',
    options: [
      { v: 'bcn', label: 'Barcelona ciutat' },
      { v: 'catalunya', label: 'Resta de Catalunya' },
    ] },
];

const WIZARD_STEPS_ES = [
  { id: 'age', q: '¿Cuántos años tienes?', type: 'number', placeholder: 'Ej: 28', unit: 'años' },
  { id: 'situation', q: '¿Cuál es tu situación de vivienda?', type: 'choice',
    options: [
      { v: 'lloguer', label: 'Vivo de alquiler' },
      { v: 'compra', label: 'Quiero comprar una vivienda' },
      { v: 'rehabilitacio', label: 'Necesito rehabilitar mi edificio' },
      { v: 'urgencia', label: 'Estoy en una situación de emergencia', hint: 'Riesgo de desahucio, deudas de alquiler' },
    ] },
  { id: 'income', q: '¿Cuál es tu ingreso anual aproximado?', type: 'choice',
    options: [
      { v: 15000, label: 'Menos de 15.000 €' },
      { v: 22000, label: '15.000 – 25.000 €' },
      { v: 30000, label: '25.000 – 35.000 €' },
      { v: 45000, label: 'Más de 35.000 €' },
    ] },
  { id: 'zone', q: '¿Dónde vives en Catalunya?', type: 'choice',
    options: [
      { v: 'bcn', label: 'Barcelona ciudad' },
      { v: 'catalunya', label: 'Resto de Catalunya' },
    ] },
];

function matchAids(answers) {
  return window.AIDS.filter(a => {
    if (answers.age != null) {
      if (answers.age < a.edad_min || answers.age > a.edad_max) return false;
    }
    if (answers.situation && a.subcategoria !== answers.situation) return false;
    if (answers.income != null && a.ingresos_max && answers.income > a.ingresos_max) return false;
    if (answers.zone === 'catalunya' && a.ambito === 'barcelona') return false;
    return true;
  }).sort((x, y) => {
    const sx = HW.computeStatus(x), sy = HW.computeStatus(y);
    const rank = (s) => s.status === 'abierta' ? 0 : s.status === 'proxima' ? 1 : 2;
    return rank(sx) - rank(sy);
  });
}

function Wizard({ lang, t, onClose, onOpen }) {
  const steps = lang === 'ca' ? WIZARD_STEPS_CA : WIZARD_STEPS_ES;
  const [stepIdx, setStepIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const [done, setDone] = React.useState(false);
  const step = steps[stepIdx];

  const next = (val) => {
    const updated = { ...answers, [step.id]: val };
    setAnswers(updated);
    if (stepIdx + 1 < steps.length) setStepIdx(stepIdx + 1);
    else setDone(true);
  };
  const back = () => { if (stepIdx > 0) { setStepIdx(stepIdx - 1); setDone(false); } };

  const matches = done ? matchAids(answers) : [];

  return React.createElement('div', { className: 'wizard-backdrop', onClick: (e) => { if (e.target === e.currentTarget) onClose(); } },
    React.createElement('div', { className: 'wizard', role: 'dialog', 'aria-modal': 'true' },
      React.createElement('div', { className: 'wizard-head' },
        React.createElement('span', { className: 'wizard-eyebrow' }, lang === 'ca' ? 'A QUÈ TINC DRET?' : '¿A QUÉ TENGO DERECHO?'),
        React.createElement('button', { onClick: onClose, 'aria-label': 'Tancar', className: 'wizard-x' }, '×'),
      ),
      !done && React.createElement('div', { className: 'wizard-progress' },
        steps.map((_, i) => React.createElement('span', {
          key: i,
          className: 'wizard-dot' + (i <= stepIdx ? ' on' : ''),
        })),
        React.createElement('span', { className: 'mono', style: { marginLeft: 'auto', fontSize: 11, color: 'var(--ink-muted)' } },
          `${stepIdx + 1}/${steps.length}`
        ),
      ),
      !done && React.createElement('div', { className: 'wizard-body' },
        React.createElement('h2', { className: 'wizard-q' }, step.q),
        step.type === 'number' && React.createElement(NumberStep, { step, onSubmit: next, lang }),
        step.type === 'choice' && React.createElement('div', { className: 'wizard-options' },
          step.options.map(o => React.createElement('button', {
            key: o.v,
            className: 'wizard-option',
            onClick: () => next(o.v),
          },
            React.createElement('span', { className: 'wizard-option-label' }, o.label),
            o.hint && React.createElement('span', { className: 'wizard-option-hint' }, o.hint),
          )),
        ),
      ),
      !done && stepIdx > 0 && React.createElement('div', { className: 'wizard-foot' },
        React.createElement('button', { onClick: back, className: 'wizard-back' },
          lang === 'ca' ? '← Enrere' : '← Atrás'
        ),
      ),
      done && React.createElement('div', { className: 'wizard-body' },
        React.createElement('h2', { className: 'wizard-q' },
          matches.length === 0
            ? (lang === 'ca' ? 'Amb aquests criteris no trobem cap ajuda.' : 'Con estos criterios no encontramos ninguna ayuda.')
            : (lang === 'ca' ? `Podries encaixar en ${matches.length} ajudes` : `Podrías encajar en ${matches.length} ayudas`)
        ),
        matches.length > 0 && React.createElement('p', { className: 'wizard-sub' },
          lang === 'ca' ? 'Comprova sempre els requisits complets a la ficha. Això és una orientació, no una resolució.' : 'Comprueba siempre los requisitos completos en la ficha. Esto es una orientación, no una resolución.'
        ),
        matches.length > 0 && React.createElement('div', { className: 'wizard-results' },
          matches.map(a => {
            const s = HW.computeStatus(a);
            const bar = HW.barKind(s.status, s.urgent);
            return React.createElement('button', {
              key: a.id,
              className: 'wizard-result',
              onClick: () => { onClose(); onOpen(a.id); },
            },
              React.createElement('span', { className: `wizard-result-bar ${bar}` }),
              React.createElement('span', { style: { flex: 1, minWidth: 0 } },
                React.createElement('span', { className: 'wizard-result-title' }, a[`nombre_${lang}`]),
                React.createElement('span', { className: 'wizard-result-sub' }, a[`cuantia_${lang}`]),
              ),
              React.createElement('span', { className: `card-status ${s.urgent ? 'urgent' : s.status === 'abierta' ? 'ok' : s.status === 'proxima' ? 'warn' : 'danger'}`, style: { flex: '0 0 auto' } },
                React.createElement('span', { className: 'dot' }),
                s.status === 'abierta' ? t.status_abierta : s.status === 'proxima' ? t.status_proxima : t.status_cerrada,
              ),
            );
          })
        ),
        React.createElement('div', { className: 'wizard-foot', style: { marginTop: 20 } },
          React.createElement('button', { onClick: () => { setStepIdx(0); setAnswers({}); setDone(false); }, className: 'wizard-back' },
            lang === 'ca' ? '↻ Tornar a començar' : '↻ Volver a empezar'
          ),
          React.createElement('button', { onClick: onClose, className: 'btn primary' },
            lang === 'ca' ? 'Veure el llistat' : 'Ver el listado'
          ),
        ),
      ),
    ),
  );
}

function NumberStep({ step, onSubmit, lang }) {
  const [val, setVal] = React.useState('');
  const submit = (e) => { e.preventDefault(); const n = Number(val); if (!isNaN(n) && n > 0) onSubmit(n); };
  return React.createElement('form', { onSubmit: submit, className: 'wizard-number-form' },
    React.createElement('input', {
      type: 'number',
      value: val,
      onChange: (e) => setVal(e.target.value),
      placeholder: step.placeholder,
      className: 'wizard-input mono',
      autoFocus: true,
      min: 0, max: 120,
    }),
    React.createElement('span', { className: 'wizard-input-unit mono' }, step.unit),
    React.createElement('button', { type: 'submit', className: 'btn primary', disabled: !val },
      lang === 'ca' ? 'Següent →' : 'Siguiente →'
    ),
  );
}

Object.assign(window, { Wizard });
