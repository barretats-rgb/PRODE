# Badge de mensajes sin leer en el ícono de Chat — Design

**Goal:** Mostrar un globito rojo con la cantidad de mensajes sin leer sobre el ícono de Chat de la navegación (barra lateral en desktop y barra inferior en mobile), para que la gente entre a leer el chat cuando hay novedades.

## Contexto

App estática (React + Babel standalone, sin build), Firebase (Auth + Firestore, Spark, sin Cloud Functions). El chat global vive en `screens/Chat.jsx` y se suscribe a `ProdeDB.subscribeMessages` **solo mientras la pestaña Chat está montada**. La navegación se arma en `app.jsx`: `NAV_ITEMS` (incluye `{ screen:"chat", label:"Chat", icon:"message-circle" }`), `AppNav` (sidebar desktop) y `MobileBottomNav` (barra inferior). Cada ítem renderiza `<i data-lucide={icon}>` + label. La lógica pura de chat vive en `lib/chat.js` (`validMessage`, `MAX_LEN`), testeada en `lib/chat.test.js`.

## Qué cuenta como "no leído"

Un mensaje está sin leer si:
- su `createdAt` es **posterior** a la última lectura del usuario (`lastReadMs`), y
- **no es propio** (`uid !== myUid`): uno no se notifica a sí mismo.

`createdAt` puede venir como Timestamp de Firestore (`.toMillis()`), número (ms) o ISO; se normaliza a ms.

## Persistencia de "última lectura"

`localStorage`, **por dispositivo**, con clave por usuario: `prode_chat_lastread_<uid>`. No toca `firestore.rules` ni agrega lecturas/escrituras a Firestore.

- **Primera vez (sin valor guardado para ese uid):** se inicializa en `Date.now()` y se persiste, así no aparece un badge inflado por todo el historial. A partir de ahí cuenta lo nuevo.
- Decisión consciente: el contador se limpia en el dispositivo donde se abre el chat (no cross-device). Adecuado para un chat de bar.

## Suscripción global (de dónde sale el contador)

`App` agrega **una** suscripción liviana a los últimos ~30 mensajes mientras hay sesión (`auth.user` presente), vía el `ProdeDB.subscribeMessages(cb, 30)` existente. Es un único listener para toda la app; convive con el de la pantalla Chat (queries separadas, costo despreciable para la escala del bar). Con esos mensajes + `lastReadMs` + `myUid` se calcula el contador.

## Cuándo se marca como leído

- Al entrar a la pestaña Chat (`screen === "chat"`): `lastReadMs` = timestamp del mensaje más nuevo conocido (o `Date.now()` si no hay mensajes), y se persiste.
- Mientras se está **dentro** del Chat, cada vez que llegan mensajes nuevos se vuelve a avanzar `lastReadMs` (el badge no aparece estando adentro).
- El mini-chat del home (`ChatPreview`) **no** marca leído: es un adelanto; "leer" es abrir la pestaña.

## Lógica pura (`lib/chat.js`)

Se agregan dos funciones puras (más un helper interno de normalización de fecha), exportadas en `window.ProdeChat` y por `module.exports`:

- `countUnread(messages, lastReadMs, myUid)` → entero. Cuenta los `messages` con `createdAtMs > lastReadMs` y `uid !== myUid`. `messages` nulo/`[]` → `0`. `lastReadMs` no finito → se trata como `0` (todo posterior cuenta).
- `formatBadge(n)` → string para el globito: `""` si `n <= 0`, `"9+"` si `n > 9`, si no `String(n)`.

Helper interno `msOf(createdAt)` que devuelve ms desde Timestamp/número/ISO (0 si no parsea).

## UI (`app.jsx`)

- `App` calcula `unread = ProdeChat.countUnread(chatMessages, lastReadMs, myUid)` y lo pasa a `AppNav` y `MobileBottomNav` (prop `unread`).
- En ambos navs, para el ítem `chat`, si `unread > 0` se renderiza un globito rojo posicionado arriba a la derecha del ícono, con el texto de `ProdeChat.formatBadge(unread)`. El ícono se envuelve en un contenedor `position:relative` y el badge va `position:absolute`.
- El badge se oculta si `unread === 0` **o** si `screen === "chat"` (ya estás leyendo). Para esto `App` puede pasar `unread = 0` cuando `screen === "chat"`, o los navs ocultarlo; se elige que `App` no muestre badge en la pantalla Chat (un solo lugar de decisión).
- Color del globito: rojo de alerta (`var(--neon-coral)` no es rojo puro; se usa un rojo de notificación, p. ej. `#E5484D`), texto claro, fuente chica y bold.

## Tests (`lib/chat.test.js`)

- `countUnread`: cuenta solo posteriores a `lastReadMs`; excluye los propios (`myUid`); soporta `createdAt` Timestamp/ISO/número; lista vacía/nula → 0; `lastReadMs` no finito → cuenta todos los ajenos.
- `formatBadge`: `0 → ""`, `1..9 → "1".."9"`, `>9 → "9+"`, negativo → `""`.

## Fuera de alcance

- Notificaciones push del sistema operativo (esto es solo un badge en la nav dentro de la app).
- Sincronización cross-device de "leído".
- Marcar leído desde el mini-chat del home.
