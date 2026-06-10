const test = require("node:test");
const assert = require("node:assert");
const {
  SPECIAL_KEYS, SPECIAL_POINTS, specialsLocked, normalizeAnswer, scoreSpecialsFanout,
} = require("./specials.js");

test("constantes: 6 especiales de a 5 puntos", () => {
  assert.deepStrictEqual(SPECIAL_KEYS, ["campeon","subcampeon","goleador","arquero","sorpresa","decepcion"]);
  assert.strictEqual(SPECIAL_POINTS, 5);
});

test("specialsLocked: antes del 11 jun 18:00 CR → false, después → true", () => {
  assert.strictEqual(specialsLocked(Date.parse("2026-06-11T17:59:00-06:00")), false);
  assert.strictEqual(specialsLocked(Date.parse("2026-06-11T18:00:00-06:00")), true);
});

test("normalizeAnswer: trim, minúsculas y sin acentos", () => {
  assert.strictEqual(normalizeAnswer("  Mbappé "), "mbappe");
  assert.strictEqual(normalizeAnswer("JULIÁN Álvarez"), "julian alvarez");
  assert.strictEqual(normalizeAnswer(null), "");
  assert.strictEqual(normalizeAnswer(undefined), "");
});

test("fanout: acierto simple reparte +5", () => {
  const r = scoreSpecialsFanout({ campeon: "ARG" }, [
    { playerId: "u1", campeon: "ARG" },
    { playerId: "u2", campeon: "BRA" },
  ]);
  assert.deepStrictEqual(r.perPlayer, { u1: { specialsPoints: 5 } });
  assert.deepStrictEqual(r.perPrediction, [
    { playerId: "u1", awarded: { campeon: 5 } },
    { playerId: "u2", awarded: { campeon: 0 } },
  ]);
});

test("fanout: matching normalizado (acentos/case)", () => {
  const r = scoreSpecialsFanout({ goleador: "Kylian Mbappé" }, [
    { playerId: "u1", goleador: "kylian mbappe" },
  ]);
  assert.strictEqual(r.perPlayer.u1.specialsPoints, 5);
});

test("fanout: múltiples claves confirmadas suman", () => {
  const r = scoreSpecialsFanout({ campeon: "ARG", decepcion: "GER" }, [
    { playerId: "u1", campeon: "ARG", decepcion: "GER" },
  ]);
  assert.deepStrictEqual(r.perPlayer, { u1: { specialsPoints: 10 } });
  assert.deepStrictEqual(r.perPrediction[0].awarded, { campeon: 5, decepcion: 5 });
});

test("fanout: idempotente — re-ejecutar con awarded ya escrito da delta 0", () => {
  const r = scoreSpecialsFanout({ campeon: "ARG" }, [
    { playerId: "u1", campeon: "ARG", awarded: { campeon: 5 } },
  ]);
  assert.deepStrictEqual(r.perPlayer, {});
  assert.deepStrictEqual(r.perPrediction, [{ playerId: "u1", awarded: { campeon: 5 } }]);
});

test("fanout: corrección de respuesta mueve los puntos", () => {
  // El admin había confirmado ARG (u1 cobró 5); corrige a BRA.
  const r = scoreSpecialsFanout({ campeon: "BRA" }, [
    { playerId: "u1", campeon: "ARG", awarded: { campeon: 5 } },
    { playerId: "u2", campeon: "BRA", awarded: { campeon: 0 } },
  ]);
  assert.deepStrictEqual(r.perPlayer, { u1: { specialsPoints: -5 }, u2: { specialsPoints: 5 } });
});

test("fanout: pick ausente o vacío no acierta", () => {
  const r = scoreSpecialsFanout({ campeon: "ARG" }, [
    { playerId: "u1" },
    { playerId: "u2", campeon: "" },
  ]);
  assert.deepStrictEqual(r.perPlayer, {});
  assert.deepStrictEqual(r.perPrediction[0].awarded, { campeon: 0 });
});

test("fanout: sin respuestas confirmadas → vacío", () => {
  const r = scoreSpecialsFanout({}, [{ playerId: "u1", campeon: "ARG" }]);
  assert.deepStrictEqual(r.perPrediction, []);
  assert.deepStrictEqual(r.perPlayer, {});
});

test("fanout: docs sin playerId o lista nula se toleran", () => {
  const r = scoreSpecialsFanout({ campeon: "ARG" }, [{ campeon: "ARG" }, null]);
  assert.deepStrictEqual(r.perPlayer, {});
  const r2 = scoreSpecialsFanout({ campeon: "ARG" }, null);
  assert.deepStrictEqual(r2.perPrediction, []);
});
