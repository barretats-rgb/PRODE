# Plan 2B — Puntaje en vivo (fan-out) + ranking global (Prode Refugio)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando el admin confirma el resultado de un partido, se reparten los puntos a todas las predicciones y a los agregados de cada jugador (idempotente), y el **ranking general** se actualiza en vivo para todos leyendo la colección `players`.

**Architecture:** Sin build. La matemática del reparto vive en una función pura testeada (`scoreMatchFanout`, sobre las ya existentes `scorePrediction`/`statsDelta`/`diffStats`). `ProdeDB.finalizeMatch` la aplica con un batch de Firestore (escribe `points`/`kind` en cada predicción e incrementa los agregados del jugador con el delta). El ranking usa `onSnapshot` sobre `players orderBy points desc`. Los resultados de partidos se comparten por Firestore (`matches/{id}`) y se mergean con el fixture estático de `data.js`.

**Tech Stack:** Firebase Firestore compat (batch writes, FieldValue.increment, onSnapshot), React 18 + Babel standalone (sin build), `node:test`.

**Contexto:** Spec en `docs/superpowers/specs/2026-05-24-prode-multijugador-design.md`. Plan 2A (auth + jugador real) ya está en `main`: hay sesión Google, `players/{uid}`, y `ProdeDB.savePrediction` ya escribe `predictions/{uid}_{matchId}`. Este plan agrega el puntaje y el ranking reales. **Las reglas de seguridad van en el Plan 2D** — hasta entonces, Firestore debe estar en reglas de desarrollo (usuario autenticado puede leer/escribir).

> **Idempotencia (clave):** cada predicción guarda su `points` y `kind`. Al (re)finalizar un partido, el delta de cada jugador se calcula como `nuevo - viejo`, así corregir un resultado recalcula bien sin doble conteo.

---

## File Structure

- **Modify** `lib/scoring.js` — agrega `scoreMatchFanout(match, predictions)` (pura).
- **Modify** `lib/scoring.test.js` — tests de `scoreMatchFanout`.
- **Create** `lib/ranking.js` — `rankingRowsFromPlayers(players, myUid)` (pura, dual navegador/Node).
- **Create** `lib/ranking.test.js` — tests.
- **Modify** `firebase-service.js` (`ProdeDB`) — `subscribeMatchResults`/`getMatchResults` (cache + dispatch `prode:data`), `subscribeRanking`, `finalizeMatch` (fan-out por batch). Wire en `init`.
- **Modify** `app-store.js` (`ProdeStore`) — `getMatches` mergea `ProdeDB.getMatchResults()`.
- **Modify** `screens/Ranking.jsx` — scope "general" usa `players` en vivo.
- **Modify** `screens/Admin.jsx` — botón "Confirmar resultado" → `finalizeMatch`.
- **Modify** `app.jsx` (`DesktopAdmin`) — el botón de guardar fila usa `finalizeMatch`.
- **Modify** `index.html` — carga `lib/ranking.js`.

---

## Task 1: `scoreMatchFanout` puro (TDD)

**Files:**
- Modify: `lib/scoring.js`
- Test: `lib/scoring.test.js`

- [ ] **Step 1: Agregar los tests (al final de `lib/scoring.test.js`, antes de nada que cierre el archivo — sólo se agregan `test(...)` nuevos)**

