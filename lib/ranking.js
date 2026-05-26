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

  function badgeFor(exact) {
    const e = Number(exact) || 0;
    if (e >= 6) return "profeta";
    if (e >= 3) return "casi";
    return "cafe";
  }

  // players: [{ id, name, points, exact, winner, favoriteTeam, avatarTone }]
  // myUid: uid del jugador actual (para marcar la fila propia).
  function rankingRowsFromPlayers(players, myUid) {
    return (players || [])
      .map((p) => ({
        id: p.id,
        name: (p.id === myUid && p.name) ? `${p.name} (vos)` : (p.name || "Jugador"),
        avatar: initials(p.name),
        pts: Number(p.points) || 0,
        exact: Number(p.exact) || 0,
        winner: Number(p.winner) || 0,
        streak: Number(p.exact) || 0, // placeholder: por ahora refleja exactos (no hay racha real aún)
        nat: p.favoriteTeam || "",
        badge: badgeFor(p.exact),
        trend: "flat", // placeholder: sin histórico de posición todavía
        you: p.id === myUid,
        avatarTone: p.avatarTone || "olive",
      }))
      .sort((a, b) => b.pts - a.pts)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }

  const api = { rankingRowsFromPlayers, initials };
  global.ProdeRanking = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
