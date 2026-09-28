(function (root) {
  const E = root.WellEngine || require("./engine"),
    H = root.EngineeringCharts || require("./engineering-charts");
  function svg(p, md, rows = E.survey(p.study.survey)) {
    const td = rows.at(-1).md,
      W = 520,
      T = 30,
      B = 410,
      y = (d) => T + (d / td) * (B - T),
      max = Math.max(1, ...rows.map((r) => Math.hypot(r.n, r.e))),
      x = (r) => 130 + (Math.hypot(r.n, r.e) / max) * 310;
    const palette = ["#b86547", "#d9a17b", "#86614d", "#e5c7a0", "#a78060"];
    const bands = p.intervals
      .map(
        (r, i) =>
          `<g role="button" tabindex="0" data-section-md="${(r.from + r.to) / 2}" aria-label="${H.esc(r.lithology)} ${r.from} to ${r.to} metres"><rect x="70" y="${y(r.from)}" width="420" height="${Math.max(1, y(r.to) - y(r.from))}" fill="${palette[i % palette.length]}" opacity=".70"/><path d="M70 ${y(r.from)}H490" stroke="#725441" stroke-width="1"/><text x="82" y="${y(r.from) + 14}" font-size="10" fill="#392b24">${H.esc(r.lithology)}</text></g>`,
      )
      .join("");
    const line = rows
        .map((r, i) => `${i ? "L" : "M"}${x(r)} ${y(r.md)}`)
        .join(" "),
      point = E.interp(rows, Math.max(0, Math.min(td, md)));
    return `<svg viewBox="0 0 ${W} 455" role="img" aria-label="Lithology and trajectory along measured depth"><rect x="70" y="${T}" width="420" height="${B - T}" rx="4" fill="#eee3d6"/>${bands}<path d="${line}" fill="none" stroke="#fffaf4" stroke-width="10"/><path d="${line}" fill="none" stroke="#4a3930" stroke-width="4"/><path d="M60 ${y(md)}H500" stroke="#7c321e" stroke-dasharray="5 3"/><circle cx="${x(point)}" cy="${y(md)}" r="7" fill="#ad4f32" stroke="white" stroke-width="2"/>${[0, 0.25, 0.5, 0.75, 1].map((f) => `<text x="55" y="${y(td * f) + 4}" text-anchor="end" font-size="11" fill="#604f43">${Math.round(td * f)}</text>`).join("")}<text x="70" y="440" font-size="11" fill="#604f43">MD (m) · projected trajectory / interpreted intervals</text></svg>`;
  }
  root.WellSynoptic = { svg };
  if (typeof module === "object") module.exports = root.WellSynoptic;
})(globalThis);
