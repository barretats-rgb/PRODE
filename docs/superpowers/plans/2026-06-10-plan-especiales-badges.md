# Especiales + Badges Reales — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Las predicciones especiales (campeón, goleador, etc.) se puntúan de verdad (+5 por acierto, confirmadas una a una por el admin, idempotente y corregible) y los Badges del Mundial pasan a ser reales con textos claros.

**Architecture:** Lógica pura nueva en `lib/specials.js` (fan-out idempotente vía mapa `awarded`, igual patrón que partidos) y `badgesFor` en `lib/ranking.js`. Respuestas oficiales en `meta/specialResults` (colección ya permitida en reglas). `firebase-service.js` gana `confirmSpecialResult` (admin) + read-back de especiales propios. Reglas: lock server-side 11 jun 18:00 CR + protección del mapa `awarded`. UI: pestaña Admin "Especiales" compartida mobile/desktop, pantalla Especiales con lock y resultados, Ranking con badges múltiples.

**Tech Stack:** React (Babel standalone, sin build), Firebase Firestore compat, `node --test`.

**Spec:** `docs/superpowers/specs/2026-06-10-especiales-badges-design.md`

**Contexto clave para quien implementa:**
- App estática sin bundler: cada archivo se carga con `<script>` en `index.html`, expone globals en `window`. Los `lib/` usan IIFE dual navegador/Node (referencia: `lib/weekly.js`). Tests: `node --test` desde la raíz; **la suite actual tiene 49 tests, todos verdes**.
- Comentarios en español. Sin datos demo: estados vacíos honestos.
- Los 6 especiales: `campeon, subcampeon, goleador, arquero, sorpresa, decepcion`. Picks del jugador en `specialPredictions/{uid}` (doc id = uid). Agregados del jugador en `players/{uid}` (`points`, `specialsPoints`, ...).
- JSX se verifica con `npx --yes esbuild <archivo> --loader:.jsx=jsx --outfile=NUL --log-level=error`.

---

### Task 1: `lib/specials.js` — lógica pura del puntaje de especiales (TDD)

**Files:**
- Create: `lib/specials.js`
- Create: `lib/specials.test.js`

- [ ] **Step 1: Write the failing tests** — crear `lib/specials.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert");
const {
  SPECIAL_KEYS, SPECIAL_POINTS, specialsLocked, normalizeAnswer, scoreSpecialsFanout,
} = require("./specials.js");

test("constantes: 6 especiales de a 5 puntos", () => {
  assert.deepStrictEqual(SPECIAL_KEYS, ["campeon","subcampeon","goleador","arquero","sorpresa","decepcion"]);
  assert.strictEqual(SPECIAL_POINTS, 5);
});

test("specialsLocked: antes del 11 jun 18:00 CR → false, después → true", () => {
  assert.strictEqual(specialsLocked(Date.parse("2026-06-11T17:59:00-06:00")), false);
  assert.strictEqual(specialsLocked(Date.parse("2026-06-11T18:00:00-06:00")), true);
});

test("normalizeAnswer: trim, minúsculas y sin acentos", () => {
  assert.strictEqual(normalizeAnswer("  Mbappé "), "mbappe");
  assert.strictEqual(normalizeAnswer("JULIÁN Álvarez"), "julian alvarez");
  assert.strictEqual(normalizeAnswer(null), "");
  assert.strictEqual(normalizeAnswer(undefined), "");
});

test("fanout: acierto simple reparte +5", () => {
  const r = scoreSpecialsFanout({ campeon: "ARG" }, [
    { playerId: "u1", campeon: "ARG" },
    { playerId: "u2", campeon: "BRA" },
  ]);
  assert.deepStrictEqual(r.perPlayer, { u1: { specialsPoints: 5 } });
  assert.deepStrictEqual(r.perPrediction, [
    { playerId: "u1", awarded: { campeon: 5 } },
    { playerId: "u2", awarded: { campeon: 0 } },
  ]);
});

test("fanout: matching normalizado (acentos/case)", () => {
  const r = scoreSpecialsFanout({ goleador: "Kylian Mbappé" }, [
    { playerId: "u1", goleador: "kylian mbappe" },
  ]);
  assert.strictEqual(r.perPlayer.u1.specialsPoints, 5);
});

test("fanout: múltiples claves confirmadas suman", () => {
  const r = scoreSpecialsFanout({ campeon: "ARG", decepcion: "GER" }, [
    { playerId: "u1", campeon: "ARG", decepcion: "GER" },
  ]);
  assert.deepStrictEqual(r.perPlayer, { u1: { specialsPoints: 10 } });
  assert.deepStrictEqual(r.perPrediction[0].awarded, { campeon: 5, decepcion: 5 });
});

test("fanout: idempotente — re-ejecutar con awarded ya escrito da delta 0", () => {
  const r = scoreSpecialsFanout({ campeon: "ARG" }, [
    { playerId: "u1", campeon: "ARG", awarded: { campeon: 5 } },
  ]);
  assert.deepStrictEqual(r.perPlayer, {});
  assert.deepStrictEqual(r.perPrediction, [{ playerId: "u1", awarded: { campeon: 5 } }]);
});

test("fanout: corrección de respuesta mueve los puntos", () => {
  // El admin había confirmado ARG (u1 cobró 5); corrige a BRA.
  const r = scoreSpecialsFanout({ campeon: "BRA" }, [
    { playerId: "u1", campeon: "ARG", awarded: { campeon: 5 } },
    { playerId: "u2", campeon: "BRA", awarded: { campeon: 0 } },
  ]);
  assert.deepStrictEqual(r.perPlayer, { u1: { specialsPoints: -5 }, u2: { specialsPoints: 5 } });
});

test("fanout: pick ausente o vacío no acierta", () => {
  const r = scoreSpecialsFanout({ campeon: "ARG" }, [
    { playerId: "u1" },
    { playerId: "u2", campeon: "" },
  ]);
  assert.deepStrictEqual(r.perPlayer, {});
  assert.deepStrictEqual(r.perPrediction[0].awarded, { campeon: 0 });
});

test("fanout: sin respuestas confirmadas → vacío", () => {
  const r = scoreSpecialsFanout({}, [{ playerId: "u1", campeon: "ARG" }]);
  assert.deepStrictEqual(r.perPrediction, []);
  assert.deepStrictEqual(r.perPlayer, {});
});

test("fanout: docs sin playerId o lista nula se toleran", () => {
  const r = scoreSpecialsFanout({ campeon: "ARG" }, [{ campeon: "ARG" }, null]);
  assert.deepStrictEqual(r.perPlayer, {});
  const r2 = scoreSpecialsFanout({ campeon: "ARG" }, null);
  assert.deepStrictEqual(r2.perPrediction, []);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test lib/specials.test.js`
