/* Shared engineering chart: explicit axes, depth-down tracks and sensitivity plots. */
(function (root) {
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const colors = ["#31566e", "#b77842", "#708896", "#8e8197", "#587d70"];
  function svg(series, opt = {}) {
    const all = series
      .flatMap((s) => s.points)
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (!all.length)
      return "<p>No numeric data within the declared domain.</p>";
    let x0 = Math.min(...all.map((p) => p.x)),
      x1 = Math.max(...all.map((p) => p.x)),
      y0 = Math.min(...all.map((p) => p.y)),
      y1 = Math.max(...all.map((p) => p.y));
    if (x0 === x1) {
      x0 -= 1;
      x1 += 1;
    }
    if (y0 === y1) {
      y0 -= 1;
      y1 += 1;
    }
    const px = (x1 - x0) * 0.06,
      py = (y1 - y0) * 0.08;
    x0 -= px;
    x1 += px;
    if (!opt.depth) {
      y0 -= py;
      y1 += py;
    }
    if (opt.equal) {
      const r = Math.max(
        Math.abs(x0),
        Math.abs(x1),
        Math.abs(y0),
        Math.abs(y1),
      );
      x0 = y0 = -r;
      x1 = y1 = r;
    }
    const w = 760,
      h = opt.depth ? 520 : 420,
      l = 82,
      r = 25,
      t = 82,
      b = 62,
      pw = w - l - r,
      ph = h - t - b;
    const side = opt.equal ? Math.min(pw, ph) : 0,
      ox = opt.equal ? l + (pw - side) / 2 : l,
      oy = t;
    const X = (x) => ox + ((x - x0) / (x1 - x0)) * (side || pw),
      Y = (y) =>
        oy +
        (opt.depth ? (y - y0) / (y1 - y0) : 1 - (y - y0) / (y1 - y0)) *
          (side || ph);
    const f = (v) => Number(v.toPrecision(4)).toLocaleString("en-US");
    let out = `<svg xmlns="http://www.w3.org/2000/svg" class="engineering-chart study-plot" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(opt.x)} versus ${esc(opt.y)}" data-depth-down="${!!opt.depth}"><rect width="760" height="${h}" fill="white"/><g font-family="Segoe UI,Arial,sans-serif" font-size="12" fill="#607789">`;
    for (let j = 0; j <= 5; j++) {
      const x = x0 + ((x1 - x0) * j) / 5,
        y = y0 + ((y1 - y0) * j) / 5;
      out += `<path d="M${X(x)} ${Y(y0)}V${Y(y1)}M${X(x0)} ${Y(y)}H${X(x1)}" fill="none" stroke="#dfe6eb"/><text x="${X(x)}" y="${opt.depth ? t - 12 : h - 36}" text-anchor="middle">${f(x)}</text><text x="${ox - 10}" y="${Y(y) + 4}" text-anchor="end">${f(y)}</text>`;
    }
    if (y0 < 0 && y1 > 0)
      out += `<path d="M${X(x0)} ${Y(0)}H${X(x1)}" stroke="#a3b3be" stroke-dasharray="4 4"/>`;
    out += `<text x="${w / 2}" y="${opt.depth ? 53 : h - 12}" text-anchor="middle">${esc(opt.x)}</text><text transform="translate(18 ${h / 2}) rotate(-90)" text-anchor="middle">${esc(opt.y)}</text>`;
    series.forEach((s, i) => {
      const color = colors[i % colors.length],
        points = s.points.filter(
          (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
        );
      out +=
        `<path d="M${24 + i * 185} 22h17" stroke="${color}" stroke-width="2"/><text x="${46 + i * 185}" y="26">${esc(s.name)}</text><polyline points="${points.map((p) => X(p.x) + "," + Y(p.y)).join(" ")}" fill="none" stroke="${color}" stroke-width="2"/>` +
        points
          .map(
            (p) =>
              `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="2.7" fill="white" stroke="${color}"><title>${esc(s.name)}: ${f(p.x)}, ${f(p.y)}</title></circle>`,
          )
          .join("");
    });
    if (
      opt.depth &&
      Number.isFinite(opt.depthMark) &&
      opt.depthMark >= y0 &&
      opt.depthMark <= y1
    )
      out += `<path d="M${X(x0)} ${Y(opt.depthMark)}H${X(x1)}" stroke="#b77842" stroke-dasharray="5 4"/><text x="${X(x1) - 4}" y="${Y(opt.depthMark) - 6}" text-anchor="end">Selected depth ${f(opt.depthMark)}</text>`;
    return out + "</g></svg>";
  }
  root.EngineeringCharts = { svg, esc };
  if (typeof module === "object") module.exports = root.EngineeringCharts;
})(globalThis);
