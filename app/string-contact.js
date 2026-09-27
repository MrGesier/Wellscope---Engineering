/* Preliminary whole-string transverse beam. Prescribed constant axial tension,
   fixed survey-normal planes, centred end pins and frictionless circular stops. */
(function (root) {
  const E = root.WellEngine || require("./engine"),
    A = root.BhaStatic || require("./bha-static");
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
    num = (v, name, lo, hi = Infinity) => {
      if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi)
        throw Error(name + " outside declared range");
      return v;
    };
  function prepare(p) {
    if (!p.source?.trim() || !["SYNTHETIC", "USER_ENTERED"].includes(p.quality))
      throw Error("Declare source and quality");
    const st = E.survey(p.survey),
      bha = E.normalizeBha(p.components);
    A.architecture(p.sections);
    const depth = num(
      p.bitMD,
      "Bit MD",
      1,
      Math.min(st.at(-1).md, p.sections.at(-1).to, bha.totalLength),
    );
    if (st[0].md !== 0) throw Error("Survey must begin at surface MD 0");
    num(p.stepM, "Mesh step", 1, 20);
    num(p.tensionN, "Prescribed constant tension", -1e7, 1e7);
    num(p.rho, "Mud density", 0, 3000);
    const count = Math.max(12, Math.ceil(depth / p.stepM));
    if (count > 1000)
      throw Error("More than 1000 beam intervals: increase mesh step");
    for (const b of bha.elements) {
      num(b.E, "Equivalent Young modulus", 1e6, 1e13);
      num(b.contactOD, "Contact OD", b.od);
      if (!b.source?.trim()) throw Error("Component source required");
      if (b.jointSpacing != null) {
        num(b.jointSpacing, "Joint spacing", 0.5, 30);
        num(b.jointLength, "Joint length", 0.01, b.jointSpacing / 2);
        num(b.jointOD, "Joint OD", b.od);
      }
      // Check every occupied component/architecture overlap, even below mesh resolution.
      for (const s of p.sections) {
        if (
          Math.min(depth - b.start, s.to) - Math.max(0, depth - b.end, s.from) >
            1e-8 &&
          Math.max(b.contactOD, b.jointOD || 0) > s.diameter + 1e-9
        )
          throw Error(
            "INTERFERENCE: " +
              b.name +
              " exceeds " +
              s.kind +
              " bore near MD " +
              Math.max(0, depth - b.end, s.from).toFixed(2),
          );
      }
    }
    const h = depth / count,
      parts = bha.elements;
    const nodes = Array.from({ length: count + 1 }, (_, i) => {
      const md = i * h,
        q = E.interp(st, md),
        inc = (q.inc * Math.PI) / 180,
        a = (q.azi * Math.PI) / 180,
        x = depth - md;
      const b = parts.find((b) => x <= b.end + 1e-8) || parts.at(-1),
        touched = parts.filter(
          (b) => b.end >= x - h / 2 && b.start <= x + h / 2,
        );
      const sections = p.sections.filter(
        (s) =>
          s.to >= Math.max(0, md - h / 2) &&
          s.from <= Math.min(depth, md + h / 2),
      );
      let contactOD = b.contactOD;
      for (const t of touched) {
        contactOD = Math.max(contactOD, t.contactOD);
        if (t.jointSpacing) {
          const left = Math.max(0, x - h / 2 - t.start),
            right = Math.min(t.length, x + h / 2 - t.start);
          const joint =
            Math.ceil((left - t.jointLength) / t.jointSpacing) * t.jointSpacing;
          if (joint <= right && joint + t.jointLength >= left)
            contactOD = Math.max(contactOD, t.jointOD);
        }
      }
      const hole = Math.min(...sections.map((s) => s.diameter));
      // Cell harmonic EI for equivalent pieces crossed by the uniform mesh.
      let compliance = 0,
        weight = 0,
        width = 0;
      for (const t of touched) {
        const len = Math.max(
          0,
          Math.min(x + h / 2, t.end, depth) - Math.max(x - h / 2, t.start, 0),
        );
        const area = (Math.PI * (t.od * t.od - t.id * t.id)) / 4,
          I = (Math.PI * (t.od ** 4 - t.id ** 4)) / 64;
        compliance += len / (t.E * I);
        weight += len * (t.mass - p.rho * area) * 9.80665;
        width += len;
      }
      return {
        md,
        x,
        b,
        center: [q.n, q.e, q.tvd],
        axes: [
          [-Math.sin(a), Math.cos(a), 0],
          [
            -Math.cos(inc) * Math.cos(a),
            -Math.cos(inc) * Math.sin(a),
            Math.sin(inc),
          ],
        ],
        hole,
        contactOD,
        gap: Math.max(0, (hole - contactOD) / 2),
        EI: width / compliance,
        weight: weight / width,
      };
    });
    return { nodes, h, parts, count };
  }
  function solve(p) {
    const { nodes, h, parts, count } = prepare(p),
      N = nodes.length,
      M = 2 * N,
      band = 5,
      K = Array.from({ length: M }, () => new Float64Array(11)),
      f = new Float64Array(M);
    const get = (i, j) => (Math.abs(i - j) > band ? 0 : K[i][j - i + band]);
    const add = (i, j, v) => {
      K[i][j - i + band] += v;
    };
    function term(ids, coeff, weight) {
      const c = [0, 0, 0];
      ids.forEach((id, k) =>
        nodes[id].center.forEach((v, d) => (c[d] += coeff[k] * v)),
      );
      ids.forEach((i, a) => {
        for (let d = 0; d < 2; d++) {
          f[2 * i + d] -= weight * coeff[a] * dot(nodes[i].axes[d], c);
          ids.forEach((j, b) => {
            for (let e = 0; e < 2; e++)
              add(
                2 * i + d,
                2 * j + e,
                weight *
                  coeff[a] *
                  coeff[b] *
                  dot(nodes[i].axes[d], nodes[j].axes[e]),
              );
          });
        }
      });
    }
    for (let i = 1; i < N - 1; i++)
      term([i - 1, i, i + 1], [1, -2, 1], nodes[i].EI / h ** 3);
    for (let i = 0; i < N - 1; i++) term([i, i + 1], [-1, 1], p.tensionN / h);
    nodes.forEach((n, i) =>
      n.axes.forEach(
        (axis, d) =>
          (f[2 * i + d] +=
            n.weight * h * (i === 0 || i === N - 1 ? 0.5 : 1) * axis[2]),
      ),
    );
    const start = 2,
      end = M - 2,
      L = Array.from({ length: M }, () => new Float64Array(6));
    for (let i = start; i < end; i++)
      for (let j = Math.max(start, i - band); j <= i; j++) {
        let a = get(i, j);
        for (let k = Math.max(start, i - band, j - band); k < j; k++)
          a -= L[i][i - k] * L[j][j - k];
        if (i === j) {
          if (!(a > 1e-9))
            throw Error(
              "UNSTABLE transverse model: compression or mechanism; no post-buckling solution",
            );
          L[i][0] = Math.sqrt(a);
        } else L[i][i - j] = a / L[j][0];
      }
    const u = new Float64Array(M);
    for (let i = start; i < end; i++) {
      let a = f[i];
      for (let j = Math.max(start, i - band); j < i; j++)
        a -= L[i][i - j] * u[j];
      u[i] = a / L[i][0];
    }
    for (let i = end - 1; i >= start; i--) {
      for (let j = i + 1; j < Math.min(end, i + band + 1); j++)
        u[i] -= L[j][j - i] * u[j];
      u[i] /= L[i][0];
    }
    const project = (i) => {
      const r = Math.hypot(u[2 * i], u[2 * i + 1]),
        gap = nodes[i].gap;
      if (r > gap) {
        u[2 * i] *= gap / r;
        u[2 * i + 1] *= gap / r;
      }
    };
    for (let i = 1; i < N - 1; i++) project(i);
    const gradient = (i) => {
      let a = -f[i];
      for (let j = Math.max(0, i - band); j < Math.min(M, i + band + 1); j++)
        a += get(i, j) * u[j];
      return a;
    };
    let residual = Infinity,
      iterations = 0;
    for (; iterations < 30000; iterations++) {
      for (let i = 1; i < N - 1; i++) {
        const j = 2 * i,
          g0 = gradient(j),
          g1 = gradient(j + 1);
        u[j] -= (1.4 * g0) / get(j, j);
        u[j + 1] -= (1.4 * g1) / get(j + 1, j + 1);
        project(i);
      }
      if (iterations % 50 === 0) {
        residual = 0;
        for (let i = 1; i < N - 1; i++) {
          const j = 2 * i,
            D = get(j, j),
            a = u[j] - gradient(j) / D,
            b = u[j + 1] - gradient(j + 1) / D,
            r = Math.hypot(a, b),
            scale = r > nodes[i].gap ? nodes[i].gap / r : 1;
          residual = Math.max(
            residual,
            D * Math.hypot(u[j] - a * scale, u[j + 1] - b * scale),
          );
        }
        if (residual < 0.5) break;
      }
    }
    if (residual >= 0.5)
      throw Error(
        "Contact equilibrium did not converge (residual " +
          residual.toFixed(2) +
          " N). No current shape; refine mesh/inputs.",
      );
    const positions = nodes.map((n, i) =>
      n.center.map(
        (v, k) => v + n.axes[0][k] * u[2 * i] + n.axes[1][k] * u[2 * i + 1],
      ),
    );
    const rows = nodes.map((n, i) => {
      const offset = Math.hypot(u[2 * i], u[2 * i + 1]),
        reaction = [gradient(2 * i), gradient(2 * i + 1)],
        pin = i === 0 || i === N - 1;
      const curvature = pin
        ? null
        : Math.hypot(
            ...positions[i].map(
              (v, k) =>
                (positions[i - 1][k] - 2 * v + positions[i + 1][k]) / h ** 2,
            ),
          );
      return {
        md: n.md,
        position: positions[i],
        center: n.center,
        axes: n.axes,
        component: parts.indexOf(n.b),
        offset,
        gap: n.gap,
        hole: n.hole,
        contactOD: n.contactOD,
        od: n.b.od,
        pin,
        contact:
          !pin && offset >= n.gap - 1e-7 && Math.hypot(...reaction) > 0.5,
        reactionN: Math.hypot(...reaction),
        reactionVector: reaction,
        curvature,
        bendingPa:
          curvature == null ? null : ((n.b.E * n.b.od) / 2) * curvature,
      };
    });
    for (let i = 1; i < N; i++) {
      const delta = rows[i].position.map(
        (v, k) =>
          v -
          rows[i].center[k] -
          (rows[i - 1].position[k] - rows[i - 1].center[k]),
      );
      if (Math.hypot(...delta) / h > 0.1)
        throw Error(
          "Transverse displacement slope exceeds small-deviation scope",
        );
    }
    return {
      status: "PRELIMINARY TRANSVERSE EQUILIBRIUM",
      rows,
      parts,
      iterations,
      residualN: residual,
      stepM: h,
      contacts: rows.filter((r) => r.contact).length,
      model:
        "Prescribed constant tension, frictionless wall, fixed survey-normal planes, centred end pins; no axial/torsional coupling or dynamics",
    };
  }
  root.StringContact = { prepare, solve };
  if (typeof module === "object") module.exports = root.StringContact;
})(globalThis);
