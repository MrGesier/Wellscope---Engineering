/* Independently generated, synthetic geometry fixtures. No vendor case traces. */
(function (root) {
  "use strict";
  const frame = {
      coordinate_system: "LOCAL_NE_TVD",
      datum: "LOCAL",
      vertical_reference: "RT",
      azimuth_reference: "GRID",
      length_unit: "m",
    },
    p = (n, e, tvd, md) => ({ n, e, tvd, md });
  const cases = {
    CASE_A_INTERSECT: {
      label: "Analytic crossing",
      reference: [p(-10, 0, 100, 0), p(10, 0, 100, 20)],
      offset: [p(0, -10, 100, 100), p(0, 10, 100, 120)],
      expected_distance_m: 0,
    },
    CASE_B_NEAR_MISS: {
      label: "Analytic skew",
      reference: [p(-10, 0, 100, 0), p(10, 0, 100, 20)],
      offset: [p(0, -10, 103, 100), p(0, 10, 103, 120)],
      expected_distance_m: 3,
    },
    CASE_C_SIDETRACK: {
      label: "Shared branch to 2200 mMD",
      reference: [p(0, 0, 0, 0), p(0, 0, 2200, 2200), p(100, 0, 2500, 2600)],
      offset: [p(0, 0, 0, 0), p(0, 0, 2200, 2200), p(0, 100, 2500, 2600)],
      tie_in_md: 2200,
      expected_distance_m: 0,
      interpretation:
        "Shared pre-tie-in path is one borehole; parent clearance is not an independent offset scan",
    },
    CASE_D_HI_ANGLE: {
      label: "High-angle unequal MD geometry",
      reference: [p(0, 0, 100, 1000), p(100, 0, 110, 1100)],
      offset: [p(50, -50, 104, 2000), p(50, 50, 104, 2100)],
      interpretation:
        "Closest 3D points are not at equal MD. Covariance remains illustrative only.",
    },
    CASE_E_DATA_QC: {
      label: "Incompatible vertical datum",
      reference: [p(0, 0, 0, 0), p(0, 0, 100, 100)],
      offset: [p(10, 0, 0, 0), p(10, 0, 100, 100)],
      offset_reference: { ...frame, vertical_reference: "MSL" },
      expected_error: "INCOMPATIBLE REFERENCE",
    },
    CASE_F_TD: {
      label: "4200 m axial-screening training well",
      surveys: [
        { md: 0, inc: 0, azi: 0 },
        { md: 800, inc: 0, azi: 0 },
        { md: 1600, inc: 45, azi: 70 },
        { md: 2000, inc: 45, azi: 70 },
        { md: 2200, inc: 45, azi: 70 },
        { md: 2700, inc: 90, azi: 70 },
        { md: 3450, inc: 90, azi: 70 },
        { md: 4200, inc: 90, azi: 70 },
      ],
      sections: [
        { from: 0, to: 800, label: "VERTICAL" },
        { from: 800, to: 1600, label: "BUILD" },
        { from: 1600, to: 2200, label: "HOLD / TANGENT" },
        { from: 2200, to: 2700, label: "LANDING" },
        { from: 2700, to: 4200, label: "LATERAL" },
      ],
    },
  };
  root.WellScenarios = { frame, cases };
  if (typeof module === "object") module.exports = root.WellScenarios;
})(globalThis);
