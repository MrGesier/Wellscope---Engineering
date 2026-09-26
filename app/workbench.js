/* v0.4.2 evidence workbench, extending the preserved offline Alpha UI. */
(() => {
  "use strict";
  const C = WellCore,
    A = WellApp,
    $ = (id) => document.getElementById(id),
    esc = (s) =>
      String(s ?? "").replace(
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
  let project = C.createProject("SYNTHETIC"),
    inputKey = "",
    dirty = false,
    selectedEvent = null,
    invalidReason = "";
  const modules = [
    ["limits", "Limits & Alert Register"],
    ["dataqc", "Data & QC"],
    ["directional", "Directional Response Lab"],
    ["cuttings", "Cuttings & Particle Size"],
    ["dynamics", "Drilling Dynamics"],
    ["science", "Help & Science"],
  ];
  const style = document.createElement("style");
  style.textContent = `.workform{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:14px}.workform label{display:grid;gap:6px;color:#b4c9d5}.workform input,.workform select,.workform textarea{width:100%;box-sizing:border-box}.work-json{width:100%;min-height:220px;font:13px Consolas,monospace;padding:14px;background:#0d1e2e;color:#d3e9ee;border:1px solid #355269;border-radius:8px;box-sizing:border-box}.workresult{white-space:pre-wrap;overflow-wrap:anywhere;color:#c5dbe5;max-height:500px;overflow:auto}.axisbar{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0;padding:12px;background:#102a38;border:1px solid #315266;border-radius:8px}.eventbutton{display:block;text-align:left;width:100%;margin:8px 0;padding:14px;background:#1a2b39;color:#e0e9ef;border:1px solid #6a5843;border-radius:7px;cursor:pointer}.eventbutton:focus{outline:3px solid #31566e}.work-note{color:#a6c0cf;font-size:13px;line-height:1.6}.work-toolbar{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}.work-error{color:#ffb5a8;min-height:22px}.work-svg{width:100%;height:230px;background:#0b1b2a}.work-assets{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}.work-assets button{background:#112635;color:#c7dae4;border:1px solid #355166;border-radius:6px}.work-assets img{width:100%;height:48px}.workform button{align-self:end} @media print{.sidebar,.top,.work-toolbar{display:none!important}.page{display:none!important}#report{display:block!important}.workresult{max-height:none}.workspace{margin:0!important}.panel{break-inside:avoid}.axisbar{color:black}}`;
  document.head.append(style);
  const box = (title, content) =>
    `<article class="panel"><div class="panel-title"><h2>${title}</h2></div>${content}</article>`;
  for (const [id, title] of modules) {
    const b = document.createElement("button");
    b.className = "nav";
    b.dataset.page = id;
    b.textContent = title;
    b.onclick = () => {
      document
        .querySelectorAll(".page")
        .forEach((p) => p.classList.toggle("active", p.id === id));
      document
        .querySelectorAll(".nav")
        .forEach((n) => n.classList.toggle("active", n === b));
      $("crumb").textContent = title.toUpperCase();
    };
    $("navigation").append(b);
    const s = document.createElement("section");
    s.id = id;
    s.className = "page";
    s.innerHTML = `<div class="page-head"><div><div class="eyebrow">EVIDENCE WORKBENCH / ${C.version}</div><h1>${title}</h1></div><span class="tag">DRAFT · REVIEW DISABLED</span></div>`;
    document.querySelector(".content").append(s);
  }
  const axes = document.createElement("div");
  axes.className = "axisbar";
  axes.id = "evidence-axes";
  document.querySelector(".notice").after(axes);
  function field(id, label, type = "text", value = "") {
    return `<label>${label}<input id="${id}" type="${type}" value="${esc(value)}" step="any"></label>`;
  }
  function select(id, label, values) {
    return `<label>${label}<select id="${id}">${values.map((v) => `<option value="${esc(v)}">${esc(v || "All")}</option>`).join("")}</select></label>`;
  }
  function action(id, fn) {
    $(id).onclick = async () => {
      try {
        $("work-error").textContent = "";
        await fn();
      } catch (e) {
        $("work-error").textContent = e.message;
      }
    };
  }
  const error = document.createElement("div");
  error.id = "work-error";
  error.className = "work-error";
  error.setAttribute("role", "alert");
  axes.after(error);
  function output(id, value) {
    $(id).textContent =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }
  function download(name, value, type = "application/json") {
    const blob = new Blob(
        [typeof value === "string" ? value : JSON.stringify(value, null, 2)],
        { type },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function touch() {
    project.revision++;
    dirty = true;
    refresh();
  }
  function snapshot() {
    const { state, derived } = A.snapshot();
    project.bha = derived.bha.elements;
    project.wells = [
      ["REFERENCE", derived.ref],
      ["OFFSET A", derived.off],
      ["OFFSET B", derived.offB],
      ["SIDETRACK", derived.side],
    ].map(([id, stations]) => ({
      ...project.wells.find(w=>w.id===id),
      id,
      reference: project.reference,
      wellbores: [
        {
          ...project.wells.find(w=>w.id===id)?.wellbores?.[0],
          id,
          sections:id==="REFERENCE"?state.sections||[]:project.wells.find(w=>w.id===id)?.wellbores?.[0]?.sections||[],
          hole_sections:id==="REFERENCE"?state.hole_sections||[]:[],
          bit_depth_m:id==="REFERENCE"?(state.bitMD??stations.at(-1).md):stations.at(-1).md,
          planned_actual: project.wells.find(w=>w.id===id)?.wellbores?.[0]?.planned_actual||"PLAN",
          parent_wellbore_id: id === "SIDETRACK" ? "REFERENCE" : null,
          tie_in_parent_md: id === "SIDETRACK" ? state.tieInMD || 2000 : null,
          surveys: stations,
        },
      ],
    }));
    return { ...project, legacy: state };
  }
  function refresh() {
    axes.textContent = `Project ${project.id} · revision ${project.revision} | Data: ${project.mode === "SYNTHETIC" ? "SYNTHETIC" : "IMPORTED_UNCHECKED"} | Model: PRELIMINARY_UNVERIFIED | Limits: ${dirty ? "NOT_EVALUABLE (results stale)" : project.limits.length ? "configured; see per-value evaluations" : "NOT_CONFIGURED"} | Review: DRAFT (disabled)`;
  }
  window.addEventListener("wellscope:change", () => {
    if (invalidReason) {
      document
        .querySelectorAll("canvas")
        .forEach((c) => c.getContext("2d").clearRect(0, 0, c.width, c.height));
      for (const id of [
        "k-md",
        "k-tvd",
        "k-dls",
        "k-sep",
        "ac-min",
        "ac-depth",
        "td-pu",
        "td-so",
        "td-st",
      ])
        $(id).textContent = "—";
    }
    const state = A.snapshot().state;
    delete state.select;
    delete state.focus;
    delete state.location;
    const key = C.canonical(state);
    if (key !== inputKey) {
      if (inputKey) touch();
      inputKey = key;
    }
    refresh();
  });
  window.addEventListener("wellscope:valid", () => {
    invalidReason = "";
  });
  window.addEventListener("wellscope:invalid", (e) => {
    invalidReason = e.detail;
    dirty = true;
    refresh();
    $("work-error").textContent = "NOT EVALUABLE: " + e.detail;
    document
      .querySelectorAll("canvas")
      .forEach((c) => c.getContext("2d").clearRect(0, 0, c.width, c.height));
  });
  $("limits").insertAdjacentHTML(
    "beforeend",
    box(
      "Source-backed rule",
      `<p class="work-note">No real-data defaults. “Within” means only within a configured numeric rule. Revision history is retained.</p><div class="workform">${field("lim-id", "Rule ID", "text", "rule-1")}${select("lim-metric", "Metric", ["hookload_measured", "axial_string_top_est", "dls", "inclination", "azimuth", "offset_centerline_clearance", "wob", "rpm_surface", "flow", "spp", "surface_torque_measured", "cuttings_coarse_fraction"])}${select("lim-op", "Operator", [">", ">=", "<", "<=", "outside_band"])}${field("lim-warn", "Warning / band minimum", "number")}${field("lim-critical", "Critical / band maximum (optional)", "number")}${select("lim-unit", "Unit", Object.keys(C.units))}${field("lim-source", "Source document / URI and revision")}${field("lim-from", "From MD (m)", "number", 0)}${field("lim-to", "To MD (m)", "number", 4200)}${select("lim-operation", "Operation", ["", "PUW", "SOW", "STATIC", "FRW", "DRILL"])}${select("lim-well", "Wellbore", ["", "REFERENCE", "OFFSET A", "OFFSET B", "SIDETRACK"])}${field("lim-component", "Component ID (optional)")}</div><div class="work-toolbar"><button class="primary" id="save-limit">Save new rule revision</button><button class="smallbutton" id="demo-limit">Load synthetic LIM-01 example</button><button class="smallbutton" id="run-limits">Evaluate current inputs</button></div><pre class="workresult" id="limit-catalog"></pre>`,
    ) +
      box(
        "Event register · select to link depth, plot and inspector",
        `<div id="event-register"></div><pre id="event-inspector" class="workresult"></pre>`,
      ),
  );
  $("lim-unit").value = "kN";
  action("save-limit", () => {
    const r = C.validateLimit({
      id: $("lim-id").value.trim(),
      metric: $("lim-metric").value,
      operator: $("lim-op").value,
      warning: C.number($("lim-warn").value),
      critical:
        $("lim-critical").value === ""
          ? null
          : C.number($("lim-critical").value),
      unit: $("lim-unit").value,
      source: $("lim-source").value.trim(),
      revision:
        1 +
        Math.max(
          0,
          ...project.limits
            .filter((r) => r.id === $("lim-id").value)
            .map((r) => r.revision),
        ),
      md_from: C.number($("lim-from").value),
      md_to: C.number($("lim-to").value),
      operation: $("lim-operation").value,
      wellbore: $("lim-well").value,
      component: $("lim-component").value,
      data: project.mode === "SYNTHETIC" ? "SYNTHETIC" : "USER_ENTERED",
      active: true,
    });
    project.limits
      .filter((old) => old.id === r.id)
      .forEach((old) => (old.active = false));
    project.limits.push(r);
    touch();
    output("limit-catalog", project.limits);
  });
  action("demo-limit", () => {
    if (project.mode !== "SYNTHETIC")
      throw Error("Synthetic rules are available only in a synthetic project");
    project.limits.push({
      id: "LIM-01-DEMO",
      data: "SYNTHETIC",
      revision: 1,
      metric: "hookload_measured",
      operator: ">",
      warning: 140,
      critical: 160,
      unit: "kN",
      source: "Independent synthetic training example; not an equipment limit",
      md_from: 0,
      md_to: 4200,
      active: true,
    });
    project.measurements.push({
      id: "DEMO-145",
      metric: "hookload_measured",
      value: 145,
      unit: "kN",
      md: Math.min(3450, A.snapshot().derived.ref.at(-1).md),
      wellbore: "REFERENCE",
      operation: "PUW",
      source: "Synthetic unit-test observation",
      data: "SYNTHETIC",
      model: "ILLUSTRATIVE",
    });
    touch();
    output("limit-catalog", project.limits);
    evaluate();
  });
  function evaluate() {
    if (invalidReason) throw Error("NOT EVALUABLE: " + invalidReason);
    const { derived: d } = A.snapshot();
    const measurements = [
      ...project.cuttings_samples.flatMap((s) => {
        const r = C.psd(s);
        return r.coarse_fraction_percent == null
          ? []
          : [
              {
                metric: "cuttings_coarse_fraction",
                value: r.coarse_fraction_percent,
                unit: "percent",
                md: s.source_md_from,
                wellbore: s.wellbore || "REFERENCE",
                data: s.quality,
                model: "PRELIMINARY_UNVERIFIED",
                source: s.provenance,
              },
            ];
      }),
      ...project.measurements,
      ...["pooh", "rih", "static"].map((mode, i) => ({
        metric: "axial_string_top_est",
        value: d.td[mode].stringTopAxialForce,
        unit: "N",
        md: d.td[mode].rows.at(-1).md,
        operation: ["PUW", "SOW", "STATIC"][i],
        wellbore: "REFERENCE",
        data: project.mode === "SYNTHETIC" ? "SYNTHETIC" : "USER_ENTERED",
        model: "PRELIMINARY_UNVERIFIED",
      })),
      ...d.ref.flatMap((p) =>
        [
          ["dls", "dls", "deg/30m"],
          ["inclination", "inc", "deg"],
          ["azimuth", "azi", "deg"],
        ].map(([metric, key, unit]) => ({
          metric,
          value: p[key],
          unit,
          md: p.md,
          wellbore: "REFERENCE",
          data:
            project.mode === "SYNTHETIC" ? "SYNTHETIC" : "IMPORTED_UNCHECKED",
          model: "PRELIMINARY_UNVERIFIED",
        })),
      ),
    ];
    const run = {
      id: "run-" + (project.model_runs.length + 1),
      solver: "limits",
      version: C.version,
      project_revision: project.revision,
      inputs: measurements,
      limits: project.limits.filter((r) => r.active),
      run_time: new Date().toISOString(),
    };
    const events = run.limits
      .flatMap((r) =>
        C.evaluateSeries(
          r,
          measurements.filter((m) => m.metric === r.metric),
        ),
      )
      .map((e, i) => ({
        ...e,
        id: run.id + "-" + i,
        run_id: run.id,
        project_revision: project.revision,
      }));
    run.outputs = events;
    C.fingerprint({
      inputs: run.inputs,
      limits: run.limits,
      version: run.version,
    }).then((hash) => {
      run.input_hash = hash;
    });
    project.model_runs.push(run);
    project.events.push(...events);
    dirty = false;
    A.setEvidence(project.limits);
    $("event-register").replaceChildren();
    for (const e of events) {
      const b = document.createElement("button");
      b.className = "eventbutton";
      b.textContent = `${e.status} · ${e.metric} · ${e.value ?? "—"} ${e.unit ?? ""} · ${e.md ?? "—"} mMD · ${e.wellbore ?? "all"} · ${e.limit_id} rev ${e.limit_revision}`;
      b.onclick = () => {
        selectedEvent = e;
        output("event-inspector", e);
        if (Number.isFinite(e.md))
          A.selectLocation({
            wellbore: e.wellbore || "REFERENCE",
            md: e.md,
            component: e.component,
          });
        output("event-inspector", e);
      };
      $("event-register").append(b);
    }
    if (!events.length)
      $("event-register").textContent =
        "No applicable observations. Limits are not evaluated.";
    refresh();
  }
  action("run-limits", evaluate);
  const sampleDirectional = {
    id: "SYNTHETIC-DIR-1",
    quality: "SYNTHETIC",
    source: "Independent synthetic geometry example",
    bit_nominal_diameter_m: 0.216,
    caliper_diameter_m: 0.225,
    max_pad_diameter_m: 0.221,
    md_from: 2700,
    md_to: 3050,
    nbs_distance_m: 1.5,
    observations: [],
    external_curves: [],
  };
  $("directional").insertAdjacentHTML(
    "beforeend",
    box(
      "Case geometry and externally supplied response",
      `<p class="work-note">Hole overgauge is a diameter difference. It is unrelated to cuttings particle size. No predictive BUR/TUR, contact force, bit tilt or bending solver is enabled. Curves must remain labelled OBSERVED or EXTERNAL_MODEL with their original source.</p><textarea id="directional-json" class="work-json" aria-label="Directional case JSON"></textarea><div class="work-toolbar"><button id="dir-evaluate" class="primary">Validate and store case</button><button id="dir-demo" class="smallbutton">Synthetic geometry example</button></div><pre id="directional-result" class="workresult">NOT COMPUTED — load source-labelled case data.</pre>`,
    ),
  );
  $("directional-json").value = JSON.stringify(
    {
      quality: "IMPORTED_UNCHECKED",
      source: "",
      bit_nominal_diameter_m: null,
      caliper_diameter_m: null,
      max_pad_diameter_m: null,
    },
    null,
    2,
  );
  action("dir-demo", () => {
    if (project.mode !== "SYNTHETIC")
      throw Error("Use a synthetic project for demo examples");
    $("directional-json").value = JSON.stringify(sampleDirectional, null, 2);
  });
  action("dir-evaluate", () => {
    const c = JSON.parse($("directional-json").value);
    for (const curve of c.external_curves || [])
      if (
        !["OBSERVED", "EXTERNAL_MODEL"].includes(curve.kind) ||
        !curve.source ||
        !curve.revision
      )
        throw Error("External curves require kind, source and revision");
    const result = C.directional(c);
    project.directional_response_cases.push(c);
    touch();
    output("directional-result", result);
    if (Number.isFinite(c.md_from))
      A.selectLocation({
        wellbore: c.wellbore || "REFERENCE",
        md: c.md_from,
        to: c.md_to,
      });
  });
  const samplePSD = {
    id: "SYNTHETIC-PSD-1",
    quality: "SYNTHETIC",
    provenance: "Independent synthetic sieve sample",
    collection_point: "Shaker discharge",
    method: "Dry sieve",
    weighting_basis: "dry_mass",
    wet_dry: "dry",
    calibration_valid: true,
    recovery_complete: true,
    censored: false,
    collection_time_start_utc: "2026-01-01T12:00:00Z",
    collection_time_end_utc: "2026-01-01T12:05:00Z",
    sampling_screen_aperture_mm: 0.15,
    lag_model: "Synthetic constant transit-time illustration",
    lag_uncertainty: "± 3 minutes; source MD ± 15 m",
    source_md_from: 2700,
    source_md_to: 2750,
    bins: [
      { lower_mm: 0.125, upper_mm: 0.25, mass_kg: 0.1 },
      { lower_mm: 0.25, upper_mm: 0.5, mass_kg: 0.2 },
      { lower_mm: 0.5, upper_mm: 1, mass_kg: 0.4 },
      { lower_mm: 1, upper_mm: 2, mass_kg: 0.3 },
    ],
  };
  $("cuttings").insertAdjacentHTML(
    "beforeend",
    box(
      "Surface sample · QC, sieve masses and lag interval",
      `<p class="work-note">Separate mass-weighted sieve data from count/area distributions. Percentiles require bracketed calibrated dry-mass bins and complete recovery. Lag uncertainty and screen selection remain visible; these data cannot diagnose instability or predict directional response.</p><textarea id="psd-json" class="work-json" aria-label="Cuttings sample JSON"></textarea><div class="work-toolbar"><button id="psd-evaluate" class="primary">Validate and plot sample</button><button id="psd-demo" class="smallbutton">Synthetic sample example</button></div><svg id="psd-chart" class="work-svg" viewBox="0 0 700 230" role="img" aria-label="Cumulative dry-mass passing distribution"></svg><pre id="psd-result" class="workresult">NOT ESTIMABLE — no sample data.</pre>`,
    ),
  );
  $("psd-json").value = JSON.stringify(
    {
      quality: "IMPORTED_UNCHECKED",
      weighting_basis: "dry_mass",
      wet_dry: "dry",
      bins: [],
    },
    null,
    2,
  );
  action("psd-demo", () => {
    if (project.mode !== "SYNTHETIC")
      throw Error("Use a synthetic project for demo examples");
    $("psd-json").value = JSON.stringify(samplePSD, null, 2);
  });
  action("psd-evaluate", () => {
    const s = JSON.parse($("psd-json").value),
      r = C.psd(s);
    project.cuttings_samples.push(s);
    touch();
    output("psd-result", r);
    $("psd-chart").replaceChildren();
    if (r.rows) {
      const max = r.rows.at(-1).upper_mm,
        pts = r.rows
          .map(
            (b) =>
              `${50 + (600 * b.upper_mm) / max},${190 - 160 * b.cumulative_passing}`,
          )
          .join(" ");
      $("psd-chart").innerHTML =
        `<path d="M50 20V190H660" stroke="#809ba9" fill="none"/><polyline points="${pts}" stroke="#31566e" fill="none" stroke-width="3"/><text x="60" y="25" fill="#526e80">Cumulative passing (%) · dry mass</text><text x="430" y="218" fill="#526e80">Particle size (mm), linear axis</text><text x="10" y="35" fill="#526e80">100</text><text x="30" y="193" fill="#526e80">0</text><text x="640" y="205" fill="#526e80">${max}</text>`;
      if (r.interval)
        A.selectLocation({
          wellbore: s.wellbore || "REFERENCE",
          md: r.interval[0],
          to: r.interval[1],
        });
    }
  });
  $("dataqc").insertAdjacentHTML(
    "beforeend",
    box(
      "Project and local imports",
      `<div class="workform">${field("project-name", "Project ID", "text", "local-project")}${select("project-mode", "Mode", ["SYNTHETIC", "USER_DATA"])}</div><div class="work-toolbar"><button id="new-project" class="primary">Create empty evidence project</button><button id="save-project-v4" class="smallbutton">Export project backup</button><label class="filebtn">Import project JSON<input id="load-project-v4" type="file" accept=".json" hidden></label></div><p class="work-note">Creating a USER_DATA evidence project removes demo limits, observations and results. Existing geometry is retained and remains synthetic until replaced by your surveys. Import never marks observations QC-passed automatically.</p><h3>Reference metadata</h3><textarea id="reference-json" class="work-json" aria-label="Per-well reference metadata"></textarea><button id="apply-references" class="smallbutton">Validate shared reference</button><h3>Historical channel CSV</h3><p class="work-note">Explicit headers: timestamp_utc, md, metric, value, unit, operation, wellbore, source. UTC must include Z. No ambiguous channel mapping. Imported rows remain IMPORTED_UNCHECKED and comparisons are blocked.</p><textarea id="measurements-csv" class="work-json" aria-label="Historical measurements CSV">timestamp_utc,md,metric,value,unit,operation,wellbore,source</textarea><button id="import-measurements" class="primary">Validate and import CSV</button><pre id="data-result" class="workresult"></pre>`,
    ),
  );
  $("reference-json").value = JSON.stringify(
    Object.fromEntries(
      ["REFERENCE", "OFFSET A", "OFFSET B", "SIDETRACK"].map((id) => [
        id,
        { ...project.reference },
      ]),
    ),
    null,
    2,
  );
  action("apply-references", () => {
    const refs = JSON.parse($("reference-json").value);
    if (
      !["REFERENCE", "OFFSET A", "OFFSET B", "SIDETRACK"].every((id) =>
        C.compatible(refs.REFERENCE, refs[id]),
      )
    ) {
      window.dispatchEvent(
        new CustomEvent("wellscope:invalid", {
          detail: "INCOMPATIBLE REFERENCE — NO SCAN",
        }),
      );
      throw Error("INCOMPATIBLE REFERENCE — NO SCAN");
    }
    A.load({ references: refs });
    project.reference = refs.REFERENCE;
    invalidReason = "";
    touch();
    output(
      "data-result",
      "Compatible declared reference. No geodetic transform was performed.",
    );
  });
  action("new-project", () => {
    invalidReason = "";
    const priorReference = project.reference;
    project = C.createProject($("project-mode").value);
    project.reference = priorReference;
    project.id = $("project-name").value.trim() || "local-project";
    dirty = false;
    $("event-register").replaceChildren();
    output("limit-catalog", []);
    output(
      "data-result",
      "New evidence project. Replace synthetic trajectory inputs before interpreting user data.",
    );
    refresh();
    A.setEvidence([]);
    window.dispatchEvent(new CustomEvent("wellscope:project-loaded"));
  });
  action("import-measurements", () => {
    const rows = C.csv($("measurements-csv").value),
      seen = new Set();
    const normalized = rows.map((r, i) => {
      if (
        !r.timestamp_utc?.endsWith("Z") ||
        !Number.isFinite(Date.parse(r.timestamp_utc))
      )
        throw Error("UTC timestamp required on row " + (i + 2));
      if (
        !r.source ||
        !r.metric ||
        !r.wellbore ||
        !r.operation ||
        !C.units[r.unit]
      )
        throw Error(
          "Missing source, metric, wellbore, operation or valid units",
        );
      const key = r.wellbore + "|" + r.timestamp_utc + "|" + r.metric;
      if (seen.has(key)) throw Error("Duplicate channel timestamp");
      seen.add(key);
      return {
        ...r,
        id: "import-" + i,
        md: C.number(r.md),
        value: C.number(r.value),
        data: "IMPORTED_UNCHECKED",
        model: "PRELIMINARY_UNVERIFIED",
      };
    });
    project.measurements.push(...normalized);
    touch();
    output("data-result", normalized);
  });
  function fingerprintInputs(p) {
    return Object.fromEntries([
      'legacy', 'reference', 'wells', 'bha', 'measurements', 'limits',
      'directional_response_cases', 'cuttings_samples', 'completion_intervals',
      'external_motor_curves', 'matched_weight_comparisons', 'measured_spectrum',
      'observed_directional_intervals', 'study_runs', 'engineering_cases', 'directional_sensitivity_runs'
    ].map(key => [key, p[key] ?? null]));
  }
  async function exportProject() {
    if (invalidReason)
      throw Error("Cannot export current calculations: " + invalidReason);
    const p = snapshot();
    p.input_hash = await C.fingerprint(fingerprintInputs(p));
    download("WellScope-v042-project.json", p);
  }
  action("save-project-v4", exportProject);
  $("btnsave").onclick = $("exportjson").onclick = () =>
    exportProject().catch((e) => {
      $("work-error").textContent = e.message;
    });
  $("btnload").onclick = () => $("load-project-v4").click();
  function loadProject(p) {
      if (
        p.schema_version !== C.version ||
        !p.legacy ||
        !["SYNTHETIC", "USER_DATA"].includes(p.mode)
      )
        throw Error("Expected v0.4.2 project backup");
      for (const k of [
        "limits",
        "events",
        "model_runs",
        "measurements",
        "directional_response_cases",
        "cuttings_samples",
      ])
        if (!Array.isArray(p[k]))
          throw Error("Missing project collection " + k);
      p.limits.forEach(C.validateLimit);
      if (
        !C.compatible(p.reference, p.reference) ||
        !Array.isArray(p.wells) ||
        p.wells.length !== 4 ||
        p.wells.some((w) => !C.compatible(p.reference, w.reference))
      )
        throw Error("INCOMPATIBLE REFERENCE — NO SCAN");
      if (
        p.mode === "USER_DATA" &&
        p.limits.some((r) => r.active && r.data === "SYNTHETIC")
      )
        throw Error("Real projects cannot inherit active demo thresholds");
      A.load({
        ...p.legacy,
        references: Object.fromEntries(p.wells.map((w) => [w.id, w.reference])),
      });
      project = p;
      invalidReason = "";
      dirty = true;
      A.setEvidence([]);
      output("limit-catalog", project.limits);
      $("event-register").replaceChildren();
      refresh();
      output(
        "data-result",
        "Imported; stored results are historical. Re-evaluate current inputs.",
      );

window.dispatchEvent(new CustomEvent("wellscope:project-loaded"));
}
  $("load-project-v4").onchange = async (e) => {try {loadProject(JSON.parse(await e.target.files[0].text()));}catch(err){$("work-error").textContent=err.message;}e.target.value="";};
  $("td").insertAdjacentHTML(
    "afterbegin",
    box(
      "Selected bit depth",
      `<div class="workform">${field("bit-md-v4", "Bit MD (m)", "number", A.snapshot().derived.ref.at(-1).md)}<button id="set-bit-md" class="primary">Recalculate at bit depth</button></div><p class="work-note">Pickup / slackoff / static string-top axial screening. Measured surface hookload is a separate channel. Rig tare absent: hookload NOT COMPUTED; torque NOT COMPUTED.</p>`,
    ),
  );
  action("set-bit-md", () => A.setBitMD(C.number($("bit-md-v4").value)));
  $("bha").insertAdjacentHTML(
    "beforeend",
    box(
      "Motor performance · source table only",
      `<p class="work-note">Enter source, revision, quality, test conditions {mud, temperature_c} and increasing points [{flow, rpm}]. Flow is m³/s. Interpolation is limited to the supplied domain and exact test conditions. Continuous/stall ratings remain user-supplied metadata, never inferred from dimensions.</p><textarea id="motor-json" class="work-json" aria-label="Motor vendor curve JSON">null</textarea><div class="workform">${field("motor-flow", "Flow (m³/s)", "number")}${field("motor-mud", "Mud type")}${field("motor-temp", "Temperature (°C)", "number")}<button id="motor-evaluate" class="primary">Interpolate shaft RPM</button></div><pre id="motor-result" class="workresult">NOT COMPUTED — vendor curve missing.</pre>`,
    ),
  );
  action("motor-evaluate", () =>
    output(
      "motor-result",
      C.motor(
        JSON.parse($("motor-json").value),
        C.number($("motor-flow").value),
        {
          mud: $("motor-mud").value,
          temperature_c: C.number($("motor-temp").value),
        },
      ),
    ),
  );
  $("dynamics").insertAdjacentHTML(
    "beforeend",
    box(
      "Scientific release gates",
      `<p>NOT COMPUTED: natural frequencies, critical speeds, stick-slip predictions, bending, buckling and fatigue.</p><p class="work-note">Measured frequency analysis is available below for source-labelled, quality-checked uniform channels. No independently benchmarked dynamics solver is enabled. Surface RPM does not establish downhole shaft RPM. No safe RPM recommendation is generated.</p>`,
    ),
  );
  $("science").insertAdjacentHTML(
    "beforeend",
    box(
      "Model ledger and glossary",
      `<dl><dt>MD / TVD</dt><dd>Measured depth follows the string path; true vertical depth follows the declared vertical datum.</dd><dt>Trajectory</dt><dd>Minimum-curvature survey stations. Between stations, geometry is represented by straight segments; segment proximity uses that same representation. Input QC rejects missing fields and non-increasing MD.</dd><dt>Geometry-only proximity</dt><dd>Finite segment-pair Euclidean distance. No survey covariance, separation factor or probabilistic anticollision result. Shared parent geometry is one hole.</dd><dt>String-top axial force</dt><dd>Segmented buoyed-weight and friction screening; no rig block tare, torque, stiffness or operational envelope. PRELIMINARY_UNVERIFIED.</dd><dt>Hole overgauge</dt><dd>Caliper diameter minus nominal bit diameter, metres. Not particle size.</dd><dt>Particle-size distribution</dt><dd>Normalized measured dry sieve mass and cumulative passing. Log-size interpolation only inside bracketed bins. Surface transport, shaker selection and lag uncertainty limit interpretation.</dd><dt>Review</dt><dd>Human review is disabled. Acknowledging an event is not approval. All reports are drafts.</dd></dl><p>Source references and validation evidence are documented in docs/MODEL_LEDGER.md and docs/SCIENCE_VALIDATION.md in the distribution.</p>`,
    ),
  );
  const appendix = document.createElement("article");
  appendix.className = "panel";
  appendix.innerHTML =
    '<h2>Reproducibility appendix</h2><button id="build-report-v4" class="primary">Build report appendix</button><button id="export-events-v4" class="smallbutton">Export event CSV</button><pre id="report-v4" class="workresult">Generate appendix before printing.</pre>';
  $("report").append(appendix);
  async function report() {
    if (invalidReason) throw Error("Report blocked: " + invalidReason);
    const p = snapshot(),
      hash = await C.fingerprint(fingerprintInputs(p));
    const result = {
      application: "WellScope " + C.version,
      project: p.id,
      revision: p.revision,
      mode: p.mode,
      review: "DRAFT",
      generated_utc: new Date().toISOString(),
      input_sha256: hash,
      result_state: dirty
        ? "STALE — NOT EVALUABLE"
        : "Current evaluation snapshot",
      reference: p.reference,
      uncertainty: "ABSENT; illustrative demo ellipses only",
      limits: p.limits,
      events: p.events,
      models: p.model_runs,
      cuttings: p.cuttings_samples,
      directional: p.directional_response_cases,
      completion_intervals: p.completion_intervals || [],
      vendor_tables: p.external_motor_curves || [],
      matched_weights: p.matched_weight_comparisons || null,
      measured_spectrum: p.measured_spectrum || null,
      observed_directional_intervals: p.observed_directional_intervals || [],
      studies: p.study_runs || [],
      engineering_cases: p.engineering_cases || [],
      directional_sensitivity_runs: p.directional_sensitivity_runs || [],
      missing: [
        "ISCWSA covariance / named-rule scan",
        "stiff-string, torque, stress, dynamics",
        "predictive BUR/TUR",
        "human approval",
      ],
      selected_location: A.snapshot().state.location,
      source_registry: [
        ...new Set(
          [
            ...p.limits.map((x) => x.source),
            ...p.measurements.map((x) => x.source),
            ...p.directional_response_cases.map((x) => x.source),
            ...p.cuttings_samples.map((x) => x.provenance),
            ...(p.completion_intervals || []).map((x) => x.source),
            ...(p.external_motor_curves || []).map((x) => x.curve.source),
          ].filter(Boolean),
        ),
      ],
    };
    output("report-v4", result);
    return result;
  }
  action("build-report-v4", report);
  $("printreport").onclick = async () => {
    try {
      await report();
      $("build-report-v4").click();
      A.navigate("report");
      window.print();
    } catch (e) {
      $("work-error").textContent = e.message;
    }
  };
  action("export-events-v4", () => {
    const keys = [
      "id",
      "metric",
      "status",
      "value",
      "unit",
      "md",
      "wellbore",
      "limit_id",
      "limit_revision",
      "source",
      "project_revision",
    ];
    download(
      "WellScope-events.csv",
      [
        keys.join(","),
        ...project.events.map((e) =>
          keys
            .map((k) => '"' + String(e[k] ?? "").replaceAll('"', '""') + '"')
            .join(","),
        ),
      ].join("\r\n"),
      "text/csv",
    );
  });
  window.WellEvidence = { project: () => project, changed: touch, snapshot, loadProject, status:()=>({dirty,invalidReason}) };
  refresh();
})();
