"use strict";
const assert = require("node:assert/strict"),
  C = require("../app/core"),
  E = require("../app/engine");
let count = 0;
function test(name, fn) {
  fn();
  count++;
  console.log("PASS " + name);
}
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`),
  p = (n, e, tvd, md = 0) => ({ n, e, tvd, md });
const frame = C.createProject().reference;
test("AC-01 between-station crossing at different MD", () => {
  const r = C.scan(
    [p(-1, 0, 0, 0), p(1, 0, 0, 100)],
    [p(0, -1, 0, 1000), p(0, 1, 0, 2000)],
    frame,
    frame,
  );
  near(r.distance, 0);
  near(r.ref.md, 50);
  near(r.offset.md, 1500);
  assert.equal(r.clearance, null);
});
test("AC-02 skew, parallel, coincident and degenerate segments", () => {
  near(
    C.segmentPair(p(-1, 0, 0), p(1, 0, 0), p(0, -1, 3), p(0, 1, 3)).distance,
    3,
  );
  near(
    C.segmentPair(p(0, 0, 0), p(10, 0, 0), p(3, 2, 0), p(7, 2, 0)).distance,
    2,
  );
  near(
    C.segmentPair(p(0, 0, 0), p(10, 0, 0), p(3, 0, 0), p(7, 0, 0)).distance,
    0,
  );
  near(
    C.segmentPair(p(0, 0, 0), p(0, 0, 0), p(3, 0, 0), p(3, 0, 0)).distance,
    3,
  );
});
test("AC-08 incompatible and absent reference block", () => {
  assert.throws(
    () =>
      C.scan([p(0, 0, 0), p(1, 0, 0)], [p(0, 0, 0), p(1, 0, 0)], frame, {
        ...frame,
        vertical_reference: "MSL",
      }),
    /NO SCAN/,
  );
  assert.equal(C.compatible({}, {}), false);
});
test("Spatial index agrees with exhaustive segment pairs", () => {
  let seed = 42;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let trial = 0; trial < 20; trial++) {
    const rows = () =>
        Array.from({ length: 25 }, (_, i) =>
          p(random() * 100, random() * 100, i * 10, i * 20),
        ),
      a = rows(),
      b = rows();
    let best = Infinity;
    for (let i = 1; i < a.length; i++)
      for (let j = 1; j < b.length; j++)
        best = Math.min(
          best,
          C.segmentPair(a[i - 1], a[i], b[j - 1], b[j]).distance,
        );
    near(C.scan(a, b, frame, frame).distance, best);
  }
});
const rule = {
  id: "L",
  metric: "hookload_measured",
  operator: ">",
  warning: 140,
  critical: 160,
  unit: "kN",
  source: "SYNTHETIC",
  revision: 1,
};
const m = {
  metric: "hookload_measured",
  value: 145,
  unit: "kN",
  md: 100,
  data: "SYNTHETIC",
  model: "ILLUSTRATIVE",
};
test("LIM-01 inclusive and exclusive boundaries", () => {
  assert.equal(C.evaluate(rule, m).status, "WARNING");
  assert.equal(
    C.evaluate(rule, { ...m, value: 140 }).status,
    "WITHIN_USER_LIMIT",
  );
  assert.equal(
    C.evaluate({ ...rule, operator: ">=" }, { ...m, value: 140 }).status,
    "WARNING",
  );
  assert.equal(C.evaluate(rule, { ...m, value: 170 }).status, "EXCEEDED");
});
test("LIM-02 force conversion and dimensional mismatch", () => {
  near(C.convert(1, "tf", "N"), 9806.65);
  assert.equal(C.evaluate(rule, { ...m, unit: "kg" }).status, "NOT_EVALUABLE");
});
test("LIM-03 scope mismatch", () => {
  for (const extra of [
    { md_from: 200 },
    { component: "motor" },
    { operation: "SOW" },
    { wellbore: "OTHER" },
  ])
    assert.equal(C.evaluate({ ...rule, ...extra }, m).status, "NOT_EVALUABLE");
});
test("LIM-04 failed QC, missing and dirty results", () => {
  for (const extra of [
    { data: "MEASURED_QC_FAIL" },
    { data: "IMPORTED_UNCHECKED" },
    { model: "NOT_COMPUTED" },
    { dirty: true },
    { value: null },
    { value: "" },
  ])
    assert.equal(C.evaluate(rule, { ...m, ...extra }).status, "NOT_EVALUABLE");
});
test("LIM-06 historical rule revisions remain immutable", () => {
  const e = C.evaluate(rule, m);
  C.evaluate({ ...rule, revision: 2, warning: 150 }, m);
  assert.equal(e.limit_revision, 1);
  assert.equal(e.status, "WARNING");
});
test("Limit persistence does not bridge data gaps", () => {
  const r = { ...rule, persistence_seconds: 5, max_sample_gap_seconds: 3 },
    at = (seconds) => ({
      ...m,
      timestamp_utc: new Date(
        Date.UTC(2026, 0, 1, 0, 0, seconds),
      ).toISOString(),
    });
  const events = C.evaluateSeries(r, [at(0), at(3), at(6), at(15)]);
  assert.deepEqual(
    events.map((e) => e.status),
    ["NOT_EVALUABLE", "NOT_EVALUABLE", "WARNING", "NOT_EVALUABLE"],
  );
  assert.equal(events[0].group_id, events[2].group_id);
  assert.notEqual(events[2].group_id, events[3].group_id);
  assert.throws(
    () => C.evaluateSeries({ ...r, max_sample_gap_seconds: null }, [m]),
    /sample gap/,
  );
});
test("CSV quoted delimiters and missing values", () => {
  assert.equal(C.csv('a,b\n"x,y",2')[0].a, "x,y");
  assert.throws(() => C.csv("a,a\n1,2"), /duplicate/);
  assert.throws(() => C.csv("a,b\n1"), /column/);
  assert.throws(() => E.parseCSV("md,inc,azi\n0,0,0\n100,,0"), /missing/);
});
test("Trajectory wraparound and invalid antipodal tangent", () => {
  near(
    E.interp(
      [
        { md: 0, inc: 90, azi: 359, n: 0, e: 0, tvd: 0, dls: 0 },
        { md: 10, inc: 90, azi: 1, n: 10, e: 0, tvd: 0, dls: 0 },
      ],
      5,
    ).azi,
    0,
  );
  assert.throws(
    () =>
      E.survey([
        { md: 0, inc: 0, azi: 0 },
        { md: 10, inc: 180, azi: 0 },
      ]),
    /Antipodal/,
  );
});
test("TD component boundaries conserve vertical buoyed weight", () => {
  const st = E.survey([
      { md: 0, inc: 0, azi: 0 },
      { md: 100, inc: 0, azi: 0 },
    ]),
    bha = [
      { name: "heavy", length: 10, od: 0.2, id: 0.1, mass: 100 },
      { name: "light", length: 100, od: 0.12, id: 0.1, mass: 10 },
    ];
  let r = E.td(st, bha, { mu: 0, mud: 0, mode: "static" });
  near(r.stringTopAxialForce, (10 * 100 + 90 * 10) * 9.80665);
  r = E.td(st, bha, { mu: 0, mud: 0, mode: "static", bitMD: 50 });
  near(r.stringTopAxialForce, (10 * 100 + 40 * 10) * 9.80665);
});
test("Motor missing source, interpolation and out-of-domain refusal", () => {
  const c = {
    source: "synthetic",
    revision: "1",
    quality: "SYNTHETIC",
    conditions: { mud: "water", temperature_c: 20 },
    points: [
      { flow: 1, rpm: 100 },
      { flow: 2, rpm: 200 },
    ],
  };
  assert.equal(C.motor(null, 1, {}).status, "NOT_COMPUTED");
  near(C.motor(c, 1.5, c.conditions).shaft_rpm, 150);
  assert.equal(C.motor(c, 3, c.conditions).status, "NOT_COMPUTED");
  assert.equal(
    C.motor(c, 1, { mud: "oil", temperature_c: 20 }).status,
    "NOT_COMPUTED",
  );
});
test("DIR geometry never predicts build rate or uses PSD", () => {
  const r = C.directional({
    quality: "SYNTHETIC",
    source: "fixture",
    bit_nominal_diameter_m: 0.2,
    caliper_diameter_m: 0.22,
    max_pad_diameter_m: 0.21,
    psd: [1, 2],
  });
  near(r.overgauge_m, 0.02);
  assert.equal(r.predicted_bur, "NOT_COMPUTED");
  assert.match(r.pad_contact, /NO-CONTACT/);
});
const sample = {
  lag_model: "synthetic",
  lag_uncertainty: "1 minute",
  source_md_from: 10,
  source_md_to: 20,
  collection_time_start_utc: "2026-01-01T00:00:00Z",
  collection_time_end_utc: "2026-01-01T00:01:00Z",
  sampling_screen_aperture_mm: 0.1,
  quality: "SYNTHETIC",
  provenance: "fixture",
  collection_point: "shaker",
  method: "sieve",
  weighting_basis: "dry_mass",
  wet_dry: "dry",
  calibration_valid: true,
  recovery_complete: true,
  bins: [
    { lower_mm: 1, upper_mm: 2, mass_kg: 1 },
    { lower_mm: 2, upper_mm: 4, mass_kg: 1 },
  ],
};
test("PSD normalized mass, cumulative and bracketed log percentile", () => {
  const r = C.psd(sample);
  near(r.rows.at(-1).cumulative_passing, 1);
  near(r.D50_mm, 2);
  near(r.D10_mm, 2 ** 0.2);
});
test("PSD refuses missing QC, wet/count/area data and incomplete recovery", () => {
  for (const extra of [
    { quality: "IMPORTED_UNCHECKED" },
    { wet_dry: "wet" },
    { weighting_basis: "count" },
    { weighting_basis: "area" },
    { recovery_complete: false },
    { calibration_valid: false },
    { censored: true },
  ])
    assert.equal(C.psd({ ...sample, ...extra }).status, "NOT ESTIMABLE");
});
test("PSD malformed bins, zero mass and unbracketed pan", () => {
  assert.throws(
    () =>
      C.psd({ ...sample, bins: [{ lower_mm: 2, upper_mm: 1, mass_kg: 1 }] }),
    /Bins/,
  );
  assert.equal(
    C.psd({ ...sample, bins: [{ lower_mm: 1, upper_mm: 2, mass_kg: 0 }] })
      .status,
    "NOT ESTIMABLE",
  );
  assert.equal(
    C.psd({ ...sample, bins: [{ lower_mm: 0, upper_mm: 2, mass_kg: 1 }] })
      .D10_mm,
    null,
  );
});
test("New real project carries no synthetic rules or observations", () => {
  const p = C.createProject();
  assert.equal(p.mode, "USER_DATA");
  assert.deepEqual(p.limits, []);
  assert.deepEqual(p.measurements, []);
});
test("Canonical report input ordering", () =>
  assert.equal(C.canonical({ b: 2, a: 1 }), C.canonical({ a: 1, b: 2 })));
console.log(`${count} v0.4.2 acceptance groups passed`);
