const test = require("node:test");
const assert = require("node:assert");
const { rankingRowsFromPlayers } = require("./ranking.js");

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
