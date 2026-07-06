# Auto-avance del cuadro eliminatorio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al cargar el resultado de un partido de eliminación, completar automáticamente los equipos del cruce siguiente (ganador → próxima ronda; perdedor de semis → 3er puesto), sin editar `data.js` a mano.

**Architecture:** Un resolvedor puro (`lib/bracket.js`) deduce ganador/perdedor de cada partido finalizado y rellena los equipos de la ronda siguiente leyendo un mapa `feed` (en `data.js`). Se enchufa en `ProdeStore.getMatches()`, así toda la app ve los equipos resueltos. `finalizeMatch` gana un parámetro `advances` (quién pasó por penales) y el Admin muestra un selector cuando el marcador es empate.

**Tech Stack:** React (Babel standalone, sin build), `node --test`, Firebase compat.

**Spec:** `docs/superpowers/specs/2026-07-05-auto-avance-cuadro-design.md`

## Global Constraints

- **NO romper datos ya cargados.** Los `id` no cambian (m73–m104). El resolvedor **solo rellena equipos vacíos; nunca pisa ni vacía** uno existente. No toca predicciones, resultados, puntos ni ranking. `finalizeMatch` solo agrega `advances`.
- `getMatches()` debe ser tolerante: si `window.ProdeBracket` no está, devuelve los partidos sin resolver (como hoy).
- App estática sin bundler. `lib/*.js` IIFE dual navegador/Node (`global.X = api; module.exports = api;`), testeados con `node --test`. **Suite actual: 88 tests verdes.**
- Comentarios en español; acentos y guiones (`–`) intencionales → UTF-8 con Write/Edit.
- Validar JSX: `npx --yes esbuild <archivo>.jsx --loader:.jsx=jsx --outfile=NUL --log-level=error` y limpiar `rm -rf NUL NUL_DIR`.
- `data.js` es browser-only (usa `window`): validar con `node --check` y un `node -e` con `global.window={}` + `eval`.

---

### Task 1: `lib/bracket.js` — resolvedor del cuadro (TDD)

**Files:**
- Create: `lib/bracket.js`
- Create: `lib/bracket.test.js`

**Interfaces:**
- Produces: `matchWinner(match) -> code|null`, `matchLoser(match) -> code|null`, `resolveBracket(matches) -> matches[]` en `window.ProdeBracket` (+ `module.exports`). Los consumen `app-store.js` (Task 2) y el Admin (Task 4).

