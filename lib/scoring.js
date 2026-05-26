/* ============================================================
   PRODE REFUGIO — Lógica pura de puntaje y cierre por horario.
   Sin DOM ni Firebase. Cargable en el navegador (window.ProdeScoring)
   y en Node (require) para tests.
   ============================================================ */
(function (global) {
  // Resultado relativo: gana A, gana B, o empate.
  function outcome(a, b) {
    if (a > b) return "a";
    if (a < b) return "b";
    return "draw";
  }

  // Puntos de una predicción contra un partido finalizado.
  // 5 exacto · 4 ganador+diferencia · 3 ganador · 0 fallado.
  function scorePrediction(match, prediction) {
    if (!match || !prediction || match.status !== "finalizado") return null;
    const pa = Number(prediction.a), pb = Number(prediction.b);
    const ra = Number(match.scoreA), rb = Number(match.scoreB);
    if (!Number.isFinite(pa) || !Number.isFinite(pb)) return null;
    if (!Number.isFinite(ra) || !Number.isFinite(rb)) return null;
    if (pa === ra && pb === rb) return { points: 5, kind: "exacto" };
    if (outcome(pa, pb) === outcome(ra, rb)) {
      const o = outcome(ra, rb);
      const diffBonus = o !== "draw" && Math.abs(pa - pb) === Math.abs(ra - rb) ? 1 : 0;
      return { points: 3 + diffBonus, kind: diffBonus ? "diferencia" : "ganador" };
    }
    return { points: 0, kind: "fallado" };
  }

  // Contribución de una predicción puntuada a los agregados del jugador.
  function statsDelta(scored) {
    if (!scored) return { points: 0, exact: 0, winner: 0, played: 0 };
    const isWinner = scored.kind === "exacto" || scored.kind === "diferencia" || scored.kind === "ganador";
    return {
      points: scored.points,
      exact: scored.kind === "exacto" ? 1 : 0,
      winner: isWinner ? 1 : 0,
      played: 1,
    };
  }

  // Diferencia campo por campo (next - prev). Permite re-puntuar un partido
  // corregido sumando sólo el delta al agregado (idempotente).
  function diffStats(next, prev) {
    return {
      points: next.points - prev.points,
      exact: next.exact - prev.exact,
      winner: next.winner - prev.winner,
      played: next.played - prev.played,
    };
  }

  // ¿La predicción de este partido está cerrada para edición?
  // Cerrada si ya no está "abierto", o si ya pasó el kickoff.
  function isLocked(match, nowMs) {
    if (!match) return true;
    if (match.status && match.status !== "abierto") return true;
    if (match.kickoffAt) {
      const k = Date.parse(match.kickoffAt);
      if (Number.isFinite(k) && (nowMs ?? Date.now()) >= k) return true;
    }
    return false;
  }

  // Calcula el puntaje de TODAS las predicciones de un partido finalizado y el delta
  // de agregados por jugador. Idempotente: usa el puntaje previo (points/kind) de cada
  // predicción, así re-finalizar resta lo viejo y suma lo nuevo sin doble conteo.
  // match: { status:"finalizado", scoreA, scoreB }
  // predictions: [{ playerId, a, b, points(prev|null), kind(prev|null) }]
  function scoreMatchFanout(match, predictions) {
    // Sólo reparte sobre un partido finalizado; si no, no toca nada (evita puntuar en cero por error).
    if (!match || match.status !== "finalizado") return { perPrediction: [], perPlayer: {} };
    const perPrediction = [];
    const perPlayer = {};
    (predictions || []).forEach((p) => {
      const prev = (p.points != null) ? { points: p.points, kind: p.kind } : null;
      const next = scorePrediction(match, { a: p.a, b: p.b });
      const delta = diffStats(statsDelta(next), statsDelta(prev));
      perPrediction.push({
        playerId: p.playerId, a: p.a, b: p.b,
        points: next ? next.points : 0,
        kind: next ? next.kind : null,
      });
      const acc = perPlayer[p.playerId] || { points: 0, exact: 0, winner: 0, played: 0 };
      acc.points += delta.points;
      acc.exact += delta.exact;
      acc.winner += delta.winner;
      acc.played += delta.played;
      perPlayer[p.playerId] = acc;
    });
    return { perPrediction, perPlayer };
  }

  const api = { scorePrediction, statsDelta, diffStats, isLocked, scoreMatchFanout };
  global.ProdeScoring = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
