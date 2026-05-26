/* ============================================================
   PRODE REFUGIO - Firebase data layer (auth + jugador)

   Fuente de verdad de la sesión: mantiene state.user / state.player,
   escucha onAuthStateChanged y notifica a la UI con onAuthChange.
   Sin credenciales reales, el prototipo sigue funcionando en modo local.
   ============================================================ */

(function () {
  const placeholderProject = "PEGAR_PROJECT_ID";
  const hasFirebaseConfig =
    window.FIREBASE_CONFIG &&
    window.FIREBASE_CONFIG.projectId &&
    window.FIREBASE_CONFIG.projectId !== placeholderProject;

  const state = { ready: false, user: null, player: null, db: null, auth: null, matchResults: {}, myPredictions: {}, myPredsUnsub: null };
  const listeners = new Set();

  function firestoreNow() {
    return window.firebase?.firestore?.FieldValue?.serverTimestamp
      ? window.firebase.firestore.FieldValue.serverTimestamp()
      : new Date().toISOString();
  }

  function localNow() {
    return new Date().toISOString();
  }

  function isAdmin() {
    return !!(state.user && window.ProdeAdmins?.isAdminEmail(state.user.email, window.PRODE_ADMINS || []));
  }

  function snapshot() {
    return { user: state.user, player: state.player, isAdmin: isAdmin(), ready: state.ready };
  }

  function notify() {
    listeners.forEach((cb) => { try { cb(snapshot()); } catch (e) { console.error("[Prode] listener", e); } });
  }

  function collection(name) {
    return state.db ? state.db.collection(name) : null;
  }

  function currentPlayerId() {
    return state.user?.uid || null;
  }

  // Crea el doc players/{uid} si no existe; siempre deja state.player actualizado.
  // La PII (email/teléfono) NO va en players (que es de lectura pública para el ranking):
  // va en playerPrivate/{uid}, que sólo leen el dueño y el admin.
  async function ensurePlayer(user) {
    const ref = collection("players").doc(user.uid);
    const snap = await ref.get();
    let pub;
    if (snap.exists) {
      pub = { id: user.uid, ...snap.data() };
    } else {
      const fresh = {
        name: user.displayName || "Jugador",
        photoURL: user.photoURL || "",
        favoriteTeam: "",
        avatarTone: "citrus",
        points: 0, exact: 0, winner: 0, played: 0, specialsPoints: 0,
        createdAt: firestoreNow(),
        updatedAt: firestoreNow(),
      };
      await ref.set(fresh, { merge: true });
      await collection("playerPrivate").doc(user.uid).set(
        { email: user.email || "", createdAt: firestoreNow(), updatedAt: firestoreNow() },
        { merge: true });
      // En memoria guardamos timestamps reales (ISO); el sentinel serverTimestamp() va sólo a Firestore.
      const iso = localNow();
      pub = { id: user.uid, ...fresh, createdAt: iso, updatedAt: iso };
    }
    // Datos privados propios (email/teléfono): sólo en memoria, para el perfil del dueño.
    try {
      const priv = await collection("playerPrivate").doc(user.uid).get();
      if (priv.exists) pub = { ...pub, ...priv.data() };
    } catch (e) { /* el dueño puede leer su propio doc; si falla, seguimos sin PII */ }
    state.player = pub;
    return state.player;
  }

  async function init() {
    if (state.ready) return;
    if (!hasFirebaseConfig || !window.firebase) {
      console.info("[Prode Refugio] Firebase no configurado. Modo local.");
      notify();
      return;
    }
    if (!window.firebase.apps.length) window.firebase.initializeApp(window.FIREBASE_CONFIG);
    state.db = window.firebase.firestore();
    state.auth = window.firebase.auth();
    state.ready = true;
    // Tras ready, onAuthStateChanged resuelve la sesión async; el estado transitorio
    // "ready && user:null" es esperado y lo maneja el gate de la UI (muestra Login).

    // Resultados oficiales (los carga el admin). Se cachean y se avisa a la UI con prode:data.
    collection("matches").onSnapshot((snap) => {
      const next = {};
      snap.forEach((doc) => { next[doc.id] = { id: doc.id, ...doc.data() }; });
      state.matchResults = next;
      window.dispatchEvent(new CustomEvent("prode:data", { detail: { key: "matches" } }));
    }, (e) => console.error("[Prode Refugio] matches snapshot", e));

    state.auth.onAuthStateChanged(async (user) => {
      if (state.myPredsUnsub) { state.myPredsUnsub(); state.myPredsUnsub = null; }
      if (user) {
        state.user = user;
        try { await ensurePlayer(user); }
        catch (e) { console.error("[Prode Refugio] ensurePlayer falló", e); }
        // Read-back: mis predicciones en vivo (las veo en cualquier dispositivo).
        state.myPredsUnsub = collection("predictions")
          .where("playerId", "==", user.uid)
          .onSnapshot((snap) => {
            const next = {};
            snap.forEach((doc) => {
              const d = doc.data();
              if (!d.matchId) return; // doc sin matchId: lo ignoramos (no contamina el cache)
              next[d.matchId] = { a: d.scoreA, b: d.scoreB, points: d.points ?? null, kind: d.kind ?? null };
            });
            state.myPredictions = next;
            window.dispatchEvent(new CustomEvent("prode:data", { detail: { key: "myPredictions" } }));
          }, (e) => console.error("[Prode Refugio] mis predicciones snapshot", e));
      } else {
        state.user = null;
        state.player = null;
        state.myPredictions = {};
      }
      notify();
    });
  }

  // Suscribe a cambios de sesión. Emite el estado actual de inmediato. Devuelve unsub.
  function onAuthChange(cb) {
    listeners.add(cb);
    cb(snapshot());
    return () => listeners.delete(cb);
  }

  async function signInWithGoogle() {
    if (!state.ready) await init();
    if (!state.auth) throw new Error("Firebase no está configurado.");
    const provider = new window.firebase.auth.GoogleAuthProvider();
    return state.auth.signInWithPopup(provider);
  }

  async function signOutUser() {
    if (state.auth) await state.auth.signOut();
  }

  // Actualiza el doc del jugador autenticado (merge) y refresca state.player.
  async function savePlayer(patch) {
    const id = currentPlayerId();
    if (!state.ready || !id) {
      // Modo local: deja el patch en localStorage para que la UI no se rompa sin sesión.
      const local = JSON.parse(localStorage.getItem("prode_refugio_player") || "{}");
      const merged = { ...local, ...patch };
      localStorage.setItem("prode_refugio_player", JSON.stringify(merged));
      state.player = { ...(state.player || {}), ...patch };
      notify();
      return { offline: true };
    }
    // La PII va al doc privado; el resto al público (lectura pública para el ranking).
    const { phone, email, ...pub } = patch;
    await collection("players").doc(id).set({ ...pub, updatedAt: firestoreNow() }, { merge: true });
    if (phone !== undefined || email !== undefined) {
      const priv = { updatedAt: firestoreNow() };
      if (phone !== undefined) priv.phone = phone;
      if (email !== undefined) priv.email = email;
      await collection("playerPrivate").doc(id).set(priv, { merge: true });
    }
    state.player = { ...(state.player || {}), ...patch, id, updatedAt: localNow() };
    notify();
    return { offline: false };
  }

  async function savePrediction(matchId, prediction) {
    const playerId = currentPlayerId();
    const payload = {
      playerId, matchId,
      scoreA: Number(prediction.a || 0),
      scoreB: Number(prediction.b || 0),
      points: prediction.points ?? null,
      updatedAt: firestoreNow(),
    };
    const local = JSON.parse(localStorage.getItem("prode_refugio_predictions") || "{}");
    local[matchId] = { a: payload.scoreA, b: payload.scoreB, points: payload.points };
    localStorage.setItem("prode_refugio_predictions", JSON.stringify(local));
    if (!state.ready || !playerId) return { offline: true };
    await collection("predictions").doc(`${playerId}_${matchId}`).set(payload, { merge: true });
    return { offline: false };
  }

  async function saveSpecials(specials) {
    const playerId = currentPlayerId();
    const payload = { playerId, ...specials, updatedAt: firestoreNow() };
    localStorage.setItem("prode_refugio_specials", JSON.stringify(payload));
    if (!state.ready || !playerId) return { offline: true };
    await collection("specialPredictions").doc(playerId).set(payload, { merge: true });
    return { offline: false };
  }

  async function loadRanking() {
    if (!state.ready) return window.RANKING || [];
    const snap = await collection("players").orderBy("points", "desc").limit(50).get();
    return snap.docs.map((doc, index) => ({ id: doc.id, rank: index + 1, ...doc.data() }));
  }

  async function saveMatchResult(matchId, result) {
    const payload = { ...result, status: result.status || "finalizado", updatedAt: firestoreNow() };
    if (!state.ready) return { offline: true };
    await collection("matches").doc(matchId).set(payload, { merge: true });
    return { offline: false };
  }

  function getMatchResults() {
    return state.matchResults;
  }

  function getMyPredictions() {
    return state.myPredictions;
  }

  // Ranking en vivo: players ordenados por puntos. cb recibe el array de players. Devuelve unsub.
  function subscribeRanking(cb, max = 50) {
    if (!state.ready) { cb([]); return () => {}; }
    return collection("players").orderBy("points", "desc").limit(max).onSnapshot((snap) => {
      cb(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (e) => console.error("[Prode Refugio] ranking snapshot", e));
  }

  // Conteo real de jugadores en vivo. cb recibe un número. Devuelve unsub.
  function subscribePlayerCount(cb) {
    if (!state.ready) { cb(null); return () => {}; }
    return collection("players").onSnapshot(
      (snap) => cb(snap.size),
      (e) => console.error("[Prode Refugio] player count snapshot", e));
  }

  // El admin confirma el resultado final: escribe el partido y reparte puntos a todas las
  // predicciones y agregados (idempotente). Requiere ser admin (las reglas lo exigirán en 2D).
  // Si un batch falla a mitad de camino el estado queda parcial, pero como el reparto es
  // idempotente (usa el puntaje previo de cada predicción), volver a confirmar lo recompone.
  async function finalizeMatch(matchId, scoreA, scoreB) {
    if (!state.ready) throw new Error("Firebase no está listo.");
    const finalized = { status: "finalizado", scoreA: Number(scoreA), scoreB: Number(scoreB) };
    // 1) escribir el resultado del partido
    await collection("matches").doc(matchId).set({ ...finalized, updatedAt: firestoreNow() }, { merge: true });
    // 2) leer todas las predicciones del partido
    const snap = await collection("predictions").where("matchId", "==", matchId).get();
    const preds = snap.docs.map((doc) => {
      const d = doc.data();
      return { _id: doc.id, playerId: d.playerId, a: d.scoreA, b: d.scoreB, points: d.points ?? null, kind: d.kind ?? null };
    });
    // 3) calcular el reparto (puro, testeado)
    const { perPrediction, perPlayer } = window.ProdeScoring.scoreMatchFanout(finalized, preds);
    // 4) aplicar en batches (≤450 escrituras por batch)
    const inc = window.firebase.firestore.FieldValue.increment;
    let batch = state.db.batch();
    let writes = 0;
    const flush = async () => { if (writes > 0) { await batch.commit(); batch = state.db.batch(); writes = 0; } };
    for (const pp of perPrediction) {
      // El id de la predicción siempre es `${playerId}_${matchId}` (ver savePrediction).
      batch.set(collection("predictions").doc(`${pp.playerId}_${matchId}`), { points: pp.points, kind: pp.kind }, { merge: true });
      if (++writes >= 450) await flush();
    }
    for (const [playerId, d] of Object.entries(perPlayer)) {
      batch.set(collection("players").doc(playerId), {
        points: inc(d.points), exact: inc(d.exact), winner: inc(d.winner), played: inc(d.played),
      }, { merge: true });
      if (++writes >= 450) await flush();
    }
    await flush();
    return { matched: perPrediction.length };
  }

  window.ProdeDB = {
    init,
    onAuthChange,
    signInWithGoogle,
    signOutUser,
    isAdmin,
    isReady: () => state.ready,
    getUser: () => state.user,
    getPlayer: () => state.player,
    currentPlayerId,
    savePlayer,
    savePrediction,
    saveSpecials,
    loadRanking,
    saveMatchResult,
    getMatchResults,
    getMyPredictions,
    subscribeRanking,
    subscribePlayerCount,
    finalizeMatch,
  };
})();
