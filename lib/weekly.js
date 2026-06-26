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

  function weekStats(p, weekId) {
    const w = (p && p.weekly && p.weekly[weekId]) || {};
    return { points: Number(w.points) || 0, exact: Number(w.exact) || 0 };
  }

  // Líderes de una semana: máx puntos, desempata más exactos; si persiste el
  // empate devuelve a todos los empatados. [] si nadie sumó puntos esa semana.
  function weeklyLeaders(players, weekId) {
    const scored = (players || [])
      .map((p) => ({ id: p.id, name: p.name || "Jugador", ...weekStats(p, weekId) }))
      .filter((p) => p.points > 0)
      .sort((a, b) => b.points - a.points || b.exact - a.exact);
    if (!scored.length) return [];
    const top = scored[0];
    return scored.filter((p) => p.points === top.points && p.exact === top.exact);
  }

  // Top de la semana: hasta `limit` jugadores que sumaron, ordenados por puntos desc
  // y luego más exactos; cada uno con `gap` = puntos del puntero − sus puntos (cuánto
  // le falta para alcanzar la punta). [] si nadie sumó esa semana.
  function weeklyTop(players, weekId, limit = 3) {
    const scored = (players || [])
      .map((p) => ({ id: p.id, name: p.name || "Jugador", ...weekStats(p, weekId) }))
      .filter((p) => p.points > 0)
      .sort((a, b) => b.points - a.points || b.exact - a.exact);
    if (!scored.length) return [];
    const topPoints = scored[0].points;
    return scored.slice(0, limit).map((p) => ({ ...p, gap: topPoints - p.points }));
  }

  // Ganadores de las semanas ya cerradas (anteriores a currentWeek).
  // Semanas sin puntos se omiten.
  function weeklyHistory(players, currentWeek) {
    const cur = Number(String(currentWeek).slice(1)) || 1;
    const out = [];
    for (let n = 1; n < cur; n++) {
      const weekId = "s" + n;
      const leaders = weeklyLeaders(players, weekId);
      if (leaders.length) out.push({ weekId, week: n, label: weekLabel(weekId), leaders });
    }
    return out;
  }

  const api = { weekIdForDate, currentWeekId, weekLabel, weeklyLeaders, weeklyTop, weeklyHistory, MAX_WEEK };
  global.ProdeWeekly = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
