# Ganador Semanal Automático — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La app calcula automáticamente quién hizo más puntos cada semana del torneo y lo muestra en el Ranking (líder de la semana + historial de ganadores), para el premio semanal rotativo burger/desayuno.

**Architecture:** Lógica pura nueva en `lib/weekly.js` (dual navegador/Node, testeada con `node --test`, como `lib/scoring.js` y `lib/ranking.js`). `finalizeMatch` en `firebase-service.js` agrega incrementos `weekly.s{N}.points/exact` al mismo batch idempotente del fan-out, donde N = semana del torneo derivada del `kickoffAt` del partido. El Ranking lee los buckets del snapshot de `players` que ya tiene — sin reglas nuevas de Firestore, sin lecturas extra.

**Tech Stack:** React (Babel standalone, sin build), Firebase Firestore compat, `node --test` para lógica pura.

**Spec:** `docs/superpowers/specs/2026-06-10-ganador-semanal-design.md`

**Contexto clave para quien implementa:**
- App estática sin bundler: cada archivo se carga con `<script>` en `index.html` y expone globals en `window`. Los archivos de `lib/` usan el patrón IIFE dual navegador/Node (mirar `lib/ranking.js` como referencia).
- El torneo arranca el **jue 11 jun 2026** y termina el **dom 19 jul 2026**, hora Costa Rica (UTC−06:00). Semana 1 = 11–17 jun, Semana 2 = 18–24 jun, ... Semana 6 = 16–22 jul (la última).
- `window.MATCHES` (en `data.js`) tiene los 72 partidos con `kickoffAt` ISO con offset `-06:00`.
- Los tests corren con `node --test` desde la raíz del repo.
- Comentarios del código en español, como el resto del repo.

---

### Task 1: `lib/weekly.js` — semanas del torneo (weekIdForDate, currentWeekId, weekLabel)

**Files:**
- Create: `lib/weekly.js`
- Create: `lib/weekly.test.js`

- [ ] **Step 1: Write the failing tests**

Crear `lib/weekly.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert");
const { weekIdForDate, currentWeekId, weekLabel } = require("./weekly.js");

/* ---- weekIdForDate ---- */

test("weekIdForDate: primer día del torneo → s1", () => {
  assert.strictEqual(weekIdForDate("2026-06-11T15:00:00-06:00"), "s1");
});

test("weekIdForDate: último instante de la semana 1 (mié 17 jun 23:59 CR) → s1", () => {
  assert.strictEqual(weekIdForDate("2026-06-17T23:59:59-06:00"), "s1");
});

test("weekIdForDate: jue 18 jun 00:00 CR → s2", () => {
  assert.strictEqual(weekIdForDate("2026-06-18T00:00:00-06:00"), "s2");
});

test("weekIdForDate: fecha anterior al torneo → clamp a s1", () => {
  assert.strictEqual(weekIdForDate("2026-06-01T12:00:00-06:00"), "s1");
});

test("weekIdForDate: la final (19 jul) cae en s6", () => {
  assert.strictEqual(weekIdForDate("2026-07-19T13:00:00-06:00"), "s6");
});

/* ---- currentWeekId ---- */

test("currentWeekId: antes del torneo → s1", () => {
  assert.strictEqual(currentWeekId(Date.parse("2026-06-01T10:00:00-06:00")), "s1");
});

test("currentWeekId: mitad del torneo → semana correcta", () => {
  assert.strictEqual(currentWeekId(Date.parse("2026-06-20T10:00:00-06:00")), "s2");
});

test("currentWeekId: después del torneo → clamp a s6", () => {
  assert.strictEqual(currentWeekId(Date.parse("2026-08-15T10:00:00-06:00")), "s6");
});

/* ---- weekLabel ---- */

test("weekLabel: semana dentro del mismo mes", () => {
  assert.strictEqual(weekLabel("s1"), "Semana 1 · 11–17 jun");
});

test("weekLabel: semana que cruza de mes", () => {
  assert.strictEqual(weekLabel("s3"), "Semana 3 · 25 jun–1 jul");
});

test("weekLabel: última semana", () => {
  assert.strictEqual(weekLabel("s6"), "Semana 6 · 16–22 jul");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test lib/weekly.test.js`
Expected: FAIL — `Cannot find module './weekly.js'`

- [ ] **Step 3: Write minimal implementation**

Crear `lib/weekly.js`:

