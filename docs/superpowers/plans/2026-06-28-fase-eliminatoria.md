# Fase eliminatoria del Mundial 2026 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar los 32 partidos de la fase eliminatoria (Ronda de 32 → Final) a `window.MATCHES` para predecirlos, con cierre por horario en hora de Costa Rica; los 32avos con equipos reales y de octavos a la final con equipos "a definir".

**Architecture:** Datos nuevos en `data.js` (formato existente, horarios en `-06:00`). Helper puro `teamsKnown(match)` en `lib/scoring.js` (testeado). `components.jsx → MatchRow` aprende a mostrar equipos "a definir" (círculo neutro + etiqueta de origen) y a deshabilitar la predicción hasta que se conozcan los equipos. El motor de puntaje y el cierre por `kickoffAt` ya existen y no cambian.

**Tech Stack:** React (Babel standalone, sin build), `node --test`, Firebase compat (sin cambios).

## Global Constraints

- App estática sin bundler: `lib/*.js` IIFE dual navegador/Node, testeados con `node --test` desde la raíz. **Suite actual: 87 tests verdes.**
- Comentarios en español; acentos y guiones largos (`–`) intencionales → guardar UTF-8 con Write/Edit.
- Horarios siempre en hora de Costa Rica (UTC−06:00).
- Validar JSX: `npx --yes esbuild <archivo>.jsx --loader:.jsx=jsx --outfile=NUL --log-level=error` y limpiar `rm -rf NUL NUL_DIR`.
- `data.js` es browser-only (usa `window`); no se puede `require` en Node. Para validarlo: `node --check data.js` (sintaxis) y un `node -e` con `global.window={}` + `eval` (ver Task 2).

---

### Task 1: `lib/scoring.js` — `teamsKnown(match)` (TDD)

**Files:**
- Modify: `lib/scoring.js`
- Modify: `lib/scoring.test.js`

**Interfaces:**
- Produces: `teamsKnown(match) -> boolean` (true si `match.a` y `match.b` son códigos no vacíos). Lo consume `MatchRow` en Task 3.

- [ ] **Step 1: Write the failing test** — al final de `lib/scoring.test.js`, agregar:

```js
const { teamsKnown } = require("./scoring.js");

test("teamsKnown: true con dos equipos; false si alguno es a definir", () => {
  assert.strictEqual(teamsKnown({ a: "ARG", b: "BRA" }), true);
  assert.strictEqual(teamsKnown({ a: null, b: "BRA" }), false);
  assert.strictEqual(teamsKnown({ a: "ARG", b: null }), false);
  assert.strictEqual(teamsKnown({ a: "", b: "" }), false);
  assert.strictEqual(teamsKnown(null), false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test lib/scoring.test.js`
Expected: FAIL — `teamsKnown is not a function`.

- [ ] **Step 3: Write the implementation** — en `lib/scoring.js`, agregar la función después de `isLocked` (y antes de `scoreMatchFanout`):

```js
  // ¿El partido ya tiene definidos a sus dos equipos? En eliminación, los cruces
  // arrancan "a definir" (a/b null) hasta que avanza el cuadro. La UI lo usa para
  // habilitar o no la predicción.
  function teamsKnown(match) {
    return !!(match && match.a && match.b);
  }
```

Y agregar `teamsKnown` al objeto `api` exportado (la línea `const api = { scorePrediction, statsDelta, diffStats, isLocked, scoreMatchFanout };`):

```js
  const api = { scorePrediction, statsDelta, diffStats, isLocked, teamsKnown, scoreMatchFanout };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test lib/scoring.test.js` — Expected: PASS.

- [ ] **Step 5: Run full suite**

Run: `node --test` — Expected: 88 tests, 88 pass, 0 fail (87 previos + 1).

- [ ] **Step 6: Commit**

```bash
git add lib/scoring.js lib/scoring.test.js
git commit -m "lib/scoring: teamsKnown (partido con ambos equipos definidos)"
```

