const test = require("node:test");
const assert = require("node:assert");
const { scorePrediction, statsDelta, diffStats, isLocked } = require("./scoring.js");

const finished = (a, b) => ({ status: "finalizado", scoreA: a, scoreB: b });

test("resultado exacto da 5 puntos", () => {
  assert.deepStrictEqual(scorePrediction(finished(2, 1), { a: 2, b: 1 }), { points: 5, kind: "exacto" });
});

test("ganador + diferencia exacta da 4", () => {
  // real 3-1 (gana A por 2), predijo 2-0 (gana A por 2)
  assert.deepStrictEqual(scorePrediction(finished(3, 1), { a: 2, b: 0 }), { points: 4, kind: "diferencia" });
});

test("acierta ganador sin diferencia da 3", () => {
  // real 3-0 (gana A por 3), predijo 1-0 (gana A por 1)
  assert.deepStrictEqual(scorePrediction(finished(3, 0), { a: 1, b: 0 }), { points: 3, kind: "ganador" });
});

test("empate acertado sin marcador exacto da 3", () => {
  assert.deepStrictEqual(scorePrediction(finished(2, 2), { a: 1, b: 1 }), { points: 3, kind: "ganador" });
});

test("fallar el ganador da 0", () => {
  assert.deepStrictEqual(scorePrediction(finished(0, 2), { a: 1, b: 0 }), { points: 0, kind: "fallado" });
});

test("partido no finalizado no puntua", () => {
  assert.strictEqual(scorePrediction({ status: "abierto" }, { a: 1, b: 0 }), null);
});

test("prediccion ausente no puntua", () => {
  assert.strictEqual(scorePrediction(finished(1, 0), null), null);
});

test("statsDelta cuenta exacto como winner y played", () => {
  assert.deepStrictEqual(statsDelta({ points: 5, kind: "exacto" }), { points: 5, exact: 1, winner: 1, played: 1 });
});

test("statsDelta de ganador no suma exacto", () => {
  assert.deepStrictEqual(statsDelta({ points: 3, kind: "ganador" }), { points: 3, exact: 0, winner: 1, played: 1 });
});

test("statsDelta de diferencia cuenta como winner", () => {
  assert.deepStrictEqual(statsDelta({ points: 4, kind: "diferencia" }), { points: 4, exact: 0, winner: 1, played: 1 });
});

test("statsDelta de fallado solo suma played", () => {
  assert.deepStrictEqual(statsDelta({ points: 0, kind: "fallado" }), { points: 0, exact: 0, winner: 0, played: 1 });
});

test("statsDelta de null es todo cero", () => {
  assert.deepStrictEqual(statsDelta(null), { points: 0, exact: 0, winner: 0, played: 0 });
});

test("diffStats resta campo por campo (re-scoring idempotente)", () => {
  const prev = { points: 3, exact: 0, winner: 1, played: 1 };
  const next = { points: 5, exact: 1, winner: 1, played: 1 };
  assert.deepStrictEqual(diffStats(next, prev), { points: 2, exact: 1, winner: 0, played: 0 });
});

test("isLocked: abierto con kickoff futuro NO esta bloqueado", () => {
  const now = Date.parse("2026-06-11T17:00:00-06:00");
  assert.strictEqual(isLocked({ status: "abierto", kickoffAt: "2026-06-11T18:00:00-06:00" }, now), false);
});

test("isLocked: abierto pasado el kickoff esta bloqueado", () => {
  const now = Date.parse("2026-06-11T18:00:01-06:00");
  assert.strictEqual(isLocked({ status: "abierto", kickoffAt: "2026-06-11T18:00:00-06:00" }, now), true);
});

test("isLocked: estado vivo/finalizado siempre bloqueado", () => {
  const now = Date.parse("2026-06-11T10:00:00-06:00");
  assert.strictEqual(isLocked({ status: "vivo", kickoffAt: "2026-06-11T18:00:00-06:00" }, now), true);
  assert.strictEqual(isLocked({ status: "finalizado", kickoffAt: "2026-06-11T18:00:00-06:00" }, now), true);
});

test("isLocked: abierto sin kickoffAt NO se bloquea por tiempo", () => {
  assert.strictEqual(isLocked({ status: "abierto" }, Date.now()), false);
});

