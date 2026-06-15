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