---

### Task 2: `data.js` — 32 partidos de la fase eliminatoria

**Files:**
- Modify: `data.js`

**Interfaces:**
- Produces: 32 entradas nuevas en `window.MATCHES` (ids `m73`–`m104`). Las consume `Matches.jsx`/`MatchRow` ya existentes. Campos nuevos: `round` (r32/r16/qf/sf/third/final), y para los "a definir" `a:null, b:null` + `aLabel`/`bLabel`.

- [ ] **Step 1: Insertar los 32 partidos** — en `data.js`, el array `window.MATCHES` termina con la entrada `m72` seguida de una línea con `];` (línea 189). Insertar el siguiente bloque **inmediatamente antes** de ese `];` (después de la entrada `m72`, que termina en `a:"JOR", b:"ARG", status:"abierto" },`):

```js

  // ---- Fase eliminatoria (28 jun–19 jul). Horarios en hora de Costa Rica (UTC−06:00).
  // Las eliminatorias dependen de los resultados de grupos: la Ronda de 32 ya tiene
  // equipos reales; de Octavos a la Final van "a definir" (a/b null + aLabel/bLabel)
  // y se completan a medida que avanza el cuadro.
  { id:"m73", phase:"RONDA DE 32", round:"r32", date:"Dom 28 Jun", time:"13:00", venue:"Inglewood",
    kickoffAt:"2026-06-28T13:00:00-06:00", a:"RSA", b:"CAN", status:"abierto" },
  { id:"m76", phase:"RONDA DE 32", round:"r32", date:"Lun 29 Jun", time:"11:00", venue:"Houston",
    kickoffAt:"2026-06-29T11:00:00-06:00", a:"BRA", b:"JPN", status:"abierto" },
  { id:"m74", phase:"RONDA DE 32", round:"r32", date:"Lun 29 Jun", time:"14:30", venue:"Foxborough",
    kickoffAt:"2026-06-29T14:30:00-06:00", a:"GER", b:"PAR", status:"abierto" },
  { id:"m75", phase:"RONDA DE 32", round:"r32", date:"Lun 29 Jun", time:"19:00", venue:"Estadio BBVA, Monterrey",
    kickoffAt:"2026-06-29T19:00:00-06:00", a:"NED", b:"MAR", status:"abierto" },
  { id:"m78", phase:"RONDA DE 32", round:"r32", date:"Mar 30 Jun", time:"11:00", venue:"Arlington",
    kickoffAt:"2026-06-30T11:00:00-06:00", a:"CIV", b:"NOR", status:"abierto" },
  { id:"m77", phase:"RONDA DE 32", round:"r32", date:"Mar 30 Jun", time:"15:00", venue:"East Rutherford",
    kickoffAt:"2026-06-30T15:00:00-06:00", a:"FRA", b:"SWE", status:"abierto" },
  { id:"m79", phase:"RONDA DE 32", round:"r32", date:"Mar 30 Jun", time:"19:00", venue:"Estadio Azteca, CDMX",
    kickoffAt:"2026-06-30T19:00:00-06:00", a:"MEX", b:"ECU", status:"abierto" },
  { id:"m80", phase:"RONDA DE 32", round:"r32", date:"Mié 01 Jul", time:"10:00", venue:"Atlanta",
    kickoffAt:"2026-07-01T10:00:00-06:00", a:"ENG", b:"COD", status:"abierto" },
  { id:"m82", phase:"RONDA DE 32", round:"r32", date:"Mié 01 Jul", time:"14:00", venue:"Seattle",
    kickoffAt:"2026-07-01T14:00:00-06:00", a:"BEL", b:"SEN", status:"abierto" },
  { id:"m81", phase:"RONDA DE 32", round:"r32", date:"Mié 01 Jul", time:"18:00", venue:"Santa Clara",
    kickoffAt:"2026-07-01T18:00:00-06:00", a:"USA", b:"BIH", status:"abierto" },
  { id:"m84", phase:"RONDA DE 32", round:"r32", date:"Jue 02 Jul", time:"13:00", venue:"Inglewood",
    kickoffAt:"2026-07-02T13:00:00-06:00", a:"ESP", b:"AUT", status:"abierto" },
  { id:"m83", phase:"RONDA DE 32", round:"r32", date:"Jue 02 Jul", time:"17:00", venue:"Toronto",
    kickoffAt:"2026-07-02T17:00:00-06:00", a:"POR", b:"CRO", status:"abierto" },
  { id:"m85", phase:"RONDA DE 32", round:"r32", date:"Jue 02 Jul", time:"21:00", venue:"Vancouver",
    kickoffAt:"2026-07-02T21:00:00-06:00", a:"SUI", b:"ALG", status:"abierto" },
  { id:"m88", phase:"RONDA DE 32", round:"r32", date:"Vie 03 Jul", time:"12:00", venue:"Arlington",
    kickoffAt:"2026-07-03T12:00:00-06:00", a:"AUS", b:"EGY", status:"abierto" },
  { id:"m86", phase:"RONDA DE 32", round:"r32", date:"Vie 03 Jul", time:"16:00", venue:"Miami",
    kickoffAt:"2026-07-03T16:00:00-06:00", a:"ARG", b:"CPV", status:"abierto" },
  { id:"m87", phase:"RONDA DE 32", round:"r32", date:"Vie 03 Jul", time:"19:30", venue:"Kansas City",
    kickoffAt:"2026-07-03T19:30:00-06:00", a:"COL", b:"GHA", status:"abierto" },
  { id:"m90", phase:"OCTAVOS DE FINAL", round:"r16", date:"Sáb 04 Jul", time:"11:00", venue:"Houston",
    kickoffAt:"2026-07-04T11:00:00-06:00", a:null, b:null, aLabel:"Ganador RSA–CAN", bLabel:"Ganador NED–MAR", status:"abierto" },
  { id:"m89", phase:"OCTAVOS DE FINAL", round:"r16", date:"Sáb 04 Jul", time:"15:00", venue:"Philadelphia",
    kickoffAt:"2026-07-04T15:00:00-06:00", a:null, b:null, aLabel:"Ganador GER–PAR", bLabel:"Ganador FRA–SWE", status:"abierto" },
  { id:"m91", phase:"OCTAVOS DE FINAL", round:"r16", date:"Dom 05 Jul", time:"14:00", venue:"East Rutherford",
    kickoffAt:"2026-07-05T14:00:00-06:00", a:null, b:null, aLabel:"Ganador BRA–JPN", bLabel:"Ganador CIV–NOR", status:"abierto" },
  { id:"m92", phase:"OCTAVOS DE FINAL", round:"r16", date:"Dom 05 Jul", time:"18:00", venue:"Estadio Azteca, CDMX",
    kickoffAt:"2026-07-05T18:00:00-06:00", a:null, b:null, aLabel:"Ganador MEX–ECU", bLabel:"Ganador ENG–COD", status:"abierto" },
  { id:"m93", phase:"OCTAVOS DE FINAL", round:"r16", date:"Lun 06 Jul", time:"13:00", venue:"Arlington",
    kickoffAt:"2026-07-06T13:00:00-06:00", a:null, b:null, aLabel:"Ganador POR–CRO", bLabel:"Ganador ESP–AUT", status:"abierto" },
  { id:"m94", phase:"OCTAVOS DE FINAL", round:"r16", date:"Lun 06 Jul", time:"18:00", venue:"Seattle",
    kickoffAt:"2026-07-06T18:00:00-06:00", a:null, b:null, aLabel:"Ganador USA–BIH", bLabel:"Ganador BEL–SEN", status:"abierto" },
  { id:"m95", phase:"OCTAVOS DE FINAL", round:"r16", date:"Mar 07 Jul", time:"10:00", venue:"Atlanta",
    kickoffAt:"2026-07-07T10:00:00-06:00", a:null, b:null, aLabel:"Ganador ARG–CPV", bLabel:"Ganador AUS–EGY", status:"abierto" },
  { id:"m96", phase:"OCTAVOS DE FINAL", round:"r16", date:"Mar 07 Jul", time:"14:00", venue:"Vancouver",
    kickoffAt:"2026-07-07T14:00:00-06:00", a:null, b:null, aLabel:"Ganador SUI–ALG", bLabel:"Ganador COL–GHA", status:"abierto" },
  { id:"m97", phase:"CUARTOS DE FINAL", round:"qf", date:"Jue 09 Jul", time:"14:00", venue:"Foxborough",
    kickoffAt:"2026-07-09T14:00:00-06:00", a:null, b:null, aLabel:"Ganador de octavos", bLabel:"Ganador de octavos", status:"abierto" },
  { id:"m98", phase:"CUARTOS DE FINAL", round:"qf", date:"Vie 10 Jul", time:"13:00", venue:"Inglewood",
    kickoffAt:"2026-07-10T13:00:00-06:00", a:null, b:null, aLabel:"Ganador de octavos", bLabel:"Ganador de octavos", status:"abierto" },
  { id:"m99", phase:"CUARTOS DE FINAL", round:"qf", date:"Sáb 11 Jul", time:"15:00", venue:"Miami",
    kickoffAt:"2026-07-11T15:00:00-06:00", a:null, b:null, aLabel:"Ganador de octavos", bLabel:"Ganador de octavos", status:"abierto" },
  { id:"m100", phase:"CUARTOS DE FINAL", round:"qf", date:"Sáb 11 Jul", time:"19:00", venue:"Kansas City",
    kickoffAt:"2026-07-11T19:00:00-06:00", a:null, b:null, aLabel:"Ganador de octavos", bLabel:"Ganador de octavos", status:"abierto" },
  { id:"m101", phase:"SEMIFINAL", round:"sf", date:"Mar 14 Jul", time:"13:00", venue:"Arlington",
    kickoffAt:"2026-07-14T13:00:00-06:00", a:null, b:null, aLabel:"Ganador de cuartos", bLabel:"Ganador de cuartos", status:"abierto" },
  { id:"m102", phase:"SEMIFINAL", round:"sf", date:"Mié 15 Jul", time:"13:00", venue:"Atlanta",
    kickoffAt:"2026-07-15T13:00:00-06:00", a:null, b:null, aLabel:"Ganador de cuartos", bLabel:"Ganador de cuartos", status:"abierto" },
  { id:"m103", phase:"3ER PUESTO", round:"third", date:"Sáb 18 Jul", time:"15:00", venue:"Miami",
    kickoffAt:"2026-07-18T15:00:00-06:00", a:null, b:null, aLabel:"Perdedor de semifinal", bLabel:"Perdedor de semifinal", status:"abierto" },
  { id:"m104", phase:"FINAL", round:"final", date:"Dom 19 Jul", time:"13:00", venue:"East Rutherford",
    kickoffAt:"2026-07-19T13:00:00-06:00", a:null, b:null, aLabel:"Ganador de semifinal", bLabel:"Ganador de semifinal", status:"abierto", featured:true },
```

