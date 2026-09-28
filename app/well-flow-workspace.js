/* A single preparation -> calculation -> depth inspection workflow. */
(() => {
  const $ = (id) => document.getElementById(id),
    H = EngineeringCharts,
    esc = H.esc,
    copy = (x) => structuredClone(x);
  let cached = null,
    base = null,
    baseline = {},
    busy = false,
    cancelled = false,
    dashboard = null,
    dashboardSurvey = null,
    inspectionFrame = null;
  const depthCache = new Map();
  const page = document.createElement("section");
  page.id = "well-setup";
  page.className = "page";
  const field = (id, label, value = "") =>
    `<label>${label}<input id="wf-${id}" type="number" step="any" value="${value}"></label>`;
  page.innerHTML = `<header class="wf-hero"><div><span class="eng-kicker">WELLSCOPE / WELL PREPARATION</span><h1>One well. One working study.</h1><p>Import the well, choose an assembly, then inspect the limits along the hole.</p><button id="wf-demo" class="primary">Try the complete example</button><button id="wf-new">New well</button><label class="filebtn">Open prepared study<input id="wf-import" type="file" accept=".json" hidden></label><p id="wf-quality">Your inputs stay on this device. Start below or load the fictional example.</p></div><div id="wf-preview"><div class="wf-strata"><span>Trajectory</span><span>Lithology</span><span>BHA</span></div></div></header><nav class="wf-steps" aria-label="Well preparation"><button data-wf-step="0">1 · Well & geology</button><button data-wf-step="1">2 · BHA</button><button data-wf-step="2">3 · Conditions</button></nav>
 <article class="panel wf-step" data-wf-panel="0"><h2>Define the well</h2><div class="workform"><label>Well name<input id="wf-name"></label><label>Input source / revision<input id="wf-source" placeholder="Survey, tally and drilling programme revision"></label></div><div class="wf-input-grid"><label>Survey · md,inc,azi (m, degrees)<textarea id="wf-survey" rows="8" placeholder="md,inc,azi&#10;0,0,0"></textarea><input data-wf-file="survey" type="file" accept=".csv"></label><label>Architecture · from_m,to_m,diameter_mm,kind<textarea id="wf-architecture" rows="8" placeholder="from_m,to_m,diameter_mm,kind&#10;0,1000,216,OPEN"></textarea><input data-wf-file="architecture" type="file" accept=".csv"></label></div><label>Lithology · from_m,to_m,lithology,source<textarea id="wf-lithology" rows="4" placeholder="Optional interpreted intervals; blanks remain unknown"></textarea><input data-wf-file="lithology" type="file" accept=".csv"></label><p>Architecture kinds: CASED or OPEN. All depths use the same MD origin. Unlogged intervals remain unknown.</p><button data-wf-next="1" class="primary">Continue to BHA →</button></article>
 <article class="panel wf-step" data-wf-panel="1" hidden><h2>Use your BHA or generate a starting assembly</h2><label>Assembly source<select id="wf-mode"><option value="existing">Use my tally</option><option value="starter">Generate and compare a starter BHA</option></select></label><fieldset id="wf-required"><legend>Required instruments / steering</legend>${["gamma", "mwd", "lwd", "rss"].map((k) => `<label><input id="wf-${k}" type="checkbox">${k.toUpperCase()}</label>`).join("")}</fieldset><div id="wf-tally-editor"><label>Complete tally, bit → surface<textarea id="wf-tally" rows="8" placeholder="name,type,length_m,od_mm,id_mm,contact_od_mm,kg_m,E_GPa,source,capabilities"></textarea><input data-wf-file="tally" type="file" accept=".csv"></label><button id="wf-builder">Use the assembly builder tally</button></div><p id="wf-starter-note" hidden>Creates assumed annular steel geometry, then compares stabilizer/jar placements. Tool dimensions, connections and ratings must be reviewed. This is a preliminary mechanical proposal; geology alone does not determine the correct BHA.</p><button data-wf-next="2" class="primary">Continue to conditions →</button></article>
 <article class="panel wf-step" data-wf-panel="2" hidden><h2>Set the proposed operating conditions</h2><div class="workform">${field("wobTf", "WOB target (tf)")}${field("rpm", "Rotation target (rpm)")}${field("ropMph", "ROP target (m/h)")}${field("flowLpm", "Flow target (L/min)")}${field("mudKgM3", "Mud density (kg/m³)")}${field("muOpen", "Open-hole friction")}${field("muCased", "Cased-hole friction")}</div><details><summary>BHA comparison objectives</summary><div class="workform">${field("build", "Maximum build (°/30 m)", 3)}${field("drop", "Maximum drop (°/30 m)", 3)}${field("dls", "Maximum DLS (°/30 m)", 4)}${field("samples", "Comparison depth stations", 7)}</div><p>Target = imported trajectory endpoint. Placement comparison minimizes sampled wall reaction within the mechanical shortlist, with bending as a tie-breaker. Objectives are not tool ratings.</p></details><p>Targets describe your proposed programme. Formation limits and source pressure/response profiles can be added in the section dashboard. Blank limits remain unknown.</p><button id="wf-prepare" class="primary">Prepare study & calculate →</button><button id="wf-cancel" disabled>Cancel</button></article><p id="wf-status" role="status"></p><p id="wf-error" role="alert"></p><div id="wf-comparison"></div>`;
  document.querySelector(".content").append(page);
  function step(n) {
    page
      .querySelectorAll("[data-wf-panel]")
      .forEach((el) => (el.hidden = Number(el.dataset.wfPanel) !== n));
    page
      .querySelectorAll("[data-wf-step]")
      .forEach((el) =>
        el.setAttribute(
          "aria-current",
          Number(el.dataset.wfStep) === n ? "step" : "false",
        ),
      );
  }
  page
    .querySelectorAll("[data-wf-step],[data-wf-next]")
    .forEach(
      (b) =>
        (b.onclick = () => step(Number(b.dataset.wfStep ?? b.dataset.wfNext))),
    );
  function mode() {
    $("wf-tally-editor").hidden = $("wf-mode").value === "starter";
    $("wf-starter-note").hidden = !$("wf-tally-editor").hidden;
  }
  $("wf-mode").onchange = mode;
  function dirty() {
    if (busy) return;
    cached = null;
    dashboard = null;
    $("wf-quality").textContent =
      "Edited inputs · recalculate before inspecting results";
    $("wf-comparison").replaceChildren();
    DrillingProgramWorkspace.invalidate(
      "Well inputs changed. Prepare the study again.",
    );
  }
  page.addEventListener("input", dirty);
  page.addEventListener("change", (e) => {
    if (e.target.type !== "file") dirty();
  });
  const csv = (rows, keys) =>
    [
      keys.map((k) => k[0]).join(","),
      ...rows.map((r) =>
        keys
          .map((k) => `"${String(k[1](r) ?? "").replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");
  const tallyCSV = (rows) =>
    csv(rows, [
      ["name", (r) => r.name],
      ["type", (r) => r.type || r.family || "drill-pipe"],
      ["length_m", (r) => r.length],
      ["od_mm", (r) => r.od * 1000],
      ["id_mm", (r) => r.id * 1000],
      ["contact_od_mm", (r) => (r.contactOD ?? r.od) * 1000],
      ["kg_m", (r) => r.mass],
      ["E_GPa", (r) => (r.E ? r.E / 1e9 : "")],
      ["source", (r) => r.source],
      ["capabilities", (r) => (r.capabilities || []).join(";")],
    ]);
  const formState = () =>
    Object.fromEntries(
      [...page.querySelectorAll("input:not([type=file]),textarea,select")]
        .filter(
          (el) =>
            ![
              "wf-name",
              "wf-wobTf",
              "wf-rpm",
              "wf-ropMph",
              "wf-flowLpm",
              "wf-mudKgM3",
            ].includes(el.id),
        )
        .map((el) => [el.id, el.type === "checkbox" ? el.checked : el.value]),
    );
  function populate(p, invalidate = true) {
    cached = copy(p);
    base = copy(p);
    $("wf-name").value = p.name;
    $("wf-source").value = p.study.source;
    $("wf-survey").value = csv(p.study.survey, [
      ["md", (r) => r.md],
      ["inc", (r) => r.inc],
      ["azi", (r) => r.azi],
    ]);
    $("wf-architecture").value = csv(p.study.sections, [
      ["from_m", (r) => r.from],
      ["to_m", (r) => r.to],
      ["diameter_mm", (r) => r.diameter * 1000],
      ["kind", (r) => r.kind],
    ]);
    $("wf-lithology").value = csv(p.intervals, [
      ["from_m", (r) => r.from],
      ["to_m", (r) => r.to],
      ["lithology", (r) => r.lithology],
      ["source", (r) => r.source],
    ]);
    $("wf-tally").value = tallyCSV(p.study.components);
    $("wf-mode").value = "existing";
    mode();
    for (const k of ["wobTf", "rpm", "ropMph", "flowLpm", "mudKgM3"])
      $("wf-" + k).value = p.plan[k];
    for (const k of ["muOpen", "muCased"])
      $("wf-" + k).value = p.study.axial?.[k] ?? "";
    for (const k of ["gamma", "mwd", "lwd", "rss"])
      $("wf-" + k).checked = (p.required || []).includes(k);
    $("wf-quality").textContent = p.quality + " · " + p.study.source;
    $("wf-preview").innerHTML = WellSynoptic.svg(p, p.study.bitMD);
    step(0);
    baseline = formState();
    if (invalidate) DrillingProgramWorkspace.invalidate();
  }
  $("wf-demo").onclick = () =>
    populate(DrillingProgram.demo(StringInHole.snapshot().input));
  $("wf-builder").onclick = () => {
    dirty();
    $("wf-tally").value = tallyCSV(WellApp.snapshot().state.bha);
    $("wf-status").textContent =
      "Builder tally copied. Complete missing stiffness/source fields before calculation.";
  };
  async function file(input) {
    const f = input.files?.[0];
    if (!f || f.size > 4e6) throw Error("Choose a file under 4 MB");
    return f.text();
  }
  page.querySelectorAll("[data-wf-file]").forEach(
    (el) =>
      (el.onchange = async () => {
        try {
          const value = await file(el);
          $("wf-" + el.dataset.wfFile).value = value;
          dirty();
        } catch (e) {
          $("wf-error").textContent = e.message;
        }
      }),
  );
  $("wf-import").onchange = async (e) => {
    try {
      const p = JSON.parse(await file(e.target));
      DrillingProgram.validate(p);
      populate(p);
    } catch (e) {
      $("wf-error").textContent = e.message;
    }
  };
  const num = (id) => {
    const v = $("wf-" + id).value;
    if (v.trim() === "" || !Number.isFinite(Number(v)))
      throw Error("Enter " + $("wf-" + id).parentElement.textContent);
    return Number(v);
  };
  async function compare(p) {
    const Q = BhaQuick,
      F = StringPhase,
      st = WellEngine.survey(p.study.survey),
      end = st.at(-1),
      opt = {
        maxBuild: num("build"),
        maxDrop: num("drop"),
        maxDLS: num("dls"),
        target: { n: end.n, e: end.e, tvd: end.tvd },
        tolerance: 1,
        required: p.required,
      },
      geometry = Q.geometry(p.study, opt),
      depths = F.depths(
        p.study,
        Math.max(1, end.md * 0.1),
        end.md,
        num("samples"),
      ),
      candidates = Q.generate(p.study);
    for (const c of candidates) {
      c.rows = [];
      c.loads = [];
      c.geometry = geometry;
      c.missing = Q.requirements(c.input, opt.required);
      c.directional = Q.directional(c, [], opt);
      for (const md of depths) {
        if (cancelled) throw Error("Comparison cancelled");
        $("wf-status").textContent = `Comparing ${c.name} · ${md.toFixed(0)} m`;
        await new Promise((r) => setTimeout(r, 0));
        c.rows.push(F.sample(c.input, md));
        c.loads.push(Q.loads(c.input, md));
      }
    }
    Q.shortlist(candidates);
    const chosen = WellPlan.selectCandidate(candidates);
    $("wf-comparison").innerHTML =
      `<article class="panel"><h2>Placement comparison · ${depths.length} sampled depths</h2><p>${chosen ? "Proposed: " + esc(chosen.name) : "No admissible mechanical candidate. Review the blockers below."} · assumed geometry / preliminary only</p><div class="dp-window-table"><table><thead><tr><th>Candidate</th><th>Peak summed wall reaction (tf)</th><th>Peak bending (MPa)</th><th>Review</th></tr></thead><tbody>${candidates.map((c) => `<tr><td>${esc(c.name)}</td><td>${c.metrics ? (c.metrics[0] / 9806.65).toFixed(2) : "Unknown"}</td><td>${c.metrics ? (c.metrics[1] / 1e6).toFixed(2) : "Unknown"}</td><td>${esc([...c.blockers, ...c.unresolved].join(" "))}</td></tr>`).join("")}</tbody></table></div></article>`;
    if (!chosen)
      throw Error(
        "No proposal meets the entered geometry objectives and available mechanical checks. Revise inputs; no assembly was applied.",
      );
    p.study = copy(chosen.input);
    p.selection = {
      name: chosen.name,
      depths,
      metrics: chosen.metrics,
      unresolved: chosen.unresolved,
    };
    return p;
  }
  $("wf-cancel").onclick = () => (cancelled = true);
  $("wf-prepare").onclick = async () => {
    if (busy) return;
    $("wf-error").textContent = "";
    let p;
    try {
      busy = true;
      cancelled = false;
      for (const el of page.querySelectorAll("input,select,textarea,button"))
        el.disabled = true;
      $("wf-cancel").disabled = false;
      if (cached) p = copy(cached);
      else if (
        base &&
        $("wf-mode").value === "existing" &&
        BhaQuick.identity(formState()) === BhaQuick.identity(baseline)
      ) {
        p = copy(base);
        p.name = $("wf-name").value;
        for (const k of ["wobTf", "rpm", "ropMph", "flowLpm", "mudKgM3"])
          p.plan[k] = num(k);
        p.study.rho = p.plan.mudKgM3;
        if (p.study.axial) p.study.axial.rpm = p.plan.rpm;
        DrillingProgram.validate(p);
      } else {
        const source = $("wf-source").value,
          sv = WellPlan.survey($("wf-survey").value),
          sections = WellPlan.architecture($("wf-architecture").value, source),
          required = ["gamma", "mwd", "lwd", "rss"].filter(
            (k) => $("wf-" + k).checked,
          ),
          generated = $("wf-mode").value === "starter",
          components = generated
            ? WellPlan.starter(
                sv.at(-1).md,
                Math.min(...sections.map((s) => s.diameter)),
                required,
              )
            : WellPlan.tally($("wf-tally").value),
          plan = Object.fromEntries(
            ["wobTf", "rpm", "ropMph", "flowLpm", "mudKgM3"].map((k) => [
              k,
              num(k),
            ]),
          );
        p = WellPlan.programme({
          name: $("wf-name").value,
          source,
          survey: sv,
          sections,
          components,
          generated,
          required,
          plan,
          intervals: $("wf-lithology").value.trim()
            ? DrillingProgram.csv($("wf-lithology").value)
            : [],
          axial: {
            mode: "soft-string",
            source,
            stepM: 15,
            muOpen: num("muOpen"),
            muCased: num("muCased"),
            bottomForceN: 0,
            bottomTorqueNm: 0,
            axialSpeedMps: 0.1,
            rpm: plan.rpm,
            blockN: 0,
          },
        });
        if (base) {
          if (base.quality === "SYNTHETIC") p.quality = "SYNTHETIC";
          if (base.study.quality === "SYNTHETIC") p.study.quality = "SYNTHETIC";
          if (!generated)
            p.study.components = p.study.components.map((b) => {
              const old = base.study.components.find(
                (o) =>
                  o.name === b.name &&
                  [
                    "type",
                    "length",
                    "od",
                    "id",
                    "contactOD",
                    "mass",
                    "E",
                  ].every((k) => o[k] === b[k]),
              );
              return old ? { ...copy(old), ...b } : b;
            });
          for (const r of p.intervals) {
            const old = base.intervals.find(
              (o) =>
                o.from === r.from &&
                o.to === r.to &&
                o.lithology === r.lithology &&
                o.source === r.source,
            );
            if (old?.limits) r.limits = copy(old.limits);
          }
        }
        if (generated) p = await compare(p);
      }
      if (cancelled) throw Error("Cancelled");
      StringInHole.applyStudy(p.study);
      DrillingProgramWorkspace.load(p);
      await DrillingProgramWorkspace.calculate();
      if (!DrillingProgramWorkspace.snapshot().report)
        throw Error(
          "Programme could not be calculated: " + $("dp-error").textContent,
        );
      WellEvidence.project().drilling_program = copy(p);
      WellEvidence.changed();
      cached = copy(p);
      base = copy(p);
      baseline = formState();
      $("wf-status").textContent =
        "Study added to this project. Export Project to keep a backup.";
      WellWorkflow.open("well-dashboard");
    } catch (e) {
      $("wf-error").textContent = e.message;
    } finally {
      busy = false;
      for (const el of page.querySelectorAll("input,select,textarea,button"))
        el.disabled = false;
      $("wf-cancel").disabled = true;
    }
  };
  const view = document.createElement("section");
  view.id = "well-dashboard";
  view.className = "page";
  view.innerHTML = `<header class="page-head"><div><h1>Section dashboard</h1><p>Move along the well to inspect entered targets, calculated loads and sourced bounds.</p></div><button id="wf-edit">Edit well inputs</button></header><div id="wf-empty">Prepare a well first. No operating recommendation is inferred from a rock name.</div><div id="wf-board" hidden><div class="work-toolbar"><label>Bit MD (m)<input id="wf-md" type="number" step="1"></label><input id="wf-depth" aria-label="Inspect well depth" type="range" step="1"><button id="wf-limits">Edit formation limits / response</button><button id="wf-export">Export report</button><button id="wf-view3d">Inspect this depth in 3D</button></div><div class="wf-board"><div id="wf-section-map"></div><div><h2 id="wf-formation"></h2><p id="wf-governing"></p><div id="wf-cards"></div><p id="wf-limit-source"></p></div></div><details class="workflow-fold"><summary>Prepared BHA · connected components</summary><div id="wf-assembly"></div></details><div id="wf-graphs" class="dp-charts"></div><details><summary>All calculated tracks, sources and station margins</summary><div id="wf-all-results"></div></details></div>`;
  document.querySelector(".content").append(view);
  $("wf-edit").onclick = () => WellWorkflow.open("well-setup");
  $("wf-view3d").onclick = () => {
    if (!dashboard) return;
    const study = copy(dashboard.programme.study);
    study.bitMD = Math.max(1, Number($("wf-md").value));
    StringInHole.applyStudy(study);
    WellWorkflow.open("string-in-hole");
  };
  $("wf-limits").onclick = () => {
    WellWorkflow.open("dp-settings");
    if (dashboard) {
      const p = dashboard.programme,
        r = DrillingProgram.intervalAt(p.intervals, Number($("wf-md").value));
      if (r) {
        $("dp-interval").value = p.intervals.indexOf(r);
        $("dp-interval").dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  };
  $("wf-export").onclick = () => $("dp-report").click();
  function resetDashboard() {
    if (inspectionFrame !== null) cancelAnimationFrame(inspectionFrame);
    inspectionFrame = null;
    depthCache.clear();
    dashboardSurvey = null;
    dashboard = null;
    $("wf-board").hidden = true;
    $("wf-empty").hidden = false;
    $("wf-empty").textContent =
      "Inputs changed or no study calculated. Prepare the well or recalculate formation limits.";
  }
  window.addEventListener("wellscope:programme-invalidated", resetDashboard);
  function inspect(value) {
    if (inspectionFrame !== null) cancelAnimationFrame(inspectionFrame);
    inspectionFrame = null;
    if (!dashboard) return;
    const p = dashboard.programme,
      md = Math.max(0, Math.min(p.study.survey.at(-1).md, Number(value)));
    if (!Number.isFinite(md)) return;
    $("wf-md").value = md;
    $("wf-depth").value = md;
    $("wf-section-map").innerHTML = WellSynoptic.svg(p, md, dashboardSurvey);
    const r = DrillingProgram.intervalAt(p.intervals, md);
    if (!r) {
      $("wf-formation").textContent = "Unlogged section";
      $("wf-governing").textContent =
        "No lithology or local operating bounds supplied at this depth.";
      $("wf-cards").replaceChildren();
      $("wf-limit-source").textContent = "";
      return;
    }
    let row = depthCache.get(md);
    if (!row) {
      row = DrillingProgram.sample(p, r, md, dashboardSurvey);
      if (depthCache.size >= 32)
        depthCache.delete(depthCache.keys().next().value);
      depthCache.set(md, row);
    }
    $("wf-formation").textContent = `${r.lithology} · ${r.from}–${r.to} m MD`;
    const exceeded = Object.keys(row.checks).filter(
      (k) => row.checks[k].status === "EXCEEDED",
    );
    $("wf-governing").textContent = exceeded.length
      ? "Outside entered bounds: " +
        exceeded.map((k) => DrillingProgram.fields[k][0]).join(", ")
      : row.loadLimitExceeded
        ? "A supplied equipment/body limit is exceeded. Review the load assessment."
        : row.status === "INCOMPLETE"
          ? "Some limits or predictions are missing."
          : "Within supplied bounds at this depth · preliminary screening";
    $("wf-governing").className = exceeded.length
      ? "dp-exceeded"
      : "dp-unknown";
    $("wf-cards").innerHTML = [
      "rpm",
      "wobTf",
      "flowLpm",
      "ropMph",
      "pickupTf",
      "slackoffTf",
      "torqueTfm",
      "dls",
      "build",
      "sppBar",
      "bottomBar",
    ]
      .map((k) => {
        const [label, u] = DrillingProgram.fields[k],
          b = r.limits?.[k],
          v = row.values[k];
        return `<article class="wf-value ${row.checks[k].status === "EXCEEDED" ? "wf-over" : ""}"><span>${esc(label)}</span><strong>${Number.isFinite(v) ? v.toFixed(1) : "Unknown"} <small>${u}</small></strong><p>${b ? `${b.min != null ? "Min " + b.min + " " + u : ""} ${b.max != null ? "Max " + b.max + " " + u : ""}` : "Limit not supplied"}</p></article>`;
      })
      .join("");
    $("wf-limit-source").textContent =
      "Limits: " +
      (r.limits?.source || "missing") +
      " · " +
      p.quality +
      " / geometry " +
      p.study.quality +
      ". RPM/WOB/flow/ROP are entered targets; loads are off-bottom calculations.";
  }
  $("wf-md").oninput = (e) => inspect(e.target.value);
  $("wf-depth").oninput = (e) => {
    const value = e.target.value;
    if (inspectionFrame !== null) cancelAnimationFrame(inspectionFrame);
    inspectionFrame = requestAnimationFrame(() => {
      inspectionFrame = null;
      inspect(value);
    });
  };
  const pick = (e) => {
    const g = e.target.closest("[data-section-md]");
    if (g && (e.type === "click" || ["Enter", " "].includes(e.key))) {
      e.preventDefault();
      inspect(g.dataset.sectionMd);
    }
  };
  $("wf-section-map").onclick = pick;
  $("wf-section-map").onkeydown = pick;
  window.addEventListener("wellscope:programme-calculated", () => {
    dashboard = DrillingProgramWorkspace.snapshot().report;
    if (!dashboard) return;
    depthCache.clear();
    dashboardSurvey = WellEngine.survey(dashboard.programme.study.survey);
    $("wf-empty").hidden = true;
    $("wf-board").hidden = false;
    $("wf-depth").min = 0;
    $("wf-depth").max = dashboard.programme.study.survey.at(-1).md;
    $("wf-md").max = $("wf-depth").max;
    $("wf-assembly").innerHTML = AssemblyDrawing.svg(
      dashboard.programme.study.components,
    );
    const original = $("dp-results");
    $("wf-all-results").innerHTML = original.innerHTML;
    const tracks = original.querySelectorAll(".dp-charts article");
    $("wf-graphs").replaceChildren();
    for (const i of [4, 5, 6])
      if (tracks[i]) $("wf-graphs").append(tracks[i].cloneNode(true));
    const directional = [...original.querySelectorAll("article")].find((a) =>
      a.querySelector("h3")?.textContent.includes("Build/drop"),
    );
    if (directional) $("wf-graphs").append(directional.cloneNode(true));
    inspect(dashboard.programme.study.bitMD);
  });
  window.addEventListener("string-shape-update", (e) => {
    if (!dashboard) return;
    const current = copy(e.detail.input),
      frozen = copy(dashboard.programme.study);
    delete current.bitMD;
    delete frozen.bitMD;
    if (BhaQuick.identity(current) !== BhaQuick.identity(frozen))
      DrillingProgramWorkspace.invalidate(
        "3D study changed. Recapture the study and recalculate before using its section dashboard.",
      );
  });
  function newWell() {
    if (busy) return;
    cached = null;
    base = null;
    baseline = {};
    for (const el of page.querySelectorAll("input:not([type=file]),textarea")) {
      if (el.type === "checkbox") el.checked = false;
      else if (!["wf-build", "wf-drop", "wf-dls", "wf-samples"].includes(el.id))
        el.value = "";
    }
    $("wf-mode").value = "existing";
    mode();
    step(0);
    $("wf-preview").replaceChildren();
    $("wf-comparison").replaceChildren();
    $("wf-quality").textContent = "New well · enter your source data";
    DrillingProgramWorkspace.invalidate();
  }
  $("wf-new").onclick = newWell;
  window.WellFlow = {
    populate,
    step,
    syncSetup: () => {
      const r = DrillingProgramWorkspace.snapshot().report;
      if (r && !busy) populate(r.programme, false);
    },
  };
  window.addEventListener("wellscope:project-loaded", () => {
    const p = WellEvidence.project().drilling_program;
    if (p) {
      try {
        DrillingProgram.validate(p);
        populate(p);
      } catch (e) {
        $("wf-error").textContent = e.message;
      }
    } else newWell();
  });
  const saved = WellEvidence.project().drilling_program;
  if (saved) {
    try {
      DrillingProgram.validate(saved);
      populate(saved);
    } catch (e) {
      $("wf-error").textContent = e.message;
    }
  }
  step(0);
})();
