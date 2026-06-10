/* ============================================================
   PRODE REFUGIO — Semanas del torneo (lógica pura).
   Semana 1 = jue 11 jun → mié 17 jun 2026 (hora Costa Rica, −06:00);
   cada semana siguiente arranca 7 días después. Dual navegador/Node.
   ============================================================ */
(function (global) {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const CR_OFFSET_MS = 6 * 60 * 60 * 1000; // Costa Rica = UTC−6, sin DST
  const TOURNAMENT_START_MS = Date.parse("2026-06-11T00:00:00-06:00");
  const MAX_WEEK = 6; // la final (19 jul) cae en la semana 6 (16–22 jul)
  const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function weekNumberForMs(ms) {
    const diff = ms - TOURNAMENT_START_MS;
    return Math.max(1, Math.floor(diff / WEEK_MS) + 1);
  }

  // isoDate: kickoff del partido (ISO con offset). Devuelve "s1", "s2", ...
  // Fechas anteriores al torneo → "s1" (clamp; no pasa con el fixture real).
  function weekIdForDate(isoDate) {
    return "s" + weekNumberForMs(Date.parse(isoDate));
  }

  // Semana en curso para un timestamp (default: ahora). Clamp a [s1, s6].
  function currentWeekId(nowMs) {
    const ms = typeof nowMs === "number" ? nowMs : Date.now();
    return "s" + clamp(weekNumberForMs(ms), 1, MAX_WEEK);
  }

  // Día y mes calendario de Costa Rica para un instante.
  function crParts(ms) {
    const d = new Date(ms - CR_OFFSET_MS); // el reloj CR = reloj UTC − 6h
    return { day: d.getUTCDate(), month: d.getUTCMonth() };
  }

  // "Semana 1 · 11–17 jun" (mismo mes) / "Semana 3 · 25 jun–1 jul" (cruza mes).
  function weekLabel(weekId) {
    const n = Number(String(weekId).slice(1)) || 1;
    const startMs = TOURNAMENT_START_MS + (n - 1) * WEEK_MS + 12 * 60 * 60 * 1000; // mediodía CR, evita bordes
    const endMs = startMs + 6 * DAY_MS;
    const a = crParts(startMs);
    const b = crParts(endMs);
    const range = a.month === b.month
      ? `${a.day}–${b.day} ${MONTHS[a.month]}`
      : `${a.day} ${MONTHS[a.month]}–${b.day} ${MONTHS[b.month]}`;
    return `Semana ${n} · ${range}`;
  }

  const api = { weekIdForDate, currentWeekId, weekLabel, MAX_WEEK };
  global.ProdeWeekly = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