- [ ] **Step 2: Verificar sintaxis**

Run: `node --check data.js`
Expected: sin salida (sintaxis OK).

- [ ] **Step 3: Verificar los datos cargados** (browser-only → se evalúa con `global.window`):

Run:
```bash
node -e "global.window={}; const fs=require('fs'); eval(fs.readFileSync('data.js','utf8')); const M=window.MATCHES; const ko=M.filter(m=>m.round); console.log('total',M.length,'ko',ko.length); const bad=ko.filter(m=>!Number.isFinite(Date.parse(m.kickoffAt))); console.log('badDates',bad.length); const r32=M.filter(m=>m.round==='r32'); const miss=r32.filter(m=>!window.TEAMS[m.a]||!window.TEAMS[m.b]); console.log('r32',r32.length,'missingTeam',miss.length); const tbd=M.filter(m=>m.round&&m.round!=='r32'); console.log('tbd',tbd.length,'withLabels',tbd.filter(m=>m.aLabel&&m.bLabel).length);"
```
Expected exacto:
```
total 104 ko 32
badDates 0
r32 16 missingTeam 0
tbd 16 withLabels 16
```

- [ ] **Step 4: Commit**

```bash
git add data.js
git commit -m "data: fase eliminatoria (32avos reales + octavos→final a definir), horarios CR"
```

