const test = require("node:test");
const assert = require("node:assert");
const { isAdminEmail } = require("./admins.js");

const ADMINS = ["barretats@gmail.com"];

test("email en la lista es admin", () => {
  assert.strictEqual(isAdminEmail("barretats@gmail.com", ADMINS), true);
});

test("comparación insensible a mayúsculas y espacios", () => {
  assert.strictEqual(isAdminEmail("  BarretatS@Gmail.com ", ADMINS), true);
});

test("email fuera de la lista no es admin", () => {
  assert.strictEqual(isAdminEmail("otro@gmail.com", ADMINS), false);
});

test("email vacío o nulo no es admin", () => {
  assert.strictEqual(isAdminEmail("", ADMINS), false);
  assert.strictEqual(isAdminEmail(null, ADMINS), false);
});

test("lista inválida no es admin", () => {
  assert.strictEqual(isAdminEmail("barretats@gmail.com", null), false);
  assert.strictEqual(isAdminEmail("barretats@gmail.com", undefined), false);
});
