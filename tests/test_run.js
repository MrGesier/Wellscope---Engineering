const assert = require("node:assert/strict"),
  M = require("../app/run-mechanics");
const close = (a, b, t = 1e-8) =>
  assert.ok(Math.abs(a - b) <= t * Math.max(1, Math.abs(b)), `${a} != ${b}`);
function fixture(inc = 0) {
  return {
    id: "test",
    revision: "1",
    source: "Analytical fixture",
    well: "TEST",
    reference: "RT",
    quality: "SYNTHETIC",
    survey: [
      { md: 0, inc, azi: 0 },
      { md: 100, inc, azi: 0 },
    ],
    bha: [
      {
        name: "Tube",
        stable_id: "T",
        source: "Analytical fixture",
        limitSource: "Fictional limits",
        length: 100,
        od: 0.1,
        id: 0.08,
        mass: 30,
        bodyModel: "annular_tube",
        yieldPa: 700e6,
        designFactor: 1.2,
        allowableTensionN: 1e6,
        allowableTorqueNm: 1e5,
        allowableCompressionN: 1e6,
      },
    ],
    settings: {
      bitMD: 100,
      stepM: 5,
      muOpen: 0.2,
      muCased: 0.1,
      shoeMD: 0,
      rhoInside: 0,
      rhoOutside: 0,
      surfaceInsidePa: 0,
      surfaceOutsidePa: 0,
      bottomForceN: 10000,
      bottomTorqueNm: 100,
      axialSpeedMps: 0.2,
      rpm: 0,
      blockN: 1000,
      rigLimitN: 2e6,
      driveLimitNm: 1e5,
      limitSource: "Fictional rig",
      operation: "Pickup",
    },
  };
}
let p = fixture(),
  r = M.solve(p);
close(r.hookN, 10000 + 100 * 30 * 9.80665 + 1000);
close(r.surfaceTorqueNm, 100);
assert.equal(r.status, "WITHIN_CONFIGURED_LIMITS");
p = fixture(90);
r = M.solve(p);
close(r.topEffectiveN, 10000 + 0.2 * 100 * 30 * 9.80665);
p.settings.axialSpeedMps = -0.2;
close(M.solve(p).topEffectiveN, 10000 - 0.2 * 100 * 30 * 9.80665);
p.settings.axialSpeedMps = 0.2;
p.settings.rpm = 60;
r = M.solve(p);
const v = Math.hypot(0.2, 2 * Math.PI * 0.05),
  drag = 0.2 * 100 * 30 * 9.80665;
close(r.axialDragN, (drag * 0.2) / v);
close(r.surfaceTorqueNm, 100 + ((drag * (2 * Math.PI * 0.05)) / v) * 0.05);
p = fixture();
p.settings.rhoInside = 1200;
p.settings.rhoOutside = 1400;
r = M.solve(p);
const a = M.section(p.bha[0]),
  w = 9.80665 * (30 + 1200 * a.Ai - 1400 * a.Ao);
