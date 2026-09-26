/* Response-surface interpolation, not a beam/contact or bit-rock solver. */
(function (root) {
  const n = (v, name) => {
    if (typeof v !== "number" || !Number.isFinite(v))
      throw Error(name + " must be a finite number");
    return v;
  };
  function validate(d) {
    if (
      d?.schema !== "wellscope-directional-surface/1" ||
      !["SYNTHETIC", "EXTERNAL_MODEL"].includes(d.quality) ||
      !d.source?.trim() ||
      !d.bha?.trim() ||
      !d.revision?.trim()
    )
      throw Error(
        "Surface needs schema, quality, source, BHA identity and revision",
      );
    if (!Array.isArray(d.curves) || !d.curves.length || d.curves.length > 100)
      throw Error("Invalid response curves");
    for (const curve of d.curves) {
      if (
        !["rotating", "sliding", "rss"].includes(curve.mode) ||
        !Array.isArray(curve.rows) ||
        curve.rows.length < 2 ||
        curve.rows.length > 1000
      )
        throw Error("Invalid mode or WOB rows");
      let last = 0;
      for (const r of curve.rows) {
        for (const k of [
          "wobN",
          "passiveBuild",
          "passiveRight",
          "activeHigh",
          "activeRight",
        ])
          n(r[k], k);
        if (r.wobN <= last)
          throw Error("WOB knots must be positive and strictly increasing");
        last = r.wobN;
      }
    }
    if (new Set(d.curves.map((c) => c.mode)).size !== d.curves.length)
      throw Error("Duplicate mode");
    return d;
  }
  function demo() {
    return {
      schema: "wellscope-directional-surface/1",
      quality: "SYNTHETIC",
      source:
        "Original illustrative response coefficients; not fitted to field data",
      revision: "1",
      bha: "Fictional directional response families; independent of the project BHA",
      conditions:
        "Fixed hypothetical formation, inclination and gauge. Coefficients are not manufacturer ratings.",
      curves: ["rotating", "sliding", "rss"].map((mode) => ({
        mode,
        rows: [40, 70, 100, 130, 160, 190].map((w, i) => ({
          wobN: w * 1000,
          passiveBuild: [-0.7, -0.55, -0.35, -0.05, 0.3, 0.7][i],
          passiveRight: 0.12,
          activeHigh:
            mode === "rotating"
              ? 0
              : mode === "sliding"
                ? [3.9, 4.15, 4.35, 4.5, 4.6, 4.65][i]
                : [5.1, 4.9, 4.6, 4.2, 3.7, 3.1][i],
          activeRight: mode === "rotating" ? 0 : 0.32,
        })),
      })),
    };
  }
  function response(d, s) {
    validate(d);
    const c = d.curves.find((c) => c.mode === s.mode);
    if (!c) throw Error("No response surface for this mode");
    for (const k of ["wobN", "activation", "toolface", "inclination"])
      n(s[k], k);
    if (
      s.activation < 0 ||
      s.activation > 1 ||
      s.inclination < 0 ||
      s.inclination > 180
    )
      throw Error("Activation or inclination outside domain");
    if (s.wobN < c.rows[0].wobN || s.wobN > c.rows.at(-1).wobN)
      throw Error("WOB outside source domain; extrapolation is disabled");
    let i = c.rows.findIndex((r) => r.wobN >= s.wobN);
    if (i === 0) i = 1;
    const a = c.rows[i - 1],
      b = c.rows[i],
      t = (s.wobN - a.wobN) / (b.wobN - a.wobN),
      v = (k) => a[k] + t * (b[k] - a[k]);
    const angle = (s.toolface * Math.PI) / 180,
      activation = s.mode === "rotating" ? 0 : s.activation,
      high = v("activeHigh") * activation,
      right = v("activeRight") * activation;
    const build =
        v("passiveBuild") + high * Math.cos(angle) - right * Math.sin(angle),
      lateral =
        v("passiveRight") + high * Math.sin(angle) + right * Math.cos(angle),
      sin = Math.sin((s.inclination * Math.PI) / 180);
    return {
      wobN: s.wobN,
      build,
      right: lateral,
      dls: Math.hypot(build, lateral),
      turn: Math.abs(sin) < Math.sin(Math.PI / 180) ? null : lateral / sin,
      quality: d.quality,
      model: "DIRECTIONAL_RESPONSE_SURFACE",
      activation,
      toolface: s.toolface,
    };
  }
  const api = { validate, demo, response };
  root.DirectionalResponse = api;
  if (typeof module === "object") module.exports = api;
})(globalThis);
