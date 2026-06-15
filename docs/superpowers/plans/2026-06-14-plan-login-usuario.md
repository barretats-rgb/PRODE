# Login con usuario y contraseña — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir crear cuenta y entrar con **usuario + contraseña** (sin Google), reusando el asistente de perfil existente para el teléfono. El ingreso con Google se mantiene.

**Architecture:** Lógica pura de normalización/validación en `lib/auth-username.js` (testeada). El usuario se mapea a un email sintético (`<usuario>@prode-refugio.app`) para Firebase Auth Email/Password. `firebase-service.js` gana `signUpWithUsername`/`signInWithUsername` con errores traducidos. `screens/Login.jsx` gana los modos login/signup además de Google. No se tocan las reglas (todo autoriza por `uid`).

**Tech Stack:** React (Babel standalone, sin build), Firebase Auth compat (Email/Password), `node --test`.

**Spec:** `docs/superpowers/specs/2026-06-14-login-usuario-password-design.md`

**Contexto para quien implementa:**
- App estática sin bundler: cada archivo se carga con `<script>` en `index.html`; los `lib/` usan IIFE dual navegador/Node (referencia `lib/chat.js`); las pantallas se cargan con `<script type="text/babel">`. Tests: `node --test` desde la raíz; **la suite actual tiene 71 tests verdes**.
- `firebase-service.js` (IIFE) expone `window.ProdeDB`; helpers internos a reutilizar: `state.ready`, `state.auth` (el `firebase.auth()`), `init()`. Mirá `signInWithGoogle` como molde (usa `state.auth.signInWithPopup`). El gate de `app.jsx` reacciona a `onAuthChange`; tras crear/entrar, un usuario sin `favoriteTeam` cae en el asistente `Register` (perfil + teléfono) automáticamente — no hay que navegar.
- Componentes globales (`components.jsx`): `Btn`, `Eyebrow`. Hooks `useState`/`useEffect` globales.
- JSX se valida con `npx --yes esbuild <archivo> --loader:.jsx=jsx --outfile=NUL --log-level=error`.
- Comentarios en español. Acentos intencionales — guardar UTF-8 con la tool Write/Edit.
- **Paso de consola del usuario (no es código):** habilitar el proveedor "Email/Password" en Firebase Console → Authentication → Sign-in method. Se reporta al final.

---

### Task 1: `lib/auth-username.js` — normalización y validación (TDD)

**Files:**
- Create: `lib/auth-username.js`
- Create: `lib/auth-username.test.js`

- [ ] **Step 1: Write the failing tests** — crear `lib/auth-username.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert");
const {
  EMAIL_DOMAIN, normalizeUsername, usernameToEmail,
  validateUsername, validateSignup, validateLogin,
} = require("./auth-username.js");

test("normalizeUsername: minúsculas, sin espacios, sólo [a-z0-9._-]", () => {
  assert.strictEqual(normalizeUsername("  Juan Perez "), "juanperez");
  assert.strictEqual(normalizeUsername("EL_Crack.21"), "el_crack.21");
  assert.strictEqual(normalizeUsername("José+María!"), "josemaria");
  assert.strictEqual(normalizeUsername(""), "");
  assert.strictEqual(normalizeUsername(null), "");
});

test("usernameToEmail: arma el email sintético; vacío si inválido", () => {
  assert.strictEqual(usernameToEmail("Juan"), "juan@" + EMAIL_DOMAIN);
  assert.strictEqual(usernameToEmail("  "), "");
});

test("validateUsername: 3–20 chars normalizados", () => {
  assert.strictEqual(validateUsername("jo").ok, false);
  assert.strictEqual(validateUsername("juan").ok, true);
  assert.strictEqual(validateUsername("a".repeat(21)).ok, false);
  assert.strictEqual(validateUsername("").ok, false);
});

test("validateSignup: pass corta / no coinciden / ok", () => {
  assert.deepStrictEqual(validateSignup("juan", "123", "123"), { ok: false, error: "La contraseña necesita al menos 6 caracteres." });
  assert.deepStrictEqual(validateSignup("juan", "123456", "654321"), { ok: false, error: "Las contraseñas no coinciden." });
  assert.deepStrictEqual(validateSignup("jo", "123456", "123456"), { ok: false, error: "El usuario es muy corto (mínimo 3)." });
  assert.deepStrictEqual(validateSignup("juan", "123456", "123456"), { ok: true });
});

test("validateLogin: completos / vacíos", () => {
  assert.strictEqual(validateLogin("juan", "123456").ok, true);
  assert.deepStrictEqual(validateLogin("", "x"), { ok: false, error: "Completá usuario y contraseña." });
  assert.deepStrictEqual(validateLogin("juan", ""), { ok: false, error: "Completá usuario y contraseña." });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test lib/auth-username.test.js`