close(r.topEffectiveN, 10000 + 100 * w);
const bottom = r.rows.at(-1);
close(
  bottom.wallN,
  10000 + 1200 * 9.80665 * 100 * a.Ai - 1400 * 9.80665 * 100 * a.Ao,
);
// Hydrostatic equal pressure and closed-end wall compression give zero deviatoric stress.
close(M.bodyStress(p.bha[0], -1e6 * a.A, 0, 1e6, 1e6), 0, 1e-6);
p = fixture();
p.bha = [
  { ...p.bha[0], length: 40 },
  {
    ...p.bha[0],
    stable_id: "UPPER",
    name: "Upper",
    length: 60,
    od: 0.12,
    mass: 40,
  },
];
r = M.solve(p);
assert.equal(r.rows.filter((x) => x.md === 60).length, 2);
close(r.topEffectiveN, 10000 + (40 * 30 + 60 * 40) * 9.80665);
delete p.bha[1].allowableTorqueNm;
assert.equal(M.solve(p).status, "NOT_FULLY_EVALUABLE");
assert.equal(M.overpull(p).status, "NOT_EVALUABLE");
p = fixture();
p.bha[0].allowableTensionN = 50000;
r = M.solve(p);
const op = M.overpull(p, r);
close(op.additionalHookN, 50000 - r.topEffectiveN, 1e-5);
assert.equal(op.governing.componentId, "T");
p.settings.bottomForceN = -100;
assert.match(M.solve(p).coverage.join(" "), /buckling/);
p = fixture();
r = M.solve(p);
const ref = {
  runId: p.id,
  revision: p.revision,
  well: p.well,
  datum: p.reference,
  operation: p.settings.operation,
  source: "Analytic",
  inputMatchConfirmed: true,
  rows: [{ md: 42.5, effectiveN: 10000 + (100 - 42.5) * 30 * 9.80665 }],
};
close(M.compare(r, p, ref).metrics[0].rmse, 0, 1e-7);
assert.throws(() => M.compare(r, p, { ...ref, revision: "wrong" }), /mismatch/);
assert.throws(
  () => M.compare(r, p, { ...ref, rows: [{ md: 101, effectiveN: 1 }] }),
  /range/,
);
p = fixture();
p.survey = [
  { md: 0, inc: 0, azi: 350 },
  { md: 100, inc: 60, azi: 10 },
];
p.settings.stepM = 1;
const fine = M.solve(p);
p.settings.stepM = 2;
close(M.solve(p).topEffectiveN, fine.topEffectiveN, 1e-4);
console.log(
  "Distributed run mechanics: analytic balance, helical friction, pressure, boundaries, coverage, pull and reference tests passed",
);

// Strict SI input typing avoids string concatenation in boundary loads.
p = fixture();
p.settings.bottomForceN = "10000";
assert.throws(() => M.solve(p), /range/);
// Pressure-induced wall compression is assessed independently of effective buckling.
p = fixture();
p.settings.rhoInside = 1200;
p.settings.rhoOutside = 1200;
assert.equal(M.overpull(p).status, "MODEL_HEADROOM");
// Frictionless curvature has only the axial weight projection.
p = fixture();
p.survey = [
  { md: 0, inc: 0, azi: 0 },
  { md: 100, inc: 60, azi: 0 },
];
p.settings.muOpen = 0;
p.settings.stepM = 0.25;
close(
  M.solve(p).topEffectiveN,
  10000 + (30 * 9.80665 * 100 * Math.sin(Math.PI / 3)) / (Math.PI / 3),
  1e-6,
);

// Independently known solutions: straight vertical can be linear; a build cannot.
const curved = fixture();
curved.survey = [
  { md: 0, inc: 0, azi: 0 },
  { md: 100, inc: 60, azi: 0 },
];
Object.assign(curved.settings, {
  muOpen: 0,
  muCased: 0,
  bottomForceN: 0,
  blockN: 0,
  stepM: 0.25,
});
const hooks = [25, 50, 100].map((md) => {
  curved.settings.bitMD = md;
  return M.solve(curved).hookN;
});
const curvature = Math.PI / 3 / 100,
  weight = 30 * 9.80665;
[25, 50, 100].forEach((md, i) =>
  close(hooks[i], (weight * Math.sin(curvature * md)) / curvature, 4e-7),
);
assert.ok(
  Math.abs(hooks[2] - 2 * hooks[1]) > 1000,
  "Build-section hookload is not linear with MD",
);
// Weightless horizontal turn: capstan amplification T_top=T_bottom exp(mu*deltaAzimuth).
const capstan = fixture(90);
capstan.bha[0].mass = 5;
capstan.settings.rhoInside = capstan.settings.rhoOutside =
  5 / M.section(capstan.bha[0]).A;
capstan.survey = [
  { md: 0, inc: 90, azi: 0 },
  { md: 100, inc: 90, azi: 90 },
];
Object.assign(capstan.settings, {
  blockN: 0,
  bottomForceN: 10000,
  muOpen: 0.2,
  stepM: 5,
});
close(
  M.solve(capstan).topEffectiveN,
  10000 * Math.exp((0.2 * Math.PI) / 2),
  1e-8,
);
capstan.settings.axialSpeedMps = -0.2;
close(
  M.solve(capstan).topEffectiveN,
  10000 * Math.exp((-0.2 * Math.PI) / 2),
  1e-8,
);
console.log(
  "PASS: nonlinear curved-depth and capstan pickup/slackoff analytic benchmarks",
);