---

### Task 3: `components.jsx → MatchRow` — equipos "a definir"

**Files:**
- Modify: `components.jsx`

**Interfaces:**
- Consumes: `window.ProdeScoring.teamsKnown(match)` (Task 1); los campos `aLabel`/`bLabel` de los partidos "a definir" (Task 2).

- [ ] **Step 1: Agregar el helper `TbdFlag`** — en `components.jsx`, justo ANTES de `function MatchRow({ match, prediction, onChange, locked }) {` (línea 260), agregar:

```jsx
/* Círculo neutro con "?" para un equipo todavía "a definir" (eliminación). */
function TbdFlag({ size = 32 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0,
      background:"var(--char-700)", border:"1px solid var(--char-600)",
      display:"flex", alignItems:"center", justifyContent:"center",
      color:"var(--char-400)", fontFamily:"var(--font-title)", fontSize:size*0.5,
    }}>?</div>
  );
}
```

- [ ] **Step 2: Calcular `tbd` dentro de `MatchRow`** — debajo de las líneas existentes `const live = ...; const done = ...; const open = ...;` agregar:

```jsx
  // "A definir": algún equipo del cruce todavía no está confirmado (eliminación).
  const tbd = !window.ProdeScoring.teamsKnown(m);
```

- [ ] **Step 3: Equipo A con soporte "a definir"** — reemplazar el bloque del equipo A (el `<div>` con `Flag code={m.a}` y `window.TEAMS[m.a]`):

