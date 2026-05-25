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

  const state = { ready: false, user: null, player: null, db: null, auth: null };
  const listeners = new Set();

  function firestoreNow() {
    return window.firebase?.firestore?.FieldValue?.serverTimestamp
      ? window.firebase.firestore.FieldValue.serverTimestamp()
      : new Date().toISOString();
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
  async function ensurePlayer(user) {
    const ref = collection("players").doc(user.uid);
    const snap = await ref.get();
    if (snap.exists) {
      state.player = { id: user.uid, ...snap.data() };
      return state.player;
    }
    const fresh = {
      name: user.displayName || "Jugador",
      email: user.email || "",
      photoURL: user.photoURL || "",
      favoriteTeam: "",
      avatarTone: "citrus",
      points: 0, exact: 0, winner: 0, played: 0, specialsPoints: 0,
      createdAt: firestoreNow(),
      updatedAt: firestoreNow(),
    };
    await ref.set(fresh, { merge: true });
    state.player = { id: user.uid, ...fresh };
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

    state.auth.onAuthStateChanged(async (user) => {
      if (user) {
        state.user = user;
        try { await ensurePlayer(user); }
        catch (e) { console.error("[Prode Refugio] ensurePlayer falló", e); }
      } else {
        state.user = null;
        state.player = null;
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
    await collection("players").doc(id).set({ ...patch, updatedAt: firestoreNow() }, { merge: true });
    state.player = { ...(state.player || {}), ...patch, id };
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
    ensurePlayer,
    savePlayer,
    savePrediction,
    saveSpecials,
    loadRanking,
    saveMatchResult,
  };
})();
