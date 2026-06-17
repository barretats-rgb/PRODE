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

  // authResolved: false hasta que onAuthStateChanged emite por primera vez (Firebase
  // restaura la sesión guardada async). Evita mostrar el Login mientras tanto.
  const state = { ready: false, authResolved: false, user: null, player: null, db: null, auth: null, matchResults: {}, myPredictions: {}, mySpecials: {}, myPredsUnsub: null };
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
    return { user: state.user, player: state.player, isAdmin: isAdmin(), ready: state.ready, authResolved: state.authResolved };
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
      state.authResolved = true; // Firebase ya resolvió la sesión (haya o no usuario).
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
        // Read-back: mis especiales (one-shot; cambian poco y se cierran el 11 jun).
        try {
          const sp = await collection("specialPredictions").doc(user.uid).get();
          state.mySpecials = sp.exists ? sp.data() : {};
        } catch (e) {
          console.warn("[Prode Refugio] read-back especiales", e);
          state.mySpecials = {};
        }
        window.dispatchEvent(new CustomEvent("prode:data", { detail: { key: "mySpecials" } }));
      } else {
        state.user = null;
        state.player = null;
        state.myPredictions = {};
        state.mySpecials = {};
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
    // Forzar el selector de cuentas de Google: deja elegir la cuenta que ya está
    // abierta en el dispositivo en vez de mandar a escribir el mail.
    provider.setCustomParameters({ prompt: "select_account" });
    return state.auth.signInWithPopup(provider);
  }

  // Traduce errores comunes de Firebase Auth a mensajes para el jugador.
  function authErrorMessage(code, fallback) {
    const map = {
      "auth/email-already-in-use": "Ese usuario ya existe.",
      "auth/weak-password": "La contraseña necesita al menos 6 caracteres.",
      "auth/wrong-password": "Usuario o contraseña incorrectos.",
      "auth/user-not-found": "Usuario o contraseña incorrectos.",
      "auth/invalid-credential": "Usuario o contraseña incorrectos.",
      "auth/operation-not-allowed": "El ingreso con usuario no está habilitado todavía.",
    };
    return map[code] || fallback;
  }

  // Crea una cuenta nueva con usuario + contraseña (email sintético interno).
  async function signUpWithUsername(usuario, pass) {
    if (!state.ready) await init();
    if (!state.auth) throw new Error("Firebase no está configurado.");
    const v = window.ProdeAuthUsername.validateSignup(usuario, pass, pass);
    if (!v.ok) throw new Error(v.error);
    const email = window.ProdeAuthUsername.usernameToEmail(usuario);
    try {
      const cred = await state.auth.createUserWithEmailAndPassword(email, pass);
      // Guardar el usuario tal cual lo tipeó, para mostrarlo (ensurePlayer lo usa como name).
      if (cred.user && cred.user.updateProfile) {
        try { await cred.user.updateProfile({ displayName: String(usuario).trim() }); } catch (e) { /* no crítico */ }
      }
      return { ok: true };
    } catch (e) {
      throw new Error(authErrorMessage(e && e.code, "No se pudo crear la cuenta. Probá de nuevo."));
    }
  }

  // Entra con usuario + contraseña.
  async function signInWithUsername(usuario, pass) {
    if (!state.ready) await init();
    if (!state.auth) throw new Error("Firebase no está configurado.");
    const email = window.ProdeAuthUsername.usernameToEmail(usuario);
    if (!email) throw new Error("Usuario o contraseña incorrectos.");
    try {
      await state.auth.signInWithEmailAndPassword(email, pass);
      return { ok: true };
    } catch (e) {
      throw new Error(authErrorMessage(e && e.code, "No se pudo entrar. Probá de nuevo."));
    }
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
    state.mySpecials = { ...state.mySpecials, ...specials };
    return { offline: false };
  }

  async function loadRanking() {
    if (!state.ready) return window.RANKING || [];
    const snap = await collection("players").orderBy("points", "desc").limit(500).get();
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
  function subscribeRanking(cb, max = 500) {
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
    // 3.5) Foto de posiciones ANTES de aplicar puntos (para el movimiento del ranking).
    const playersSnap = await collection("players").get();
    const allPlayers = playersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const beforeRanks = window.ProdeRanking.computeRanks(allPlayers);
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
    // Semana del torneo del partido (por su kickoff, no por cuándo se carga el
    // resultado). Si el fixture no tiene el partido, no se acumula semanal.
    const matchInfo = (window.MATCHES || []).find((m) => m.id === matchId);
    const weekId = matchInfo?.kickoffAt && window.ProdeWeekly
      ? window.ProdeWeekly.weekIdForDate(matchInfo.kickoffAt)
      : null;
    // Todos los jugadores reciben prevRank (un jugador puede moverse porque otros lo pasan);
    // los que predijeron este partido reciben además sus deltas de puntos.
    const applied = new Set();
    for (const pl of allPlayers) {
      const patch = { prevRank: beforeRanks[pl.id] };
      const d = perPlayer[pl.id];
      if (d) {
        patch.points = inc(d.points); patch.exact = inc(d.exact);
        patch.winner = inc(d.winner); patch.played = inc(d.played);
        // Bucket semanal: mismo delta idempotente que el total. set+merge con mapa
        // anidado mergea recursivamente (no pisa otras semanas).
        if (weekId) patch.weekly = { [weekId]: { points: inc(d.points), exact: inc(d.exact) } };
        applied.add(pl.id);
      }
      batch.set(collection("players").doc(pl.id), patch, { merge: true });
      if (++writes >= 450) await flush();
    }
    // Defensa: predicción de un jugador sin doc en `players` (no debería pasar). Suma sus
    // deltas igual, sin prevRank.
    for (const [playerId, d] of Object.entries(perPlayer)) {
      if (applied.has(playerId)) continue;
      const patch = { points: inc(d.points), exact: inc(d.exact), winner: inc(d.winner), played: inc(d.played) };
      if (weekId) patch.weekly = { [weekId]: { points: inc(d.points), exact: inc(d.exact) } };
      batch.set(collection("players").doc(playerId), patch, { merge: true });
      if (++writes >= 450) await flush();
    }
    await flush();
    return { matched: perPrediction.length };
  }

  // Expulsa a un jugador: borra sus predicciones (batch) y sus docs.
  // Requiere ser admin (las reglas lo exigen). No reabre ni recalcula nada de otros
  // jugadores: cada uno tiene sus propios agregados.
  async function expelPlayer(uid) {
    if (!state.ready) throw new Error("Firebase no está listo.");
    if (!uid) return { ok: false };
    // 1) borrar todas las predicciones del jugador (en lotes ≤450)
    const snap = await collection("predictions").where("playerId", "==", uid).get();
    let batch = state.db.batch();
    let writes = 0;
    const flush = async () => { if (writes > 0) { await batch.commit(); batch = state.db.batch(); writes = 0; } };
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      if (++writes >= 450) await flush();
    }
    await flush();
    // 2) borrar los docs del jugador (delete de doc inexistente no falla)
    await collection("players").doc(uid).delete();
    await collection("playerPrivate").doc(uid).delete();
    await collection("specialPredictions").doc(uid).delete();
    return { ok: true };
  }

  // Presencia: marca al jugador como activo (latido). Escribe lastSeen con la hora
  // del servidor en su propio doc. Silencioso (no rompe nada si falla).
  async function touchPresence() {
    const id = currentPlayerId();
    if (!state.ready || !id) return;
    try {
      await collection("players").doc(id).set({ lastSeen: firestoreNow() }, { merge: true });
    } catch (e) { /* sin sesión / sin permisos: ignorar */ }
  }

  // Chat global en vivo: últimos `max` mensajes (orden cronológico). Devuelve unsub.
  function subscribeMessages(cb, max = 50) {
    if (!state.ready) { cb([]); return () => {}; }
    return collection("messages").orderBy("createdAt", "desc").limit(max).onSnapshot((snap) => {
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      list.reverse(); // viejo → nuevo para la UI
      cb(list);
    }, (e) => console.error("[Prode Refugio] messages snapshot", e));
  }

  // Envía un mensaje del jugador actual al chat. Valida y sanea el texto.
  async function sendMessage(text) {
    const id = currentPlayerId();
    if (!state.ready || !id) return { ok: false };
    const v = window.ProdeChat ? window.ProdeChat.validMessage(text) : { ok: false };
    if (!v.ok) return { ok: false };
    const p = state.player || {};
    await collection("messages").add({
      uid: id,
      name: p.name || "Jugador",
      avatarTone: p.avatarTone || "olive",
      text: v.text,
      createdAt: firestoreNow(),
    });
    return { ok: true };
  }

  // Borra un mensaje (moderación). Requiere ser admin (lo exigen las reglas).
  async function deleteMessage(messageId) {
    if (!state.ready || !messageId) return;
    await collection("messages").doc(messageId).delete();
  }

  // Datos privados (teléfono/email) de todos los jugadores. SOLO admin (las reglas
  // lo exigen). cb recibe un mapa { uid: { phone, email } }. Devuelve unsub.
  function subscribePlayersPrivate(cb) {
    if (!state.ready) { cb({}); return () => {}; }
    return collection("playerPrivate").onSnapshot((snap) => {
      const map = {};
      snap.forEach((doc) => { map[doc.id] = doc.data(); });
      cb(map);
    }, (e) => console.error("[Prode Refugio] playerPrivate snapshot", e));
  }

  // Respuestas oficiales de especiales en vivo (meta/specialResults). Devuelve unsub.
  function subscribeSpecialResults(cb) {
    if (!state.ready) { cb({}); return () => {}; }
    return collection("meta").doc("specialResults").onSnapshot(
      (snap) => cb(snap.exists ? snap.data() : {}),
      (e) => console.error("[Prode Refugio] specialResults snapshot", e));
  }

  // El admin confirma la respuesta oficial de UN especial y reparte +5 a los
  // acertantes. Recalcula TODAS las respuestas confirmadas hasta ahora (idempotente
  // vía `awarded`), así corregir un valor mueve los puntos sin duplicar.
  async function confirmSpecialResult(key, value) {
    if (!state.ready) throw new Error("Firebase no está listo.");
    const ref = collection("meta").doc("specialResults");
    await ref.set({ [key]: value, updatedAt: firestoreNow() }, { merge: true });
    const metaSnap = await ref.get();
    const { updatedAt, ...official } = metaSnap.data() || {};
    const snap = await collection("specialPredictions").get();
    // El doc id ES el uid (ver saveSpecials): autoritativo por sobre el campo playerId.
    const preds = snap.docs.map((doc) => ({ ...doc.data(), playerId: doc.id }));
    const { perPrediction, perPlayer } = window.ProdeSpecials.scoreSpecialsFanout(official, preds);
    // Foto de posiciones ANTES de sumar los especiales (para el movimiento del ranking).
    const playersSnap = await collection("players").get();
    const allPlayers = playersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const beforeRanks = window.ProdeRanking.computeRanks(allPlayers);
    const inc = window.firebase.firestore.FieldValue.increment;
    let batch = state.db.batch();
    let writes = 0;
    const flush = async () => { if (writes > 0) { await batch.commit(); batch = state.db.batch(); writes = 0; } };
    for (const pp of perPrediction) {
      batch.set(collection("specialPredictions").doc(pp.playerId), { awarded: pp.awarded }, { merge: true });
      if (++writes >= 450) await flush();
    }
    const applied = new Set();
    for (const [playerId, d] of Object.entries(perPlayer)) {
      // Los especiales suman al total del ranking; NO tocan los buckets semanales.
      batch.set(collection("players").doc(playerId), {
        specialsPoints: inc(d.specialsPoints), points: inc(d.specialsPoints),
        prevRank: beforeRanks[playerId],
      }, { merge: true });
      applied.add(playerId);
      if (++writes >= 450) await flush();
    }
    // Resto de jugadores: sólo prevRank (su posición pudo cambiar al moverse otros).
    for (const pl of allPlayers) {
      if (applied.has(pl.id)) continue;
      batch.set(collection("players").doc(pl.id), { prevRank: beforeRanks[pl.id] }, { merge: true });
      if (++writes >= 450) await flush();
    }
    await flush();
    return { evaluated: perPrediction.length };
  }

  window.ProdeDB = {
    init,
    onAuthChange,
    signInWithGoogle,
    signUpWithUsername,
    signInWithUsername,
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
    getMySpecials: () => state.mySpecials,
    subscribeRanking,
    subscribePlayerCount,
    subscribePlayersPrivate,
    touchPresence,
    finalizeMatch,
    expelPlayer,
    subscribeSpecialResults,
    confirmSpecialResult,
    subscribeMessages,
    sendMessage,
    deleteMessage,
  };
})();
