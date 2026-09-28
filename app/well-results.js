/* Presentation of a prepared study. No extrapolated bit/rock or directional law. */
(function (root) {
  const H = EngineeringCharts,
    esc = H.esc,
    E = WellEngine,
    D = DirectionalResponse;
  function geometry(p) {
    const st = E.survey(p.study.survey),
      rates = st
        .slice(1)
        .map((s, i) => ({ ...DirectionalPlanning.survey(st[i], s), md: s.md }));
    return `<article class="panel"><h3>Plan view · looking from above</h3><p>Local North/East from rotary table; target = planned endpoint. Not a map projection.</p>${H.svg([{ name: "Planned well", points: st.map((s) => ({ x: s.e, y: s.n })) }], { x: "East (m)", y: "North (m)", markers: false })}</article><article class="panel"><h3>Vertical section · true vertical depth</h3>${H.svg([{ name: "Planned well", points: st.map((s) => ({ x: Math.hypot(s.n, s.e), y: s.tvd })) }], { x: "Horizontal displacement (m)", y: "TVD from RT (m) ↓", depth: true, yMin: 0, markers: false })}</article><article class="panel"><h3>Trajectory requirement · build, drop and DLS</h3><p>Survey geometry, independent of the BHA response. Drop is shown as a positive magnitude.</p>${H.svg(
      ["build", "drop", "dls"].map((k) => ({
        name: k === "build" ? "Build rate" : k === "drop" ? "Drop rate" : "DLS",
        points: rates.map((r) => ({
          x: k === "build" ? Math.max(0, r[k]) : r[k],
          y: r.md,
        })),
      })),
      {
        x: "Rate (°/30 m)",
        y: "Measured depth (m) ↓",
        depth: true,
        xMin: 0,
        yMin: 0,
        markers: false,
      },
    )}</article>`;
  }
  function loads(report) {
    const rows = report.segments.flatMap((s) => s.rows),
      series = [
        ["pickupTf", "Pickup / pulling out", "#31566e"],
        ["slackoffTf", "Slackoff / running in", "#b77842"],
      ].map(([key, name, color]) => ({
        name,
        color,
        points: rows.map((r) => ({ x: r.values[key] ?? NaN, y: r.md })),
      }));
    const bound = (key, side, name) => ({
      name,
      color: "#a54e35",
      dash: "6 4",
      points: report.segments.flatMap((s) => [
        { x: s.interval.limits?.[key]?.[side] ?? NaN, y: s.interval.from },
        { x: s.interval.limits?.[key]?.[side] ?? NaN, y: s.interval.to },
        { x: NaN, y: NaN },
      ]),
    });
    series.push(
      bound("pickupTf", "max", "Pickup limit"),
      bound("slackoffTf", "min", "Slackoff minimum"),
    );
    return `<article class="panel wf-load-main"><h3>Hookload versus measured depth</h3><p>Pickup and slackoff on the same axes. Depth starts at surface; no invented load is drawn where calculation is unavailable. Off-bottom conditions.</p>${H.svg(series, { x: "Hookload (tf)", y: "Bit measured depth (m) ↓", depth: true, yMin: 0, markers: false })}</article><article class="panel"><h3>Surface rotating torque</h3>${H.svg([{ name: "Off-bottom torque", points: rows.map((r) => ({ x: r.values.torqueTfm ?? NaN, y: r.md })) }, bound("torqueTfm", "max", "Torque limit")], { x: "Torque (tf·m)", y: "Bit measured depth (m) ↓", depth: true, xMin: 0, yMin: 0, markers: false })}</article>`;
  }
  function directional(p, interval, md) {
    const d = interval?.response,
      plan = { ...p.plan, ...interval?.plan };
    if (!d)
      return "<p>No associated BHA response: import a source response in formation settings. Survey DLS is not a predicted BHA response.</p>";
    if (
      BhaQuick.identity(d.study) !== BhaQuick.identity(p.study) ||
      d.rpm !== plan.rpm ||
      d.flowLpm !== plan.flowLpm ||
      d.mudKgM3 !== plan.mudKgM3
    )
      return "<p>Associated response does not match this BHA or operating conditions. Re-associate it before using these curves.</p>";
    try {
      const settings = {
          ...d.settings,
          wobN: plan.wobTf * 9806.65,
          inclination: E.interp(E.survey(p.study.survey), md).inc,
        },
        up = DirectionalPlanning.sample(
          d.surface,
          { ...settings, toolface: 0 },
          12,
        ),
        down = DirectionalPlanning.sample(
          d.surface,
          { ...settings, toolface: 180 },
          12,
        ),
        actual = DirectionalPlanning.sample(d.surface, settings, 12);
      const limit = (name, value) =>
        Number.isFinite(value)
          ? [
              {
                name,
                color: "#a54e35",
                dash: "6 4",
                points: [up[0], up.at(-1)].map((r) => ({
                  x: r.wobN / 9806.65,
                  y: Math.max(0, value),
                })),
              },
            ]
          : [];
      return `<h3>Build / drop versus WOB · ${esc(interval.lithology)}</h3><p>${esc(d.surface.quality)} · ${esc(d.surface.source)}. Up/down compare toolface 0° / 180° at the same activation. The blank span from WOB 0 to the first source point is outside the response domain.</p>${H.svg(
        [
          {
            name: "Build · TF 0°",
            points: up.map((r) => ({
              x: r.wobN / 9806.65,
              y: Math.max(0, r.build),
            })),
            color: "#31566e",
          },
          {
            name: "Drop · TF 180°",
            points: down.map((r) => ({
              x: r.wobN / 9806.65,
              y: Math.max(0, -r.build),
            })),
            color: "#b77842",
          },
          ...limit("Build maximum", interval.limits?.build?.max),
          ...limit(
            "Drop maximum",
            Number.isFinite(interval.limits?.build?.min)
              ? -interval.limits.build.min
              : undefined,
          ),
        ],
        {
          x: "Weight on bit (tf)",
          y: "Build / drop magnitude (°/30 m)",
          xMin: 0,
          yMin: 0,
          markers: false,
        },
      )}<h3>DLS versus WOB · selected toolface ${settings.toolface}°</h3>${H.svg([{ name: "DLS", points: actual.map((r) => ({ x: r.wobN / 9806.65, y: r.dls })) }, ...limit("DLS maximum", interval.limits?.dls?.max)], { x: "Weight on bit (tf)", y: "DLS (°/30 m)", xMin: 0, yMin: 0, markers: false })}`;
    } catch (e) {
      return "<p>" + esc(e.message) + "</p>";
    }
  }
  function friction(p, md, mu) {
    if (!p.study.axial) throw Error("Supply axial load inputs first");
    if (!Number.isFinite(mu) || mu < 0 || mu > 1)
      throw Error("Open-hole friction must be between 0 and 1");
    const r = DrillingProgram.intervalAt(p.intervals, md),
      plan = { ...p.plan, ...r?.plan },
      a = structuredClone(p.study),
      b = structuredClone(p.study);
    for (const q of [a, b]) {
      q.rho = plan.mudKgM3;
      q.axial.rpm = plan.rpm;
    }
    b.axial.muOpen = mu;
    const before = BhaQuick.loads(a, md),
      after = BhaQuick.loads(b, md);
    if (before.status !== "CALCULATED" || after.status !== "CALCULATED")
      throw Error(
        before.error || after.error || "No load calculation at this depth",
      );
    const data = [
      [
        "Pickup (tf)",
        before.pickup.hookN / 9806.65,
        after.pickup.hookN / 9806.65,
      ],
      [
        "Slackoff (tf)",
        before.slackoff.hookN / 9806.65,
        after.slackoff.hookN / 9806.65,
      ],
      [
        "Torque (tf·m)",
        before.rotating?.torqueNm / 9806.65,
        after.rotating?.torqueNm / 9806.65,
      ],
    ];
    return `<p>MD ${md.toFixed(0)} m · open-hole μ ${a.axial.muOpen} → ${mu}; cased-hole μ stays ${a.axial.muCased}. Comparison only: the prepared study is unchanged.</p><table><thead><tr><th>Output</th><th>Reference</th><th>Trial</th><th>Change</th></tr></thead><tbody>${data.map(([label, x, y]) => `<tr><td>${label}</td><td>${Number.isFinite(x) ? x.toFixed(2) : "Unknown"}</td><td>${Number.isFinite(y) ? y.toFixed(2) : "Unknown"}</td><td>${Number.isFinite(y - x) ? (y - x).toFixed(2) : "Unknown"}</td></tr>`).join("")}</tbody></table>${H.svg(
      [
        {
          name: "Pickup",
          points: data
            .slice(0, 1)
            .map((v) => ({ x: a.axial.muOpen, y: v[1] }))
            .concat([{ x: mu, y: data[0][2] }]),
        },
        {
          name: "Slackoff",
          points: [
            { x: a.axial.muOpen, y: data[1][1] },
            { x: mu, y: data[1][2] },
          ],
        },
      ],
      {
        x: "Open-hole friction coefficient μ",
        y: "Hookload (tf)",
        pointsOnly: true,
      },
    )}<p>Two independently calculated cases; points are not a continuous friction law. Transverse contact count comes from the separate 3D screening model.</p>`;
  }
  root.WellResults = { geometry, loads, directional, friction };
})(globalThis);
