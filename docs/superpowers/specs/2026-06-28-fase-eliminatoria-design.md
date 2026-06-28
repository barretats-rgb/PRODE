# Fase eliminatoria del Mundial 2026 — Design

**Goal:** Cargar los 32 partidos de la fase eliminatoria (Ronda de 32 → Final) en el prode para que la gente los prediga, con el cierre de cada predicción en hora de Costa Rica. La Ronda de 32 va con equipos reales (ya definidos); de Octavos a la Final, con equipos "a definir" hasta que el cuadro avance.

## Contexto

App estática (React + Babel standalone, sin build). Los partidos viven en `window.MATCHES` (`data.js`), cada uno: `{ id, phase, group?, date, time, venue, kickoffAt, a, b, status, featured? }`. `a`/`b` son códigos de `TEAMS`; el nombre sale de `TEAMS[code]` y la bandera de `FLAG(code)`. `screens/Matches.jsx` agrupa por `m.date` (en orden de inserción del array) y colapsa los días ya jugados. `components.jsx → MatchRow` renderiza cada partido (bandera + nombre + `NumStepper` para predecir). El cierre por horario ya existe: `ProdeScoring.isLocked(match, now)` bloquea la edición al llegar el `kickoffAt`. El motor de puntaje (`lib/scoring.js`) ya puntúa eliminación: cuenta el resultado al final del alargue (penales no), así que **el empate es un resultado válido**. `finalizeMatch` asigna la semana por `kickoffAt` (las fechas de eliminación caen en s3–s6, dentro del rango s1–s6).

## Horarios (cierre de la predicción)

El cierre de cada predicción es su `kickoffAt`. Todos los horarios se guardan en **hora de Costa Rica (UTC−6, sin DST)**. Conversión usada: en verano boreal el Este de EE.UU. es ET = UTC−4, y CR = UTC−6, por lo tanto **CR = ET − 2h**. Las sedes de México (Azteca, Monterrey) ya están en hora central (UTC−6) = CR. Cada hora local se pasó a UTC y de ahí a CR.

## Datos — Ronda de 32 (equipos reales)

16 partidos, 28 jun–3 jul 2026. `phase:"RONDA DE 32"`, `round:"r32"`, `status:"abierto"`, `a`/`b` con códigos reales de `TEAMS`.

| id | Fecha (CR) | Hora CR | Sede | a | b |
|----|-----------|---------|------|---|---|
| m73 | Dom 28 Jun | 13:00 | Inglewood | RSA | CAN |
| m76 | Lun 29 Jun | 11:00 | Houston | BRA | JPN |
| m74 | Lun 29 Jun | 14:30 | Foxborough | GER | PAR |
| m75 | Lun 29 Jun | 19:00 | Estadio BBVA, Monterrey | NED | MAR |
| m78 | Mar 30 Jun | 11:00 | Arlington | CIV | NOR |
| m77 | Mar 30 Jun | 15:00 | East Rutherford | FRA | SWE |
| m79 | Mar 30 Jun | 19:00 | Estadio Azteca, CDMX | MEX | ECU |
| m80 | Mié 01 Jul | 10:00 | Atlanta | ENG | COD |
| m82 | Mié 01 Jul | 14:00 | Seattle | BEL | SEN |
| m81 | Mié 01 Jul | 18:00 | Santa Clara | USA | BIH |
| m84 | Jue 02 Jul | 13:00 | Inglewood | ESP | AUT |
| m83 | Jue 02 Jul | 17:00 | Toronto | POR | CRO |
| m85 | Jue 02 Jul | 21:00 | Vancouver | SUI | ALG |
| m88 | Vie 03 Jul | 12:00 | Arlington | AUS | EGY |
| m86 | Vie 03 Jul | 16:00 | Miami | ARG | CPV |
| m87 | Vie 03 Jul | 19:30 | Kansas City | COL | GHA |

Todos los códigos existen en `TEAMS` (RSA, CAN, BRA, JPN, GER, PAR, NED, MAR, CIV, NOR, FRA, SWE, MEX, ECU, ENG, COD, BEL, SEN, USA, BIH, ESP, AUT, POR, CRO, SUI, ALG, AUS, EGY, ARG, CPV, COL, GHA).

## Datos — Octavos a Final (equipos "a definir")

16 partidos, 4–19 jul. `a:null, b:null` + `aLabel`/`bLabel` describiendo el origen. `round` indica la ronda.

**Octavos de final** (`phase:"OCTAVOS DE FINAL"`, `round:"r16"`) — etiqueta específica con el cruce de 32avos que lo alimenta (esos equipos ya se conocen):

| id | Fecha (CR) | Hora CR | Sede | aLabel | bLabel |
|----|-----------|---------|------|--------|--------|
| m90 | Sáb 04 Jul | 11:00 | Houston | Ganador RSA–CAN | Ganador NED–MAR |
| m89 | Sáb 04 Jul | 15:00 | Philadelphia | Ganador GER–PAR | Ganador FRA–SWE |
| m91 | Dom 05 Jul | 14:00 | East Rutherford | Ganador BRA–JPN | Ganador CIV–NOR |
| m92 | Dom 05 Jul | 18:00 | Estadio Azteca, CDMX | Ganador MEX–ECU | Ganador ENG–COD |
| m93 | Lun 06 Jul | 13:00 | Arlington | Ganador POR–CRO | Ganador ESP–AUT |
| m94 | Lun 06 Jul | 18:00 | Seattle | Ganador USA–BIH | Ganador BEL–SEN |
| m95 | Mar 07 Jul | 10:00 | Atlanta | Ganador ARG–CPV | Ganador AUS–EGY |
| m96 | Mar 07 Jul | 14:00 | Vancouver | Ganador SUI–ALG | Ganador COL–GHA |

