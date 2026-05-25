# Prode Refugio — Multijugador real (Mundial 2026)

**Fecha:** 2026-05-24
**Estado:** Diseño aprobado, pendiente de plan de implementación
**Plazo duro:** El Mundial arranca el 11 de junio de 2026.

## Objetivo

Convertir el prototipo actual (frontend pulido, backend a medias) en un prode real
donde **todos los jugadores comparten un mismo juego**: cada uno entra con Google,
predice resultados, y ve un ranking global en vivo alimentado por los resultados que
confirma el staff del Refugio.

Backend en **Firebase plan gratuito (Spark)**: Firestore + Auth. **Sin Cloud Functions,
sin costos.**

## Contexto del código existente

- App React servida 100% en el navegador (React + Babel standalone por CDN). **Sin build, sin `package.json`.**
- `index.html` (3534 líneas) es el entregable real: hoy tiene **todo el código inline duplicado**
  (componentes + pantallas). Los archivos `components.jsx`, `tweaks-panel.jsx` y `screens/*.jsx`
  son las "fuentes" pero no se cargan: están clonadas adentro del HTML.
- `Prode Refugio.html` es un **clon byte-a-byte** de `index.html` (mismo hash) → se elimina.
- Capa de datos en dos niveles:
  - `app-store.js` (`ProdeStore`): localStorage offline-first + lógica de puntaje.
  - `firebase-service.js` (`ProdeDB`): escrituras a Firestore con login anónimo (a completar).
- `firebase-config.js`: proyecto real conectado (`prode-ee447`). La config web no es secreta;
  la seguridad la dan las reglas de Firestore.
- `api/live-matches.js` y `api/world-cup-schedule.js`: funciones serverless (Vercel) para API-Football.

### Problemas concretos a resolver
1. No hay multijugador real: el ranking de rivales es data fija (`window.RANKING`);
   `ProdeDB.loadRanking()` existe pero nunca se llama.
2. Login anónimo → cada dispositivo es un usuario nuevo, sin forma de recuperar la cuenta.
3. Grupos 100% demo: crear/unirse/chat no persisten.
4. Conflicto: el Admin escribe resultados a `matches` desde el cliente, pero las reglas
   sugeridas dicen `matches: write:false` → los resultados sólo viven en el localStorage local.
5. No hay cierre de predicciones por horario de inicio.
6. Datos parciales: ~15 partidos inventados; falta el fixture real (48 selecciones / 104 partidos).
7. Especiales se guardan pero nunca se puntúan.
8. Admin sin protección de acceso.
9. Duplicación inline↔fuentes: editar `screens/*.jsx` no afecta al HTML servido.

## Decisiones tomadas (brainstorming)

| Tema | Decisión |
|------|----------|
| Objetivo | Prode multijugador real (lanzable para clientes del Refugio) |
| Login | **Google sign-in** (Firebase Auth). Admin por lista blanca de emails. |
| Resultados (fuente de verdad) | **Admin confirma el resultado final** a mano. API-Football queda opcional (vivo/import). |
| Fixture | **Importar de API-Football** (botón en Admin, una vez) + alta/edición manual como respaldo. |
| Alcance v1 | Predicciones + ranking global + **cierre por horario** + **grupos privados** + **especiales puntuados**. |
| Fuera de v1 | Chat de grupos, resultados 100% automáticos, push, migración a build. |
| Arquitectura | **Camino A: sin build.** Eliminar duplicación cargando archivos externos; foco total en el backend. |

## Modelo de datos (Firestore)