```js
const { scoreMatchFanout } = require("./scoring.js");

const FINAL = { status: "finalizado", scoreA: 2, scoreB: 1 };

test("fanout: puntúa predicciones nuevas (sin puntaje previo)", () => {
  const preds = [
    { playerId: "u1", a: 2, b: 1, points: null, kind: null }, // exacto → 5
    { playerId: "u2", a: 1, b: 0, points: null, kind: null }, // gana A → 3
    { playerId: "u3", a: 0, b: 2, points: null, kind: null }, // falla → 0
  ];
  const { perPrediction, perPlayer } = scoreMatchFanout(FINAL, preds);
  assert.deepStrictEqual(perPrediction, [
    { playerId: "u1", a: 2, b: 1, points: 5, kind: "exacto" },
    { playerId: "u2", a: 1, b: 0, points: 3, kind: "ganador" },
    { playerId: "u3", a: 0, b: 2, points: 0, kind: "fallado" },
  ]);
  assert.deepStrictEqual(perPlayer, {
    u1: { points: 5, exact: 1, winner: 1, played: 1 },
    u2: { points: 3, exact: 0, winner: 1, played: 1 },
    u3: { points: 0, exact: 0, winner: 0, played: 1 },
  });
});

test("fanout: re-finalizar resta el puntaje viejo (idempotente)", () => {
  // u1 antes había acertado exacto (5); ahora el resultado corregido lo deja en ganador (3).
  const preds = [{ playerId: "u1", a: 2, b: 1, points: 5, kind: "exacto" }];
  const corrected = { status: "finalizado", scoreA: 3, scoreB: 1 }; // 2-1 ya no es exacto, sigue ganando A → 3
  const { perPrediction, perPlayer } = scoreMatchFanout(corrected, preds);
  assert.deepStrictEqual(perPrediction, [{ playerId: "u1", a: 2, b: 1, points: 3, kind: "ganador" }]);
  assert.deepStrictEqual(perPlayer, { u1: { points: -2, exact: -1, winner: 0, played: 0 } });
});

test("fanout: agrega varias predicciones del mismo jugador", () => {
  const preds = [
    { playerId: "u1", a: 2, b: 1, points: null, kind: null }, // 5
    { playerId: "u1", a: 5, b: 5, points: null, kind: null }, // falla (gana A real) → 0
  ];
  const { perPlayer } = scoreMatchFanout(FINAL, preds);
  assert.deepStrictEqual(perPlayer, { u1: { points: 5, exact: 1, winner: 1, played: 2 } });
});

test("fanout: lista vacía", () => {
  assert.deepStrictEqual(scoreMatchFanout(FINAL, []), { perPrediction: [], perPlayer: {} });
  assert.deepStrictEqual(scoreMatchFanout(FINAL, null), { perPrediction: [], perPlayer: {} });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `node --test lib/scoring.test.js`
Expected: FAIL — `scoreMatchFanout is not a function` (o `undefined`).

- [ ] **Step 3: Implementar `scoreMatchFanout` en `lib/scoring.js`**

Agregar esta función dentro del IIFE, después de `isLocked` y antes de `const api = {...}`:

```js
  // Calcula el puntaje de TODAS las predicciones de un partido finalizado y el delta
  // de agregados por jugador. Idempotente: usa el puntaje previo (points/kind) de cada
  // predicción, así re-finalizar resta lo viejo y suma lo nuevo sin doble conteo.
  // match: { status:"finalizado", scoreA, scoreB }
  // predictions: [{ playerId, a, b, points(prev|null), kind(prev|null) }]
  function scoreMatchFanout(match, predictions) {
    const perPrediction = [];
    const perPlayer = {};
    (predictions || []).forEach((p) => {
      const prev = (p.points != null) ? { points: p.points, kind: p.kind } : null;
      const next = scorePrediction(match, { a: p.a, b: p.b });
      const delta = diffStats(statsDelta(next), statsDelta(prev));
      perPrediction.push({
        playerId: p.playerId, a: p.a, b: p.b,
        points: next ? next.points : 0,
        kind: next ? next.kind : null,
      });
      const acc = perPlayer[p.playerId] || { points: 0, exact: 0, winner: 0, played: 0 };
      acc.points += delta.points;
      acc.exact += delta.exact;
      acc.winner += delta.winner;
      acc.played += delta.played;
      perPlayer[p.playerId] = acc;
    });
    return { perPrediction, perPlayer };
  }
```

Y agregar `scoreMatchFanout` al objeto `api`:
```js
  const api = { outcome, scorePrediction, statsDelta, diffStats, isLocked, scoreMatchFanout };
```
(Nota: `outcome` sigue SIN exportarse — el objeto `api` actual es `{ scorePrediction, statsDelta, diffStats, isLocked }`; agregá `scoreMatchFanout` a esa lista, sin reintroducir `outcome`.)

- [ ] **Step 4: Correr y ver que pasan**

Run: `node --test lib/scoring.test.js`
Expected: PASS — 17 previos + 4 nuevos = **21** tests del archivo en verde.

- [ ] **Step 5: Commit**

```bash
git add lib/scoring.js lib/scoring.test.js
git commit -m "Add pure scoreMatchFanout (idempotent match scoring)"
```

---

## Task 2: `rankingRowsFromPlayers` puro (TDD)

**Files:**
- Create: `lib/ranking.js`
- Test: `lib/ranking.test.js`
- Modify: `index.html`

- [ ] **Step 1: Escribir los tests. Create `lib/ranking.test.js`:**

```js
const test = require("node:test");
const assert = require("node:assert");
const { rankingRowsFromPlayers } = require("./ranking.js");