```jsx
        {/* TEAM A */}
        <div style={{display:"flex", alignItems:"center", gap:10, justifyContent:"flex-start"}}>
          <Flag code={m.a} size={32}/>
          <div>
            <div style={{
              fontFamily:"var(--font-title)", fontSize:16, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em", lineHeight:1,
            }}>{window.TEAMS[m.a]}</div>
            <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.18em", marginTop:3, fontWeight:600}}>{m.a}</div>
          </div>
        </div>
```

por:

```jsx
        {/* TEAM A */}
        <div style={{display:"flex", alignItems:"center", gap:10, justifyContent:"flex-start"}}>
          {m.a ? <Flag code={m.a} size={32}/> : <TbdFlag size={32}/>}
          <div>
            <div style={{
              fontFamily:"var(--font-title)", fontSize: m.a ? 16 : 12, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em", lineHeight:1.05,
            }}>{m.a ? window.TEAMS[m.a] : (m.aLabel || "A definir")}</div>
            {m.a && <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.18em", marginTop:3, fontWeight:600}}>{m.a}</div>}
          </div>
        </div>
```

- [ ] **Step 4: Equipo B con soporte "a definir"** — reemplazar el bloque del equipo B (el `<div>` con `window.TEAMS[m.b]` y `Flag code={m.b}`):

```jsx
        {/* TEAM B */}
        <div style={{display:"flex", alignItems:"center", gap:10, justifyContent:"flex-end"}}>
          <div style={{textAlign:"right"}}>
            <div style={{
              fontFamily:"var(--font-title)", fontSize:16, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em", lineHeight:1,
            }}>{window.TEAMS[m.b]}</div>
            <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.18em", marginTop:3, fontWeight:600}}>{m.b}</div>
          </div>
          <Flag code={m.b} size={32}/>
        </div>
```

por:

```jsx
        {/* TEAM B */}
        <div style={{display:"flex", alignItems:"center", gap:10, justifyContent:"flex-end"}}>
          <div style={{textAlign:"right"}}>
            <div style={{
              fontFamily:"var(--font-title)", fontSize: m.b ? 16 : 12, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em", lineHeight:1.05,
            }}>{m.b ? window.TEAMS[m.b] : (m.bLabel || "A definir")}</div>
            {m.b && <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.18em", marginTop:3, fontWeight:600}}>{m.b}</div>}
          </div>
          {m.b ? <Flag code={m.b} size={32}/> : <TbdFlag size={32}/>}
        </div>
```

- [ ] **Step 5: Columna central — mostrar "–" cuando es "a definir"** — en el bloque del marcador, reemplazar:

```jsx
          ) : (
            <>
              <NumStepper value={prediction?.a} onChange={(v)=>onChange?.({a:v, b:prediction?.b ?? 0})} disabled={locked}/>
              <div style={{color:"var(--char-500)", fontSize:14}}>–</div>
              <NumStepper value={prediction?.b} onChange={(v)=>onChange?.({a:prediction?.a ?? 0, b:v})} disabled={locked}/>
            </>
          )}
```

por:

```jsx
          ) : tbd ? (
            <div style={{color:"var(--char-500)", fontSize:22, fontFamily:"var(--font-title)"}}>–</div>
          ) : (
            <>
              <NumStepper value={prediction?.a} onChange={(v)=>onChange?.({a:v, b:prediction?.b ?? 0})} disabled={locked}/>
              <div style={{color:"var(--char-500)", fontSize:14}}>–</div>
              <NumStepper value={prediction?.b} onChange={(v)=>onChange?.({a:prediction?.a ?? 0, b:v})} disabled={locked}/>
            </>
          )}
```

- [ ] **Step 6: Cartel de "se habilita cuando se conozcan los equipos"** — el cierre del bloque del cuerpo del partido (la grilla de equipos) es `</div>` seguido por el comentario `{/* For open matches, show your prediction (mini) */}`. Insertar, entre ese `</div>` y ese comentario:

```jsx
      {open && tbd && (
        <div style={{
          marginTop:10, padding:"7px 10px", borderRadius:14,
          background:"var(--char-900)", border:"1px dashed var(--char-600)",
          fontSize:11, color:"var(--char-300)", textAlign:"center", letterSpacing:"0.04em",
        }}>
          Se habilita cuando se conozcan los equipos
        </div>
      )}
```

- [ ] **Step 7: Validar JSX**

Run: `npx --yes esbuild components.jsx --loader:.jsx=jsx --outfile=NUL --log-level=error`
Expected: sin errores. Luego limpiar: `rm -rf NUL NUL_DIR`

- [ ] **Step 8: Commit**

```bash
git add components.jsx
git commit -m "MatchRow: equipos 'a definir' (círculo neutro + etiqueta, predicción deshabilitada)"
```

---

## Verificación final (revisión de toda la feature)

1. `node --test` → 88/88.
2. Smoke test en Claude Preview (puerto 4173): mockear `window.MATCHES` con un partido r32 (equipos reales) y uno "a definir" (`a:null, aLabel`), montar `MatchRow` para cada uno en un contenedor de prueba y confirmar:
   - r32: banderas + nombres + steppers activos.
   - a definir: círculo "?" + etiquetas (`aLabel`/`bLabel`), sin steppers, con el cartel "Se habilita cuando se conozcan los equipos".
   - Screenshot de evidencia.
3. Confirmar en Predicciones (vista "Todos") que después de la fase de grupos aparecen los días de eliminación en orden (28 jun → 19 jul).

Pasos de consola del usuario: ninguno (no cambian reglas ni proveedores). Mantenimiento operativo: a medida que avanza el cuadro, reemplazar en `data.js` los `a:null`/`aLabel` por el código real del equipo clasificado (un cambio por ronda).