- [ ] **Step 1: Write the failing tests** — crear `lib/bracket.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert");
const { matchWinner, matchLoser, resolveBracket } = require("./bracket.js");

test("matchWinner: decisivo / empate con advances / empate sin advances / no finalizado / sin equipos", () => {
  assert.strictEqual(matchWinner({ status:"finalizado", a:"ARG", b:"BRA", scoreA:2, scoreB:1 }), "ARG");
  assert.strictEqual(matchWinner({ status:"finalizado", a:"ARG", b:"BRA", scoreA:0, scoreB:3 }), "BRA");
  assert.strictEqual(matchWinner({ status:"finalizado", a:"ARG", b:"BRA", scoreA:1, scoreB:1, advances:"BRA" }), "BRA");
  assert.strictEqual(matchWinner({ status:"finalizado", a:"ARG", b:"BRA", scoreA:1, scoreB:1 }), null);
  assert.strictEqual(matchWinner({ status:"abierto", a:"ARG", b:"BRA", scoreA:2, scoreB:1 }), null);
  assert.strictEqual(matchWinner({ status:"finalizado", a:null, b:"BRA", scoreA:2, scoreB:1 }), null);
});

test("matchLoser: el que no ganó; null si no hay ganador", () => {
  assert.strictEqual(matchLoser({ status:"finalizado", a:"ARG", b:"BRA", scoreA:2, scoreB:1 }), "BRA");
  assert.strictEqual(matchLoser({ status:"finalizado", a:"ARG", b:"BRA", scoreA:1, scoreB:1, advances:"ARG" }), "BRA");
  assert.strictEqual(matchLoser({ status:"finalizado", a:"ARG", b:"BRA", scoreA:1, scoreB:1 }), null);
});

test("resolveBracket: rellena un octavo desde dos 32avos finalizados", () => {
  const ms = [
    { id:"m73", round:"r32", a:"RSA", b:"CAN", status:"finalizado", scoreA:0, scoreB:1 },
    { id:"m75", round:"r32", a:"NED", b:"MAR", status:"finalizado", scoreA:1, scoreB:1, advances:"MAR" },
    { id:"m90", round:"r16", a:null, b:null, feed:{ a:{ m:"m73", pick:"W" }, b:{ m:"m75", pick:"W" } }, status:"abierto" },
  ];
  const m90 = resolveBracket(ms).find((x) => x.id === "m90");
  assert.strictEqual(m90.a, "CAN");
  assert.strictEqual(m90.b, "MAR");
});

test("resolveBracket: cadena r32 → r16 → qf en un solo llamado", () => {
  const ms = [
    { id:"m73", round:"r32", a:"RSA", b:"CAN", status:"finalizado", scoreA:0, scoreB:1 },
    { id:"m75", round:"r32", a:"NED", b:"MAR", status:"finalizado", scoreA:2, scoreB:0 },
    { id:"m74", round:"r32", a:"GER", b:"PAR", status:"finalizado", scoreA:0, scoreB:2 },
    { id:"m77", round:"r32", a:"FRA", b:"SWE", status:"finalizado", scoreA:3, scoreB:0 },
    { id:"m90", round:"r16", a:null, b:null, feed:{ a:{ m:"m73", pick:"W" }, b:{ m:"m75", pick:"W" } }, status:"finalizado", scoreA:1, scoreB:2 },
    { id:"m89", round:"r16", a:null, b:null, feed:{ a:{ m:"m74", pick:"W" }, b:{ m:"m77", pick:"W" } }, status:"finalizado", scoreA:0, scoreB:1 },
    { id:"m97", round:"qf", a:null, b:null, feed:{ a:{ m:"m89", pick:"W" }, b:{ m:"m90", pick:"W" } }, status:"abierto" },
  ];
  const byId = Object.fromEntries(resolveBracket(ms).map((m) => [m.id, m]));
  assert.strictEqual(byId.m90.a, "CAN"); assert.strictEqual(byId.m90.b, "NED"); // W(m73)=CAN, W(m75)=NED
  assert.strictEqual(byId.m89.a, "PAR"); assert.strictEqual(byId.m89.b, "FRA"); // W(m74)=PAR, W(m77)=FRA
  assert.strictEqual(byId.m97.a, "FRA"); assert.strictEqual(byId.m97.b, "NED"); // W(m89)=FRA, W(m90)=NED
});

test("resolveBracket: 3er puesto toma los perdedores de las semis; final los ganadores", () => {
  const ms = [
    { id:"m101", round:"sf", a:"ARG", b:"FRA", status:"finalizado", scoreA:2, scoreB:0 },
    { id:"m102", round:"sf", a:"ESP", b:"BRA", status:"finalizado", scoreA:1, scoreB:1, advances:"ESP" },
    { id:"m103", round:"third", a:null, b:null, feed:{ a:{ m:"m101", pick:"L" }, b:{ m:"m102", pick:"L" } }, status:"abierto" },
    { id:"m104", round:"final", a:null, b:null, feed:{ a:{ m:"m101", pick:"W" }, b:{ m:"m102", pick:"W" } }, status:"abierto" },
  ];
  const byId = Object.fromEntries(resolveBracket(ms).map((m) => [m.id, m]));
  assert.strictEqual(byId.m103.a, "FRA"); assert.strictEqual(byId.m103.b, "BRA");
  assert.strictEqual(byId.m104.a, "ARG"); assert.strictEqual(byId.m104.b, "ESP");
});

test("resolveBracket: no pisa equipo ya cargado; feeder sin jugar queda null; no muta la entrada", () => {
  const ms = [
    { id:"m73", round:"r32", a:"RSA", b:"CAN", status:"finalizado", scoreA:0, scoreB:1 },
    { id:"m75", round:"r32", a:"NED", b:"MAR", status:"abierto" },
    { id:"m90", round:"r16", a:"XXX", b:null, feed:{ a:{ m:"m73", pick:"W" }, b:{ m:"m75", pick:"W" } }, status:"abierto" },
  ];
  const snapshot = JSON.parse(JSON.stringify(ms));
  const m90 = resolveBracket(ms).find((x) => x.id === "m90");
  assert.strictEqual(m90.a, "XXX"); // ya cargado → no se pisa aunque W(m73)=CAN
  assert.strictEqual(m90.b, null);  // m75 sin jugar → sigue null
  assert.deepStrictEqual(ms, snapshot); // no mutó la entrada
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test lib/bracket.test.js`
Expected: FAIL — `Cannot find module './bracket.js'`.

