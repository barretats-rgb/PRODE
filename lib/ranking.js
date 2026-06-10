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

  // players: [{ id, name, points, exact, winner, favoriteTeam, avatarTone }]
  // myUid: uid del jugador actual (para marcar la fila propia).
  // reyIds: uids que ganaron alguna semana cerrada (Set o array; opcional).
  function rankingRowsFromPlayers(players, myUid, reyIds) {
    return (players || [])
      .map((p) => {
        const badges = badgesFor(p, reyIds);
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
          trend: "flat", // placeholder: sin histórico de posición todavía
          you: p.id === myUid,
          avatarTone: p.avatarTone || "olive",
        };
      })
      .sort((a, b) => b.pts - a.pts)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }

  const api = { rankingRowsFromPlayers, badgesFor, initials };
  global.ProdeRanking = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
