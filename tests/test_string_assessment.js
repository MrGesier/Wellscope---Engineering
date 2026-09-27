const assert = require("node:assert/strict"),
  A = require("../app/string-assessment"),
  R = require("../app/run-mechanics"),
  S = require("../app/string-contact");
const b = {
    name: "Tube",
    od: 0.1,
    id: 0.08,
    E: 210e9,
    G: 80e9,
    nu: 0.3,
    mass: 22,
    length: 100,
    contactOD: 0.1,
    source: "Analytic",
    bodyModel: "annular_tube",
    yieldPa: 500e6,
    designFactor: 1.5,
    limitSource: "Synthetic allowable",
  },
  g = R.section(b),
  zero = { wallN: 0, torqueNm: 0, insidePa: 0, outsidePa: 0 };
const near = (x, y, rel = 1e-9) =>
  assert.ok(
    Math.abs(x - y) < 1e-7 + rel * Math.max(1, Math.abs(y)),
    `${x} != ${y}`,
  );
near(A.stress(b, { ...zero, wallN: 1000 }, 0).vonMisesPa, 1000 / g.A);
near(
  A.stress(b, { ...zero, torqueNm: 1000 }, 0).vonMisesPa,
  (Math.sqrt(3) * 1000 * 0.05) / g.J,
);
near(A.stress(b, zero, 0.001).vonMisesPa, b.E * 0.05 * 0.001);
near(
  A.stress(b, { ...zero, wallN: -1e7 * g.A, insidePa: 1e7, outsidePa: 1e7 }, 0)
    .vonMisesPa,
  0,
);
near(
  A.stress(b, { ...zero, wallN: 1000, torqueNm: 300 }, 0).vonMisesPa,
  R.bodyStress(b, 1000, 300, 0, 0),
);
// Independent brute-force stress tensor oracle across radius and circumference.
const l = { wallN: -8000, torqueNm: 300, insidePa: 9e6, outsidePa: 12e6 },
  k = 0.004,
  got = A.stress(b, l, k);
let peak = 0;
for (let i = 0; i <= 100; i++) {
  const r = 0.04 + (0.01 * i) / 100,
    aa =
      (l.insidePa * 0.04 ** 2 - l.outsidePa * 0.05 ** 2) /
      (0.05 ** 2 - 0.04 ** 2),
    bb =
      ((l.insidePa - l.outsidePa) * 0.04 ** 2 * 0.05 ** 2) /
      (0.05 ** 2 - 0.04 ** 2),
    sr = aa - bb / r ** 2,
    sh = aa + bb / r ** 2,
    t = (l.torqueNm * r) / g.J;
  for (let j = 0; j <= 360; j++) {
    const z = l.wallN / g.A + b.E * k * r * Math.cos((j * Math.PI) / 180);
    peak = Math.max(
      peak,
      Math.sqrt(
        ((z - sr) ** 2 + (z - sh) ** 2 + (sr - sh) ** 2) / 2 + 3 * t * t,
      ),
    );
  }
}
near(got.vonMisesPa, peak);
const p = {
  source: "Analytic run",
  quality: "SYNTHETIC",
  survey: [
    { md: 0, inc: 0, azi: 0 },
    { md: 100, inc: 0, azi: 0 },
  ],
  components: [b],
  sections: [
    { from: 0, to: 100, diameter: 0.3, kind: "OPEN", source: "Analytic" },
  ],
  bitMD: 100,
  stepM: 5,
  tensionN: 0,
  rho: 0,
  axial: {
    mode: "soft-string",
    source: "Analytic",
    stepM: 5,
    muOpen: 0,
    muCased: 0,
    bottomForceN: 1000,
    bottomTorqueNm: 300,
    axialSpeedMps: 0.1,
    rpm: 60,
    blockN: 0,
  },
};
const shape = S.solve(p),
  r = A.assess(p, shape);
near(r.twistRad, (300 * 100) / (b.G * g.J));
near(r.extensionM, (1000 * 100 + (22 * 9.80665 * 100 ** 2) / 2) / (b.E * g.A));
near(r.rotationalPowerW, 300 * 2 * Math.PI);
near(r.rotationalFrictionPowerW, 0);
assert.equal(r.status, "WITHIN_SAMPLED_BODY_LIMITS");
assert.ok(r.excludedStations > 0);
const low = structuredClone(p);
low.components[0].yieldPa = 1;
const bad = A.assess(low, S.solve(low));
assert.equal(bad.status, "EXCEEDED");
assert.ok(bad.worst.utilization > 1);
const unknown = structuredClone(p);
delete unknown.components[0].G;
delete unknown.components[0].nu;
delete unknown.components[0].limitSource;
const u = A.assess(unknown, S.solve(unknown));
assert.equal(u.twistRad, null);
assert.equal(u.extensionM, null);
assert.equal(u.status, "NOT_FULLY_EVALUABLE");
assert.ok(u.rows.some((n) => n.combined));
assert.ok(u.rows.every((n) => n.utilization === null));
const snapshot = JSON.stringify(shape);
A.assess(p, shape);
assert.equal(JSON.stringify(shape), snapshot);
const split = structuredClone(p);
split.components = [
  { ...b, length: 50 },
  { ...b, length: 50 },
];
const ss = A.assess(split, S.solve(split));
assert.equal(ss.rows.find((n) => n.md === 50).combined, null);
assert.equal(ss.rows.find((n) => n.md === 50).momentNm, null);
assert.ok(ss.rows.find((n) => n.md === 45).combined);
console.log(
  "Combined stress tensor oracle, hydrostatic invariance, torsion/extension, source gates, interfaces and immutability passed",
);

const hydro = structuredClone(p);
hydro.rho = 1200;
hydro.components[0].mass = hydro.rho * g.A;
hydro.axial.bottomForceN = 0;
hydro.axial.bottomTorqueNm = 0;
const hr = A.assess(hydro, S.solve(hydro));
near(
  hr.extensionM,
  (-(1 - 2 * b.nu) * hydro.rho * 9.80665 * 100 ** 2) / (2 * b.E),
);
const compressed = structuredClone(p);
compressed.axial.bottomForceN = -1000;
const cr = A.assess(compressed, S.solve(compressed));
near(cr.neutralMD[0], 100 - 1000 / (22 * 9.80665), 1e-7);
assert.ok(cr.coverage.some((x) => x.includes("compression")));
console.log(
  "Hydrostatic Poisson strain and analytic effective-force neutral depth passed",
);