```js
/* ============================================================
   PRODE REFUGIO — Semanas del torneo (lógica pura).
   Semana 1 = jue 11 jun → mié 17 jun 2026 (hora Costa Rica, −06:00);
   cada semana siguiente arranca 7 días después. Dual navegador/Node.
   ============================================================ */
(function (global) {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const CR_OFFSET_MS = 6 * 60 * 60 * 1000; // Costa Rica = UTC−6, sin DST
  const TOURNAMENT_START_MS = Date.parse("2026-06-11T00:00:00-06:00");
  const MAX_WEEK = 6; // la final (19 jul) cae en la semana 6 (16–22 jul)
  const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function weekNumberForMs(ms) {
    const diff = ms - TOURNAMENT_START_MS;
    return Math.max(1, Math.floor(diff / WEEK_MS) + 1);
  }

  // isoDate: kickoff del partido (ISO con offset). Devuelve "s1", "s2", ...
  // Fechas anteriores al torneo → "s1" (clamp; no pasa con el fixture real).
  function weekIdForDate(isoDate) {
    return "s" + weekNumberForMs(Date.parse(isoDate));
  }

  // Semana en curso para un timestamp (default: ahora). Clamp a [s1, s6].
  function currentWeekId(nowMs) {
    const ms = typeof nowMs === "number" ? nowMs : Date.now();
    return "s" + clamp(weekNumberForMs(ms), 1, MAX_WEEK);
  }

  // Día y mes calendario de Costa Rica para un instante.
  function crParts(ms) {
    const d = new Date(ms - CR_OFFSET_MS); // el reloj CR = reloj UTC − 6h
    return { day: d.getUTCDate(), month: d.getUTCMonth() };
  }

  // "Semana 1 · 11–17 jun" (mismo mes) / "Semana 3 · 25 jun–1 jul" (cruza mes).
  function weekLabel(weekId) {
    const n = Number(String(weekId).slice(1)) || 1;
    const startMs = TOURNAMENT_START_MS + (n - 1) * WEEK_MS + 12 * 60 * 60 * 1000; // mediodía CR, evita bordes
    const endMs = startMs + 6 * DAY_MS;
    const a = crParts(startMs);
    const b = crParts(endMs);
    const range = a.month === b.month
      ? `${a.day}–${b.day} ${MONTHS[a.month]}`
      : `${a.day} ${MONTHS[a.month]}–${b.day} ${MONTHS[b.month]}`;
    return `Semana ${n} · ${range}`;
  }

  const api = { weekIdForDate, currentWeekId, weekLabel, MAX_WEEK };
  global.ProdeWeekly = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test lib/weekly.test.js`
Expected: PASS (11 tests)

- [ ] **Step 5: Run the full suite (no romper nada)**

Run: `node --test`
Expected: todos los tests pasan (32 previos + 11 nuevos = 43)

- [ ] **Step 6: Commit**

```bash
git add lib/weekly.js lib/weekly.test.js
git commit -m "lib/weekly: semanas del torneo (weekIdForDate, currentWeekId, weekLabel)"
```

---

### Task 2: `lib/weekly.js` — líderes y historial (weeklyLeaders, weeklyHistory)

**Files:**
- Modify: `lib/weekly.js` (agregar funciones y exportarlas)
- Modify: `lib/weekly.test.js` (agregar tests)

- [ ] **Step 1: Write the failing tests**

Agregar al final de `lib/weekly.test.js` (y sumar `weeklyLeaders, weeklyHistory` al require de la línea 3):

