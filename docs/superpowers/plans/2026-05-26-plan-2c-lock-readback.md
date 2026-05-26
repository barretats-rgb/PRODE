# Plan 2C — Cierre por horario + predicciones reales en todos lados (Prode Refugio)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que no se pueda predecir un partido ya empezado (cierre por horario en la UI), que cada jugador vea sus predicciones en cualquier dispositivo (read-back desde Firestore), y que el Perfil muestre puntos/posición/historial reales.

**Architecture:** Sin build. `ProdeDB` se suscribe (post-login) a las predicciones propias (`predictions where playerId == uid`) y las cachea; `ProdeStore.getPredictions()` las mergea (Firestore gana), con lo cual Matches muestra las predicciones reales y el Perfil (que ya calcula stats/historial sobre `getPredictions()`) pasa a ser real sin más cambios. El cierre por horario usa la función pura ya testeada `ProdeScoring.isLocked(match, now)`. El puesto del Perfil sale del ranking real (`subscribeRanking` + `rankingRowsFromPlayers`).

**Tech Stack:** Firebase Firestore compat (onSnapshot, query where), React 18 + Babel standalone (sin build), `node:test`.

**Contexto:** Spec en `docs/superpowers/specs/2026-05-24-prode-multijugador-design.md`. Planes 2A (auth), 2B (puntaje+ranking), 2D (reglas+privacidad) y la limpieza de demo ya están en `main`. `ProdeScoring.isLocked` y `ProdeRanking.rankingRowsFromPlayers` ya existen y están testeados. Las reglas 2D ya permiten que un jugador lea sus propias predicciones (`resource.data.playerId == request.auth.uid`), así que el read-back NO requiere cambios de reglas.

> **Fuera de alcance (queda señalado):** el cierre por horario *server-side* (en reglas) necesita el `kickoffAt` de cada partido en Firestore (hoy el fixture vive en `data.js`). Este plan hace el cierre en la **UI**, que frena a cualquier usuario normal. El refuerzo en reglas (sembrar el fixture en Firestore + chequear `request.time < kickoffAt`) queda como endurecimiento posterior.

---

## File Structure

- **Modify** `firebase-service.js` (`ProdeDB`) — cache `state.myPredictions`, suscripción a las predicciones propias (post-login, con limpieza en sign-out), y export `getMyPredictions`.
- **Modify** `app-store.js` (`ProdeStore`) — `getPredictions()` mergea `ProdeDB.getMyPredictions()` (Firestore gana sobre local/demo).
- **Modify** `screens/Matches.jsx` — cierre por horario con `isLocked(match, now)` + tick periódico; indicador "Cerrado".
- **Modify** `screens/Profile.jsx` — puesto real desde el ranking en vivo (`subscribeRanking` + `rankingRowsFromPlayers`).

---

## Task 1: Read-back de las predicciones propias

**Files:**
- Modify: `firebase-service.js`

- [ ] **Step 1: Agregar el cache `myPredictions` al `state`**

En `firebase-service.js`, en el objeto `state`, agregar `myPredictions: {}` y `myPredsUnsub: null`:
```js
  const state = { ready: false, user: null, player: null, db: null, auth: null, matchResults: {}, myPredictions: {}, myPredsUnsub: null };
```

- [ ] **Step 2: Suscribirse a las predicciones propias al iniciar sesión**

En `init()`, dentro del callback `state.auth.onAuthStateChanged(async (user) => { ... })`, en la rama en que hay `user` (después de `await ensurePlayer(user)`), agregar la suscripción; y en la rama de sign-out (sin user), limpiarla. Reemplazar el bloque actual del listener:

```js
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
```

por:

```js
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
```

- [ ] **Step 3: Exponer `getMyPredictions`**

Agregar la función antes del `window.ProdeDB = {...}`:
```js
  function getMyPredictions() {
    return state.myPredictions;
  }
```
Y agregar `getMyPredictions` al objeto exportado `window.ProdeDB = {...}` (junto a los demás; no quitar ninguno).

- [ ] **Step 4: Verificación**

- `node --check firebase-service.js` → exit 0.
- `npm test` → 32/32 (este archivo no se testea por unidad).
- Confirmar por lectura: el listener se desuscribe antes de re-suscribir (no se duplica al cambiar de sesión), y en sign-out limpia `myPredictions`. `getMyPredictions` está en el export.
- Reportar que el read-back en vivo se valida en el QA (Task 5).

- [ ] **Step 5: Commit**
```bash
git add firebase-service.js
git commit -m "ProdeDB: live read-back of the player's own predictions"
```

---

## Task 2: `getPredictions` mergea las predicciones reales

