/* ============================================================
   PRODE REFUGIO — Cuadro eliminatorio (lógica pura).
   Deduce el ganador/perdedor de cada partido finalizado y rellena
   los equipos de la ronda siguiente leyendo el `feed` de cada partido.
   NUNCA pisa ni vacía un equipo ya cargado. Dual navegador/Node.
   ============================================================ */
(function (global) {
  // Ganador de un partido ya con equipos y resultado. null si no se puede saber.
  function matchWinner(m) {
    if (!m || m.status !== "finalizado") return null;
    const a = m.a, b = m.b;
    if (!a || !b) return null;
    const sa = Number(m.scoreA), sb = Number(m.scoreB);
    if (!Number.isFinite(sa) || !Number.isFinite(sb)) return null;
    if (sa > sb) return a;
    if (sb > sa) return b;
    // Empate (penales): gana el marcado en `advances` si es uno de los dos.
    return (m.advances === a || m.advances === b) ? m.advances : null;
  }

  function matchLoser(m) {
    const w = matchWinner(m);
    if (!w) return null;
    return w === m.a ? m.b : m.a;
  }

  // Resuelve un origen del feed: "W" = ganador, "L" = perdedor.
  function resolvePick(byId, ref) {
    if (!ref || !ref.m) return null;
    const src = byId[ref.m];
    if (!src) return null;
    return ref.pick === "L" ? matchLoser(src) : matchWinner(src);
  }

  const ROUND_ORDER = ["r32", "r16", "qf", "sf", "third", "final"];

  // Copia de `matches` con los equipos de eliminación rellenados donde se pueda.
  // No pisa equipos presentes ni vacía ninguno; no muta la entrada.
  function resolveBracket(matches) {
    const out = (matches || []).map((m) => ({ ...m }));
    const byId = {};
    out.forEach((m) => { byId[m.id] = m; });
    // Ronda por ronda: los ganadores de una ronda alimentan la siguiente.
    for (const round of ROUND_ORDER) {
      for (const m of out) {
        if (m.round !== round || !m.feed) continue;
        if (!m.a && m.feed.a) { const t = resolvePick(byId, m.feed.a); if (t) m.a = t; }
        if (!m.b && m.feed.b) { const t = resolvePick(byId, m.feed.b); if (t) m.b = t; }
      }
    }
    return out;
  }

  const api = { matchWinner, matchLoser, resolveBracket };
  global.ProdeBracket = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
