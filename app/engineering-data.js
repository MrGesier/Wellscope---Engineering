/* Source-bound data analysis. These functions do not approve operations. */
(function (root, factory) {
  const C =
      root.WellCore ||
      (typeof require === "function" ? require("./core") : null),
    E =
      root.WellEngine ||
      (typeof require === "function" ? require("./engine") : null);
  const api = factory(C, E);
  root.WellData = api;
  if (typeof module === "object") module.exports = api;
})(globalThis, function (C, E) {
  "use strict";
  const usable = (x) =>
    ["SYNTHETIC", "MEASURED_QC_PASS"].includes(x.quality || x.data) &&
    typeof x.source === "string" &&
    !!x.source.trim();
  function interval(row) {
    const from = C.number(row.md_from ?? row.from),
      to = C.number(row.md_to ?? row.to);
    if (from < 0 || to <= from) throw Error("Intervals require 0 ≤ from < to");
    return { ...row, from, to };
  }
  function completion(rows) {
    if (!Array.isArray(rows)) throw Error("Expected completion interval array");
    return rows.map((row) => {
      const r = interval(row);
      if (
        !["HOLE", "CASING", "CEMENT", "TUBING", "PACKER", "FORMATION"].includes(
          r.kind,
        )
      )
        throw Error("Unknown interval kind");
      if (!r.source || !r.label)
        throw Error("Interval label and source required");
      if (r.kind !== "FORMATION") {
        r.od_m = C.number(r.od_m);
        if (r.od_m <= 0) throw Error("OD must be positive");
        if (r.id_m != null && (C.number(r.id_m) < 0 || r.id_m >= r.od_m))
          throw Error("ID must be smaller than OD");
      }
      return r;
    });
  }
  function importProject(input, roles) {
    const p = JSON.parse(JSON.stringify(input));
    if (p.legacy && p.schema_version === C.version) return p;
    if (p.refcsv && p.offcsv && Array.isArray(p.bha))
      throw Error(
        "Legacy import requires explicit reference metadata; use the legacy mapping form",
      );
    if (!Array.isArray(p.wells) || !roles)
      throw Error(
        "Canonical import requires wells and an explicit four-role wellbore map",
      );
    if (!C.compatible(p.reference, p.reference))
      throw Error(
        "Declare a supported SI coordinate frame before canonical import",
      );
    const entries = p.wells.flatMap((w) =>
        (w.wellbores || []).map((b) => ({ w, b })),
      ),
      mapped = {};
    for (const role of ["REFERENCE", "OFFSET A", "OFFSET B", "SIDETRACK"]) {
      const found = entries.filter((x) => x.b.id === roles[role]);
      if (found.length !== 1)
        throw Error("Role " + role + " must map to one unique wellbore ID");
      mapped[role] = found[0];
      if (
        !C.compatible(
          p.reference,
          found[0].b.reference || found[0].w.reference || p.reference,
        )
      )
        throw Error("INCOMPATIBLE REFERENCE — NO SCAN");
    }
    if (new Set(Object.values(roles)).size !== 4)
      throw Error("Each display role requires a distinct wellbore ID");
    const ref = mapped.REFERENCE,
      side = mapped.SIDETRACK;
    if (side.b.parent_wellbore_id !== ref.b.id)
      throw Error("Sidetrack must name the mapped reference as parent");
    const tie = C.number(side.b.tie_in_parent_md),
      surveys = {};
    for (const [role, { w, b }] of Object.entries(mapped)) {
      if ((w.wellhead_z ?? 0) !== (ref.w.wellhead_z ?? 0))
        throw Error(
          "Different wellhead elevations require an explicit coordinate transform",
        );
      surveys[role] = (b.surveys || []).map((s) => ({
        md:
          s.md_m != null
            ? C.number(s.md_m)
            : C.convert(s.md, b.md_unit || "m", "m"),
        inc: C.number(s.inc_deg ?? s.inc),
        azi: C.number(s.azi_deg ?? s.azi),
      }));
      E.survey(surveys[role]);
    }
    if (!surveys.REFERENCE.some((s) => s.md === tie))
      throw Error("Parent survey must contain the declared tie-in MD");
    const csv = (rows) =>
      "md,inc,azi\n" +
      rows.map((s) => [s.md, s.inc, s.azi].join(",")).join("\n");
    const bha = (p.bit_to_surface || p.bha || []).map((b, i) => {
      const g = b.geometry || b;
      return {
        ...b,
        stable_id: b.stable_id || b.id || "component-" + i,
        name: b.name || b.tool_type || b.family,
        length: C.number(g.length_m ?? g.length),
        od: C.number(g.od_m ?? g.OD ?? g.od),
        id: C.number(g.id_m ?? g.ID ?? g.id),
        mass: C.number(g.unit_mass_kg_m ?? g.unitMass ?? g.mass),
        quality: "IMPORTED_UNCHECKED",
      };
    });
    E.normalizeBha(bha);
    const output = {
      ...C.createProject(p.mode === "SYNTHETIC" ? "SYNTHETIC" : "USER_DATA"),
      ...p,
      schema_version: C.version,
      review: "DRAFT",
      canonical_source: p,
    };
    output.legacy = {
      refcsv: csv(surveys.REFERENCE),
      offcsv: csv(surveys["OFFSET A"]),
      offBcsv: csv(surveys["OFFSET B"]),
      sidecsv: csv(surveys.SIDETRACK),
      tieInMD: tie,
      bha,
      bitMD: ref.b.bit_depth_m ?? surveys.REFERENCE.at(-1).md,
      offnorth:
        C.number(mapped["OFFSET A"].w.wellhead_N ?? 0) -
        C.number(ref.w.wellhead_N ?? 0),
      offeast:
        C.number(mapped["OFFSET A"].w.wellhead_E ?? 0) -
        C.number(ref.w.wellhead_E ?? 0),
      offBnorth:
        C.number(mapped["OFFSET B"].w.wellhead_N ?? 0) -
        C.number(ref.w.wellhead_N ?? 0),
      offBeast:
        C.number(mapped["OFFSET B"].w.wellhead_E ?? 0) -
        C.number(ref.w.wellhead_E ?? 0),
      references: Object.fromEntries(
        Object.keys(mapped).map((k) => [k, p.reference]),
      ),
      sections: ref.b.sections || [],
      dataset_data: p.mode === "SYNTHETIC" ? "SYNTHETIC" : "IMPORTED_UNCHECKED",
    };
    output.wells = Object.entries(mapped).map(([role, { w, b }]) => ({
      ...w,
      id: role,
      source_well_id: w.id,
      reference: p.reference,
      wellbores: [
        { ...b, id: role, source_wellbore_id: b.id, surveys: surveys[role] },
      ],
    }));
    output.measurements = (p.measurements || []).map((m) => ({
      ...m,
      data: m.data === "SYNTHETIC" ? "SYNTHETIC" : "IMPORTED_UNCHECKED",
    }));
    output.events = [];
    output.model_runs = [];
    if (
      output.mode === "USER_DATA" &&
      output.limits.some((r) => r.data === "SYNTHETIC" && r.active !== false)
    )
      throw Error("Remove active synthetic thresholds from real projects");
    output.limits.forEach(C.validateLimit);
    return output;
  }
  function vendor(curve, query) {
    if (!curve || !usable(curve) || !curve.revision || !curve.conditions)
      return {
        status: "NOT_COMPUTED",
        reason: "Source, revision, usable QC and test conditions required",
      };
    for (const key of ["mud", "temperature_c", "density_kg_m3"])
      if (
        curve.conditions[key] == null ||
        query.conditions?.[key] !== curve.conditions[key]
      )
        return {
          status: "NOT_COMPUTED",
          reason: "Query does not match source mud, temperature and density",
        };
    const definition =
      curve.kind === "FLOW_RPM"
        ? ["m3/s", "rpm", "flow", "rpm"]
        : curve.kind === "DP_TORQUE"
          ? ["Pa", "N.m", "dp", "torque"]
          : null;
    if (!definition) throw Error("Curve kind must be FLOW_RPM or DP_TORQUE");
    const [xunit, yunit, xkey, ykey] = definition;
    if (!Array.isArray(curve.points) || curve.points.length < 2)
      throw Error("At least two vendor points required");
    const points = curve.points.map((p) => ({
      x: C.convert(p[xkey], curve.x_unit, xunit),
      y: C.convert(p[ykey], curve.y_unit, yunit),
    }));
    for (let i = 0; i < points.length; i++)
      if (
        points[i].x < 0 ||
        points[i].y < 0 ||
        (i && points[i].x <= points[i - 1].x)
      )
        throw Error("Vendor domain must be ordered, unique and nonnegative");
    const x = C.convert(query.value, query.unit, xunit);
    if (x < points[0].x || x > points.at(-1).x)
      return {
        status: "NOT_COMPUTED",
        reason: "Outside source table domain; no extrapolation",
      };
    const i = Math.max(
        1,
        points.findIndex((p) => p.x >= x),
      ),
      a = points[i - 1],
      b = points[i];
    return {
      status: "PRELIMINARY_UNVERIFIED",
      kind: curve.kind,
      value: a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y),
      unit: yunit,
      source: curve.source,
      source_revision: curve.revision,
      conditions: curve.conditions,
      meaning:
        curve.kind === "FLOW_RPM"
          ? "Shaft RPM from source table; not bit RPM"
          : "Torque from imported vendor table; not a drillstring torque solution",
    };
  }
  function matchedWeights(rows, maxSeconds) {
    const max = C.number(maxSeconds);
    if (max < 0) throw Error("Time tolerance cannot be negative");
    const groups = new Map();
    for (const r of rows) {
      if (
        !usable(r) ||
        !r.basis_id ||
        !r.wellbore ||
        !r.zero_basis ||
        !Number.isFinite(Date.parse(r.timestamp_utc))
      )
        throw Error(
          "Matched observations require passed QC, source, basis ID, sensor-zero basis, well and timestamp",
        );
      if (!["PUW", "SOW", "FRW"].includes(r.operation))
        throw Error("Expected PUW/SOW/FRW");
      C.number(r.md);
      const key = [r.wellbore, r.md, r.basis_id, r.zero_basis].join("|");
      if (!groups.has(key)) groups.set(key, {});
      const group = groups.get(key);
      if (group[r.operation])
        throw Error(
          "Duplicate operation at the same depth/basis; split repeated tests into distinct basis IDs",
        );
      group[r.operation] = r;
    }
    return [...groups.values()].map((g) => {
      const r = g.PUW || g.SOW || g.FRW;
      if (!g.PUW || !g.SOW || !g.FRW)
        return {
          md: r.md,
          basis_id: r.basis_id,
          status: "NOT_EVALUABLE",
          reason: "Incomplete matched PUW/SOW/FRW triplet",
        };
      const times = Object.values(g).map((v) => Date.parse(v.timestamp_utc));
      if ((Math.max(...times) - Math.min(...times)) / 1000 > max)
        return {
          md: r.md,
          status: "NOT_EVALUABLE",
          reason: "Outside configured time tolerance",
        };
      const force = (k) => C.convert(g[k].value, g[k].unit, "N");
      return {
        md: r.md,
        basis_id: r.basis_id,
        status: "DESCRIPTIVE ONLY",
        pickup_minus_free_N: force("PUW") - force("FRW"),
        free_minus_slackoff_N: force("FRW") - force("SOW"),
        sources: Object.values(g).map((v) => v.source),
        limitation:
          "Matched differences do not diagnose hole cleaning, formation effects or tortuosity",
      };
    });
  }
  function spectrum(channel) {
    if (
      !usable(channel) ||
      !channel.clock_alignment ||
      !channel.anti_alias_filter ||
      !channel.unit
    )
      throw Error(
        "Spectrum requires QC, source, units, clock alignment and anti-alias metadata",
      );
    const rate = C.number(channel.sample_rate_hz),
      samples = channel.samples;
    if (
      rate <= 0 ||
      !Array.isArray(samples) ||
      samples.length < 8 ||
      samples.length > 2048
    )
      throw Error(
        "Use 8–2048 uniformly spaced samples and a positive sampling rate",
      );
    const values = samples.map((s) => C.number(s.value));
    for (let i = 1; i < samples.length; i++) {
      const dt = C.number(samples[i].time_s) - C.number(samples[i - 1].time_s);
      if (Math.abs(dt - 1 / rate) > 1e-6 / rate)
        throw Error("Gaps or irregular sampling; no silent resampling");
    }
    const n = values.length,
      mean = values.reduce((a, b) => a + b, 0) / n,
      window = values.map(
        (_, i) => 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1))),
      ),
      gain = window.reduce((a, b) => a + b, 0),
      bins = [];
    for (let k = 0; k <= Math.floor(n / 2); k++) {
      let re = 0,
        im = 0;
      for (let i = 0; i < n; i++) {
        const value = (values[i] - mean) * window[i],
          angle = (2 * Math.PI * k * i) / n;
        re += value * Math.cos(angle);
        im -= value * Math.sin(angle);
      }
      bins.push({
        frequency_hz: (k * rate) / n,
        amplitude:
          (Math.hypot(re, im) / gain) * (k === 0 || 2 * k === n ? 1 : 2),
      });
    }
    const peak = bins
      .slice(1)
      .reduce((a, b) => (a.amplitude > b.amplitude ? a : b));
    return {
      status: "MEASURED RESPONSE ONLY",
      source: channel.source,
      unit: channel.unit,
      sample_rate_hz: rate,
      nyquist_hz: rate / 2,
      window: "Hann; mean removed; one-sided amplitude; no resampling",
      frequency_resolution_hz: rate / n,
      peak,
      bins,
      natural_frequencies: "NOT_COMPUTED",
      critical_speed: "NOT_COMPUTED",
      limitation:
        "A response peak is not a natural mode or a causal diagnosis. Aliasing cannot be excluded by spectral shape alone.",
    };
  }
  function directionalIntervals(stations, source, quality) {
    if (!source || !["SYNTHETIC", "MEASURED_QC_PASS"].includes(quality))
      throw Error("Observed survey intervals require source and passed QC");
    const rows = E.survey(stations);
    return rows.slice(1).map((b, i) => {
      const a = rows[i],
        length = b.md - a.md;
      return {
        md_from: a.md,
        md_to: b.md,
        observed_bur_deg_30m: ((b.inc - a.inc) * 30) / length,
        observed_tur_deg_30m:
          a.inc < 0.1 || b.inc < 0.1
            ? null
            : ((((b.azi - a.azi + 540) % 360) - 180) * 30) / length,
        source,
        quality,
        kind: "OBSERVED",
        note: "Survey-interval descriptive rates; not a BHA directional prediction",
      };
    });
  }
  return {
    completion,
    importProject,
    vendor,
    matchedWeights,
    spectrum,
    directionalIntervals,
  };
});
