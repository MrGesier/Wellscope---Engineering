const M = require("../app/bha-static");
const assert = require("node:assert/strict");
function fixture(n = 40) {
  return {
    bitMD: 100,
    length: 6,
    n,
    inc: 90,
    wobN: 0,
    torqueNm: 1000,
    rho: 0,
    sections: [
      {
        from: 0,
        to: 101,
        diameter: 2,
        kind: "OPEN",
        source: "Analytic fixture",
      },
    ],
    components: [
      {
        name: "Uniform tube",
        length: 6,
        od: 0.171,
        id: 0.071,
        contactOD: 0.171,
        E: 210e9,
        G: 80e9,
        mass: 145,
        source: "Analytic fixture",
      },
    ],
  };
}
const p = fixture(),
  b = p.components[0],
  I = (Math.PI * (b.od ** 4 - b.id ** 4)) / 64,
  J = 2 * I,
  q = b.mass * 9.80665;
const r = M.solve(p),
  expected = (5 * q * p.length ** 4) / (384 * b.E * I);
console.log({
  offset: r.maxOffset,
  expected,
  iterations: r.iterations,
  residual: r.residualN,
});
assert.ok(
  Math.abs(r.maxOffset / expected - 1) < 0.015,
  "Simply-supported uniformly loaded beam deflection",
);
assert.ok(
  Math.abs(r.twistRad - (p.torqueNm * p.length) / (b.G * J)) < 1e-10,
  "Saint-Venant twist",
);
assert.ok(
  Math.abs(r.maxBendingPa / ((((q * p.length ** 2) / 8) * b.od) / 2 / I) - 1) <
    0.015,
  "Bending moment",
);
const fine = M.solve(fixture(60));
assert.ok(
  Math.abs(fine.maxOffset - r.maxOffset) / fine.maxOffset < 0.01,
  "Mesh consistency",
);
const vertical = fixture();
vertical.inc = 0;
assert.equal(M.solve(vertical).maxOffset, 0);
const compressed = fixture();
compressed.wobN = 100000;
assert.ok(M.solve(compressed).maxOffset > r.maxOffset);
const unstable = fixture();
unstable.wobN = (2 * Math.PI ** 2 * b.E * I) / p.length ** 2;
assert.throws(() => M.solve(unstable), /UNSTABLE/);
const constrained = fixture();
constrained.sections[0].diameter = 0.174;
const c = M.solve(constrained);
assert.ok(c.contacts > 0);
assert.ok(c.rows.every((v) => v.offset <= (0.174 - 0.171) / 2 + 1e-9));
const interference = fixture();
interference.sections[0].diameter = 0.15;
assert.throws(() => M.solve(interference), /Interference/);
const bad = fixture();
bad.sections[0].from = 1;
assert.throws(() => M.solve(bad), /contiguous/);
const torque = fixture();
torque.torqueNm = 9000;
assert.equal(
  M.solve(torque).maxOffset,
  r.maxOffset,
  "Uncoupled torque must not invent lateral bending",
);
console.log("Static BHA analytical and contact tests passed");

assert.ok(
  Math.abs(
    r.rows.reduce((s, v) => s + v.reactionVectorN[1], 0) + q * p.length,
  ) < 0.001,
  "Global transverse equilibrium",
);
const curved = fixture();
curved.centers = Array.from({ length: 41 }, (_, i) => [
  0.002 * Math.sin((Math.PI * i) / 40),
  0.001 * Math.sin((Math.PI * i) / 40),
]);
curved.sections[0].diameter = 0.174;
const cr = M.solve(curved);
assert.ok(
  cr.rows.every((v) => v.offset <= 0.0015 + 1e-9),
  "Two-plane circular constraints",
);
