# Expulsar jugador (admin) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El admin puede expulsar a un jugador desde una pestaña "Jugadores" en el panel Admin: borra sus datos (players, playerPrivate, predicciones, especiales) y desaparece del ranking al instante.

**Architecture:** Sin build. `ProdeDB.expelPlayer(uid)` borra en un batch las predicciones del jugador y luego sus docs (`players/{uid}`, `playerPrivate/{uid}`, `specialPredictions/{uid}`). Las reglas de Firestore permiten esos borrados sólo al admin. La pestaña "Jugadores" del Admin se suscribe al ranking en vivo (`subscribeRanking`) y lista a cada jugador con un botón "Expulsar" (confirmación de dos pasos); el admin no puede expulsarse a sí mismo.

**Tech Stack:** Firebase Firestore compat (batch, doc.delete, query where), React 18 + Babel standalone (sin build), `node:test`.

**Contexto:** Spec en `docs/superpowers/specs/2026-05-27-expulsar-jugador-design.md`. `ProdeDB` ya tiene `subscribeRanking`, `getUser`, `collection`, `firestoreNow`. `ProdeRanking.rankingRowsFromPlayers(list, myUid)` (testeado) arma filas `{id,name,avatar,pts,you,...}`. La pestaña "Jugadores" del Admin fue removida en la limpieza de demo; se re-agrega con datos reales.

> El usuario debe **re-publicar `firestore.rules`** tras este plan (Task 4).

---

## File Structure

- **Modify** `firestore.rules` — `delete` por admin en `players`, `playerPrivate`, `predictions`, `specialPredictions`.
- **Modify** `firebase-service.js` (`ProdeDB`) — `expelPlayer(uid)` + export.
- **Modify** `screens/Admin.jsx` — pestaña "Jugadores" (lista real + Expulsar + confirm + guarda no-auto-expulsión).

---

## Task 1: Reglas — permitir borrado por admin

**Files:** Modify `firestore.rules`

- [ ] **Step 1:** En `firestore.rules`:

En `match /players/{uid}`, cambiar `allow delete: if false;` por:
```js
      allow delete: if isAdmin();
```

En `match /playerPrivate/{uid}`, cambiar `allow delete: if false;` por:
```js
      allow delete: if isAdmin();
```

En `match /predictions/{predId}`, cambiar `allow delete: if false;` por:
```js
      allow delete: if isAdmin() || (isSignedIn() && resource.data.playerId == request.auth.uid);
```

En `match /specialPredictions/{uid}`, cambiar `allow delete: if false;` por:
```js
      allow delete: if isAdmin() || isOwner(uid);
```

- [ ] **Step 2: Verificar** — `npm test` sigue verde (las reglas no afectan tests). Confirmar por lectura que sólo cambiaron esas 4 líneas `allow delete` y que `isAdmin()`/`isOwner()` ya existen como funciones en el archivo.

- [ ] **Step 3: Commit**
```bash
git add firestore.rules
git commit -m "Rules: allow admin to delete player data (and owner for own pred/specials)"
```

---

## Task 2: ProdeDB.expelPlayer

**Files:** Modify `firebase-service.js`

- [ ] **Step 1: Agregar `expelPlayer`** antes del `window.ProdeDB = {...}`:

```js
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
```

- [ ] **Step 2:** Agregar `expelPlayer` al objeto exportado `window.ProdeDB = {...}` (sin quitar nada).

- [ ] **Step 3: Verificar**
- `node --check firebase-service.js` → exit 0.
- `npm test` → verde.
- Confirmar por lectura: borra predicciones por `where playerId==uid` en batch, luego `players`/`playerPrivate`/`specialPredictions`; `expelPlayer` está exportado.
- Reportar que el borrado real se valida en el QA (Task 4).

- [ ] **Step 4: Commit**
```bash
git add firebase-service.js
git commit -m "ProdeDB.expelPlayer: delete a player's data"
```

---

## Task 3: Pestaña "Jugadores" en el Admin

**Files:** Modify `screens/Admin.jsx`

- [ ] **Step 1: Estado + suscripción + handlers.** Dentro de `function Admin`, después de los `useState`/`useEffect` existentes y los handlers `editScore`/`confirmResult`, agregar:

```js
  const [players, setPlayers] = useState([]);
  const [confirmExpel, setConfirmExpel] = useState(null); // uid con confirmación pendiente
  const [expelling, setExpelling] = useState(null);

  useEffect(() => {
    const unsub = window.ProdeDB?.subscribeRanking?.((list) => setPlayers(list));
    return () => unsub && unsub();
  }, []);

  const myUid = window.ProdeDB?.getUser?.()?.uid;
  const doExpel = async (uid) => {
    setExpelling(uid);
    try {
      await window.ProdeDB?.expelPlayer?.(uid);
    } catch (e) {
      console.error("[Prode Refugio] expulsar jugador", e);
    } finally {
      setExpelling(null);
      setConfirmExpel(null);
    }
  };
```

- [ ] **Step 2: Agregar la pestaña al selector.** El array de tabs hoy es:
```js
        {[
          {id:"resultados",label:"Resultados", icon:"check-check"},
          {id:"partidos",  label:"Partidos", icon:"goal"},
        ].map(t => {
```
Cambiarlo a:
```js
        {[
          {id:"resultados",label:"Resultados", icon:"check-check"},
          {id:"partidos",  label:"Partidos", icon:"goal"},
          {id:"jugadores", label:"Jugadores", icon:"users"},
        ].map(t => {
```

- [ ] **Step 3: Agregar el contenido de la pestaña.** Después del bloque `{tab === "partidos" && ( ... )}` y antes del cierre `</div>` del componente, agregar:

