# Plan 1 — Base sólida (Prode Refugio)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar la duplicación de código (cargar archivos externos en vez de copias inline) y aislar + testear la lógica de puntaje y de cierre por horario, sin cambiar el comportamiento visible.

**Architecture:** La app sigue siendo estática y sin build. `index.html` pasa a cargar los `.jsx`/`.js` externos como única fuente de verdad, en vez de tener el código duplicado inline. La lógica pura (puntaje + lock) se extrae a `lib/scoring.js`, cargable tanto en el navegador (`window.ProdeScoring`) como en Node (`require`) para testear con el runner nativo `node --test`.

**Tech Stack:** React 18 + Babel standalone (CDN, sin build), `node:test` (runner nativo, sin dependencias), localStorage. Firebase compat queda igual (se completa en el Plan 2).

**Contexto:** Spec en `docs/superpowers/specs/2026-05-24-prode-multijugador-design.md`. Este es el primero de 4 planes; deja la base mantenible y de-riesga lo más frágil (que Babel cargue archivos externos) antes de construir el multijugador.

---

## File Structure

- **Create** `package.json` — sólo tooling de desarrollo (script de test). Sin dependencias de runtime.
- **Create** `lib/scoring.js` — lógica pura: `scorePrediction`, `statsDelta`, `diffStats`, `isLocked`. Patrón dual (CommonJS + `window`).
- **Create** `lib/scoring.test.js` — tests con `node:test`.
- **Create** `app.jsx` — el bloque final hoy inline en `index.html` (mapa `SCREENS`, `NAV_ITEMS`, `App`, `DesktopAdmin`, etc.).
- **Modify** `app-store.js` — delega el puntaje a `window.ProdeScoring` en vez de la copia local.
- **Modify** `data.js` — agrega `kickoffAt` (ISO con offset −06:00, hora de Costa Rica) a cada partido.
- **Modify** `index.html` — agrega `<script src="lib/scoring.js">` y reemplaza los bloques babel inline por `<script src=...>`.
- **Delete** `Prode Refugio.html` — clon byte-a-byte de `index.html`.

---

## Task 1: Tooling de desarrollo (package.json)

**Files:**
- Create: `package.json`

- [ ] **Step 1: Confirmar Node ≥ 18 (trae `node --test`)**

Run: `node --version`
Expected: `v18.x` o superior. (Si es menor, instalar Node 18+ antes de seguir.)

- [ ] **Step 2: Crear `package.json`**

```json
{
  "name": "prode-refugio",
  "version": "0.1.0",
  "private": true,
  "description": "Prode Refugio - Mundial 2026",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 3: Verificar que el runner corre (todavía sin tests)**

Run: `npm test`
Expected: termina sin error de configuración (imprime `tests 0` / `# tests 0` y sale 0; aún no hay archivos de test).

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "Add dev tooling: npm test via node --test"
```

---

## Task 2: Lógica pura de puntaje y lock (TDD)

**Files:**
- Create: `lib/scoring.js`
- Test: `lib/scoring.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

