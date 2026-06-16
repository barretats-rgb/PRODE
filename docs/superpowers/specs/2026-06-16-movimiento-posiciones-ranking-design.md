# Movimiento de posiciones en el ranking — Design

**Goal:** Mostrar en el ranking cuántos puestos subió o bajó cada jugador respecto del último resultado confirmado, con una flecha y un número (`▲3` / `▼2`) en las filas, en la tarjeta "SOS VOS" y en el podio.

## Contexto

App estática (React + Babel standalone, sin build), Firebase (Auth + Firestore, Spark, sin Cloud Functions). El ranking se arma en vivo en `screens/Ranking.jsx` a partir del snapshot de `players` (ordenado por `points` desc) que entrega `ProdeDB.subscribeRanking`. La posición se calcula en el cliente (`i+1`) en `lib/ranking.js → rankingRowsFromPlayers`. Hoy la flecha de tendencia existe en la UI (`RankRow`) pero está fija en `trend: "flat"` porque no hay histórico de posición.

## Modelo de datos

Cada `players/{uid}` gana **un** campo nuevo:

- **`prevRank`** (número): la posición que tenía el jugador **justo antes del último resultado confirmado**.

No se guarda el rank actual: se calcula en vivo (`i+1` tras ordenar). Así nunca queda desincronizado con lo que se muestra.

**Movimiento = `prevRank − posiciónActual`:**
- `> 0` → subió esa cantidad de puestos.
- `< 0` → bajó.
- `0` → quedó igual (no se muestra flecha).
- `prevRank` ausente (jugador nuevo, o estado previo al primer resultado) → sin flecha. Se auto-resuelve en la primera confirmación que lo incluya.

## Cuándo se actualiza `prevRank`

En `firebase-service.js`, dentro de **`finalizeMatch`** y **`confirmSpecialResult`** (ambas mueven `points`):

1. Antes de aplicar los puntos, leer **todos** los `players` (`collection("players").get()`).
2. Calcular el orden actual con el comparador unificado → posición de cada uno = `prevRank`.
3. En el mismo batch que aplica los deltas, grabar `prevRank` para **todos** los jugadores (no solo los del partido: un jugador puede moverse porque otros lo pasan).
4. Aplicar los deltas de puntos como ya se hace.

Costo por confirmación: ~1 lectura de la colección + escribir `prevRank` a ≈55 docs. Trivial para la escala del bar. **No requiere cambiar `firestore.rules`**: el admin ya escribe en docs de `players` ajenos (reparto de puntos).

Semántica resultante: la flecha refleja el movimiento que provocó **ese** resultado y queda fija hasta la próxima confirmación (persiste entre recargas).

## Consistencia de empates

Para que la flecha no tenga ruido de ±1 por reordenamiento de empatados, "posición anterior" (calculada en el servidor/cliente al confirmar) y "posición actual" (calculada en vivo) deben usar **el mismo criterio de orden**. Se unifica en `lib/ranking.js`:

**`points` desc → `exact` desc → `id` asc**

Esto vuelve determinista el orden de empatados (hoy queda arbitrario según el orden de Firestore) y mejora el desempate (más exactos = más arriba). El podio (`rows.slice(0,3)`) hereda el mismo orden.

## Lógica pura (`lib/ranking.js`)

- **Comparador compartido** (interno) que ordena por `points` desc → `exact` desc → `id` asc.
- **`computeRanks(players)`** → `{ [id]: rank }` (1-based) usando ese comparador. Lo usa `firebase-service` para calcular `prevRank`.
- **`rankingRowsFromPlayers(players, myUid, reyIds)`**: ordena con el comparador compartido; para cada fila calcula:
  - `move`: `Number.isFinite(prevRank) ? (prevRank − rank) : null`.
  - `trend`: `move > 0 ? "up" : move < 0 ? "down" : "flat"`.
  - mantiene el `rank` (`i+1`) y pasa `prevRank` por si se necesita.

## UI (`screens/Ranking.jsx`)

- **`RankRow`**: reemplazar la flecha placeholder. Si `r.move` es un número distinto de 0, mostrar flecha + valor absoluto: `▲{|move|}` en `var(--neon-citrus)` (subió) o `▼{|move|}` en `var(--neon-coral)` (bajó), junto a los puntos. Si `move` es `0`/`null`, no mostrar nada.
- **Tarjeta "SOS VOS"**: mostrar el mismo indicador de `you.move` junto al puntaje.
- **Podio (`PodiumCol`)**: mostrar un indicador chico de movimiento (`▲3` / `▼2`) cerca del nombre/posición de cada uno de los tres, con los mismos colores. Sin dato → nada.

## Tests (`lib/ranking.test.js`)

Casos nuevos:
- `computeRanks`: orden correcto por puntos; desempate por `exact` y luego `id`; mapa `{id: rank}` 1-based.
- `rankingRowsFromPlayers` con `prevRank`:
  - subió → `move > 0`, `trend: "up"`.
  - bajó → `move < 0`, `trend: "down"`.
  - igual → `move === 0`, `trend: "flat"`.
  - sin `prevRank` → `move === null`, `trend: "flat"`.
  - empate de puntos con distinto `exact` → orden determinista.

## Fuera de alcance

- No se guarda histórico de varias fechas (solo la última foto vía `prevRank`).
- No se agrega botón manual de "snapshot" (la actualización es automática al confirmar resultados/especiales).