Expected: FAIL — `Cannot find module './auth-username.js'`

- [ ] **Step 3: Write minimal implementation** — crear `lib/auth-username.js`:

```js
/* ============================================================
   PRODE REFUGIO — Usuario/contraseña (lógica pura).
   Firebase Auth usa email, así que el usuario se mapea a un email
   sintético (<usuario>@prode-refugio.app) que el jugador nunca ve.
   Normalización + validaciones. Dual navegador/Node.
   ============================================================ */
(function (global) {
  const EMAIL_DOMAIN = "prode-refugio.app";

  // Minúsculas, sin espacios, sólo [a-z0-9._-].
  function normalizeUsername(u) {
    return String(u == null ? "" : u)
      .trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // saca acentos
      .replace(/[^a-z0-9._-]/g, "");
  }

  function usernameToEmail(u) {
    const n = normalizeUsername(u);
    return n ? n + "@" + EMAIL_DOMAIN : "";
  }

  function validateUsername(u) {
    const n = normalizeUsername(u);
    if (n.length === 0) return { ok: false, error: "Elegí un usuario." };
    if (n.length < 3) return { ok: false, error: "El usuario es muy corto (mínimo 3)." };
    if (n.length > 20) return { ok: false, error: "El usuario es muy largo (máximo 20)." };
    return { ok: true };
  }

  function validateSignup(usuario, pass, pass2) {
    const u = validateUsername(usuario);
    if (!u.ok) return u;
    if (typeof pass !== "string" || pass.length < 6) {
      return { ok: false, error: "La contraseña necesita al menos 6 caracteres." };
    }
    if (pass !== pass2) return { ok: false, error: "Las contraseñas no coinciden." };
    return { ok: true };
  }

  function validateLogin(usuario, pass) {
    if (!String(usuario || "").trim() || !String(pass || "")) {
      return { ok: false, error: "Completá usuario y contraseña." };
    }
    return { ok: true };
  }

  const api = { EMAIL_DOMAIN, normalizeUsername, usernameToEmail, validateUsername, validateSignup, validateLogin };
  global.ProdeAuthUsername = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test lib/auth-username.test.js` — Expected: PASS (5 tests)

- [ ] **Step 5: Run full suite**

Run: `node --test` — Expected: 76/76 (71 previos + 5)

- [ ] **Step 6: Commit**

```bash
git add lib/auth-username.js lib/auth-username.test.js
git commit -m "lib/auth-username: usuario→email sintético + validaciones"
```

---

### Task 2: capa de datos en `firebase-service.js` + script en `index.html`

**Files:**
- Modify: `firebase-service.js` (2 funciones nuevas + exports)
- Modify: `index.html` (script `lib/auth-username.js` antes de `firebase-service.js`)

Sin lógica pura nueva; verificación = `node --check` + suite.

- [ ] **Step 1: `index.html`** — después de `<script src="lib/chat.js"></script>` agregar:

```html
<script src="lib/chat.js"></script>
<script src="lib/auth-username.js"></script>
```

(Antes de `firebase-service.js`. Orden: ...chat.js, auth-username.js, firebase-service.js...)

- [ ] **Step 2: `firebase-service.js`** — agregar estas dos funciones inmediatamente después de `signInWithGoogle` (y antes de `signOutUser`):

```js
  // Traduce errores comunes de Firebase Auth a mensajes para el jugador.
  function authErrorMessage(code, fallback) {
    const map = {
      "auth/email-already-in-use": "Ese usuario ya existe.",
      "auth/weak-password": "La contraseña necesita al menos 6 caracteres.",
      "auth/wrong-password": "Usuario o contraseña incorrectos.",
      "auth/user-not-found": "Usuario o contraseña incorrectos.",
      "auth/invalid-credential": "Usuario o contraseña incorrectos.",
      "auth/operation-not-allowed": "El ingreso con usuario no está habilitado todavía.",
    };
    return map[code] || fallback;
  }

  // Crea una cuenta nueva con usuario + contraseña (email sintético interno).
  async function signUpWithUsername(usuario, pass) {
    if (!state.ready) await init();
    if (!state.auth) throw new Error("Firebase no está configurado.");
    const v = window.ProdeAuthUsername.validateSignup(usuario, pass, pass);
    if (!v.ok) throw new Error(v.error);
    const email = window.ProdeAuthUsername.usernameToEmail(usuario);
    try {
      const cred = await state.auth.createUserWithEmailAndPassword(email, pass);
      // Guardar el usuario tal cual lo tipeó, para mostrarlo (ensurePlayer lo usa como name).
      if (cred.user && cred.user.updateProfile) {
        try { await cred.user.updateProfile({ displayName: String(usuario).trim() }); } catch (e) { /* no crítico */ }
      }
      return { ok: true };
    } catch (e) {
      throw new Error(authErrorMessage(e && e.code, "No se pudo crear la cuenta. Probá de nuevo."));
    }
  }

  // Entra con usuario + contraseña.
  async function signInWithUsername(usuario, pass) {
    if (!state.ready) await init();
    if (!state.auth) throw new Error("Firebase no está configurado.");
    const email = window.ProdeAuthUsername.usernameToEmail(usuario);
    if (!email) throw new Error("Usuario o contraseña incorrectos.");
    try {
      await state.auth.signInWithEmailAndPassword(email, pass);
      return { ok: true };
    } catch (e) {
      throw new Error(authErrorMessage(e && e.code, "No se pudo entrar. Probá de nuevo."));
    }
  }
```

