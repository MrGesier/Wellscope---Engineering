/* Transparent report calculations, SI internally. No proprietary solver. */
(function (root, factory) {
  const api = factory(
    root.WellCore || (typeof require === "function" ? require("./core") : null),
    root.WellEngine ||
      (typeof require === "function" ? require("./engine") : null),
  );
  root.WellStudies = api;
  if (typeof module === "object") module.exports = api;
})(globalThis, function (C, E) {
  "use strict";
  const n = (v, name, min = -Infinity) => {
    const x = C.number(v, name);
    if (x < min) throw Error(name + " must be at least " + min);
    return x;
  };
  const pos = (v, name) => {
    const x = n(v, name, 0);
    if (x === 0) throw Error(name + " must be positive");
    return x;
  };
  function context(meta) {
    if (!meta || !String(meta.source || "").trim())
      throw Error("A source and revision are required");
    if (!["SYNTHETIC", "MEASURED_QC_PASS"].includes(meta.quality))
      throw Error(
        "Review QC before calculating; unchecked or failed data cannot be evaluated",
      );
    return {
      source: meta.source,
      quality: meta.quality,
      model: "PRELIMINARY_UNVERIFIED",
      review: "DRAFT",
    };
  }
  function mapRows(rows, fn) {
    if (!Array.isArray(rows) || !rows.length)
      throw Error("Add at least one data row");
    if (rows.length > 10000) throw Error("Maximum 10,000 rows per study");
    return rows.map((r, i) => {
      try {
        return fn(r, i);
      } catch (e) {
        throw Error("Row " + (i + 1) + ": " + e.message);
      }
    });
  }
  function mse(rows, meta) {
    context(meta);
    if (!["BIT", "SURFACE"].includes(meta.basis))
      throw Error("Choose BIT or SURFACE measurement basis");
    return mapRows(rows, (r) => {
      const md = n(r.md_m, "MD", 0),
        d = pos(r.bit_diameter_m, "Bit diameter"),
        w = n(r.wob_kN, "WOB", 0) * 1000,
        t = n(r.torque_kNm, "Torque", 0) * 1000,
        rpm = pos(r.rpm, "RPM"),
        rop = pos(r.rop_m_h, "ROP"),
        area = (Math.PI * d * d) / 4,
        doc = rop / (60 * rpm),
        axial = w / area / 1e6,
        rotational =
          (2 * Math.PI * (rpm / 60) * t) / (area * (rop / 3600)) / 1e6;
      return {
        md_m: md,
        mse_MPa: axial + rotational,
        axial_MPa: axial,
        rotational_MPa: rotational,
        doc_mm_rev: doc * 1000,
        drilling_strength_MPa: w / ((d / 2) * doc) / 1e6,
        basis:
          meta.basis === "BIT"
            ? "Bit measurements"
            : "Surface proxy — not bit MSE",
      };
    });
  }
  function standoff(rows, meta) {
    context(meta);
    return mapRows(rows, (r) => {
      const hole = pos(r.hole_diameter_mm, "Hole diameter"),
        od = pos(r.casing_od_mm, "Casing OD"),
        ecc = n(r.eccentricity_mm, "Eccentricity", 0),
        gap = (hole - od) / 2;
      if (gap <= 0 || ecc > gap)
        throw Error(
          "Require hole diameter > casing OD and eccentricity within radial clearance",
        );
      return {
        md_m: n(r.md_m, "MD", 0),
        radial_clearance_mm: gap,
        minimum_gap_mm: gap - ecc,
        standoff_percent: (100 * (gap - ecc)) / gap,
      };
    });
  }
  function wear(rows, meta) {
    context(meta);
    return mapRows(rows, (r) => {
      const nominal = pos(r.nominal_wall_mm, "Nominal wall"),
        minimum = pos(r.minimum_original_wall_mm, "Minimum original wall"),
        remaining = n(r.measured_wall_mm, "Measured remaining wall", 0);
      if (minimum > nominal || remaining > nominal)
        throw Error("Wall thicknesses are inconsistent");
      const loss = nominal - remaining;
      return {
        md_m: n(r.md_m, "MD", 0),
        remaining_wall_mm: remaining,
        nominal_loss_mm: loss,
        loss_percent_nominal: (100 * loss) / nominal,
        nominal_loss_percent_minimum: (100 * loss) / minimum,
        below_original_minimum: remaining < minimum ? "Yes" : "No",
        interpretation: "Observed geometry; no burst/collapse rating",
      };
    });
  }
  function hydraulics(rows, meta) {
    context(meta);
    return mapRows(rows, (r) => {
      const tvd = pos(r.tvd_m, "TVD"),
        rho = pos(r.mud_density_kg_m3, "Mud density"),
        dp = n(r.annular_loss_bar, "Annular pressure loss", 0) * 1e5;
      return {
        md_m: n(r.md_m, "MD", 0),
        hydrostatic_bar: (rho * 9.80665 * tvd) / 1e5,
        ecd_kg_m3: rho + dp / (9.80665 * tvd),
        annular_loss_bar: dp / 1e5,
      };
    });
  }
  function pressureArea(rows, meta) {
    context(meta);
    return mapRows(rows, (r) => {
      const od = pos(r.od_mm, "OD") / 1000,
        id = n(r.id_mm, "ID", 0) / 1000;
      if (id >= od) throw Error("ID must be smaller than OD");
      const ai = (Math.PI * id * id) / 4,
        ao = (Math.PI * od * od) / 4,
        pi = n(r.internal_pressure_bar, "Internal pressure", 0) * 1e5,
        po = n(r.external_pressure_bar, "External pressure", 0) * 1e5,
        eff = n(r.effective_axial_kN, "Effective axial force"),
        correction = (pi * ai - po * ao) / 1000,
        wall = eff + correction;
      return {
        md_m: n(r.md_m, "MD", 0),
        effective_axial_kN: eff,
        pressure_area_kN: correction,
        wall_axial_kN: wall,
        wall_state: wall > 0 ? "Tension" : wall < 0 ? "Compression" : "Zero",
        effective_state: eff > 0 ? "Tension" : eff < 0 ? "Compression" : "Zero",
      };
    });
  }
  function operations(rows, meta) {
    context(meta);
    return mapRows(rows, (r) => {
      const pu = n(r.puw_kN, "PUW"),
        so = n(r.sow_kN, "SOW"),
        fr = n(r.frw_kN, "FRW");
      return {
        md_m: n(r.md_m, "MD", 0),
        pickup_minus_free_kN: pu - fr,
        free_minus_slackoff_kN: fr - so,
        pickup_slackoff_spread_kN: pu - so,
        spp_residual_bar:
          n(r.spp_measured_bar, "Measured SPP", 0) -
          n(r.spp_planned_bar, "Planned SPP", 0),
        ecd_residual_kg_m3:
          pos(r.ecd_measured_kg_m3, "Measured ECD") -
          pos(r.ecd_planned_kg_m3, "Planned ECD"),
      };
    });
  }
  function directional(rows, meta) {
    context(meta);
    return mapRows(rows, (r) => {
      const from = n(r.from_md_m, "Start MD", 0),
        to = n(r.to_md_m, "End MD", 0);
      if (to <= from) throw Error("End MD must follow start MD");
      const inc1 = n(r.inc_from_deg, "Start inclination", 0),
        inc2 = n(r.inc_to_deg, "End inclination", 0);
      if (inc1 > 180 || inc2 > 180)
        throw Error("Inclination must be in 0–180 degrees");
      const a = n(r.azi_from_deg, "Start azimuth", 0),
        b = n(r.azi_to_deg, "End azimuth", 0);
      if (a >= 360 || b >= 360) throw Error("Azimuth must be in 0–360 degrees");
      return {
        md_m: from,
        to_md_m: to,
        observed_bur_deg_30m: ((inc2 - inc1) * 30) / (to - from),
        observed_tur_deg_30m:
          inc1 < 0.1 || inc2 < 0.1
            ? null
            : ((((b - a + 540) % 360) - 180) * 30) / (to - from),
        segment: r.segment || "Unnamed",
        prediction: "NOT_COMPUTED",
      };
    });
  }
  function sensitivity(survey, bha, settings, depths, coefficients, meta) {
    context(meta);
    if (
      !depths.length ||
      !coefficients.length ||
      depths.length * coefficients.length > 200
    )
      throw Error("Provide 1–200 depth/coefficient cases");
    return depths.flatMap((d) =>
      coefficients.map((mu) => {
        const cfg = {
          ...settings,
          bitMD: pos(d, "Bit MD"),
          muOpen: n(mu, "Open-hole friction", 0),
        };
        const get = (mode) =>
          E.td(survey, bha, { ...cfg, mode }).stringTopAxialForce / 1000;
        return {
          md_m: cfg.bitMD,
          open_hole_friction: cfg.muOpen,
          pickup_kN: get("pooh"),
          slackoff_kN: get("rih"),
          static_kN: get("static"),
        };
      }),
    );
  }
  function surveyComparison(rows, meta) {
    context(meta);
    return mapRows(rows, (r) => {
      const dn = n(r.actual_n_m, "Actual north") - n(r.plan_n_m, "Plan north"),
        de = n(r.actual_e_m, "Actual east") - n(r.plan_e_m, "Plan east"),
        dz = n(r.actual_tvd_m, "Actual TVD") - n(r.plan_tvd_m, "Plan TVD");
      return {
        md_m: n(r.md_m, "MD", 0),
        north_residual_m: dn,
        east_residual_m: de,
        tvd_residual_m: dz,
        horizontal_residual_m: Math.hypot(dn, de),
        spatial_residual_m: Math.hypot(dn, de, dz),
      };
    });
  }
  function external(rows, meta) {
    context(meta);
    return mapRows(rows, (r) => {
      if (
        [r.quantity, r.unit, r.model_name, r.model_revision].some(
          (v) => !String(v ?? "").trim(),
        )
      )
        throw Error(
          "External results require quantity, unit, model and revision",
        );
      return {
        md_m: n(r.md_m, "MD", 0),
        quantity: r.quantity,
        value: n(r.value, "Value"),
        unit: r.unit,
        model_name: r.model_name,
        model_revision: r.model_revision,
        origin: "External result — not computed by WellScope",
      };
    });
  }
  const processors = {
    mse,
    standoff,
    wear,
    hydraulics,
    pressureArea,
    operations,
    directional,
    surveyComparison,
    external,
  };
  return {
    context,
    processors,
    sensitivity,
    mse,
    standoff,
    wear,
    hydraulics,
    pressureArea,
    operations,
    directional,
    surveyComparison,
    external,
  };
});