```js
const { weeklyLeaders, weeklyHistory } = require("./weekly.js");

/* ---- weeklyLeaders ---- */

const playersW = [
  { id: "u1", name: "Joaco", weekly: { s1: { points: 12, exact: 2 }, s2: { points: 3, exact: 0 } } },
  { id: "u2", name: "Sofi",  weekly: { s1: { points: 12, exact: 3 } } },
  { id: "u3", name: "Pancho", weekly: { s1: { points: 5, exact: 1 } } },
  { id: "u4", name: "SinSemanal" }, // sin mapa weekly: cuenta 0, tolerado
];

test("weeklyLeaders: líder único por puntos", () => {
  const leaders = weeklyLeaders(playersW, "s2");
  assert.deepStrictEqual(leaders, [{ id: "u1", name: "Joaco", points: 3, exact: 0 }]);
});

test("weeklyLeaders: empate en puntos lo resuelve más exactos", () => {
  const leaders = weeklyLeaders(playersW, "s1");
  assert.deepStrictEqual(leaders, [{ id: "u2", name: "Sofi", points: 12, exact: 3 }]);
});

test("weeklyLeaders: empate total → comparten (todos los empatados)", () => {
  const tied = [
    { id: "a", name: "A", weekly: { s1: { points: 9, exact: 1 } } },
    { id: "b", name: "B", weekly: { s1: { points: 9, exact: 1 } } },
    { id: "c", name: "C", weekly: { s1: { points: 4, exact: 0 } } },
  ];
  const leaders = weeklyLeaders(tied, "s1");
  assert.deepStrictEqual(leaders.map(l => l.id).sort(), ["a", "b"]);
});

test("weeklyLeaders: nadie sumó esa semana → []", () => {
  assert.deepStrictEqual(weeklyLeaders(playersW, "s5"), []);
  assert.deepStrictEqual(weeklyLeaders([], "s1"), []);
  assert.deepStrictEqual(weeklyLeaders(null, "s1"), []);
});

/* ---- weeklyHistory ---- */

test("weeklyHistory: semanas cerradas con ganadores; las vacías se omiten", () => {
  // semana actual = s3 → cerradas: s1 y s2. s2 sólo la tiene u1.
  const hist = weeklyHistory(playersW, "s3");
  assert.strictEqual(hist.length, 2);
  assert.strictEqual(hist[0].weekId, "s1");
  assert.deepStrictEqual(hist[0].leaders.map(l => l.id), ["u2"]);
  assert.strictEqual(hist[0].label, "Semana 1 · 11–17 jun");
  assert.strictEqual(hist[1].weekId, "s2");
  assert.deepStrictEqual(hist[1].leaders.map(l => l.id), ["u1"]);
});

test("weeklyHistory: en la semana 1 no hay cerradas → []", () => {
  assert.deepStrictEqual(weeklyHistory(playersW, "s1"), []);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test lib/weekly.test.js`
Expected: FAIL — `weeklyLeaders is not a function`

- [ ] **Step 3: Write minimal implementation**

En `lib/weekly.js`, agregar antes de `const api = ...`:

```js
  function weekStats(p, weekId) {
    const w = (p && p.weekly && p.weekly[weekId]) || {};
    return { points: Number(w.points) || 0, exact: Number(w.exact) || 0 };
  }

  // Líderes de una semana: máx puntos, desempata más exactos; si persiste el
  // empate devuelve a todos los empatados. [] si nadie sumó puntos esa semana.
  function weeklyLeaders(players, weekId) {
    const scored = (players || [])
      .map((p) => ({ id: p.id, name: p.name || "Jugador", ...weekStats(p, weekId) }))
      .filter((p) => p.points > 0)
      .sort((a, b) => b.points - a.points || b.exact - a.exact);
    if (!scored.length) return [];
    const top = scored[0];
    return scored.filter((p) => p.points === top.points && p.exact === top.exact);
  }

  // Ganadores de las semanas ya cerradas (anteriores a currentWeek).
  // Semanas sin puntos se omiten.
  function weeklyHistory(players, currentWeek) {
    const cur = Number(String(currentWeek).slice(1)) || 1;
    const out = [];
    for (let n = 1; n < cur; n++) {
      const weekId = "s" + n;
      const leaders = weeklyLeaders(players, weekId);
      if (leaders.length) out.push({ weekId, week: n, label: weekLabel(weekId), leaders });
    }
    return out;
  }
```

Y actualizar el export:

```js
  const api = { weekIdForDate, currentWeekId, weekLabel, weeklyLeaders, weeklyHistory, MAX_WEEK };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test lib/weekly.test.js`
Expected: PASS (17 tests)

- [ ] **Step 5: Run the full suite**

Run: `node --test`
Expected: todos pasan (49 en total)

- [ ] **Step 6: Commit**

```bash
git add lib/weekly.js lib/weekly.test.js
git commit -m "lib/weekly: weeklyLeaders (desempate por exactos) + weeklyHistory"
```

---

### Task 3: fan-out semanal en `finalizeMatch` + script en `index.html`

**Files:**
- Modify: `firebase-service.js` (función `finalizeMatch`, ~línea 246)
- Modify: `index.html` (agregar `<script src="lib/weekly.js">` después de `lib/ranking.js`, ~línea 247)

No hay lógica pura nueva (el delta semanal es el mismo `perPlayer` ya testeado de `scoreMatchFanout`); la integración con Firestore se valida con QA manual al final.

