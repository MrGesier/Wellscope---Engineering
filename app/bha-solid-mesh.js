/* Display mesh swept over solved beam stations, not a solid finite-element solver. */
(function (root) {
  function frame(input, md) {
    let inc = input.inc,
      azi = 0,
      origin;
    if (input.survey) {
      const E = root.WellEngine || require("./engine"),
        stations = E.survey(input.survey);
      if (md < stations[0].md || md > stations.at(-1).md)
        throw Error("Survey does not cover the playback view");
      const r = E.interp(stations, md);
      inc = r.inc;
      azi = r.azi;
      origin = [r.n, r.e, r.tvd];
    }
    const i = (inc * Math.PI) / 180,
      a = (azi * Math.PI) / 180;
    const tangent = [
      Math.sin(i) * Math.cos(a),
      Math.sin(i) * Math.sin(a),
      Math.cos(i),
    ];
    return {
      origin: origin || tangent.map((v) => v * md),
      tangent,
      right: [-Math.sin(a), Math.cos(a), 0],
      low: [
        -Math.cos(i) * Math.cos(a),
        -Math.cos(i) * Math.sin(a),
        Math.sin(i),
      ],
    };
  }
  function world(f, p) {
    return f.origin.map(
      (v, j) => v - f.tangent[j] * p[0] + f.right[j] * p[1] + f.low[j] * p[2],
    );
  }
  function local(f, p) {
    const v = p.map((x, j) => x - f.origin[j]),
      dot = (a) => a.reduce((s, x, j) => s + x * v[j], 0);
    return [-dot(f.tangent), dot(f.right), dot(f.low)];
  }
  function at(rows, x) {
    if (x < rows[0].x - 1e-8 || x > rows.at(-1).x + 1e-8)
      throw Error("Mesh outside solved span");
    x = Math.max(rows[0].x, Math.min(rows.at(-1).x, x));
    let j = rows.findIndex((r) => r.x >= x);
    if (j <= 0) j = 1;
    const a = rows[j - 1],
      b = rows[j],
      t = (x - a.x) / (b.x - a.x),
      mix = (v, w) => v + (w - v) * t;
    return {
      x,
      u: a.u.map((v, i) => mix(v, b.u[i])),
      center: a.center.map((v, i) => mix(v, b.center[i])),
      bendingPa: mix(a.bendingPa, b.bendingPa),
      offset: mix(a.offset, b.offset),
      momentNm: mix(a.momentNm, b.momentNm),
    };
  }
  function build(input, result, sides = 12) {
    if (
      !result?.rows?.length ||
      !Number.isInteger(sides) ||
      sides < 6 ||
      sides > 32
    )
      throw Error(
        "A solved beam and 6–32 circumferential sectors are required",
      );
    const parts = [];
    let start = 0;
    input.components.forEach((c, index) => {
      const end = start + c.length;
      const xs = [
        start,
        end,
        start + Math.min(0.06, c.length / 8),
        end - Math.min(0.06, c.length / 8),
        ...result.rows.filter((r) => r.x > start && r.x < end).map((r) => r.x),
      ]
        .sort((a, b) => a - b)
        .filter((v, i, a) => !i || v - a[i - 1] > 1e-8);
      const bit = /\bbit\b/i.test(c.name) && !/sub|adapter/i.test(c.name),
        stabilizer = /stabil|reamer/i.test(c.name);
      const rings = xs.map((x) => {
        const r = at(result.rows, x),
          t = (x - start) / c.length;
        return Array.from({ length: sides }, (_, j) => {
          const a = (2 * Math.PI * j) / sides;
          let radius = c.od / 2;
          if (bit)
            radius =
              (c.od / 2 + ((c.contactOD - c.od) / 2) * Math.max(0, 1 - t)) *
              (t < 0.12 ? 0.8 + 1.6666667 * t : 1);
          else if (stabilizer && t > 0.12 && t < 0.88)
            radius += ((c.contactOD - c.od) / 2) * (j % 3 === 0 ? 1 : 0.12);
          else if (c.contactOD > c.od && t > 0.2 && t < 0.8)
            radius = c.contactOD / 2;
          if (!bit && (t < 0.02 || t > 0.98)) radius *= 0.92;
          return {
            p: [
              x,
              r.u[0] + radius * Math.cos(a),
              r.u[1] + radius * Math.sin(a),
            ],
            field: r,
            theta: a,
          };
        });
      });
      const faces = [];
      for (let i = 1; i < rings.length; i++)
        for (let j = 0; j < sides; j++) {
          const k = (j + 1) % sides,
            a = rings[i - 1][j],
            b = rings[i][j],
            c = rings[i][k],
            d = rings[i - 1][k];
          faces.push([a, b, c], [a, c, d]);
        }
      // End caps are rendering primitives; no solid element/stress interpretation.
      for (const ring of [rings[0], rings.at(-1)])
        for (let j = 1; j < sides - 1; j++)
          faces.push([ring[0], ring[j], ring[j + 1]]);
      parts.push({
        index,
        name: c.name,
        start,
        end,
        od: c.od,
        contactOD: c.contactOD,
        rings,
        faces,
      });
      start = end;
    });
    return {
      parts,
      sides,
      beamNodes: result.rows.length,
      beamElements: result.rows.length - 1,
      triangles: parts.reduce((n, p) => n + p.faces.length, 0),
    };
  }
  root.BhaSolidMesh = { at, build, frame, world, local };
  if (typeof module === "object") module.exports = root.BhaSolidMesh;
})(globalThis);