Create `lib/scoring.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert");
const { scorePrediction, statsDelta, diffStats, isLocked } = require("./scoring.js");

const finished = (a, b) => ({ status: "finalizado", scoreA: a, scoreB: b });

test("resultado exacto da 5 puntos", () => {
  assert.deepStrictEqual(scorePrediction(finished(2, 1), { a: 2, b: 1 }), { points: 5, kind: "exacto" });
});

test("ganador + diferencia exacta da 4", () => {
  // real 3-1 (gana A por 2), predijo 2-0 (gana A por 2)
  assert.deepStrictEqual(scorePrediction(finished(3, 1), { a: 2, b: 0 }), { points: 4, kind: "diferencia" });
});

test("acierta ganador sin diferencia da 3", () => {
  // real 3-0 (gana A por 3), predijo 1-0 (gana A por 1)
  assert.deepStrictEqual(scorePrediction(finished(3, 0), { a: 1, b: 0 }), { points: 3, kind: "ganador" });
});

test("empate acertado sin marcador exacto da 3", () => {
  assert.deepStrictEqual(scorePrediction(finished(2, 2), { a: 1, b: 1 }), { points: 3, kind: "ganador" });
});

test("fallar el ganador da 0", () => {
  assert.deepStrictEqual(scorePrediction(finished(0, 2), { a: 1, b: 0 }), { points: 0, kind: "fallado" });
});

test("partido no finalizado no puntua", () => {
  assert.strictEqual(scorePrediction({ status: "abierto" }, { a: 1, b: 0 }), null);
});

test("prediccion ausente no puntua", () => {
  assert.strictEqual(scorePrediction(finished(1, 0), null), null);
});

test("statsDelta cuenta exacto como winner y played", () => {
  assert.deepStrictEqual(statsDelta({ points: 5, kind: "exacto" }), { points: 5, exact: 1, winner: 1, played: 1 });
});

test("statsDelta de ganador no suma exacto", () => {
  assert.deepStrictEqual(statsDelta({ points: 3, kind: "ganador" }), { points: 3, exact: 0, winner: 1, played: 1 });
});

test("statsDelta de fallado solo suma played", () => {
  assert.deepStrictEqual(statsDelta({ points: 0, kind: "fallado" }), { points: 0, exact: 0, winner: 0, played: 1 });
});

test("statsDelta de null es todo cero", () => {
  assert.deepStrictEqual(statsDelta(null), { points: 0, exact: 0, winner: 0, played: 0 });
});

test("diffStats resta campo por campo (re-scoring idempotente)", () => {
  const prev = { points: 3, exact: 0, winner: 1, played: 1 };
  const next = { points: 5, exact: 1, winner: 1, played: 1 };
  assert.deepStrictEqual(diffStats(next, prev), { points: 2, exact: 1, winner: 0, played: 0 });
});

test("isLocked: abierto con kickoff futuro NO esta bloqueado", () => {
  const now = Date.parse("2026-06-11T17:00:00-06:00");
  assert.strictEqual(isLocked({ status: "abierto", kickoffAt: "2026-06-11T18:00:00-06:00" }, now), false);
});

test("isLocked: abierto pasado el kickoff esta bloqueado", () => {
  const now = Date.parse("2026-06-11T18:00:01-06:00");
  assert.strictEqual(isLocked({ status: "abierto", kickoffAt: "2026-06-11T18:00:00-06:00" }, now), true);
});

test("isLocked: estado vivo/finalizado siempre bloqueado", () => {
  const now = Date.parse("2026-06-11T10:00:00-06:00");
  assert.strictEqual(isLocked({ status: "vivo", kickoffAt: "2026-06-11T18:00:00-06:00" }, now), true);
  assert.strictEqual(isLocked({ status: "finalizado", kickoffAt: "2026-06-11T18:00:00-06:00" }, now), true);
});

test("isLocked: abierto sin kickoffAt NO se bloquea por tiempo", () => {
  assert.strictEqual(isLocked({ status: "abierto" }, Date.now()), false);
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `node --test lib/scoring.test.js`
Expected: FAIL — `Cannot find module './scoring.js'`.

- [ ] **Step 3: Escribir la implementación mínima**

Create `lib/scoring.js`:

```js
/* ============================================================
   PRODE REFUGIO — Lógica pura de puntaje y cierre por horario.
   Sin DOM ni Firebase. Cargable en el navegador (window.ProdeScoring)
   y en Node (require) para tests.
   ============================================================ */
