/* One-way soft-string effective tension -> transverse beam. No contact feedback. */
(function (root) {
  const R = root.RunMechanics || require("./run-mechanics"),
    A = root.BhaStatic || require("./bha-static");
  function solve(p) {
    A.architecture(p.sections);
    for (const b of p.components) {
      if (b.G != null && (!Number.isFinite(b.G) || b.G <= 0))
        throw Error(b.name + ": shear modulus G must be positive");
      if (b.nu != null && (!Number.isFinite(b.nu) || b.nu <= -1 || b.nu >= 0.5))
        throw Error(b.name + ": Poisson ratio must be between -1 and 0.5");
    }
    const a = p.axial;
    if (!a || a.mode !== "soft-string" || !a.source?.trim())
      throw Error("Axial model mode and source required");
    let shoe = 0,
      open = false;
    for (const s of p.sections) {
      if (s.kind === "OPEN") open = true;
      else {
        if (open)
          throw Error(
            "Axial adapter supports a cased prefix followed by open hole only",
          );
        shoe = s.to;
      }
    }
    const run = {
      id: "string-loads",
      revision: "1",
      source: a.source,
      well: p.source,
      reference: "Surface MD 0",
      quality: p.quality,
      survey: p.survey,
      bha: p.components.map((b, i) => ({ ...b, stable_id: "component-" + i })),
      settings: {
        ...a,
        bitMD: p.bitMD,
        stepM: a.stepM,
        shoeMD: Math.min(shoe, p.survey.at(-1).md),
        rhoInside: p.rho,
        rhoOutside: p.rho,
        surfaceInsidePa: 0,
        surfaceOutsidePa: 0,
        operation: "User prescribed motion / one-way shape coupling",
      },
    };
    return R.solve(run);
  }
  function at(result, md) {
    const cells = result.cells; // bottom-up, includes component interfaces
    let lo = 0,
      hi = cells.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (cells[m].fromMD > md) lo = m + 1;
      else hi = m;
    }
    const c = cells[lo],
      t = Math.max(0, Math.min(1, (md - c.fromMD) / (c.toMD - c.fromMD)));
    return c.top.effectiveN + (c.bottom.effectiveN - c.top.effectiveN) * t;
  }
  function average(result, from, to) {
    let sum = 0;
    for (const c of result.cells) {
      const l = Math.max(from, c.fromMD),
        h = Math.min(to, c.toMD);
      if (h > l) sum += (at(result, l) + at(result, h)) * 0.5 * (h - l);
    }
    return sum / (to - from);
  }
  root.StringLoads = { solve, at, average };
  if (typeof module === "object") module.exports = root.StringLoads;
})(globalThis);