```
players/{uid}
  name, photoURL, favoriteTeam, avatarTone, createdAt, updatedAt
  points, exact, winner, played            ← agregados denormalizados (para el ranking)
  specialsPoints                           ← desglose informativo; YA incluido dentro de `points`

matches/{matchId}
  phase, group, a, b
  kickoffAt (timestamp)                    ← clave para el cierre por horario
  venue, time, date
  status (abierto | vivo | finalizado)
  scoreA, scoreB
  apiFixtureId (opcional, si se importó)

predictions/{uid}_{matchId}
  uid, matchId, a, b
  points (null hasta que el partido finaliza)
  updatedAt

specialPredictions/{uid}
  campeon, subcampeon, goleador, arquero, sorpresa, decepcion
  points (null hasta el cálculo final)
  updatedAt

groups/{groupId}
  name, code (invitación, único), ownerId, memberCount, createdAt

groupMembers/{groupId}_{uid}
  groupId, uid, name, joinedAt

meta/specialsResults                       ← respuestas oficiales de especiales (las carga el admin)
  campeon, subcampeon, goleador, arquero, sorpresa, decepcion
meta/config
  specialsDeadline (timestamp)             ← cierre de especiales (default: primer kickoff)
```

## Identidad y admin

- **Login con Google** (popup, Firebase Auth). Sin sesión no se entra: pantalla **Login** nueva.
- Primer ingreso → se crea `players/{uid}` con nombre/foto de Google. Si falta `favoriteTeam`,
  se va a **completar perfil** (reusa la pantalla Register).
- **Admin = lista blanca de emails** (arranca con `barretats@gmail.com`).
  - Se valida en las **reglas de Firestore** (`request.auth.token.email in [...]`) — es la barrera real.
  - Se valida en la **UI** sólo para mostrar/ocultar el panel.

## Puntaje y ranking (núcleo)

### Reglas de puntaje (por partido)
- **5** → resultado exacto.
- **4** → acierta ganador y diferencia de goles.
- **3** → acierta ganador (o empate) sin la diferencia.
- **0** → falla.

(La lógica ya vive en `ProdeStore.scorePrediction`; se aísla en función pura testeable.)

### Fan-out de puntaje (sin Cloud Functions)
El cálculo se dispara **cuando el admin confirma un resultado**, desde el navegador del admin
(cuenta de confianza; las reglas le permiten escribir agregados de otros jugadores):

1. Escribe el resultado en `matches/{id}` (`status: finalizado`, `scoreA`, `scoreB`).
2. Lee todas las `predictions` de ese partido.
3. Calcula los puntos de cada predicción.
4. En **batch** (lotes de ≤500): escribe `points` en cada predicción y actualiza el agregado
   `points/exact/winner/played` de cada jugador usando la **diferencia** respecto al valor previo
   (`FieldValue.increment(delta)`), de modo que **corregir un resultado recalcula bien**
   (idempotente ante re-ejecuciones).

### Ranking
- **Global:** `players orderBy points desc limit 50`, en vivo con `onSnapshot`. Barato.
- **Por grupo:** leer `groupMembers` del grupo + los `points` ya denormalizados de cada miembro.

> Si en el futuro la base crece a miles de jugadores, el fan-out se migra a una Cloud Function
> (requiere plan Blaze). Hoy no hace falta.

## Cierre por horario (kickoff lock)

- Cada partido tiene `kickoffAt`. La predicción se puede crear/editar **sólo si `ahora < kickoffAt`**.
- Se valida en **dos capas**:
  - UI: inputs deshabilitados una vez pasado el kickoff (o `status != abierto`).
  - **Reglas de Firestore:** la regla de escritura de `predictions` hace `get()` del partido y exige
    `request.time < kickoffAt`. Así no se puede saltear desde la consola.

## Grupos privados

- **Crear grupo:** genera un `code` de invitación único; el creador queda como `ownerId` y primer miembro.
- **Unirse por código:** query `groups where code == X` → crea `groupMembers/{groupId}_{uid}`.
- **Ranking interno:** se arma con los `points` denormalizados de los miembros (barato).
- **Sin chat en v1.**

## Especiales

- Cada jugador guarda sus picks en `specialPredictions/{uid}`.
- Se **bloquean al llegar `meta/config.specialsDeadline`** (default: primer kickoff del Mundial).
- Al final del torneo, el admin carga las respuestas oficiales en `meta/specialsResults` y un botón
  **"Calcular especiales"** calcula `players.specialsPoints` y lo **suma dentro de `players.points`**
  (el total que usa el ranking), guardando el desglose para mostrarlo en el perfil.
