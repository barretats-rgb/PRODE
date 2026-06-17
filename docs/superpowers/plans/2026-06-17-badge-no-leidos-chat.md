# Badge de mensajes sin leer en el ícono de Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar un globito rojo con la cantidad de mensajes sin leer sobre el ícono de Chat (barra lateral en desktop y barra inferior en mobile), para invitar a la gente a entrar a leer.

**Architecture:** Lógica pura de conteo en `lib/chat.js` (`countUnread`, `formatBadge`, `msOf`), testeada. `app.jsx` suma una suscripción global liviana a los últimos 30 mensajes, guarda la "última lectura" por usuario en `localStorage` (`prode_chat_lastread_<uid>`), marca leído al entrar a la pestaña Chat, y pasa el contador a los dos navs, que dibujan el badge sobre el ícono.

**Tech Stack:** React (Babel standalone, sin build), Firebase compat (Firestore), `node --test`.

**Spec:** `docs/superpowers/specs/2026-06-17-badge-no-leidos-chat-design.md`

**Contexto para quien implementa:**
- App estática sin bundler. `lib/chat.js` usa IIFE dual navegador/Node (`global.ProdeChat = api; module.exports = api;`), se testea con `node --test`. **La suite actual tiene 79 tests verdes.**
- `firebase-service.js` ya expone `ProdeDB.subscribeMessages(cb, max=50)` → `cb` recibe la lista de mensajes (orden cronológico viejo→nuevo), cada uno `{ id, uid, name, avatarTone, text, createdAt }`. `createdAt` es un Timestamp de Firestore en vivo (`.toMillis()`).
- `app.jsx` (`<script type="text/babel">`): `NAV_ITEMS` define los ítems; `AppNav` (sidebar desktop) y `MobileBottomNav` (barra inferior) los renderizan; `App` tiene `screen`/`setScreen`, `auth` (con `auth.user.uid`), y ya hace `if (window.lucide) window.lucide.createIcons()` en un efecto que depende de `[screen, tweaks, isDesktop, auth]`.
- CSS (en `index.html`): `.app-nav i` y `.mobile-bottom-nav i` fijan el tamaño del ícono por selector de descendencia → envolver el `<i>` en un `<span style="position:relative">` NO cambia el layout. No se toca CSS.
- Validar JSX: `npx --yes esbuild app.jsx --loader:.jsx=jsx --outfile=NUL --log-level=error` y luego limpiar `rm -rf NUL NUL_DIR`.
- Comentarios en español, acentos intencionales — guardar UTF-8 con Write/Edit.
- No cambia `firestore.rules` ni requiere pasos de consola.

---

### Task 1: `lib/chat.js` — `countUnread`, `formatBadge`, `msOf` (TDD)

**Files:**
- Modify: `lib/chat.js`
- Modify: `lib/chat.test.js`

- [ ] **Step 1: Write the failing tests** — en `lib/chat.test.js`, cambiar la línea 3 (el `require`) por:

```js
const { validMessage, MAX_LEN, countUnread, formatBadge, msOf } = require("./chat.js");
```

Y agregar al final del archivo:

```js
test("msOf: Timestamp (.toMillis), número e ISO → ms; basura → 0", () => {
  assert.strictEqual(msOf({ toMillis: () => 1234 }), 1234);
  assert.strictEqual(msOf(500), 500);
  assert.strictEqual(msOf(new Date(700).toISOString()), 700);
  assert.strictEqual(msOf(null), 0);
  assert.strictEqual(msOf("no-fecha"), 0);
});

test("countUnread: cuenta sólo posteriores a lastReadMs y ajenos", () => {
  const msgs = [
    { uid: "a",  createdAt: 100 },
    { uid: "b",  createdAt: 200 }, // ajeno, posterior → cuenta
    { uid: "me", createdAt: 300 }, // propio → no cuenta
    { uid: "c",  createdAt: 250 }, // ajeno, posterior → cuenta
  ];
  assert.strictEqual(countUnread(msgs, 150, "me"), 2);
});

test("countUnread: soporta Timestamp e ISO en createdAt", () => {
  const msgs = [
    { uid: "b", createdAt: { toMillis: () => 500 } },
    { uid: "c", createdAt: new Date(500).toISOString() },
    { uid: "d", createdAt: 50 }, // anterior → no cuenta
  ];
  assert.strictEqual(countUnread(msgs, 100, "me"), 2);
});

test("countUnread: lista vacía/nula → 0; lastReadMs no finito → cuenta todos los ajenos", () => {
  assert.strictEqual(countUnread([], 0, "me"), 0);
  assert.strictEqual(countUnread(null, 0, "me"), 0);
  const msgs = [{ uid: "a", createdAt: 10 }, { uid: "me", createdAt: 20 }];
  assert.strictEqual(countUnread(msgs, undefined, "me"), 1);
});

test("formatBadge: 0 → '', 1..9 → número, >9 → '9+', negativo → ''", () => {
  assert.strictEqual(formatBadge(0), "");
  assert.strictEqual(formatBadge(1), "1");
  assert.strictEqual(formatBadge(9), "9");
  assert.strictEqual(formatBadge(10), "9+");
  assert.strictEqual(formatBadge(50), "9+");
  assert.strictEqual(formatBadge(-3), "");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test lib/chat.test.js`
