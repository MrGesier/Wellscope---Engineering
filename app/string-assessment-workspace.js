(() => {
  const $ = (id) => document.getElementById(id),
    esc = EngineeringCharts.esc,
    fmt = (x, n = 2) => (x == null ? "Not evaluated" : x.toFixed(n)),
    box = document.createElement("section");
  box.id = "sa-workspace";
  box.className = "panel";
  box.innerHTML = `<h3>Combined mechanics · calculated assessment</h3><p>Axial wall force + hydrostatic pressure + torsion + sampled bending. Equivalent uniform tube estimates are displayed for inspection; only explicitly declared tube bodies with sourced yield and design factor receive a utilization check. End supports and stencils spanning component interfaces are omitted from combined stress.</p><button id="sa-demo-material">Calculate synthetic material assumptions (ν = 0.30, G derived from E)</button><p id="sa-material-note"></p><p id="sa-status" role="status"></p><div id="sa-kpis" class="formgrid"></div><div id="sa-graph"></div><div style="overflow:auto"><table id="sa-table"></table></div><p id="sa-local"></p><button id="sa-export" disabled>Export mechanical assessment JSON</button><details><summary>Missing inputs and calculation scope</summary><div id="sa-coverage"></div><p>Twist and extension are uniform-section elastic estimates (no thermal strain, geometric shortening or connection compliance). G and Poisson ratio must be entered in Selected component: sourced limits. Contact reaction per metre is a mesh-dependent load density, not contact pressure. Power is mechanical, not engine or hydraulic input power. No fatigue life, connection stress concentration, post-buckling, whirl or wear is predicted.</p></details>`;
  $("sd-workspace").after(box);
  const style = document.createElement("style");
  style.textContent =
    "#sa-workspace{margin:20px 0}#sa-workspace td,#sa-workspace th{padding:10px;text-align:left;border-bottom:1px solid #dce3e7}#sa-workspace button{padding:9px;border:1px solid #b9cbd4;border-radius:5px;background:white;color:#274453;cursor:pointer}#sa-workspace svg text{fill:#304c5e;font-family:inherit}#sa-kpis>div{padding:12px;background:#f3f5f6}";
  document.head.append(style);
  let result = null,
    key = "",
    current;
  function graph(a, depth) {
    const valid = a.rows.filter((n) => n.combined);
    if (!valid.length) {
      $("sa-graph").textContent =
        "No combined-stress profile. Enable distributed loads and refine to obtain interior beam stations.";
      return;
    }
    const max = Math.max(
        1,
        ...valid.map((n) => n.combined.vonMisesPa / 1e6),
        ...a.checks.map((c) => c.limit / 1e6),
      ),
      x = (v) => 70 + (650 * v) / max,
      y = (md) => 45 + (320 * md) / depth;
    let paths = "",
      prior = null;
    for (const n of a.rows) {
      if (n.combined && prior?.combined && n.component === prior.component)
        paths += `<path d="M${x(prior.combined.vonMisesPa / 1e6)},${y(prior.md)}L${x(n.combined.vonMisesPa / 1e6)},${y(n.md)}" stroke="#345b70" stroke-width="2"/>`;
      if (n.utilization != null)
        paths += `<circle cx="${x(n.combined.vonMisesPa / 1e6)}" cy="${y(n.md)}" r="${n.utilization > 1 ? 3 : 1.5}" fill="${n.utilization > 1 ? "#b34231" : "#345b70"}"/>`;
      prior = n;
    }
    $("sa-graph").innerHTML =
      `<svg viewBox="0 0 780 420" style="width:100%;max-height:470px" role="img" aria-label="Combined equivalent tube von Mises stress in MPa versus measured depth, gaps are unassessed stations"><text x="70" y="18">Equivalent combined von Mises (MPa) · red: supplied tube limit exceeded</text>${Array.from({ length: 5 }, (_, i) => `<path d="M${x((max * i) / 4)},45v320 M70,${y((depth * i) / 4)}h650" stroke="#dce3e7"/><text x="${x((max * i) / 4)}" y="35" text-anchor="middle" font-size="11">${((max * i) / 4).toFixed(1)}</text><text x="62" y="${y((depth * i) / 4) + 4}" text-anchor="end" font-size="11">${((depth * i) / 4).toFixed(0)}</text>`).join("")}${paths}<text x="70" y="395">Measured depth (m) ↓ · gaps are unassessed; refine before interpreting peaks</text></svg>`;
  }
  function render(state) {
    current = state;
    $("sa-demo-material").disabled = state.input.quality !== "SYNTHETIC";
    $("sa-material-note").textContent = state.input.components.some((b) =>
      b.materialSource?.startsWith("SYNTHETIC"),
    )
      ? "Synthetic material assumptions are recorded in the exported inputs. Existing supplied properties are preserved. No manufacturer ratings are invented."
      : "For the synthetic example only: fill missing elastic properties and enable a labelled load case. Real studies require supplied material data.";
    const nextKey = JSON.stringify(state.input);
    if (!state.result) {
      result = null;
      key = "";
      $("sa-status").textContent = "No current solution.";
      for (const id of [
        "sa-kpis",
        "sa-graph",
        "sa-table",
        "sa-coverage",
        "sa-local",
      ])
        $(id).innerHTML = "";
      $("sa-export").disabled = true;
      return;
    }
    if (key !== nextKey) {
      key = nextKey;
      result = StringAssessment.assess(state.input, state.result);
      const a = result;
      $("sa-status").textContent =
        `${state.input.quality} · ${a.status} · ${a.checks.length} sourced tube-body checks · ${a.excludedStations} stations without combined assessment. ${a.worst ? `Governing sampled tube: ${a.worst.name} at ${a.worst.md.toFixed(1)} m, utilization ${(a.worst.utilization * 100).toFixed(1)}%.` : "No sourced tube-body utilization available."} This is not a whole-assembly safe window.`;
      $("sa-kpis").innerHTML = [
        [
          "Surface rotary power (kW)",
          fmt(a.rotationalPowerW == null ? null : a.rotationalPowerW / 1000),
        ],
        [
          "Axial friction loss (kW)",
          fmt(
            a.axialFrictionPowerW == null ? null : a.axialFrictionPowerW / 1000,
          ),
        ],
        [
          "Rotational friction loss (kW)",
          fmt(
            a.rotationalFrictionPowerW == null
              ? null
              : a.rotationalFrictionPowerW / 1000,
          ),
        ],
        [
          "Equivalent elastic twist (°)",
          fmt(a.twistRad == null ? null : (a.twistRad * 180) / Math.PI),
        ],
        ["Equivalent elastic extension (m)", fmt(a.extensionM, 4)],
        [
          "Effective-force zero stations (m MD)",
          a.neutralMD.length
            ? a.neutralMD.slice(0, 8).join(", ") +
              (a.neutralMD.length > 8 ? " …" : "")
            : "None sampled / no distributed profile",
        ],
      ]
        .map(([l, v]) => `<div>${l}<br><b>${v}</b></div>`)
        .join("");
      $("sa-table").innerHTML =
        "<thead><tr><th>Component</th><th>Equivalent VM max (MPa)</th><th>Moment max (tf.m)</th><th>Tube utilization</th><th>Interior samples</th></tr></thead><tbody>" +
        a.components
          .map(
            (c) =>
              `<tr><td><button data-sa-part="${c.index}">${esc(c.name)}</button></td><td>${fmt(c.maxVonMisesPa == null ? null : c.maxVonMisesPa / 1e6)}</td><td>${fmt(c.maxMomentNm == null ? null : c.maxMomentNm / 9806.65, 3)}</td><td>${c.maxUtilization == null ? "Unknown" : (100 * c.maxUtilization).toFixed(1) + "%"}</td><td>${c.samples}</td></tr>`,
          )
          .join("") +
        "</tbody>";
      $("sa-table")
        .querySelectorAll("button")
        .forEach(
          (b) => (b.onclick = () => StringInHole.select(+b.dataset.saPart)),
        );
      $("sa-coverage").innerHTML =
        `<ul>${a.coverage.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p>Missing G: ${a.missingG.length ? esc(a.missingG.join(", ")) : "none in occupied string"}<br>Missing Poisson ratio: ${a.missingNu.length ? esc(a.missingNu.join(", ")) : "none in occupied string"}</p><p>${esc(a.neutralNote)}. ${esc(a.scope)}</p>`;
      graph(a, state.input.bitMD);
      $("sa-export").disabled = false;
    }
    const n = result.rows.reduce((a, b) =>
      Math.abs(b.md - state.inspectMD) < Math.abs(a.md - state.inspectMD)
        ? b
        : a,
    );
    $("sa-local").textContent =
      `Inspected station ${n.md.toFixed(2)} m MD · ${n.name} · moment ${fmt(n.momentNm == null ? null : n.momentNm / 9806.65, 3)} tf.m · combined ${fmt(n.combined?.vonMisesPa == null ? null : n.combined.vonMisesPa / 1e6)} MPa · wall reaction density ${fmt(n.contactNperM == null ? null : n.contactNperM / 9806.65, 4)} tf/m. Equivalent body values; not local contact stress.`;
  }
  $("sa-demo-material").onclick = () => {
    const p = StringInHole.snapshot().input;
    if (p.quality !== "SYNTHETIC") return;
    for (const b of p.components) {
      if (b.G == null || b.nu == null) {
        b.nu ??= 0.3;
        b.G ??= b.E / (2 * (1 + b.nu));
        b.materialSource =
          "SYNTHETIC isotropic equivalent: missing nu=0.30; missing G=E/(2(1+nu)). Not manufacturer data.";
      }
    }
    p.axial ??= {
      mode: "soft-string",
      source: "SYNTHETIC pickup sensitivity",
      stepM: 5,
      muOpen: 0.3,
      muCased: 0.2,
      bottomForceN: 0,
      bottomTorqueNm: 0,
      axialSpeedMps: 0.1,
      rpm: 60,
      blockN: 32 * 9806.65,
    };
    StringInHole.applyStudy(p);
  };
  $("sa-export").onclick = () => {
    if (!result) return;
    const url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              {
                schema: "wellscope-mechanical-assessment/1",
                input: current.input,
                assessment: result,
              },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "wellscope-mechanical-assessment.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  window.addEventListener("string-shape-update", (e) => render(e.detail));
  render(StringInHole.snapshot());
})();
