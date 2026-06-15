const test = require("node:test");
const assert = require("node:assert");
const { validMessage, MAX_LEN } = require("./chat.js");

test("MAX_LEN es 500", () => {
  assert.strictEqual(MAX_LEN, 500);
});

test("validMessage: texto normal → ok con trim", () => {
  assert.deepStrictEqual(validMessage("  hola barra  "), { ok: true, text: "hola barra" });
});

test("validMessage: vacío o sólo espacios → no ok", () => {
  assert.deepStrictEqual(validMessage(""), { ok: false });
  assert.deepStrictEqual(validMessage("   "), { ok: false });
  assert.deepStrictEqual(validMessage(null), { ok: false });
  assert.deepStrictEqual(validMessage(undefined), { ok: false });
});

test("validMessage: no-string → no ok", () => {
  assert.deepStrictEqual(validMessage(42), { ok: false });
  assert.deepStrictEqual(validMessage({}), { ok: false });
});

test("validMessage: exactamente 500 pasa; 501 se recorta a 500", () => {
  const exact = "a".repeat(500);
  assert.deepStrictEqual(validMessage(exact), { ok: true, text: exact });
  const over = "b".repeat(600);
  const r = validMessage(over);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.text.length, 500);
});