(function (global) {
  // Resultado relativo: gana A, gana B, o empate.
  function outcome(a, b) {
    if (a > b) return "a";
    if (a < b) return "b";
    return "draw";
  }

  // Puntos de una predicción contra un partido finalizado.
  // 5 exacto · 4 ganador+diferencia · 3 ganador · 0 fallado.
  function scorePrediction(match, prediction) {
    if (!match || !prediction || match.status !== "finalizado") return null;
    const pa = Number(prediction.a), pb = Number(prediction.b);
    const ra = Number(match.scoreA), rb = Number(match.scoreB);
    if (!Number.isFinite(pa) || !Number.isFinite(pb)) return null;
    if (!Number.isFinite(ra) || !Number.isFinite(rb)) return null;
    if (pa === ra && pb === rb) return { points: 5, kind: "exacto" };
    if (outcome(pa, pb) === outcome(ra, rb)) {
      const diffBonus = Math.abs(pa - pb) === Math.abs(ra - rb) ? 1 : 0;
      return { points: 3 + diffBonus, kind: diffBonus ? "diferencia" : "ganador" };
    }
    return { points: 0, kind: "fallado" };
  }

  // Contribución de una predicción puntuada a los agregados del jugador.
  function statsDelta(scored) {
    if (!scored) return { points: 0, exact: 0, winner: 0, played: 0 };
    const isWinner = scored.kind === "exacto" || scored.kind === "diferencia" || scored.kind === "ganador";
    return {
      points: scored.points,
      exact: scored.kind === "exacto" ? 1 : 0,
      winner: isWinner ? 1 : 0,
      played: 1,
    };
  }

  // Diferencia campo por campo (next - prev). Permite re-puntuar un partido
  // corregido sumando sólo el delta al agregado (idempotente).
  function diffStats(next, prev) {
    return {
      points: next.points - prev.points,
      exact: next.exact - prev.exact,
      winner: next.winner - prev.winner,
      played: next.played - prev.played,
    };
  }

  // ¿La predicción de este partido está cerrada para edición?
  // Cerrada si ya no está "abierto", o si ya pasó el kickoff.
  function isLocked(match, nowMs) {
    if (!match) return true;
    if (match.status && match.status !== "abierto") return true;
    if (match.kickoffAt) {
      const k = Date.parse(match.kickoffAt);
      if (Number.isFinite(k) && (nowMs ?? Date.now()) >= k) return true;
    }
    return false;
  }

  const api = { outcome, scorePrediction, statsDelta, diffStats, isLocked };
  global.ProdeScoring = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `node --test lib/scoring.test.js`
Expected: PASS — todos los tests en verde (`pass 17`, `fail 0`).

- [ ] **Step 5: Commit**

```bash
git add lib/scoring.js lib/scoring.test.js
git commit -m "Add pure scoring + kickoff-lock lib with tests"
```

---

## Task 3: Usar la lib de puntaje desde el navegador y app-store

**Files:**
- Modify: `index.html` (sumar el `<script>` de la lib)
- Modify: `app-store.js` (delegar `scorePrediction` a `window.ProdeScoring`)

- [ ] **Step 1: Cargar `lib/scoring.js` antes de `app-store.js`**

En `index.html`, la sección de scripts (hoy líneas 243-246) pasa de:

```html
<script src="data.js"></script>
<script src="firebase-config.js"></script>
<script src="firebase-service.js"></script>
<script src="app-store.js"></script>
```

a:

```html
<script src="data.js"></script>
<script src="firebase-config.js"></script>
<script src="lib/scoring.js"></script>
<script src="firebase-service.js"></script>
<script src="app-store.js"></script>
```

- [ ] **Step 2: Delegar el puntaje en `app-store.js`**

En `app-store.js`, reemplazar las funciones locales `outcome` y `scorePrediction` (hoy líneas 291-310) por una delegación a la lib. Borrar ambas funciones locales y dejar en su lugar:

```js
  // El puntaje vive en lib/scoring.js (testeado). Acá sólo se delega.
  function scorePrediction(match, prediction) {
    return window.ProdeScoring.scorePrediction(match, prediction);
  }
```

(El resto de `app-store.js` —`calculateStats`, `getHistory`, el `window.ProdeStore = {... scorePrediction ...}`— sigue igual, porque sigue llamando a `scorePrediction` con la misma firma.)

- [ ] **Step 3: Verificación manual del puntaje en la app**

Run: `npx serve .` (en otra terminal) y abrir la URL que imprime (p. ej. `http://localhost:3000/index.html`).
Verificar en la pantalla **Predicciones (Prode)**, partidos ya finalizados (demo):
- `m00a` Argentina 2-1, tu predicción 2-1 → muestra **+5 EXACTO**.
- `m00b` Inglaterra 1-1, tu predicción 2-0 → muestra **0 PUNTOS**.

Expected: los puntos se muestran igual que antes (sin regresiones) y no hay errores en la consola del navegador.

- [ ] **Step 4: Commit**

```bash
git add index.html app-store.js
git commit -m "Delegate scoring to shared ProdeScoring lib"
```

---

## Task 4: Agregar `kickoffAt` a los partidos (data.js)

**Files:**
- Modify: `data.js` (array `window.MATCHES`)

- [ ] **Step 1: Reemplazar el array `window.MATCHES`**

En `data.js`, reemplazar todo el bloque `window.MATCHES = [ ... ];` (hoy líneas 37-75) por esta versión con `kickoffAt` (ISO con offset −06:00 = hora de Costa Rica / Tamarindo):

```js
window.MATCHES = [
  // Hoy: jueves 11 jun 2026
  { id:"m01", phase:"GRUPO A · J1", date:"Jue 11 Jun", time:"18:00", venue:"Estadio Azteca, CDMX",
    kickoffAt:"2026-06-11T18:00:00-06:00", a:"MEX", b:"KSA", status:"vivo", scoreA:1, scoreB:0, minute:"34'", featured:true },
  { id:"m02", phase:"GRUPO B · J1", date:"Vie 12 Jun", time:"12:00", venue:"BC Place, Vancouver",
    kickoffAt:"2026-06-12T12:00:00-06:00", a:"CAN", b:"AUS", status:"abierto" },
  { id:"m03", phase:"GRUPO B · J1", date:"Vie 12 Jun", time:"15:00", venue:"SoFi, Los Ángeles",
    kickoffAt:"2026-06-12T15:00:00-06:00", a:"ESP", b:"JAM", status:"abierto" },
  { id:"m04", phase:"GRUPO C · J1", date:"Vie 12 Jun", time:"18:00", venue:"MetLife, NJ",
    kickoffAt:"2026-06-12T18:00:00-06:00", a:"ARG", b:"CRO", status:"abierto", featured:true },
  { id:"m05", phase:"GRUPO C · J1", date:"Vie 12 Jun", time:"21:00", venue:"Lumen, Seattle",
    kickoffAt:"2026-06-12T21:00:00-06:00", a:"NGA", b:"USA", status:"abierto" },
  { id:"m06", phase:"GRUPO D · J1", date:"Sáb 13 Jun", time:"12:00", venue:"Hard Rock, Miami",
    kickoffAt:"2026-06-13T12:00:00-06:00", a:"BRA", b:"MAR", status:"abierto" },
  { id:"m07", phase:"GRUPO D · J1", date:"Sáb 13 Jun", time:"15:00", venue:"AT&T, Dallas",
    kickoffAt:"2026-06-13T15:00:00-06:00", a:"POR", b:"KOR", status:"abierto" },
  { id:"m08", phase:"GRUPO E · J1", date:"Sáb 13 Jun", time:"18:00", venue:"Mercedes-Benz, Atlanta",
    kickoffAt:"2026-06-13T18:00:00-06:00", a:"FRA", b:"SEN", status:"abierto", featured:true },
  { id:"m09", phase:"GRUPO E · J1", date:"Sáb 13 Jun", time:"21:00", venue:"Arrowhead, KC",
    kickoffAt:"2026-06-13T21:00:00-06:00", a:"GER", b:"JPN", status:"abierto" },
  { id:"m10", phase:"GRUPO F · J1", date:"Dom 14 Jun", time:"12:00", venue:"Estadio Akron, GDL",
    kickoffAt:"2026-06-14T12:00:00-06:00", a:"URU", b:"EGY", status:"abierto" },
  { id:"m11", phase:"GRUPO F · J1", date:"Dom 14 Jun", time:"15:00", venue:"NRG, Houston",
    kickoffAt:"2026-06-14T15:00:00-06:00", a:"ENG", b:"IRN", status:"abierto" },
  { id:"m12", phase:"GRUPO G · J1", date:"Dom 14 Jun", time:"18:00", venue:"Gillette, Boston",
    kickoffAt:"2026-06-14T18:00:00-06:00", a:"COL", b:"GHA", status:"abierto" },
  { id:"m13", phase:"GRUPO G · J1", date:"Dom 14 Jun", time:"21:00", venue:"Levi's, SF",
    kickoffAt:"2026-06-14T21:00:00-06:00", a:"NED", b:"PAR", status:"abierto" },
  { id:"m14", phase:"GRUPO H · J1", date:"Lun 15 Jun", time:"12:00", venue:"Lincoln Fin., Philly",
    kickoffAt:"2026-06-15T12:00:00-06:00", a:"ECU", b:"TUN", status:"abierto" },
  { id:"m15", phase:"GRUPO H · J1", date:"Lun 15 Jun", time:"15:00", venue:"Estadio BBVA, MTY",
    kickoffAt:"2026-06-15T15:00:00-06:00", a:"ITA", b:"CRC", status:"abierto", featured:true },

  // Ya jugados (para el historial)
  { id:"m00a", phase:"AMISTOSO", date:"Sáb 7 Jun", time:"19:00", venue:"Estadio Monumental",
    kickoffAt:"2026-06-07T19:00:00-06:00", a:"ARG", b:"COL", status:"finalizado", scoreA:2, scoreB:1 },
  { id:"m00b", phase:"AMISTOSO", date:"Dom 8 Jun", time:"16:00", venue:"Wembley",
    kickoffAt:"2026-06-08T16:00:00-06:00", a:"ENG", b:"BEL", status:"finalizado", scoreA:1, scoreB:1 },
];
```

- [ ] **Step 2: Verificación manual (no rompe nada)**

Run: recargar la app servida con `npx serve .`.
Expected: la pantalla de Predicciones sigue mostrando los mismos partidos/fechas; sin errores en consola. (El `kickoffAt` todavía no se usa en la UI — eso es del Plan 2; acá sólo se agrega el dato.)

- [ ] **Step 3: Commit**

```bash
git add data.js
git commit -m "Add kickoffAt timestamps to demo matches"
```

---

## Task 5: Deduplicar `index.html` (cargar archivos externos)

> **Riesgo principal del plan.** Hoy las pantallas viven inline dentro de `index.html`; los archivos `screens/*.jsx` son copias. Vamos a cargar los externos y borrar las copias inline. Babel standalone transpila scripts `src` por el mismo camino que los inline, así que el scope global compartido (p. ej. `const { useState } = React;` de `components.jsx`) debe seguir visible para las pantallas. La verificación manual del Step 5 es obligatoria.

**Files:**
- Create: `app.jsx` (bloque final hoy inline)
- Modify: `index.html` (reemplazar bloques inline por `src`)
- Delete: `Prode Refugio.html`

- [ ] **Step 1: Confirmar que cada archivo externo coincide con su copia inline**

Para cada par (bloque inline en `index.html` ↔ archivo externo), comparar el cuerpo. Bloques y archivos:
`components.jsx`, `tweaks-panel.jsx`, `screens/Landing.jsx`, `screens/Register.jsx`, `screens/Matches.jsx`, `screens/Ranking.jsx`, `screens/Specials.jsx`, `screens/Profile.jsx`, `screens/Groups.jsx`, `screens/Admin.jsx`.

Si alguno difiere, **gana la versión inline** (es la que corre hoy): copiar el cuerpo inline al archivo externo correspondiente antes de seguir.

Expected: los 10 archivos externos reflejan exactamente el código inline actual.

- [ ] **Step 2: Extraer el bloque final a `app.jsx`**

El último bloque babel de `index.html` (hoy `<script type="text/babel" data-presets="react">` en la línea ~3170 hasta `ReactDOM.createRoot(...).render(<App/>);` en la ~3526) contiene: `SCREENS`, `TWEAK_DEFAULTS`, `StatusBar`, `NAV_ITEMS`, `useIsDesktop`, `AppNav`, `MobileBottomNav`, `App`, `DesktopAdmin`, `desktopScoreInput`, `DKPI` y la llamada a `ReactDOM.createRoot`.

Crear `app.jsx` con **exactamente ese cuerpo JS** (desde el comentario `/* useState/useEffect/useRef ... */` hasta la línea `ReactDOM.createRoot(document.getElementById("root")).render(<App/>);`, sin las etiquetas `<script>`).

- [ ] **Step 3: Reemplazar TODOS los bloques babel inline por etiquetas `src`**

En `index.html`, reemplazar el span completo de bloques babel (desde `<script type="text/babel" data-source="components.jsx">` hasta la `</script>` del bloque final extraído en el Step 2) por exactamente estas etiquetas, en este orden:

```html
<!-- componentes + panel de tweaks -->
<script type="text/babel" src="components.jsx"></script>
<script type="text/babel" src="tweaks-panel.jsx"></script>

<!-- pantallas -->
<script type="text/babel" src="screens/Landing.jsx"></script>
<script type="text/babel" src="screens/Register.jsx"></script>
<script type="text/babel" src="screens/Matches.jsx"></script>
<script type="text/babel" src="screens/Ranking.jsx"></script>
<script type="text/babel" src="screens/Specials.jsx"></script>
<script type="text/babel" src="screens/Profile.jsx"></script>
<script type="text/babel" src="screens/Groups.jsx"></script>
<script type="text/babel" src="screens/Admin.jsx"></script>

<!-- ensamblado de la app -->
<script type="text/babel" data-presets="react" src="app.jsx"></script>
```

(Se conserva la misma ausencia/presencia de `data-presets` que hoy: las pantallas sin `data-presets`, `app.jsx` con `data-presets="react"`, igual que el bloque original.)

- [ ] **Step 4: Borrar el clon**

```bash
git rm "Prode Refugio.html"
```

- [ ] **Step 5: Verificación manual completa (OBLIGATORIA)**

Run: `npx serve .` y abrir `http://localhost:3000/index.html`.
Verificar, con la consola del navegador abierta (sin errores):
- La app renderiza igual que antes (logo, sidebar en desktop, nav inferior en mobile).
- Se navega a **todas** las pantallas: Home, Prode, Ranking, Grupos, Yo, Admin.
- Los íconos (lucide) aparecen.
- En Prode: los steppers de predicción funcionan; los partidos finalizados muestran puntos.
- En Admin (desktop, ventana > 860px): se puede editar un marcador y guardar.

> **Contingencia:** si la consola muestra `useState is not defined` (u otro hook), significa que el scope global compartido no se propagó entre scripts `src`. Solución: al final de `components.jsx`, exponer los hooks en `window` (`Object.assign(window, { useState, useEffect, useRef })`) y, en cada pantalla que los use, leerlos con `const { useState, useEffect, useRef } = React;` al inicio del archivo. Documentar el cambio en el commit.

- [ ] **Step 6: Correr la suite de tests (no debe romperse)**

Run: `npm test`
Expected: PASS — los tests de `lib/scoring.test.js` siguen en verde.

- [ ] **Step 7: Commit**

```bash
git add index.html app.jsx
git commit -m "Load external JSX files instead of inline copies; drop HTML clone"
```

---

## Self-Review (cobertura del spec cubierta por este plan)

Este plan cubre **sólo la base** del spec (no el multijugador, que va en planes siguientes):
- ✅ "Camino A: sin build, eliminar duplicación cargando externos" → Task 5.
- ✅ "Eliminar `Prode Refugio.html`" → Task 5, Step 4.
- ✅ "Lógica de puntaje aislada en funciones puras y testeada con TDD" → Task 2 + Task 3.
- ✅ "Agregar `kickoffAt`" (preparación del cierre por horario) → Task 4 + `isLocked` en Task 2.
- ⏭️ Google auth, jugadores reales, predicciones/ranking en Firestore, reglas, deploy → **Plan 2**.
- ⏭️ Grupos privados → **Plan 3**.
- ⏭️ Especiales puntuados + importar fixture → **Plan 4**.

Verificación de consistencia: las firmas usadas en los tests (`scorePrediction`, `statsDelta`, `diffStats`, `isLocked`) coinciden con las exportadas en `lib/scoring.js` y con la delegación en `app-store.js`. Sin placeholders.