const { scoreMatchFanout } = require("./scoring.js");

const FINAL = { status: "finalizado", scoreA: 2, scoreB: 1 };

test("fanout: puntúa predicciones nuevas (sin puntaje previo)", () => {
  const preds = [
    { playerId: "u1", a: 2, b: 1, points: null, kind: null }, // exacto → 5
    { playerId: "u2", a: 3, b: 0, points: null, kind: null }, // gana A → 3
    { playerId: "u3", a: 0, b: 2, points: null, kind: null }, // falla → 0
  ];
  const { perPrediction, perPlayer } = scoreMatchFanout(FINAL, preds);
  assert.deepStrictEqual(perPrediction, [
    { playerId: "u1", a: 2, b: 1, points: 5, kind: "exacto" },
    { playerId: "u2", a: 3, b: 0, points: 3, kind: "ganador" },
    { playerId: "u3", a: 0, b: 2, points: 0, kind: "fallado" },
  ]);
  assert.deepStrictEqual(perPlayer, {
    u1: { points: 5, exact: 1, winner: 1, played: 1 },
    u2: { points: 3, exact: 0, winner: 1, played: 1 },
    u3: { points: 0, exact: 0, winner: 0, played: 1 },
  });
});

test("fanout: re-finalizar resta el puntaje viejo (idempotente)", () => {
  const preds = [{ playerId: "u1", a: 2, b: 1, points: 5, kind: "exacto" }];
  const corrected = { status: "finalizado", scoreA: 3, scoreB: 1 };
  const { perPrediction, perPlayer } = scoreMatchFanout(corrected, preds);
  assert.deepStrictEqual(perPrediction, [{ playerId: "u1", a: 2, b: 1, points: 3, kind: "ganador" }]);
  assert.deepStrictEqual(perPlayer, { u1: { points: -2, exact: -1, winner: 0, played: 0 } });
});

test("fanout: agrega varias predicciones del mismo jugador", () => {
  const preds = [
    { playerId: "u1", a: 2, b: 1, points: null, kind: null }, // 5
    { playerId: "u1", a: 5, b: 5, points: null, kind: null }, // falla → 0
  ];
  const { perPlayer } = scoreMatchFanout(FINAL, preds);
  assert.deepStrictEqual(perPlayer, { u1: { points: 5, exact: 1, winner: 1, played: 2 } });
});

test("fanout: lista vacía", () => {
  assert.deepStrictEqual(scoreMatchFanout(FINAL, []), { perPrediction: [], perPlayer: {} });
  assert.deepStrictEqual(scoreMatchFanout(FINAL, null), { perPrediction: [], perPlayer: {} });
});

test("fanout: cuenta el camino diferencia (ganador + diferencia)", () => {
  // real 2-1 (A por 1); predijo 1-0 (A por 1) → diferencia, 4 pts
  const { perPrediction, perPlayer } = scoreMatchFanout(FINAL, [{ playerId: "u1", a: 1, b: 0, points: null, kind: null }]);
  assert.deepStrictEqual(perPrediction, [{ playerId: "u1", a: 1, b: 0, points: 4, kind: "diferencia" }]);
  assert.deepStrictEqual(perPlayer, { u1: { points: 4, exact: 0, winner: 1, played: 1 } });
});

test("fanout: partido no finalizado no reparte", () => {
  const abierto = { status: "abierto" };
  assert.deepStrictEqual(scoreMatchFanout(abierto, [{ playerId: "u1", a: 1, b: 0, points: null, kind: null }]),
    { perPrediction: [], perPlayer: {} });
});

const { teamsKnown } = require("./scoring.js");

test("teamsKnown: true con dos equipos; false si alguno es a definir", () => {
  assert.strictEqual(teamsKnown({ a: "ARG", b: "BRA" }), true);
  assert.strictEqual(teamsKnown({ a: null, b: "BRA" }), false);
  assert.strictEqual(teamsKnown({ a: "ARG", b: null }), false);
  assert.strictEqual(teamsKnown({ a: "", b: "" }), false);
  assert.strictEqual(teamsKnown(null), false);
});
