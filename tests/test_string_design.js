const assert = require("node:assert/strict"),
  S = require("../app/string-contact"),
  G = require("../app/string-geometry"),
  C = require("../app/engineering-case").demo();
const base = {
  source: "Analytic beam",
  quality: "SYNTHETIC",
  survey: [
    { md: 0, inc: 90, azi: 0 },
    { md: 10, inc: 90, azi: 0 },
  ],
  components: [3.7, 6.3].map((length) => ({
    name: "beam",
    length,
    od: 0.1,
    id: 0.08,
    mass: 22,
    E: 210e9,
    contactOD: 0.1,
    source: "Analytic",
  })),
  sections: [
    { from: 0, to: 10, diameter: 2, kind: "OPEN", source: "Analytic" },
  ],
  bitMD: 10,
  stepM: 2,
  tensionN: 0,
  rho: 0,
  adaptive: true,
};
const EI = (210e9 * Math.PI * (0.1 ** 4 - 0.08 ** 4)) / 64,
  q = 22 * 9.80665,
  expected = (x) => (q * x * (1000 - 20 * x * x + x ** 3)) / (24 * EI);
let prior = Infinity;
for (const fineStepM of [2, 1, 0.5, 0.25]) {
  const r = S.solve({ ...base, fineStepM }),
    error = Math.max(...r.rows.map((n) => Math.abs(n.offset - expected(n.md))));
  assert.ok(error < prior);
  prior = error;
  assert.ok(r.rows.some((r) => Math.abs(r.md - 6.3) < 1e-9));
  assert.ok(r.rows.every((r) => r.offset <= r.gap + 1e-9));
}
const p = {
  source: "Synthetic detailed joints",
  quality: "SYNTHETIC",
  survey: C.survey,
  components: C.bha.map((b) => ({
    ...b,
    E: 210e9,
    contactOD: b.od,
    ...(/drill-pipe|hwdp/.test(b.type)
      ? { jointSpacing: 9.3, jointLength: 0.45, jointOD: 0.168 }
      : {}),
  })),
  sections: C.sections.map((s) => ({
    from: s.from,
    to: s.to,
    diameter: s.id,
    kind: s.name === "Open hole" ? "OPEN" : "CASED",
    source: "Synthetic",
  })),
  bitMD: 3800,
  stepM: 10,
  tensionN: 0,
  rho: 1260,
  adaptive: true,
  fineStepM: 0.5,
};
const r = S.solve(p);
assert.ok(r.residualN < 0.5);
assert.ok(r.iterations < 1000);
assert.ok(r.minStepM < 0.2);
for (const b of r.parts)
  for (const x of [b.start, b.end])
    if (x <= p.bitMD)
      assert.ok(r.rows.some((n) => Math.abs(n.md - (p.bitMD - x)) < 1e-6));
assert.equal(r.rows[0].md, 0);
assert.equal(r.rows.at(-1).md, 3800);
assert.ok(r.rows.every((n) => n.offset <= n.gap + 1e-9));
const mid = (r.rows[450].md + r.rows[451].md) / 2,
  s = G.station(r.rows, mid);
assert.ok(
  Math.abs(
    s.position[0] - (r.rows[450].position[0] + r.rows[451].position[0]) / 2,
  ) < 1e-9,
);
const snapshot = JSON.stringify(r),
  mesh = G.mesh(p, r, 3740, 3800, 20);
assert.ok(mesh.parts.length >= 8);
assert.ok(mesh.bores.length);
for (const part of [...mesh.parts, ...mesh.bores.map((b) => b.cut)]) {
  assert.ok(part.positions.every(Number.isFinite));
  assert.ok(part.indices.every((i) => i >= 0 && i < part.positions.length / 3));
}
assert.equal(JSON.stringify(r), snapshot);
assert.ok(
  mesh.nodes
    .filter((n) => n.contact)
    .every((n) => n.point.every(Number.isFinite)),
);
assert.throws(() => S.solve({ ...p, fineStepM: 0.01 }), /Local mesh step/);
console.log(
  "Adaptive analytical convergence, exact interfaces, refined joints, nonuniform interpolation and 3D geometry passed",
);

const E = require("../app/engine"),
  arc = E.survey([
    { md: 0, inc: 0, azi: 0 },
    { md: 100, inc: 90, azi: 0 },
  ]),
  half = S.surveyAt(arc, 50),
  radius = 200 / Math.PI;
assert.ok(Math.abs(half.n - radius * (1 - Math.cos(Math.PI / 4))) < 1e-9);
assert.ok(Math.abs(half.tvd - radius * Math.sin(Math.PI / 4)) < 1e-9);
assert.ok(Math.abs(half.inc - 45) < 1e-9);
