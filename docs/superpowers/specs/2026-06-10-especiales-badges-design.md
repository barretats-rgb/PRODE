# Puntaje de especiales + badges reales — Diseño

**Fecha:** 2026-06-10
**Estado:** Diseño aprobado, pendiente de plan de implementación

## Objetivo

1. Que las **predicciones especiales** (campeón, subcampeón, goleador, arquero, sorpresa, decepción) se **puntúen de verdad**: +5 pts por acierto, repartidos por el admin a medida que se conocen las respuestas reales.
2. Que los **Badges del Mundial** sean reales y claros: cada badge se otorga con datos que existen y la leyenda explica cómo se gana.

## Decisiones tomadas (brainstorming)

- **Carga una por una**: el admin confirma cada respuesta oficial cuando se sabe (la decepción quizás en fase de grupos, el campeón el 19 jul). Al confirmar se reparten los puntos de ESE especial. Idempotente y corregible.
- **Cierre UI + reglas**: los especiales se bloquean el **11 jun 2026 18:00 CR** (kickoff del primer partido) tanto en la UI como server-side en `firestore.rules`. Requiere republicar reglas (ya pendiente por el Expulsar; una sola republicación).
- **Badges**: hacerlos reales + textos claros. Scaloneta se elimina.

## Bug previo a arreglar: data demo en especiales

`window.MY_SPECIALS` (data.js) trae picks de demo (ARG campeón, Mbappé goleador, etc.) y `ProdeStore.getSpecials()` (app-store.js) los usa como base — todo jugador "elige" eso sin tocar nada, y `saveSpecials` lo persiste a Firestore. Con puntaje real esto regalaría puntos falsos.

**Fix:**
- `window.MY_SPECIALS = {}` en data.js.
- `getSpecials()` arranca de `{}` + localStorage (sin spread de MY_SPECIALS).
- **Read-back**: al iniciar sesión, `firebase-service.js` lee `specialPredictions/{uid}` propio (fetch one-shot en `onAuthStateChanged`, como `ensurePlayer`) y lo expone (`getMySpecials()`); `app-store.getSpecials()` prioriza ese valor sobre localStorage. La pantalla Especiales muestra los picks reales en cualquier dispositivo.
- Importante: `saveSpecials` deja de mergear demo; guarda exactamente lo elegido.

## Arquitectura

### Datos

**`meta/specialResults`** (la colección `meta` ya existe en reglas: `read: true`, `write: isAdmin`): un doc con SOLO las respuestas ya confirmadas:

```
{ campeon: "ARG", decepcion: "GER", updatedAt: ... }
```

Clave ausente = todavía no se sabe. El admin puede corregir un valor y re-confirmar.

**`specialPredictions/{uid}`** gana un mapa `awarded` con lo ya repartido por especial:

```
{ playerId, campeon: "ARG", goleador: "Mbappé", ..., awarded: { campeon: 5, decepcion: 0 } }
```

`awarded[key]` ausente = nunca evaluado. Lo escribe SOLO el admin (fan-out); ver Reglas.

**`players/{uid}`**: el fan-out incrementa `specialsPoints` (delta) **y** `points` (mismo delta — los especiales cuentan para el ranking general). NO toca `weekly.*` (los especiales no son semanales) ni `exact/winner/played`.

### Lógica pura — `lib/specials.js` (dual navegador/Node, testeada)

- `SPECIAL_KEYS = ["campeon","subcampeon","goleador","arquero","sorpresa","decepcion"]` y `SPECIAL_POINTS = 5`.
- `normalizeAnswer(s)`: trim, lowercase, sin acentos (NFD + strip diacríticos). Para que "Mbappé" == "mbappe". Los equipos (códigos "ARG") pasan por la misma normalización sin daño.
- `scoreSpecialsFanout(official, predictions)`:
  - `official`: objeto con las respuestas confirmadas (subset de SPECIAL_KEYS).
  - `predictions`: array de docs `{ playerId, <picks>, awarded }`.
  - Para cada predicción y cada clave confirmada: `target = (normalize(pick) === normalize(respuesta)) ? 5 : 0`; `prev = awarded?.[key] ?? 0`; delta acumulado.
  - Devuelve `{ perPrediction: [{ playerId, awarded: {key: target,...} }], perPlayer: { [playerId]: { specialsPoints: deltaTotal } } }`. Sólo incluye en `perPrediction.awarded` las claves confirmadas (merge, no pisa otras). Jugadores con delta 0 y sin claves nuevas que evaluar pueden omitirse de `perPlayer`.
  - Idempotente: re-ejecutar con las mismas respuestas da deltas 0; corregir una respuesta (p.ej. campeón mal cargado) resta los 5 mal dados y suma a los nuevos acertantes.

