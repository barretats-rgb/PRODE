# Registro/login con usuario y contraseña — Diseño

**Fecha:** 2026-06-14
**Estado:** Diseño aprobado, pendiente de plan de implementación

## Objetivo

Permitir entrar al prode **sin Google**: crear una cuenta con **usuario + contraseña + confirmar contraseña**, y luego completar el perfil (incluido el teléfono) con el asistente que ya existe. El ingreso con Google se mantiene como opción.

## Decisiones tomadas (brainstorming)

- **Usuario, sin email visible ni recuperación.** Firebase Auth requiere email, así que el usuario se mapea a un email sintético interno (`<usuario>@prode-refugio.app`) que el jugador nunca ve ni escribe. Si olvida la contraseña, no hay recuperación automática: la resetea el admin desde la consola de Firebase.
- **Se mantienen ambos métodos.** El Login muestra "Entrar con Google" y, además, login/registro con usuario y contraseña.
- **El teléfono se pide en el asistente de perfil existente** (Register: nombre, WhatsApp, equipo favorito), que ya corre tras crear la cuenta (gate de App sin `favoriteTeam`).

## Arquitectura

### Lógica pura — `lib/auth-username.js` (dual navegador/Node, testeada)

- `EMAIL_DOMAIN = "prode-refugio.app"` (dominio sintético; no necesita resolver, sólo formar un email válido para Firebase).
- `normalizeUsername(u)` → minúsculas, `trim`, colapsa espacios internos a nada, deja sólo `[a-z0-9._-]`. Devuelve `""` si no queda nada.
- `usernameToEmail(u)` → `normalizeUsername(u) + "@" + EMAIL_DOMAIN`. Si el usuario normaliza a `""`, devuelve `""` (inválido).
- `validateUsername(u)` → `{ ok, error }`: el usuario **normalizado** debe tener 3–20 caracteres. Errores: vacío → "Elegí un usuario."; <3 → "El usuario es muy corto (mínimo 3)."; >20 → "El usuario es muy largo (máximo 20)."
- `validateSignup(usuario, pass, pass2)` → `{ ok, error }`: valida usuario (vía `validateUsername`); `pass` string de ≥6 → si no "La contraseña necesita al menos 6 caracteres."; `pass === pass2` → si no "Las contraseñas no coinciden." Primer error que aparezca.
- `validateLogin(usuario, pass)` → `{ ok, error }`: usuario y pass no vacíos → si no "Completá usuario y contraseña."

### Capa de datos — `firebase-service.js`

- `signUpWithUsername(usuario, pass)`:
  - Valida con `ProdeAuthUsername.validateSignup(usuario, pass, pass)` (la confirmación la valida la UI antes; acá se revalida usuario+pass). Si inválido, throw con el mensaje.
  - `email = usernameToEmail(usuario)`.
  - `await state.auth.createUserWithEmailAndPassword(email, pass)`.
  - `await cred.user.updateProfile({ displayName: usuario })` (se guarda el usuario tal cual lo tipeó, para mostrar). `onAuthStateChanged` luego corre `ensurePlayer`, que crea `players/{uid}` con `name = displayName`.
  - Errores Firebase traducidos: `auth/email-already-in-use` → "Ese usuario ya existe."; `auth/weak-password` → "La contraseña necesita al menos 6 caracteres."; otros → "No se pudo crear la cuenta. Probá de nuevo."
- `signInWithUsername(usuario, pass)`:
  - `email = usernameToEmail(usuario)`; `await state.auth.signInWithEmailAndPassword(email, pass)`.
  - Errores: `auth/wrong-password` | `auth/user-not-found` | `auth/invalid-credential` → "Usuario o contraseña incorrectos."; otros → "No se pudo entrar. Probá de nuevo."
- Ambas requieren `state.ready` (Firebase configurado); si no, throw "Firebase no está configurado."
- Se exponen en `window.ProdeDB`.

`ensurePlayer` ya usa `user.displayName || "Jugador"` como nombre, así que el usuario aparece como nombre inicial. El `email` del usuario sintético se guarda en `playerPrivate` igual que hoy (no es PII real, pero no molesta).

### UI — `screens/Login.jsx`