- [ ] **Step 3: Write the implementation** — crear `lib/bracket.js`:

```js
/* ============================================================
   PRODE REFUGIO — Cuadro eliminatorio (lógica pura).
   Deduce el ganador/perdedor de cada partido finalizado y rellena
   los equipos de la ronda siguiente leyendo el `feed` de cada partido.
   NUNCA pisa ni vacía un equipo ya cargado. Dual navegador/Node.
   ============================================================ */
(function (global) {
  // Ganador de un partido ya con equipos y resultado. null si no se puede saber.
  function matchWinner(m) {
    if (!m || m.status !== "finalizado") return null;
    const a = m.a, b = m.b;
    if (!a || !b) return null;
    const sa = Number(m.scoreA), sb = Number(m.scoreB);
    if (!Number.isFinite(sa) || !Number.isFinite(sb)) return null;
    if (sa > sb) return a;
    if (sb > sa) return b;
    // Empate (penales): gana el marcado en `advances` si es uno de los dos.
    return (m.advances === a || m.advances === b) ? m.advances : null;
  }

  function matchLoser(m) {
    const w = matchWinner(m);
    if (!w) return null;
    return w === m.a ? m.b : m.a;
  }

  // Resuelve un origen del feed: "W" = ganador, "L" = perdedor.
  function resolvePick(byId, ref) {
    if (!ref || !ref.m) return null;
    const src = byId[ref.m];
    if (!src) return null;
    return ref.pick === "L" ? matchLoser(src) : matchWinner(src);
  }

  const ROUND_ORDER = ["r32", "r16", "qf", "sf", "third", "final"];

  // Copia de `matches` con los equipos de eliminación rellenados donde se pueda.
  // No pisa equipos presentes ni vacía ninguno; no muta la entrada.
  function resolveBracket(matches) {
    const out = (matches || []).map((m) => ({ ...m }));
    const byId = {};
    out.forEach((m) => { byId[m.id] = m; });
    // Ronda por ronda: los ganadores de una ronda alimentan la siguiente.
    for (const round of ROUND_ORDER) {
      for (const m of out) {
        if (m.round !== round || !m.feed) continue;
        if (!m.a && m.feed.a) { const t = resolvePick(byId, m.feed.a); if (t) m.a = t; }
        if (!m.b && m.feed.b) { const t = resolvePick(byId, m.feed.b); if (t) m.b = t; }
      }
    }
    return out;
  }

  const api = { matchWinner, matchLoser, resolveBracket };
  global.ProdeBracket = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test lib/bracket.test.js` — Expected: PASS (6 tests).

- [ ] **Step 5: Run full suite**

Run: `node --test` — Expected: 94 tests, 94 pass, 0 fail (88 + 6).

- [ ] **Step 6: Commit**

```bash
git add lib/bracket.js lib/bracket.test.js
git commit -m "lib/bracket: resolvedor del cuadro (ganador/perdedor + auto-relleno de rondas)"
```

---

### Task 2: `data.js` (mapa `feed`) + `index.html` (carga) + `app-store.js` (integración)

**Files:**
- Modify: `data.js`
- Modify: `index.html`
- Modify: `app-store.js`

**Interfaces:**
- Consumes: `window.ProdeBracket.resolveBracket` (Task 1).
- Produces: `ProdeStore.getMatches()` ahora devuelve partidos con los equipos de eliminación resueltos.

