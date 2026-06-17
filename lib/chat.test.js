const test = require("node:test");
const assert = require("node:assert");
const { validMessage, MAX_LEN, countUnread, formatBadge, msOf } = require("./chat.js");

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
