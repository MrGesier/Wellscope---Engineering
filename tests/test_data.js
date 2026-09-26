const assert = require("node:assert/strict"),
  D = require("../app/engineering-data"),
  C = require("../app/core");
let count = 0;
function test(name, fn) {
  fn();
  count++;
  console.log("PASS " + name);
}
const near = (a, b, t = 1e-8) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
const survey = [
    { md_m: 0, inc_deg: 0, azi_deg: 0 },
    { md_m: 1000, inc_deg: 0, azi_deg: 0 },
    { md_m: 1500, inc_deg: 30, azi_deg: 45 },
  ],
  roles = { REFERENCE: "r", "OFFSET A": "a", "OFFSET B": "b", SIDETRACK: "s" };
function canonical() {
  return {
    ...C.createProject("SYNTHETIC"),
    id: "fixture",
    wells: ["r", "a", "b", "s"].map((id, i) => ({
      id: "well-" + id,
      wellhead_N: i * 50,
      wellhead_E: 0,
      wellbores: [
        {
          id,
          surveys: survey,
          bit_depth_m: 1500,
          ...(id === "s"
            ? { parent_wellbore_id: "r", tie_in_parent_md: 1000 }
            : {}),
        },
      ],
    })),
    bha: [
      {
        id: "pipe",
        tool_type: "DP",
        geometry: {
          length_m: 2000,
          od_m: 0.127,
          id_m: 0.1,
          unit_mass_kg_m: 25,
        },
      },
    ],
  };
}
test("Canonical migration preserves explicit role/source identities and SI geometry", () => {
  const p = D.importProject(canonical(), roles);
  assert.equal(p.legacy.offnorth, 50);
  assert.equal(p.legacy.tieInMD, 1000);
  assert.equal(p.wells[1].source_well_id, "well-a");
  assert.equal(p.legacy.bha[0].quality, "IMPORTED_UNCHECKED");
  assert.deepEqual(p.events, []);
  assert.ok(p.canonical_source);
});
test("Canonical ambiguous roles, missing geometry, elevation and datum mismatch refuse", () => {
  assert.throws(
    () => D.importProject(canonical(), { ...roles, "OFFSET A": "r" }),
    /distinct/,
  );
  const p = canonical();
  p.wells[1].wellhead_z = 10;
  assert.throws(() => D.importProject(p, roles), /elevations/);
  p.wells[1].wellhead_z = 0;
  p.wells[1].reference = { ...p.reference, vertical_reference: "MSL" };
  assert.throws(() => D.importProject(p, roles), /NO SCAN/);
});
test("Canonical feet MD mapping is explicit and real demo limits are blocked", () => {
  const p = canonical();
  for (const w of p.wells) {
    w.wellbores[0].md_unit = "ft";
    w.wellbores[0].surveys = survey.map((s) => ({
      md: s.md_m / 0.3048,
      inc: s.inc_deg,
      azi: s.azi_deg,
    }));
  }
  const out = D.importProject(p, roles);
  assert.match(out.legacy.refcsv, /1500,30,45/);
  p.mode = "USER_DATA";
  p.limits = [{ data: "SYNTHETIC", active: true }];
  assert.throws(() => D.importProject(p, roles), /synthetic thresholds/);
});
test("Source-backed completion intervals reject reversed MD and impossible ID", () => {
  assert.equal(
    D.completion([
      {
        kind: "CASING",
        label: "synthetic",
        source: "fixture",
        from: 0,
        to: 100,
        od_m: 0.2,
        id_m: 0.18,
      },
    ]).length,
    1,
  );
  assert.throws(
    () =>
      D.completion([
        {
          kind: "CASING",
          label: "test",
          source: "test",
          from: 100,
          to: 0,
          od_m: 0.2,
        },
      ]),
    /Intervals/,
  );
  assert.throws(
    () =>
      D.completion([
        {
          kind: "CASING",
          label: "test",
          source: "test",
          from: 0,
          to: 100,
          od_m: 0.2,
          id_m: 0.3,
        },
      ]),
    /ID/,
  );
});
const conditions = {
    mud: "synthetic-water",
    temperature_c: 20,
    density_kg_m3: 1000,
  },
  curve = {
    kind: "FLOW_RPM",
    source: "Independent synthetic unit test",
    revision: "1",
    quality: "SYNTHETIC",
    conditions,
    x_unit: "L/min",
    y_unit: "rpm",
    points: [
      { flow: 10, rpm: 100 },
      { flow: 30, rpm: 300 },
    ],
  };
