/* ============================================================
   PRODE REFUGIO — Especiales (lógica pura).
   Campeón, goleador, etc.: +5 por acierto. El admin confirma las
   respuestas oficiales de a una; el reparto es idempotente vía el
   mapa `awarded` de cada specialPredictions/{uid}. Dual navegador/Node.
   ============================================================ */
(function (global) {
  const SPECIAL_KEYS = ["campeon", "subcampeon", "goleador", "arquero", "sorpresa", "fairplay"];
  const SPECIAL_POINTS = 5;
  // Cierre de edición de especiales: 16 jun 2026 18:00 Costa Rica.
  const SPECIALS_LOCK_MS = Date.parse("2026-06-16T18:00:00-06:00");

  function specialsLocked(nowMs) {
    const ms = typeof nowMs === "number" ? nowMs : Date.now();
    return ms >= SPECIALS_LOCK_MS;
  }

  // "  Mbappé " → "mbappe": para no perder puntos por tildes/mayúsculas.
  function normalizeAnswer(s) {
    return String(s == null ? "" : s)
      .trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // official: respuestas confirmadas { campeon: "ARG", ... } (subset de SPECIAL_KEYS).
  // predictions: docs specialPredictions [{ playerId, <picks>, awarded }].
  // Devuelve awards absolutos por predicción y deltas por jugador. Idempotente:
  // el delta descuenta lo ya repartido en `awarded` (mismo patrón que los partidos).
  function scoreSpecialsFanout(official, predictions) {
    const confirmed = SPECIAL_KEYS.filter((k) => official && official[k] != null && official[k] !== "");
    const perPrediction = [];
    const perPlayer = {};
    if (!confirmed.length) return { perPrediction, perPlayer };
    for (const p of predictions || []) {
      if (!p || !p.playerId) continue;
      const awarded = {};
      let delta = 0;
      for (const key of confirmed) {
        const pick = normalizeAnswer(p[key]);
        const target = pick !== "" && pick === normalizeAnswer(official[key]) ? SPECIAL_POINTS : 0;
        awarded[key] = target;
        delta += target - (Number(p.awarded && p.awarded[key]) || 0);
      }
      perPrediction.push({ playerId: p.playerId, awarded });
      if (delta !== 0) perPlayer[p.playerId] = { specialsPoints: delta };
    }
    return { perPrediction, perPlayer };
  }

  const api = { SPECIAL_KEYS, SPECIAL_POINTS, SPECIALS_LOCK_MS, specialsLocked, normalizeAnswer, scoreSpecialsFanout };
  global.ProdeSpecials = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
