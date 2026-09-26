/* Operating envelopes with explicit source context and reduced-order model assumptions. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    esc = EngineeringCharts.esc,
    C = WellCore,
    M = OperatingWindows;
  let unit = "tf",
    draft = {},
    current = null;
  const F = () => unit,
    T = () => (unit === "klbf" ? "klbf.ft" : unit + ".m");
  const cv = (v, from, to) =>
    from === to
      ? v
      : from === "GPa"
        ? v * 1e9
        : to === "GPa"
          ? v / 1e9
          : C.convert(v, from, to);
  const fields = {
    mechanical: [
      ["od", "Selected pipe body OD", "m", "mm"],
      ["id", "Selected pipe body ID", "m", "mm"],
      ["yieldPa", "Body material yield stress", "Pa", "MPa"],
      ["designFactor", "Body design factor", "ratio", "ratio"],
      ["localTensionN", "Tension at selected pipe section", "N", "force"],
      ["torqueNm", "Torque at selected pipe section", "N.m", "torque"],
      [
        "connectionN",
        "Allowable connection tension (already derated)",
        "N",
        "force",
      ],
      [
        "connectionNm",
        "Allowable connection torque (already derated)",
        "N.m",
        "torque",
      ],
      ["hookN", "Current surface hookload (declared tare basis)", "N", "force"],
      ["rigN", "Allowable hookload on same tare basis", "N", "force"],
      ["surfaceTorqueNm", "Surface torque", "N.m", "torque"],
      ["driveNm", "Allowable surface drive torque", "N.m", "torque"],
    ],
    modal: [
      ["od", "Equivalent uniform section OD", "m", "mm"],
      ["id", "Equivalent uniform section ID", "m", "mm"],
      ["E", "Young modulus", "Pa", "GPa"],
      ["G", "Shear modulus", "Pa", "GPa"],
      ["rho", "Material density", "kg/m3", "kg/m3"],
      ["massPerM", "Lateral structural mass per metre", "kg/m", "kg/m"],
      ["addedMassPerM", "Lateral fluid added mass per metre", "kg/m", "kg/m"],
      ["span", "Pinned–pinned lateral effective span", "m", "m"],
      ["rodLength", "Fixed–free axial/torsional uniform rod length", "m", "m"],
    ],
    analysis: [
      ["rpmMin", "Minimum surface RPM", "rpm", "rpm"],
      ["rpmMax", "Maximum surface RPM", "rpm", "rpm"],
      ["wobMinN", "Minimum WOB", "N", "force"],
      ["wobMaxN", "Maximum WOB", "N", "force"],
      ["selectedRPM", "Inspect surface RPM", "rpm", "rpm"],
      ["selectedWobN", "Inspect WOB", "N", "force"],
      [
        "compressionFraction",
        "Span compression / WOB ratio (source required)",
        "ratio",
        "ratio",
      ],
      ["motorRPM", "Exciter speed offset above surface RPM", "rpm", "rpm"],
      ["order", "Excitation order / events per revolution", "ratio", "ratio"],
      [
        "margin",
        "Fractional exclusion around natural frequency",
        "ratio",
        "ratio",
      ],
      ["damping", "Lateral first-mode damping ratio", "ratio", "ratio"],
      [
        "modalForceN",
        "First-mode generalized harmonic force amplitude",
        "N",
        "force",
      ],
    ],
    directionalLimits: [
      ["buildMin", "Minimum build rate", "deg/30m", "deg/30m"],
      ["buildMax", "Maximum build rate", "deg/30m", "deg/30m"],
      ["dlsMax", "Maximum DLS", "deg/30m", "deg/30m"],
    ],
  };
  const du = (f) => (f[3] === "force" ? F() : f[3] === "torque" ? T() : f[3]),
    get = (g, k) => draft[g]?.[k],
    fmt = (v) =>
      Number.isFinite(v)
        ? v.toLocaleString("en-US", { maximumFractionDigits: 3 })
        : "Not evaluable";
  const page = document.createElement("section");
  page.id = "operating-windows";
  page.className = "page";
  page.innerHTML = `<div class="page-head"><div><div class="eyebrow">DESIGN REVIEW / OPERATING ENVELOPES</div><h1>Operating windows</h1><p>Identify governing constraints, inspect margins and record candidate settings.</p></div><label>Force / torque units<select id="window-unit"><option>tf</option><option>kN</option><option>klbf</option></select></label></div><div class="work-toolbar"><button id="window-example" class="smallbutton">Load fictional worked example</button><button id="window-load" class="smallbutton">Load latest saved study</button><label class="filebtn">Import study JSON<input id="window-import" type="file" accept=".json" hidden></label></div><article class="panel"><div class="workform"><label>Source / revision for dimensions, limits and assumptions<input id="window-source"></label><label>Well / run / depth / formation / gauge and tare basis<input id="window-context"></label><label>Evidence quality<select id="window-quality"><option value="USER_ENTERED">User-entered / unverified</option><option value="SYNTHETIC">Fictional example</option></select></label></div><p class="work-note">Independent design study: parameters below are not automatically synchronized with the current BHA. Enter the governing section and document the effective spans. Whole-string contact and all component limits are not solved here.</p></article><article class="panel"><h2>1 · Pull and torque limits</h2><p>Selected pipe-body von Mises envelope, connection caps and surface equipment headroom. Incremental overpull assumes an equal tension increment at the selected section, fixed torque and a consistent surface tare basis.</p><div class="workform" id="window-mechanical"></div></article><article class="panel"><h2>2 · Vibration model and operating domain</h2><p>Modes covering the study excitation range: uniform fixed–free axial/torsional rods and a uniform pinned–pinned lateral span under compression. Fluid added mass enters the lateral branch. These effective boundary conditions must be justified from the actual assembly.</p><div class="workform" id="window-modal"></div><h3>WOB–RPM sweep and excitation</h3><div class="workform" id="window-analysis"></div><p class="work-note">Excitation frequency = order × (surface RPM + speed offset) / 60. The offset represents the declared exciter, not every BHA component. Constant generalized force and damping are assumptions; amplitude is only a first lateral-mode estimate.</p></article><article class="panel"><h2>3 · Directional target across scenarios</h2><div class="workform" id="window-directionalLimits"></div><label>Source response curves (CSV)<textarea id="window-directional" rows="7" spellcheck="false"></textarea></label><p class="work-note">Headers: scenario,wob_N,build_deg30m,right_deg30m. Explicit WOB alternatives: wob_tf, wob_kN or wob_klbf. Each scenario fixes a BHA / bit / formation / gauge condition. All scenarios must meet the target at a WOB; interpolation stays inside every scenario domain. Right-walk is the curvature component, not raw azimuth turn rate.</p></article><div class="work-toolbar"><button id="window-run" class="primary">Evaluate windows</button><button id="window-save" class="smallbutton" disabled>Save study version</button><button id="window-json" class="smallbutton" disabled>Export study JSON</button><button id="window-report" class="smallbutton" disabled>Export client draft</button></div><div id="window-error" role="alert" class="work-error"></div><div id="window-result"></div>`;
  document.querySelector(".content").append(page);
  const nav = document.createElement("button");
  nav.className = "nav";
  nav.dataset.page = page.id;
  nav.textContent = "Operating windows";
  nav.onclick = () => {
    WellApp.navigate(page.id);
    $("crumb").textContent = "OPERATING WINDOWS";
  };
  document.querySelector('[data-page="dynamics"]').after(nav);
  for (const target of ["td", "dynamics", "directional"]) {
    const b = document.createElement("button");
    b.className = "smallbutton";
    b.textContent = "Open operating windows →";
    b.onclick = nav.onclick;
    $(target).querySelector(".page-head").after(b);
  }
  for (const group of ["mechanical", "modal", "directionalLimits"]) {
    const box = $("window-" + group).closest("article"),
      h = box.querySelector("h2"),
      d = document.createElement("details"),
      summary = document.createElement("summary");
    summary.textContent = h.textContent;
    h.remove();
    d.open = true;
    d.append(summary);
    while (box.firstChild) d.append(box.firstChild);
    box.append(d);
  }
  function paintInputs() {
    for (const [group, list] of Object.entries(fields))
      $("window-" + group).innerHTML = list
        .map(
          (f) =>
            `<label>${esc(f[1])} (${esc(du(f))})<input id="win-${group}-${f[0]}" type="number" step="any" value="${get(group, f[0]) == null ? "" : cv(get(group, f[0]), f[2], du(f))}"></label>`,
        )
        .join("");
    $("window-source").value = draft.source || "";
    $("window-context").value = draft.context || "";
    $("window-quality").value = draft.quality || "USER_ENTERED";
    $("window-directional").value =
      "scenario,wob_" +
      F() +
      ",build_deg30m,right_deg30m\n" +
      (draft.directionalRows || [])
        .map((r) =>
          [r.scenario, C.convert(r.wobN, "N", F()), r.build, r.right]
            .map((v) => '"' + String(v).replaceAll('"', '""') + '"')
            .join(","),
        )
        .join("\n");
  }
  function collect(partial = false) {
    const p = {
      source: $("window-source").value.trim(),
      context: $("window-context").value.trim(),
      quality: $("window-quality").value,
    };
    for (const [group, list] of Object.entries(fields)) {
      p[group] = {};
      for (const f of list) {
        const v = $("win-" + group + "-" + f[0]).value;
        if (partial && v === "") continue;
        p[group][f[0]] = cv(C.number(v, f[1]), du(f), f[2]);
      }
    }
    p.directionalRows = (
      $("window-directional").value.trim().split(/\r?\n/).length < 2
        ? []
        : C.csv($("window-directional").value)
    ).map((r) => {
      const keys = ["N", "tf", "kN", "klbf"].filter((u) => "wob_" + u in r);
      if (keys.length !== 1)
        throw Error("Exactly one explicit WOB unit column is required");
      if (!r.scenario?.trim()) throw Error("Scenario name required");
      return {
        scenario: r.scenario,
        wobN: C.convert(r["wob_" + keys[0]], keys[0], "N"),
        build: C.number(r.build_deg30m),
        right: C.number(r.right_deg30m),
      };
    });
    return p;
  }
  function dirty() {
    current = null;
    $("window-result").innerHTML =
      '<p class="work-note">Inputs changed — evaluate to refresh the windows.</p>';
    for (const id of ["save", "json", "report"])
      $("window-" + id).disabled = true;
  }
  page.addEventListener("input", (e) => {
    if (e.target.id !== "window-unit" && e.target.id !== "window-import")
      dirty();
  });
  $("window-quality").onchange = dirty;
  const protect = (fn) => async () => {
    try {
      $("window-error").textContent = "";
      await fn();
    } catch (e) {
      $("window-error").textContent = e.message;
    }
  };
  function demo() {
    return {
      source: "Original fictional fixture / 1 — no manufacturer ratings",
      context:
        "Training well / Run A / fixed section at 2800 m MD / two fictional gauge scenarios / hookload includes declared tare",
      quality: "SYNTHETIC",
      mechanical: {
        od: 0.127,
        id: 0.108,
        yieldPa: 690e6,
        designFactor: 1.5,
        localTensionN: 420000,
        torqueNm: 12000,
        connectionN: 1500000,
        connectionNm: 35000,
        hookN: 1000000,
        rigN: 1800000,
        surfaceTorqueNm: 15000,
        driveNm: 30000,
      },
      modal: {
        od: 0.172,
        id: 0.075,
        E: 207e9,
        G: 79e9,
        rho: 7850,
        massPerM: 145,
        addedMassPerM: 15,
        span: 10,
        rodLength: 2800,
      },
      analysis: {
        rpmMin: 40,
        rpmMax: 220,
        wobMinN: 20000,
        wobMaxN: 160000,
        selectedRPM: 120,
        selectedWobN: 80000,
        compressionFraction: 1,
        motorRPM: 0,
        order: 1,
        margin: 0.1,
        damping: 0.05,
        modalForceN: 100,
      },
      directionalLimits: { buildMin: -0.3, buildMax: 0.3, dlsMax: 0.5 },
      directionalRows: [
        { scenario: "Gauge A", wobN: 20000, build: -0.3, right: 0.05 },
        { scenario: "Gauge A", wobN: 160000, build: 0.3, right: 0.05 },
        { scenario: "Gauge B", wobN: 20000, build: -0.65, right: 0.1 },
        { scenario: "Gauge B", wobN: 160000, build: 0.35, right: 0.1 },
      ],
    };
  }
  function checkQuality(p) {
    if (
      p.quality === "SYNTHETIC" &&
      WellEvidence.project().mode !== "SYNTHETIC"
    )
      throw Error("Fictional inputs require a synthetic project");
  }
  function run() {
    const p = collect();
    checkQuality(p);
    const result = M.evaluate(p);
    draft = p;
    page.querySelectorAll("article>details").forEach((d) => (d.open = false));
    current = {
      input: structuredClone(p),
      result,
      created: new Date().toISOString(),
      modelVersion: "operating-windows/1",
      review: "DRAFT",
      units: { force: F(), torque: T() },
    };
    render();
    for (const id of ["save", "json", "report"])
      $("window-" + id).disabled = false;
  }
  function mapSVG(r) {
    const a = draft.analysis,
      W = 820,
      H = 470,
      l = 85,
      t = 35,
      pw = 680,
      ph = 365,
      colors = {
        CANDIDATE: "#b3c9bf",
        RESONANCE_BAND: "#bb835d",
        DIRECTIONAL_LIMIT: "#d7c7b9",
        MODEL_UNSTABLE: "#805d67",
        NOT_EVALUABLE: "#dce1e4",
      };
    let s = `<svg xmlns="http://www.w3.org/2000/svg" class="engineering-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Candidate WOB RPM window"><rect width="820" height="470" fill="white"/>`;
    for (const c of r.cells) {
      const x = l + ((c.rpm - a.rpmMin) / (a.rpmMax - a.rpmMin)) * pw,
        y = t + ph - ((c.wobN - a.wobMinN) / (a.wobMaxN - a.wobMinN)) * ph;
      s += `<rect data-window-rpm="${c.rpm}" data-window-wob="${c.wobN}" style="cursor:pointer" x="${x - pw / 120}" y="${y - ph / 48}" width="${pw / 60 + 1}" height="${ph / 24 + 1}" fill="${colors[c.status]}"><title>${c.status} · ${fmt(c.rpm)} RPM · ${fmt(C.convert(c.wobN, "N", F()))} ${F()}</title></rect>`;
    }
    for (let i = 0; i <= 5; i++) {
      s += `<text x="${l + (pw * i) / 5}" y="435" text-anchor="middle" font-size="13">${fmt(a.rpmMin + ((a.rpmMax - a.rpmMin) * i) / 5)}</text><text x="70" y="${t + ph - (ph * i) / 5}" text-anchor="end" font-size="13">${fmt(C.convert(a.wobMinN + ((a.wobMaxN - a.wobMinN) * i) / 5, "N", F()))}</text>`;
    }
    const x = l + ((a.selectedRPM - a.rpmMin) / (a.rpmMax - a.rpmMin)) * pw,
      y =
        t + ph - ((a.selectedWobN - a.wobMinN) / (a.wobMaxN - a.wobMinN)) * ph;
    return (
      s +
      `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#183c50" stroke-width="3"/><text x="425" y="461" text-anchor="middle">Surface RPM</text><text transform="translate(20 230) rotate(-90)" text-anchor="middle">WOB (${F()})</text></svg>`
    );
  }
  const table = (heads, rows) =>
    '<div class="tablebox"><table><thead><tr>' +
    heads.map((h) => "<th>" + esc(h) + "</th>").join("") +
    "</tr></thead><tbody>" +
    rows
      .map(
        (row) =>
          "<tr>" + row.map((v) => "<td>" + esc(v) + "</td>").join("") + "</tr>",
      )
      .join("") +
    "</tbody></table></div>";
  function markup() {
    const r = current.result,
      a = draft.analysis,
      m = r.mechanics,
      force = (n) => fmt(C.convert(n, "N", F())),
      torque = (n) => fmt(C.convert(n, "N.m", T())),
      f = r.selected.modes.find((x) => x.kind === "Lateral" && x.mode === 1);
    const curve = EngineeringCharts.svg(
      [
        {
          name: "Body + connection cap",
          points: m.curve
            .filter((p) => p.permittedTorque)
            .map((p) => ({
              x: C.convert(p.torqueNm, "N.m", T()),
              y: C.convert(p.tensionN, "N", F()),
            })),
        },
        {
          name: "Entered local load",
          points: [
            {
              x: C.convert(draft.mechanical.torqueNm, "N.m", T()),
              y: C.convert(draft.mechanical.localTensionN, "N", F()),
            },
          ],
        },
      ],
      {
        x: "Local section torque (" + T() + ")",
        y: "Local section tension (" + F() + ")",
      },
    );
    const fr = f.hz
      ? EngineeringCharts.svg(
          [
            {
              name: "First lateral response",
              points: Array.from({ length: 121 }, (_, i) => {
                const rpm = a.rpmMin + ((a.rpmMax - a.rpmMin) * i) / 120;
                return {
                  x: rpm,
                  y:
                    1e3 *
                    M.response(
                      f.hz,
                      ((rpm + a.motorRPM) * a.order) / 60,
                      a.damping,
                      r.selected.modalMassKg,
                      a.modalForceN,
                    ).displacementM,
                };
              }),
            },
          ],
          { x: "Surface RPM", y: "Generalized displacement amplitude (mm)" },
        )
      : "<p>Unstable span: forced response not evaluated.</p>";
    const shapes = EngineeringCharts.svg(
      [1, 2, 3].map((j) => ({
        name: "Lateral mode " + j,
        points: Array.from({ length: 81 }, (_, i) => ({
          x: (draft.modal.span * i) / 80,
          y: Math.sin((j * Math.PI * i) / 80),
        })),
      })),
      {
        x: "Distance from pinned support (m)",
        y: "Normalized lateral displacement (not amplitude)",
      },
    );
    return `<article class="panel"><div class="eng-kicker">${esc(draft.quality)} · DRAFT · ${esc(current.modelVersion)}</div><h2>Operating-window review</h2><p>${esc(draft.context)}<br>Source: ${esc(draft.source)}</p><p>${esc(r.coverage)}</p><h3>Selected pipe section — ${esc(m.status)}</h3><div class="study-metrics"><div><span>Additional overpull headroom</span><b>${force(m.overpullN)} ${F()}</b></div><div><span>Governing entered margin</span><b>${esc(m.governing)}</b></div><div><span>Von Mises / allowable stress</span><b>${fmt(m.vonMisesPa / 1e6)} / ${fmt(m.allowableStressPa / 1e6)} MPa</b></div></div>${table(["Constraint", "Remaining margin"], [...m.margins.map((x) => [x.name, force(x.marginN) + " " + F()]), ["Selected connection torque", torque(m.torqueMarginNm) + " " + T()], ["Surface drive torque", torque(m.driveMarginNm) + " " + T()]])}<p>Headroom is not a whole-string allowable overpull. Separate connection caps do not model manufacturer combined tension–torque interaction. Bending, pressure and wear allowances must be supplied externally.</p>${curve}</article><article class="panel"><h2>Candidate WOB–RPM windows</h2><p>Green-grey: candidate for the two plotted checks · Ochre: resonance exclusion · Beige: directional target exceeded · Plum: unstable ideal span · Grey: missing directional coverage.</p>${mapSVG(r)}<p>Click a map cell to inspect its WOB / RPM. Grid: 25 WOB levels × 61 RPM points. Listed endpoints are sampled candidates, not continuous certified limits. Mechanical load state above is separate; it is not recalculated across this grid.</p><h3>At ${force(a.selectedWobN)} ${F()} / ${fmt(a.selectedRPM)} RPM</h3><p>Directional: <b>${esc(r.directional.status)}</b> · Vibration: <b>${r.selected.unstable ? "MODEL_UNSTABLE" : r.selectedResonance.length ? "RESONANCE_BAND" : "OUTSIDE_MODELLED_BANDS"}</b>. Ideal-span compression threshold: ${force(r.selected.criticalN)} ${F()}.</p>${table(
      ["Scenario", "Build (deg/30 m)", "Right (deg/30 m)", "DLS (deg/30 m)"],
      (r.directional.values || []).map((v) => [
        v.scenario,
        fmt(v.build),
        fmt(v.right),
        fmt(v.dls),
      ]),
    )}<details><summary>Sampled candidate RPM intervals (${r.windows.length})</summary>${table(
      ["WOB (" + F() + ")", "From RPM", "To RPM"],
      r.windows.map((v) => [force(v.wobN), fmt(v.fromRPM), fmt(v.toRPM)]),
    )}</details></article><article class="panel"><h2>Modal frequencies and forced response</h2>${table(
      [
        "Branch / mode",
        "Frequency Hz",
        "Critical surface RPM",
        "Exclusion interval RPM",
      ],
      r.bands.map((v) => [
        v.kind + " " + v.mode,
        fmt(v.hz),
        fmt(v.rpm),
        fmt(v.from) + " – " + fmt(v.to),
      ]),
    )}<p>Negative critical surface RPM cannot be reached with the configured positive rotation domain. The margin is a user assumption, not a universal criterion.</p><div class="window-charts">${fr}${shapes}</div><p>First lateral-mode amplitude at inspected RPM: ${r.forced ? fmt(r.forced.displacementM * 1000) + " mm" : "not evaluable"}; dynamic amplification ${r.forced ? fmt(r.forced.amplification) : "not evaluable"}. This is a generalized linear-mode coordinate, not a validated tool sensor amplitude. No stick-slip, intermittent contact, whirl or transient solution is included.</p></article>`;
  }
  function render() {
    $("window-result").innerHTML = markup();
    $("window-result")
      .querySelectorAll("[data-window-rpm]")
      .forEach(
        (cell) =>
          (cell.onclick = protect(() => {
            $("win-analysis-selectedRPM").value = cell.dataset.windowRpm;
            $("win-analysis-selectedWobN").value = C.convert(
              Number(cell.dataset.windowWob),
              "N",
              F(),
            );
            run();
          })),
      );
  }
  $("window-run").onclick = protect(run);
  $("window-example").onclick = protect(() => {
    const p = demo();
    checkQuality(p);
    draft = p;
    paintInputs();
    dirty();
    run();
  });
  $("window-unit").onchange = protect(() => {
    const next = $("window-unit").value;
    try {
      const p = collect(true);
      unit = next;
      draft = p;
      paintInputs();
      if (current) {
        current.units = { force: F(), torque: T() };
        render();
      }
    } catch (e) {
      $("window-unit").value = unit;
      throw Error(
        "Complete numeric inputs before switching units: " + e.message,
      );
    }
  });
  const download = (name, text, type) => {
    const u = URL.createObjectURL(new Blob([text], { type })),
      a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  };
  $("window-save").onclick = protect(() => {
    if (!current) throw Error("Evaluate first");
    const record = { ...structuredClone(current), id: crypto.randomUUID() };
    (WellEvidence.project().operating_window_studies ||= []).push(record);
    WellEvidence.changed("Operating-window study saved");
    $("window-error").textContent = "Study version saved.";
  });
  $("window-json").onclick = () => {
    if (current)
      download(
        "WellScope-operating-window.json",
        JSON.stringify(current, null, 2),
        "application/json",
      );
  };
  $("window-report").onclick = () => {
    if (current)
      download(
        "WellScope-operating-window-draft.html",
        '<!doctype html><html lang="en"><meta charset="utf-8"><title>WellScope operating-window draft</title><style>body{font:15px Segoe UI;max-width:1100px;margin:30px auto;color:#233e4d;padding:20px}table{border-collapse:collapse;width:100%;font-size:12px}td,th{padding:7px;border-bottom:1px solid #dce3e7;text-align:left}svg{width:100%;max-height:520px}.study-metrics,.window-charts{display:flex;gap:24px}.window-charts>*{width:48%}pre{white-space:pre-wrap}article{break-inside:auto;margin-bottom:40px}</style><body>' +
          markup() +
          "<h2>Reproducible input snapshot (SI)</h2><pre>" +
          esc(JSON.stringify(current.input, null, 2)) +
          "</pre></body></html>",
        "text/html",
      );
  };
  $("window-import").onchange = protect(async () => {
    const f = $("window-import").files[0];
    if (!f) return;
    const parsed = JSON.parse(await f.text()),
      p = parsed.input || parsed;
    checkQuality(p);
    M.evaluate(p);
    draft = p;
    paintInputs();
    dirty();
    run();
  });
  $("window-load").onclick = protect(() => {
    const r = WellEvidence.project().operating_window_studies?.at(-1);
    if (!r) throw Error("No saved operating-window study in this project");
    checkQuality(r.input);
    draft = structuredClone(r.input);
    paintInputs();
    dirty();
    run();
  });
  window.addEventListener("wellscope:project-loaded", () => {
    draft = {};
    paintInputs();
    dirty();
  });
  paintInputs();
  window.WindowWorkspace = {
    snapshot: () => structuredClone(current),
    example: demo,
  };
})();