Expected: FAIL — `Cannot find module './specials.js'`

- [ ] **Step 3: Write minimal implementation** — crear `lib/specials.js`:

```js
/* ============================================================
   PRODE REFUGIO — Especiales (lógica pura).
   Campeón, goleador, etc.: +5 por acierto. El admin confirma las
   respuestas oficiales de a una; el reparto es idempotente vía el
   mapa `awarded` de cada specialPredictions/{uid}. Dual navegador/Node.
   ============================================================ */
(function (global) {
  const SPECIAL_KEYS = ["campeon", "subcampeon", "goleador", "arquero", "sorpresa", "decepcion"];
  const SPECIAL_POINTS = 5;
  // Cierre de edición: kickoff del primer partido (11 jun 2026 18:00 Costa Rica).
  const SPECIALS_LOCK_MS = Date.parse("2026-06-11T18:00:00-06:00");

  function specialsLocked(nowMs) {
    const ms = typeof nowMs === "number" ? nowMs : Date.now();
    return ms >= SPECIALS_LOCK_MS;
  }

  // "  Mbappé " → "mbappe": para no perder puntos por tildes/mayúsculas.
  function normalizeAnswer(s) {
    return String(s == null ? "" : s)
      .trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // official: respuestas confirmadas { campeon: "ARG", ... } (subset de SPECIAL_KEYS).
  // predictions: docs specialPredictions [{ playerId, <picks>, awarded }].
  // Devuelve awards absolutos por predicción y deltas por jugador. Idempotente:
  // el delta descuenta lo ya repartido en `awarded` (mismo patrón que los partidos).
  function scoreSpecialsFanout(official, predictions) {
    const confirmed = SPECIAL_KEYS.filter((k) => official && official[k] != null && official[k] !== "");
    const perPrediction = [];
    const perPlayer = {};
    if (!confirmed.length) return { perPrediction, perPlayer };
    for (const p of predictions || []) {
      if (!p || !p.playerId) continue;
      const awarded = {};
      let delta = 0;
      for (const key of confirmed) {
        const pick = normalizeAnswer(p[key]);
        const target = pick !== "" && pick === normalizeAnswer(official[key]) ? SPECIAL_POINTS : 0;
        awarded[key] = target;
        delta += target - (Number(p.awarded && p.awarded[key]) || 0);
      }
      perPrediction.push({ playerId: p.playerId, awarded });
      if (delta !== 0) perPlayer[p.playerId] = { specialsPoints: delta };
    }
    return { perPrediction, perPlayer };
  }

  const api = { SPECIAL_KEYS, SPECIAL_POINTS, SPECIALS_LOCK_MS, specialsLocked, normalizeAnswer, scoreSpecialsFanout };
  global.ProdeSpecials = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test lib/specials.test.js` — Expected: PASS (11 tests)

- [ ] **Step 5: Run full suite**

Run: `node --test` — Expected: 60/60 (49 previos + 11)

- [ ] **Step 6: Commit**

```bash
git add lib/specials.js lib/specials.test.js
git commit -m "lib/specials: fan-out idempotente de especiales (+5, normalizado, corregible)"
```

---

### Task 2: badges reales — `lib/ranking.js` + `data.js` (TDD)

**Files:**
- Modify: `lib/ranking.js`
- Modify: `lib/ranking.test.js`
- Modify: `data.js` (bloque `window.BADGES`, ~líneas 222-229)

