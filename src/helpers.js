// Helpers for date/status logic — AjutsCat
// Uses window.TODAY as reference so the prototype is deterministic.

window.Helpers = (function() {
  function parseDate(s) { return new Date(s + 'T12:00:00'); }

  function today() { return window.TODAY || new Date(); }

  function daysBetween(a, b) {
    const ms = parseDate(b) - today();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  function daysSince(a) {
    const ms = today() - parseDate(a);
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  // Returns one of: 'abierta' 'cerrada' 'proxima', and urgency flag
  function computeStatus(aid) {
    const now = today();
    const open = parseDate(aid.fecha_apertura);
    const close = parseDate(aid.fecha_cierre);
    let status;
    if (now < open) status = 'proxima';
    else if (now > close) status = 'cerrada';
    else status = 'abierta';
    const daysLeft = Math.ceil((close - now) / (1000 * 60 * 60 * 24));
    const urgent = status === 'abierta' && daysLeft <= 3;
    const closingSoon = status === 'abierta' && daysLeft <= 7;
    return { status, daysLeft, urgent, closingSoon };
  }

  // What % of the window has elapsed (0..1). undefined if not open.
  function windowProgress(aid) {
    const now = today();
    const open = parseDate(aid.fecha_apertura);
    const close = parseDate(aid.fecha_cierre);
    const total = close - open;
    const passed = now - open;
    return Math.max(0, Math.min(1, passed / total));
  }

  function formatDate(s, locale) {
    const d = parseDate(s);
    const loc = locale === 'ca' ? 'ca-ES' : 'es-ES';
    return d.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDateShort(s, locale) {
    const d = parseDate(s);
    const loc = locale === 'ca' ? 'ca-ES' : 'es-ES';
    return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' });
  }

  function barKind(status, urgent) {
    if (urgent) return 'urgent';
    if (status === 'abierta') return 'ok';
    if (status === 'proxima') return 'warn';
    if (status === 'cerrada') return 'danger';
    return '';
  }

  function ageMatches(aid, userAge) {
    if (userAge == null) return true;
    return userAge >= aid.edad_min && userAge <= aid.edad_max;
  }

  function zoneMatches(aid, userZone) {
    if (!userZone || userZone === 'any') return true;
    if (aid.ambito === 'catalunya') return true;
    if (userZone === 'bcn' && aid.ambito === 'barcelona') return true;
    return false;
  }

  return { parseDate, today, daysBetween, daysSince, computeStatus, windowProgress, formatDate, formatDateShort, barKind, ageMatches, zoneMatches };
})();
