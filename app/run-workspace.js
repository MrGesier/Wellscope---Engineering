/* One versioned input snapshot drives distributed force, torque and pull checks. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    esc = EngineeringCharts.esc,
    M = RunMechanics,
    C = WellCore;
  let unit = "tf",
    draft = null,
    current = null;
  const tq = () => (unit === "klbf" ? "klbf.ft" : unit + ".m");
  const cv = (n, a, b) => (a === b ? n : C.convert(n, a, b));
  const specs = [
    ["bitMD", "Bit MD", "m"],
    ["stepM", "Integration step", "m"],
    ["shoeMD", "Casing shoe MD", "m"],
    ["muOpen", "Open-hole friction", "ratio"],
    ["muCased", "Cased-hole friction", "ratio"],
    ["rhoInside", "Internal fluid density", "kg/m3"],
    ["rhoOutside", "Annular fluid density", "kg/m3"],
    ["surfaceInsidePa", "Internal surface pressure", "Pa", "MPa"],
    ["surfaceOutsidePa", "Annular surface pressure", "Pa", "MPa"],
    ["bottomForceN", "Bottom effective tension (+) / WOB (−)", "N", "force"],
    ["bottomTorqueNm", "Bottom resisting torque", "N.m", "torque"],
    ["axialSpeedMps", "Axial speed (+ upward / − downward)", "m/s"],
    ["rpm", "Surface rotation", "rpm"],
    ["blockN", "Block / tare load", "N", "force"],
    ["rigLimitN", "Allowable hookload including tare", "N", "force"],
    ["driveLimitNm", "Allowable surface torque", "N.m", "torque"],
  ];
  const display = (s) =>
    s[3] === "force" ? unit : s[3] === "torque" ? tq() : s[3] || s[2];
  const lim = [
    ["allowableTensionN", "Tension", "N", "force"],
    ["allowableCompressionN", "Compression", "N", "force"],
    ["allowableTorqueNm", "Torque", "N.m", "torque"],
    ["yieldPa", "Yield stress", "Pa", "MPa"],
    ["designFactor", "Body design factor", "ratio"],
  ];
  const geometry = () => {
    const s = WellApp.snapshot().state;
    return JSON.stringify({
      survey: WellEngine.parseCSV(s.refcsv),
      bha: s.bha,
      bitMD: s.bitMD,
      reference: s.references?.REFERENCE,
    });
  };
  const page = document.createElement("section");
  page.id = "run-mechanics";
  page.className = "page";
  page.innerHTML = `<div class="page-head"><div><div class="eyebrow">RUN DESIGN / DISTRIBUTED MECHANICS</div><h1>Whole-string loads & pull</h1><p>One run snapshot for the trajectory, assembly, fluid, motion and allowable loads.</p></div><label>Force / torque<select id="run-unit"><option>tf</option><option>kN</option><option>klbf</option></select></label></div><div class="work-toolbar"><button id="run-capture" class="primary">Capture current project geometry</button><button id="run-demo" class="smallbutton">Fictional worked example</button><button id="run-load" class="smallbutton">Load saved active run</button><label class="filebtn">Import run JSON<input id="run-import" type="file" accept=".json" hidden></label></div><p id="run-link" class="work-note"></p><div id="run-inputs" hidden><article class="panel"><h2>1 · Run identity and assumptions</h2><div class="workform" id="run-meta"></div><div class="workform" id="run-settings"></div><p class="work-note">Hydrostatic, distributed soft-string model. Positive force is tension. A negative bottom force represents WOB. At zero axial and rotary speed, friction is zero in this model; static break-out is not predicted. Hookload uses surface effective tension plus declared tare.</p></article><article class="panel"><h2>2 · Assembly and allowable loads</h2><p>Bit to surface. Ratings are allowable values after derating; enter their source/revision. Tube-body yield is divided by the declared design factor. Blank limits remain unknown.</p><div class="tablebox" id="run-components"></div></article><div class="work-toolbar"><button id="run-evaluate" class="primary">Calculate whole string</button><button id="run-save" class="smallbutton" disabled>Save run version</button><button id="run-export" class="smallbutton" disabled>Export run JSON</button><button id="run-report" class="smallbutton" disabled>Export review report</button><button id="run-csv" class="smallbutton" disabled>Export profiles CSV</button></div></div><article class="panel"><h2>3 � Matched reference comparison</h2><p>Import SI profiles only after confirming the same well, datum, assembly, fluids, friction and operation. A comparison is not field validation.</p><button id="run-reference-template" class="smallbutton">Export reference template</button><label class="filebtn">Import reference JSON<input id="run-reference-import" type="file" accept=".json" hidden></label><div id="run-reference-result"></div></article><div id="run-error" role="alert" class="work-error"></div><div id="run-results"></div>`;
  document.querySelector(".content").append(page);
  const nav = document.createElement("button");
  nav.className = "nav";
  nav.dataset.page = page.id;
  nav.textContent = "Whole-string loads & pull";
  nav.onclick = () => {
    WellApp.navigate(page.id);
    $("crumb").textContent = "WHOLE-STRING LOADS & PULL";
    checkLink();
  };
  document.querySelector('[data-page="td"]').after(nav);
  const entry = document.createElement("button");
  entry.className = "smallbutton";
  entry.textContent = "Open whole-string loads & pull";
  entry.onclick = nav.onclick;
  document.querySelector("#td .page-head").after(entry);
  const metadata = [
    ["id", "Run ID"],
    ["revision", "Revision"],
    ["well", "Well / wellbore"],
    ["reference", "Depth datum / coordinate reference"],
    ["source", "Geometry and conditions source / revision"],
  ];
  function input(id, value, type = "text") {
    return `<input id="${id}" type="${type}" ${type === "number" ? 'step="any"' : ""} value="${esc(value ?? "")}">`;
  }
  function paint() {
    $("run-inputs").hidden = !draft;
    if (!draft) return;
    $("run-meta").innerHTML =
      metadata
        .map(([k, l]) => `<label>${l}${input("run-" + k, draft[k])}</label>`)
        .join("") +
      `<label>Evidence quality<select id="run-quality"><option value="SYNTHETIC">Synthetic / illustrative</option><option value="USER_ENTERED">User entered / unverified</option></select></label><label>Operation${input("run-operation", draft.settings.operation)}</label><label>Surface limits source / revision${input("run-limitSource", draft.settings.limitSource)}</label>`;
    $("run-quality").value = draft.quality;
    $("run-settings").innerHTML = specs
      .map(
        (s) =>
          `<label>${s[1]} (${display(s)})${input("run-s-" + s[0], draft.settings[s[0]] == null ? "" : cv(draft.settings[s[0]], s[2], display(s)), "number")}</label>`,
      )
      .join("");
    $("run-components").innerHTML =
      `<table><thead><tr><th>Component / geometry</th><th>Assessment & sources</th>${lim.map((s) => `<th>${s[1]} (${display(s)})</th>`).join("")}</tr></thead><tbody>${draft.bha.map((b, i) => `<tr><td><strong>${esc(b.name)}</strong><br>${esc(b.stable_id)}<br>${b.length} m · OD ${(b.od * 1000).toFixed(1)} / ID ${(b.id * 1000).toFixed(1)} mm<br>${b.mass} kg/m</td><td><select id="run-b-${i}-bodyModel"><option value="">Not specified</option><option value="annular_tube" ${b.bodyModel === "annular_tube" ? "selected" : ""}>Uniform tube body</option><option value="rated_tool" ${b.bodyModel === "rated_tool" ? "selected" : ""}>Tool ratings only</option></select><label>Geometry source${input("run-b-" + i + "-source", b.source)}</label><label>Limit source${input("run-b-" + i + "-limitSource", b.limitSource)}</label></td>${lim.map((s) => `<td>${input("run-b-" + i + "-" + s[0], b[s[0]] == null ? "" : cv(b[s[0]], s[2], display(s)), "number")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    checkLink();
  }
  function collect() {
    if (!draft) throw Error("Capture a run first");
    const p = structuredClone(draft);
    for (const [k] of metadata) p[k] = $("run-" + k).value.trim();
    p.quality = $("run-quality").value;
    for (const k of ["operation", "limitSource"])
      p.settings[k] = $("run-" + k).value.trim();
    for (const s of specs) {
      const v = $("run-s-" + s[0]).value;
      p.settings[s[0]] =
        v === "" ? null : cv(C.number(v, s[1]), display(s), s[2]);
    }
    p.bha.forEach((b, i) => {
      for (const k of ["source", "limitSource", "bodyModel"])
        b[k] = $("run-b-" + i + "-" + k).value.trim();
      for (const s of lim) {
        const v = $("run-b-" + i + "-" + s[0]).value;
        b[s[0]] = v === "" ? null : cv(C.number(v, s[1]), display(s), s[2]);
      }
    });
    return p;
  }
  function stale() {
    return !!draft?.projectGeometry && draft.projectGeometry !== geometry();
  }
  function checkLink() {
    if (!draft) {
      $("run-link").textContent =
        "Capture the project geometry or load the fictional example to begin.";
      return;
    }
    $("run-link").textContent = stale()
      ? "STALE GEOMETRY — project trajectory, BHA, depth or reference changed. Capture again before saving or exporting. Capturing resets component limits."
      : draft.projectGeometry
        ? "Linked geometry snapshot. Conditions and ratings below belong to this run revision."
        : "Independent run snapshot — not linked to current project geometry.";
    if (stale() && current) dirty();
  }
  function dirty() {
    current = null;
    $("run-reference-result").innerHTML = "";
    $("run-results").innerHTML = "";
    for (const id of ["save", "export", "report", "csv"])
      $("run-" + id).disabled = true;
  }
  function settings(depth, mud = 1200) {
    return {
      bitMD: depth,
      stepM: 10,
      shoeMD: Math.min(depth, 1000),
      muOpen: 0.25,
      muCased: 0.15,
      rhoInside: mud,
      rhoOutside: mud,
      surfaceInsidePa: 0,
      surfaceOutsidePa: 0,
      bottomForceN: 0,
      bottomTorqueNm: 0,
      axialSpeedMps: 0.15,
      rpm: 0,
      blockN: 0,
      rigLimitN: null,
      driveLimitNm: null,
      limitSource: "",
      operation: "Off-bottom pickup",
    };
  }
  function capture() {
    const s = WellApp.snapshot().state,
      survey = WellEngine.parseCSV(s.refcsv);
    draft = {
      id: crypto.randomUUID(),
      revision: "1",
      well: "Current reference well",
      reference: JSON.stringify(
        s.references?.REFERENCE || {
          vertical_reference: "RT",
          length_unit: "m",
        },
      ),
      source: "",
      quality: "SYNTHETIC",
      projectGeometry: geometry(),
      survey,
      bha: s.bha.map((b, i) => ({
        ...b,
        stable_id: b.stable_id || "COMP-" + (i + 1),
        source: "",
        limitSource: "",
        bodyModel: "",
        allowableTensionN: null,
        allowableCompressionN: null,
        allowableTorqueNm: null,
        yieldPa: null,
        designFactor: null,
      })),
      settings: settings(s.bitMD || survey.at(-1).md, s.mud),
    };
    dirty();
    paint();
  }
  function demo() {
    const source =
      "Fictional engineering example v1 — not manufacturer ratings";
    const tube = (name, id, length, od, inner, mass) => ({
      name,
      stable_id: id,
      length,
      od,
      id: inner,
      mass,
      source,
      limitSource: source,
      bodyModel: "annular_tube",
      yieldPa: 700e6,
      designFactor: 1.5,
      allowableTensionN: 1.2e6,
      allowableCompressionN: 1e6,
      allowableTorqueNm: 40000,
    });
    return {
      id: "EXAMPLE-RUN-01",
      revision: "1",
      well: "Fictional Northbank extension",
      reference: "Local RT / grid / metres",
      source,
      quality: "SYNTHETIC",
      survey: [
        { md: 0, inc: 0, azi: 0 },
        { md: 600, inc: 0, azi: 0 },
        { md: 1200, inc: 40, azi: 20 },
        { md: 2000, inc: 80, azi: 30 },
        { md: 3000, inc: 80, azi: 30 },
      ],
      bha: [
        tube(
          "Equivalent BHA collar section",
          "COLLARS",
          120,
          0.171,
          0.071,
          130,
        ),
        tube("HWDP section", "HWDP", 180, 0.127, 0.071, 55),
        tube("Drill pipe section", "DP", 2700, 0.127, 0.108, 30),
      ],
      settings: {
        ...settings(3000),
        bottomForceN: 90000,
        bottomTorqueNm: 3000,
        rpm: 20,
        blockN: 200000,
        rigLimitN: 1.5e6,
        driveLimitNm: 60000,
        limitSource: source,
      },
    };
  }
  function fmt(v) {
    return Number(v).toLocaleString("en-GB", { maximumFractionDigits: 2 });
  }
  function markup() {
    if (!current) return "";
    const r = current.result,
      p = current.input,
      op = current.pull;
    const chart = (keys, from, to) =>
      EngineeringCharts.svg(
        keys.map(([k, name]) => ({
          name,
          points: r.rows.map((x) => ({ x: cv(x[k], from, to), y: x.md })),
        })),
        { depth: true, x: to, y: "Measured depth (m) ↓" },
      );
    const g = r.governing;
    const checks = p.bha
      .map((b) => {
        const rows = r.rows.filter((x) => x.componentId === b.stable_id),
          cc = r.checks.filter((x) => x.componentId === b.stable_id);
        const worst = cc.reduce(
          (a, c) =>
            !a ||
            c.margin / Math.max(c.limit, 1) < a.margin / Math.max(a.limit, 1)
              ? c
              : a,
          null,
        );
        return rows.length
          ? `<tr><td>${esc(b.name)}</td><td>${fmt(Math.min(...rows.map((x) => x.md)))}–${fmt(Math.max(...rows.map((x) => x.md)))}</td><td>${fmt(cv(Math.max(...rows.map((x) => x.wallN)), "N", unit))}</td><td>${fmt(cv(Math.max(...rows.map((x) => x.torqueNm)), "N.m", tq()))}</td><td>${worst ? esc(worst.name) + " · " + fmt((100 * worst.margin) / Math.max(worst.limit, 1)) + "% margin" : "Unknown"}</td></tr>`
          : "";
      })
      .join("");
    return `<article class="panel"><div class="eyebrow">${esc(p.quality)} · ${esc(p.id)} / ${esc(p.revision)}</div><h2>${esc(r.status.replaceAll("_", " "))}</h2><p>${esc(p.well)} · ${esc(p.settings.operation)} · ${esc(p.reference)}</p><div class="study-metrics"><div>Hookload <strong>${fmt(cv(r.hookN, "N", unit))} ${unit}</strong></div><div>Surface torque <strong>${fmt(cv(r.surfaceTorqueNm, "N.m", tq()))} ${tq()}</strong></div><div>Governing configured check <strong>${g ? esc(g.name) + " at " + fmt(g.md) + " m · " + esc(g.componentId) : "Unknown"}</strong></div></div><p>${op.status === "MODEL_HEADROOM" ? `Sampled first-limit pull headroom: <b>${fmt(cv(op.additionalHookN, "N", unit))} ${unit}</b> additional hookload; ${fmt(cv(op.additionalBottomN, "N", unit))} ${unit} additional bottom tension. ${op.governing ? "Limiting pull check: " + esc(op.governing.name) + " / " + esc(op.governing.componentId) + " at " + fmt(op.governing.md) + " m. " : ""}${esc(op.assumptions)}` : "Pull headroom unavailable: " + esc(op.reason)}</p>${r.coverage.length ? "<h3>Not evaluated / missing evidence</h3><ul>" + r.coverage.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>" : ""}<div class="window-charts"><div><h3>Axial force profile</h3>${chart(
      [
        ["effectiveN", "Effective tension"],
        ["wallN", "Wall tension"],
      ],
      "N",
      unit,
    )}</div><div><h3>Torque profile</h3>${chart([["torqueNm", "Torque"]], "N.m", tq())}</div></div><h3>Component load review</h3><div class="tablebox"><table><thead><tr><th>Component</th><th>MD interval (m)</th><th>Max wall tension (${unit})</th><th>Max torque (${tq()})</th><th>Governing configured check</th></tr></thead><tbody>${checks}</tbody></table></div>${current.comparison ? "<h3>Reference comparison (SI residuals; not validation)</h3><pre>" + esc(JSON.stringify({ source: current.comparison.source, metrics: current.comparison.metrics }, null, 2)) + "</pre>" : ""}<h3>Model scope</h3><p>Whole-string soft-string integration with hydrostatic pressure and sliding friction resolved between axial and rotary motion. Uniform annular section displacement is an approximation for complex tools and tool joints. Body checks exclude bending, fatigue, wear and connection interaction. Tool ratings are independent caps, not a combined-load qualification. Constrained buckling and dynamics are not solved here. These results do not define a validated field operating window.</p><p>Source: ${esc(p.source)}. No matched real-report validation has been completed. ${r.meshIntervals} integration intervals.</p></article>`;
  }
  function evaluate() {
    const p = collect();
    if (stale()) throw Error("Project geometry changed; capture a fresh run");
    const result = M.solve(p),
      pull = M.overpull(p, result);
    draft = p;
    current = {
      input: structuredClone(p),
      result,
      pull,
      units: { force: unit, torque: tq() },
      computedAt: new Date().toISOString(),
    };
    $("run-results").innerHTML = markup();
    for (const id of ["save", "export", "report", "csv"])
      $("run-" + id).disabled = false;
  }
  const protect = (fn) => async () => {
    try {
      $("run-error").textContent = "";
      await fn();
    } catch (e) {
      $("run-error").textContent = e.message;
    }
  };
  $("run-capture").onclick = protect(capture);
  $("run-demo").onclick = protect(() => {
    draft = demo();
    dirty();
    paint();
    evaluate();
  });
  $("run-evaluate").onclick = protect(evaluate);
  $("run-inputs").addEventListener("input", (e) => {
    if (e.target.matches("input,select")) dirty();
  });
  $("run-inputs").addEventListener("change", (e) => {
    if (e.target.matches("select")) dirty();
  });
  $("run-unit").onchange = protect(() => {
    const next = $("run-unit").value;
    try {
      if (draft) draft = collect();
      unit = next;
      paint();
      if (current) {
        current.units = { force: unit, torque: tq() };
        $("run-reference-result").textContent = current.comparison
          ? "Reference comparison retained in run JSON (SI)."
          : "";
        $("run-results").innerHTML = markup();
      }
    } catch (e) {
      $("run-unit").value = unit;
      throw e;
    }
  });
  function download(name, body, type) {
    const url = URL.createObjectURL(new Blob([body], { type })),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function ready() {
    checkLink();
    if (!current) throw Error("Calculate current inputs first");
  }
  $("run-save").onclick = protect(() => {
    ready();
    const p = WellEvidence.project(),
      record = structuredClone(current);
    record.savedId = crypto.randomUUID();
    (p.run_studies ||= []).push(record);
    p.active_run = structuredClone(current.input);
    WellEvidence.changed("Distributed run version saved");
    $("run-error").textContent =
      "Run version saved with geometry, conditions, limits and results.";
  });
  $("run-load").onclick = protect(() => {
    const p = WellEvidence.project().active_run;
    if (!p) throw Error("No saved active run");
    draft = structuredClone(p);
    dirty();
    paint();
    if (!stale()) evaluate();
  });
  $("run-export").onclick = protect(() => {
    ready();
    download(
      "WellScope-run.json",
      JSON.stringify(current, null, 2),
      "application/json",
    );
  });
  $("run-report").onclick = protect(() => {
    ready();
    download(
      "WellScope-run-review.html",
      '<!doctype html><html lang="en"><meta charset="utf-8"><title>Run mechanics review</title><style>body{font:15px Segoe UI;max-width:1200px;margin:auto;padding:30px;color:#233e4d}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #ccc}svg{width:100%}.window-charts{display:flex;gap:20px}.window-charts>div{width:50%}pre{white-space:pre-wrap}</style>' +
        markup() +
        "<h2>Input snapshot (SI)</h2><pre>" +
        esc(JSON.stringify(current.input, null, 2)) +
        "</pre></html>",
      "text/html",
    );
  });
  $("run-csv").onclick = protect(() => {
    ready();
    download(
      "WellScope-run-profiles.csv",
      [
        "md_m,component_id,effective_" +
          unit +
          ",wall_" +
          unit +
          ",torque_" +
          tq(),
        ...current.result.rows.map((r) =>
          [
            r.md,
            '"' + r.componentId.replaceAll('"', '""') + '"',
            cv(r.effectiveN, "N", unit),
            cv(r.wallN, "N", unit),
            cv(r.torqueNm, "N.m", tq()),
          ].join(","),
        ),
      ].join("\n"),
      "text/csv",
    );
  });
  $("run-import").onchange = protect(async () => {
    const f = $("run-import").files[0];
    if (!f) return;
    const o = JSON.parse(await f.text()),
      p = o.input || o;
    M.validate(p);
    draft = p;
    dirty();
    paint();
    if (!stale()) evaluate();
  });
  window.addEventListener("wellscope:project-loaded", () => {
    draft = null;
    dirty();
    $("run-inputs").hidden = true;
    checkLink();
  });
  window.addEventListener("wellscope:change", checkLink);
  $("run-reference-template").onclick = protect(() => {
    ready();
    const p = current.input;
    download(
      "WellScope-reference-template.json",
      JSON.stringify(
        {
          runId: p.id,
          revision: p.revision,
          well: p.well,
          datum: p.reference,
          operation: p.settings.operation,
          source: "",
          inputMatchConfirmed: false,
          rows: [],
        },
        null,
        2,
      ),
      "application/json",
    );
  });
  $("run-reference-import").onchange = protect(async () => {
    ready();
    const f = $("run-reference-import").files[0];
    if (!f) return;
    const reference = JSON.parse(await f.text());
    const comparison = M.compare(current.result, current.input, reference);
    current.reference = reference;
    current.comparison = comparison;
    $("run-results").innerHTML = markup();
    $("run-reference-result").textContent =
      "COMPARISON ONLY � " +
      comparison.rows.length +
      " matched quantities. " +
      comparison.metrics
        .filter((m) => m.count)
        .map(
          (m) =>
            m.quantity +
            " RMSE " +
            fmt(
              cv(
                m.rmse,
                m.quantity === "effectiveN" ? "N" : "N.m",
                m.quantity === "effectiveN" ? unit : tq(),
              ),
            ) +
            " " +
            (m.quantity === "effectiveN" ? unit : tq()),
        )
        .join("; ");
  });
  window.RunWorkspace = {
    snapshot: () => structuredClone(current),
    example: demo,
  };
  checkLink();
})();