### Servicio — `firebase-service.js`

- `subscribeSpecialResults(cb)`: onSnapshot de `meta/specialResults` (también alimenta la pantalla del jugador).
- `confirmSpecialResult(key, value)` (admin):
  1. `set` merge `meta/specialResults` con `{ [key]: value, updatedAt }`.
  2. Lee todas las `specialPredictions` (get).
  3. `scoreSpecialsFanout({ ...respuestasConfirmadas }, preds)` — usa TODAS las respuestas confirmadas hasta ahora, no sólo la nueva (recompone todo; idempotente, mismo costo).
  4. Batch (≤450 writes): merge `awarded` en cada `specialPredictions/{uid}` + `inc` de `specialsPoints` y `points` en `players/{uid}`.
- `getMySpecials()`: picks propios leídos en el read-back de sesión.

### Reglas — `firestore.rules`

`specialPredictions/{uid}` pasa a:

```
allow read: if isSignedIn();
// El dueño escribe sus picks SOLO antes del arranque (11 jun 2026 18:00 CR
// = 2026-06-12 00:00 UTC) y nunca el mapa `awarded` (puntaje ya repartido).
allow create: if isOwner(uid)
  && request.time < timestamp.date(2026, 6, 12)
  && !request.resource.data.keys().hasAny(['awarded']);
allow update: if isAdmin()
  || (isOwner(uid)
      && request.time < timestamp.date(2026, 6, 12)
      && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['awarded']));
allow delete: if isAdmin();
```

(Se quita el `delete` del dueño: después del cierre no debe poder borrar sus picks; el plan de "anular predicción" — partidos — no usa esta colección.)

**El usuario debe republicar `firestore.rules`** (junto con lo del Expulsar, ya pendiente).

### Admin UI — componente compartido `AdminSpecials`

Nueva pestaña **"Especiales"** en `screens/Admin.jsx` (mobile) **y** en `DesktopAdmin` (app.jsx) — son pantallas distintas, así que el contenido vive en UN componente `AdminSpecials` (definido en Admin.jsx, expuesto en `window`) usado por ambas.

Por cada uno de los 6 especiales:
- Estado actual: "Sin confirmar" o la respuesta oficial confirmada.
- Selector: campeón/subcampeón/sorpresa/decepción → picker de equipos (los 18 códigos de la pantalla Especiales); goleador/arquero → las mismas listas de nombres + input de texto libre (por si el real no está en la lista).
- Botón **Confirmar** (con re-confirmar para corregir). Al confirmar: `confirmSpecialResult(key, value)` y toast/estado de guardado.
- Aviso fijo: "Confirmar reparte +5 a cada jugador que acertó. Corregir y re-confirmar recalcula sin duplicar."

### Pantalla Especiales del jugador — `screens/Specials.jsx`

- **Lock**: pasado el 11 jun 18:00 CR (`Date.now()` vs constante compartida en `lib/specials.js`: `SPECIALS_LOCK_MS`), los pickers se deshabilitan y el botón pasa a "Especiales cerradas" (candado). El banner "Cierran el 11 de junio · 18:00" ya existe.
- **Resultados**: con `subscribeSpecialResults`, cada fila confirmada muestra la respuesta oficial y ✓ "+5" (verde citrus) si acertaste o ✗ (gris) si no.
- Sin respuestas confirmadas todavía → la fila se ve como hoy.

### Badges — `data.js`, `lib/ranking.js`, `screens/Ranking.jsx`

`window.BADGES` queda en 4, con textos honestos:

| key | label | sub (cómo se gana) | otorgamiento |
|---|---|---|---|
| `profeta` | El Profeta | "6+ resultados exactos" | `exact >= 6` |
| `casi` | Casi Brujo | "3+ resultados exactos" | `exact >= 3` |
| `rey` | Rey del Refugio | "Ganó una semana" | aparece en `weeklyHistory` como líder de alguna semana cerrada |
| `cafe` | Café y Fulbo | "Está jugando el prode" | siempre (participación) |

`scaloneta` se elimina de BADGES (nunca se otorgó; sin datos para hacerlo real).

`lib/ranking.js`: nueva `badgesFor(player, reyIds)` → array de keys ganadas en orden de prestigio fijo `[profeta, rey, casi, cafe]` (puede haber varias; `cafe` siempre incluido; `casi` y `profeta` no son excluyentes — se muestran ambas si corresponde). `rankingRowsFromPlayers(players, myUid, reyIds?)` adquiere el parámetro opcional `reyIds` (Set/array de uids que ganaron alguna semana, derivado de `ProdeWeekly.weeklyHistory` por el caller) y agrega `badges: [...]` a cada fila; `badge` (singular, la primera del array) se mantiene por compatibilidad.

`screens/Ranking.jsx`:
- La fila expandida muestra TODOS los chips ganados (`r.badges.map(BadgeChip)`).
- La leyenda "Badges del Mundial" muestra los 4 con sus textos nuevos (sale gratis de BADGES).

## Casos borde

- **Respuesta corregida**: re-confirmar con otro valor recompone (resta a los viejos acertantes, suma a los nuevos) — mismo patrón idempotente de partidos.
- **Jugador sin specialPredictions**: no aparece en el fan-out; 0 puntos de especiales. OK.
- **Pick vacío / clave ausente** en la predicción: cuenta como no-acierto (0), `awarded[key] = 0`.
- **Goleador escrito distinto** ("Mbappe" vs "Mbappé"): la normalización lo cubre. Espacios extra también.
- **Expulsar jugador**: ya borra `specialPredictions/{uid}` y el doc `players` — coherente.
- **Demo data ya guardada en Firestore** (si algún jugador guardó especiales con los defaults demo mezclados): los picks son indistinguibles de elecciones reales. Hoy no hay jugadores reales con especiales guardados (app sin deployar), así que no se migra nada. Si los hubiera, el admin puede pedirles que re-elijan antes del cierre.
- **Reglas viejas sin republicar**: `confirmSpecialResult` fallaría con permission-denied al escribir `meta` — error visible en consola del admin; las reglas actuales ya permiten `meta` write admin, así que sólo el lock/awarded dependen de republicar.

## Fuera de alcance

- Migración de especiales demo ya guardados (no hay datos reales).
- Badge "scaloneta" real (eliminado).
- Notificaciones de resultados de especiales.
- Editar especiales después del cierre con permiso especial del admin.

## Testing

- `lib/specials.test.js` (TDD): acierto simple (+5), fallo (0), normalización (acentos/case/trim), múltiples claves confirmadas, idempotencia (re-ejecutar → deltas 0), corrección de respuesta (delta negativo a viejos acertantes), predicción sin pick, awarded ausente, perPlayer omite delta 0.
- `lib/ranking.test.js`: `badgesFor` (profeta+casi+cafe juntos a 6 exactos; rey con reyIds; cafe solo), `rankingRowsFromPlayers` con `reyIds` y campo `badges`.
- Integración (QA manual del usuario con datos reales): confirmar un especial en Admin → ver `awarded` en Firestore, `specialsPoints`/`points` incrementados, ✓ en la pantalla del jugador, re-confirmar sin duplicar.

## Criterio de éxito

El admin confirma "decepción = GER" en la pestaña Especiales; los jugadores que la eligieron suben +5 en el ranking al instante y ven ✓ +5 en su pantalla de Especiales. Re-confirmar no duplica; corregir a otro equipo mueve los puntos. Pasado el 11 jun 18:00 nadie puede editar sus picks (ni por consola). La leyenda de badges explica cómo se gana cada uno y los chips del ranking reflejan la realidad.
