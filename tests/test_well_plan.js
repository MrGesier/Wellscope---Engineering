const assert = require("node:assert/strict"),
  W = require("../app/well-plan"),
  M = require("../app/drilling-program");
const survey = W.survey("md,inc,azi\n0,0,0\n100,10,0"),
  sections = W.architecture(
    "from_m,to_m,diameter_mm,kind\n0,100,216,OPEN",
    "Test",
  );
const components = W.starter(100, 0.216, ["gamma", "mwd"]);
assert.ok(Math.abs(components.reduce((s, b) => s + b.length, 0) - 100) < 1e-8);
assert.ok(
  components.every((b) => b.contactOD <= 0.216 && b.E > 0 && b.mass > 0),
);
assert.ok(components.some((b) => b.capabilities.includes("gamma")));
assert.throws(() => W.survey("md,inc,azi\n,0,0\n100,1,0"), /Missing/);
assert.throws(() => W.starter(40, 0.216), /TD/);
const p = W.programme({
  name: "Test",
  source: "Fixture",
  survey,
  sections,
  components,
  generated: true,
  required: ["gamma"],
  plan: { wobTf: 5, rpm: 80, ropMph: 10, flowLpm: 1000, mudKgM3: 1200 },
  intervals: [],
});
assert.equal(p.study.quality, "SYNTHETIC");
assert.equal(p.intervals[0].lithology, "Unknown formation");
assert.equal(p.intervals[0].limits, undefined);
M.validate(p);
assert.equal(
  W.selectCandidate([
    { mechanicalCandidate: false, blockers: [], metrics: [0, 0] },
  ]),
  null,
);
assert.equal(
  W.selectCandidate([
    { name: "B", mechanicalCandidate: true, blockers: [], metrics: [10, 3] },
    { name: "A", mechanicalCandidate: true, blockers: [], metrics: [8, 4] },
  ]).name,
  "A",
);
console.log(
  "PASS: well preparation, strict CSV, assumed geometry, full tally coverage, missing formation preservation and eligible candidate selection",
);