**Files:**
- Modify: `app-store.js`

- [ ] **Step 1: Mergear el read-back en `getPredictions`**

En `app-store.js`, reemplazar `getPredictions`:
```js
  function getPredictions() {
    return {
      ...(window.MY_PREDICTIONS || {}),
      ...readJson(PREDICTIONS_KEY, {}),
    };
  }
```
por:
```js
  function getPredictions() {
    return {
      ...(window.MY_PREDICTIONS || {}),
      ...readJson(PREDICTIONS_KEY, {}),
      ...(window.ProdeDB?.getMyPredictions?.() || {}), // Firestore (read-back) gana
    };
  }
```

(Nada más cambia. Como `calculateStats`, `getHistory` y `getProfile` ya usan `getPredictions()`, el Perfil pasa a calcular stats e historial sobre las predicciones reales automáticamente.)

- [ ] **Step 2: Verificación**

- `node --check app-store.js` → exit 0.
- `npm test` → 32/32.
- Confirmar por lectura que el merge pone el read-back último (gana sobre local/demo).

- [ ] **Step 3: Commit**
```bash
git add app-store.js
git commit -m "ProdeStore.getPredictions merges the Firestore read-back (real wins)"
```

---

## Task 3: Cierre por horario en la pantalla Matches

**Files:**
- Modify: `screens/Matches.jsx`

- [ ] **Step 1: Agregar un "tick" para que los partidos se cierren al llegar su horario**

En `screens/Matches.jsx`, dentro de `function Matches`, agregar un estado `now` y un intervalo que lo actualiza cada 30 s (así un partido que arranca durante la sesión se bloquea solo). Justo después de los `useState` existentes:
```js
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
```

- [ ] **Step 2: Bloquear la edición con `isLocked`**

En el render de cada partido, reemplazar:
```js
              <MatchRow key={m.id} match={m}
                prediction={preds[m.id]}
                onChange={(v)=>setPred(m.id, v)}
                locked={m.status !== "abierto"}/>
```
por:
```js
              <MatchRow key={m.id} match={m}
                prediction={preds[m.id]}
                onChange={(v)=>setPred(m.id, v)}
                locked={window.ProdeScoring?.isLocked?.(m, now) ?? (m.status !== "abierto")}/>
```

- [ ] **Step 3: Bloquear el guardado por las dudas (defensa además de la UI)**

En la función `setPred` de `Matches.jsx`, ignorar el cambio si el partido está cerrado. Reemplazar el comienzo de `setPred`:
```js
  const setPred = async (id, val) => {
    setPreds(p => ({ ...p, [id]: val }));
```
por:
```js
  const setPred = async (id, val) => {
    const match = (window.ProdeStore?.getMatches?.() || window.MATCHES).find(m => m.id === id);
    if (match && window.ProdeScoring?.isLocked?.(match, Date.now())) return; // cerrado: no se edita
    setPreds(p => ({ ...p, [id]: val }));
```

- [ ] **Step 4: Verificación**

- `npm test` → 32/32 (no toca lógica testeada; `isLocked` ya está cubierto).
- Estática: confirmar que `MatchRow` recibe `locked` desde `isLocked(m, now)` y que `setPred` corta si está cerrado.
- El comportamiento en vivo (steppers deshabilitados pasado el kickoff) se valida en el QA (Task 5); en headless sólo se confirma que el bundle parsea.

- [ ] **Step 5: Commit**
```bash
git add screens/Matches.jsx
git commit -m "Matches: lock predictions at kickoff (UI) via isLocked"
```

---

## Task 4: Puesto real en el Perfil

**Files:**
- Modify: `screens/Profile.jsx`

- [ ] **Step 1: Suscribirse al ranking real y calcular el puesto propio**

En `screens/Profile.jsx`, dentro de `function Profile`, agregar una suscripción al ranking en vivo para obtener el puesto real. Reemplazar el bloque inicial:
```js
function Profile({ go }) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onData = () => setVersion(v => v + 1);
    window.addEventListener("prode:data", onData);
    return () => window.removeEventListener("prode:data", onData);
  }, []);

  const profile = window.ProdeStore?.getProfile?.() || {};
  const player = profile.player || {};
  const you = profile.row || {};
  const stats = profile.stats || { points: 0, exact: 0, winner: 0 };
  const history = profile.history || [];
```
por:
```js
function Profile({ go }) {
  const [version, setVersion] = useState(0);
  const [rank, setRank] = useState(null);

  useEffect(() => {
    const onData = () => setVersion(v => v + 1);
    window.addEventListener("prode:data", onData);
    return () => window.removeEventListener("prode:data", onData);
  }, []);

  // Puesto real: posición del jugador en el ranking general en vivo.
  useEffect(() => {
    const myUid = window.ProdeDB?.getUser?.()?.uid;
    const unsub = window.ProdeDB?.subscribeRanking?.((list) => {
      const rows = window.ProdeRanking?.rankingRowsFromPlayers?.(list, myUid) || [];
      const me = rows.find(r => r.you);
      setRank(me ? me.rank : null);
    });
    return () => unsub && unsub();
  }, []);

  const profile = window.ProdeStore?.getProfile?.() || {};
  const player = profile.player || {};
  const stats = profile.stats || { points: 0, exact: 0, winner: 0 };
  const history = profile.history || [];
```

