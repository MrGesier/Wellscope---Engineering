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
  // Exact minimum-curvature arc within each measured survey interval. Linear
  // coordinate interpolation would create artificial bending at survey knots.
  function surveyAt(st, md) {
    if (md <= st[0].md) return { ...st[0] };
    if (md >= st.at(-1).md) return { ...st.at(-1) };
    let lo = 0,
      hi = st.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (st[mid].md <= md) lo = mid;
      else hi = mid;
    }
    const a = st[lo],
      b = st[hi],
      rad = Math.PI / 180,
      dir = (s) => [
        Math.sin(s.inc * rad) * Math.cos(s.azi * rad),
        Math.sin(s.inc * rad) * Math.sin(s.azi * rad),
        Math.cos(s.inc * rad),
      ],
      v = dir(a),
      end = dir(b),
      angle = Math.acos(Math.max(-1, Math.min(1, dot(v, end)))),
      length = b.md - a.md,
      t = (md - a.md) / length;
    if (angle < 1e-8)
      return {
        ...a,
        md,
        n: a.n + (md - a.md) * v[0],
        e: a.e + (md - a.md) * v[1],
        tvd: a.tvd + (md - a.md) * v[2],
      };
    const w = end.map((x, k) => (x - Math.cos(angle) * v[k]) / Math.sin(angle)),
      theta = t * angle,
      tangent = v.map((x, k) => Math.cos(theta) * x + Math.sin(theta) * w[k]),
      pos = [a.n, a.e, a.tvd].map(
        (x, k) =>
          x +
          (length / angle) *
            (Math.sin(theta) * v[k] + 2 * Math.sin(theta / 2) ** 2 * w[k]),
      );
    return {
      md,
      inc: Math.acos(Math.max(-1, Math.min(1, tangent[2]))) / rad,
      azi: (Math.atan2(tangent[1], tangent[0]) / rad + 360) % 360,
      n: pos[0],
      e: pos[1],
      tvd: pos[2],
    };
  }
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
    let count = Math.max(12, Math.ceil(depth / p.stepM));
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
    const parts = bha.elements;
    let stations = Array.from(
      { length: count + 1 },
      (_, i) => (i * depth) / count,
    );
    if (p.adaptive) {
      const fine = num(p.fineStepM ?? 1, "Local mesh step", 0.1, 2);
      // Anchors include architecture and component interfaces. Refine the
      // bottom 120 m; full-string joint resolution remains a separate scope.
      const anchors = [
        0,
        depth,
        Math.max(0, depth - 120),
        ...parts.flatMap((b) => [depth - b.start, depth - b.end]),
        ...p.sections.flatMap((s) => [s.from, s.to]),
      ].filter((x) => x >= 0 && x <= depth);
      for (const b of parts)
        if (b.jointSpacing)
          for (
            let x = 0;
            x <= Math.min(b.length, 120 - b.start);
            x += b.jointSpacing
          )
            for (const edge of [x, x + b.jointLength]) {
              const md = depth - b.start - edge;
              if (md > 0 && md < depth) anchors.push(md);
            }
      anchors.sort((a, b) => a - b);
      const unique = anchors.filter((x, i) => !i || x - anchors[i - 1] > 1e-6);
      stations = [0];
      for (let i = 1; i < unique.length; i++) {
        const lo = unique[i - 1],
          hi = unique[i],
          local = lo >= depth - 120 - 1e-6,
          step = local ? Math.min(fine, (hi - lo) / 3) : p.stepM,
          n = Math.ceil((hi - lo) / step);
        for (let j = 1; j <= n; j++) stations.push(lo + ((hi - lo) * j) / n);
      }
    }
    count = stations.length - 1;
    if (count > 2000)
      throw Error("More than 2000 adaptive intervals: increase mesh step");
    const h = depth / count;
    const nodes = stations.map((md, i) => {
      const left = i ? (md - stations[i - 1]) / 2 : 0,
        right = i < count ? (stations[i + 1] - md) / 2 : 0;
      const q = surveyAt(st, md),
        inc = (q.inc * Math.PI) / 180,
        a = (q.azi * Math.PI) / 180,
        x = depth - md;
      const b = parts.find((b) => x <= b.end + 1e-8) || parts.at(-1),
        touched = parts.filter(
          (b) => b.end >= x - right && b.start <= x + left,
        );
      const sections = p.sections.filter(
        (s) =>
          s.to >= Math.max(0, md - left) &&
          s.from <= Math.min(depth, md + right),
      );
      let contactOD = b.contactOD;
      for (const t of touched) {
        contactOD = Math.max(contactOD, t.contactOD);
        if (t.jointSpacing) {
          const jointLeft = Math.max(0, x - right - t.start),
            jointRight = Math.min(t.length, x + left - t.start);
          const joint =
            Math.ceil((jointLeft - t.jointLength) / t.jointSpacing) *
            t.jointSpacing;
          if (joint <= jointRight && joint + t.jointLength >= jointLeft)
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
          Math.min(x + left, t.end, depth) - Math.max(x - right, t.start, 0),
        );
        const area = (Math.PI * (t.od * t.od - t.id * t.id)) / 4,
          I = (Math.PI * (t.od ** 4 - t.id ** 4)) / 64;
        compliance += len / (t.E * I);
        weight += len * (t.mass - p.rho * area) * 9.80665;
        width += len;
      }
      return {
        md,
        cellWidth: left + right,
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
    for (let i = 1; i < N - 1; i++) {
      const l = nodes[i].md - nodes[i - 1].md,
        r = nodes[i + 1].md - nodes[i].md;
      term(
        [i - 1, i, i + 1],
        [1 / l, -1 / l - 1 / r, 1 / r],
        (nodes[i].EI * 2) / (l + r),
      );
    }
    for (let i = 0; i < N - 1; i++)
      term([i, i + 1], [-1, 1], p.tensionN / (nodes[i + 1].md - nodes[i].md));
    nodes.forEach((n, i) =>
      n.axes.forEach(
        (axis, d) => (f[2 * i + d] += n.weight * n.cellWidth * axis[2]),
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
    function checkResidual() {
      let value = 0;
      for (let i = 1; i < N - 1; i++) {
        const j = 2 * i,
          D = get(j, j),
          a = u[j] - gradient(j) / D,
          b = u[j + 1] - gradient(j + 1) / D,
          r = Math.hypot(a, b),
          scale = r > nodes[i].gap ? nodes[i].gap / r : 1;
        value = Math.max(
          value,
          D * Math.hypot(u[j] - a * scale, u[j + 1] - b * scale),
        );
      }
      return value;
    }
    // Projected Newton: retain tangent motion on active circular stops. The
    // contact multiplier contributes the curvature of the circular constraint.
    for (; iterations < 1000; iterations++) {
      residual = checkResidual();
      if (residual < 0.5) break;
      const grad = Array.from({ length: M }, (_, i) => gradient(i)),
        vars = [];
      for (let i = 1; i < N - 1; i++) {
        const j = 2 * i,
          gap = nodes[i].gap,
          r = Math.hypot(u[j], u[j + 1]);
        if (gap < 1e-12) continue;
        const nx = u[j] / (r || 1),
          ny = u[j + 1] / (r || 1),
          lambda = -(grad[j] * nx + grad[j + 1] * ny);
        if (r >= gap - 1e-9 && lambda > 0)
          vars.push({ j, b: [-ny, nx], penalty: lambda / gap });
        else
          vars.push({ j, b: [1, 0], penalty: 0 }, { j, b: [0, 1], penalty: 0 });
      }
      const nv = vars.length,
        R = Array.from({ length: nv }, () => new Float64Array(6)),
        rhs = new Float64Array(nv);
      for (let a = 0; a < nv; a++) {
        const va = vars[a];
        rhs[a] = -(grad[va.j] * va.b[0] + grad[va.j + 1] * va.b[1]);
        for (let b = Math.max(0, a - 5); b <= a; b++) {
          const vb = vars[b];
          let value = a === b ? va.penalty : 0;
          for (let d = 0; d < 2; d++)
            for (let e = 0; e < 2; e++)
              value += va.b[d] * get(va.j + d, vb.j + e) * vb.b[e];
          for (let k = Math.max(0, a - 5, b - 5); k < b; k++)
            value -= R[a][a - k] * R[b][b - k];
          if (a === b) {
            if (!(value > 0))
              throw Error("Reduced contact Hessian lost positive definiteness");
            R[a][0] = Math.sqrt(value);
          } else R[a][a - b] = value / R[b][0];
        }
      }
      const delta = new Float64Array(nv);
      for (let a = 0; a < nv; a++) {
        let v = rhs[a];
        for (let b = Math.max(0, a - 5); b < a; b++)
          v -= R[a][a - b] * delta[b];
        delta[a] = v / R[a][0];
      }
      for (let a = nv - 1; a >= 0; a--) {
        for (let b = a + 1; b < Math.min(nv, a + 6); b++)
          delta[a] -= R[b][b - a] * delta[b];
        delta[a] /= R[a][0];
      }
      const direction = new Float64Array(M);
      vars.forEach((v, a) => {
        direction[v.j] += v.b[0] * delta[a];
        direction[v.j + 1] += v.b[1] * delta[a];
      });
      const old = u.slice();
      let accepted = false;
      for (let trial = 0; trial < 35; trial++) {
        const alpha = 2 ** -trial;
        for (let j = start; j < end; j++) u[j] = old[j] + alpha * direction[j];
        for (let i = 1; i < N - 1; i++) project(i);
        const diff = u.map((v, j) => v - old[j]);
        let energy = 0,
          linear = 0;
        for (let j = start; j < end; j++) {
          linear += grad[j] * diff[j];
          for (
            let k = Math.max(start, j - band);
            k < Math.min(end, j + band + 1);
            k++
          )
            energy += 0.5 * diff[j] * get(j, k) * diff[k];
        }
        if (linear + energy <= 1e-4 * linear && linear < 0) {
          accepted = true;
          break;
        }
      }
      if (!accepted) {
        u.set(old);
        for (let sweep = 0; sweep < 20; sweep++)
          for (let i = 1; i < N - 1; i++) {
            const j = 2 * i,
              g0 = gradient(j),
              g1 = gradient(j + 1);
            u[j] -= g0 / get(j, j);
            u[j + 1] -= g1 / get(j + 1, j + 1);
            project(i);
          }
      }
    }
    residual = checkResidual();
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
                (2 *
                  ((positions[i + 1][k] - v) / (nodes[i + 1].md - n.md) -
                    (v - positions[i - 1][k]) / (n.md - nodes[i - 1].md))) /
                (nodes[i + 1].md - nodes[i - 1].md),
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
      if (Math.hypot(...delta) / (rows[i].md - rows[i - 1].md) > 0.1)
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
      minStepM: Math.min(...nodes.slice(1).map((n, i) => n.md - nodes[i].md)),
      maxStepM: Math.max(...nodes.slice(1).map((n, i) => n.md - nodes[i].md)),
      adaptive: !!p.adaptive,
      contacts: rows.filter((r) => r.contact).length,
      model:
        "Prescribed constant tension, frictionless wall, fixed survey-normal planes, centred end pins; no axial/torsional coupling or dynamics",
    };
  }
  root.StringContact = { prepare, solve, surveyAt };
  if (typeof module === "object") module.exports = root.StringContact;
})(globalThis);