- [ ] **Step 1: Mapa `feed` en `data.js`** — el array `window.MATCHES = [ ... ];` termina con la entrada `m104` y una línea `];`. Inmediatamente DESPUÉS de ese `];` (que cierra `window.MATCHES`), agregar:

```js

// Cableado del cuadro eliminatorio (quién alimenta cada cruce), según el cuadro oficial
// FIFA 2026. pick "W" = ganador, "L" = perdedor. Se adjunta como `feed` a cada partido;
// el resolvedor (lib/bracket.js) lo usa para completar los equipos ronda a ronda.
window.KO_FEED = {
  m89:  { a:{ m:"m74", pick:"W" }, b:{ m:"m77", pick:"W" } },
  m90:  { a:{ m:"m73", pick:"W" }, b:{ m:"m75", pick:"W" } },
  m91:  { a:{ m:"m76", pick:"W" }, b:{ m:"m78", pick:"W" } },
  m92:  { a:{ m:"m79", pick:"W" }, b:{ m:"m80", pick:"W" } },
  m93:  { a:{ m:"m83", pick:"W" }, b:{ m:"m84", pick:"W" } },
  m94:  { a:{ m:"m81", pick:"W" }, b:{ m:"m82", pick:"W" } },
  m95:  { a:{ m:"m86", pick:"W" }, b:{ m:"m88", pick:"W" } },
  m96:  { a:{ m:"m85", pick:"W" }, b:{ m:"m87", pick:"W" } },
  m97:  { a:{ m:"m89", pick:"W" }, b:{ m:"m90", pick:"W" } },
  m98:  { a:{ m:"m93", pick:"W" }, b:{ m:"m94", pick:"W" } },
  m99:  { a:{ m:"m91", pick:"W" }, b:{ m:"m92", pick:"W" } },
  m100: { a:{ m:"m95", pick:"W" }, b:{ m:"m96", pick:"W" } },
  m101: { a:{ m:"m97", pick:"W" }, b:{ m:"m98", pick:"W" } },
  m102: { a:{ m:"m99", pick:"W" }, b:{ m:"m100", pick:"W" } },
  m103: { a:{ m:"m101", pick:"L" }, b:{ m:"m102", pick:"L" } },
  m104: { a:{ m:"m101", pick:"W" }, b:{ m:"m102", pick:"W" } },
};
window.MATCHES.forEach((m) => { if (window.KO_FEED[m.id]) m.feed = window.KO_FEED[m.id]; });
```

- [ ] **Step 2: Cargar `lib/bracket.js` en `index.html`** — después de la línea `<script src="lib/scoring.js"></script>` (línea 249), agregar:

```html
<script src="lib/bracket.js"></script>
```

- [ ] **Step 3: Enchufar el resolvedor en `getMatches`** — en `app-store.js`, reemplazar la función `getMatches` completa:

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

por:

```js
  function getMatches() {
    const overrides = getMatchOverrides();
    const remote = window.ProdeDB?.getMatchResults?.() || {};
    const merged = (window.MATCHES || []).map((match) => ({
      ...match,
      ...(overrides[match.id] || {}),
      ...(remote[match.id] || {}),
    }));
    // Auto-avance del cuadro: rellena los equipos de eliminación ya definidos.
    // Tolerante: si el resolvedor no está cargado, devuelve el merge tal cual.
    return window.ProdeBracket ? window.ProdeBracket.resolveBracket(merged) : merged;
  }
```

- [ ] **Step 4: Verificar sintaxis y el cableado**

Run: `node --check data.js && node --check app-store.js`
Expected: sin salida.

Run (el resolvedor rellena un cuarto a partir de resultados de octavos):
```bash
node -e "global.window={}; const fs=require('fs'); eval(fs.readFileSync('data.js','utf8')); const B=require('./lib/bracket.js'); console.log('withFeed', window.MATCHES.filter(m=>m.feed).length); const M=window.MATCHES.map(m=>({...m})); const byId=Object.fromEntries(M.map(m=>[m.id,m])); Object.assign(byId.m93,{status:'finalizado',scoreA:2,scoreB:1}); Object.assign(byId.m94,{status:'finalizado',scoreA:0,scoreB:3}); const r=B.resolveBracket(M); const m98=r.find(x=>x.id==='m98'); console.log('m98', m98.a, m98.b);"
```
Expected exacto:
```
withFeed 16
m98 POR BEL
```
(m93 POR-ESP 2-1 → POR; m94 USA-BEL 0-3 → BEL; m98 = W93·W94.)

