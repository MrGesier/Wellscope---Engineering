const assert = require("node:assert/strict"),
  M = require("../app/operating-windows");
const close = (a, b) =>
  assert.ok(Math.abs(a - b) < 1e-8 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const p = {
  od: 0.1,
  id: 0,
  E: 200e9,
  G: 80e9,
  rho: 8000,
  massPerM: 20,
  addedMassPerM: 0,
  span: 10,
  rodLength: 1000,
};
const zero = M.modal(p, 0);
close(zero.modes.find((m) => m.kind === "Axial").hz, 1.25);
close(zero.modes.find((m) => m.kind === "Torsional").hz, Math.sqrt(1e7) / 4000);
close(M.modal({ ...p, span: 20 }, 0).modes[0].hz, zero.modes[0].hz / 4);
close(
  M.modal({ ...p, addedMassPerM: 60 }, 0).modes[0].hz,
  zero.modes[0].hz / 2,
);
close(M.modal(p, zero.criticalN * 0.75).modes[0].hz, zero.modes[0].hz / 2);
assert.equal(M.modal(p, zero.criticalN).unstable, true);
assert.equal(M.modal(p, zero.criticalN).modes[0].hz, null);
close(M.response(10, 10, 0.05, 100, 1000).amplification, 10);
close(M.response(10, 0, 0.05, 100, 1000).amplification, 1);
assert.throws(() => M.response(10, 10, 0, 100, 1000));
const section = {
  od: 0.1,
  id: 0,
  yieldPa: 200e6,
  designFactor: 2,
  localTensionN: 100000,
  torqueNm: 0,
  connectionN: 1e6,
  connectionNm: 10000,
  hookN: 200000,
  rigN: 250000,
  surfaceTorqueNm: 1000,
  driveNm: 2000,
};
let r = M.mechanical(section);
close(r.bodyTensionN, ((Math.PI * 0.1 ** 2) / 4) * 1e8);
close(r.overpullN, 50000);
assert.equal(r.governing, "Rig hookload");
assert.equal(
  M.mechanical({ ...section, surfaceTorqueNm: 2500 }).status,
  "EXCEEDED",
);
assert.equal(M.mechanical({ ...section, torqueNm: 20000 }).overpullN, 0);
assert.throws(() => M.mechanical({ ...section, id: 0.2 }));
const rows = [
    { scenario: "A", wobN: 0, build: -1, right: 0 },
    { scenario: "A", wobN: 100, build: 1, right: 0 },
    { scenario: "B", wobN: 0, build: 0, right: 0.2 },
    { scenario: "B", wobN: 100, build: 0, right: 0.2 },
  ],
  limits = { buildMin: -0.1, buildMax: 0.1, dlsMax: 0.3 };
assert.equal(M.directional(rows, 50, limits).status, "WITHIN_ENTERED_LIMITS");
assert.equal(M.directional(rows, 100, limits).status, "EXCEEDED");
assert.equal(M.directional(rows, 101, limits).status, "NOT_EVALUABLE");
assert.equal(M.directional([], 50, limits).status, "NOT_EVALUABLE");
assert.throws(() => M.directional([...rows, { ...rows[0] }], 50, limits));
assert.ok(
  M.modal(p, 0, 10).modes.some((m) => m.kind === "Axial" && m.mode > 3),
);
assert.throws(() => M.modal({ ...p, rodLength: 1e8 }, 0, 10), /300 modes/);
console.log(
  "PASS: independent rod frequency, span-length/added-mass/compression scaling, Euler instability, resonance damping, body yield and governing overpull, separate surface torque, intersection and non-extrapolation",
);
