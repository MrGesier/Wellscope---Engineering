(function (root) {
  function station(rows, md) {
    let lo = 0,
      hi = rows.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (rows[m].md <= md) lo = m;
      else hi = m;
    }
    const a = rows[lo],
      b = rows[hi],
      t = Math.max(0, Math.min(1, (md - a.md) / (b.md - a.md))),
      lerp = (x, y) => x * (1 - t) + y * t;
    return {
      md,
      center: a.center.map((v, k) => lerp(v, b.center[k])),
      position: a.position.map((v, k) => lerp(v, b.position[k])),
      axes: a.axes,
      bendingPa: lerp(a.bendingPa || 0, b.bendingPa || 0),
      offset: lerp(a.offset, b.offset),
    };
  }
  function mesh(input, result, from, to, scale = 20) {
    const survey = root.WellEngine.survey(input.survey),
      reference = root.StringContact.surveyAt(survey, (from + to) / 2),
      origin = [reference.n, reference.e, reference.tvd];
    const convert = (p) => [
      p[1] - origin[1],
      -(p[2] - origin[2]),
      p[0] - origin[0],
    ];
    const point = (md, r, t, deformed = true) => {
      let s = station(result.rows, md);
      if (!deformed) {
        const q = root.StringContact.surveyAt(survey, md),
          inc = (q.inc * Math.PI) / 180,
          a = (q.azi * Math.PI) / 180;
        s = {
          center: [q.n, q.e, q.tvd],
          axes: [
            [-Math.sin(a), Math.cos(a), 0],
            [
              -Math.cos(inc) * Math.cos(a),
              -Math.cos(inc) * Math.sin(a),
              Math.sin(inc),
            ],
          ],
        };
      }
      return convert(
        s.center.map(
          (v, k) =>
            v +
            scale *
              ((deformed ? s.position[k] - v : 0) +
                r * (Math.cos(t) * s.axes[0][k] + Math.sin(t) * s.axes[1][k])),
        ),
      );
    };
    function tube(
      stations,
      radius,
      deformed,
      sectors = 16,
      start = 0,
      angle = 2 * Math.PI,
    ) {
      const positions = [],
        indices = [],
        values = [];
      for (const md of stations) {
        for (let k = 0; k <= sectors; k++) {
          const t = start + (angle * k) / sectors;
          positions.push(...point(md, radius(md, t), t, deformed));
          values.push(station(result.rows, md).bendingPa);
        }
      }
      for (let j = 1; j < stations.length; j++)
        for (let k = 0; k < sectors; k++) {
          const a = (j - 1) * (sectors + 1) + k,
            b = a + sectors + 1;
          indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      return { positions, indices, values };
    }
    const parts = [];
    for (const [index, b] of result.parts.entries()) {
      const lo = Math.max(from, input.bitMD - b.end, 0),
        hi = Math.min(to, input.bitMD - b.start);
      if (hi <= lo) continue;
      const stations = [
        lo,
        hi,
        ...result.rows.filter((r) => r.md > lo && r.md < hi).map((r) => r.md),
      ];
      const n = Math.min(160, Math.max(8, Math.ceil((hi - lo) / 2)));
      for (let j = 1; j < n; j++) stations.push(lo + ((hi - lo) * j) / n);
      if (b.jointSpacing)
        for (
          let x = Math.max(
            0,
            Math.floor((input.bitMD - hi - b.start) / b.jointSpacing) *
              b.jointSpacing,
          );
          x < b.length && input.bitMD - b.start - x >= lo;
          x += b.jointSpacing
        )
          for (const e of [x, x + b.jointLength])
            for (const delta of [-0.005, 0.005]) {
              const md = input.bitMD - b.start - e + delta;
              if (md > lo && md < hi) stations.push(md);
            }
      stations.sort((a, b) => a - b);
      const unique = stations.filter(
        (x, i) => !i || x - stations[i - 1] > 1e-6,
      );
      const radius = (md, t) => {
        const x = input.bitMD - md - b.start,
          f = x / b.length,
          type = b.family || b.type || "",
          body = b.od / 2,
          contact = b.contactOD / 2;
        let r = body;
        if (b.jointSpacing && x % b.jointSpacing <= b.jointLength)
          r = b.jointOD / 2;
        if (/stab|rss/.test(type))
          r =
            body * 0.82 +
            (contact - body * 0.82) * Math.max(0, Math.cos(3 * t + x));
        if (/^(pdc-bit|tricone|bit)$/.test(type))
          r =
            body *
            (0.5 + 0.5 * Math.sin(Math.PI * Math.max(0, Math.min(1, f)))) *
            (0.9 + 0.1 * Math.cos(6 * t));
        if (/jar|accelerator|mwd|lwd/.test(type) && f % 0.2 < 0.035) r *= 0.9;
        return r;
      };
      const solid = tube(unique, radius, true);
      for (const md of [lo, hi]) {
        const start = solid.positions.length / 3,
          isBit = /^(pdc-bit|tricone|bit)$/.test(b.family || b.type || "");
        for (let k = 0; k <= 16; k++) {
          const t = (k * Math.PI) / 8;
          solid.positions.push(
            ...point(md, radius(md, t), t),
            ...point(
              md,
              isBit ? 0 : Math.min(b.id / 2, radius(md, t) * 0.95),
              t,
            ),
          );
          solid.values.push(
            station(result.rows, md).bendingPa,
            station(result.rows, md).bendingPa,
          );
        }
        for (let k = 0; k < 16; k++) {
          const a = start + k * 2;
          solid.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      parts.push({ index, name: b.name, ...solid });
    }
    const bores = [];
    for (const s of input.sections) {
      const lo = Math.max(from, s.from),
        hi = Math.min(to, s.to);
      if (hi <= lo) continue;
      const n = Math.max(2, Math.ceil((hi - lo) / 2)),
        stations = Array.from(
          { length: n + 1 },
          (_, i) => lo + ((hi - lo) * i) / n,
        );
      bores.push({
        kind: s.kind,
        full: tube(stations, () => s.diameter / 2, false),
        cut: tube(
          stations,
          () => s.diameter / 2,
          false,
          12,
          Math.PI / 4,
          Math.PI * 1.5,
        ),
      });
    }
    const nodes = result.rows
      .filter((r) => r.md >= from && r.md <= to)
      .map((r) => {
        const u = r.position.reduce(
            (s, v, k) => s + (v - r.center[k]) * r.axes[0][k],
            0,
          ),
          v = r.position.reduce(
            (s, v, k) => s + (v - r.center[k]) * r.axes[1][k],
            0,
          );
        return {
          ...r,
          point: point(r.md, r.contact ? r.contactOD / 2 : 0, Math.atan2(v, u)),
          centerPoint: point(r.md, 0, 0),
        };
      });
    return { parts, bores, nodes, origin, from, to, scale };
  }
  root.StringGeometry = { station, mesh };
  if (typeof module === "object") module.exports = root.StringGeometry;
})(globalThis);
