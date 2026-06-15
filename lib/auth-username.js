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
      .normalize("NFD").replace(/[̀-ͯ]/g, "") // saca acentos
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