- [ ] **Step 1: Write the failing tests** — agregar a `lib/ranking.test.js` (sumar `badgesFor` al require de la línea 3):

```js
test("badgesFor: 6+ exactos gana profeta y casi (+cafe siempre)", () => {
  assert.deepStrictEqual(badgesFor({ id: "x", exact: 6 }), ["profeta", "casi", "cafe"]);
});

test("badgesFor: rey si ganó una semana, en orden de prestigio", () => {
  assert.deepStrictEqual(badgesFor({ id: "x", exact: 7 }, ["x"]), ["profeta", "rey", "casi", "cafe"]);
  assert.deepStrictEqual(badgesFor({ id: "x", exact: 0 }, new Set(["x"])), ["rey", "cafe"]);
});

test("badgesFor: novato → sólo cafe", () => {
  assert.deepStrictEqual(badgesFor({ id: "x", exact: 0 }), ["cafe"]);
  assert.deepStrictEqual(badgesFor({ id: "x", exact: 0 }, ["otro"]), ["cafe"]);
});

test("rankingRowsFromPlayers: agrega badges[] y badge = primera; acepta reyIds", () => {
  const rows = rankingRowsFromPlayers(players, "u3", ["u2"]);
  const sofi = rows.find(r => r.id === "u2");      // exact 2, ganó una semana
  assert.deepStrictEqual(sofi.badges, ["rey", "cafe"]);
  assert.strictEqual(sofi.badge, "rey");
  const joaco = rows.find(r => r.id === "u1");     // exact 7, sin semana ganada
  assert.deepStrictEqual(joaco.badges, ["profeta", "casi", "cafe"]);
});
```

Nota: el test existente "deriva iniciales, badge y nat" espera `sofi.badge === "cafe"` cuando NO se pasa `reyIds` — debe seguir pasando.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test lib/ranking.test.js`
Expected: FAIL — `badgesFor is not a function`

- [ ] **Step 3: Write implementation.** En `lib/ranking.js`, reemplazar la función `badgeFor` actual:

```js
  function badgeFor(exact) {
    const e = Number(exact) || 0;
    if (e >= 6) return "profeta";
    if (e >= 3) return "casi";
    return "cafe";
  }
```

por:

```js
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
```

Y en `rankingRowsFromPlayers`, cambiar la firma a `(players, myUid, reyIds)` y dentro del `.map` reemplazar la línea `badge: badgeFor(p.exact),` por:

```js
        badges: badgesFor(p, reyIds),
```

y después del map (antes del `.sort`) no hace falta nada más; en el objeto de cada fila agregar también `badge` derivado. El map completo queda:

```js
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
```

Y actualizar el export: `const api = { rankingRowsFromPlayers, badgesFor, initials };`

- [ ] **Step 4: Actualizar `data.js`** — reemplazar el bloque `window.BADGES` completo:

```js
// Badges — clave → metadata. Orden = prestigio (el primero ganado es el que
// se muestra en la fila compacta del ranking). Todos se otorgan con datos reales.
window.BADGES = {
  profeta: { label:"El Profeta",      sub:"6+ resultados exactos", emoji:"◎", color:"var(--neon-citrus)" },
  rey:     { label:"Rey del Refugio", sub:"Ganó una semana",       emoji:"♛", color:"var(--orange-400)" },
  casi:    { label:"Casi Brujo",      sub:"3+ resultados exactos", emoji:"✦", color:"var(--orange-500)" },
  cafe:    { label:"Café y Fulbo",    sub:"Está jugando el prode", emoji:"☕", color:"var(--tan-300)" },
};
```

(Se elimina `scaloneta`: nunca se otorgó y no hay datos para hacerlo real.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test lib/ranking.test.js` — Expected: PASS (8 tests: 4 previos + 4 nuevos)
Run: `node --test` — Expected: 64/64
Run: `node --check data.js` — Expected: sin errores

- [ ] **Step 6: Commit**

```bash
git add lib/ranking.js lib/ranking.test.js data.js
git commit -m "Badges reales: badgesFor multi-badge (profeta/rey/casi/cafe), scaloneta eliminado"
```

---

### Task 3: fix demo de especiales + read-back de picks propios

**Files:**
- Modify: `data.js` (bloque `window.MY_SPECIALS`, ~líneas 248-256)
- Modify: `app-store.js` (función `getSpecials`, ~líneas 278-283)
- Modify: `firebase-service.js` (state, `onAuthStateChanged`, `saveSpecials`, exports)

Sin lógica pura nueva; verificación = `node --check` + suite.

- [ ] **Step 1: `data.js`** — reemplazar el bloque:

```js
// Predicciones especiales del usuario
window.MY_SPECIALS = {
  campeon:    "ARG",
  subcampeon: "FRA",
  goleador:   "Kylian Mbappé",
  arquero:    "Emiliano Martínez",
  sorpresa:   "MAR",
  decepcion:  "GER",
};
```

por:

```js
// Predicciones especiales del usuario: SIN demo. Arrancan vacías; los picks
// reales viven en specialPredictions/{uid} (read-back en firebase-service).
window.MY_SPECIALS = {};
```

