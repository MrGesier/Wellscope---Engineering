/* Study-first workspace. All source data stays in the local project. */
(() => {
  "use strict";
  const A = WellApp,
    P = WellEvidence,
    C = WellCore,
    S = WellStudies,
    catalog = StudyCatalog,
    $ = (id) => document.getElementById(id);
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
  const fmt = (v) =>
    typeof v === "number"
      ? Number.isFinite(v)
        ? v.toLocaleString("en-US", { maximumFractionDigits: 3 })
        : "—"
      : (v ?? "Not evaluable");
  const label = (k) =>
    k
      .replaceAll("_", " ")
      .replace(/\bmd\b/g, "MD")
      .replace(/\btvd\b/g, "TVD")
      .replace(/\bmse\b/g, "MSE")
      .replace(/\brop\b/g, "ROP")
      .replace(/\brpm\b/g, "RPM");
  let selected = catalog[0],
    rows = [],
    current = null,
    busy = false,
    revisionOf = null,
    editRevision = 0,
    filter = "All studies";
  const section = (id, html) => {
    const e = document.createElement("section");
    e.id = id;
    e.className = "page";
    e.innerHTML = html;
    document.querySelector(".content").append(e);
    return e;
  };
  const jump = (id) => {
    const nav = document.querySelector(`.nav[data-page="${id}"]`);
    if (nav) nav.click();
  };
  const home = section(
    "studies",
    `<div class="study-intro"><div><div class="eyebrow">WELLSCOPE / ENGINEERING STUDIO</div><h1>Start with the question.<br><em>Build the right study.</em></h1><p>Prepare a run, reconcile observations, or assemble a report. Your inputs, assumptions and results stay together.</p><div class="home-actions"><button class="primary" id="home-demo">Explore a synthetic MSE study</button><button class="smallbutton" id="home-import">Open project data</button></div></div><div class="strata-art" aria-hidden="true"><img src="assets/wellscope-logo.svg" alt=""><span>WELL DESIGN · FIELD EVIDENCE · REPORTS</span></div></div><div class="workspace-stats" id="workspace-stats"></div><div class="studio-heading"><div><div class="eyebrow">STUDY LIBRARY</div><h2>What are you working on?</h2></div><label class="study-search">Find a study<input id="study-search" type="search" placeholder="MSE, casing, directional…"></label></div><div class="study-filters" id="study-filters"></div><div class="study-grid" id="study-grid"></div><article class="panel studio-how"><h2>One study, a clear chain of evidence</h2><ol><li><b>Prepare</b><span>Choose the question, check required data and name the source.</span></li><li><b>Analyze</b><span>Inspect calculated observations or clearly labelled external results.</span></li><li><b>Report</b><span>Save a version with inputs, figures, limitations and your interpretation.</span></li></ol></article>`,
  );
  section(
    "study",
    `<div class="page-head"><div><div class="eyebrow" id="study-breadcrumb"></div><h1 id="study-title"></h1><p id="study-purpose"></p></div><button class="smallbutton" id="study-back">← Study library</button></div><div class="study-layout"><aside class="study-guide"><div class="eyebrow">BEFORE YOU START</div><h2>Required data</h2><ul id="study-requirements"></ul><h3>What you get</h3><ul id="study-outputs"></ul><div class="model-note" id="study-limitation"></div><button class="smallbutton" id="study-help">Open methodology guide</button></aside><div class="study-main"><article class="panel"><div class="step-title"><span>01</span><h2>Define the study</h2></div><div class="workform"><label>Study name<input id="study-name" placeholder="Run / interval / revision"></label><label>Source and revision<input id="study-source" placeholder="File, sensor record or model run"></label><label>Evidence quality<select id="study-quality"><option value="IMPORTED_UNCHECKED">Imported — QC not reviewed</option><option value="MEASURED_QC_PASS">Measured — QC reviewed</option><option value="MEASURED_QC_FAIL">Measured — QC failed</option><option value="SYNTHETIC">Synthetic example</option></select></label><label id="study-basis-label">Measurement basis<select id="study-basis"><option value="BIT">Bit measurements</option><option value="SURFACE">Surface measurements (proxy)</option></select></label><label>Reference / matching basis<input id="study-reference" placeholder="MD/RT, grid frame; matching sensor zero"></label></div></article><article class="panel"><div class="step-title"><span>02</span><h2>Load and review inputs</h2></div><div class="work-toolbar"><button class="smallbutton" id="study-add-row">+ Add row</button><label class="filebtn">Import CSV<input id="study-import" type="file" accept=".csv,text/csv" hidden></label><button class="smallbutton" id="study-template">Download CSV template</button><button class="smallbutton" id="study-example">Load synthetic example</button></div><p class="work-note" id="study-input-note"></p><div class="tablebox input-grid" id="study-inputs"></div><div id="study-sensitivity" class="workform" hidden><label>Bit depths (mMD), comma separated<input id="study-depths" placeholder="1000, 1500, 2000"></label><label>Open-hole friction coefficients<input id="study-coefficients" placeholder="0.15, 0.25, 0.35"></label><p class="work-note">Uses the current reference survey, BHA, mud density and cased-hole settings. Open Torque &amp; Drag to edit those shared inputs.</p></div><div class="work-toolbar"><button id="study-run" class="primary">Calculate study</button><span class="study-result-state" id="study-result-state">No result yet</span></div><p role="alert" id="study-error" class="work-error"></p></article><article class="panel" id="study-results-panel"><div class="step-title"><span>03</span><h2>Review results</h2></div><div id="study-metrics" class="study-metrics"></div><div id="study-chart"></div><div class="tablebox" id="study-results"></div><label class="interpretation">Your interpretation<textarea id="study-interpretation" placeholder="What did you observe? Record the evidence, alternatives and unresolved questions."></textarea></label><div class="work-toolbar"><button class="primary" id="study-save" disabled>Save report version</button><button class="smallbutton" id="study-export-results" disabled>Export result CSV</button></div></article></div></div>`,
  );
  section(
    "casebook",
    `<div class="page-head"><div><div class="eyebrow">CASEBOOK / VERSIONED EVIDENCE</div><h1>Your study reports</h1><p>Saved results retain their inputs and assumptions. A saved draft is evidence, not engineering approval.</p></div><button class="primary" id="casebook-new">+ New study</button></div><div id="casebook-list" class="casebook-grid"></div><article class="panel"><h2>Compare two saved versions</h2><div class="workform"><label>Version A<select id="compare-study-a"></select></label><label>Version B<select id="compare-study-b"></select></label></div><button class="smallbutton" id="compare-study">Compare matching quantities</button><div id="study-comparison" class="tablebox"></div></article><article class="panel report-document" id="study-report-preview"><p>Open a saved report to inspect its figures and source trace.</p></article><div class="work-toolbar"><button id="study-report-html" class="smallbutton" disabled>Download standalone report</button><button id="study-report-print" class="primary" disabled>Print / Save PDF</button></div>`,
  );
  $("study-name")
    .closest(".workform")
    .insertAdjacentHTML(
      "beforeend",
      '<label>Well / wellbore<input id="study-well" placeholder="Wellbore identifier"></label><label>Run / operating conditions<input id="study-run-context" placeholder="Run, BHA revision, fluid, operation and interval"></label>',
    );
  const guide = section(
    "methodology",
    `<div class="page-head"><div><div class="eyebrow">REPORT GUIDE</div><h1>What each report is for</h1><p>Choose a question and check the inputs before interpreting a chart.</p></div></div><div class="guide-grid" id="report-guide"></div><article class="panel"><h2>Calculation boundary</h2><p>WellScope independently implements the descriptive calculations shown in each study. Imported external solver outputs remain external. Source documents describe richer commercial models; their presence does not validate an equivalent WellScope solver.</p><p>Geometry, axial screening and the original analysis tools remain available in the sidebar. Project backups include saved studies and their input snapshots.</p></article>`,
  );
  function addNav(id, text, group) {
    let b = document.createElement("button");
    b.className = "nav";
    b.dataset.page = id;
    b.textContent = text;
    b.onclick = () => {
      A.navigate(id);
      $("crumb").textContent = text.toUpperCase();
      if (id === "casebook") casebook();
      if (id === "studies") stats();
    };
    group.append(b);
  }
  const nav = $("navigation"),
    old = [...nav.children];
  nav.replaceChildren();
  const group = (name) => {
    const h = document.createElement("div");
    h.className = "nav-heading";
    h.textContent = name;
    nav.append(h);
    return nav;
  };
  addNav("studies", "Study library", group("WORKSPACE"));
  addNav("study", "Current study", nav);
  addNav("casebook", "Study reports", nav);
  group("PROJECT & GEOMETRY");
  ["dataqc", "trajectory", "bha", "overview", "collision"].forEach((id) => {
    const b = old.find((x) => x.dataset.page === id);
    if (b) nav.append(b);
  });
  group("ANALYSIS TOOLS");
  ["td", "directional", "dynamics", "cuttings", "limits"].forEach((id) => {
    const b = old.find((x) => x.dataset.page === id);
    if (b) nav.append(b);
  });
  group("REFERENCE");
  addNav("methodology", "Report guide", nav);
  ["report", "science"].forEach((id) => {
    const b = old.find((x) => x.dataset.page === id);
    if (b) nav.append(b);
  });
  document.querySelector(".brand small").textContent =
    "ENGINEERING STUDIO / 0.5";
  document.querySelector(".groupcap").remove();
  document.querySelector(".notice").innerHTML =
    "<strong>LOCAL ENGINEERING WORKSPACE</strong> · Source-backed studies. Preliminary calculations and external results are labelled in each report.";
  document.querySelector(".sidebar-footer").innerHTML =
    '<span class="dot"></span> YOUR LOCAL WORKSPACE<p>Offline · Export backups to keep your work</p>';
  // Expose the methodology before long legacy panels without removing access.
  const helpText = {
    overview: "Inspect wells and select the location used by linked views.",
    trajectory:
      "Load source surveys, check references, and calculate the geometry.",
    bha: "Build the ordered string and record tool-specific source properties.",
    td: "Review the axial approximation and compare it with separate measurements.",
    directional:
      "Separate observed survey response, external models and geometric checks.",
    dynamics:
      "Inspect measured spectra; predictive modal analysis remains external.",
    cuttings:
      "Describe source-backed surface samples and their particle-size distributions.",
    dataqc: "Load project data, check its reference frame and record QC.",
    collision: "Screen geometric proximity in a compatible reference frame.",
    limits: "Compare eligible data only with explicit source-backed rules.",
  };
  for (const [id, text] of Object.entries(helpText)) {
    const e = document.createElement("div");
    e.className = "page-task";
    e.textContent = text;
    $(id).querySelector(".page-head")?.after(e);
  }
  const groups = [
    "All studies",
    "Directional",
    "Performance",
    "Operations",
    "String integrity",
    "Well integrity",
    "Well placement",
  ];
  for (const g of groups) {
    const b = document.createElement("button");
    b.textContent = g;
    b.className = "filter-chip";
    b.onclick = () => {
      filter = g;
      renderLibrary();
    };
    $("study-filters").append(b);
  }
  function renderLibrary() {
    const query = $("study-search").value.toLowerCase();
    $("study-grid").innerHTML =
      catalog
        .filter(
          (s) =>
            (filter === "All studies" || s.group === filter) &&
            (s.title + " " + s.purpose).toLowerCase().includes(query),
        )
        .map(
          (s, i) =>
            `<button class="study-card" data-study="${s.id}"><div class="card-kicker"><span>${esc(s.group)}</span><span>${s.phase}</span></div><span class="study-number">${String(catalog.indexOf(s) + 1).padStart(2, "0")}</span><h3>${s.title}</h3><p>${s.purpose}</p><div class="card-bottom"><span class="capability ${s.processor === "external" ? "external" : ""}">${s.processor === "external" ? "External result review" : "Calculation available"}</span><b aria-hidden="true">↗</b></div></button>`,
        )
        .join("") || "<p>No study matches this search.</p>";
    $("study-grid")
      .querySelectorAll("[data-study]")
      .forEach((b) => (b.onclick = () => openStudy(b.dataset.study)));
    [...$("study-filters").children].forEach((b) =>
      b.classList.toggle("active", b.textContent === filter),
    );
  }
  function stats() {
    const p = P.project(),
      a = A.snapshot();
    $("workspace-stats").innerHTML = [
      ["Wells in view", p.wells.length || 4],
      ["BHA components", a.state.bha.length],
      ["Saved studies", (p.study_runs || []).length],
      ["Project", p.mode === "SYNTHETIC" ? "Synthetic" : "User data"],
    ]
      .map(([l, v]) => `<div><span>${l}</span><b>${esc(v)}</b></div>`)
      .join("");
  }
  function dirty() {
    editRevision++;
    current = null;
    $("study-result-state").textContent =
      "Inputs changed — calculate to refresh";
    $("study-results-panel").classList.add("outdated");
    $("study-save").disabled = $("study-export-results").disabled = true;
  }
  function inputTable() {
    if (selected.processor === "sensitivity") {
      $("study-inputs").replaceChildren();
      return;
    }
    $("study-inputs").innerHTML =
      `<table><thead><tr>${selected.fields.map((k) => `<th>${esc(label(k))}</th>`).join("")}<th></th></tr></thead><tbody>${rows
        .slice(0, 200)
        .map(
          (r, i) =>
            `<tr>${selected.fields.map((k) => `<td><input aria-label="${esc(label(k))} row ${i + 1}" data-row="${i}" data-key="${k}" value="${esc(r[k])}"></td>`).join("")}<td><button data-remove="${i}" aria-label="Remove row ${i + 1}">×</button></td></tr>`,
        )
        .join("")}</tbody></table>`;
    $("study-input-note").textContent =
      rows.length > 200
        ? `Showing 200 of ${rows.length} imported rows. All rows are included in calculations and exports.`
        : "Use the units shown in the column names. CSV headers are available in the template.";
    $("study-inputs")
      .querySelectorAll("input")
      .forEach(
        (e) =>
          (e.oninput = () => {
            rows[Number(e.dataset.row)][e.dataset.key] = e.value;
            dirty();
          }),
      );
    $("study-inputs")
      .querySelectorAll("[data-remove]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            rows.splice(Number(b.dataset.remove), 1);
            inputTable();
            dirty();
          }),
      );
  }
  function openStudy(id) {
    selected = catalog.find((s) => s.id === id) || catalog[0];
    rows = [];
    revisionOf = null;
    current = null;
    $("study-title").textContent = selected.title;
    $("study-purpose").textContent = selected.purpose;
    $("study-breadcrumb").textContent = selected.group + " / " + selected.phase;
    $("study-requirements").innerHTML = selected.requirements
      .map((x) => `<li>${esc(x)}</li>`)
      .join("");
    $("study-outputs").innerHTML = selected.outputs
      .map((x) => `<li>${esc(x)}</li>`)
      .join("");
    $("study-limitation").textContent = selected.limitation;
    $("study-name").value = selected.title;
    $("study-source").value = "";
    $("study-reference").value = "";
    $("study-well").value = "";
    $("study-run-context").value = "";
    $("study-basis").value = "BIT";
    $("study-quality").value = "IMPORTED_UNCHECKED";
    $("study-interpretation").value = "";
    $("study-basis-label").hidden = selected.id !== "mse";
    $("study-sensitivity").hidden = selected.processor !== "sensitivity";
    $("study-depths").value = "";
    $("study-coefficients").value = "";
    $("study-add-row").hidden = selected.processor === "sensitivity";
    $("study-template").hidden = selected.processor === "sensitivity";
    $("study-import").parentElement.hidden =
      selected.processor === "sensitivity";
    $("study-run").textContent =
      selected.processor === "external"
        ? "Review external results"
        : "Calculate study";
    ["study-chart", "study-results", "study-metrics"].forEach((id) =>
      $(id).replaceChildren(),
    );
    $("study-error").textContent = "";
    inputTable();
    dirty();
    jump("study");
  }
  function example() {
    if (P.project().mode !== "SYNTHETIC")
      throw Error(
        "Create a synthetic project in Data & QC before loading examples",
      );
    rows = selected.sample.map((vals) =>
      Object.fromEntries(selected.fields.map((k, i) => [k, vals[i]])),
    );
    $("study-source").value = "Original synthetic fixture / 1";
    $("study-quality").value = "SYNTHETIC";
    $("study-well").value = "Synthetic training well";
    $("study-run-context").value = "Independent demonstration case / 1";
    $("study-reference").value =
      "Synthetic MD / local frame; matched observation basis";
    $("study-depths").value = "1000, 1500, 2000";
    $("study-coefficients").value = "0.15, 0.25, 0.35";
    inputTable();
    dirty();
  }
  function download(name, content, mime) {
    const a = document.createElement("a"),
      url = URL.createObjectURL(new Blob([content], { type: mime }));
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  const csv = (data, keys) =>
    [
      keys.join(","),
      ...data.map((row) =>
        keys
          .map((k) => '"' + String(row[k] ?? "").replaceAll('"', '""') + '"')
          .join(","),
      ),
    ].join("\r\n");
  const table = (data) => {
    if (!data.length) return "<p>No data.</p>";
    const keys = Object.keys(data[0]);
    return `<table><thead><tr>${keys.map((k) => `<th>${esc(label(k))}</th>`).join("")}</tr></thead><tbody>${data.map((r) => `<tr>${keys.map((k) => `<td>${esc(fmt(r[k]))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  };
  function plot(data, key, grouped = false) {
    if (
      !grouped &&
      data.some((r) => r.quantity || r.open_hole_friction !== undefined)
    ) {
      const groups = new Map();
      for (const r of data) {
        const name = r.quantity
          ? `${r.quantity} (${r.unit}) · ${r.model_name} / ${r.model_revision}`
          : `Open-hole friction: ${r.open_hole_friction}`;
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push(r);
      }
      return [...groups]
        .map(
          ([name, points]) => `<h4>${esc(name)}</h4>${plot(points, key, true)}`,
        )
        .join("");
    }
    const clean = data.filter(
      (r) => Number.isFinite(r[key]) && Number.isFinite(r.md_m),
    );
    if (!clean.length) return "<p>No numeric chart available.</p>";
    clean.sort((a, b) => a.md_m - b.md_m);
    return EngineeringCharts.svg([{name:label(key),points:clean.map(r=>({x:r[key],y:r.md_m}))}],{x:label(key),y:'Measured depth (m) ↓',depth:true});
  }

  async function calculate() {
    if (busy) return;
    busy = true;
    const calculationRevision = editRevision;
    $("study-run").disabled = true;
    try {
      const meta = {
        source: $("study-source").value.trim(),
        quality: $("study-quality").value,
        basis:
          selected.id === "mse"
            ? $("study-basis").value
            : "Declared input units",
        well: $("study-well").value.trim(),
        run_context: $("study-run-context").value.trim(),
        reference: $("study-reference").value.trim(),
      };
      S.context(meta);
      if (!meta.reference)
        throw Error("State the reference frame and matching measurement basis");
      if (!String($("study-name").value).trim()) throw Error("Name the study");
      if (P.project().mode === "USER_DATA" && meta.quality === "SYNTHETIC")
        throw Error("Synthetic inputs require a synthetic project");
      let result, inputs;
      if (selected.processor === "sensitivity") {
        const snap = A.snapshot(),
          depths = $("study-depths")
            .value.split(",")
            .map((x) => C.number(x.trim())),
          coefficients = $("study-coefficients")
            .value.split(",")
            .map((x) => C.number(x.trim()));
        if (P.status().invalidReason) throw Error(P.status().invalidReason);
        const settings = {
          mu: snap.state.mu,
          muCased: snap.state.muCased,
          muOpen: snap.state.muOpen,
          casingShoe: snap.state.casingShoe,
          mud: snap.state.mud,
          steel: snap.state.steel,
          bitForce: snap.state.bitforce || 0,
        };
        inputs = {
          survey: snap.derived.ref,
          bha: snap.state.bha,
          settings,
          depths,
          coefficients,
        };
        result = S.sensitivity(
          inputs.survey,
          inputs.bha,
          settings,
          depths,
          coefficients,
          meta,
        );
      } else {
        inputs = structuredClone(rows);
        result = S.processors[selected.processor](inputs, meta);
      }
      const record = {
        revision_of: revisionOf,
        study_type: selected.id,
        name: $("study-name").value.trim(),
        meta,
        inputs,
        results: result,
        limitations: selected.limitation,
        application: "WellScope 0.5",
        calculation_version: "study-engine/1",
        generated_utc: new Date().toISOString(),
        review: "DRAFT",
      };
      record.input_sha256 = await C.fingerprint({
        type: record.study_type,
        meta,
        inputs,
      });
      if (calculationRevision !== editRevision)
        throw Error("Inputs changed during calculation; calculate again");
      current = record;
      $("study-result-state").textContent =
        selected.processor === "external"
          ? "External results reviewed — not a WellScope prediction"
          : "Calculated · preliminary / unverified";
      $("study-results-panel").classList.remove("outdated");
      $("study-results").innerHTML = table(result.slice(0, 200));
      $("study-chart").innerHTML = plot(result, selected.plot);
      $("study-metrics").innerHTML = [
        ["Rows", result.length],
        ["Source", meta.source],
        ["Quality", meta.quality],
        [
          "Origin",
          selected.processor === "external"
            ? "External model"
            : "Local descriptive calculation",
        ],
      ]
        .map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`)
        .join("");
      $("study-save").disabled = $("study-export-results").disabled = false;
    } finally {
      busy = false;
      $("study-run").disabled = false;
    }
  }
  let preview = null;
  function reportMarkup(r) {
    const def = catalog.find((s) => s.id === r.study_type);
    return `<div class="report-cover"><svg width="54" height="54" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><title>WellScope — trajectory through the earth</title><rect width="256" height="256" rx="56" fill="#3b2b22"/><path d="M30 161Q97 115 226 125M30 193Q107 146 226 157M30 224Q108 181 226 189" fill="none" stroke="#bb8153" stroke-width="14" stroke-linecap="round"/><path d="M89 42v72c0 36 25 63 60 63h48" fill="none" stroke="#fff0d4" stroke-width="17" stroke-linecap="round"/><circle cx="198" cy="177" r="12" fill="#df8b4e"/><path d="M69 43h40" stroke="#fff0d4" stroke-width="9" stroke-linecap="round"/></svg>
<div><div class="eyebrow">WELLSCOPE / STUDY REPORT</div><h2>${esc(r.name)}</h2><p>${esc(def?.title)} · ${esc(r.generated_utc)} · DRAFT</p></div></div><h3>Study objective</h3><p>${esc(def?.purpose)}</p><h3>Evidence and basis</h3><p><b>Well:</b> ${esc(r.meta.well || "Not supplied")}<br><b>Run / operating context:</b> ${esc(r.meta.run_context || "Not supplied")}<br><b>Source:</b> ${esc(r.meta.source)}<br><b>Quality:</b> ${esc(r.meta.quality)}<br><b>Reference:</b> ${esc(r.meta.reference)}<br><b>Measurement basis:</b> ${esc(r.meta.basis)}<br><b>Model:</b> ${def?.processor === "external" ? "External result review" : "PRELIMINARY_UNVERIFIED"}</p><h3>Results</h3>${plot(r.results, def?.plot)}<div class="tablebox">${table(r.results)}</div><h3>Interpretation by author</h3><p class="report-prose">${esc(r.interpretation || "No interpretation recorded.")}</p><h3>Limitations and unresolved questions</h3><p>${esc(r.limitations)}</p><h3>Reproducibility</h3><p class="report-prose">${esc(r.application + " · " + r.calculation_version)}<br>Input SHA256: ${esc(r.input_sha256)}<br>Saved study version: ${esc(r.id)}</p><details><summary>Input snapshot</summary><pre>${esc(JSON.stringify(r.inputs, null, 2))}</pre></details>`;
  }
  function showReport(r) {
    preview = r;
    $("study-report-preview").innerHTML = reportMarkup(r);
    $("study-report-html").disabled = $("study-report-print").disabled = false;
    $("study-revise").disabled = r.study_type === "friction";
  }
  function casebook() {
    const runs = P.project().study_runs || [];
    $("casebook-list").innerHTML = runs.length
      ? runs
          .slice()
          .reverse()
          .map(
            (r) =>
              `<button class="case-card" data-record="${esc(r.id)}"><span class="eyebrow">${esc(catalog.find((s) => s.id === r.study_type)?.group || r.study_type)}</span><h3>${esc(r.name)}</h3><p>${esc(r.meta.source)}</p><small>${esc(r.generated_utc)} · DRAFT</small></button>`,
          )
          .join("")
      : '<div class="empty-state"><h2>Your first report starts with a study.</h2><p>Choose a question, enter data and save a result version.</p></div>';
    $("casebook-list")
      .querySelectorAll("[data-record]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            showReport(runs.find((r) => r.id === b.dataset.record))),
      );
    for (const id of ["compare-study-a", "compare-study-b"])
      $(id).innerHTML = runs
        .map(
          (r) =>
            `<option value="${esc(r.id)}">${esc(r.name + " · " + r.id)}</option>`,
        )
        .join("");
    stats();
  }
  function protect(fn) {
    return async () => {
      try {
        $("study-error").textContent = "";
        await fn();
      } catch (e) {
        $("study-error").textContent = e.message;
      }
    };
  }
  const revise = document.createElement("button");
  revise.id = "study-revise";
  revise.className = "smallbutton";
  revise.textContent = "Revise saved study";
  revise.disabled = true;
  revise.title =
    "Create a new version from saved table inputs. Friction matrices require the current shared survey and string.";
  $("study-report-html").parentElement.append(revise);
  revise.onclick = () => {
    if (!preview || preview.study_type === "friction") return;
    const r = structuredClone(preview);
    openStudy(r.study_type);
    revisionOf = r.id;
    rows = structuredClone(r.inputs);
    $("study-name").value = r.name;
    for (const [id, key] of [
      ["study-source", "source"],
      ["study-quality", "quality"],
      ["study-reference", "reference"],
      ["study-basis", "basis"],
      ["study-well", "well"],
      ["study-run-context", "run_context"],
    ])
      $(id).value = r.meta[key] || "";
    $("study-interpretation").value = r.interpretation || "";
    inputTable();
    dirty();
  };
  $("study-run").onclick = protect(calculate);
  $("study-example").onclick = protect(example);
  $("study-add-row").onclick = () => {
    rows.push(Object.fromEntries(selected.fields.map((k) => [k, ""])));
    inputTable();
    dirty();
  };
  $("study-template").onclick = () =>
    download(
      selected.id + "-template.csv",
      csv([], selected.fields),
      "text/csv",
    );
  $("study-import").onchange = protect(async () => {
    const f = $("study-import").files[0];
    if (!f) return;
    const parsed = C.csv(await f.text());
    if (!parsed.length) throw Error("CSV contains no data rows");
    const missing = selected.fields.filter((k) => !(k in parsed[0]));
    if (missing.length)
      throw Error("Missing CSV columns: " + missing.join(", "));
    if (parsed.length > 10000) throw Error("Maximum 10,000 rows");
    rows = parsed;
    $("study-source").value = f.name;
    $("study-quality").value = "IMPORTED_UNCHECKED";
    inputTable();
    dirty();
    $("study-import").value = "";
  });
  $("study-export-results").onclick = () => {
    if (current)
      download(
        selected.id + "-results.csv",
        csv(current.results, Object.keys(current.results[0])),
        "text/csv",
      );
  };
  $("study-save").onclick = protect(async () => {
    if (!current) throw Error("Calculate current inputs first");
    const record = {
      ...structuredClone(current),
      id: "study-" + crypto.randomUUID(),
      interpretation: $("study-interpretation").value,
      saved_utc: new Date().toISOString(),
    };
    (P.project().study_runs ??= []).push(record);
    P.changed();
    casebook();
    showReport(record);
    jump("casebook");
  });
  $("compare-study").onclick = () => {
    try {
      const runs = P.project().study_runs || [],
        a = runs.find((r) => r.id === $("compare-study-a").value),
        b = runs.find((r) => r.id === $("compare-study-b").value);
      if (!a || !b || a.id === b.id)
        throw Error("Select two different saved versions");
      if (
        a.study_type !== b.study_type ||
        a.meta.reference !== b.meta.reference ||
        a.meta.well !== b.meta.well ||
        a.meta.run_context !== b.meta.run_context ||
        a.meta.basis !== b.meta.basis
      )
        throw Error(
          "Comparison requires the same study type, well, operating context, reference and measurement basis",
        );
      if (a.study_type === "friction")
        throw Error(
          "Compare friction matrices in their saved reports; MD alone is not a unique sensitivity-case key",
        );
      const keys = Object.keys(a.results[0]).filter(
          (k) => k !== "md_m" && typeof a.results[0][k] === "number",
        ),
        out = [];
      const seen = new Set();
      for (const x of a.results) {
        if (seen.has(x.md_m))
          throw Error("Duplicate MD: match explicit cases before comparison");
        seen.add(x.md_m);
        const matches = b.results.filter((y) => y.md_m === x.md_m);
        if (matches.length > 1) throw Error("Duplicate MD in version B");
        const y = matches[0];
        if (y) {
          if (x.to_md_m !== y.to_md_m)
            throw Error("Interval endpoints must match before comparison");
          if (x.unit !== y.unit || x.quantity !== y.quantity)
            throw Error("External result quantities and units must match");
          for (const k of keys) {
            if (typeof y[k] === "number")
              out.push({
                md_m: x.md_m,
                quantity: k,
                version_a: x[k],
                version_b: y[k],
                difference_b_minus_a: y[k] - x[k],
              });
          }
        }
      }
      if (!out.length)
        throw Error("No matching numeric quantities at common MD");
      $("study-comparison").innerHTML = table(out);
    } catch (e) {
      $("study-comparison").textContent = e.message;
    }
  };
  $("study-report-html").onclick = () => {
    if (!preview) return;
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>${esc(preview.name)}</title><style>body{font:15px/1.6 Georgia,serif;max-width:1100px;margin:40px auto;padding:24px;color:#35251d;background:#fffdf8}h2,h3{font-family:Segoe UI,sans-serif}table{border-collapse:collapse;width:100%;font:12px Segoe UI,sans-serif}td,th{padding:8px;border-bottom:1px solid #d9cbbc;text-align:left}.tablebox{overflow:auto}.study-plot{width:100%}.report-prose,pre{white-space:pre-wrap;overflow-wrap:anywhere}.report-cover img{display:none}.eyebrow{color:#a6502d}summary{cursor:pointer}@media print{details,details>*{display:block}table{font-size:9px}}</style><body>${reportMarkup(preview)}</body></html>`;
    download("WellScope-study-report.html", html, "text/html");
  };
  $("study-report-print").onclick = () => {
    document.body.classList.add("printing-study");
    window.print();
    document.body.classList.remove("printing-study");
  };
  $("study-search").oninput = renderLibrary;
  $("study-back").onclick = $("casebook-new").onclick = () => jump("studies");
  $("home-import").onclick = () => jump("dataqc");
  $("study-help").onclick = () => jump("methodology");
  $("home-demo").onclick = protect(() => {
    openStudy("mse");
    example();
  });
  for (const id of [
    "study-name",
    "study-source",
    "study-quality",
    "study-basis",
    "study-reference",
    "study-well",
    "study-run-context",
    "study-depths",
    "study-coefficients",
  ])
    $(id).addEventListener("input", dirty);
  window.addEventListener("wellscope:change", () => {
    if (selected.processor === "sensitivity") dirty();
    stats();
  });
  window.addEventListener("wellscope:project-loaded", () => {
    const previousPage =
      document.querySelector(".page.active")?.id || "studies";
    preview = null;
    openStudy(selected.id);
    casebook();
    $("study-report-preview").textContent =
      "Open a saved report from this project.";
    $("study-report-html").disabled = $("study-report-print").disabled = true;
    $("study-revise").disabled = true;
    $("study-comparison").replaceChildren();
    jump(previousPage === "study" ? "studies" : previousPage);
  });
  $("report-guide").innerHTML = catalog
    .map(
      (s) =>
        `<article class="panel"><span class="eyebrow">${s.group} · ${s.phase}</span><h2>${s.title}</h2><p>${s.purpose}</p><h3>Required inputs</h3><ul>${s.requirements.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><h3>Read the result as</h3><p>${s.outputs.join("; ")}.</p><div class="model-note">${s.limitation}</div><button class="smallbutton" data-start="${s.id}">Open study →</button></article>`,
    )
    .join("");
  $("report-guide")
    .querySelectorAll("[data-start]")
    .forEach((b) => (b.onclick = () => openStudy(b.dataset.start)));
  // The final theme follows injected styles from the legacy analysis modules.
  const theme = document.createElement("link");
  theme.rel = "stylesheet";
  theme.href = "studio.css";
  document.head.append(theme);
  renderLibrary();
  stats();
  openStudy("mse");
  jump("studies");
  window.StudyWorkspace = { open: openStudy, getCurrent: () => current };
})();