- [ ] **Step 5: Commit**

```bash
git add data.js index.html app-store.js
git commit -m "data/app-store: cableado del cuadro (KO_FEED) + auto-avance en getMatches"
```

---

### Task 3: `firebase-service.js` — `finalizeMatch` acepta `advances`

**Files:**
- Modify: `firebase-service.js`

**Interfaces:**
- Produces: `finalizeMatch(matchId, scoreA, scoreB, advances?)` guarda `advances` en el doc del partido. Lo usa el Admin (Task 4).

- [ ] **Step 1: Firma y escritura de `advances`** — en `firebase-service.js`, en `finalizeMatch`, cambiar la firma y la escritura del partido. Reemplazar:

```js
  async function finalizeMatch(matchId, scoreA, scoreB) {
    if (!state.ready) throw new Error("Firebase no está listo.");
    const finalized = { status: "finalizado", scoreA: Number(scoreA), scoreB: Number(scoreB) };
    // 1) escribir el resultado del partido
    await collection("matches").doc(matchId).set({ ...finalized, updatedAt: firestoreNow() }, { merge: true });
```

por:

```js
  async function finalizeMatch(matchId, scoreA, scoreB, advances) {
    if (!state.ready) throw new Error("Firebase no está listo.");
    const finalized = { status: "finalizado", scoreA: Number(scoreA), scoreB: Number(scoreB) };
    // Eliminación por penales: quién avanzó (código de equipo). En partidos con ganador
    // por marcador va null (el resolvedor lo ignora). No borra el marcador.
    finalized.advances = advances || null;
    // 1) escribir el resultado del partido
    await collection("matches").doc(matchId).set({ ...finalized, updatedAt: firestoreNow() }, { merge: true });
```

- [ ] **Step 2: Verificar sintaxis y suite**

Run: `node --check firebase-service.js`
Expected: sin salida.

Run: `node --test`
Expected: 94/94 (sin cambios respecto de Task 1).

- [ ] **Step 3: Commit**

```bash
git add firebase-service.js
git commit -m "firebase-service: finalizeMatch guarda 'advances' (quién avanzó por penales)"
```

---

### Task 4: Selector "¿Quién avanzó?" en el Admin (mobile + desktop)

**Files:**
- Modify: `components.jsx` (nuevo `PenaltyPicker`)
- Modify: `screens/Admin.jsx` (Admin mobile)
- Modify: `app.jsx` (`DesktopAdmin`)

**Interfaces:**
- Consumes: `finalizeMatch(..., advances)` (Task 3); `match.round`/`match.advances`.

- [ ] **Step 1: Componente `PenaltyPicker` en `components.jsx`** — agregar (por ejemplo, justo después de `function MatchRow(...) { ... }`, a nivel de módulo):

```jsx
/* Selector "¿Quién avanzó?" para un partido de eliminación con marcador empatado
   (se define por penales). Se auto-oculta si no aplica. onPick recibe el código. */
function PenaltyPicker({ match, onPick, style }) {
  const m = match;
  const tie = m.round && m.a && m.b
    && Number.isFinite(Number(m.scoreA)) && Number.isFinite(Number(m.scoreB))
    && Number(m.scoreA) === Number(m.scoreB);
  if (!tie) return null;
  return (
    <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", ...(style||{}) }}>
      <span style={{ fontSize:10, color:"var(--char-400)", letterSpacing:"0.12em", fontWeight:700 }}>¿QUIÉN AVANZÓ?</span>
      {[m.a, m.b].map((code) => (
        <button key={code} onClick={() => onPick(code)} style={{
          padding:"4px 10px", borderRadius:999, cursor:"pointer",
          border:`1px solid ${m.advances === code ? "var(--neon-citrus)" : "var(--char-600)"}`,
          background: m.advances === code ? "var(--neon-citrus)" : "transparent",
          color: m.advances === code ? "var(--char-900)" : "var(--cream-100)",
          fontSize:11, fontWeight:700, fontFamily:"var(--font-body)",
          display:"inline-flex", alignItems:"center", gap:5,
        }}>
          <Flag code={code} size={14}/>{window.TEAMS[code]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Admin mobile — estado `advances` y pasar al confirmar** — en `screens/Admin.jsx`, después de la función `editScore` (que termina en `};`), agregar:

```jsx
  // Marca quién avanzó por penales (toggle). Se guarda en memoria hasta confirmar.
  const editAdvances = (id, code) => {
    setMatches(ms => ms.map(m => m.id === id ? { ...m, advances: m.advances === code ? null : code } : m));
  };
