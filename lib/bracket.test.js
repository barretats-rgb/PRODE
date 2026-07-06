const test = require("node:test");
const assert = require("node:assert");
const { matchWinner, matchLoser, resolveBracket } = require("./bracket.js");

test("matchWinner: decisivo / empate con advances / empate sin advances / no finalizado / sin equipos", () => {
  assert.strictEqual(matchWinner({ status:"finalizado", a:"ARG", b:"BRA", scoreA:2, scoreB:1 }), "ARG");
  assert.strictEqual(matchWinner({ status:"finalizado", a:"ARG", b:"BRA", scoreA:0, scoreB:3 }), "BRA");
  assert.strictEqual(matchWinner({ status:"finalizado", a:"ARG", b:"BRA", scoreA:1, scoreB:1, advances:"BRA" }), "BRA");
  assert.strictEqual(matchWinner({ status:"finalizado", a:"ARG", b:"BRA", scoreA:1, scoreB:1 }), null);
  assert.strictEqual(matchWinner({ status:"abierto", a:"ARG", b:"BRA", scoreA:2, scoreB:1 }), null);
  assert.strictEqual(matchWinner({ status:"finalizado", a:null, b:"BRA", scoreA:2, scoreB:1 }), null);
});

test("matchLoser: el que no ganó; null si no hay ganador", () => {
  assert.strictEqual(matchLoser({ status:"finalizado", a:"ARG", b:"BRA", scoreA:2, scoreB:1 }), "BRA");
  assert.strictEqual(matchLoser({ status:"finalizado", a:"ARG", b:"BRA", scoreA:1, scoreB:1, advances:"ARG" }), "BRA");
  assert.strictEqual(matchLoser({ status:"finalizado", a:"ARG", b:"BRA", scoreA:1, scoreB:1 }), null);
});

test("resolveBracket: rellena un octavo desde dos 32avos finalizados", () => {
  const ms = [
    { id:"m73", round:"r32", a:"RSA", b:"CAN", status:"finalizado", scoreA:0, scoreB:1 },
    { id:"m75", round:"r32", a:"NED", b:"MAR", status:"finalizado", scoreA:1, scoreB:1, advances:"MAR" },
    { id:"m90", round:"r16", a:null, b:null, feed:{ a:{ m:"m73", pick:"W" }, b:{ m:"m75", pick:"W" } }, status:"abierto" },
  ];
  const m90 = resolveBracket(ms).find((x) => x.id === "m90");
  assert.strictEqual(m90.a, "CAN");
  assert.strictEqual(m90.b, "MAR");
});

test("resolveBracket: cadena r32 → r16 → qf en un solo llamado", () => {
  const ms = [
    { id:"m73", round:"r32", a:"RSA", b:"CAN", status:"finalizado", scoreA:0, scoreB:1 },
    { id:"m75", round:"r32", a:"NED", b:"MAR", status:"finalizado", scoreA:2, scoreB:0 },
    { id:"m74", round:"r32", a:"GER", b:"PAR", status:"finalizado", scoreA:0, scoreB:2 },
    { id:"m77", round:"r32", a:"FRA", b:"SWE", status:"finalizado", scoreA:3, scoreB:0 },
    { id:"m90", round:"r16", a:null, b:null, feed:{ a:{ m:"m73", pick:"W" }, b:{ m:"m75", pick:"W" } }, status:"finalizado", scoreA:1, scoreB:2 },
    { id:"m89", round:"r16", a:null, b:null, feed:{ a:{ m:"m74", pick:"W" }, b:{ m:"m77", pick:"W" } }, status:"finalizado", scoreA:0, scoreB:1 },
    { id:"m97", round:"qf", a:null, b:null, feed:{ a:{ m:"m89", pick:"W" }, b:{ m:"m90", pick:"W" } }, status:"abierto" },
  ];
  const byId = Object.fromEntries(resolveBracket(ms).map((m) => [m.id, m]));
  assert.strictEqual(byId.m90.a, "CAN"); assert.strictEqual(byId.m90.b, "NED");
  assert.strictEqual(byId.m89.a, "PAR"); assert.strictEqual(byId.m89.b, "FRA");
  assert.strictEqual(byId.m97.a, "FRA"); assert.strictEqual(byId.m97.b, "NED");
});

test("resolveBracket: 3er puesto toma los perdedores de las semis; final los ganadores", () => {
  const ms = [
    { id:"m101", round:"sf", a:"ARG", b:"FRA", status:"finalizado", scoreA:2, scoreB:0 },
    { id:"m102", round:"sf", a:"ESP", b:"BRA", status:"finalizado", scoreA:1, scoreB:1, advances:"ESP" },
    { id:"m103", round:"third", a:null, b:null, feed:{ a:{ m:"m101", pick:"L" }, b:{ m:"m102", pick:"L" } }, status:"abierto" },
    { id:"m104", round:"final", a:null, b:null, feed:{ a:{ m:"m101", pick:"W" }, b:{ m:"m102", pick:"W" } }, status:"abierto" },
  ];
  const byId = Object.fromEntries(resolveBracket(ms).map((m) => [m.id, m]));
  assert.strictEqual(byId.m103.a, "FRA"); assert.strictEqual(byId.m103.b, "BRA");
  assert.strictEqual(byId.m104.a, "ARG"); assert.strictEqual(byId.m104.b, "ESP");
});

test("resolveBracket: no pisa equipo ya cargado; feeder sin jugar queda null; no muta la entrada", () => {
  const ms = [
    { id:"m73", round:"r32", a:"RSA", b:"CAN", status:"finalizado", scoreA:0, scoreB:1 },
    { id:"m75", round:"r32", a:"NED", b:"MAR", status:"abierto" },
    { id:"m90", round:"r16", a:"XXX", b:null, feed:{ a:{ m:"m73", pick:"W" }, b:{ m:"m75", pick:"W" } }, status:"abierto" },
  ];
  const snapshot = JSON.parse(JSON.stringify(ms));
  const m90 = resolveBracket(ms).find((x) => x.id === "m90");
  assert.strictEqual(m90.a, "XXX");
  assert.strictEqual(m90.b, null);
  assert.deepStrictEqual(ms, snapshot);
});