- [ ] **Step 2: `app-store.js`** — reemplazar `getSpecials`:

```js
  function getSpecials() {
    return {
      ...(window.MY_SPECIALS || {}),
      ...readJson(SPECIALS_KEY, {}),
    };
  }
```

por:

```js
  function getSpecials() {
    // Sin demo: local primero, y los picks reales de Firestore (read-back) pisan lo local.
    return {
      ...readJson(SPECIALS_KEY, {}),
      ...(window.ProdeDB?.getMySpecials?.() || {}),
    };
  }
```

(`saveSpecials` no cambia: ya spreadea `getSpecials()`, que ahora está libre de demo.)

- [ ] **Step 3: `firebase-service.js`** — tres cambios:

(a) En el estado inicial (línea ~16), agregar `mySpecials: {}`:

```js
  const state = { ready: false, user: null, player: null, db: null, auth: null, matchResults: {}, myPredictions: {}, mySpecials: {}, myPredsUnsub: null };
```

(b) En `onAuthStateChanged`, dentro del `if (user) { ... }`, después del bloque del read-back de predicciones (el `state.myPredsUnsub = collection("predictions")...`), agregar:

```js
        // Read-back: mis especiales (one-shot; cambian poco y se cierran el 11 jun).
        try {
          const sp = await collection("specialPredictions").doc(user.uid).get();
          state.mySpecials = sp.exists ? sp.data() : {};
        } catch (e) {
          console.warn("[Prode Refugio] read-back especiales", e);
          state.mySpecials = {};
        }
        window.dispatchEvent(new CustomEvent("prode:data", { detail: { key: "mySpecials" } }));
```

Y en la rama `else` (logout), junto a `state.myPredictions = {};` agregar:

```js
        state.mySpecials = {};
```

(c) En `saveSpecials`, después del `await collection("specialPredictions").doc(playerId).set(payload, { merge: true });` y antes del `return { offline: false };`, agregar (mantiene el read-back en memoria al día para que `getSpecials` no devuelva picks viejos):

```js
    state.mySpecials = { ...state.mySpecials, ...specials };
```

(d) En el export `window.ProdeDB = { ... }`, agregar la línea:

```js
    getMySpecials: () => state.mySpecials,
```

- [ ] **Step 4: Verificar**

Run: `node --check data.js && node --check app-store.js && node --check firebase-service.js && node --test`
Expected: sin errores de sintaxis; 64/64

- [ ] **Step 5: Commit**

```bash
git add data.js app-store.js firebase-service.js
git commit -m "Especiales sin demo + read-back de picks propios (getMySpecials)"
```

---

### Task 4: `confirmSpecialResult` + `subscribeSpecialResults` en firebase-service + script en index.html

**Files:**
- Modify: `firebase-service.js` (nuevas funciones + exports)
- Modify: `index.html` (script `lib/specials.js` después de `lib/weekly.js`, ~línea 248)

- [ ] **Step 1: `index.html`** — después de `<script src="lib/weekly.js"></script>`:

```html
<script src="lib/weekly.js"></script>
<script src="lib/specials.js"></script>
```

(Orden: antes de `firebase-service.js`.)

- [ ] **Step 2: `firebase-service.js`** — agregar estas dos funciones después de `expelPlayer` (antes del `window.ProdeDB = {`):

```js
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
    const inc = window.firebase.firestore.FieldValue.increment;
    let batch = state.db.batch();
    let writes = 0;
    const flush = async () => { if (writes > 0) { await batch.commit(); batch = state.db.batch(); writes = 0; } };
    for (const pp of perPrediction) {
      batch.set(collection("specialPredictions").doc(pp.playerId), { awarded: pp.awarded }, { merge: true });
      if (++writes >= 450) await flush();
    }
    for (const [playerId, d] of Object.entries(perPlayer)) {
      // Los especiales suman al total del ranking; NO tocan los buckets semanales.
      batch.set(collection("players").doc(playerId), {
        specialsPoints: inc(d.specialsPoints), points: inc(d.specialsPoints),
      }, { merge: true });
      if (++writes >= 450) await flush();
    }
    await flush();
    return { evaluated: perPrediction.length };
  }
```

Y en el export `window.ProdeDB = { ... }` agregar:

```js
    subscribeSpecialResults,
    confirmSpecialResult,
```

- [ ] **Step 3: Verificar**

Run: `node --check firebase-service.js && node --test`
Expected: sin errores; 64/64

- [ ] **Step 4: Commit**

```bash
git add firebase-service.js index.html
git commit -m "confirmSpecialResult: respuestas oficiales en meta + fan-out de +5 idempotente"
```

---

### Task 5: reglas de Firestore — lock de especiales + protección de `awarded`

**Files:**
- Modify: `firestore.rules` (bloque `specialPredictions`, líneas 86-91)

- [ ] **Step 1: Reemplazar el bloque actual**:

```
    // ---- specialPredictions: campeón, goleador, etc. ----
    match /specialPredictions/{uid} {
      allow read: if isSignedIn();
      allow create, update: if isOwner(uid) || isAdmin();
      allow delete: if isAdmin() || isOwner(uid);
    }
```

