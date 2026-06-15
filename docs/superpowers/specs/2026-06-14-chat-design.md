# Chat global de la barra — Diseño

**Fecha:** 2026-06-14
**Estado:** Diseño aprobado, pendiente de plan de implementación

## Objetivo

Un **chat global** para que los jugadores del prode se tiren mensajes durante el Mundial (el ambiente del bar). Un solo canal para toda la barra.

## Decisiones tomadas (brainstorming)

- **Chat global** (no por partido ni por grupo). Los grupos privados todavía no existen.
- **Moderación**: el admin puede borrar cualquier mensaje; un jugador **expulsado no puede escribir** (la regla exige que exista su doc `players/{uid}`). Freno anti-spam simple del lado del cliente.
- **Costo acotado**: el chat se conecta **sólo cuando el usuario está en la pestaña Chat** (al salir, se desconecta) y muestra los **últimos 50** mensajes. Mantiene bajas las lecturas de Firestore (plan gratis).
- **Navegación**: la pestaña **"Grupos"** (hoy un placeholder "próximamente") se **reemplaza por "Chat"**. Grupos vuelve cuando se construya de verdad.

## Arquitectura

### Datos — colección `messages/{autoId}`

```
{ uid, name, avatarTone, text, createdAt }   // createdAt = serverTimestamp()
```

- `uid`/`name`/`avatarTone`: del autor (para mostrar avatar + nombre sin leer su doc).
- Se suscribe a los últimos 50: `orderBy("createdAt","desc").limit(50)`, y la UI los invierte a orden cronológico (viejo → nuevo).

### Reglas — `firestore.rules`, nuevo bloque `messages/{id}`

```
match /messages/{id} {
  allow read: if isSignedIn();
  // Sólo tu propio mensaje, con texto válido, y SÓLO si tenés doc de jugador
  // (expulsado = sin players/{uid} → no puede escribir). createdAt obligatorio.
  allow create: if isSignedIn()
    && request.resource.data.uid == request.auth.uid
    && exists(/databases/$(database)/documents/players/$(request.auth.uid))
    && request.resource.data.text is string
    && request.resource.data.text.size() > 0
    && request.resource.data.text.size() <= 500
    && request.resource.data.keys().hasOnly(['uid','name','avatarTone','text','createdAt']);
  allow update: if false;          // no se editan
  allow delete: if isAdmin();      // moderación
}
```

**Requiere republicar `firestore.rules`.** (Hoy `messages` está denegado por defecto.)

*Nota honesta:* el rate-limit real no se hace en reglas (requeriría más infra). Se mitiga con un freno del lado del cliente (no enviar dos mensajes en < 1s, deshabilitar el botón mientras se envía) + el admin borra. Para un bar alcanza.

### Lógica pura — `lib/chat.js` (dual navegador/Node, testeada)

- `MAX_LEN = 500`.
- `validMessage(text)` → `{ ok, text }`: `trim`, colapsa espacios extremos, rechaza vacío y recorta a 500. Devuelve `{ ok:false }` si queda vacío, `{ ok:true, text }` si sirve.

### Capa de datos — `firebase-service.js`

- `subscribeMessages(cb, max = 50)` → onSnapshot de `messages` (desc, limit max); cb recibe el array **en orden cronológico** (`{ id, uid, name, avatarTone, text, createdAt }`). Devuelve unsub. Sin `state.ready` → `cb([])` y unsub no-op.
- `sendMessage(text)` → valida con `ProdeChat.validMessage`; si ok, escribe `{ uid, name, avatarTone, text, createdAt: firestoreNow() }` con uid/name/avatarTone del jugador actual (`state.player`). No-op si no hay sesión o el texto es inválido.
- `deleteMessage(id)` (admin) → borra el doc.

### UI — `screens/Chat.jsx` + nav

- Pantalla `Chat`: se **suscribe en `useEffect` al montar** (entrar a la pestaña) y se **desuscribe al desmontar** (salir) → lecturas sólo mientras se mira el chat.
- Lista scrollable, **auto-scroll al último** mensaje cuando llegan nuevos. Cada mensaje: avatar (tono del autor) + nombre + texto + hora (HH:MM). Los mensajes propios (uid == el mío) se alinean/resaltan distinto.
- Input de texto + botón enviar; **Enter envía**. Freno: botón deshabilitado si está vacío o si se envió hace < 1s. Limpia el input al enviar.
- **Admin**: ícono de tacho en cada mensaje (sólo visible para admin) → `deleteMessage`.
- Estado vacío honesto: "Todavía no hay mensajes. Rompé el hielo."
- Estado sin sesión / Firebase no listo: mensaje de que el chat necesita conexión (no debería pasar; el chat vive detrás del gate de login).

- **Navegación** (`app.jsx`): en `SCREENS` y `NAV_ITEMS`, reemplazar la entrada `groups` por `chat` (`{ screen:"chat", label:"Chat", icon:"message-circle" }`). El `Groups`/`screens/Groups.jsx` queda en el repo pero sin entrada de nav (vuelve con el plan de grupos). El `tab` del SCREENS de `specials` u otros no cambia.

## Costo (Firestore, plan gratis)

Con "sólo al abrir + últimos 50": cada persona que mira el chat lee ~50 docs al entrar + 1 por mensaje nuevo mientras mira. En un partido lleno suma, pero queda muy por debajo de un chat siempre conectado. El límite de 50 + la suscripción on-demand son las dos palancas de control. Si en algún momento molesta, se puede subir el intervalo o bajar el límite.

## Casos borde

- **Jugador expulsado**: su `players/{uid}` ya no existe → la regla `exists(...)` lo bloquea para escribir (puede leer). Coherente con el Expulsar.
- **Mensaje muy largo / vacío / solo espacios**: `validMessage` lo recorta/rechaza antes de escribir; la regla lo vuelve a validar server-side (size 1..500).
- **Reloj del cliente**: `createdAt` usa `serverTimestamp()`, así el orden no depende del reloj del celular.
- **Spam**: freno cliente (1s + botón deshabilitado al enviar). No es a prueba de balas server-side; el admin borra.
- **Sin la regla republicada**: enviar falla con permission-denied (visible en consola). Hay que republicar.

## Fuera de alcance

- Chat por grupo / por partido.
- Notificaciones push de mensajes nuevos.
- Reacciones, responder, editar, adjuntar imágenes.
- Rate-limit server-side estricto.
- Lista negra de palabras / filtro automático.

## Testing

- `lib/chat.test.js` (TDD): `validMessage` — vacío, sólo espacios, normal, exactamente 500, > 500 (recorta), no-string. `MAX_LEN`.
- Integración (QA manual del usuario, con la regla republicada): dos cuentas envían y se ven en vivo; el admin borra un mensaje; un expulsado no puede escribir; mensaje > 500 se recorta.

## Criterio de éxito

Dos personas con la app abierta en la pestaña Chat se mandan mensajes y los ven aparecer en vivo, con su nombre y avatar. El admin borra un mensaje y desaparece para todos. Al salir de la pestaña, el chat se desconecta (no sigue leyendo). Un jugador expulsado no puede escribir.