Tres "modos" en un único estado local `mode` (`"home" | "login" | "signup"`):
- **home** (default): el branding + botón **"Entrar con Google"** (lo actual) + un botón/Link **"Entrar con usuario y contraseña"** → `mode="login"`.
- **login**: inputs **Usuario** y **Contraseña**, botón **"Entrar"** (`signInWithUsername`), link **"Crear usuario nuevo"** → `mode="signup"`, y "Volver" → `home`.
- **signup**: inputs **Usuario**, **Contraseña**, **Confirmar contraseña**, botón **"Crear cuenta"** (valida con `validateSignup`; si ok, `signUpWithUsername`), y "Volver".
- Estado de error visible (mensaje en coral) y de carga ("Entrando..."/"Creando...") en cada form. Enter envía.
- Tras éxito (signup o login), no hay que navegar: el gate de App reacciona a `onAuthChange`. En signup nuevo, el jugador no tiene `favoriteTeam` → App muestra el asistente Register (perfil + teléfono). En login de cuenta existente, entra directo.

### Perfil + teléfono

No cambia: el asistente `Register` (paso 1 nombre + WhatsApp, paso 2 equipo, paso 3 modo) corre tras crear la cuenta porque `auth.player.favoriteTeam` está vacío. El nombre viene precargado con `getUser().displayName` (= usuario). El teléfono se carga ahí (campo WhatsApp), tal como pidió el usuario.

## Seguridad y reglas

- **No hace falta tocar `firestore.rules`.** Todo el modelo (players, predictions, specialPredictions, messages, presence) autoriza por `uid` / `isOwner` / `isSignedIn`, que valen para cualquier proveedor. `isAdmin()` exige email verificado en la whitelist de Gmail; los usuarios sintéticos (`@prode-refugio.app`, sin verificar) nunca son admin. El admin sigue siendo sólo la cuenta de Google.
- Las contraseñas las maneja Firebase Auth (hash estándar); la app nunca las almacena ni las ve más allá del submit del form.

## Paso de consola (usuario)

**Habilitar el proveedor "Email/Password"** en Firebase Console → Authentication → Sign-in method. (Una vez.) Sin esto, crear/entrar con usuario falla con `auth/operation-not-allowed`.

## Casos borde

- **Usuario ya tomado** → "Ese usuario ya existe." (Firebase `email-already-in-use`, porque el email sintético es único.)
- **Mayúsculas/espacios**: `normalizeUsername` hace que `Juan`, ` juan ` y `JUAN` sean la misma cuenta (email en minúsculas). El `displayName` guarda lo que tipeó en el alta.
- **Contraseña corta / no coincide**: la valida la UI antes de llamar a Firebase (mensaje claro); Firebase la revalida igual.
- **Provider deshabilitado**: error claro pidiendo habilitar Email/Password (para la fase de prueba del admin).
- **Olvido de contraseña**: sin recovery; el admin resetea desde la consola. (Documentado, fuera de alcance del código.)
- **Modo local sin Firebase**: los botones de usuario/contraseña muestran que se necesita conexión (no debería pasar en prod).

## Fuera de alcance

- Recuperación de contraseña por email / "olvidé mi contraseña".
- Cambiar usuario/contraseña desde el perfil (se puede agregar después).
- Verificación de email.
- Vincular una cuenta de usuario con una de Google (linking).

## Testing

- `lib/auth-username.test.js` (TDD): `normalizeUsername` (minúsculas, espacios, chars inválidos, vacío), `usernameToEmail` (email correcto, vacío si inválido), `validateUsername` (corto/largo/ok), `validateSignup` (pass corta, no coinciden, ok), `validateLogin` (vacíos/ok).
- Integración (QA manual del usuario, con Email/Password habilitado): crear cuenta nueva con usuario/contraseña → completa perfil con teléfono → aparece en el ranking; cerrar sesión y volver a entrar con usuario/contraseña; usuario repetido da error; contraseña incorrecta da error; Google sigue funcionando.

## Criterio de éxito

Un jugador sin Gmail toca "Entrar con usuario y contraseña" → "Crear usuario nuevo", elige usuario + contraseña (con confirmación), crea la cuenta, completa nombre/teléfono/equipo, y queda jugando — apareciendo en el ranking y el chat como cualquier otro. Puede cerrar sesión y volver a entrar con su usuario y contraseña. El ingreso con Google sigue intacto.