Y en el export `window.ProdeDB = { ... }` agregar:

```js
    signUpWithUsername,
    signInWithUsername,
```

- [ ] **Step 3: Verificar**

Run: `node --check firebase-service.js && node --test`
Expected: sin errores de sintaxis; 76/76.

- [ ] **Step 4: Commit**

```bash
git add firebase-service.js index.html
git commit -m "firebase-service: signUpWithUsername / signInWithUsername (email sintético + errores traducidos)"
```

---

### Task 3: UI en `screens/Login.jsx` (modos Google / login / signup)

**Files:**
- Modify: `screens/Login.jsx` (reescritura del componente para soportar los 3 modos)

- [ ] **Step 1: Reemplazar el componente `Login`** en `screens/Login.jsx` por esta versión (mantiene el branding y el botón de Google, agrega usuario/contraseña):

```jsx
function Login() {
  const [mode, setMode] = useState("home"); // home | login | signup
  const [usuario, setUsuario] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const entrarGoogle = async () => {
    setBusy(true); setError("");
    try {
      await window.ProdeDB.signInWithGoogle();
    } catch (e) {
      console.error("[Prode Refugio] login google", e);
      setError("No se pudo iniciar sesión con Google. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const entrarUsuario = async () => {
    setError("");
    const v = window.ProdeAuthUsername?.validateLogin?.(usuario, pass);
    if (v && !v.ok) { setError(v.error); return; }
    setBusy(true);
    try {
      await window.ProdeDB.signInWithUsername(usuario, pass);
      // El gate de App reacciona vía onAuthChange.
    } catch (e) {
      setError(e.message || "No se pudo entrar.");
    } finally {
      setBusy(false);
    }
  };

  const crearUsuario = async () => {
    setError("");
    const v = window.ProdeAuthUsername?.validateSignup?.(usuario, pass, pass2);
    if (v && !v.ok) { setError(v.error); return; }
    setBusy(true);
    try {
      await window.ProdeDB.signUpWithUsername(usuario, pass);
      // Cuenta creada: el gate de App lleva al asistente de perfil (teléfono).
    } catch (e) {
      setError(e.message || "No se pudo crear la cuenta.");
    } finally {
      setBusy(false);
    }
  };

  const goHome = () => { setMode("home"); setError(""); setPass(""); setPass2(""); };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center", gap: 20, padding: "32px 22px",
      background: "linear-gradient(180deg, rgba(26,25,22,0.2) 0%, var(--char-900) 100%), url('assets/messi.jpg')",
      backgroundSize: "cover", backgroundPosition: "center top",
    }}>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 44, lineHeight: 0.85,
        textTransform: "uppercase", color: "var(--orange-500)", textAlign: "center",
      }}>
        REFU<br/><span style={{ paddingLeft: "0.55em", display: "inline-block", color: "var(--cream-100)" }}>GIO</span>
      </div>
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <Eyebrow color="var(--neon-citrus)">Prode Mundial '26 · Tamarindo</Eyebrow>
        <div style={{
          fontFamily: "var(--font-title)", fontSize: 20, color: "var(--cream-100)",
          textTransform: "uppercase", letterSpacing: "0.02em", marginTop: 8, lineHeight: 1.1,
        }}>{mode === "signup" ? "Creá tu usuario" : "Entrá para armar tu prode"}</div>
      </div>

      {/* card */}
      <div style={{
        width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12,
        background: "rgba(26,25,22,0.66)", border: "1px solid var(--char-700)",
        borderRadius: 20, padding: 18,
      }}>
        {mode === "home" && (
          <>
            <Btn full variant="accent" size="lg" onClick={entrarGoogle} icon="log-in">
              {busy ? "Entrando..." : "Entrar con Google"}
            </Btn>
            <div style={{textAlign:"center", fontSize:10, color:"var(--char-500)", letterSpacing:"0.2em"}}>O</div>
            <Btn full variant="ghost" size="lg" onClick={()=>{ setMode("login"); setError(""); }} icon="user">
              Entrar con usuario y contraseña
            </Btn>
          </>
        )}

        {(mode === "login" || mode === "signup") && (
          <>
            <input value={usuario} onChange={(e)=>setUsuario(e.target.value)}
              placeholder="Usuario" autoCapitalize="none" autoCorrect="off"
              style={loginInput}/>
            <input value={pass} onChange={(e)=>setPass(e.target.value)} type="password"
              placeholder="Contraseña"
              onKeyDown={(e)=>{ if (e.key === "Enter" && mode === "login") entrarUsuario(); }}
              style={loginInput}/>
            {mode === "signup" && (
              <input value={pass2} onChange={(e)=>setPass2(e.target.value)} type="password"
                placeholder="Confirmar contraseña"
                onKeyDown={(e)=>{ if (e.key === "Enter") crearUsuario(); }}
                style={loginInput}/>
            )}

            {mode === "login" ? (
              <>
                <Btn full variant="accent" size="lg" onClick={entrarUsuario} icon="log-in">
                  {busy ? "Entrando..." : "Entrar"}
                </Btn>
                <button onClick={()=>{ setMode("signup"); setError(""); }} style={loginLink}>Crear usuario nuevo</button>
              </>
            ) : (
              <>
                <Btn full variant="accent" size="lg" onClick={crearUsuario} icon="zap">
                  {busy ? "Creando..." : "Crear cuenta"}
                </Btn>
                <button onClick={()=>{ setMode("login"); setError(""); }} style={loginLink}>Ya tengo usuario</button>
              </>
            )}
            <button onClick={goHome} style={{...loginLink, color:"var(--char-400)"}}>Volver</button>
          </>
        )}

        {error && <div style={{ color: "var(--neon-coral)", fontSize: 12, textAlign:"center" }}>{error}</div>}
      </div>
    </div>
  );
}

const loginInput = {
  width:"100%", height:46, borderRadius:12, padding:"0 14px",
  background:"var(--char-900)", color:"var(--cream-100)",
  border:"1px solid var(--char-600)", outline:"none",
  fontFamily:"var(--font-body)", fontSize:15, boxSizing:"border-box",
};
const loginLink = {
  border:0, background:"transparent", color:"var(--neon-citrus)", cursor:"pointer",
  fontSize:12, fontWeight:700, letterSpacing:"0.04em", padding:"4px 0", fontFamily:"var(--font-body)",
};

window.Login = Login;
```

