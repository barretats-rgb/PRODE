/* ============================================================
   PRODE REFUGIO - Local functional store

   This is the app's offline-first data layer. It keeps the product
   functional with localStorage and mirrors writes to Firebase when
   ProdeDB is configured.
   ============================================================ */

(function () {
  const PLAYER_KEY = "prode_refugio_player";
  const PREDICTIONS_KEY = "prode_refugio_predictions";
  const SPECIALS_KEY = "prode_refugio_specials";

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || "") || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("prode:data", { detail: { key } }));
  }

  function initials(name) {
    return String(name || "Jugador")
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "JR";
  }

  function getPlayer() {
    const saved = readJson(PLAYER_KEY, null);
    if (saved) return saved;
    return {
      id: "local-player",
      name: "Tu jugador",
      phone: "",
      favoriteTeam: "CRC",
      avatar: "TJ",
      avatarTone: "citrus",
      mode: "solo",
      groupName: "",
      groupCode: "",
    };
  }

  async function savePlayer(player) {
    const payload = {
      ...getPlayer(),
      ...player,
      id: player.id || getPlayer().id || "local-player",
      avatar: player.avatar || initials(player.name),
      updatedAt: new Date().toISOString(),
    };
    writeJson(PLAYER_KEY, payload);
    try {
      await window.ProdeDB?.savePlayer(payload);
    } catch (error) {
      console.warn("[Prode Refugio] Perfil guardado localmente.", error);
    }
    return payload;
  }

  function clearPlayer() {
    localStorage.removeItem(PLAYER_KEY);
    window.dispatchEvent(new CustomEvent("prode:data", { detail: { key: PLAYER_KEY } }));
  }

  function getPredictions() {
    return {
      ...(window.MY_PREDICTIONS || {}),
      ...readJson(PREDICTIONS_KEY, {}),
    };
  }

  async function savePrediction(matchId, prediction) {
    const all = getPredictions();
    all[matchId] = {
      a: Number(prediction.a || 0),
      b: Number(prediction.b || 0),
      points: prediction.points ?? null,
      updatedAt: new Date().toISOString(),
    };
    writeJson(PREDICTIONS_KEY, all);
    try {
      await window.ProdeDB?.savePrediction(matchId, all[matchId]);
    } catch (error) {
      console.warn("[Prode Refugio] Prediccion guardada localmente.", error);
    }
    return all[matchId];
  }

  function getSpecials() {
    return {
      ...(window.MY_SPECIALS || {}),
      ...readJson(SPECIALS_KEY, {}),
    };
  }

  async function saveSpecials(specials) {
    const payload = {
      ...getSpecials(),
      ...specials,
      updatedAt: new Date().toISOString(),
    };
    writeJson(SPECIALS_KEY, payload);
    try {
      await window.ProdeDB?.saveSpecials(payload);
    } catch (error) {
      console.warn("[Prode Refugio] Especiales guardados localmente.", error);
    }
    return payload;
  }

  function outcome(a, b) {
    if (a > b) return "a";
    if (a < b) return "b";
    return "draw";
  }

  function scorePrediction(match, prediction) {
    if (!match || !prediction || match.status !== "finalizado") return null;
    const pa = Number(prediction.a);
    const pb = Number(prediction.b);
    const ra = Number(match.scoreA);
    const rb = Number(match.scoreB);
    if (!Number.isFinite(pa) || !Number.isFinite(pb)) return null;
    if (pa === ra && pb === rb) return { points: 5, kind: "exacto" };
    if (outcome(pa, pb) === outcome(ra, rb)) {
      const diffBonus = Math.abs(pa - pb) === Math.abs(ra - rb) ? 1 : 0;
      return { points: 3 + diffBonus, kind: diffBonus ? "diferencia" : "ganador" };
    }
    return { points: 0, kind: "fallado" };
  }

  function calculateStats(predictions = getPredictions()) {
    return (window.MATCHES || []).reduce((stats, match) => {
      const prediction = predictions[match.id];
      const scored = scorePrediction(match, prediction);
      if (!scored) return stats;
      stats.points += scored.points;
      stats.played += 1;
      if (scored.kind === "exacto") stats.exact += 1;
      if (scored.kind === "ganador" || scored.kind === "diferencia" || scored.kind === "exacto") {
        stats.winner += 1;
      }
      return stats;
    }, { points: 0, exact: 0, winner: 0, played: 0 });
  }

  function getRanking() {
    const player = getPlayer();
    const stats = calculateStats();
    const youRow = {
      rank: 0,
      name: `${player.name || "Tu jugador"} (vos)`,
      avatar: player.avatar || initials(player.name),
      pts: stats.points,
      exact: stats.exact,
      winner: stats.winner,
      streak: stats.exact,
      nat: player.favoriteTeam || "CRC",
      badge: stats.exact >= 3 ? "casi" : "cafe",
      trend: "up",
      you: true,
      avatarTone: player.avatarTone || "citrus",
    };
    const demo = (window.RANKING || [])
      .filter((row) => !row.you)
      .map((row) => ({ ...row, you: false }));

    return [...demo, youRow]
      .sort((a, b) => b.pts - a.pts)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }

  function getHistory() {
    const predictions = getPredictions();
    return (window.MATCHES || [])
      .filter((match) => match.status === "finalizado" && predictions[match.id])
      .map((match) => {
        const prediction = predictions[match.id];
        const scored = scorePrediction(match, prediction) || { points: 0, kind: "fallado" };
        return {
          match: `${match.a} vs ${match.b}`,
          pred: `${prediction.a}-${prediction.b}`,
          real: `${match.scoreA}-${match.scoreB}`,
          pts: scored.points,
          status: scored.kind,
        };
      });
  }

  function getProfile() {
    const player = getPlayer();
    const stats = calculateStats();
    const ranking = getRanking();
    const row = ranking.find((item) => item.you);
    return { player, stats, row, history: getHistory() };
  }

  window.ProdeStore = {
    getPlayer,
    savePlayer,
    clearPlayer,
    getPredictions,
    savePrediction,
    getSpecials,
    saveSpecials,
    scorePrediction,
    calculateStats,
    getRanking,
    getHistory,
    getProfile,
    initials,
  };
})();