```

En la misma pantalla, reemplazar el cuerpo de `confirmResult`:

```jsx
      const a = Number(m.scoreA) || 0, b = Number(m.scoreB) || 0;
      if (window.ProdeDB?.finalizeMatch) {
        await window.ProdeDB.finalizeMatch(m.id, a, b);
      } else {
        await window.ProdeStore?.saveMatchResult(m.id, { status: "finalizado", scoreA: a, scoreB: b });
      }
```

por:

```jsx
      const a = Number(m.scoreA) || 0, b = Number(m.scoreB) || 0;
      const advances = a === b ? (m.advances || null) : null; // solo empate → penales
      if (window.ProdeDB?.finalizeMatch) {
        await window.ProdeDB.finalizeMatch(m.id, a, b, advances);
      } else {
        await window.ProdeStore?.saveMatchResult(m.id, { status: "finalizado", scoreA: a, scoreB: b, advances });
      }
```

- [ ] **Step 3: Admin mobile — render del selector** — en `screens/Admin.jsx`, la fila de carga es un `<div key={m.id} style={{ ... display:"flex", ... }}>` con banderas, inputs y el botón. Reemplazar ese `<div>` de la fila por una versión en columna que agrega el selector debajo. Cambiar:

```jsx
              <div key={m.id} style={{
                padding:"12px 13px",
                borderBottom: i < matchesByFilter.length - 1 ? "1px solid var(--char-700)" : 0,
                display:"flex", alignItems:"center", gap:10,
              }}>
                <Flag code={m.a} size={22}/>
```

por:

```jsx
              <div key={m.id} style={{
                padding:"12px 13px",
                borderBottom: i < matchesByFilter.length - 1 ? "1px solid var(--char-700)" : 0,
              }}>
                <div style={{display:"flex", alignItems:"center", gap:10}}>
                <Flag code={m.a} size={22}/>
```

y cerrar el `div` interno + insertar el selector: cambiar el bloque final de la fila:

```jsx
                <Btn
                  size="sm"
                  variant="accent"
                  onClick={() => confirmResult(m)}
                >
                  {saving === m.id ? "Guardando..." : (m.status === "finalizado" ? "Recalcular" : "Confirmar")}
                </Btn>
              </div>
```

por:

```jsx
                <Btn
                  size="sm"
                  variant="accent"
                  onClick={() => confirmResult(m)}
                >
                  {saving === m.id ? "Guardando..." : (m.status === "finalizado" ? "Recalcular" : "Confirmar")}
                </Btn>
                </div>
                <PenaltyPicker match={m} onPick={(code) => editAdvances(m.id, code)}/>
              </div>
```

- [ ] **Step 4: DesktopAdmin — estado `advances` y pasar al confirmar** — en `app.jsx`, después de `saveDesktopScore` (termina en `};`), agregar:

```jsx
  const setDesktopAdvances = (id, code) => {
    setMatches(ms => ms.map(m => m.id === id ? { ...m, advances: m.advances === code ? null : code } : m));
  };
```

Y en `saveRow` (dentro del `.map`), reemplazar:

```jsx
              const scoreA = Number(m.scoreA || 0);
              const scoreB = Number(m.scoreB || 0);
              setMatches(ms => ms.map(item => item.id === m.id ? {...item, scoreA, scoreB, status:"finalizado"} : item));
              const finalize = window.ProdeDB?.finalizeMatch
                ? window.ProdeDB.finalizeMatch(m.id, scoreA, scoreB)
                : window.ProdeStore?.saveMatchResult(m.id, {status:"finalizado", scoreA, scoreB});