const players = [
  { id: "u1", name: "Joaco Profeta", points: 12, exact: 7, winner: 9, favoriteTeam: "ARG", avatarTone: "olive" },
  { id: "u2", name: "Sofi Vargas",   points: 20, exact: 2, winner: 5, favoriteTeam: "MEX" },
  { id: "u3", name: "Yo Mismo",      points: 5,  exact: 0, winner: 1, favoriteTeam: "BRA" },
];

test("ordena por puntos desc y asigna rank", () => {
  const rows = rankingRowsFromPlayers(players, "u3");
  assert.deepStrictEqual(rows.map(r => [r.rank, r.id, r.pts]), [
    [1, "u2", 20], [2, "u1", 12], [3, "u3", 5],
  ]);
});

test("marca al jugador propio con you + sufijo (vos)", () => {
  const rows = rankingRowsFromPlayers(players, "u3");
  const me = rows.find(r => r.you);
  assert.strictEqual(me.id, "u3");
  assert.strictEqual(me.name, "Yo Mismo (vos)");
});

test("deriva iniciales, badge y nat", () => {
  const rows = rankingRowsFromPlayers(players, "u3");
  const joaco = rows.find(r => r.id === "u1");
  assert.strictEqual(joaco.avatar, "JP");      // iniciales
  assert.strictEqual(joaco.badge, "profeta");  // exact >= 6
  assert.strictEqual(joaco.nat, "ARG");
  const sofi = rows.find(r => r.id === "u2");
  assert.strictEqual(sofi.badge, "cafe");      // exact < 3
});