**Cuartos de final** (`phase:"CUARTOS DE FINAL"`, `round:"qf"`) — etiqueta genérica (los equipos dependen de octavos):

| id | Fecha (CR) | Hora CR | Sede | aLabel | bLabel |
|----|-----------|---------|------|--------|--------|
| m97 | Jue 09 Jul | 14:00 | Foxborough | Ganador de octavos | Ganador de octavos |
| m98 | Vie 10 Jul | 13:00 | Inglewood | Ganador de octavos | Ganador de octavos |
| m99 | Sáb 11 Jul | 15:00 | Miami | Ganador de octavos | Ganador de octavos |
| m100 | Sáb 11 Jul | 19:00 | Kansas City | Ganador de octavos | Ganador de octavos |

**Semifinales** (`phase:"SEMIFINAL"`, `round:"sf"`):

| id | Fecha (CR) | Hora CR | Sede | aLabel | bLabel |
|----|-----------|---------|------|--------|--------|
| m101 | Mar 14 Jul | 13:00 | Arlington | Ganador de cuartos | Ganador de cuartos |
| m102 | Mié 15 Jul | 13:00 | Atlanta | Ganador de cuartos | Ganador de cuartos |

**Tercer puesto** (`phase:"3ER PUESTO"`, `round:"third"`):

| id | Fecha (CR) | Hora CR | Sede | aLabel | bLabel |
|----|-----------|---------|------|--------|--------|
| m103 | Sáb 18 Jul | 15:00 | Miami | Perdedor de semifinal | Perdedor de semifinal |

**Final** (`phase:"FINAL"`, `round:"final"`, `featured:true`):

| id | Fecha (CR) | Hora CR | Sede | aLabel | bLabel |
|----|-----------|---------|------|--------|--------|
| m104 | Dom 19 Jul | 13:00 | East Rutherford | Ganador de semifinal | Ganador de semifinal |

## Orden de inserción

Los partidos se agregan al final de `window.MATCHES` **en orden cronológico por `kickoffAt`** (el orden exacto de las tablas de arriba, no por número de partido), porque `Matches.jsx` genera los grupos de fecha en el orden de aparición en el array. Así la fase eliminatoria aparece después de la fase de grupos y en orden de día/hora.

## Lógica pura (`lib/scoring.js`)

Nueva función `teamsKnown(match)` → `true` si ambos equipos son códigos reales (`!!(match.a && match.b)`), `false` si alguno es "a definir" (`null`/vacío). Testeada. La usa la UI para decidir si se puede predecir.

## UI (`components.jsx → MatchRow`)

Manejo de equipos "a definir":
- **Bandera:** si el equipo no tiene código real, en vez de `<Flag>` se muestra un círculo neutro con "?" (mismo tamaño 32).
- **Nombre:** `TEAMS[m.a]` si hay código real; si no, el `m.aLabel` (en una tipografía algo más chica para que entre, sin el código de 3 letras debajo).
- **Predicción:** si `!teamsKnown(match)`, los `NumStepper` se reemplazan por un cartel breve *"Se habilita cuando se conozcan los equipos"* (no se puede predecir sin equipos). Cuando ya tienen equipos reales, se predice normal y el cierre sigue siendo el `kickoffAt`.
- El resto (encabezado de fase, fecha/sede, estado) no cambia.

## Puntaje y semanal

Sin cambios. El motor (`scorePrediction`) ya puntúa cualquier partido `finalizado` (5 exacto / +1 diferencia / 3 ganador / 0), y en eliminación cuenta el resultado al final del alargue (empate válido). `finalizeMatch` asigna la semana por `kickoffAt`; las fechas de eliminación (28 jun–19 jul) caen en s3–s6.

## Mantenimiento (fuera de implementación, operativo)

A medida que el cuadro avanza, se actualizan en `data.js` los partidos "a definir": se reemplazan `a:null`/`aLabel` por el código real del equipo clasificado. Es un cambio de datos por ronda. No requiere cambios de código ni de reglas.

## Fuera de alcance

- No se construye un panel de admin para asignar los equipos del cuadro (se editan en `data.js`).
- No se dibuja un bracket visual (llaves); los partidos se ven en la lista de Predicciones como el resto.
- No cambian `firestore.rules` ni el motor de puntaje.

## Tests

- `lib/scoring.test.js`: `teamsKnown` → `true` con dos códigos, `false` si `a` o `b` es `null`/`""`.
- Verificación de datos: `node -e` que cargue `data.js` y confirme que hay 104 partidos, que los 32 de eliminación tienen `kickoffAt` válido en `-06:00`, y que los de r32 tienen `a`/`b` en `TEAMS`.
