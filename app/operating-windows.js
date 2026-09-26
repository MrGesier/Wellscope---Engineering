/* Independent reduced-order calculations. SI internally; no proprietary solver. */
(function (root) {
  "use strict";
  const n = (v, k, min = -Infinity, max = Infinity) => {
    if (
      v === null ||
      v === "" ||
      typeof v === "boolean" ||
      !Number.isFinite(Number(v)) ||
      Number(v) < min ||
      Number(v) > max
    )
      throw Error(k + " is missing or outside its domain");
    return Number(v);
  };
  function geometry(p) {
    const od = n(p.od, "OD", 1e-6),
      id = n(p.id, "ID", 0);
    if (id >= od) throw Error("ID must be smaller than OD");
    return {
      A: (Math.PI * (od * od - id * id)) / 4,
      I: (Math.PI * (od ** 4 - id ** 4)) / 64,
      J: (Math.PI * (od ** 4 - id ** 4)) / 32,
      r: od / 2,
    };
  }
  function mechanical(p) {
    const g = geometry(p),
      stress =
        n(p.yieldPa, "Yield stress", 1) / n(p.designFactor, "Design factor", 1),
      torque = n(p.torqueNm, "Section torque", 0),
      local = n(p.localTensionN, "Local tensile force", 0),
      hook = n(p.hookN, "Current hookload", 0),
      rig = n(p.rigN, "Allowable rig hookload", 1),
      conn = n(p.connectionN, "Allowable connection tension", 1),
      connT = n(p.connectionNm, "Allowable connection torque", 1),
      drive = n(p.driveNm, "Allowable drive torque", 1),
      surfaceTorque = n(p.surfaceTorqueNm, "Surface torque", 0);
    const shear = (torque * g.r) / g.J,
      vm = Math.hypot(local / g.A, Math.sqrt(3) * shear),
      bodyTension =
        g.A * Math.sqrt(Math.max(0, stress * stress - 3 * shear * shear));
    const margins = [
      { name: "Rig hookload", marginN: rig - hook },
      {
        name: "Selected pipe body at entered torque",
        marginN: bodyTension - local,
      },
      { name: "Selected connection tension", marginN: conn - local },
    ];
    const governing = margins.reduce((a, b) => (a.marginN < b.marginN ? a : b)),
      torqueOK = torque <= connT && surfaceTorque <= drive && vm <= stress;
    return {
      vonMisesPa: vm,
      allowableStressPa: stress,
      bodyTensionN: bodyTension,
      margins,
      governing: governing.name,
      overpullN: torqueOK ? Math.max(0, governing.marginN) : 0,
      status:
        torqueOK && governing.marginN >= 0
          ? "WITHIN_ENTERED_LIMITS"
          : "EXCEEDED",
      torqueMarginNm: connT - torque,
      driveMarginNm: drive - surfaceTorque,
      curve: Array.from({ length: 61 }, (_, i) => {
        const T = ((((stress / Math.sqrt(3)) * g.J) / g.r) * i) / 60;
        return {
          torqueNm: T,
          tensionN: Math.min(
            conn,
            g.A *
              Math.sqrt(
                Math.max(0, stress * stress - 3 * ((T * g.r) / g.J) ** 2),
              ),
          ),
          permittedTorque: T <= connT,
        };
      }),
    };
  }
  function modal(p, wobN, maxHz = null) {
    const g = geometry(p),
      E = n(p.E, "Young modulus", 1),
      G = n(p.G, "Shear modulus", 1),
      rho = n(p.rho, "Material density", 1),
      L = n(p.span, "Lateral effective span", 0.01),
      rod = n(p.rodLength, "Axial/torsional uniform rod length", 0.01),
      m =
        n(p.massPerM, "Structural linear mass", 0.001) +
        n(p.addedMassPerM, "Lateral added mass", 0),
      P = n(wobN, "Compression", 0),
      criticalN = (Math.PI ** 2 * E * g.I) / L ** 2;
    const counts = { Lateral: 3, Axial: 3, Torsional: 3 };
    if (maxHz !== null) {
      n(maxHz, "Frequency coverage", 0);
      counts.Axial = Math.max(
        3,
        Math.ceil(((4 * rod * maxHz) / Math.sqrt(E / rho) + 1) / 2) + 1,
      );
      counts.Torsional = Math.max(
        3,
        Math.ceil(((4 * rod * maxHz) / Math.sqrt(G / rho) + 1) / 2) + 1,
      );
      const y =
        (P + Math.sqrt(P * P + 4 * E * g.I * m * (2 * Math.PI * maxHz) ** 2)) /
        (2 * E * g.I);
      counts.Lateral = Math.max(3, Math.ceil((L / Math.PI) * Math.sqrt(y)) + 1);
      if (Math.max(...Object.values(counts)) > 300)
        throw Error(
          "Study frequency domain requires more than 300 modes per branch; narrow the domain",
        );
    }
    const modes = [];
    for (let j = 1; j <= Math.max(...Object.values(counts)); j++) {
      const k = (j * Math.PI) / L,
        omega2 = (E * g.I * k ** 4 - P * k * k) / m;
      if (j <= counts.Lateral)
        modes.push({
          kind: "Lateral",
          mode: j,
          hz: omega2 > 0 ? Math.sqrt(omega2) / (2 * Math.PI) : null,
        });
      if (j <= counts.Axial)
        modes.push({
          kind: "Axial",
          mode: j,
          hz: ((2 * j - 1) * Math.sqrt(E / rho)) / (4 * rod),
        });
      if (j <= counts.Torsional)
        modes.push({
          kind: "Torsional",
          mode: j,
          hz: ((2 * j - 1) * Math.sqrt(G / rho)) / (4 * rod),
        });
    }
    return {
      modes,
      criticalN,
      unstable: P >= criticalN,
      modalMassKg: (m * L) / 2,
    };
  }
  function response(fn, excitationHz, zeta, mass, force) {
    n(fn, "Natural frequency", 1e-12);
    n(excitationHz, "Excitation frequency", 0);
    n(zeta, "Damping ratio", 0.001, 1);
    n(mass, "Modal mass", 0.001);
    n(force, "Generalized harmonic force", 0);
    const ratio = excitationHz / fn,
      amplification = 1 / Math.hypot(1 - ratio * ratio, 2 * zeta * ratio);
    return {
      amplification,
      displacementM: (force / (mass * (2 * Math.PI * fn) ** 2)) * amplification,
    };
  }
  function directional(rows, wobN, limits) {
    if (!rows.length)
      return { status: "NOT_EVALUABLE", reason: "No directional source table" };
    const scenarios = [...new Set(rows.map((r) => r.scenario))],
      values = [];
    for (const scenario of scenarios) {
      const a = rows
        .filter((r) => r.scenario === scenario)
        .sort((a, b) => a.wobN - b.wobN);
      if (a.length < 2)
        throw Error("Two WOB knots per directional scenario are required");
      a.forEach((r, i) => {
        n(r.wobN, "WOB knot", 0);
        n(r.build, "Build rate");
        n(r.right, "Right-walk rate");
        if (i && r.wobN <= a[i - 1].wobN) throw Error("Duplicate WOB knots");
      });
      if (wobN < a[0].wobN || wobN > a.at(-1).wobN)
        return {
          status: "NOT_EVALUABLE",
          reason: "WOB outside " + scenario + " source domain",
        };
      const i = Math.max(
          1,
          a.findIndex((r) => r.wobN >= wobN),
        ),
        lo = a[i - 1],
        hi = a[i],
        f = (wobN - lo.wobN) / (hi.wobN - lo.wobN),
        build = lo.build + f * (hi.build - lo.build),
        right = lo.right + f * (hi.right - lo.right);
      values.push({ scenario, build, right, dls: Math.hypot(build, right) });
    }
    const pass = values.every(
      (v) =>
        v.build >= limits.buildMin &&
        v.build <= limits.buildMax &&
        v.dls <= limits.dlsMax,
    );
    return { status: pass ? "WITHIN_ENTERED_LIMITS" : "EXCEEDED", values };
  }
  function evaluate(p) {
    if (!p.source?.trim() || !p.context?.trim())
      throw Error("Source/revision and well/run/depth context are required");
    if (!["SYNTHETIC", "USER_ENTERED"].includes(p.quality))
      throw Error("Declare input quality");
    const a = p.analysis;
    for (const [k, min, max] of [
      ["rpmMin", 0, 5000],
      ["rpmMax", 0, 5000],
      ["wobMinN", 0, 1e7],
      ["wobMaxN", 0, 1e7],
      ["selectedWobN", 0, 1e7],
      ["selectedRPM", 0, 5000],
      ["margin", 0, 0.5],
      ["motorRPM", 0, 5000],
      ["order", 1, 20],
      ["compressionFraction", 0, 1],
      ["damping", 0.001, 1],
      ["modalForceN", 0, 1e7],
    ])
      n(a[k], k, min, max);
    if (a.rpmMax <= a.rpmMin || a.wobMaxN <= a.wobMinN)
      throw Error("Window bounds must increase");
    if (
      a.selectedWobN < a.wobMinN ||
      a.selectedWobN > a.wobMaxN ||
      a.selectedRPM < a.rpmMin ||
      a.selectedRPM > a.rpmMax
    )
      throw Error("Selected point outside study domain");
    for (const k of ["buildMin", "buildMax", "dlsMax"])
      n(p.directionalLimits[k], k);
    if (
      p.directionalLimits.buildMin > p.directionalLimits.buildMax ||
      p.directionalLimits.dlsMax < 0
    )
      throw Error("Invalid directional limits");
    const maxHz = ((a.rpmMax + a.motorRPM) * a.order) / 60 / (1 - a.margin),
      mechanics = mechanical(p.mechanical),
      selected = modal(p.modal, a.selectedWobN * a.compressionFraction, maxHz),
      excitationHz = ((a.selectedRPM + a.motorRPM) * a.order) / 60,
      bands = selected.modes
        .filter((m) => m.hz != null)
        .map((m) => ({
          ...m,
          rpm: (60 * m.hz) / a.order - a.motorRPM,
          from: ((60 * m.hz) / a.order) * (1 - a.margin) - a.motorRPM,
          to: ((60 * m.hz) / a.order) * (1 + a.margin) - a.motorRPM,
        })),
      lateral = selected.modes.find(
        (m) => m.kind === "Lateral" && m.mode === 1,
      ),
      forced = lateral.hz
        ? response(
            lateral.hz,
            excitationHz,
            a.damping,
            selected.modalMassKg,
            a.modalForceN,
          )
        : null;
    const cells = [],
      windows = [];
    for (let wi = 0; wi <= 24; wi++) {
      const wobN = a.wobMinN + ((a.wobMaxN - a.wobMinN) * wi) / 24,
        mod = modal(p.modal, wobN * a.compressionFraction, maxHz),
        dir = directional(p.directionalRows, wobN, p.directionalLimits);
      let start = null;
      for (let ri = 0; ri <= 60; ri++) {
        const rpm = a.rpmMin + ((a.rpmMax - a.rpmMin) * ri) / 60,
          fx = ((rpm + a.motorRPM) * a.order) / 60,
          resonance = mod.modes.some(
            (m) => m.hz && Math.abs(fx - m.hz) <= a.margin * m.hz,
          ),
          status = mod.unstable
            ? "MODEL_UNSTABLE"
            : resonance
              ? "RESONANCE_BAND"
              : dir.status === "NOT_EVALUABLE"
                ? "NOT_EVALUABLE"
                : dir.status === "EXCEEDED"
                  ? "DIRECTIONAL_LIMIT"
                  : "CANDIDATE";
        cells.push({ wobN, rpm, status });
        if (status === "CANDIDATE" && start === null) start = rpm;
        if (start !== null && (status !== "CANDIDATE" || ri === 60)) {
          windows.push({
            wobN,
            fromRPM: start,
            toRPM:
              status === "CANDIDATE" ? rpm : rpm - (a.rpmMax - a.rpmMin) / 60,
          });
          start = null;
        }
      }
    }
    return {
      mechanics,
      selected,
      bands,
      forced,
      excitationHz,
      cells,
      windows,
      directional: directional(
        p.directionalRows,
        a.selectedWobN,
        p.directionalLimits,
      ),
      selectedResonance: bands.filter(
        (b) => a.selectedRPM >= b.from && a.selectedRPM <= b.to,
      ),
      quality: p.quality,
      model: "REDUCED_ORDER_UNVERIFIED",
      coverage:
        "Candidate map intersects directional scenarios and linear resonance bands only. Mechanical limits are evaluated separately at the entered load state. No whole-BHA contact, stick-slip, whirl, fatigue, pressure/bending stress or connection interaction model.",
    };
  }
  root.OperatingWindows = {
    geometry,
    mechanical,
    modal,
    response,
    directional,
    evaluate,
  };
  if (typeof module === "object") module.exports = root.OperatingWindows;
})(globalThis);
