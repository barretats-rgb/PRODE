# Movimiento de posiciones en el ranking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar en el ranking cuántos puestos subió o bajó cada jugador respecto del último resultado confirmado (`▲3` / `▼2`), en las filas, en la tarjeta "SOS VOS" y en el podio.

**Architecture:** Se guarda en cada `players/{uid}` un campo `prevRank` = la posición que tenía justo antes del último resultado confirmado. La posición actual se calcula en vivo en el cliente. Movimiento = `prevRank − posiciónActual`. `prevRank` lo graban `finalizeMatch` y `confirmSpecialResult` (que mueven puntos), tomando la "foto" de posiciones antes de aplicar los deltas. La lógica de orden y de movimiento vive (pura y testeada) en `lib/ranking.js`.

**Tech Stack:** React (Babel standalone, sin build), Firebase compat (Firestore), `node --test`.

**Spec:** `docs/superpowers/specs/2026-06-16-movimiento-posiciones-ranking-design.md`

**Contexto para quien implementa:**
- App estática sin bundler: `lib/*.js` usan IIFE dual navegador/Node (`global.ProdeRanking = api; module.exports = api`), se testean con `node --test` desde la raíz. **La suite actual tiene 76 tests verdes.** Las pantallas (`screens/*.jsx`) se cargan con `<script type="text/babel">`.
- `lib/ranking.js` ya exporta `rankingRowsFromPlayers`, `badgesFor`, `initials`, `isOnline`, `ONLINE_MS` en `window.ProdeRanking`.
- `firebase-service.js` (IIFE) expone `window.ProdeDB`. `finalizeMatch` y `confirmSpecialResult` ya reparten puntos en batches `state.db.batch()` con `firebase.firestore.FieldValue.increment`. El admin ya puede escribir en docs de `players` ajenos (reparto de puntos) → **no hace falta cambiar `firestore.rules`** para sumar el campo `prevRank`.
- `screens/Ranking.jsx`: `RankRow` ya renderiza una flecha placeholder (`r.trend !== "flat"`); `PodiumCol` arma cada lugar del podio a partir de una fila del ranking; la tarjeta "SOS VOS" usa `you`. Los íconos son de lucide (`data-lucide="..."`), que ya se renderizan en esta pantalla (no hay que llamar a `createIcons` a mano).
- Validar JSX: `npx --yes esbuild <archivo>.jsx --loader:.jsx=jsx --outfile=NUL --log-level=error` y luego limpiar `rm -rf NUL NUL_DIR` (Windows crea ese resto).
- Comentarios en español, acentos intencionales — guardar UTF-8 con Write/Edit.

---

### Task 1: `lib/ranking.js` — comparador unificado, `computeRanks` y `move`/`trend` (TDD)

**Files:**
- Modify: `lib/ranking.js`
- Modify: `lib/ranking.test.js`

- [ ] **Step 1: Write the failing tests** — en `lib/ranking.test.js`, cambiar la línea 3 (el `require`) para incluir `computeRanks`:

```js
const { rankingRowsFromPlayers, badgesFor, isOnline, computeRanks } = require("./ranking.js");
```

Y agregar al final del archivo estos tres tests:

```js
test("computeRanks: mapa {id: rank} por puntos desc", () => {
  assert.deepStrictEqual(computeRanks(players), { u2: 1, u1: 2, u3: 3 });
});

test("computeRanks: desempata por exactos y luego por id", () => {
  const tied = [
    { id: "b", points: 10, exact: 1 },
    { id: "a", points: 10, exact: 3 },
    { id: "c", points: 10, exact: 1 },
  ];
  // a tiene más exactos → 1°; b y c empatan exactos → id asc (b antes que c)
  assert.deepStrictEqual(computeRanks(tied), { a: 1, b: 2, c: 3 });
});

test("rankingRowsFromPlayers: move/trend derivados de prevRank", () => {
  const ps = [
    { id: "u1", name: "A", points: 20, exact: 2, prevRank: 3 }, // ahora 1° → subió 2
    { id: "u2", name: "B", points: 12, exact: 1, prevRank: 1 }, // ahora 2° → bajó 1
    { id: "u3", name: "C", points: 5,  exact: 0, prevRank: 3 }, // ahora 3° → igual
    { id: "u4", name: "D", points: 1,  exact: 0 },              // sin prevRank → sin dato
  ];
  const rows = rankingRowsFromPlayers(ps, "u1");
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.strictEqual(by.u1.rank, 1); assert.strictEqual(by.u1.move, 2);  assert.strictEqual(by.u1.trend, "up");
  assert.strictEqual(by.u2.rank, 2); assert.strictEqual(by.u2.move, -1); assert.strictEqual(by.u2.trend, "down");
  assert.strictEqual(by.u3.rank, 3); assert.strictEqual(by.u3.move, 0);  assert.strictEqual(by.u3.trend, "flat");
  assert.strictEqual(by.u4.rank, 4); assert.strictEqual(by.u4.move, null); assert.strictEqual(by.u4.trend, "flat");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test lib/ranking.test.js`
