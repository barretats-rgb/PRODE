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

/* ---- weeklyLeaders / weeklyHistory ---- */

const { weeklyLeaders, weeklyHistory } = require("./weekly.js");

/* ---- weeklyLeaders ---- */

const playersW = [
  { id: "u1", name: "Joaco", weekly: { s1: { points: 12, exact: 2 }, s2: { points: 3, exact: 0 } } },
  { id: "u2", name: "Sofi",  weekly: { s1: { points: 12, exact: 3 } } },
  { id: "u3", name: "Pancho", weekly: { s1: { points: 5, exact: 1 } } },
  { id: "u4", name: "SinSemanal" }, // sin mapa weekly: cuenta 0, tolerado
];

test("weeklyLeaders: líder único por puntos", () => {
  const leaders = weeklyLeaders(playersW, "s2");
  assert.deepStrictEqual(leaders, [{ id: "u1", name: "Joaco", points: 3, exact: 0 }]);
});

test("weeklyLeaders: empate en puntos lo resuelve más exactos", () => {
  const leaders = weeklyLeaders(playersW, "s1");
  assert.deepStrictEqual(leaders, [{ id: "u2", name: "Sofi", points: 12, exact: 3 }]);
});

test("weeklyLeaders: empate total → comparten (todos los empatados)", () => {
  const tied = [
    { id: "a", name: "A", weekly: { s1: { points: 9, exact: 1 } } },
    { id: "b", name: "B", weekly: { s1: { points: 9, exact: 1 } } },
    { id: "c", name: "C", weekly: { s1: { points: 4, exact: 0 } } },
  ];
  const leaders = weeklyLeaders(tied, "s1");
  assert.deepStrictEqual(leaders.map(l => l.id).sort(), ["a", "b"]);
});

test("weeklyLeaders: nadie sumó esa semana → []", () => {
  assert.deepStrictEqual(weeklyLeaders(playersW, "s5"), []);
  assert.deepStrictEqual(weeklyLeaders([], "s1"), []);
  assert.deepStrictEqual(weeklyLeaders(null, "s1"), []);
});

/* ---- weeklyHistory ---- */

test("weeklyHistory: semanas cerradas con ganadores; las vacías se omiten", () => {
  // semana actual = s3 → cerradas: s1 y s2. s2 sólo la tiene u1.
  const hist = weeklyHistory(playersW, "s3");
  assert.strictEqual(hist.length, 2);
  assert.strictEqual(hist[0].weekId, "s1");
  assert.deepStrictEqual(hist[0].leaders.map(l => l.id), ["u2"]);
  assert.strictEqual(hist[0].label, "Semana 1 · 11–17 jun");
  assert.strictEqual(hist[1].weekId, "s2");
  assert.deepStrictEqual(hist[1].leaders.map(l => l.id), ["u1"]);
});

test("weeklyHistory: en la semana 1 no hay cerradas → []", () => {
  assert.deepStrictEqual(weeklyHistory(playersW, "s1"), []);
});
