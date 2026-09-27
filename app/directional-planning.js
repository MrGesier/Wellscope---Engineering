/* Geometry and exact admissible intervals within a declared response surface. */
(function (root) {
  const D = root.DirectionalResponse || require("./directional-response");
  const finite = (v) => typeof v === "number" && Number.isFinite(v);
  function survey(a, b) {
    for (const s of [a, b]) {
      if (
        !s ||
        !["md", "inc", "azi"].every((k) => finite(s[k])) ||
        s.md < 0 ||
        s.inc < 0 ||
        s.inc > 180
      )
        throw Error(
          "Survey requires finite MD ≥ 0 m, inclination 0–180° and azimuth in degrees.",
        );
    }
    const length = b.md - a.md;
    if (length <= 0) throw Error("End MD must exceed start MD.");
    const rad = Math.PI / 180;
    const vector = (s) => [
      Math.sin(s.inc * rad) * Math.cos(s.azi * rad),
      Math.sin(s.inc * rad) * Math.sin(s.azi * rad),
      Math.cos(s.inc * rad),
    ];
    const u = vector(a),
      v = vector(b);
    const cross = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    const dogleg =
      Math.atan2(
        Math.hypot(...cross),
        u.reduce((s, x, i) => s + x * v[i], 0),
      ) / rad;
    const da = ((((b.azi - a.azi + 180) % 360) + 360) % 360) - 180;
    const build = ((b.inc - a.inc) * 30) / length;
    return {
      length,
      build,
      drop: Math.max(0, -build),
      dls: (dogleg * 30) / length,
      turn:
        Math.min(a.inc, b.inc) < 1 ||
        Math.max(a.inc, b.inc) > 179 ||
        Math.abs(da) === 180
          ? null
          : (da * 30) / length,
    };
  }
  function windows(surface, settings, limits) {
    const { buildMin, buildMax, dlsMax, wobMin, wobMax } = limits;
    if (
      ![buildMin, buildMax, dlsMax, wobMin, wobMax].every(finite) ||
      buildMin > buildMax ||
      dlsMax < 0 ||
      wobMin < 0 ||
      wobMin > wobMax
    )
      throw Error(
        "Use finite ordered build/WOB bounds and a nonnegative DLS ceiling.",
      );
    D.response(surface, settings);
    const rows = surface.curves.find((c) => c.mode === settings.mode).rows;
    const found = [];
    for (let i = 1; i < rows.length; i++) {
      const w0 = rows[i - 1].wobN,
        w1 = rows[i].wobN,
        dw = w1 - w0;
      const a = D.response(surface, { ...settings, wobN: w0 }),
        b = D.response(surface, { ...settings, wobN: w1 });
      let lo = Math.max(0, (wobMin - w0) / dw),
        hi = Math.min(1, (wobMax - w0) / dw);
      const db = b.build - a.build,
        dr = b.right - a.right;
      if (Math.abs(db) < 1e-14) {
        if (a.build < buildMin || a.build > buildMax) continue;
      } else {
        const x = (buildMin - a.build) / db,
          y = (buildMax - a.build) / db;
        lo = Math.max(lo, Math.min(x, y));
        hi = Math.min(hi, Math.max(x, y));
      }
      // Norm of an affine curvature vector is convex; clip against its disk.
      const A = db * db + dr * dr,
        B = 2 * (a.build * db + a.right * dr),
        C = a.build * a.build + a.right * a.right - dlsMax * dlsMax;
      if (A < 1e-28) {
        if (C > 1e-12) continue;
      } else {
        const disc = B * B - 4 * A * C,
          tol = 1e-12 * Math.max(1, B * B, Math.abs(4 * A * C));
        if (disc < -tol) continue;
        const root = Math.sqrt(Math.max(0, disc));
        lo = Math.max(lo, (-B - root) / (2 * A));
        hi = Math.min(hi, (-B + root) / (2 * A));
      }
      if (lo > hi + 1e-12) continue;
      if (lo > hi) lo = hi = (lo + hi) / 2;
      const range = { fromN: w0 + lo * dw, toN: w0 + hi * dw };
      if (found.length && range.fromN - found.at(-1).toN < 1e-6)
        found.at(-1).toN = range.toN;
      else found.push(range);
    }
    return found;
  }
  function sample(surface, settings, subdivisions = 16) {
    D.response(surface, settings);
    if (
      !Number.isInteger(subdivisions) ||
      subdivisions < 1 ||
      subdivisions > 100
    )
      throw Error("Invalid sampling resolution");
    const knots = surface.curves.find((c) => c.mode === settings.mode).rows;
    const values = [];
    knots.forEach((r, i) => {
      if (i)
        for (let j = 0; j < subdivisions; j++)
          values.push(
            D.response(surface, {
              ...settings,
              wobN:
                knots[i - 1].wobN +
                ((r.wobN - knots[i - 1].wobN) * j) / subdivisions,
            }),
          );
    });
    values.push(D.response(surface, { ...settings, wobN: knots.at(-1).wobN }));
    return values;
  }
  root.DirectionalPlanning = { survey, windows, sample };
  if (typeof module === "object") module.exports = root.DirectionalPlanning;
})(globalThis);