por:

```
    // ---- specialPredictions: campeón, goleador, etc. ----
    // El dueño edita sus picks SOLO antes del arranque del Mundial
    // (11 jun 2026 18:00 CR = 2026-06-12 00:00 UTC) y NUNCA el mapa
    // `awarded` (puntaje ya repartido; lo escribe el fan-out del admin).
    match /specialPredictions/{uid} {
      allow read: if isSignedIn();
      allow create: if isAdmin()
        || (isOwner(uid)
            && request.time < timestamp.date(2026, 6, 12)
            && !request.resource.data.keys().hasAny(['awarded']));
      allow update: if isAdmin()
        || (isOwner(uid)
            && request.time < timestamp.date(2026, 6, 12)
            && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['awarded']));
      allow delete: if isAdmin();
    }
```

(Cambios: lock por `request.time`; el dueño no puede tocar `awarded` — sin esto podría inflarse puntos manipulando el delta; se quita el delete del dueño: tras el cierre no debe poder borrar sus picks.)

- [ ] **Step 2: Verificación** — sin test automatizado de reglas en este repo; releer el bloque comparándolo con el de `predictions` (patrón `points == null`). Confirmar que `meta` ya permite `write: if isAdmin()` (líneas 93-97, sin cambios).

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "Reglas: lock de especiales (11 jun 18:00 CR) + awarded sólo lo escribe el admin"
```

**Nota para el reporte final:** el usuario debe **republicar `firestore.rules`** en la consola de Firebase (ya pendiente por el Expulsar; una sola republicación cubre ambas).

---

### Task 6: pestaña Admin "Especiales" (componente compartido mobile/desktop)

**Files:**
- Modify: `screens/Admin.jsx` (nueva pestaña + componente `AdminSpecials` expuesto en `window`)
- Modify: `app.jsx` (pestaña en `DesktopAdmin`)

- [ ] **Step 1: Componente `AdminSpecials`** — agregar al final de `screens/Admin.jsx`, antes de `window.Admin = Admin;`:

```jsx
/* ---------- AdminSpecials: respuestas oficiales de los especiales ----------
   Compartido entre el Admin mobile y el DesktopAdmin (app.jsx). Confirmar
   reparte +5 a cada acertante (idempotente; corregir y re-confirmar recalcula). */
const SPECIAL_TEAM_OPTS = ["ARG","BRA","FRA","ESP","ENG","POR","GER","NED","MAR","URU","ITA","COL","CRO","BEL","JPN","USA","MEX","CRC"];
const SPECIAL_DEFS = [
  { key:"campeon",    label:"Campeón del Mundial", type:"team" },
  { key:"subcampeon", label:"Subcampeón",          type:"team" },
  { key:"goleador",   label:"Goleador del torneo", type:"name",
    options:["Kylian Mbappé","Lionel Messi","Lautaro Martínez","Erling Haaland","Vinícius Jr.","Harry Kane","Julián Álvarez","Pedri"] },
  { key:"arquero",    label:"Mejor arquero",       type:"name",
    options:["Emiliano Martínez","Thibaut Courtois","Mike Maignan","Unai Simón","Alisson","Yann Sommer"] },
  { key:"sorpresa",   label:"Sorpresa del torneo", type:"team" },
  { key:"decepcion",  label:"Equipo decepción",    type:"team" },
];

