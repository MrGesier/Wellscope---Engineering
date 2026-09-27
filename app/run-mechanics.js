/* Distributed soft-string run model. SI, signed effective tension, explicit source limits. */
(function (root) {
  "use strict";
  const E =
      root.WellEngine ||
      (typeof require === "function" ? require("./engine") : null),
    G = 9.80665,
    R = Math.PI / 180;
  const num = (v, label, min = -Infinity, max = Infinity) => {
    if (
      v === null ||
      v === undefined ||
      v === "" ||
      typeof v !== "number" ||
      !Number.isFinite(Number(v)) ||
      +v < min ||
      +v > max
    )
      throw Error(label + " missing or outside range");
    return +v;
  };
  const section = (b) => {
    const A = (Math.PI * (b.od * b.od - b.id * b.id)) / 4,
      Ai = (Math.PI * b.id * b.id) / 4,
      Ao = (Math.PI * b.od * b.od) / 4,
      J = (Math.PI * (b.od ** 4 - b.id ** 4)) / 32;
    return { A, Ai, Ao, J };
  };
  function validate(run) {
    if (
      !run.id?.trim() ||
      !run.revision?.trim() ||
      !run.source?.trim() ||
      !run.well?.trim() ||
      !run.reference?.trim()
    )
      throw Error("Run ID, revision, well, reference and source are required");
    if (!["SYNTHETIC", "USER_ENTERED"].includes(run.quality))
      throw Error("Declare run quality");
    const st = E.survey(run.survey),
      bha = E.normalizeBha(run.bha),
      s = run.settings;
    const ids = new Set();
    for (const b of bha.elements) {
      if (!b.stable_id || ids.has(b.stable_id))
        throw Error("Each component needs a unique stable ID");
      ids.add(b.stable_id);
      if (b.contactOD != null) num(b.contactOD, b.name + " contact OD", b.od);
      for (const k of [
        "allowableTensionN",
        "allowableTorqueNm",
        "allowableCompressionN",
        "yieldPa",
        "designFactor",
      ])
        if (b[k] != null)
          num(b[k], b.name + " " + k, k === "designFactor" ? 1 : 0);
      if (b.bodyModel && !["annular_tube", "rated_tool"].includes(b.bodyModel))
        throw Error("Unknown body model");
    }
    for (const [k, min, max] of [
      ["bitMD", 0.01, st.at(-1).md],
      ["stepM", 0.25, 50],
      ["muOpen", 0, 1.5],
      ["muCased", 0, 1.5],
      ["shoeMD", 0, st.at(-1).md],
      ["rhoInside", 0, 3000],
      ["rhoOutside", 0, 3000],
      ["surfaceInsidePa", 0, 1e9],
      ["surfaceOutsidePa", 0, 1e9],
      ["bottomForceN", -1e8, 1e8],
      ["bottomTorqueNm", 0, 1e7],
      ["axialSpeedMps", -10, 10],
      ["rpm", 0, 1000],
      ["blockN", 0, 1e8],
    ])
      num(s[k], k, min, max);
    if (s.bitMD > bha.totalLength) throw Error("String does not reach bit MD");
    if (s.bitMD / s.stepM > 15000) throw Error("Mesh exceeds 15000 intervals");
    for (const k of ["rigLimitN", "driveLimitNm"])
      if (s[k] != null) num(s[k], k, 0);
    if (!s.operation?.trim()) throw Error("Name the operation");
    return { st, bha };
  }
  function bodyStress(b, wallN, torqueNm, pi, po) {
    const a = section(b),
      ro = b.od / 2,
      ri = b.id / 2,
      axial = wallN / a.A;
    const pressures =
      ri === 0
        ? { a: -po, b: 0 }
        : {
            a: (pi * ri * ri - po * ro * ro) / (ro * ro - ri * ri),
            b: (ri * ri * ro * ro * (pi - po)) / (ro * ro - ri * ri),
          };
    return Math.max(
      ...[ri || ro, ro].map((r) => {
        const hoop = pressures.a + pressures.b / (r * r),
          radial = pressures.a - pressures.b / (r * r),
          shear = (torqueNm * r) / a.J;
        return Math.sqrt(
          ((axial - hoop) ** 2 + (hoop - radial) ** 2 + (radial - axial) ** 2) /
            2 +
            3 * shear * shear,
        );
      }),
    );
  }
  function solve(run, extraBottomN = 0) {
    const { st, bha } = validate(run),
      s = run.settings,
      depth = s.bitMD;
    const cuts = new Set([
      0,
      depth,
      ...st.filter((p) => p.md < depth).map((p) => p.md),
      ...bha.elements
        .flatMap((b) => [depth - b.start, depth - b.end])
        .filter((md) => md > 0 && md < depth),
      ...(s.shoeMD > 0 && s.shoeMD < depth ? [s.shoeMD] : []),
    ]);
    for (let md = s.stepM; md < depth; md += s.stepM) cuts.add(md);
    const mesh = [...cuts].sort((a, b) => a - b);
    if (mesh.length > 16000) throw Error("Mesh too large");
    let force = s.bottomForceN + num(extraBottomN, "Additional bottom load"),
      torque = s.bottomTorqueNm;
    const rows = [],
      cells = [];
    let normalTotalN = 0,
      axialDragN = 0;
    function point(md, b, F, T) {
      const p = E.interp(st, md),
        g = section(b),
        pi = s.surfaceInsidePa + s.rhoInside * G * p.tvd,
        po = s.surfaceOutsidePa + s.rhoOutside * G * p.tvd;
      if (pi < 0 || po < 0)
        throw Error("Hydrostatic pressure below zero: check reference and TVD");
      return {
        md,
        tvd: p.tvd,
        componentId: b.stable_id,
        component: b.name,
        effectiveN: F,
        wallN: F + pi * g.Ai - po * g.Ao,
        torqueNm: T,
        insidePa: pi,
        outsidePa: po,
      };
    }
    for (let i = mesh.length - 1; i > 0; i--) {
      const lo = mesh[i - 1],
        hi = mesh[i],
        ds = hi - lo,
        up = E.interp(st, lo),
        dn = E.interp(st, hi),
        mid = E.interp(st, (lo + hi) / 2),
        b = bha.elements.find((b) => depth - (lo + hi) / 2 < b.end),
        a = section(b),
        w = G * (b.mass + s.rhoInside * a.Ai - s.rhoOutside * a.Ao),
        inc = mid.inc * R,
        di = ((dn.inc - up.inc) * R) / ds,
        da = ((((dn.azi - up.azi + 540) % 360) - 180) * R) / ds,
        mu = mid.md <= s.shoeMD ? s.muCased : s.muOpen,
        r = (b.contactOD || b.od) / 2,
        vt = ((s.rpm * 2 * Math.PI) / 60) * r,
        velocity = Math.hypot(s.axialSpeedMps, vt),
        fa = velocity ? s.axialSpeedMps / velocity : 0,
        ft = velocity ? vt / velocity : 0;
      const rate = (F) => {
        const normal = Math.hypot(
          F * Math.sin(inc) * da,
          F * di - w * Math.sin(inc),
        );
        return {
          f: w * Math.cos(inc) + mu * normal * fa,
          t: mu * normal * r * ft,
          n: normal,
          d: mu * normal * fa,
        };
      };
      const bottom = point(hi, b, force, torque),
        k1 = rate(force),
        k2 = rate(force + (k1.f * ds) / 2),
        k3 = rate(force + (k2.f * ds) / 2),
        k4 = rate(force + k3.f * ds),
        integral = (k) => ((k1[k] + 2 * k2[k] + 2 * k3[k] + k4[k]) * ds) / 6;
      force += integral("f");
      torque += integral("t");
      if (
        !Number.isFinite(force) ||
        !Number.isFinite(torque) ||
        Math.abs(force) > 1e10
      )
        throw Error("Unbounded solution: refine inputs");
      const top = point(lo, b, force, torque);
      cells.push({
        componentId: b.stable_id,
        component: b.name,
        fromMD: lo,
        toMD: hi,
        normalN: integral("n"),
        axialDragN: integral("d"),
        torqueDragNm: integral("t"),
        top,
        bottom,
      });
      normalTotalN += integral("n");
      axialDragN += integral("d");
      rows.push(bottom, top);
    }
    rows.sort((a, b) => a.md - b.md);
    const coverage = [],
      checks = [];
    function check(name, value, limit, md, id) {
      checks.push({
        name,
        value,
        limit,
        margin: limit - value,
        md,
        componentId: id,
      });
    }
    for (const b of bha.elements.filter((b) => b.start < depth)) {
      const points = rows.filter((p) => p.componentId === b.stable_id);
      if (!b.source?.trim())
        coverage.push(b.name + ": geometry source missing");
      if (!b.limitSource?.trim())
        coverage.push(b.name + ": limit source/revision missing");
      for (const k of ["allowableTensionN", "allowableTorqueNm"])
        if (b[k] == null) coverage.push(b.name + ": " + k + " missing");
      if (!b.bodyModel)
        coverage.push(b.name + ": body assessment type missing");
      if (
        b.bodyModel === "annular_tube" &&
        (b.yieldPa == null || b.designFactor == null)
      )
        coverage.push(b.name + ": yield stress/design factor missing");
      if (points.some((p) => p.effectiveN < 0)) {
        coverage.push(
          b.name +
            ": effective compression; constrained buckling not evaluated",
        );
      }
      if (points.some((p) => p.wallN < 0) && b.allowableCompressionN == null)
        coverage.push(b.name + ": compression rating missing");
      for (const p of points) {
        if (b.allowableTensionN != null && p.wallN >= 0)
          check("Tension", p.wallN, b.allowableTensionN, p.md, b.stable_id);
        if (b.allowableCompressionN != null && p.wallN < 0)
          check(
            "Compression",
            -p.wallN,
            b.allowableCompressionN,
            p.md,
            b.stable_id,
          );
        if (b.allowableTorqueNm != null)
          check("Torque", p.torqueNm, b.allowableTorqueNm, p.md, b.stable_id);
        if (
          b.bodyModel === "annular_tube" &&
          b.yieldPa != null &&
          b.designFactor != null
        )
          check(
            "Body von Mises",
            bodyStress(b, p.wallN, p.torqueNm, p.insidePa, p.outsidePa),
            b.yieldPa / b.designFactor,
            p.md,
            b.stable_id,
          );
      }
    }
    const hookN = force + s.blockN,
      head = rows[0];
    if (s.rigLimitN == null) coverage.push("Rig allowable hookload missing");
    else check("Rig hookload", hookN, s.rigLimitN, 0, "RIG");
    if (s.driveLimitNm == null)
      coverage.push("Surface allowable torque missing");
    else check("Surface torque", torque, s.driveLimitNm, 0, "DRIVE");
    if (!s.limitSource?.trim())
      coverage.push("Surface limits source/revision missing");
    const unique = [...new Set(coverage)],
      failed = checks.filter((c) => c.margin < 0),
      governing = checks.reduce(
        (a, b) =>
          !a ||
          b.margin / Math.max(b.limit, 1) < a.margin / Math.max(a.limit, 1)
            ? b
            : a,
        null,
      );
    return {
      rows,
      cells,
      hookN,
      surfaceTorqueNm: torque,
      topEffectiveN: force,
      topWallN: head.wallN,
      normalTotalN,
      axialDragN,
      coverage: unique,
      checks,
      governing,
      status: failed.length
        ? "EXCEEDED"
        : unique.length
          ? "NOT_FULLY_EVALUABLE"
          : "WITHIN_CONFIGURED_LIMITS",
      model: "DISTRIBUTED_SOFT_STRING_UNVERIFIED",
      meshIntervals: cells.length,
    };
  }
  function overpull(run, base = solve(run)) {
    const s = run.settings;
    if (base.status !== "WITHIN_CONFIGURED_LIMITS")
      return {
        status: "NOT_EVALUABLE",
        reason:
          "Complete limits and an initially within-limit run are required",
      };
    if (
      s.axialSpeedMps <= 0 ||
      s.bottomForceN < 0 ||
      base.rows.some((r) => r.effectiveN < 0)
    )
      return {
        status: "NOT_EVALUABLE",
        reason:
          "Overpull requires tensile off-bottom upward movement; fixed RPM and hydraulic assumptions",
      };
    let low = 0,
      high = Math.max(1000, s.rigLimitN - base.hookN),
      r;
    for (let i = 0; i < 30; i++) {
      r = solve(run, high);
      if (r.status === "EXCEEDED") break;
      high *= 2;
      if (i === 29)
        return {
          status: "NOT_EVALUABLE",
          reason: "No limiting load bracket found",
        };
    }
    const scanMax = high;
    low = 0;
    for (let i = 1; i <= 64; i++) {
      const trial = (scanMax * i) / 64;
      r = solve(run, trial);
      if (r.status !== "WITHIN_CONFIGURED_LIMITS") {
        high = trial;
        break;
      }
      low = trial;
    }
    for (let i = 0; i < 32; i++) {
      const mid = (low + high) / 2;
      r = solve(run, mid);
      if (r.status === "WITHIN_CONFIGURED_LIMITS") low = mid;
      else high = mid;
    }
    const allowable = solve(run, low),
      failure = solve(run, high);
    return {
      status: "MODEL_HEADROOM",
      additionalHookN: Math.max(0, allowable.hookN - base.hookN),
      additionalBottomN: low,
      governing: failure.governing,
      assumptions:
        "Fixed upward speed, RPM, fluid, geometry and torque boundary. Nonlinear friction is re-solved at each trial. First failed point on a 64-step load scan is refined; narrow unsampled exceedances are not excluded. Configured-limit envelope only; not an operating approval.",
    };
  }
  function compare(result, run, reference) {
    for (const k of ["runId", "revision", "well", "datum", "operation"]) {
      const expected = {
        runId: run.id,
        revision: run.revision,
        well: run.well,
        datum: run.reference,
        operation: run.settings.operation,
      }[k];
      if (reference[k] !== expected)
        throw Error("Reference context mismatch: " + k);
    }
    if (!reference.source?.trim() || reference.inputMatchConfirmed !== true)
      throw Error("Reference source and verified matching inputs are required");
    if (!Array.isArray(reference.rows) || !reference.rows.length)
      throw Error("Reference profile is empty");
    const unique = [];
    for (const row of result.rows)
      if (!unique.length || unique.at(-1).md !== row.md) unique.push(row);
    const seen = new Set(),
      out = [];
    for (const r of reference.rows) {
      const md = num(r.md, "Reference MD", 0, run.settings.bitMD);
      if (seen.has(md)) throw Error("Duplicate reference MD");
      seen.add(md);
      const j = unique.findIndex((p) => p.md >= md),
        a = unique[Math.max(0, j - 1)],
        b = unique[j],
        t = b.md === a.md ? 0 : (md - a.md) / (b.md - a.md);
      for (const key of ["effectiveN", "torqueNm"])
        if (r[key] != null) {
          const predicted = a[key] + t * (b[key] - a[key]),
            observed = num(r[key], key);
          out.push({
            md,
            quantity: key,
            reference: observed,
            predicted,
            residual: predicted - observed,
          });
        }
    }
    if (!out.length) throw Error("No comparable reference quantities");
    return {
      status: "COMPARISON_ONLY",
      source: reference.source,
      rows: out,
      metrics: ["effectiveN", "torqueNm"].map((k) => {
        const a = out.filter((r) => r.quantity === k);
        return {
          quantity: k,
          count: a.length,
          rmse: a.length
            ? Math.sqrt(a.reduce((s, r) => s + r.residual ** 2, 0) / a.length)
            : null,
        };
      }),
    };
  }
  root.RunMechanics = {
    validate,
    section,
    bodyStress,
    solve,
    overpull,
    compare,
  };
  if (typeof module === "object") module.exports = root.RunMechanics;
})(globalThis);