test("lista vacía o nula → []", () => {
  assert.deepStrictEqual(rankingRowsFromPlayers([], "u1"), []);
  assert.deepStrictEqual(rankingRowsFromPlayers(null, "u1"), []);
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `node --test lib/ranking.test.js`
Expected: FAIL — `Cannot find module './ranking.js'`.

- [ ] **Step 3: Implementar `lib/ranking.js`:**

```js
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
        streak: Number(p.exact) || 0,
        nat: p.favoriteTeam || "",
        badge: badgeFor(p.exact),
        trend: "flat",
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
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `node --test lib/ranking.test.js`
Expected: PASS — 4 tests.

- [ ] **Step 5: Cargar en `index.html`** — después de `lib/admins.js`:

```html
<script src="lib/admins.js"></script>
<script src="lib/ranking.js"></script>
<script src="firebase-service.js"></script>
```

- [ ] **Step 6: Suite completa**

Run: `npm test`
Expected: PASS — 22 (previos) + 4 (fanout) + 4 (ranking) = **30** tests.

- [ ] **Step 7: Commit**

```bash
git add lib/ranking.js lib/ranking.test.js index.html
git commit -m "Add pure rankingRowsFromPlayers + tests"
```

---

## Task 3: ProdeDB — resultados compartidos, ranking en vivo, fan-out

**Files:**
- Modify: `firebase-service.js`

- [ ] **Step 1: Agregar `state.matchResults` y suscripción de resultados**

En `firebase-service.js`, en el objeto `state`, agregar `matchResults: {}`:
```js
  const state = { ready: false, user: null, player: null, db: null, auth: null, matchResults: {} };
```

Dentro de `init()`, justo después de `state.ready = true;` (y la línea de comentario que le sigue), agregar la suscripción a resultados de partidos:
```js
    // Resultados oficiales (los carga el admin). Se cachean y se avisa a la UI con prode:data.
    collection("matches").onSnapshot((snap) => {
      const next = {};
      snap.forEach((doc) => { next[doc.id] = { id: doc.id, ...doc.data() }; });
      state.matchResults = next;
      window.dispatchEvent(new CustomEvent("prode:data", { detail: { key: "matches" } }));
    }, (e) => console.error("[Prode Refugio] matches snapshot", e));
```

- [ ] **Step 2: Agregar `getMatchResults`, `subscribeRanking`, `finalizeMatch` y exportarlas**

Antes del `window.ProdeDB = {...}`, agregar estas funciones:

```js
  function getMatchResults() {
    return state.matchResults;
  }

  // Ranking en vivo: players ordenados por puntos. cb recibe el array de players. Devuelve unsub.
  function subscribeRanking(cb, max = 50) {
    if (!state.ready) { cb(window.RANKING || []); return () => {}; }
    return collection("players").orderBy("points", "desc").limit(max).onSnapshot((snap) => {
      cb(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (e) => console.error("[Prode Refugio] ranking snapshot", e));
  }

  // El admin confirma el resultado final: escribe el partido y reparte puntos a todas las
  // predicciones y agregados (idempotente). Requiere ser admin (las reglas lo exigirán en 2D).
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
    // 4) aplicar en batches (≤450 escrituras por batch; predicción + jugador)
    const inc = window.firebase.firestore.FieldValue.increment;
    const predById = {};
    preds.forEach((p) => { predById[p.playerId] = p._id; });
    let batch = state.db.batch();
    let writes = 0;
    const flush = async () => { if (writes > 0) { await batch.commit(); batch = state.db.batch(); writes = 0; } };
    for (const pp of perPrediction) {
      batch.set(collection("predictions").doc(predById[pp.playerId]), { points: pp.points, kind: pp.kind }, { merge: true });
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
```

Agregar al export `window.ProdeDB = {...}` estas tres: `getMatchResults`, `subscribeRanking`, `finalizeMatch`.

- [ ] **Step 3: Verificación estática**

- `node --check firebase-service.js` → exit 0.
- `npm test` → 30/30 (este archivo no se testea por unidad; la lógica del reparto está en `scoreMatchFanout`, ya testeada).
- Confirmar por lectura que `finalizeMatch` usa `window.ProdeScoring.scoreMatchFanout` y `FieldValue.increment`, y que el batch hace flush cada ≤450 escrituras.
- Reportar que la verificación en vivo (Firestore real) queda para la Task 7 (QA).

- [ ] **Step 4: Commit**

```bash
git add firebase-service.js
git commit -m "ProdeDB: shared match results, live ranking sub, finalizeMatch fan-out"
```

---

## Task 4: `ProdeStore.getMatches` mergea los resultados de Firestore

**Files:**
- Modify: `app-store.js`

- [ ] **Step 1: Mergear resultados remotos en `getMatches`**

En `app-store.js`, la función `getMatches` actual mergea `window.MATCHES` con los overrides locales. Reemplazarla por una que también aplique los resultados remotos de Firestore (que ganan sobre lo local):

```js
  function getMatches() {
    const overrides = getMatchOverrides();
    const remote = window.ProdeDB?.getMatchResults?.() || {};
    return (window.MATCHES || []).map((match) => ({
      ...match,
      ...(overrides[match.id] || {}),
      ...(remote[match.id] || {}),
    }));
  }
```

(El resto de `app-store.js` no cambia. El orden de merge —remote último— hace que el resultado oficial del admin prevalezca sobre cualquier override local viejo.)

- [ ] **Step 2: Verificar**

Run: `node --check app-store.js` → exit 0. `npm test` → 30/30.

- [ ] **Step 3: Commit**

```bash
git add app-store.js
git commit -m "ProdeStore.getMatches merges shared Firestore match results"
```

---

## Task 5: Ranking en vivo (pantalla Ranking)

**Files:**
- Modify: `screens/Ranking.jsx`

- [ ] **Step 1: Usar `players` en vivo para el scope "general"**

En `screens/Ranking.jsx`, reemplazar el bloque de estado/efecto inicial:

```js
function Ranking({ go }) {
  const [scope, setScope] = useState("general"); // general | grupo | staff
  const [highlight, setHighlight] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onData = () => setVersion(v => v + 1);
    window.addEventListener("prode:data", onData);
    return () => window.removeEventListener("prode:data", onData);
  }, []);

  const rows = window.ProdeStore?.getRanking?.() || window.RANKING;
```

por:

```js
function Ranking({ go }) {
  const [scope, setScope] = useState("general"); // general | grupo | staff
  const [highlight, setHighlight] = useState(null);
  const [players, setPlayers] = useState(null);

  useEffect(() => {
    // Ranking general en vivo desde Firestore (players orderBy points).
    const unsub = window.ProdeDB?.subscribeRanking?.((list) => setPlayers(list));
    return () => unsub && unsub();
  }, []);

  const myUid = window.ProdeDB?.getUser?.()?.uid;
  const liveRows = (players && window.ProdeRanking)
    ? window.ProdeRanking.rankingRowsFromPlayers(players, myUid)
    : null;
  // Si todavía no hay datos en vivo, caer al ranking local/demo para no mostrar vacío.
  const rows = liveRows && liveRows.length
    ? liveRows
    : (window.ProdeStore?.getRanking?.() || window.RANKING);
```

(El resto de la pantalla —podio, fila "sos vos", tabla, badges— ya consume `rows`/`you` y no cambia. Los chips "Mi mesa"/"Staff" siguen mostrando el ranking general por ahora; los grupos privados son del Plan 3.)

- [ ] **Step 2: Verificación (headless, controller)**

- Estática: confirmar que `Ranking` usa `subscribeRanking` + `rankingRowsFromPlayers`.
- `npm test` → 30/30.
- El render en vivo con varios jugadores se valida en la Task 7 (QA con 2 cuentas). Reportar diferido.

- [ ] **Step 3: Commit**

```bash
git add screens/Ranking.jsx
git commit -m "Ranking: live global standings from Firestore players"
```

---

## Task 6: Admin confirma resultado → fan-out

**Files:**
- Modify: `screens/Admin.jsx`
- Modify: `app.jsx` (`DesktopAdmin`)

- [ ] **Step 1: Botón "Confirmar" en la pestaña Resultados (Admin.jsx)**

En `screens/Admin.jsx`, la función `updateScore` hoy guarda el marcador y marca `finalizado` en cada cambio. Cambiar el modelo a: editar el marcador en estado local, y un botón **Confirmar** que dispara el fan-out. Reemplazar `updateScore` por:

```js
  const [saving, setSaving] = useState(null);

  // Edita el marcador en memoria (no finaliza ni reparte puntos todavía).
  const editScore = (id, side, val) => {
    setMatches(ms => ms.map(m => m.id === id ? { ...m, [side]: Number(val) || 0 } : m));
  };

  // Confirma el resultado final del partido: escribe + reparte puntos (idempotente).
  const confirmResult = async (m) => {
    setSaving(m.id);
    try {
      const a = Number(m.scoreA) || 0, b = Number(m.scoreB) || 0;
      if (window.ProdeDB?.finalizeMatch) {
        await window.ProdeDB.finalizeMatch(m.id, a, b);
      } else {
        await window.ProdeStore?.saveMatchResult(m.id, { status: "finalizado", scoreA: a, scoreB: b });
      }
    } catch (e) {
      console.error("[Prode Refugio] confirmar resultado", e);
    } finally {
      setSaving(null);
    }
  };
```

Luego, en la pestaña de resultados donde se renderizan los inputs de marcador, usar `editScore` en los inputs y agregar un botón que llame a `confirmResult(m)` (mostrando "Guardando..." cuando `saving === m.id`). Si la pestaña "resultados" todavía no tiene inputs editables, agregá por cada partido una fila con: bandera A, `<input type="number">` para `scoreA` (onChange → `editScore(m.id,"scoreA",e.target.value)`), guion, `<input>` para `scoreB`, bandera B, y un `<Btn size="sm" onClick={()=>confirmResult(m)}>` con texto `saving===m.id ? "Guardando..." : (m.status==="finalizado" ? "Recalcular" : "Confirmar")`.

(Implementá la fila siguiendo el estilo de las filas existentes de la pestaña "partidos" en este mismo archivo: `Flag`, `var(--char-800)` de fondo, inputs con `desktopScoreInput`-style local. Mantené el cambio acotado a la pestaña Resultados.)

- [ ] **Step 2: `DesktopAdmin` usa `finalizeMatch` (app.jsx)**

En `app.jsx`, dentro de `DesktopAdmin`, la función `saveRow` (el check verde por fila) hoy llama a `window.ProdeStore?.saveMatchResult(...)`. Reemplazar su cuerpo para que dispare el fan-out:

```js
            const saveRow = () => {
              const scoreA = Number(m.scoreA || 0);
              const scoreB = Number(m.scoreB || 0);
              setMatches(ms => ms.map(item => item.id === m.id ? {...item, scoreA, scoreB, status:"finalizado"} : item));
              const finalize = window.ProdeDB?.finalizeMatch
                ? window.ProdeDB.finalizeMatch(m.id, scoreA, scoreB)
                : window.ProdeStore?.saveMatchResult(m.id, {status:"finalizado", scoreA, scoreB});
              Promise.resolve(finalize).catch((error) => console.warn("[Prode Refugio] No se pudo confirmar el resultado.", error));
            };
```

(`saveDesktopScore`, que se dispara en cada tecla, debe SÓLO editar el marcador en memoria — no finalizar. Si hoy marca `status:"finalizado"` por tecla, sacale ese `status` para que el reparto ocurra únicamente al apretar el check verde `saveRow`. Es decir: `saveDesktopScore` actualiza `scoreA`/`scoreB` en `matches` sin tocar `status` ni llamar a `saveMatchResult`.)

- [ ] **Step 3: Verificación**

- `npm test` → 30/30.
- Estática: `finalizeMatch` se invoca desde Admin (confirmar) y DesktopAdmin (check verde); las ediciones por tecla NO finalizan.
- Render headless: el bundle sigue cargando (controller).

- [ ] **Step 4: Commit**

```bash
git add screens/Admin.jsx app.jsx
git commit -m "Admin: confirm result triggers finalizeMatch fan-out"
```

---

## Task 7: QA end-to-end (manual, 2 cuentas) + cierre

**Files:** ninguno. Requiere Firebase con Google habilitado (Plan 2A Task 1) y Firestore en reglas de desarrollo.

- [ ] **Step 1: Sembrar predicciones con 2 cuentas**

Servir (`npx serve .`). Con la **cuenta A** (admin, `barretats@gmail.com`): entrar, ir a Prode, cargar predicciones para un par de partidos. Con la **cuenta B** (otra cuenta Google, en otro navegador/incógnito): entrar, completar perfil, cargar predicciones para los mismos partidos.
Verificar en Firebase Console → Firestore → `predictions` que hay docs `{uidA}_{matchId}` y `{uidB}_{matchId}`.

- [ ] **Step 2: Confirmar un resultado como admin y ver el reparto**

Con la cuenta A (admin) → pestaña Admin → Resultados → cargar el marcador de un partido predicho → **Confirmar**.
Verificar:
- En Firestore, cada `predictions/{uid}_{matchId}` de ese partido tiene ahora `points` y `kind`.
- Los `players/{uidA}` y `players/{uidB}` tienen `points/exact/winner/played` actualizados según sus aciertos.
- En la pantalla **Ranking** (ambas cuentas) aparecen los dos jugadores con sus puntos, ordenados, y "sos vos" marca al propio.

- [ ] **Step 3: Probar idempotencia**

Volver a Confirmar el MISMO partido con un marcador distinto. Verificar que los puntos de los jugadores se **recalculan** (no se duplican): el total refleja sólo el nuevo resultado.

- [ ] **Step 4: Confirmar tests**

Run: `npm test` → 30/30.

- [ ] **Step 5: Reportar el QA**

Documentar en el chat qué pasos pasaron. Si el reparto falla con permisos (`Missing or insufficient permissions`), es porque las reglas de Firestore no permiten que el admin escriba agregados de otros jugadores → eso lo arregla el **Plan 2D** (reglas); para el QA, las reglas de desarrollo (escritura autenticada) alcanzan.

---

## Self-Review (cobertura del spec)

- ✅ "Fan-out de puntaje desde el navegador del admin; agregados denormalizados; idempotente" → Task 1 (`scoreMatchFanout`) + Task 3 (`finalizeMatch`) + Task 6 (admin lo dispara).
- ✅ "Ranking global = players orderBy points, en vivo (onSnapshot)" → Task 3 (`subscribeRanking`) + Task 5 (pantalla).
- ✅ "Resultado final lo confirma el admin" → Task 6.
- ✅ "Resultados compartidos por Firestore + merge con el fixture" → Task 3 (`subscribeMatchResults`) + Task 4.
- ⏭️ Cierre por horario en la UI + read-back de predicciones entre dispositivos → **Plan 2C**.
- ⏭️ Reglas de seguridad (admin como barrera real, lock server-side) → **Plan 2D**.
- ⏭️ Deploy → **Plan 2E**.

Consistencia de tipos: `scoreMatchFanout(match, predictions)` → `{perPrediction:[{playerId,a,b,points,kind}], perPlayer:{[id]:{points,exact,winner,played}}}`, consumido por `finalizeMatch` (escribe `points`/`kind` en predicción e `increment` en player). `rankingRowsFromPlayers(players, myUid)` → filas con `{rank,name,avatar,pts,exact,winner,streak,nat,badge,trend,you,avatarTone}`, que es lo que `RankRow`/`PodiumCol`/`you` ya consumen. `subscribeRanking(cb)` y `getMatchResults()`/`finalizeMatch()` agregadas al export de `ProdeDB`.

> **Nota de testing:** la matemática del reparto y del ranking es pura y va por TDD (Tasks 1-2, 8 tests nuevos). La capa Firestore (`finalizeMatch`, suscripciones) es integración en vivo, no unit-testeable sin emulador; se valida con el QA de 2 cuentas (Task 7). Las reglas de seguridad y su testeo con emulador son el Plan 2D.