function AdminSpecials() {
  const [official, setOfficial] = useState({});
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    const unsub = window.ProdeDB?.subscribeSpecialResults?.((res) => setOfficial(res || {}));
    return () => unsub && unsub();
  }, []);

  const setDraft = (key, value) => setDrafts((d) => ({ ...d, [key]: value }));

  const confirm = async (key) => {
    const value = String(drafts[key] || "").trim();
    if (!value) return;
    setSaving(key);
    try {
      await window.ProdeDB?.confirmSpecialResult?.(key, value);
      setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
    } catch (e) {
      console.error("[Prode Refugio] confirmar especial", e);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <div style={{
        padding:"10px 13px", borderRadius:14, marginBottom:12,
        background:"var(--char-800)", border:"1px solid var(--char-700)",
        fontSize:11, color:"var(--char-300)", lineHeight:1.5,
      }}>
        Confirmar reparte <span style={{color:"var(--neon-citrus)", fontWeight:700}}>+5</span> a
        cada jugador que acertó. Corregir y re-confirmar recalcula sin duplicar.
      </div>
      {SPECIAL_DEFS.map((def) => {
        const current = official[def.key];
        const draft = drafts[def.key] || "";
        const busy = saving === def.key;
        return (
          <div key={def.key} style={{
            borderRadius:18, padding:"14px 14px 12px", marginBottom:10,
            background:"var(--char-800)",
            border:`1px solid ${current ? "var(--neon-citrus)" : "var(--char-700)"}`,
          }}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:8}}>
              <div style={{
                fontFamily:"var(--font-title)", fontSize:14, color:"var(--cream-100)",
                textTransform:"uppercase", letterSpacing:"0.02em",
              }}>{def.label}</div>
              {current
                ? <Pill tone="done">OFICIAL: {current}</Pill>
                : <Pill tone="open">Sin confirmar</Pill>}
            </div>
            {def.type === "team" ? (
              <div style={{display:"flex", gap:6, overflowX:"auto", padding:"2px 0 6px", scrollbarWidth:"none"}}>
                {SPECIAL_TEAM_OPTS.map((c) => {
                  const on = draft === c;
                  return (
                    <button key={c} onClick={()=>setDraft(def.key, c)} style={{
                      flexShrink:0, padding:6, borderRadius:12, cursor:"pointer",
                      background: on ? "var(--char-700)" : "var(--char-900)",
                      border:`1.5px solid ${on ? "var(--neon-citrus)" : "var(--char-700)"}`,
                      display:"flex", flexDirection:"column", alignItems:"center", gap:4, minWidth:50,
                    }}>
                      <Flag code={c} size={24}/>
                      <span style={{fontSize:8, color:"var(--cream-100)", letterSpacing:"0.14em", fontWeight:700}}>{c}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:8}}>
                  {def.options.map((n) => {
                    const on = draft === n;
                    return (
                      <button key={n} onClick={()=>setDraft(def.key, n)} style={{
                        padding:"6px 11px", borderRadius:999, cursor:"pointer",
                        border:`1px solid ${on ? "var(--neon-citrus)" : "var(--char-600)"}`,
                        background: on ? "var(--neon-citrus)" : "transparent",
                        color: on ? "var(--char-900)" : "var(--cream-100)",
                        fontSize:10, fontWeight:600, fontFamily:"var(--font-body)",
                      }}>{n}</button>
                    );
                  })}
                </div>
                <input
                  value={draft}
                  placeholder="U otro nombre..."
                  onChange={(e)=>setDraft(def.key, e.target.value)}
                  style={{
                    width:"100%", height:34, borderRadius:10, padding:"0 12px",
                    background:"var(--char-900)", color:"var(--cream-100)",
                    border:"1px solid var(--char-600)", outline:"none",
                    fontFamily:"var(--font-body)", fontSize:12, boxSizing:"border-box",
                  }}/>
              </div>
            )}
            <div style={{marginTop:8, display:"flex", justifyContent:"flex-end"}}>
              <Btn size="sm" variant="accent" onClick={()=>confirm(def.key)}>
                {busy ? "Repartiendo..." : current ? "Corregir y re-confirmar" : "Confirmar"}
              </Btn>
            </div>
          </div>
        );
      })}
    </div>
  );
}
window.AdminSpecials = AdminSpecials;
```

- [ ] **Step 2: Pestaña en el Admin mobile** — en `screens/Admin.jsx`, el array de tabs actual:

```jsx
        {[
          {id:"resultados",label:"Resultados", icon:"check-check"},
          {id:"partidos",  label:"Partidos", icon:"goal"},
          {id:"jugadores", label:"Jugadores", icon:"users"},
        ].map(t => {
```

pasa a:

```jsx
        {[
          {id:"resultados", label:"Resultados", icon:"check-check"},
          {id:"especiales", label:"Especiales", icon:"star"},
          {id:"partidos",   label:"Partidos", icon:"goal"},
          {id:"jugadores",  label:"Jugadores", icon:"users"},
        ].map(t => {
```

Y agregar el contenido (después del bloque `{tab === "resultados" && (...)}`):

```jsx
      {tab === "especiales" && (
        <div style={{padding:"22px 16px 0"}}>
          <Eyebrow color="var(--neon-citrus)">Respuestas oficiales</Eyebrow>
          <h3 style={{
            fontFamily:"var(--font-title)", fontSize:20, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 12px",
          }}>Especiales</h3>
          <AdminSpecials/>
        </div>
      )}
```

- [ ] **Step 3: Pestaña en `DesktopAdmin`** — en `app.jsx`, la lista de tabs del sidebar:

```jsx
        {[
          {id:"resultados", label:"Resultados", icon:"check-check"},
          {id:"jugadores",  label:"Jugadores",  icon:"users"},
        ].map(t => {
```

pasa a:

```jsx
        {[
          {id:"resultados", label:"Resultados", icon:"check-check"},
          {id:"especiales", label:"Especiales", icon:"star"},
          {id:"jugadores",  label:"Jugadores",  icon:"users"},
        ].map(t => {
```

Y agregar el contenido en el `<main>` (después del bloque `{tab === "jugadores" && (...)}`, antes del cierre `</main>`):

```jsx
        {tab === "especiales" && (
          <div style={{maxWidth:640}}>
            <div style={{marginBottom:18}}>
              <Eyebrow color="var(--neon-citrus)">Panel · Tamarindo</Eyebrow>
              <h1 style={{
                fontFamily:"var(--font-title)", fontSize:36, color:"var(--cream-100)",
                textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 0",
              }}>Especiales · respuestas oficiales</h1>
            </div>
            {window.AdminSpecials ? <AdminSpecials/> : null}
          </div>
        )}
```

- [ ] **Step 4: Verificar**

Run: `npx --yes esbuild screens/Admin.jsx --loader:.jsx=jsx --outfile=NUL --log-level=error && npx --yes esbuild app.jsx --loader:.jsx=jsx --outfile=NUL --log-level=error && node --test`
Expected: esbuild sin errores en ambos; 64/64

- [ ] **Step 5: Commit**

```bash
git add screens/Admin.jsx app.jsx
git commit -m "Admin: pestaña Especiales (AdminSpecials compartido mobile/desktop)"
```

---

### Task 7: pantalla Especiales del jugador — lock + resultados oficiales

**Files:**
- Modify: `screens/Specials.jsx`

- [ ] **Step 1: Estado y suscripciones.** El inicio del componente actual:

```jsx
function Specials({ go }) {
  const [sp, setSp] = useState(window.ProdeStore?.getSpecials?.() || {...window.MY_SPECIALS});

  const saveAndClose = async () => {
    await window.ProdeStore?.saveSpecials(sp);
    go("matches");
  };
```

pasa a:

```jsx
function Specials({ go }) {
  const [sp, setSp] = useState(window.ProdeStore?.getSpecials?.() || {});
  const [official, setOfficial] = useState({});
  // Cerradas desde el kickoff del primer partido (11 jun 18:00 CR).
  const locked = window.ProdeSpecials?.specialsLocked?.() ?? false;

  useEffect(() => {
    // Read-back: cuando llegan mis picks de Firestore, completan lo no editado acá.
    const onData = () => setSp((prev) => ({ ...(window.ProdeStore?.getSpecials?.() || {}), ...prev }));
    window.addEventListener("prode:data", onData);
    return () => window.removeEventListener("prode:data", onData);
  }, []);

  useEffect(() => {
    const unsub = window.ProdeDB?.subscribeSpecialResults?.((res) => setOfficial(res || {}));
    return () => unsub && unsub();
  }, []);

  const saveAndClose = async () => {
    if (locked) return;
    await window.ProdeStore?.saveSpecials(sp);
    go("matches");
  };

  // Resultado oficial de un especial (si ya se confirmó): respuesta + si acertaste.
  const resultFor = (key) => {
    const ans = official[key];
    if (!ans) return null;
    const norm = window.ProdeSpecials?.normalizeAnswer || ((x) => String(x || ""));
    return { official: ans, hit: norm(sp[key]) !== "" && norm(sp[key]) === norm(ans) };
  };
```

- [ ] **Step 2: Lock en los pickers.** En `teamPick`, el `onClick` y estilos del botón pasan a respetar `locked` (la función está dentro del componente, ve la variable):

```jsx
            <button key={c} disabled={locked} onClick={()=>{ if (!locked) setSp(s=>({...s, [key]:c})); }} style={{
              flexShrink:0, padding:8, borderRadius:14, cursor: locked ? "not-allowed" : "pointer",
              opacity: locked && !on ? 0.45 : 1,
              background: on ? "var(--char-700)" : "var(--char-900)",
              border:`1.5px solid ${on ? "var(--neon-citrus)" : "var(--char-700)"}`,
              display:"flex", flexDirection:"column", alignItems:"center", gap:5, minWidth:60,
            }}>
```

Y `ScorerPick` (función módulo-level del mismo archivo) gana el prop `disabled`:

```jsx
function ScorerPick({ value, onChange, options, disabled }) {
  const list = options || [
    "Kylian Mbappé", "Lionel Messi", "Lautaro Martínez", "Erling Haaland",
    "Vinícius Jr.", "Harry Kane", "Julián Álvarez", "Pedri",
  ];
  return (
    <div style={{display:"flex", gap:7, flexWrap:"wrap", padding:"4px 0 0"}}>
      {list.map(n => {
        const on = value === n;
        return (
          <button key={n} disabled={disabled} onClick={()=>{ if (!disabled) onChange(n); }} style={{
            padding:"7px 12px", borderRadius:999,
            border:`1px solid ${on ? "var(--neon-citrus)" : "var(--char-600)"}`,
            background: on ? "var(--neon-citrus)" : "transparent",
            color: on ? "var(--char-900)" : "var(--cream-100)",
            fontSize:11, fontWeight:600, cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled && !on ? 0.45 : 1,
            letterSpacing:"0.02em", fontFamily:"var(--font-body)",
          }}>{n}</button>
        );
      })}
    </div>
  );
}
```

En las dos llamadas a `<ScorerPick .../>` del render, agregar `disabled={locked}`.

- [ ] **Step 3: Resultado oficial en cada fila.** `SpecialRow` gana el prop `result` y lo muestra al final (después de `{children}`):

```jsx
function SpecialRow({ icon, tone, label, sub, current, result, children }) {
```

y antes del cierre del div raíz (después de `{children}`):

```jsx
      {result && (
        <div style={{
          marginTop:10, padding:"7px 10px", borderRadius:12,
          background: result.hit ? "rgba(232,242,106,0.10)" : "var(--char-900)",
          border:`1px solid ${result.hit ? "var(--neon-citrus)" : "var(--char-700)"}`,
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:8,
        }}>
          <Eyebrow color={result.hit ? "var(--neon-citrus)" : "var(--char-300)"}>
            Oficial: {result.official}
          </Eyebrow>
          <div style={{
            fontFamily:"var(--font-title)", fontSize:13,
            color: result.hit ? "var(--neon-citrus)" : "var(--char-400)",
          }}>{result.hit ? "✓ +5" : "✗ SIN PUNTO"}</div>
        </div>
      )}
```

Y en el render del componente `Specials`, cada `<SpecialRow ...>` gana su `result`:

```jsx
        <SpecialRow icon="trophy" tone="citrus" label="Campeón del Mundial" sub="Levanta la copa" current={sp.campeon} result={resultFor("campeon")}>
```

(igual para `subcampeon`, `goleador`, `arquero`, `sorpresa`, `decepcion`).

- [ ] **Step 4: Botón de guardado con lock.** El botón final:

```jsx
        <Btn full variant="accent" size="lg" icon="lock" onClick={saveAndClose}>
          Bloquear especiales
        </Btn>
```

pasa a:

```jsx
        <Btn full variant={locked ? "dark" : "accent"} size="lg" icon="lock" onClick={saveAndClose}>
          {locked ? "Especiales cerradas" : "Bloquear especiales"}
        </Btn>
```

- [ ] **Step 5: Verificar**

Run: `npx --yes esbuild screens/Specials.jsx --loader:.jsx=jsx --outfile=NUL --log-level=error && node --test`
Expected: esbuild sin errores; 64/64

- [ ] **Step 6: Commit**

```bash
git add screens/Specials.jsx
git commit -m "Especiales: lock desde el 11 jun 18:00 + resultado oficial (✓ +5 / ✗) por fila"
```

---

### Task 8: Ranking — badges múltiples + rey desde el ganador semanal

**Files:**
- Modify: `screens/Ranking.jsx` (cálculo de `rows` con `reyIds`; chips múltiples en `RankRow`)

- [ ] **Step 1: `reyIds` en el cálculo de rows.** El bloque actual:

```jsx
  const myUid = window.ProdeDB?.getUser?.()?.uid;
  const loading = players === null;            // null = aún no llegó el primer snapshot
  const rows = (players && window.ProdeRanking)
    ? window.ProdeRanking.rankingRowsFromPlayers(players, myUid)
    : [];                                       // sin datos reales: vacío (nada de demo)
```

pasa a:

```jsx
  const myUid = window.ProdeDB?.getUser?.()?.uid;
  const loading = players === null;            // null = aún no llegó el primer snapshot
  // Rey del Refugio: ganó alguna semana cerrada (datos del ganador semanal).
  const reyIds = (players && window.ProdeWeekly)
    ? window.ProdeWeekly.weeklyHistory(players, window.ProdeWeekly.currentWeekId())
        .flatMap((h) => h.leaders.map((l) => l.id))
    : [];
  const rows = (players && window.ProdeRanking)
    ? window.ProdeRanking.rankingRowsFromPlayers(players, myUid, reyIds)
    : [];                                       // sin datos reales: vacío (nada de demo)
```

- [ ] **Step 2: Chips múltiples en la fila expandida.** En `RankRow`, el bloque expandido actual:

```jsx
          <BadgeChip kind={r.badge}/>
```

pasa a:

```jsx
          {(r.badges || [r.badge]).map((k) => <BadgeChip key={k} kind={k}/>)}
```

(La leyenda "Badges del Mundial" no cambia: itera `window.BADGES`, que ya quedó en 4 con textos claros en el Task 2.)

- [ ] **Step 3: Verificar**

Run: `npx --yes esbuild screens/Ranking.jsx --loader:.jsx=jsx --outfile=NUL --log-level=error && node --test`
Expected: esbuild sin errores; 64/64

- [ ] **Step 4: Smoke test de render en navegador** (lo corre el controlador con el preview `prode-static`): mockear `ProdeDB.subscribeRanking` con 2 jugadores (uno `exact: 6`, otro con `weekly.s1` ganada), renderizar `window.Ranking` y verificar que el texto incluye "El Profeta" (leyenda), que NO incluye "Scaloneta", y que la fila expandida muestra varios chips. Cero errores Babel en consola.

- [ ] **Step 5: Commit**

```bash
git add screens/Ranking.jsx
git commit -m "Ranking: badges múltiples por fila + Rey del Refugio real (ganador semanal)"
```

---

### QA manual (usuario, con datos reales)

1. Antes del 11 jun 18:00: elegir especiales como jugador → se guardan; verlas en otro dispositivo (read-back).
2. Después del cierre: los pickers quedan deshabilitados; intentar editar por consola falla (reglas republicadas).
3. Admin confirma "decepción = GER" → los que la eligieron suben +5 (`specialsPoints` y `points`); ✓ +5 en su pantalla.
4. Re-confirmar lo mismo → sin cambios. Corregir a otro equipo → los puntos se mueven.
5. Ranking: fila expandida muestra los badges reales; la leyenda tiene 4 badges con textos claros.
6. **Republicar `firestore.rules`** (cubre esto + el Expulsar pendiente).