test("Vendor units, interpolation and full condition/domain gates", () => {
  near(D.vendor(curve, { value: 20, unit: "L/min", conditions }).value, 200);
  assert.equal(
    D.vendor(curve, { value: 40, unit: "L/min", conditions }).status,
    "NOT_COMPUTED",
  );
  assert.equal(
    D.vendor(curve, {
      value: 20,
      unit: "L/min",
      conditions: { ...conditions, density_kg_m3: 1100 },
    }).status,
    "NOT_COMPUTED",
  );
});
test("Pressure/torque table remains externally sourced, separate from string solver", () => {
  const c = {
    ...curve,
    kind: "DP_TORQUE",
    x_unit: "bar",
    y_unit: "kN.m",
    points: [
      { dp: 10, torque: 1 },
      { dp: 30, torque: 3 },
    ],
  };
  const r = D.vendor(c, { value: 20, unit: "bar", conditions });
  near(r.value, 2000);
  assert.match(r.meaning, /not a drillstring torque solution/);
  assert.equal(
    D.vendor(
      { ...c, quality: "IMPORTED_UNCHECKED" },
      { value: 20, unit: "bar", conditions },
    ).status,
    "NOT_COMPUTED",
  );
});
const weights = ["PUW", "FRW", "SOW"].map((operation, i) => ({
  operation,
  md: 1000,
  basis_id: "test-1",
  zero_basis: "same synthetic zero",
  wellbore: "REFERENCE",
  source: "synthetic matched test",
  quality: "SYNTHETIC",
  value: [140, 120, 110][i],
  unit: "kN",
  timestamp_utc: new Date(Date.UTC(2026, 0, 1, 0, 0, i * 10)).toISOString(),
}));
test("Matched PUW/SOW/FRW differences and time refusal", () => {
  const r = D.matchedWeights(weights, 30)[0];
  near(r.pickup_minus_free_N, 20000);
  near(r.free_minus_slackoff_N, 10000);
  assert.equal(D.matchedWeights(weights, 5)[0].status, "NOT_EVALUABLE");
  assert.throws(
    () => D.matchedWeights([...weights, weights[0]], 30),
    /Duplicate/,
  );
});
const channel = {
  source: "Synthetic 2 Hz signal",
  quality: "SYNTHETIC",
  unit: "m/s2",
  clock_alignment: "synthetic uniform clock",
  anti_alias_filter: "synthetic band-limited fixture",
  sample_rate_hz: 16,
  samples: Array.from({ length: 128 }, (_, i) => ({
    time_s: i / 16,
    value: 2 * Math.sin((2 * Math.PI * 2 * i) / 16),
  })),
};
test("Known sinusoid has correct measured spectral peak and no modal claim", () => {
  const r = D.spectrum(channel);
  near(r.peak.frequency_hz, 2);
  near(r.peak.amplitude, 2, 0.002);
  assert.equal(r.natural_frequencies, "NOT_COMPUTED");
  assert.equal(r.critical_speed, "NOT_COMPUTED");
  near(r.nyquist_hz, 8);
});
test("Measured spectrum refuses failed QC, missing filter and clock gaps", () => {
  assert.throws(
    () => D.spectrum({ ...channel, quality: "MEASURED_QC_FAIL" }),
    /QC/,
  );
  assert.throws(
    () => D.spectrum({ ...channel, anti_alias_filter: "" }),
    /metadata/,
  );
  const c = structuredClone(channel);
  c.samples[30].time_s += 0.1;
  assert.throws(() => D.spectrum(c), /Gaps/);
});
test("Observed BUR/TUR wraps azimuth and suppresses near-vertical turn rate", () => {
  const r = D.directionalIntervals(
    [
      { md: 0, inc: 10, azi: 359 },
      { md: 30, inc: 12, azi: 1 },
    ],
    "fixture",
    "SYNTHETIC",
  );
  near(r[0].observed_bur_deg_30m, 2);
  near(r[0].observed_tur_deg_30m, 2);
  assert.equal(
    D.directionalIntervals(
      [
        { md: 0, inc: 0, azi: 0 },
        { md: 30, inc: 2, azi: 10 },
      ],
      "fixture",
      "SYNTHETIC",
    )[0].observed_tur_deg_30m,
    null,
  );
});
test("Spatial pruning scales on a 1000-segment parallel fixture", () => {
  const path = Array.from({ length: 1001 }, (_, i) => ({
      md: i,
      n: 0,
      e: 0,
      tvd: i,
    })),
    offset = path.map((p) => ({ ...p, e: 30 })),
    r = C.scan(
      path,
      offset,
      C.createProject().reference,
      C.createProject().reference,
    );
  near(r.distance, 30);
  assert.ok(
    r.segment_checks < 20000,
    "Expected coarse spatial pruning rather than one million precise comparisons",
  );
});
test("Separate cased/open friction has analytic horizontal load and correct shoe partition", () => {
  const E = require("../app/engine"),
    s = E.survey([
      { md: 0, inc: 90, azi: 0 },
      { md: 1000, inc: 90, azi: 0 },
    ]),
    bha = [{ name: "pipe", length: 1200, od: 0.127, id: 0.1, mass: 25 }],
    cfg = {
      mu: 0.25,
      muCased: 0.1,
      muOpen: 0.3,
      casingShoe: 400,
      mud: 1200,
      steel: 7850,
      bitMD: 1000,
    },
    w = 25 * 9.80665 * (1 - 1200 / 7850),
    expected = w * (400 * 0.1 + 600 * 0.3);
  near(
    E.td(s, bha, { ...cfg, mode: "pooh" }).stringTopAxialForce,
    expected,
    1e-6,
  );
  near(
    E.td(s, bha, { ...cfg, mode: "rih" }).stringTopAxialForce,
    -expected,
    1e-6,
  );
  near(E.td(s, bha, { ...cfg, mode: "static" }).stringTopAxialForce, 0, 1e-6);
  assert.throws(() => E.td(s, bha, { ...cfg, muOpen: -1 }), /split friction/);
});
console.log(`${count} additional source-data acceptance groups passed`);
