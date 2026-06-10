const test = require("node:test");
const assert = require("node:assert");
const { weekIdForDate, currentWeekId, weekLabel } = require("./weekly.js");

/* ---- weekIdForDate ---- */

test("weekIdForDate: primer día del torneo → s1", () => {
  assert.strictEqual(weekIdForDate("2026-06-11T15:00:00-06:00"), "s1");
});

test("weekIdForDate: último instante de la semana 1 (mié 17 jun 23:59 CR) → s1", () => {
  assert.strictEqual(weekIdForDate("2026-06-17T23:59:59-06:00"), "s1");
});

test("weekIdForDate: jue 18 jun 00:00 CR → s2", () => {
  assert.strictEqual(weekIdForDate("2026-06-18T00:00:00-06:00"), "s2");
});

test("weekIdForDate: fecha anterior al torneo → clamp a s1", () => {
  assert.strictEqual(weekIdForDate("2026-06-01T12:00:00-06:00"), "s1");
});

test("weekIdForDate: la final (19 jul) cae en s6", () => {
  assert.strictEqual(weekIdForDate("2026-07-19T13:00:00-06:00"), "s6");
});

/* ---- currentWeekId ---- */

test("currentWeekId: antes del torneo → s1", () => {
  assert.strictEqual(currentWeekId(Date.parse("2026-06-01T10:00:00-06:00")), "s1");
});

test("currentWeekId: mitad del torneo → semana correcta", () => {
  assert.strictEqual(currentWeekId(Date.parse("2026-06-20T10:00:00-06:00")), "s2");
});

test("currentWeekId: después del torneo → clamp a s6", () => {
  assert.strictEqual(currentWeekId(Date.parse("2026-08-15T10:00:00-06:00")), "s6");
});

/* ---- weekLabel ---- */

test("weekLabel: semana dentro del mismo mes", () => {
  assert.strictEqual(weekLabel("s1"), "Semana 1 · 11–17 jun");
});

test("weekLabel: semana que cruza de mes", () => {
  assert.strictEqual(weekLabel("s3"), "Semana 3 · 25 jun–1 jul");
});

test("weekLabel: última semana", () => {
  assert.strictEqual(weekLabel("s6"), "Semana 6 · 16–22 jul");
});
