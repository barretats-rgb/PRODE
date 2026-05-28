# Expulsar jugador (admin) — Diseño

**Fecha:** 2026-05-27
**Estado:** Diseño aprobado, pendiente de plan de implementación

## Objetivo

Dar al admin del Refugio una función para **expulsar a un jugador**: sacarlo del prode borrando todos sus datos. Es la primera de una serie de funciones de administración de jugadores.

## Decisión tomada (brainstorming)

"Expulsar" = **sacar del prode borrando sus datos** (NO banear). El jugador desaparece del ranking; si vuelve a entrar con su cuenta de Google, se re-registra de cero (no queda bloqueado). Sirve para limpiar cuentas repetidas, de prueba, o jugadores que se fueron.

(Se descartó el ban —bloquear el reingreso— para esta versión; requeriría lista de baneados + chequeo en el gate + regla extra. Queda como posible feature futura.)

## Qué hace

`ProdeDB.expelPlayer(uid)` borra, en un batch:
- `players/{uid}` (perfil + agregados → sale del ranking).
- `playerPrivate/{uid}` (email/teléfono).
- todas las `predictions/{uid}_{matchId}` del jugador (query `where playerId == uid`).
- `specialPredictions/{uid}` (si existe).

**No** afecta los puntos de los demás: en este modelo cada jugador tiene sus propios agregados (no hay reversión cruzada, a diferencia de anular un resultado). El ranking es en vivo (`subscribeRanking`), así que el expulsado desaparece al instante para todos.

## UI

Re-agregar la pestaña **"Jugadores"** en el panel Admin (`screens/Admin.jsx`) — se había quitado en la limpieza de demo. Ahora con **datos reales**: se suscribe al ranking en vivo (`ProdeDB.subscribeRanking`) y lista cada jugador con nombre, equipo (bandera) y puntos. Cada fila tiene un botón **"Expulsar"** con **confirmación de dos pasos** (el botón pide confirmar: "¿Seguro? Esto borra al jugador y sus predicciones") para evitar borrados accidentales.

**Guarda:** el admin no puede expulsarse a sí mismo — en la fila cuyo `id === uid` propio, el botón Expulsar **no se muestra** (en su lugar, una etiqueta "Vos").

(El panel desktop `DesktopAdmin` puede mantenerse enfocado en resultados; la gestión de jugadores vive en la pestaña Jugadores de la vista mobile/compacta. Si más adelante se quiere en desktop, se agrega aparte.)

## Seguridad (reglas de Firestore)

Hoy las reglas tienen `allow delete: if false` en `players`, `playerPrivate`, `predictions` y `specialPredictions`. Para que el expulsar funcione (y que **sólo el admin** pueda hacerlo), las reglas pasan a permitir borrado por admin:
- `players/{uid}`: `allow delete: if isAdmin()`.
- `playerPrivate/{uid}`: `allow delete: if isAdmin()`.
- `predictions/{predId}`: `allow delete: if isAdmin() || (dueño)` (el "dueño" es para el plan de anular predicción; acá importa el admin).
- `specialPredictions/{uid}`: `allow delete: if isAdmin() || isOwner(uid)`.

El usuario debe **re-publicar `firestore.rules`** tras implementarlo.

## Testing

Es integración con Firestore (borrados) + reglas; no hay lógica pura nueva relevante para TDD. Se valida con **QA manual**: con una 2ª cuenta de prueba registrada, el admin la expulsa y se verifica que (a) desaparece del ranking al instante, (b) en Firestore ya no están sus `players`/`playerPrivate`/`predictions`/`specialPredictions`, y (c) el admin no puede expulsarse a sí mismo. Confirmar que un no-admin no puede borrar (regla).

## Fuera de alcance

- Ban / bloqueo de reingreso.
- Editar jugadores, hacer admin a otro, etc. (otras funciones de admin, futuras).
- Gestión de jugadores en la vista desktop.

## Criterio de éxito

El admin abre la pestaña Jugadores, ve la lista real, expulsa a una cuenta de prueba (con confirmación), y esa cuenta desaparece del ranking y de Firestore. Un no-admin no puede hacerlo.