- [ ] **Step 1: Cargar `lib/weekly.js` en `index.html`**

En `index.html`, después de la línea `<script src="lib/ranking.js"></script>`:

```html
<script src="lib/ranking.js"></script>
<script src="lib/weekly.js"></script>
```

- [ ] **Step 2: Sumar el bucket semanal al batch de `finalizeMatch`**

En `firebase-service.js`, dentro de `finalizeMatch`, el bloque actual (paso 4 del fan-out):

```js
    for (const [playerId, d] of Object.entries(perPlayer)) {
      batch.set(collection("players").doc(playerId), {
        points: inc(d.points), exact: inc(d.exact), winner: inc(d.winner), played: inc(d.played),
      }, { merge: true });
      if (++writes >= 450) await flush();
    }
```

pasa a ser:

```js
    // Semana del torneo del partido (por su kickoff, no por cuándo se carga el
    // resultado). Si el fixture no tiene el partido, no se acumula semanal.
    const matchInfo = (window.MATCHES || []).find((m) => m.id === matchId);
    const weekId = matchInfo?.kickoffAt && window.ProdeWeekly
      ? window.ProdeWeekly.weekIdForDate(matchInfo.kickoffAt)
      : null;
    for (const [playerId, d] of Object.entries(perPlayer)) {
      const patch = {
        points: inc(d.points), exact: inc(d.exact), winner: inc(d.winner), played: inc(d.played),
      };
      // Bucket semanal: mismo delta idempotente que el total. set+merge con mapa
      // anidado mergea recursivamente (no pisa otras semanas).
      if (weekId) patch.weekly = { [weekId]: { points: inc(d.points), exact: inc(d.exact) } };
      batch.set(collection("players").doc(playerId), patch, { merge: true });
      if (++writes >= 450) await flush();
    }
```

- [ ] **Step 3: Verificar sintaxis y suite**

Run: `node --check firebase-service.js && node --test`
Expected: sin errores de sintaxis; todos los tests pasan

(`node --check` funciona porque `firebase-service.js` es JS plano, no JSX.)

- [ ] **Step 4: Commit**

```bash
git add firebase-service.js index.html
git commit -m "finalizeMatch: acumula weekly.s{N} (puntos/exactos por semana del torneo)"
```

---

### Task 4: UI en Ranking — "Premio de la semana" + historial

**Files:**
- Modify: `screens/Ranking.jsx` (nueva sección entre la frase y la tarjeta "Sos vos"; nuevo componente local `WeeklyPrize` al final del archivo, antes de `window.Ranking = Ranking;`)

- [ ] **Step 1: Insertar la sección en el render de `Ranking`**

En `screens/Ranking.jsx`, justo después del bloque `{/* phrase */}` (que termina cerrando `)}`), y antes de `{/* you sticky */}`, insertar:

```jsx
      {/* premio de la semana */}
      {rows.length > 0 && (
        <WeeklyPrize players={players}/>
      )}
```

- [ ] **Step 2: Agregar el componente `WeeklyPrize`**

Al final de `screens/Ranking.jsx`, antes de `window.Ranking = Ranking;`:

