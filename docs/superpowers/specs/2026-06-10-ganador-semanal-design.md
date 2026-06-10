# Ganador semanal automático — Diseño

**Fecha:** 2026-06-10
**Estado:** Diseño aprobado, pendiente de plan de implementación

## Objetivo

La app calcula automáticamente **quién hizo más puntos cada semana del torneo** para el premio semanal rotativo (burger o desayuno, ya definido en `window.PRIZES.weekly`). El Ranking muestra el líder de la semana en curso y el historial de ganadores de semanas cerradas.

## Decisiones tomadas (brainstorming)

- **Semana = semana del torneo**: Semana 1 = jue 11 jun → mié 17 jun 2026, Semana 2 = jue 18 → mié 24, y así cada 7 días. La semana de un partido se deriva de su `kickoffAt` (hora Costa Rica, −06:00) — **no** de la fecha en que el admin carga el resultado.
- **Empate**: gana el que tuvo **más resultados exactos esa semana**. Si persiste el empate, la app muestra a todos los empatados como ganadores compartidos y el bar resuelve.
- **Historial**: sí — lista "Ganadores semanales" de las semanas ya cerradas, debajo del destacado de la semana actual.

## Arquitectura (enfoque elegido: buckets semanales en `players/{uid}`)

### Datos

Cada doc `players/{uid}` gana un mapa opcional:

```
weekly: {
  s1: { points: 12, exact: 2 },
  s2: { points: 7,  exact: 1 },
  ...
}
```

- Lo escribe **el mismo batch del fan-out** de `finalizeMatch`: junto con los incrementos de `points/exact/winner/played` totales, se agrega `weekly.s{N}.points: increment(delta.points)` y `weekly.s{N}.exact: increment(delta.exact)` donde `N` = semana del partido.
- **Idempotencia**: los deltas vienen de `scoreMatchFanout` que ya descuenta el puntaje previo de cada predicción; re-confirmar un resultado no duplica ni el total ni el bucket semanal.
- **Sin reglas nuevas**: es el mismo doc `players` que el fan-out ya escribe como admin. No hay que republicar `firestore.rules`.
- **Sin lecturas nuevas**: el Ranking ya se suscribe a `players` (`subscribeRanking`); los buckets viajan en el mismo snapshot.

Se descartaron: colección aparte `weeklyScores` (más escrituras, reglas nuevas, otra suscripción) y cálculo cliente desde `predictions` (las predicciones ajenas no son legibles).

### Lógica pura — `lib/weekly.js` (dual navegador/Node, con tests)

- `TOURNAMENT_START` = `2026-06-11T00:00:00-06:00` (constante interna).
- `weekIdForDate(isoDate)` → `"s1"`, `"s2"`, ... — `floor((fecha − inicio) / 7 días) + 1`, calculado en horario Costa Rica. Fechas anteriores al inicio → `"s1"` (clamp; no debería pasar con el fixture real).
- `currentWeekId(now)` → semana en curso para `Date.now()`. Si `now` es anterior al torneo → `"s1"`; si es posterior al fin (19 jul) → la última semana del torneo.
- `weekLabel(weekId)` → `"Semana 1 · 11–17 jun"` (rango de fechas legible para la UI).
- `weeklyLeaders(players, weekId)` → array de líderes de esa semana: ordena por `weekly[weekId].points` desc, desempata por `weekly[weekId].exact` desc, y devuelve **todos los empatados en el primer puesto** (1 elemento si hay ganador único, varios si comparten, vacío si nadie sumó). Cada elemento: `{ id, name, points, exact }`.
- `weeklyHistory(players, currentWeek)` → para cada semana cerrada (`s1 .. s(actual−1)`) con al menos un jugador con puntos, sus ganadores (mismo criterio). Semanas sin puntos se omiten.

`finalizeMatch` obtiene el `kickoffAt` del partido desde `window.MATCHES` (fixture estático en `data.js`, fuente de los horarios) y llama `weekIdForDate`.

### UI — `screens/Ranking.jsx`

Después del podio y la frase, antes de la tarjeta "Sos vos", una sección **"Premio de la semana"**:

1. **Tarjeta líder de la semana en curso**: eyebrow con `weekLabel` + premio (`PRIZES.weekly.reward`), nombre/avatar del líder (o líderes empatados) y sus puntos de la semana. Estado vacío honesto: "Nadie sumó puntos esta semana todavía."
2. **Historial "Ganadores semanales"**: lista compacta `Semana N → nombre (pts)` para semanas cerradas. Si no hay ninguna cerrada con puntos, la lista no se muestra.

Reutiliza componentes existentes (`Eyebrow`, `Avatar`, `Card`). Nada de datos demo.

## Casos borde

- **Resultado cargado tarde** (p. ej. el jueves se confirma un partido del miércoles): suma a la semana del partido (kickoff), no a la actual. Correcto por diseño.
- **Jugadores sin `weekly`** (registrados antes de este cambio o sin puntos): el mapa falta → cuentan 0 esa semana. La lógica pura tolera `weekly` ausente.
- **Puntos repartidos antes de este cambio**: no tienen bucket semanal y no entran al semanal. Hoy no hay resultados reales confirmados, así que no afecta. Si llegara a pasar, re-confirmar el resultado desde Admin recompone (el fan-out es idempotente).
- **Expulsar jugador**: borra el doc completo, buckets incluidos — desaparece también del semanal. Coherente con el comportamiento actual.

## Testing

TDD con `node --test` en `lib/weekly.test.js`: límites de semana (mié 23:59 vs jue 00:00 hora CR), clamp antes/después del torneo, líder único, empate resuelto por exactos, empate persistente (comparten), semanas vacías omitidas en historial, `weekly` ausente. La integración del fan-out (`finalizeMatch`) se valida con QA manual: confirmar un resultado y ver el bucket en Firestore + la tarjeta en el Ranking.

## Fuera de alcance

- Marcar/badgear al "Rey del Refugio" automáticamente (el badge `rey` sigue siendo decorativo).
- Notificar al ganador.
- Elegir si la semana toca burger o desayuno (eso lo anuncia el bar; la app muestra "burger o desayuno").
- Migración de puntos históricos a buckets (no hay datos reales que migrar).

## Criterio de éxito

El admin confirma resultados de partidos de la semana 1; el Ranking muestra al líder de la Semana 1 con sus puntos semanales. Al pasar al jueves siguiente, la Semana 1 aparece en el historial con su ganador (o ganadores empatados) y la tarjeta pasa a la Semana 2. Re-confirmar un resultado no duplica puntos semanales.
