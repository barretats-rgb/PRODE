/* ============================================================
   PRODE REFUGIO — Armado de filas del ranking (lógica pura).
   Convierte documentos `players` de Firestore en las filas que
   consume la pantalla Ranking. Dual navegador/Node.
   ============================================================ */
(function (global) {
  function initials(name) {
    return String(name || "Jugador")
      .trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "JR";
  }

  // Badges ganados, en orden de prestigio fijo. cafe = participación (siempre).
  // reyIds: uids que ganaron alguna semana cerrada (Set o array; opcional).
  function badgesFor(p, reyIds) {
    const e = Number(p && p.exact) || 0;
    const id = p && p.id;
    const isRey = !!reyIds && (reyIds.has ? reyIds.has(id) : reyIds.indexOf(id) >= 0);
    const out = [];
    if (e >= 6) out.push("profeta");
    if (isRey) out.push("rey");
    if (e >= 3) out.push("casi");
    out.push("cafe");
    return out;
  }

  // Presencia: "online" si su último latido fue hace menos de ONLINE_MS.
  const ONLINE_MS = 150 * 1000; // 2,5 min (> intervalo de latido de 60s)

  // lastSeen puede venir como Timestamp de Firestore (.toMillis), número (ms) o ISO.
  function lastSeenMs(lastSeen) {
    if (!lastSeen) return 0;
    if (typeof lastSeen.toMillis === "function") return lastSeen.toMillis();
    if (typeof lastSeen === "number") return lastSeen;
    const t = Date.parse(lastSeen);
    return Number.isFinite(t) ? t : 0;
  }

  function isOnline(lastSeen, nowMs) {
    const ms = lastSeenMs(lastSeen);
    if (!ms) return false;
    return ((typeof nowMs === "number" ? nowMs : Date.now()) - ms) < ONLINE_MS;
  }

  // Orden del ranking: más puntos primero; desempata por más exactos y luego por id
  // (determinista). El MISMO criterio se usa para la foto previa y la posición actual,
  // así el movimiento no tiene ruido por reordenar empatados.
  function byRank(a, b) {
    const pa = Number(a && a.points) || 0, pb = Number(b && b.points) || 0;
    if (pb !== pa) return pb - pa;
    const ea = Number(a && a.exact) || 0, eb = Number(b && b.exact) || 0;
    if (eb !== ea) return eb - ea;
    return String(a && a.id).localeCompare(String(b && b.id));
  }

  // Mapa { id: posición (1-based) } con el orden del ranking. Lo usa firebase-service
  // para grabar prevRank (la foto de posiciones antes de un resultado).
  function computeRanks(players) {
    const out = {};
    (players || []).slice().sort(byRank).forEach((p, i) => { out[p.id] = i + 1; });
    return out;
  }

  // players: [{ id, name, points, exact, winner, favoriteTeam, avatarTone, prevRank }]
  // myUid: uid del jugador actual (para marcar la fila propia).
  // reyIds: uids que ganaron alguna semana cerrada (Set o array; opcional).
  function rankingRowsFromPlayers(players, myUid, reyIds) {
    return (players || [])
      .slice()
      .sort(byRank)
      .map((p, i) => {
        const badges = badgesFor(p, reyIds);
        const rank = i + 1;
        const prev = Number(p.prevRank);
        const move = Number.isFinite(prev) ? prev - rank : null; // + subió, - bajó, 0 igual
        return {
          id: p.id,
          name: (p.id === myUid && p.name) ? `${p.name} (vos)` : (p.name || "Jugador"),
          avatar: initials(p.name),
          pts: Number(p.points) || 0,
          exact: Number(p.exact) || 0,
          winner: Number(p.winner) || 0,
          streak: Number(p.exact) || 0, // placeholder: por ahora refleja exactos (no hay racha real aún)
          nat: p.favoriteTeam || "",
          badges,
          badge: badges[0], // compat: la primera (más prestigiosa)
          prevRank: Number.isFinite(prev) ? prev : null,
          move,                                                   // null = sin dato (jugador nuevo)
          trend: move > 0 ? "up" : move < 0 ? "down" : "flat",
          you: p.id === myUid,
          avatarTone: p.avatarTone || "olive",
          rank,
        };
      });
  }

  const api = { rankingRowsFromPlayers, computeRanks, badgesFor, initials, isOnline, ONLINE_MS };
  global.ProdeRanking = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
