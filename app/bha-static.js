/* Small-deflection, pinned-end Euler-Bernoulli beam with frictionless circular stops.
   SI throughout. Compression is prescribed and constant; torsion is uncoupled. */
(function (root) {
  "use strict";
  const G = 9.80665;
  function positive(v, name, zero = false) {
    if (typeof v !== "number" || !Number.isFinite(v) || (zero ? v < 0 : v <= 0))
      throw Error(name + " must be " + (zero ? "non-negative" : "positive"));
    return v;
  }
  function architecture(rows) {
    if (!Array.isArray(rows) || !rows.length)
      throw Error("Architecture sections are required");
    let end = 0;
    for (const s of rows) {
      positive(s.from, "Section start", true);
      positive(s.to, "Section end");
      positive(s.diameter, "Internal diameter");
      if (Math.abs(s.from - end) > 1e-6 || s.to <= s.from)
        throw Error(
          "Architecture must be contiguous from MD 0, without gaps or overlaps",
        );
      if (!["OPEN", "CASED"].includes(s.kind) || !s.source?.trim())
        throw Error("Section type and geometry source are required");
      end = s.to;
    }
    return rows;
  }
  function holeAt(rows, md) {
    const r = rows.find((s) => md >= s.from && md <= s.to);
    if (!r) throw Error("Architecture does not cover MD " + md);
    return r.diameter;
  }
  function solve(p) {
    architecture(p.sections);
    positive(p.bitMD, "Bit MD");
    positive(p.length, "Model length");
    if (p.length > 30 || p.length > p.bitMD)
      throw Error("Local beam length must be <=30 m and within bit MD");
    if (!Number.isInteger(p.n) || p.n < 12 || p.n > 100)
      throw Error("Use 12–100 mesh intervals");
    positive(p.wobN, "WOB", true);
    positive(p.torqueNm, "Torque", true);
    positive(p.rho, "Mud density", true);
    if (!Number.isFinite(p.inc) || p.inc < 0 || p.inc > 180)
      throw Error("Inclination outside 0–180 degrees");
    if (!Array.isArray(p.components) || !p.components.length)
      throw Error("Components required, bit to top");
    let length = 0;
    const parts = p.components.map((b) => {
      for (const k of ["length", "od", "E", "G", "mass"])
        positive(b[k], b.name + " " + k);
      positive(b.id, "ID", true);
      positive(b.contactOD, "Contact OD");
      if (b.id >= b.od || b.contactOD < b.od || !b.source?.trim())
        throw Error("Invalid component geometry/source");
      const from = length;
      length += b.length;
      return {
        ...b,
        from,
        to: length,
        I: (Math.PI * (b.od ** 4 - b.id ** 4)) / 64,
        J: (Math.PI * (b.od ** 4 - b.id ** 4)) / 32,
      };
    });
    if (Math.abs(length - p.length) > 1e-5)
      throw Error("Component lengths must sum to model length");
    const h = p.length / p.n,
      N = p.n + 1,
      m = N - 2;
    const component = (x) =>
      parts.find((b) => x <= b.to + 1e-9) || parts.at(-1);
    const centers = p.centers || Array.from({ length: N }, () => [0, 0]);
    if (
      centers.length !== N ||
      centers.some((c) => c.length !== 2 || c.some((v) => !Number.isFinite(v)))
    )
      throw Error("Invalid well-centre samples");
    // Local straight-axis approximation: bound trajectory departure and segment slopes.
    if (
      centers.some((c) => Math.hypot(...c) > p.length * 0.05) ||
      centers
        .slice(1)
        .some(
          (c, i) =>
            Math.hypot(c[0] - centers[i][0], c[1] - centers[i][1]) / h > 0.1,
        )
    )
      throw Error(
        "Trajectory curvature exceeds local small-angle model; shorten the modeled interval",
      );
    const nodes = Array.from({ length: N }, (_, i) => {
      const x = i * h,
        b = component(x),
        md = p.bitMD - x;
      // Include narrow tools and diameter changes touching each nodal control volume.
      const touched = parts.filter(
        (v) => v.to >= x - h / 2 && v.from <= x + h / 2,
      );
      const contactOD = Math.max(...touched.map((v) => v.contactOD));
      const sections = p.sections.filter(
        (s) =>
          s.to >= Math.max(p.bitMD - p.length, md - h / 2) &&
          s.from <= Math.min(p.bitMD, md + h / 2),
      );
      if (!sections.length) throw Error("Architecture does not cover beam");
      const hole = Math.min(
        holeAt(p.sections, md),
        ...sections.map((s) => s.diameter),
      );
      const gap = (hole - contactOD) / 2;
      if (gap < 0)
        throw Error(
          "Interference at MD " +
            md.toFixed(2) +
            ": tool exceeds available bore",
        );
      const q =
        (b.mass - (p.rho * Math.PI * (b.od * b.od - b.id * b.id)) / 4) *
        G *
        Math.sin((p.inc * Math.PI) / 180);
      return { x, md, b, gap, hole, q, c: centers[i] };
    });
    const K = Array.from({ length: N }, () => Array(N).fill(0));
    for (let i = 1; i < N - 1; i++) {
      const a = (nodes[i].b.E * nodes[i].b.I) / h ** 3,
        ids = [i - 1, i, i + 1],
        v = [1, -2, 1];
      for (let j = 0; j < 3; j++)
        for (let k = 0; k < 3; k++) K[ids[j]][ids[k]] += a * v[j] * v[k];
    }
    for (let i = 0; i < N - 1; i++) {
      const a = -p.wobN / h;
      K[i][i] += a;
      K[i + 1][i + 1] += a;
      K[i][i + 1] -= a;
      K[i + 1][i] -= a;
    }
    // Cholesky certifies positive incremental stiffness in this discretized model.
    const L = Array.from({ length: m }, () => Array(m).fill(0));
    for (let i = 0; i < m; i++)
      for (let j = 0; j <= i; j++) {
        let a = K[i + 1][j + 1];
        for (let k = 0; k < j; k++) a -= L[i][k] * L[j][k];
        if (i === j) {
          if (a <= 1e-8)
            throw Error(
              "UNSTABLE LINEAR MODEL — compression reaches a buckling regime. No post-buckling shape is predicted. Reduce WOB or shorten the interval.",
            );
          L[i][j] = Math.sqrt(a);
        } else L[i][j] = a / L[j][j];
      }
    const u = nodes.map((n) => n.c.slice()),
      f = nodes.map((n, i) => [
        0,
        n.q * h * (i === 0 || i === N - 1 ? 0.5 : 1),
      ]);
    // Exact unconstrained solution supplies a fast starting point; then enforce stops.
    for (let d = 0; d < 2; d++) {
      const rhs = Array.from(
        { length: m },
        (_, j) =>
          f[j + 1][d] - K[j + 1][0] * u[0][d] - K[j + 1][N - 1] * u[N - 1][d],
      );
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < i; j++) rhs[i] -= L[i][j] * rhs[j];
        rhs[i] /= L[i][i];
      }
      for (let i = m - 1; i >= 0; i--) {
        for (let j = i + 1; j < m; j++) rhs[i] -= L[j][i] * rhs[j];
        rhs[i] /= L[i][i];
        u[i + 1][d] = rhs[i];
      }
    }
    for (let i = 1; i < N - 1; i++) {
      const c = nodes[i].c,
        r = Math.hypot(...u[i].map((v, d) => v - c[d]));
      if (r > nodes[i].gap)
        u[i] = u[i].map((v, d) => c[d] + ((v - c[d]) * nodes[i].gap) / r);
    }
    let residual = Infinity,
      iterations = 0;
    for (; iterations < 60000; iterations++) {
      for (let i = 1; i < N - 1; i++) {
        const v = f[i].slice();
        for (let j = Math.max(0, i - 2); j <= Math.min(N - 1, i + 2); j++)
          if (i !== j) for (let d = 0; d < 2; d++) v[d] -= K[i][j] * u[j][d];
        for (let d = 0; d < 2; d++)
          v[d] = u[i][d] + 1.7 * (v[d] / K[i][i] - u[i][d]);
        const c = nodes[i].c,
          r = Math.hypot(v[0] - c[0], v[1] - c[1]),
          fac = r > nodes[i].gap ? nodes[i].gap / r : 1;
        u[i] = v.map((v, d) => c[d] + (v - c[d]) * fac);
      }
      if (iterations % 100 === 0) {
        residual = 0;
        for (let i = 1; i < N - 1; i++) {
          const grad = [-f[i][0], -f[i][1]];
          for (let j = Math.max(0, i - 2); j <= Math.min(N - 1, i + 2); j++)
            for (let d = 0; d < 2; d++) grad[d] += K[i][j] * u[j][d];
          const v = u[i].map((v, d) => v - grad[d] / K[i][i]),
            c = nodes[i].c,
            r = Math.hypot(v[0] - c[0], v[1] - c[1]),
            fac = r > nodes[i].gap ? nodes[i].gap / r : 1;
          residual = Math.max(
            residual,
            Math.hypot(
              ...v.map((v, d) => (u[i][d] - c[d] - (v - c[d]) * fac) * K[i][i]),
            ),
          );
        }
        if (residual < 0.1) break;
      }
    }
    if (residual >= 0.1)
      throw Error(
        "Contact iteration did not converge; refine the case before interpreting results",
      );
    let twist = 0;
    const rows = nodes.map((n, i) => {
      const reaction = [-f[i][0], -f[i][1]];
      for (let j = Math.max(0, i - 2); j <= Math.min(N - 1, i + 2); j++)
        for (let d = 0; d < 2; d++) reaction[d] += K[i][j] * u[j][d];
      const curvature =
        i && i < N - 1
          ? Math.hypot(
              ...u[i].map(
                (v, d) => (u[i - 1][d] - 2 * v + u[i + 1][d]) / h ** 2,
              ),
            )
          : 0;
      if (i)
        twist +=
          (p.torqueNm * h) /
          (component((i - 0.5) * h).G * component((i - 0.5) * h).J);
      const offset = Math.hypot(u[i][0] - n.c[0], u[i][1] - n.c[1]);
      return {
        x: n.x,
        md: n.md,
        name: n.b.name,
        od: n.b.od,
        contactOD: n.hole - 2 * n.gap,
        hole: n.hole,
        center: n.c,
        u: u[i],
        offset,
        contact: i > 0 && i < N - 1 && offset >= n.gap - 1e-7,
        reactionVectorN: reaction,
        reactionN: Math.hypot(...reaction),
        momentNm: n.b.E * n.b.I * curvature,
        bendingPa: (n.b.E * curvature * n.b.od) / 2,
        twistRad: twist,
      };
    });
    if (
      rows
        .slice(1)
        .some(
          (r, i) =>
            Math.hypot(...r.u.map((v, d) => v - rows[i].u[d])) / h > 0.1,
        )
    )
      throw Error("Beam slope exceeds small-deflection model");
    return {
      rows,
      iterations,
      residualN: residual,
      maxOffset: Math.max(...rows.map((r) => r.offset)),
      maxBendingPa: Math.max(...rows.map((r) => r.bendingPa)),
      twistRad: twist,
      contacts: rows.filter((r) => r.contact).length,
      status: "PRELIMINARY STATIC / NOT A FIELD OPERATING WINDOW",
    };
  }
  const api = { solve, architecture, holeAt };
  if (typeof module !== "undefined") module.exports = api;
  root.BhaStatic = api;
})(typeof window === "undefined" ? globalThis : window);
