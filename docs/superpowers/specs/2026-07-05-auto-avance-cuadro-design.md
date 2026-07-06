# Auto-avance del cuadro eliminatorio — Design

**Goal:** Que al cargar el resultado de un partido de eliminación, los equipos del cruce siguiente se completen **solos** (ganador → siguiente ronda; perdedor de semis → 3er puesto), sin que nadie tenga que editar `data.js` a mano. Cubre de 32avos a la final.

## Requisito duro: NO romper ni perder datos ya cargados

El prode ya lo está jugando gente, con predicciones y resultados guardados. La feature DEBE cumplir, sí o sí:

- **Los `id` de partido no cambian** (m73–m104). Predicciones (`predictions/{uid}_{matchId}`) y resultados (`matches/{id}`) siguen apuntando a lo mismo.
- **El resolvedor solo RELLENA equipos**: nunca borra ni reemplaza un equipo ya presente, salvo por el mismo valor deducido. Si el partido que alimenta no está finalizado, deja lo que haya (equipo cargado a mano o `null`/"a definir"). ⇒ nada de lo visible hoy se pierde.
- **No toca** predicciones, resultados, puntos, agregados ni el ranking. Solo LEE resultados finalizados para deducir equipos.
- El puntaje se calcula por **marcador** (no por qué equipo era), así que aunque un cruce se rellene, las predicciones ya cargadas puntúan igual.
- `finalizeMatch` solo AGREGA el campo `advances`; no borra el marcador ni cambia el reparto de puntos existente.
- `getMatches()` con el resolvedor debe ser tolerante: si `ProdeBracket` no está cargado, devuelve los partidos como hoy (sin romperse).

## Contexto

App estática (React + Babel standalone, sin build). Los partidos salen de `ProdeStore.getMatches()` (`app-store.js`), que hoy mergea: `data.js` (`window.MATCHES`) + overrides locales + resultados de Firestore (`ProdeDB.getMatchResults()`, colección `matches`). El admin carga resultados en Admin → Resultados: edita `scoreA`/`scoreB` y confirma → `ProdeDB.finalizeMatch(id, a, b)` escribe el partido en Firestore y reparte puntos (idempotente). La eliminación ya está en `data.js` (m73–m104) con `round` (r32/r16/qf/sf/third/final); 32avos con equipos reales y rondas siguientes con `a:null,b:null`+`aLabel`/`bLabel` (o equipos ya cargados a mano). El motor de puntaje ya cuenta el resultado al final del alargue (empate válido; penales no dan/quitan puntos).

## Cableado del cuadro (estático, en `data.js`)

Cada partido de r16 a la final gana un campo `feed` con el origen de cada equipo:

```
feed: { a: { m: "<idPartido>", pick: "W" }, b: { m: "<idPartido>", pick: "W" } }
```

- `pick:"W"` = ganador de ese partido; `pick:"L"` = perdedor (solo el 3er puesto).
- Los 32avos (m73–m88) NO llevan `feed` (equipos ya definidos); el resolvedor igual calcula su ganador para alimentar los octavos.

Mapa de `feed` (según el cuadro oficial FIFA 2026):
- **Octavos:** m89 = W(m74)·W(m77) · m90 = W(m73)·W(m75) · m91 = W(m76)·W(m78) · m92 = W(m79)·W(m80) · m93 = W(m83)·W(m84) · m94 = W(m81)·W(m82) · m95 = W(m86)·W(m88) · m96 = W(m85)·W(m87)
- **Cuartos:** m97 = W(m89)·W(m90) · m98 = W(m93)·W(m94) · m99 = W(m91)·W(m92) · m100 = W(m95)·W(m96)
- **Semis:** m101 = W(m97)·W(m98) · m102 = W(m99)·W(m100)
- **3er puesto:** m103 = L(m101)·L(m102)
- **Final:** m104 = W(m101)·W(m102)

## Ganador / perdedor de un partido

Función pura sobre un partido ya con equipos (`a`,`b`) y resultado:
- No finalizado (`status !== "finalizado"` o sin `scoreA`/`scoreB`) → ganador y perdedor `null`.
- `scoreA > scoreB` → gana `a`; `scoreB > scoreA` → gana `b`.
- Empate → gana `advances` si está seteado y es igual a `a` o `b`; si no, ganador `null` (queda "a definir" hasta que el admin marque quién pasó).
- Perdedor = el equipo que no ganó (si el ganador se conoce).

