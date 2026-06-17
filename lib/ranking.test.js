const test = require("node:test");
const assert = require("node:assert");
const { rankingRowsFromPlayers, badgesFor, isOnline, computeRanks } = require("./ranking.js");

test("isOnline: latido reciente → true; viejo o ausente → false", () => {
  const now = Date.parse("2026-06-14T12:00:00Z");
  assert.strictEqual(isOnline(now - 30 * 1000, now), true);   // hace 30s
  assert.strictEqual(isOnline(now - 5 * 60 * 1000, now), false); // hace 5 min
  assert.strictEqual(isOnline(null, now), false);
  assert.strictEqual(isOnline(undefined, now), false);
});

test("isOnline: acepta Timestamp de Firestore (.toMillis) e ISO", () => {
  const now = Date.parse("2026-06-14T12:00:00Z");
  const ts = { toMillis: () => now - 20 * 1000 };
  assert.strictEqual(isOnline(ts, now), true);
  assert.strictEqual(isOnline(new Date(now - 10 * 1000).toISOString(), now), true);
});

const players = [
  { id: "u1", name: "Joaco Profeta", points: 12, exact: 7, winner: 9, favoriteTeam: "ARG", avatarTone: "olive" },
  { id: "u2", name: "Sofi Vargas",   points: 20, exact: 2, winner: 5, favoriteTeam: "MEX" },
  { id: "u3", name: "Yo Mismo",      points: 5,  exact: 0, winner: 1, favoriteTeam: "BRA" },
];

test("ordena por puntos desc y asigna rank", () => {
  const rows = rankingRowsFromPlayers(players, "u3");
  assert.deepStrictEqual(rows.map(r => [r.rank, r.id, r.pts]), [
    [1, "u2", 20], [2, "u1", 12], [3, "u3", 5],
  ]);
});

test("marca al jugador propio con you + sufijo (vos)", () => {
  const rows = rankingRowsFromPlayers(players, "u3");
  const me = rows.find(r => r.you);
  assert.strictEqual(me.id, "u3");
  assert.strictEqual(me.name, "Yo Mismo (vos)");
});

test("deriva iniciales, badge y nat", () => {
  const rows = rankingRowsFromPlayers(players, "u3");
  const joaco = rows.find(r => r.id === "u1");
  assert.strictEqual(joaco.avatar, "JP");
  assert.strictEqual(joaco.badge, "profeta");
  assert.strictEqual(joaco.nat, "ARG");
  const sofi = rows.find(r => r.id === "u2");
  assert.strictEqual(sofi.badge, "cafe");
});

test("lista vacía o nula → []", () => {
  assert.deepStrictEqual(rankingRowsFromPlayers([], "u1"), []);
  assert.deepStrictEqual(rankingRowsFromPlayers(null, "u1"), []);
});

test("badgesFor: 6+ exactos gana profeta y casi (+cafe siempre)", () => {
  assert.deepStrictEqual(badgesFor({ id: "x", exact: 6 }), ["profeta", "casi", "cafe"]);
});

test("badgesFor: rey si ganó una semana, en orden de prestigio", () => {
  assert.deepStrictEqual(badgesFor({ id: "x", exact: 7 }, ["x"]), ["profeta", "rey", "casi", "cafe"]);
  assert.deepStrictEqual(badgesFor({ id: "x", exact: 0 }, new Set(["x"])), ["rey", "cafe"]);
});

test("badgesFor: novato → sólo cafe", () => {
  assert.deepStrictEqual(badgesFor({ id: "x", exact: 0 }), ["cafe"]);
  assert.deepStrictEqual(badgesFor({ id: "x", exact: 0 }, ["otro"]), ["cafe"]);
});

test("rankingRowsFromPlayers: agrega badges[] y badge = primera; acepta reyIds", () => {
  const rows = rankingRowsFromPlayers(players, "u3", ["u2"]);
  const sofi = rows.find(r => r.id === "u2");      // exact 2, ganó una semana
  assert.deepStrictEqual(sofi.badges, ["rey", "cafe"]);
  assert.strictEqual(sofi.badge, "rey");
  const joaco = rows.find(r => r.id === "u1");     // exact 7, sin semana ganada
  assert.deepStrictEqual(joaco.badges, ["profeta", "casi", "cafe"]);
});

test("computeRanks: mapa {id: rank} por puntos desc", () => {
  assert.deepStrictEqual(computeRanks(players), { u2: 1, u1: 2, u3: 3 });
});

test("computeRanks: desempata por exactos y luego por id", () => {
  const tied = [
    { id: "b", points: 10, exact: 1 },
    { id: "a", points: 10, exact: 3 },
    { id: "c", points: 10, exact: 1 },
  ];
  // a tiene más exactos → 1°; b y c empatan exactos → id asc (b antes que c)
  assert.deepStrictEqual(computeRanks(tied), { a: 1, b: 2, c: 3 });
});

test("rankingRowsFromPlayers: move/trend derivados de prevRank", () => {
  const ps = [
    { id: "u1", name: "A", points: 20, exact: 2, prevRank: 3 }, // ahora 1° → subió 2
    { id: "u2", name: "B", points: 12, exact: 1, prevRank: 1 }, // ahora 2° → bajó 1
    { id: "u3", name: "C", points: 5,  exact: 0, prevRank: 3 }, // ahora 3° → igual
    { id: "u4", name: "D", points: 1,  exact: 0 },              // sin prevRank → sin dato
  ];
  const rows = rankingRowsFromPlayers(ps, "u1");
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.strictEqual(by.u1.rank, 1); assert.strictEqual(by.u1.move, 2);  assert.strictEqual(by.u1.trend, "up");
  assert.strictEqual(by.u2.rank, 2); assert.strictEqual(by.u2.move, -1); assert.strictEqual(by.u2.trend, "down");
  assert.strictEqual(by.u3.rank, 3); assert.strictEqual(by.u3.move, 0);  assert.strictEqual(by.u3.trend, "flat");
  assert.strictEqual(by.u4.rank, 4); assert.strictEqual(by.u4.move, null); assert.strictEqual(by.u4.trend, "flat");
});