Expected: FAIL — `computeRanks is not a function` (y los asserts de `move` fallan: hoy `trend` es `"flat"` fijo y no existe `move`).

- [ ] **Step 3: Write minimal implementation** — en `lib/ranking.js`, agregar el comparador y `computeRanks` (antes de `rankingRowsFromPlayers`), y reescribir `rankingRowsFromPlayers` para ordenar con el comparador y derivar `move`/`trend`.

Agregar después de la función `isOnline` (y antes de `rankingRowsFromPlayers`):

```js
  // Orden del ranking: más puntos primero; desempata por más exactos y luego por id
  // (determinista). El MISMO criterio se usa para la foto previa y la posición actual,
  // así el movimiento no tiene ruido por reordenar empatados.
  function byRank(a, b) {
    const pa = Number(a && a.points) || 0, pb = Number(b && b.points) || 0;
    if (pb !== pa) return pb - pa;
    const ea = Number(a && a.exact) || 0, eb = Number(b && b.exact) || 0;
    if (eb !== ea) return eb - ea;
    return String(a && a.id).localeCompare(String(b && b.id));
  }

  // Mapa { id: posición (1-based) } con el orden del ranking. Lo usa firebase-service
  // para grabar prevRank (la foto de posiciones antes de un resultado).
  function computeRanks(players) {
    const out = {};
    (players || []).slice().sort(byRank).forEach((p, i) => { out[p.id] = i + 1; });
    return out;
  }
```

Reemplazar la función `rankingRowsFromPlayers` completa por:

```js
  // players: [{ id, name, points, exact, winner, favoriteTeam, avatarTone, prevRank }]
  // myUid: uid del jugador actual (para marcar la fila propia).
  // reyIds: uids que ganaron alguna semana cerrada (Set o array; opcional).
  function rankingRowsFromPlayers(players, myUid, reyIds) {
    return (players || [])
      .slice()
      .sort(byRank)
      .map((p, i) => {
        const badges = badgesFor(p, reyIds);
        const rank = i + 1;
        const prev = Number(p.prevRank);
        const move = Number.isFinite(prev) ? prev - rank : null; // + subió, - bajó, 0 igual
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
          prevRank: Number.isFinite(prev) ? prev : null,
          move,                                                   // null = sin dato (jugador nuevo)
          trend: move > 0 ? "up" : move < 0 ? "down" : "flat",
          you: p.id === myUid,
          avatarTone: p.avatarTone || "olive",
          rank,
        };
      });
  }
```

Y agregar `computeRanks` al objeto exportado `api` (línea que hoy dice `const api = { rankingRowsFromPlayers, badgesFor, initials, isOnline, ONLINE_MS };`):

```js
  const api = { rankingRowsFromPlayers, computeRanks, badgesFor, initials, isOnline, ONLINE_MS };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test lib/ranking.test.js`
Expected: PASS (los 3 nuevos + los previos del archivo, incluido "ordena por puntos desc y asigna rank" que sigue dando `[1,u2,20],[2,u1,12],[3,u3,5]`).

- [ ] **Step 5: Run full suite**

Run: `node --test`
Expected: 79/79 (76 previos + 3 nuevos), 0 fail.

- [ ] **Step 6: Commit**

```bash
git add lib/ranking.js lib/ranking.test.js
git commit -m "lib/ranking: computeRanks + comparador unificado + move/trend desde prevRank"
```

---

### Task 2: `firebase-service.js` — grabar `prevRank` al confirmar resultados y especiales

**Files:**
- Modify: `firebase-service.js` (función `finalizeMatch` ~309-350 y `confirmSpecialResult` ~440-467)

Sin lógica pura nueva (usa `ProdeRanking.computeRanks` de Task 1). Verificación = `node --check` + suite completa.

- [ ] **Step 1: Modificar `finalizeMatch`** — tomar la foto de posiciones antes de aplicar puntos y grabar `prevRank` a TODOS los jugadores.

En `firebase-service.js`, reemplazar el bloque que va desde el comentario `// 4) aplicar en batches` hasta el `return { matched: perPrediction.length };` (actualmente líneas ~322-349) por:

```js
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
```

- [ ] **Step 2: Modificar `confirmSpecialResult`** — misma foto de posiciones (los especiales también mueven `points`).

En `confirmSpecialResult`, reemplazar el bloque desde `const inc = window.firebase.firestore.FieldValue.increment;` hasta `return { evaluated: perPrediction.length };` (actualmente líneas ~450-466) por:

```js
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
```

- [ ] **Step 3: Verificar sintaxis y suite**

