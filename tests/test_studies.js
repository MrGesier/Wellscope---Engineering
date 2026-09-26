const assert = require("node:assert/strict"),
  S = require("../app/study-engine"),
  E = require("../app/engine");
const meta = {
  source: "Independent synthetic analytic vectors / 1",
  quality: "SYNTHETIC",
  basis: "BIT",
};
const near = (a, b, t = 1e-8) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
const row = {
  md_m: 1000,
  bit_diameter_m: 2,
  wob_kN: Math.PI,
  torque_kNm: 1,
  rpm: 60,
  rop_m_h: 3600,
};
let r = S.mse([row], meta)[0];
near(r.axial_MPa, 0.001);
near(r.rotational_MPa, 0.002);
near(r.mse_MPa, 0.003);
near(r.doc_mm_rev, 1000);
near(r.drilling_strength_MPa, Math.PI * 0.001);
assert.match(
  S.mse([row], { ...meta, basis: "SURFACE" })[0].basis,
  /not bit MSE/,
);
for (const value of ["", null, 0, -1])
  assert.throws(() => S.mse([{ ...row, rop_m_h: value }], meta));
assert.throws(
  () => S.mse([row], { ...meta, quality: "IMPORTED_UNCHECKED" }),
  /QC/,
);
assert.throws(() => S.mse([row], { ...meta, source: "" }), /source/);
near(
  S.standoff(
    [
      {
        md_m: 0,
        hole_diameter_mm: 300,
        casing_od_mm: 200,
        eccentricity_mm: 25,
      },
    ],
    meta,
  )[0].standoff_percent,
  50,
);
near(
  S.standoff(
    [
      {
        md_m: 0,
        hole_diameter_mm: 300,
        casing_od_mm: 200,
        eccentricity_mm: 50,
      },
    ],
    meta,
  )[0].standoff_percent,
  0,
);
assert.throws(
  () =>
    S.standoff(
      [
        {
          md_m: 0,
          hole_diameter_mm: 300,
          casing_od_mm: 200,
          eccentricity_mm: 51,
        },
      ],
      meta,
    ),
  /clearance/,
);
r = S.wear(
  [
    {
      md_m: 1,
      nominal_wall_mm: 10,
      minimum_original_wall_mm: 8,
      measured_wall_mm: 7,
    },
  ],
  meta,
)[0];
near(r.loss_percent_nominal, 30);
near(r.nominal_loss_percent_minimum, 37.5);
assert.equal(r.below_original_minimum, "Yes");
r = S.hydraulics(
  [
    {
      md_m: 1100,
      tvd_m: 1000,
      mud_density_kg_m3: 1000,
      annular_loss_bar: 9.80665,
    },
  ],
  meta,
)[0];
near(r.ecd_kg_m3, 1100);
near(r.hydrostatic_bar, 98.0665);
r = S.pressureArea(
  [
    {
      md_m: 0,
      od_mm: 200,
      id_mm: 100,
      internal_pressure_bar: 100,
      external_pressure_bar: 25,
      effective_axial_kN: 10,
    },
  ],
  meta,
)[0];
near(r.wall_axial_kN, 10);
near(r.pressure_area_kN, 0);
r = S.operations(
  [
    {
      md_m: 1,
      puw_kN: 150,
      sow_kN: 100,
      frw_kN: 120,
      spp_measured_bar: 20,
      spp_planned_bar: 18,
      ecd_measured_kg_m3: 1100,
      ecd_planned_kg_m3: 1000,
    },
  ],
  meta,
)[0];
near(r.pickup_minus_free_kN, 30);
near(r.free_minus_slackoff_kN, 20);
near(r.spp_residual_bar, 2);
r = S.directional(
  [
    {
      from_md_m: 1000,
      to_md_m: 1030,
      inc_from_deg: 20,
      inc_to_deg: 23,
      azi_from_deg: 359,
      azi_to_deg: 1,
    },
  ],
  meta,
)[0];
near(r.observed_bur_deg_30m, 3);
near(r.observed_tur_deg_30m, 2);
assert.equal(r.prediction, "NOT_COMPUTED");
near(
  S.surveyComparison(
    [
      {
        md_m: 1,
        plan_n_m: 0,
        plan_e_m: 0,
        plan_tvd_m: 0,
        actual_n_m: 3,
        actual_e_m: 4,
        actual_tvd_m: 12,
      },
    ],
    meta,
  )[0].spatial_residual_m,
  13,
);
assert.throws(
  () =>
    S.external(
      [
        {
          md_m: 1,
          quantity: "frequency",
          value: 5,
          unit: "Hz",
          model_name: "",
          model_revision: "1",
        },
      ],
      meta,
    ),
  /model/,
);
const survey = E.survey([
    { md: 0, inc: 0, azi: 0 },
    { md: 1000, inc: 0, azi: 0 },
  ]),
  bha = [{ name: "pipe", length: 1200, od: 0.127, id: 0.1, mass: 25 }];
r = S.sensitivity(
  survey,
  bha,
  { mu: 0.2, mud: 1000, steel: 7850 },
  [500, 1000],
  [0.1, 0.3],
  meta,
);
assert.equal(r.length, 4);
near(r[0].pickup_kN, r[1].pickup_kN);
near(r[2].pickup_kN, 2 * r[0].pickup_kN);
assert.throws(
  () =>
    S.sensitivity(survey, bha, {}, Array(100).fill(1), [0.1, 0.2, 0.3], meta),
  /200/,
);
console.log(
  "PASS: analytic MSE and units, measurement basis/QC gates, standoff limits, wall bases, ECD, pressure-area signs, operations residuals, directional wrap, spatial residual, external provenance and sensitivity matrix",
);