## El resolvedor — `lib/bracket.js` (lógica pura, testeada)

`resolveBracket(matches)` recibe el array de partidos ya mergeado (con resultados) y devuelve **una copia** con los equipos de eliminación completados donde se pueda:

- Recorre en orden de ronda (r32 → r16 → qf → sf → third/final) para que los ganadores de una ronda estén disponibles al resolver la siguiente.
- Para cada partido con `feed`: si el equipo actual (`a`/`b`) está vacío (`null`/`""`), intenta setearlo con el ganador/perdedor del partido origen (ya resuelto). **Si ya hay un equipo cargado, NO lo pisa** (respeta lo cargado a mano; a lo sumo coincide).
- Nunca vacía un equipo existente. Devuelve el resto de campos intactos.
- Exporta `resolveBracket`, `matchWinner(match)`, `matchLoser(match)` en `window.ProdeBracket` (+ `module.exports`).

`FEED` (el mapa de arriba) vive en `data.js` junto a `MATCHES` (dato del torneo), y el resolvedor lo lee de cada `match.feed`. Así la lógica es genérica y testeable con fixtures.

## Integración — `app-store.js → getMatches()`

Tras el merge actual, se pasa por el resolvedor:

```
const merged = MATCHES.map(m => ({ ...m, ...override, ...remote }));
return window.ProdeBracket ? window.ProdeBracket.resolveBracket(merged) : merged;
```

Toda la app (MatchRow, predicciones, scoring, Admin) consume `getMatches()`, así que los equipos resueltos se ven en todos lados sin más cambios. `index.html` carga `lib/bracket.js` **antes** de `app-store.js`.

## Capa de datos — `finalizeMatch(id, scoreA, scoreB, advances?)`

`firebase-service.js`: `finalizeMatch` acepta un 4º parámetro opcional `advances` (código del equipo que pasó por penales). Se escribe en el doc `matches/{id}` junto al marcador (merge; no borra nada). El reparto de puntos no cambia. La versión local (`ProdeStore.saveMatchResult`) guarda `advances` en el override igual.

Reglas Firestore: `matches` ya es escribible solo por admin; agregar el campo `advances` no requiere cambio de reglas (el admin escribe el doc completo). Se verifica en el plan.

## UI de carga — Admin (mobile `screens/Admin.jsx` + `DesktopAdmin` en `app.jsx`)

En la fila de carga de un partido de **eliminación** (`match.round` presente) con ambos equipos conocidos: si el marcador tipeado es empate (`scoreA === scoreB`, ambos no vacíos), se muestra un mini-selector **"¿Quién avanzó (penales)?"** con los 2 equipos (chips). Al confirmar, se pasa `advances` a `finalizeMatch`. Si el marcador tiene ganador claro, el selector no aparece y `advances` va vacío. El selector recuerda el `advances` ya guardado del partido (para corregir).

## Estado actual que queda como respaldo

Lo ya cargado a mano (octavos con equipos, m97 Francia–Marruecos, m99 Noruega–Inglaterra) se mantiene. El resolvedor solo completará m98/m100 y rondas siguientes cuando el admin finalice en la app los partidos que los alimentan. Como el resolvedor no pisa equipos existentes, la transición es invisible.

## Tests (`lib/bracket.test.js`)

- `matchWinner`/`matchLoser`: marcador decisivo; empate con `advances`; empate sin `advances` → null; partido no finalizado → null.
- `resolveBracket`:
  - Rellena un octavo desde dos 32avos finalizados (ganadores correctos).
  - Cadena de dos rondas (r32 → r16 → qf) se resuelve en un solo llamado.
  - 3er puesto toma los **perdedores** de las semis.
  - Empate por penales: el que pasa es `advances`.
  - **No pisa** un equipo ya cargado a mano aunque el feeder esté finalizado.
  - Feeder sin jugar → el cruce queda con `a:null` (no revienta).
  - Nunca vacía un equipo existente; no muta el array de entrada.

## Fuera de alcance

- Grupos → 32avos (mejores terceros): sigue manual.
- No se dibuja un bracket visual; los partidos se ven en la lista de Predicciones.
- No se automatiza el goleador/arquero ni otros especiales.