Run: `node --check firebase-service.js`
Expected: sin salida (sintaxis OK).

Run: `node --test`
Expected: 79/79 (Task 2 no agrega tests; confirma que nada se rompió).

- [ ] **Step 4: Commit**

```bash
git add firebase-service.js
git commit -m "firebase-service: grabar prevRank (foto de posiciones) al confirmar resultados y especiales"
```

---

### Task 3: `screens/Ranking.jsx` — flecha + número en filas, "SOS VOS" y podio

**Files:**
- Modify: `screens/Ranking.jsx`

- [ ] **Step 1: Agregar el componente `MoveTag`** — al inicio de `screens/Ranking.jsx`, justo después del comentario de cabecera y antes de `function Ranking({ go }) {`, agregar:

```jsx
/* Indicador de movimiento de posición: ▲N (subió) en citrus, ▼N (bajó) en coral.
   move = null o 0 → no muestra nada. */
function MoveTag({ move, size = 10 }) {
  if (!move) return null;
  const up = move > 0;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:1,
      fontSize:size, fontWeight:700, lineHeight:1,
      color: up ? "var(--neon-citrus)" : "var(--neon-coral)",
    }}>
      <i data-lucide={up ? "arrow-up" : "arrow-down"} style={{width:size, height:size}}></i>
      {Math.abs(move)}
    </span>
  );
}
```

- [ ] **Step 2: Reemplazar la flecha placeholder en `RankRow`** — en la celda de puntos, cambiar el bloque:

```jsx
          {r.trend !== "flat" && (
            <i data-lucide={r.trend==="up"?"arrow-up":"arrow-down"} style={{
              width:10, height:10, marginTop:2,
              color: r.trend==="up" ? "var(--neon-citrus)" : "var(--neon-coral)",
            }}></i>
          )}
```

por:

```jsx
          <div style={{display:"flex", justifyContent:"flex-end", marginTop:2}}>
            <MoveTag move={r.move}/>
          </div>
```

- [ ] **Step 3: Agregar el indicador a la tarjeta "SOS VOS"** — en el bloque `{you && (...)}`, dentro del `<div style={{textAlign:"right"}}>` que muestra `you.pts` y `PUNTOS`, agregar el `MoveTag` después del div de "PUNTOS". Cambiar:

```jsx
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"var(--font-title)", fontSize:22, color:"var(--neon-citrus)", lineHeight:1}}>{you.pts}</div>
              <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.18em", marginTop:2}}>PUNTOS</div>
            </div>
```

por:

```jsx
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"var(--font-title)", fontSize:22, color:"var(--neon-citrus)", lineHeight:1}}>{you.pts}</div>
              <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.18em", marginTop:2}}>PUNTOS</div>
              <div style={{display:"flex", justifyContent:"flex-end", marginTop:3}}>
                <MoveTag move={you.move} size={11}/>
              </div>
            </div>
```

- [ ] **Step 4: Agregar el indicador al podio (`PodiumCol`)** — después del div del país (`{player.nat}`) y antes del pedestal (`<div style={{marginTop:8, height:h, ...}}>`), agregar una fila centrada con el `MoveTag`. Cambiar:

```jsx
      <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.1em", marginTop:2}}>{player.nat}</div>
      <div style={{
        marginTop:8, height:h, borderRadius:"18px 18px 0 0",
```

por:

```jsx
      <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.1em", marginTop:2}}>{player.nat}</div>
      <div style={{display:"flex", justifyContent:"center", marginTop:4, height:13}}>
        <MoveTag move={player.move}/>
      </div>
      <div style={{
        marginTop:8, height:h, borderRadius:"18px 18px 0 0",
```

- [ ] **Step 5: Validar JSX**

Run: `npx --yes esbuild screens/Ranking.jsx --loader:.jsx=jsx --outfile=NUL --log-level=error`
Expected: sin errores. Luego limpiar: `rm -rf NUL NUL_DIR`

- [ ] **Step 6: Commit**

```bash
git add screens/Ranking.jsx
git commit -m "Ranking: flecha + número de puestos que sube/baja cada uno (filas, SOS VOS, podio)"
```

---

## Verificación final (revisión de toda la feature)

Tras las 3 tasks, smoke test en Claude Preview sobre el directorio estático (puerto 4173):
- Mockear `window.ProdeDB.subscribeRanking` para emitir players con `prevRank` variados (uno que subió, uno que bajó, uno igual, uno sin `prevRank`).
- Confirmar que en las filas, en "SOS VOS" y en el podio aparece `▲N` en citrus / `▼N` en coral, y nada cuando `move` es 0 o falta `prevRank`.
- Screenshot de evidencia.

Pasos de consola del usuario: ninguno (no cambian reglas ni proveedores). `prevRank` se completa solo en la primera confirmación de resultado/especiales tras el deploy.
