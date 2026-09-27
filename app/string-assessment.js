/* Derived mechanical screening; SI. No stress concentration or field qualification. */
(function (root) {
  const R = root.RunMechanics || require("./run-mechanics");
  function stress(b, load, curvature) {
    const ri = b.id / 2,
      ro = b.od / 2,
      { A, J } = R.section(b),
      d = ro * ro - ri * ri,
      a = (load.insidePa * ri * ri - load.outsidePa * ro * ro) / d,
      h = ((load.insidePa - load.outsidePa) * ri * ri * ro * ro) / d,
      axial = load.wallN / A;
    let best = { vonMisesPa: -1 };
    // Maximizing over angle selects either bending extreme. The resulting VM^2
    // is convex in radius: (abs(axial-a)+E*k*r)^2 + 3*h^2/r^4 + 3*(T*r/J)^2.
    for (const radius of ri > 0 ? [ri, ro] : [ro])
      for (const sign of [-1, 1]) {
        const radial = a - h / (radius * radius),
          hoop = a + h / (radius * radius),
          bending = sign * b.E * curvature * radius,
          z = axial + bending,
          tau = (load.torqueNm * radius) / J,
          vm = Math.sqrt(
            ((z - hoop) ** 2 + (hoop - radial) ** 2 + (radial - z) ** 2) / 2 +
              3 * tau * tau,
          );
        if (vm > best.vonMisesPa)
          best = {
            vonMisesPa: vm,
            axialPa: axial,
            bendingPa: bending,
            radialPa: radial,
            hoopPa: hoop,
            torsionPa: tau,
            radius,
            side: sign,
          };
      }
    return { ...best, momentNm: ((b.E * J) / 2) * curvature };
  }
  function assess(p, shape) {
    if (!shape) return null;
    const axial = shape.axial,
      rows = [],
      checks = [],
      coverage = [],
      parts = shape.parts;
    for (let i = 0; i < shape.rows.length; i++) {
      const n = shape.rows[i],
        b = parts[n.component],
        distance = p.bitMD - n.md,
        interior =
          i > 0 &&
          i < shape.rows.length - 1 &&
          distance > b.start + 1e-7 &&
          distance < b.end - 1e-7 &&
          p.bitMD - shape.rows[i - 1].md <= b.end + 1e-7 &&
          p.bitMD - shape.rows[i + 1].md >= b.start - 1e-7;
      const base = {
        md: n.md,
        component: n.component,
        name: b.name,
        curvature: n.curvature,
        momentNm:
          !interior || n.curvature == null
            ? null
            : ((b.E * R.section(b).J) / 2) * n.curvature,
        contactNperM: n.pin
          ? null
          : n.reactionN / ((shape.rows[i + 1].md - shape.rows[i - 1].md) / 2),
        combined: null,
        utilization: null,
      };
      if (axial && interior && n.curvature != null) {
        const c = axial.cells.find(
          (c) =>
            c.componentId === "component-" + n.component &&
            n.md >= c.fromMD - 1e-8 &&
            n.md <= c.toMD + 1e-8,
        );
        if (c) {
          const t = (n.md - c.fromMD) / (c.toMD - c.fromMD),
            load = {};
          for (const k of ["wallN", "torqueNm", "insidePa", "outsidePa"])
            load[k] = c.top[k] + t * (c.bottom[k] - c.top[k]);
          base.combined = stress(b, load, n.curvature);
          if (
            b.bodyModel === "annular_tube" &&
            b.yieldPa > 0 &&
            b.designFactor >= 1 &&
            b.limitSource?.trim() &&
            b.source?.trim()
          ) {
            const allowable = b.yieldPa / b.designFactor;
            base.utilization = base.combined.vonMisesPa / allowable;
            checks.push({
              component: n.component,
              name: b.name,
              md: n.md,
              value: base.combined.vonMisesPa,
              limit: allowable,
              utilization: base.utilization,
            });
          }
        }
      }
      rows.push(base);
    }
    const components = parts
      .map((b, i) => {
        if (b.start >= p.bitMD) return null;
        const ns = rows.filter((n) => n.component === i),
          valid = ns.filter((n) => n.combined),
          rated = ns.filter((n) => n.utilization != null);
        if (!valid.length)
          coverage.push(
            b.name +
              ": no interior combined-stress station; refine beam mesh / enable distributed loads",
          );
        if (b.bodyModel !== "annular_tube")
          coverage.push(
            b.name +
              ": uniform tube-body applicability not declared (equivalent estimate only)",
          );
        if (!(b.yieldPa > 0 && b.designFactor >= 1 && b.limitSource?.trim()))
          coverage.push(
            b.name +
              ": positive yield, design factor and rating source required",
          );
        return {
          index: i,
          name: b.name,
          samples: valid.length,
          maxVonMisesPa: valid.length
            ? Math.max(...valid.map((n) => n.combined.vonMisesPa))
            : null,
          maxUtilization: rated.length
            ? Math.max(...rated.map((n) => n.utilization))
            : null,
          maxMomentNm: ns.some((n) => n.momentNm != null)
            ? Math.max(...ns.map((n) => n.momentNm || 0))
            : null,
        };
      })
      .filter(Boolean);
    let twistRad = 0,
      extensionM = 0;
    const missingG = new Set(),
      missingNu = new Set(),
      neutralMD = [];
    if (axial)
      for (const c of axial.cells) {
        const b = parts[Number(c.componentId.replace("component-", ""))],
          s = R.section(b),
          length = c.toMD - c.fromMD;
        if (b.G > 0 && Number.isFinite(b.G))
          twistRad +=
            (length * (c.top.torqueNm + c.bottom.torqueNm)) / 2 / (b.G * s.J);
        else missingG.add(b.name);
        if (Number.isFinite(b.nu) && b.nu > -1 && b.nu < 0.5) {
          const strain = (q) => {
            const lame = (q.insidePa * s.Ai - q.outsidePa * s.Ao) / s.A;
            return (q.wallN / s.A - 2 * b.nu * lame) / b.E;
          };
          extensionM += (length * (strain(c.top) + strain(c.bottom))) / 2;
        } else missingNu.add(b.name);
        const a = c.top.effectiveN,
          z = c.bottom.effectiveN;
        if (a * z < 0)
          neutralMD.push(c.fromMD + ((c.toMD - c.fromMD) * a) / (a - z));
        else if (a === 0) neutralMD.push(c.fromMD);
        else if (z === 0) neutralMD.push(c.toMD);
      }
    const worst = checks.reduce(
        (a, b) => (!a || b.utilization > a.utilization ? b : a),
        null,
      ),
      compressed = axial?.rows.some((n) => n.effectiveN < 0);
    if (compressed)
      coverage.push(
        "Effective compression: constrained buckling and post-buckling not evaluated",
      );
    return {
      rows,
      components,
      checks,
      coverage,
      worst,
      status: checks.some((c) => c.utilization > 1)
        ? "EXCEEDED"
        : coverage.length
          ? "NOT_FULLY_EVALUABLE"
          : "WITHIN_SAMPLED_BODY_LIMITS",
      excludedStations: rows.filter((n) => !n.combined).length,
      neutralMD: [...new Set(neutralMD.map((x) => +x.toFixed(6)))],
      neutralNote:
        "Sampled effective-force zero crossings; zero-force intervals are not buckling boundaries",
      twistRad: axial && !missingG.size ? twistRad : null,
      extensionM: axial && !missingNu.size ? extensionM : null,
      missingG: [...missingG],
      missingNu: [...missingNu],
      rotationalPowerW: axial
        ? (axial.surfaceTorqueNm * p.axial.rpm * 2 * Math.PI) / 60
        : null,
      axialFrictionPowerW: axial
        ? axial.axialDragN * p.axial.axialSpeedMps
        : null,
      rotationalFrictionPowerW: axial
        ? ((axial.surfaceTorqueNm - p.axial.bottomTorqueNm) *
            p.axial.rpm *
            2 *
            Math.PI) /
          60
        : null,
      scope:
        "Sampled equivalent tube-body screening; interfaces/end supports excluded from combined stress. No joint/tool stress concentrations, contact stress, fatigue, wear, post-buckling or dynamics.",
    };
  }
  root.StringAssessment = { stress, assess };
  if (typeof module === "object") module.exports = root.StringAssessment;
})(globalThis);