Expected: FAIL — `countUnread is not a function` (y `msOf`/`formatBadge` undefined).

- [ ] **Step 3: Write the implementation** — en `lib/chat.js`, agregar las tres funciones después de `validMessage` y antes de la línea `const api = ...`:

```js
  // Normaliza createdAt (Timestamp de Firestore con .toMillis, número en ms, o ISO) a ms.
  // Devuelve 0 si no se puede parsear.
  function msOf(createdAt) {
    if (!createdAt) return 0;
    if (typeof createdAt.toMillis === "function") return createdAt.toMillis();
    if (typeof createdAt === "number") return createdAt;
    const t = Date.parse(createdAt);
    return Number.isFinite(t) ? t : 0;
  }

  // Cantidad de mensajes sin leer: posteriores a lastReadMs y de otros (no propios).
  function countUnread(messages, lastReadMs, myUid) {
    const ref = Number.isFinite(lastReadMs) ? lastReadMs : 0;
    let n = 0;
    for (const m of (messages || [])) {
      if (m && m.uid !== myUid && msOf(m.createdAt) > ref) n++;
    }
    return n;
  }

  // Texto del globito: "" si 0 o menos, "9+" si más de 9, si no el número.
  function formatBadge(n) {
    if (!(n > 0)) return "";
    return n > 9 ? "9+" : String(n);
  }
```

Y cambiar la línea de exportación (`const api = { validMessage, MAX_LEN };`) por:

```js
  const api = { validMessage, MAX_LEN, msOf, countUnread, formatBadge };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test lib/chat.test.js` — Expected: PASS (los 5 nuevos + los 5 previos del archivo).

- [ ] **Step 5: Run full suite**

Run: `node --test` — Expected: 84 tests, 84 pass, 0 fail (79 previos + 5).

- [ ] **Step 6: Commit**

```bash
git add lib/chat.js lib/chat.test.js
git commit -m "lib/chat: countUnread + formatBadge + msOf para el badge de no leídos"
```

---

### Task 2: `app.jsx` — suscripción global, última lectura, marcar leído y badge en los navs

**Files:**
- Modify: `app.jsx`

Usa `window.ProdeChat.countUnread/formatBadge/msOf` (Task 1). Verificación = esbuild + smoke en navegador.

- [ ] **Step 1: Estilo del badge** — en `app.jsx`, justo DESPUÉS del bloque `const NAV_ITEMS = [ ... ];` (termina en `];`), agregar:

```jsx
// Globito rojo de no leídos sobre el ícono de Chat en la nav.
const CHAT_BADGE_STYLE = {
  position: "absolute", top: -7, right: -9, minWidth: 15, height: 15,
  padding: "0 4px", borderRadius: 999, background: "#E5484D", color: "#fff",
  fontSize: 9, fontWeight: 800, lineHeight: "15px", textAlign: "center",
  letterSpacing: 0, boxSizing: "border-box", pointerEvents: "none",
  boxShadow: "0 0 0 2px var(--char-900)",
};
```

- [ ] **Step 2: `AppNav` con badge** — reemplazar la función `AppNav` completa por:

```jsx
function AppNav({ screen, go, isAdmin, unread }) {
  const items = NAV_ITEMS.filter(item => !item.admin || isAdmin);
  return (
    <nav className="app-nav">
      {items.map(item => (
        <button
          key={item.screen}
          className={(screen === item.screen ? "on " : "") + (item.admin ? "admin" : "")}
          onClick={() => go(item.screen)}>
          <span style={{position:"relative", display:"inline-flex"}}>
            <i data-lucide={item.icon}></i>
            {item.screen === "chat" && unread > 0 && (
              <span style={CHAT_BADGE_STYLE}>{window.ProdeChat?.formatBadge?.(unread)}</span>
            )}
          </span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: `MobileBottomNav` con badge** — reemplazar la función `MobileBottomNav` completa por:

```jsx
function MobileBottomNav({ screen, go, isAdmin, unread }) {
  const items = NAV_ITEMS.filter(item => !item.admin || isAdmin);
  return (
    <nav className="mobile-bottom-nav">
      {items.map(item => (
        <button key={item.screen} className={screen === item.screen ? "on" : ""} onClick={() => go(item.screen)}>
          <span style={{position:"relative", display:"inline-flex"}}>
            <i data-lucide={item.icon}></i>
            {item.screen === "chat" && unread > 0 && (
              <span style={CHAT_BADGE_STYLE}>{window.ProdeChat?.formatBadge?.(unread)}</span>
            )}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Estado y lógica en `App`** — insertar el siguiente bloque INMEDIATAMENTE DESPUÉS del efecto de "Jugadores en vivo" (el que termina con `}, [auth?.user?.uid]);` justo debajo del comentario `// Jugadores en vivo (sólo con sesión): ...`). Pegarlo antes del comentario `// Tick para refrescar el "en línea" ...`:

```jsx
  // Chat: suscripción global liviana (últimos 30) para el badge de no leídos en la nav.
  const myUid = auth?.user?.uid;
  const [chatMessages, setChatMessages] = useState([]);
  useEffect(() => {
    if (!myUid) { setChatMessages([]); return; }
    const unsub = window.ProdeDB?.subscribeMessages?.((list) => setChatMessages(list || []), 30);
    return () => unsub && unsub();
  }, [myUid]);

  // Última lectura del chat para este usuario (por dispositivo, en localStorage).
  // Sin valor previo → se inicializa en ahora (no notificar todo el historial).
  const [lastReadMs, setLastReadMs] = useState(0);
  useEffect(() => {
    if (!myUid) { setLastReadMs(0); return; }
    const key = "prode_chat_lastread_" + myUid;
    const raw = localStorage.getItem(key);
    const n = Number(raw);
    if (raw != null && Number.isFinite(n)) {
      setLastReadMs(n);
    } else {
      const now = Date.now();
      localStorage.setItem(key, String(now));
      setLastReadMs(now);
    }
  }, [myUid]);

  // Marcar leído al estar en la pestaña Chat: avanza la última lectura al mensaje más
  // nuevo conocido (o ahora). Re-corre si llegan mensajes mientras estás adentro.
  useEffect(() => {
    if (screen !== "chat" || !myUid) return;
    const msOf = window.ProdeChat?.msOf || (() => 0);
    const newest = (chatMessages || []).reduce((mx, m) => Math.max(mx, msOf(m.createdAt)), 0);
    const mark = Math.max(newest, Date.now());
    localStorage.setItem("prode_chat_lastread_" + myUid, String(mark));
    setLastReadMs(mark);
  }, [screen, chatMessages, myUid]);

  // Contador para el badge (0 si estás en la pantalla Chat: ya lo estás leyendo).
  const chatUnread = screen === "chat"
    ? 0
    : (window.ProdeChat?.countUnread?.(chatMessages, lastReadMs, myUid) || 0);
```

- [ ] **Step 5: Pasar `unread` a los navs** — en el `return` de `App`:

Cambiar `<AppNav screen={screen} go={go} isAdmin={isAdmin}/>` por:

```jsx
        <AppNav screen={screen} go={go} isAdmin={isAdmin} unread={chatUnread}/>
```

Cambiar `<MobileBottomNav screen={screen} go={go} isAdmin={isAdmin}/>` por:

```jsx
      <MobileBottomNav screen={screen} go={go} isAdmin={isAdmin} unread={chatUnread}/>
```

- [ ] **Step 6: Asegurar que el badge se dibuje cuando cambia** — el efecto de íconos lucide de `App` ya depende de `[screen, tweaks, isDesktop, auth]`; agregar `chatUnread` a esas dependencias para que el `<i>` del badge se re-renderice al aparecer/desaparecer. Buscar:

```jsx
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, [screen, tweaks, isDesktop, auth]);
```

y reemplazar la línea de dependencias por:

```jsx
  }, [screen, tweaks, isDesktop, auth, chatUnread]);
```

- [ ] **Step 7: Validar JSX**

Run: `npx --yes esbuild app.jsx --loader:.jsx=jsx --outfile=NUL --log-level=error`
Expected: sin errores. Luego limpiar: `rm -rf NUL NUL_DIR`

- [ ] **Step 8: Commit**

```bash
git add app.jsx
git commit -m "Chat: badge de mensajes sin leer en el ícono de la nav (desktop + mobile)"
```

---

## Verificación final (revisión de toda la feature)

Smoke test en Claude Preview sobre el directorio estático (puerto 4173). Como el badge depende del estado global de `App` (que está detrás de los gates de auth), lo más simple es verificar la pieza pura en el navegador y el render del badge:

1. `node --test` → 84/84.
2. En el navegador, comprobar el cálculo: `window.ProdeChat.countUnread([{uid:'x',createdAt:Date.now()}], Date.now()-1000, 'me')` → `1`; `window.ProdeChat.formatBadge(12)` → `"9+"`.
3. Render del badge: montar `AppNav` con `unread={3}` y `screen="home"` en un contenedor de prueba (`ReactDOM.render`) y confirmar que aparece el globito rojo "3" sobre el ícono de Chat, y que con `unread={0}` no aparece. Screenshot de evidencia.

Pasos de consola del usuario: ninguno (no cambia reglas ni proveedores).
