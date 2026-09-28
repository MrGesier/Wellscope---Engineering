const assert = require("node:assert/strict"),
  M = require("../app/drilling-program"),
  E = require("../app/engine");
const study = {
  source: "Analytical test",
  quality: "SYNTHETIC",
  survey: [
    { md: 0, inc: 0, azi: 0 },
    { md: 100, inc: 0, azi: 0 },
  ],
  sections: [
    { from: 0, to: 100, diameter: 0.3, kind: "OPEN", source: "Analytical" },
  ],
  components: [
    {
      name: "Pipe",
      type: "drillpipe",
      length: 100,
      od: 0.1,
      id: 0.08,
      mass: 30,
      E: 210e9,
      source: "Analytical",
    },
  ],
  rho: 1200,
  bitMD: 100,
  axial: {
    mode: "soft-string",
    source: "Analytical",
    stepM: 5,
    muOpen: 0.2,
    muCased: 0.1,
    bottomForceN: 0,
    bottomTorqueNm: 0,
    axialSpeedMps: 0.1,
    rpm: 100,
    blockN: 0,
  },
};
const p = M.demo(study),
  st = M.validate(p),
  r = p.intervals[0],
  before = JSON.stringify(p),
  md = (r.from + r.to) / 2,
  row = M.sample(p, r, md, st);
assert.equal(JSON.stringify(p), before);
assert.ok(Math.abs(row.hydrostaticBar - (1200 * 9.80665 * md) / 1e5) < 1e-10);
assert.ok(Math.abs(row.values.bottomBar - (row.hydrostaticBar + 9)) < 1e-10);
assert.equal(row.values.sppBar, 175);
assert.ok(
  row.values.bottomBar < row.values.sppBar,
  "SPP is not added to bottom pressure",
);
assert.ok(Math.abs(row.ecdKgM3 - (1200 + 9e5 / (9.80665 * md))) < 1e-8);
assert.equal(row.checks.ropMph.status, "EXCEEDED");
const h = M.hydraulic(r.hydraulics, md, { ...p.plan, flowLpm: 1300 });
assert.equal(h.status, "CONDITIONS_MISMATCH");
assert.equal(h.sppBar, undefined);
assert.equal(
  M.hydraulic(r.hydraulics, r.to + 1, p.plan).status,
  "OUTSIDE_PROFILE",
);
assert.equal(M.assess(null, { max: 10 }).status, "NOT_CALCULATED");
assert.equal(M.assess(8, null).status, "NO_LIMIT");
assert.equal(M.assess(10, { max: 10 }).margin, 0);
assert.throws(
  () => M.csv("from_m,to_m,lithology,source\n,100,Shale,source"),
  /nonblank/,
);
assert.throws(
  () =>
    M.validateIntervals([
      { from: 0, to: 10, lithology: "A", source: "S" },
      { from: 9, to: 20, lithology: "B", source: "S" },
    ]),
  /non-overlapping/,
);
const log =
  "~V\nVERS. 2.0 : version\nWRAP. NO : wrap\n~W\nNULL. -999.25 : null\n~C\nDEPT.FT : MD\nLITH. : codes\n~A\n0 1\n10 1\n20 -999.25\n30 2\n40 2\n";
const imported = M.las(log, "LITH", { 1: "Sandstone", 2: "Shale" }, "LAS test");
assert.equal(imported.length, 2);
assert.equal(imported[0].to, 6.096);
assert.equal(imported[1].from, 9.144);
assert.equal(imported[1].to, 12.192);
assert.equal(M.intervalAt(imported, 7), undefined);
assert.throws(() => M.las(log, "GR", {}, "S"), /explicit/);
assert.throws(() => M.las(log, "LITH", {}, "S"), /mapping/);
assert.throws(
  () => M.las(log.replace("WRAP. NO", "WRAP. YES"), "LITH", {}, "S"),
  /WRAP.NO/,
);
const altered = structuredClone(p);
const brokenProfile = structuredClone(p);
delete brokenProfile.intervals[0].hydraulics.rows;
assert.throws(() => M.validate(brokenProfile), /depth stations/);
delete altered.intervals[0].hydraulics;
delete altered.intervals[0].limits;
delete altered.intervals[0].response;
const unknown = M.sample(altered, altered.intervals[0], md, st);
assert.equal(unknown.values.bottomBar, undefined);
assert.equal(unknown.status, "INCOMPLETE");
altered.plan.bottomBar = 999;
altered.plan.dls = 2;
const injected = M.sample(altered, altered.intervals[0], md, st);
assert.equal(injected.values.bottomBar, undefined);
assert.equal(injected.values.dls, undefined);
const limited = structuredClone(p);
limited.intervals[0].plan = { ropMph: 10 };
limited.study.components[0].allowableTensionN = 1;
const overload = M.sample(limited, limited.intervals[0], md, st);
assert.equal(overload.loadLimitExceeded, true);
assert.equal(overload.status, "EXCEEDED");
const directional = structuredClone(p);
directional.intervals[0].response = {
  study: structuredClone(p.study),
  flowLpm: p.plan.flowLpm,
  mudKgM3: p.plan.mudKgM3,
  rpm: p.plan.rpm,
  surface: require("../app/directional-response").demo(),
  settings: { mode: "rss", activation: 1, toolface: 0 },
};
assert.ok(
  Number.isFinite(
    M.sample(directional, directional.intervals[0], md, st).values.dls,
  ),
);
directional.plan.rpm += 1;
assert.equal(
  M.sample(directional, directional.intervals[0], md, st).values.dls,
  undefined,
);
directional.plan.rpm -= 1;
directional.plan.wobTf = 1000;
assert.equal(
  M.sample(directional, directional.intervals[0], md, st).values.dls,
  undefined,
);
assert.equal(
  M.intervalAt(
    [
      { from: 0, to: 10 },
      { from: 10, to: 20 },
    ],
    10,
  ).from,
  10,
);
console.log(
  "PASS: litholog CSV/LAS depth units and null gaps, sourced limits, hydrostatic/ECD balance, SPP separation, condition mismatch and immutable programme",
);