- [ ] **Step 2: Verificar**

Run: `npx --yes esbuild screens/Login.jsx --loader:.jsx=jsx --outfile=NUL --log-level=error && node --test`
Expected: esbuild sin errores; 76/76.

- [ ] **Step 3: Commit**

```bash
git add screens/Login.jsx
git commit -m "Login: usuario/contraseña + crear usuario, además de Google"
```

---

### Task 4: smoke test del flujo (navegador)

**Files:** ninguno (verificación). Lo corre el controlador con el preview `prode-static`.

- [ ] **Step 1: Render del Login y validaciones**

Renderizar `window.Login` y verificar:
- En modo "home": botón "Entrar con Google" + "Entrar con usuario y contraseña".
- Al pasar a "login": inputs Usuario y Contraseña + "Entrar" + link "Crear usuario nuevo".
- Al pasar a "signup": aparece "Confirmar contraseña" + "Crear cuenta".
- Validación: en signup con contraseñas distintas, al tocar "Crear cuenta" muestra "Las contraseñas no coinciden" (mockear `window.ProdeDB.signUpWithUsername` para que no se llame; el error sale de `validateSignup` antes).
- `window.ProdeAuthUsername.usernameToEmail("Juan")` === `"juan@prode-refugio.app"`.

Mock mínimo: `window.ProdeDB = { ...window.ProdeDB, signInWithGoogle: async()=>{}, signInWithUsername: async()=>{}, signUpWithUsername: async()=>{} }`. Cero errores Babel en consola.

- [ ] **Step 2: Commit** (si hubo algún ajuste menor de la verificación; si no, nada que commitear).

---

### QA manual (usuario, con Email/Password habilitado en Firebase)

1. **Habilitar "Email/Password"** en Firebase Console → Authentication → Sign-in method.
2. En el Login, "Entrar con usuario y contraseña" → "Crear usuario nuevo" → elegir usuario + contraseña + confirmar → "Crear cuenta".
3. Completar el asistente de perfil (nombre, **teléfono/WhatsApp**, equipo) → quedar jugando, aparecer en el ranking y el chat.
4. Cerrar sesión y volver a entrar con el mismo usuario + contraseña.
5. Intentar crear el mismo usuario otra vez → "Ese usuario ya existe."
6. Entrar con contraseña incorrecta → "Usuario o contraseña incorrectos."
7. El ingreso con Google sigue funcionando.
8. (Olvido de contraseña: reset desde la consola de Firebase — fuera del código.)