- Puntaje de especiales (default, ajustable antes de implementar):
  campeón **10**, subcampeón **5**, goleador **5**, arquero **3**, sorpresa **3**, decepción **2**.

## Estructura de código y flujo (camino A — sin build)

### Cambios de estructura
- `index.html`: deja de tener código inline duplicado y **carga los archivos externos**
  (`<script type="text/babel" src="components.jsx">`, `screens/*.jsx`, etc.) → una sola fuente de verdad.
  Babel standalone transpila externos cuando se sirve por HTTP (ya se usa `npx serve`).
- Se **elimina `Prode Refugio.html`** (clon).
- `firebase-service.js` (`ProdeDB`): se completa → Google auth, CRUD real, suscripciones en vivo
  (`onSnapshot`), fan-out de puntaje, import de fixture.
- `app-store.js` (`ProdeStore`): queda como **fachada** → usa Firebase si está listo, cae a
  localStorage si no (el modo demo/offline sigue funcionando para desarrollo).
- Pantallas: pasan de lectura sincrónica a **suscribirse** y guardar en estado, así
  ranking/partidos se actualizan solos.
- **Pantalla nueva:** `Login`. `Register` se reusa como "completar perfil".
- `Admin`: gate por admin + confirmar resultado (fan-out) + **"Importar fixture"**
  (usa `api/world-cup-schedule.js`) + alta/edición manual de partidos.

### Flujo de la app
1. Carga → `ProdeDB.init()` resuelve el estado de auth de Google. Sin sesión → pantalla Login.
2. Tras login → asegura `players/{uid}`; si falta equipo favorito → completar perfil.
3. **Matches:** suscribe a `matches` + predicciones propias. Predecir → escribe
   `predictions/{uid}_{matchId}` sólo si falta el kickoff.
4. **Ranking:** suscribe a `players orderBy points desc`.
5. **Grupos:** lista grupos del jugador; crear/unirse por código; ranking interno.
6. **Especiales:** escribe `specialPredictions/{uid}` antes del deadline.
7. **Admin:** confirmar resultado → fan-out de puntos; importar/editar fixture.

### Offline / fallback
Si Firebase no está listo, se mantiene el modo localStorage single-player actual
(sirve para desarrollo y demo).

## Reglas, deploy y testing

- **`firestore.rules`** nuevo y real:
  - `players`: lectura pública; cada uno escribe su propio doc; **sólo admin** escribe los agregados
    de puntaje de otros.
  - `predictions`: lectura por signed-in; cada uno escribe la suya **y sólo antes del kickoff**;
    el campo `points` lo escribe sólo el admin.
  - `matches` y `meta`: lectura pública; escritura sólo admin.
  - `groups`/`groupMembers`: lectura/escritura por signed-in con reglas de pertenencia.
  - Probadas con el **emulador de Firestore**.
- **`vercel.json`**: servir estático + funciones `/api`. `API_FOOTBALL_KEY` como env var
  (sólo para importar fixture / vivo opcional).
- **Tests:**
  - La lógica riesgosa (puntaje + fan-out de agregados) se aísla en **funciones puras**
    y se testea con TDD (script Node mínimo, sin framework pesado).
  - Reglas de Firestore: tests contra el emulador.
  - Resto de flujos UI: **checklist de QA manual**.

## Fuera de alcance (segunda etapa)
- Chat de grupos (realtime).
- Resultados 100% automáticos por API-Football.
- Notificaciones push.
- Migración a build real (Vite + módulos).

## Criterios de éxito (v1)
- Dos personas en dos dispositivos distintos entran con Google, predicen, y **se ven en el mismo
  ranking** con puntos reales tras un resultado confirmado por el admin.
- No se puede predecir un partido ya empezado (ni desde la UI ni desde la consola).
- Un jugador crea un grupo, otro se une por código, y el ranking interno refleja a ambos.
- Los especiales se bloquean en el deadline y suman puntos cuando el admin carga las respuestas.
- El fixture real está cargado (importado o a mano) antes del 11 de junio.