```

por:

```jsx
              const scoreA = Number(m.scoreA || 0);
              const scoreB = Number(m.scoreB || 0);
              const advances = scoreA === scoreB ? (m.advances || null) : null; // solo empate → penales
              setMatches(ms => ms.map(item => item.id === m.id ? {...item, scoreA, scoreB, status:"finalizado"} : item));
              const finalize = window.ProdeDB?.finalizeMatch
                ? window.ProdeDB.finalizeMatch(m.id, scoreA, scoreB, advances)
                : window.ProdeStore?.saveMatchResult(m.id, {status:"finalizado", scoreA, scoreB, advances});
```

- [ ] **Step 5: DesktopAdmin — render del selector** — en `app.jsx`, la fila es `return (<div key={m.id} style={{ ...grid... }}> ... </div>)`. Envolverla para agregar el selector debajo, moviendo el `borderBottom` al contenedor. Cambiar:

```jsx
            return (
            <div key={m.id} style={{
              padding:"12px 16px", borderBottom: i < matchesByFilter.length - 1 ? "1px solid var(--char-700)" : 0,
              display:"grid", gridTemplateColumns:"70px 1.35fr 120px 120px 1fr 90px 80px", gap:12,
              alignItems:"center", fontSize:12,
            }}>
```

por:

```jsx
            return (
            <div key={m.id} style={{ borderBottom: i < matchesByFilter.length - 1 ? "1px solid var(--char-700)" : 0 }}>
            <div style={{
              padding:"12px 16px",
              display:"grid", gridTemplateColumns:"70px 1.35fr 120px 120px 1fr 90px 80px", gap:12,
              alignItems:"center", fontSize:12,
            }}>
```

Y cerrar: el `</div>` que cierra la fila-grid (justo antes de `)})}`) pasa a cerrar la grilla y el contenedor + el selector. Cambiar:

```jsx
                  <i data-lucide="check" style={{width:14,height:14}}></i>
                </button>
              </div>
            </div>
          )})}
```

por:

```jsx
                  <i data-lucide="check" style={{width:14,height:14}}></i>
                </button>
              </div>
            </div>
            <PenaltyPicker match={m} onPick={(code) => setDesktopAdvances(m.id, code)} style={{padding:"0 16px 12px"}}/>
            </div>
          )})}
```

- [ ] **Step 6: Validar JSX**

Run: `npx --yes esbuild components.jsx screens/Admin.jsx app.jsx --loader:.jsx=jsx --outfile=NUL --log-level=error`
Expected: sin errores. Luego: `rm -rf NUL NUL_DIR`

- [ ] **Step 7: Commit**

```bash
git add components.jsx screens/Admin.jsx app.jsx
git commit -m "Admin: selector 'quién avanzó' (penales) en carga de resultados, mobile + desktop"
```

---

## Verificación final (revisión de toda la feature)

1. `node --test` → 94/94.
2. Smoke test en Claude Preview (puerto 4173), simulando el flujo end-to-end sin Firebase:
   - Mockear `window.ProdeDB.getMatchResults` para devolver un octavo finalizado (ej. m93 POR-ESP 2-1) y confirmar que `ProdeStore.getMatches()` deja `m98.a === "POR"`.
   - Montar `PenaltyPicker` con un partido de eliminación empatado (m round, a/b, scoreA=scoreB=1) y confirmar que muestra los 2 chips; con marcador distinto, que no renderiza nada.
   - Screenshot de evidencia (Admin resultados con el selector visible en un empate).
3. Confirmar visualmente en Admin → Resultados que al poner un empate en un partido de eliminación aparece "¿Quién avanzó?" y en uno con ganador claro no.

Pasos de consola del usuario: ninguno (no cambian reglas ni proveedores). El campo `advances` lo escribe el admin vía `finalizeMatch` (ya autorizado). Datos existentes intactos: IDs sin cambios, resolvedor solo rellena.
