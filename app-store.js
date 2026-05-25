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
  const MATCH_OVERRIDES_KEY = "prode_refugio_match_overrides";
  const LIVE_STATUS_KEY = "prode_refugio_live_status";

  const TEAM_ALIASES = {
    ARG: ["argentina"],
    BRA: ["brazil", "brasil"],
    URU: ["uruguay"],
    COL: ["colombia"],
    ECU: ["ecuador"],
    PAR: ["paraguay"],
    VEN: ["venezuela"],
    CHI: ["chile"],
    CRC: ["costa rica"],
    MEX: ["mexico", "méxico"],
    USA: ["usa", "united states", "estados unidos", "eeuu", "ee.uu."],
    CAN: ["canada", "canadá"],
    PAN: ["panama", "panamá"],
    JAM: ["jamaica"],
    HON: ["honduras"],
    HAI: ["haiti", "haití"],
    ESP: ["spain", "españa"],
    FRA: ["france", "francia"],
    GER: ["germany", "alemania"],
    ITA: ["italy", "italia"],
    POR: ["portugal"],
    ENG: ["england", "inglaterra"],
    NED: ["netherlands", "países bajos", "paises bajos", "holanda"],
    BEL: ["belgium", "bélgica", "belgica"],
    CRO: ["croatia", "croacia"],
    SUI: ["switzerland", "suiza"],
    DEN: ["denmark", "dinamarca"],
    AUT: ["austria"],
    POL: ["poland", "polonia"],
    SRB: ["serbia"],
    TUR: ["turkey", "turquía", "turquia"],
    NOR: ["norway", "noruega"],
    MAR: ["morocco", "marruecos"],
    SEN: ["senegal"],
    EGY: ["egypt", "egipto"],
    CIV: ["ivory coast", "cote d'ivoire", "côte d’ivoire", "costa de marfil"],
    ALG: ["algeria", "argelia"],
    NGA: ["nigeria"],
    GHA: ["ghana"],
    TUN: ["tunisia", "túnez", "tunez"],
    CMR: ["cameroon", "camerún", "camerun"],
    JPN: ["japan", "japón", "japon"],
    KOR: ["south korea", "korea republic", "corea", "corea del sur"],
    IRN: ["iran", "irán"],
    AUS: ["australia"],
    QAT: ["qatar", "catar"],
    KSA: ["saudi arabia", "arabia saudi", "arabia saudita", "arabia"],
    UZB: ["uzbekistan", "uzbekistán"],
  };

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

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function teamMatches(code, apiTeam) {
    const apiCode = normalizeText(apiTeam?.code);
    const apiName = normalizeText(apiTeam?.name);
    const localCode = normalizeText(code);
    const localName = normalizeText(window.TEAMS?.[code]);
    const aliases = (TEAM_ALIASES[code] || []).map(normalizeText);
    return [localCode, localName, ...aliases].some((candidate) => (
      candidate && (candidate === apiCode || candidate === apiName)
    ));
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
    const dbPlayer = window.ProdeDB?.getPlayer?.();
    if (dbPlayer) return dbPlayer;
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
    if (window.ProdeDB?.getUser?.()) {
      // Con sesión, ProdeDB es la fuente de verdad (escribe en Firestore + state.player).
      await window.ProdeDB.savePlayer({
        ...player,
        avatar: player.avatar || initials(player.name),
      });
      return window.ProdeDB.getPlayer(); // ambos caminos devuelven el objeto jugador
    }
    // Sin sesión: comportamiento local previo.
    const payload = {
      ...getPlayer(),
      ...player,
      id: player.id || getPlayer().id || "local-player",
      avatar: player.avatar || initials(player.name),
      updatedAt: new Date().toISOString(),
    };
    writeJson(PLAYER_KEY, payload);
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

  function getMatchOverrides() {
    return readJson(MATCH_OVERRIDES_KEY, {});
  }

  function getMatches() {
    const overrides = getMatchOverrides();
    return (window.MATCHES || []).map((match) => ({
      ...match,
      ...(overrides[match.id] || {}),
    }));
  }

  async function saveMatchResult(matchId, result) {
    const overrides = getMatchOverrides();
    const current = getMatches().find((match) => match.id === matchId) || {};
    const payload = {
      ...current,
      ...result,
      id: matchId,
      updatedAt: new Date().toISOString(),
    };
    overrides[matchId] = payload;
    writeJson(MATCH_OVERRIDES_KEY, overrides);
    try {
      await window.ProdeDB?.saveMatchResult(matchId, payload);
    } catch (error) {
      console.warn("[Prode Refugio] Resultado guardado localmente.", error);
    }
    return payload;
  }

  function findLocalMatch(apiFixture) {
    return getMatches().find((match) => {
      const direct = teamMatches(match.a, apiFixture.home) && teamMatches(match.b, apiFixture.away);
      const reversed = teamMatches(match.a, apiFixture.away) && teamMatches(match.b, apiFixture.home);
      return direct || reversed;
    });
  }

  async function syncLiveMatches() {
    const status = {
      ok: false,
      checkedAt: new Date().toISOString(),
      matched: 0,
      configured: false,
      message: "",
    };

    try {
      const response = await fetch("/api/live-matches", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      status.configured = !!payload.configured;
      if (!payload.ok) {
        status.message = payload.error || "API-Football sin datos disponibles.";
        writeJson(LIVE_STATUS_KEY, status);
        return status;
      }

      const overrides = getMatchOverrides();
      (payload.fixtures || []).forEach((fixture) => {
        const local = findLocalMatch(fixture);
        if (!local) return;
        const homeIsLocalA = teamMatches(local.a, fixture.home);
        overrides[local.id] = {
          ...local,
          status: fixture.status,
          scoreA: homeIsLocalA ? fixture.scoreHome : fixture.scoreAway,
          scoreB: homeIsLocalA ? fixture.scoreAway : fixture.scoreHome,
          minute: fixture.minute || local.minute || "",
          apiFixtureId: fixture.apiFixtureId,
          apiStatusShort: fixture.statusShort,
          liveSyncedAt: payload.fetchedAt || new Date().toISOString(),
        };
        status.matched += 1;
      });

      if (status.matched > 0) {
        writeJson(MATCH_OVERRIDES_KEY, overrides);
      }
      status.ok = true;
      status.message = status.matched > 0
        ? `${status.matched} partido(s) sincronizado(s).`
        : "Sin partidos del prode en vivo ahora.";
      writeJson(LIVE_STATUS_KEY, status);
      return status;
    } catch (error) {
      status.message = error.message || "No se pudo consultar API-Football.";
      writeJson(LIVE_STATUS_KEY, status);
      return status;
    }
  }

  function getLiveStatus() {
    return readJson(LIVE_STATUS_KEY, null);
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

  // El puntaje vive en lib/scoring.js (testeado). Acá sólo se delega.
  function scorePrediction(match, prediction) {
    return window.ProdeScoring.scorePrediction(match, prediction);
  }

  function calculateStats(predictions = getPredictions()) {
    return getMatches().reduce((stats, match) => {
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
    return getMatches()
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
    getMatches,
    saveMatchResult,
    getPredictions,
    savePrediction,
    getSpecials,
    saveSpecials,
    scorePrediction,
    calculateStats,
    getRanking,
    getHistory,
    getProfile,
    syncLiveMatches,
    getLiveStatus,
    initials,
  };
})();