```jsx
      {tab === "jugadores" && (
        <div style={{padding:"22px 16px 0"}}>
          <Eyebrow color="var(--neon-citrus)">Jugadores · {players.length}</Eyebrow>
          <h3 style={{
            fontFamily:"var(--font-title)", fontSize:20, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 12px",
          }}>Administrar</h3>
          {players.length === 0 && (
            <div style={{padding:14, color:"var(--char-300)", fontSize:12,
              borderRadius:14, background:"var(--char-800)", border:"1px solid var(--char-700)"}}>
              Todavía no hay jugadores registrados.
            </div>
          )}
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            {(window.ProdeRanking?.rankingRowsFromPlayers?.(players, myUid) || []).map((r) => (
              <div key={r.id} style={{
                display:"flex", alignItems:"center", gap:11,
                padding:"10px 13px", borderRadius:16,
                background:"var(--char-800)", border:"1px solid var(--char-700)",
              }}>
                <Avatar initials={r.avatar} size={30} tone={r.you ? "citrus" : "olive"}/>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontFamily:"var(--font-body)", fontSize:13, color:"var(--cream-100)", fontWeight:600,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{r.name}</div>
                  <div style={{display:"flex", alignItems:"center", gap:6, marginTop:2}}>
                    {r.nat ? <Flag code={r.nat} size={11}/> : null}
                    <span style={{fontSize:10, color:"var(--char-400)", letterSpacing:"0.04em"}}>{r.pts} pts</span>
                  </div>
                </div>
                {r.you ? (
                  <Pill tone="ghost">Vos</Pill>
                ) : confirmExpel === r.id ? (
                  <div style={{display:"flex", gap:6}}>
                    <Btn size="sm" variant="primary" onClick={()=>doExpel(r.id)}>
                      {expelling === r.id ? "..." : "Sí, expulsar"}
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={()=>setConfirmExpel(null)}>No</Btn>
                  </div>
                ) : (
                  <Btn size="sm" variant="ghost" onClick={()=>setConfirmExpel(r.id)}>Expulsar</Btn>
                )}
              </div>
            ))}
          </div>
          <div style={{marginTop:12, fontSize:10, color:"var(--char-500)", letterSpacing:"0.04em", lineHeight:1.5}}>
            Expulsar borra al jugador y todas sus predicciones. No se puede deshacer.
          </div>
        </div>
      )}
```

(`Avatar`, `Flag`, `Btn`, `Pill`, `Eyebrow` son globales de `components.jsx`; `window.ProdeRanking` está cargado. Si la confirmación inline (`confirmExpel`) no encaja con el layout, dejar igual el patrón Expulsar → "Sí, expulsar / No".)

- [ ] **Step 4: Verificar**
- `npm test` → verde.
- Estática: la tab "jugadores" está en el array; el bloque usa `subscribeRanking` + `rankingRowsFromPlayers`; la fila propia muestra "Vos" (sin botón); las demás muestran Expulsar → confirm → `doExpel`.
- Render headless: el bundle parsea (Login renderiza).
- El flujo real (expulsar y ver desaparecer) se valida en el QA.

- [ ] **Step 5: Commit**
```bash
git add screens/Admin.jsx
git commit -m "Admin: Jugadores tab with real players + expel (confirm)"
```

---

## Task 4: QA end-to-end (manual) + republicar reglas

**Files:** ninguno.

- [ ] **Step 1: Republicar reglas.** Firebase Console → Firestore → Rules → pegar la versión actualizada de [firestore.rules](../../../firestore.rules) → Publish.

- [ ] **Step 2: Expulsar.** Con una **2ª cuenta** de prueba registrada (que aparezca en el ranking), entrá como admin → Admin → **Jugadores** → en la fila de la cuenta de prueba, **Expulsar** → **Sí, expulsar**. Verificá que desaparece de la lista y del **ranking** al instante. En Firebase Console confirmá que ya no están `players/{uidPrueba}`, `playerPrivate/{uidPrueba}` ni sus `predictions/*`.

- [ ] **Step 3: Guardas.** Confirmá que en tu **propia** fila aparece "Vos" y NO el botón Expulsar. (Opcional) Probá que un no-admin no puede borrar: con la cuenta de prueba, desde la consola del navegador `firebase.firestore().collection("players").doc("<otroUid>").delete()` debe fallar con permisos.

- [ ] **Step 4: Tests** `npm test` → verde. Reportar el QA.

---

## Self-Review (cobertura del spec)

- ✅ "expelPlayer borra players + playerPrivate + predictions + specialPredictions" → Task 2.
- ✅ "Pestaña Jugadores con datos reales + Expulsar + confirmación" → Task 3.
- ✅ "Admin no puede expulsarse a sí mismo (fila propia → 'Vos', sin botón)" → Task 3 (`r.you`).
- ✅ "Reglas: borrado sólo admin" → Task 1.
- ✅ "No afecta puntos de otros / ranking en vivo lo refleja" → arquitectura (cada jugador agrega aparte; `subscribeRanking`).
- ⏭️ Ban, editar jugadores, gestión en desktop → fuera de alcance (spec).

Consistencia de tipos: `expelPlayer(uid)` en `ProdeDB`; la UI usa `subscribeRanking` + `rankingRowsFromPlayers(list, myUid)` → filas con `.id/.name/.avatar/.nat/.pts/.you`; `confirmExpel`/`expelling` son uid. Sin placeholders.

> **Nota de testing:** no hay lógica pura nueva (es borrado en Firestore + UI); se valida con el QA de la Task 4 + smoke headless de parseo. Honesto para trabajo de integración.
