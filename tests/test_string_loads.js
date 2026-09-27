const assert = require("node:assert/strict"),
  L = require("../app/string-loads"),
  S = require("../app/string-contact");
const p = {
  source: "Analytic vertical",
  quality: "SYNTHETIC",
  survey: [
    { md: 0, inc: 0, azi: 0 },
    { md: 100, inc: 0, azi: 0 },
  ],
  components: [
    {
      name: "Tube",
      length: 100,
      od: 0.1,
      id: 0.08,
      mass: 22,
      E: 210e9,
      contactOD: 0.1,
      source: "Analytic",
    },
  ],
  sections: [
    { from: 0, to: 100, diameter: 0.3, kind: "OPEN", source: "Analytic" },
  ],
  bitMD: 100,
  stepM: 5,
  tensionN: 0,
  rho: 1200,
  axial: {
    mode: "soft-string",
    source: "Analytic",
    stepM: 5,
    muOpen: 0.3,
    muCased: 0.2,
    bottomForceN: 1000,
    bottomTorqueNm: 0,
    axialSpeedMps: 0.1,
    rpm: 0,
    blockN: 0,
  },
};
const original = JSON.stringify(p),
  r = L.solve(p),
  w = (22 - (1200 * Math.PI * (0.1 ** 2 - 0.08 ** 2)) / 4) * 9.80665;
const close = (a, b, tol = 1e-7) =>
  assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
close(r.topEffectiveN, 1000 + 100 * w);
close(L.at(r, 25.5), 1000 + 74.5 * w);
close(L.average(r, 2.3, 94.7), 1000 + 51.5 * w);
const shape = S.solve(p);
close(shape.rows[0].effectiveN, r.topEffectiveN);
assert.ok(shape.rows.every((n) => n.offset < 1e-8));
assert.equal(JSON.stringify(p), original);
const q = structuredClone(p);
q.survey.forEach((s) => (s.inc = 90));
q.rho = 0;
q.axial.muOpen = 0;
q.axial.bottomForceN = 10000;
const coupled = S.solve(q),
  constant = S.solve({ ...q, axial: undefined, tensionN: 10000 });
coupled.rows.forEach((n, i) => close(n.offset, constant.rows[i].offset));
q.axial.muOpen = 0.2;
const up = L.solve(q);
q.axial.axialSpeedMps = -0.1;
const down = L.solve(q);
assert.ok(up.hookN > down.hookN);
close(up.hookN - down.hookN, 2 * 0.2 * 22 * 9.80665 * 100);
q.axial.rpm = 90;
assert.ok(L.solve(q).surfaceTorqueNm > 0);
q.axial.rigLimitN = 1;
assert.equal(L.solve(q).status, "EXCEEDED");
assert.ok(L.solve(q).coverage.length > 0);
q.sections = [
  { from: 0, to: 40, diameter: 0.3, kind: "OPEN", source: "test" },
  { from: 40, to: 100, diameter: 0.3, kind: "CASED", source: "test" },
];
assert.throws(() => L.solve(q), /cased prefix/);
assert.throws(
  () => L.solve({ ...p, axial: { ...p.axial, mode: "unknown" } }),
  /mode/,
);
assert.throws(
  () => L.solve({ ...p, axial: { ...p.axial, stepM: NaN } }),
  /range/,
);
const C = require("../app/engineering-case").demo(),
  demo = {
    ...p,
    survey: C.survey,
    components: C.bha.map((b) => ({ ...b, E: 210e9, contactOD: b.od })),
    sections: C.sections.map((s) => ({
      from: s.from,
      to: s.to,
      diameter: s.id,
      kind: s.name === "Open hole" ? "OPEN" : "CASED",
      source: "Synthetic",
    })),
    bitMD: 3800,
    stepM: 10,
    adaptive: true,
    fineStepM: 1,
  };
const dr = S.solve(demo);
assert.ok(dr.residualN < 0.5);
assert.ok(dr.axial.topEffectiveN > 1000);
assert.ok(dr.rows.every((n) => n.offset <= n.gap + 1e-9));
console.log(
  "Distributed shape loads: vertical balance, integrated profile, constant equivalence, drag signs, rotation, missing limits, invalid architecture, full-depth equilibrium passed",
);