```jsx
/* Líder de la semana en curso (premio rotativo) + historial de ganadores.
   Lee los buckets weekly.s{N} del mismo snapshot de players del ranking. */
function WeeklyPrize({ players }) {
  const W = window.ProdeWeekly;
  const prize = window.PRIZES?.weekly;
  if (!W || !prize) return null;
  const weekId = W.currentWeekId(Date.now());
  const leaders = W.weeklyLeaders(players, weekId);
  const history = W.weeklyHistory(players, weekId);
  const initials = (n) => window.ProdeRanking?.initials?.(n) || "JR";

  return (
    <div style={{padding:"14px 16px 0"}}>
      {/* tarjeta semana en curso */}
      <div style={{
        borderRadius:18, padding:"14px 16px",
        background:"linear-gradient(135deg, var(--orange-700), var(--char-800))",
        border:"1px solid var(--orange-500)",
      }}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8}}>
          <Eyebrow color="var(--neon-citrus)">{W.weekLabel(weekId)} · {prize.title}</Eyebrow>
          <Eyebrow color="var(--cream-100)" style={{fontSize:9}}>{prize.reward}</Eyebrow>
        </div>
        {leaders.length === 0 ? (
          <div style={{fontSize:12, color:"var(--char-200)", marginTop:8, lineHeight:1.4}}>
            Nadie sumó puntos esta semana todavía. El que más haga se lleva el premio.
          </div>
        ) : (
          <div style={{display:"flex", flexDirection:"column", gap:8, marginTop:10}}>
            {leaders.map((l) => (
              <div key={l.id} style={{display:"flex", alignItems:"center", gap:10}}>
                <Avatar initials={initials(l.name)} size={32} tone="citrus"/>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{
                    fontFamily:"var(--font-title)", fontSize:14, color:"var(--cream-100)",
                    textTransform:"uppercase", letterSpacing:"0.02em",
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                  }}>{l.name}</div>
                  <div style={{fontSize:9, color:"var(--char-300)", letterSpacing:"0.12em", marginTop:2}}>
                    {leaders.length > 1 ? "EMPATADOS · LO RESUELVE EL BAR" : "LÍDER DE LA SEMANA"}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"var(--font-title)", fontSize:20, color:"var(--neon-citrus)", lineHeight:1}}>{l.points}</div>
                  <div style={{fontSize:8, color:"var(--char-400)", letterSpacing:"0.18em", marginTop:2}}>PTS SEMANA</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* historial de ganadores semanales */}
      {history.length > 0 && (
        <div style={{
          marginTop:8, borderRadius:14, overflow:"hidden",
          background:"var(--char-800)", border:"1px solid var(--char-700)",
        }}>
          <div style={{padding:"10px 14px 6px"}}>
            <Eyebrow color="var(--neon-citrus)" style={{fontSize:9}}>Ganadores semanales</Eyebrow>
          </div>
          {history.map((h, i) => (
            <div key={h.weekId} style={{
              padding:"9px 14px", display:"flex", alignItems:"center", gap:10,
              borderTop: i === 0 ? "1px solid var(--char-700)" : "1px dashed var(--char-700)",
            }}>
              <div style={{fontSize:10, color:"var(--char-400)", letterSpacing:"0.08em", width:118, flexShrink:0}}>{h.label}</div>
              <div style={{
                flex:1, minWidth:0, fontSize:12, color:"var(--cream-100)", fontWeight:600,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
              }}>{h.leaders.map(l => l.name).join(" + ")}</div>
              <div style={{fontFamily:"var(--font-title)", fontSize:13, color:"var(--neon-citrus)"}}>{h.leaders[0].points} pts</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificar sintaxis JSX + suite**

Run: `npx --yes esbuild screens/Ranking.jsx --loader:.jsx=jsx --outfile=NUL --log-level=error && node --test`
Expected: esbuild sin errores; 49 tests pasan

- [ ] **Step 4: Smoke test de render en navegador**

Con el server estático (preview `prode-static` de `.claude/launch.json`, o `npx --yes serve -l 4173 .`), cargar la página y evaluar en la consola del navegador:

```js
(() => {
  const checks = {
    ProdeWeekly: typeof window.ProdeWeekly,           // "object"
    week: window.ProdeWeekly.currentWeekId(),         // "s1" si es 10–17 jun 2026
    label: window.ProdeWeekly.weekLabel("s1"),        // "Semana 1 · 11–17 jun"
    leaders: window.ProdeWeekly.weeklyLeaders(
      [{ id: "a", name: "Joaco", weekly: { s1: { points: 8, exact: 1 } } }, { id: "b", name: "Sofi" }],
      "s1"
    ),                                                 // [{id:"a",name:"Joaco",points:8,exact:1}]
    Ranking: typeof window.Ranking,                    // "function" (Ranking.jsx parseó OK)
  };
  return checks;
})()
```

Expected: los valores de los comentarios, y **cero errores de parseo Babel** en la consola al cargar la página (un error de sintaxis en `Ranking.jsx` aparecería como `SyntaxError` en consola y `window.Ranking` sería `undefined`).

- [ ] **Step 5: Commit**

```bash
git add screens/Ranking.jsx
git commit -m "Ranking: tarjeta Premio de la semana (líder actual) + historial de ganadores"
```

---

### QA manual (lo hace el usuario cuando haya datos reales)

1. Admin confirma un resultado de la semana 1 → en Firestore, `players/{uid}` de los acertantes muestra `weekly.s1.points`.
2. El Ranking muestra la tarjeta "Semana 1 · 11–17 jun" con el líder y sus puntos semanales.
3. Re-confirmar el mismo resultado NO duplica ni el total ni el semanal.
4. El jueves siguiente, la Semana 1 pasa al historial y la tarjeta muestra la Semana 2.
