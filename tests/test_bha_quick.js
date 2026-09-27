const assert = require("node:assert/strict"),
  F = require("../app/string-phase"),
  Q = require("../app/bha-quick"),
  D = require("../app/directional-response");
const b = {
  length: 20,
  od: 0.1,
  id: 0.08,
  mass: 22,
  E: 210e9,
  contactOD: 0.1,
  source: "Analytic",
};
const p = {
  source: "Vertical analytic",
  quality: "SYNTHETIC",
  survey: [
    { md: 0, inc: 0, azi: 0 },
    { md: 100, inc: 0, azi: 0 },
  ],
  sections: [
    { from: 0, to: 100, diameter: 0.3, kind: "OPEN", source: "Analytic" },
  ],
  components: [
    "bit",
    "drill-collar",
    "stabilizer",
    "jar",
    "accelerator",
    "drill-pipe",
  ].map((type) => ({ ...b, type, name: type })),
  bitMD: 100,
  stepM: 5,
  tensionN: 0,
  rho: 1200,
};
const before = JSON.stringify(p),
  variants = F.variants(p, 2, 1);
assert.equal(variants.length, 3);
for (const v of variants) {
  assert.equal(v.input.components[0].type, "bit");
  assert.equal(v.input.components.at(-1).type, "drill-pipe");
  assert.deepEqual(
    v.input.components.map((b) => b.type).sort(),
    p.components.map((b) => b.type).sort(),
  );
}
assert.throws(() => F.variants(p, 0, 1));
assert.throws(() => F.depths(p, 10, 101, 3));
assert.throws(() => F.depths(p, 10, 90, 22));
assert.deepEqual(F.depths(p, 20, 100, 3), [20, 60, 100]);
const r = F.sample(p, 100);
assert.equal(r.status, "SOLVED_SCREENING");
assert.equal(r.contactN, 0);
assert.ok(r.bendingPa < 1e-6);
assert.equal(r.maxSurveyDLS, 0);
const bad = structuredClone(p);
bad.components[1].contactOD = 0.4;
assert.equal(F.sample(bad, 100).status, "GEOMETRIC_INTERFERENCE");
const candidates = Q.generate(p);
assert.ok(candidates.length > 1);
for (const c of candidates) {
  const j = c.input.components.findIndex((b) => b.type === "jar");
  assert.equal(c.input.components[j + 1].type, "accelerator");
}
const opt = {
  maxBuild: 3,
  maxDrop: 3,
  maxDLS: 4,
  tolerance: 0,
  target: { n: 0, e: 0, tvd: 100 },
};
assert.equal(Q.geometry(p, opt).targetWithinTolerance, true);
assert.equal(
  Q.geometry(p, { ...opt, target: { n: 1, e: 0, tvd: 100 } })
    .targetWithinTolerance,
  false,
);
assert.deepEqual(Q.requirements(p, ["gamma", "mwd"]), ["gamma", "mwd"]);
assert.deepEqual(
  Q.requirements({ ...p, components: [{ type: "mwd" }] }, ["gamma", "mwd"]),
  ["gamma"],
);
const curve = {
  study: p,
  surface: D.demo(),
  settings: {
    mode: "rotating",
    wobN: 40000,
    activation: 0,
    toolface: 0,
    inclination: 0,
  },
};
assert.equal(Q.directional({ input: p }, [curve], opt).status, "SYNTHETIC");
const changed = structuredClone(p);
changed.rho = 1250;
assert.equal(
  Q.directional({ input: changed }, [curve], opt).status,
  "MISSING_BHA_RESPONSE",
);
assert.equal(Q.loads(p, 100).status, "MISSING_LOAD_INPUTS");
const loaded = {
  ...p,
  axial: {
    mode: "soft-string",
    source: "Analytic",
    stepM: 5,
    muOpen: 0.3,
    muCased: 0.2,
    bottomForceN: 1234,
    bottomTorqueNm: 555,
    axialSpeedMps: 0.1,
    rpm: 60,
    blockN: 0,
  },
};
const lr = Q.loads(loaded, 100);
assert.equal(lr.status, "CALCULATED");
assert.ok(Math.abs(lr.pickup.hookN - lr.slackoff.hookN) < 1e-6);
assert.ok(Math.abs(lr.rotating.torqueNm) < 1e-6);
const c = (contact, bending) => ({
  missing: [],
  geometry: Q.geometry(p, opt),
  rows: [
    {
      status: "SOLVED_SCREENING",
      contactN: contact,
      bendingPa: bending,
      bodyStatus: "NOT_FULLY_EVALUABLE",
    },
  ],
  loads: [],
});
const ranking = Q.shortlist([c(1, 3), c(2, 4), c(3, 1)]);
assert.deepEqual(
  ranking.map((c) => c.mechanicalCandidate),
  [true, false, true],
);
ranking[0].rows[0].bodyStatus = "EXCEEDED";
Q.shortlist(ranking);
assert.equal(ranking[0].mechanicalCandidate, false);
assert.equal(JSON.stringify(p), before);
console.log("Phase and quick BHA analytical tests passed");

assert.equal(r.peakContact, null);
assert.ok(r.peakBending.md > 0 && r.peakBending.md < 100);
assert.equal(typeof r.peakBending.name, "string");
assert.throws(
  () => Q.directional({ input: p }, [curve, structuredClone(curve)], opt),
  /Ambiguous/,
);
for (const invalid of [
  [],
  [{ status: "SOLVED_SCREENING", contactN: NaN, bendingPa: 1 }],
  [{ status: "SOLVED_SCREENING", contactN: 1, bendingPa: Infinity }],
]) {
  const row = c(1, 1);
  row.rows = invalid;
  Q.shortlist([row]);
  assert.equal(row.mechanicalCandidate, false);
  assert.equal(row.metrics, null);
  assert.ok(row.blockers.some((s) => s.includes("Incomplete mechanical")));
}
const exceededAxial = c(1, 1);
exceededAxial.rows[0].axialStatus = "EXCEEDED";
Q.shortlist([exceededAxial]);
assert.equal(exceededAxial.mechanicalCandidate, false);
assert.match(exceededAxial.comparisonReason, /load case/);
const diagnosed = Q.shortlist([c(1, 3), c(2, 4)]);
assert.deepEqual(diagnosed[1].deltaFromReference, [1, 1]);
assert.match(diagnosed[1].comparisonReason, /Another eligible/);
assert.ok(diagnosed[0].unresolved.some((s) => s.includes("distributed load")));
const missing = c(1, 1);
missing.missing = ["gamma"];
Q.shortlist([missing]);
assert.match(missing.comparisonReason, /gamma/);
console.log(
  "Comparison diagnostics, missing-data refusal, peak location and duplicate-response tests passed",
);
