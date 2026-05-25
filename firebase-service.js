/* ============================================================
   PRODE REFUGIO - Firebase data layer

   Keeps the prototype usable without Firebase credentials. When
   firebase-config.js has real values, these helpers persist to Firestore.
   ============================================================ */

(function () {
  const placeholderProject = "PEGAR_PROJECT_ID";
  const hasFirebaseConfig =
    window.FIREBASE_CONFIG &&
    window.FIREBASE_CONFIG.projectId &&
    window.FIREBASE_CONFIG.projectId !== placeholderProject;

  const state = {
    ready: false,
    user: null,
    db: null,
  };

  function firestoreNow() {
    return window.firebase?.firestore?.FieldValue?.serverTimestamp
      ? window.firebase.firestore.FieldValue.serverTimestamp()
      : new Date().toISOString();
  }

  function localNow() {
    return new Date().toISOString();
  }

  function localPlayerId() {
    const key = "prode_refugio_player_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(key, id);
    }
    return id;
  }

  function collection(name) {
    if (!state.db) return null;
    return state.db.collection(name);
  }

  async function init() {
    if (!hasFirebaseConfig || !window.firebase) {
      console.info("[Prode Refugio] Firebase no configurado. Usando datos demo.");
      return { ready: false };
    }

    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(window.FIREBASE_CONFIG);
    }

    state.db = window.firebase.firestore();

    try {
      const auth = window.firebase.auth();
      const credential = await auth.signInAnonymously();
      state.user = credential.user;
    } catch (error) {
      console.warn("[Prode Refugio] Auth anonimo fallo. Firestore seguira disponible si las reglas lo permiten.", error);
    }

    state.ready = true;
    return { ready: true, user: state.user };
  }

  function isReady() {
    return state.ready;
  }

  function currentPlayerId() {
    return state.user?.uid || localPlayerId();
  }

  async function savePlayer(player) {
    const id = currentPlayerId();
    const localPayload = {
      ...player,
      id,
      updatedAt: localNow(),
      createdAt: localNow(),
    };
    const payload = {
      ...localPayload,
      updatedAt: firestoreNow(),
      createdAt: firestoreNow(),
    };

    localStorage.setItem("prode_refugio_player", JSON.stringify(localPayload));

    if (!state.ready) return { id, offline: true };

    await collection("players").doc(id).set(payload, { merge: true });
    return { id, offline: false };
  }

  async function savePrediction(matchId, prediction) {
    const playerId = currentPlayerId();
    const payload = {
      playerId,
      matchId,
      scoreA: Number(prediction.a || 0),
      scoreB: Number(prediction.b || 0),
      points: prediction.points ?? null,
      updatedAt: firestoreNow(),
    };

    const local = JSON.parse(localStorage.getItem("prode_refugio_predictions") || "{}");
    local[matchId] = { a: payload.scoreA, b: payload.scoreB, points: payload.points };
    localStorage.setItem("prode_refugio_predictions", JSON.stringify(local));

    if (!state.ready) return { offline: true };

    await collection("predictions").doc(`${playerId}_${matchId}`).set(payload, { merge: true });
    return { offline: false };
  }

  async function saveSpecials(specials) {
    const playerId = currentPlayerId();
    const payload = {
      playerId,
      ...specials,
      updatedAt: firestoreNow(),
    };

    localStorage.setItem("prode_refugio_specials", JSON.stringify(payload));

    if (!state.ready) return { offline: true };

    await collection("specialPredictions").doc(playerId).set(payload, { merge: true });
    return { offline: false };
  }

  async function loadRanking() {
    if (!state.ready) return window.RANKING || [];

    const snap = await collection("players")
      .orderBy("points", "desc")
      .limit(50)
      .get();

    return snap.docs.map((doc, index) => ({
      id: doc.id,
      rank: index + 1,
      ...doc.data(),
    }));
  }

  async function saveMatchResult(matchId, result) {
    const payload = {
      ...result,
      status: result.status || "finalizado",
      updatedAt: firestoreNow(),
    };

    if (!state.ready) return { offline: true };

    await collection("matches").doc(matchId).set(payload, { merge: true });
    return { offline: false };
  }

  window.ProdeDB = {
    init,
    isReady,
    currentPlayerId,
    savePlayer,
    savePrediction,
    saveSpecials,
    loadRanking,
    saveMatchResult,
  };
})();