(Se elimina `you = profile.row` —que salía del ranking demo— y se usa `rank` del ranking real.)

- [ ] **Step 2: Usar el puesto real en el avatar y en las stats**

En el render, donde se usa `you.avatar` y `you.rank`:
- `Avatar initials={you.avatar || player.avatar || "TJ"}` → `Avatar initials={player.avatar || window.ProdeRanking?.initials?.(player.name) || "TJ"}`
- `<Stat n={`${you.rank || "-"}°`} l="Posicion" tone="orange"/>` → `<Stat n={rank ? `${rank}°` : "-"} l="Posición" tone="orange"/>`

Reemplazar exactamente esas dos referencias a `you.` (no quedan otros usos de `you` en el archivo tras el Step 1).

- [ ] **Step 3: Verificación**

- `npm test` → 32/32.
- Estática: confirmar que no quedan referencias a `you.` ni a `profile.row` en `Profile.jsx`; el puesto sale de `rank` (subscribeRanking + rankingRowsFromPlayers).
- El render real se valida en el QA (Task 5).

- [ ] **Step 4: Commit**
```bash
git add screens/Profile.jsx
git commit -m "Profile: real standing from live ranking (drop demo row)"
```

---

## Task 5: QA end-to-end (manual) + cierre

**Files:** ninguno. Requiere Firebase con Google habilitado y reglas 2D publicadas.

- [ ] **Step 1: Read-back entre dispositivos**

Entrar, cargar predicciones para varios partidos. En **otro navegador/incógnito con la misma cuenta** (o recargando), abrir Prode: las predicciones cargadas deben **aparecer** (vienen de Firestore, no de localStorage).

- [ ] **Step 2: Cierre por horario**

Como admin, poné a un partido `abierto` un `kickoffAt` ya pasado (o esperá a que un partido demo con kickoff pasado se muestre): en Prode, los steppers de ese partido deben estar **deshabilitados** y no se debe poder cambiar el marcador. Los partidos futuros siguen editables.
(Para probar rápido sin esperar: en la consola del navegador, `window.MATCHES.find(m=>m.id==="m02").kickoffAt = "2020-01-01T00:00:00-06:00"` y recargá la pantalla Prode — ese partido debe quedar cerrado.)

- [ ] **Step 3: Perfil real**

Confirmá que en **Yo** (Perfil): los **Puntos/Exactos** coinciden con lo repartido por el admin, la **Posición** es la real del ranking, y el **Historial** lista tus partidos finalizados con su puntaje.

- [ ] **Step 4: Tests**

Run: `npm test` → 32/32.

- [ ] **Step 5: Reportar el QA** (qué pasó / qué falló).

---

## Self-Review (cobertura del spec)

- ✅ "Cierre por horario (no predecir un partido empezado)" → Task 3 (UI, `isLocked`). Server-side queda señalado como follow-up (necesita fixture en Firestore).
- ✅ "Read-back de predicciones entre dispositivos" → Task 1 + Task 2.
- ✅ "Perfil alineado con puntos reales" → Task 2 (stats/historial reales vía `getPredictions`) + Task 4 (puesto real).
- ⏭️ Cierre server-side en reglas, deploy (2E), grupos (3), especiales/fixture-en-Firestore.

Consistencia de tipos: `getMyPredictions()` → `{matchId: {a,b,points,kind}}`, mergeado por `getPredictions()` (mismo shape que `MY_PREDICTIONS`/localStorage). `isLocked(match, nowMs)` → boolean (ya testeado). `subscribeRanking(cb)` + `rankingRowsFromPlayers(list, uid)` (ya testeados) → fila con `.rank`/`.you`. Sin placeholders.

> **Nota de testing:** la lógica pura nueva es mínima; 2C reutiliza `isLocked` y `rankingRowsFromPlayers` (ya con tests). El resto es integración con Firestore (read-back, suscripciones), que se valida con el QA de la Task 5 y un smoke headless de parseo. Es honesto para trabajo de integración en vivo.
