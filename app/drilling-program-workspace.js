(() => {
  const $ = (id) => document.getElementById(id),
    M = DrillingProgram,
    H = EngineeringCharts,
    esc = H.esc,
    copy = (x) => JSON.parse(JSON.stringify(x));
  let draft = {
      schema: "wellscope-drilling-program/1",
      quality: "USER_ENTERED",
      name: "Drilling programme",
      study: StringInHole.snapshot().input,
      plan: { wobTf: 8, rpm: 100, ropMph: 12, flowLpm: 1200, mudKgM3: 1200 },
      intervals: [],
    },
    report = null,
    selected = 0,
    busy = false,
    cancel = false;
  const page = document.createElement("section");
  page.id = "drilling-program";
  page.className = "page";
  page.innerHTML = `<header class="dp-hero"><div class="eyebrow">LITHOSPHERE / PRACTICAL WELL PLANNING</div><h1>Rock. Assembly. Operating envelope.</h1><p>A simple programme by formation. Declare the inputs, inspect the margins, carry unresolved limits into the report.</p><div class="dp-steps"><a href="#dp-context">01 · Well & BHA</a><a href="#dp-lithology">02 · Lithology</a><a href="#dp-settings">03 · Operating targets</a><a href="#dp-results">04 · Depth windows</a></div></header><article class="panel" id="dp-context"><h2>1 · Freeze the well and BHA</h2><p id="dp-basis"></p><div class="work-toolbar"><button id="dp-capture" class="primary">Use current 3D string study</button><button id="dp-bha" class="smallbutton">Edit BHA / load inputs</button><button id="dp-quick" class="smallbutton">Compare BHA stability</button><button id="dp-demo" class="smallbutton">Load fictional worked example</button></div><p>WOB is a planned target, not converted to an effective bottom force here. Pickup, slackoff and torque are separate off-bottom screening cases. Whole-string inputs are frozen; changing the builder does not silently update this programme.</p></article><article class="panel" id="dp-lithology"><h2>2 · Lithology along measured depth</h2><p>Use interpreted lithology intervals tied to the same well, MD origin and datum as the frozen survey. CSV: <code>from_m,to_m,lithology,source</code>. Gaps remain unknown; rock names do not create drilling limits.</p><div class="work-toolbar"><label class="filebtn">Import litholog<input id="dp-log-file" type="file" accept=".csv,.json,.las" hidden></label><button id="dp-template" class="smallbutton">Download CSV template</button><button id="dp-add" class="smallbutton">Add interval manually</button></div><details><summary>LAS import · explicit facies codes</summary><p>LAS 2.0 / WRAP.NO only, DEPT or DEPTH in m or ft. An explicit code curve and mapping are required. GR alone is not a lithology interpretation. Null samples leave gaps; the last sample is not extrapolated. DLIS/LIS and scanned PDF logs require conversion to interval CSV.</p><div class="workform"><label>Code curve mnemonic<input id="dp-las-curve" value="LITH"></label><label>File source / revision<input id="dp-las-source"></label><label>Code mapping JSON<textarea id="dp-las-map" placeholder='{"1":"Sandstone","2":"Shale"}'></textarea></label></div></details><div id="dp-log-list"></div><div id="dp-log-track"></div></article><article class="panel" id="dp-settings"><h2>3 · Targets and sourced limits</h2><div class="workform"><label>Programme name<input id="dp-name"></label><label>Quality<select id="dp-quality"><option value="USER_ENTERED">User-entered / unverified</option><option value="SYNTHETIC">Fictional example</option></select></label></div><fieldset id="dp-required"><legend>Required measurement / steering tools</legend><label><input id="dp-req-gamma" type="checkbox">Gamma ray</label><label><input id="dp-req-mwd" type="checkbox">MWD</label><label><input id="dp-req-lwd" type="checkbox">LWD</label><label><input id="dp-req-rss" type="checkbox">RSS</label></fieldset><h3>Common targets</h3><div id="dp-global" class="workform"></div><p>Targets describe a proposed programme. They are not optimized recommendations or predicted ROP. Limits below come from your OEM sheets, drilling programme or calibrated offset analysis.</p><label>Formation interval<select id="dp-interval"></select></label><div id="dp-interval-editor"></div><button id="dp-apply" class="primary">Apply targets & limits</button></article><div class="work-toolbar"><button id="dp-run" class="primary">Calculate depth windows</button><button id="dp-cancel" disabled>Cancel</button><button id="dp-save" disabled>Save to project</button><button id="dp-json">Export programme JSON</button><label class="filebtn">Import programme JSON<input id="dp-import" type="file" accept=".json" hidden></label><button id="dp-load">Load saved programme</button><button id="dp-report" disabled>Export client draft</button></div><p id="dp-status" role="status"></p><p id="dp-error" role="alert"></p><div id="dp-results"></div><article class="panel"><h2>What is calculated — and what is supplied</h2><p>Hydrostatic pressure = mud density × g × TVD. Circulating bottom pressure = hydrostatic pressure + sourced annular loss, assuming atmospheric annulus outlet. ECD = mud density + annular loss / (g × TVD). SPP remains a separate sourced surface pressure; it is not added to bottom pressure.</p><p>Hydraulic profiles interpolate only between supplied depths at exactly the declared flow and density for this frozen study. They are not a rheology model. No surge/swab, choke backpressure or transient well-control assessment. ROP caps are supplied, never inferred from a lithology label. A pump-pressure change does not automatically predict build/drop: an associated BHA/formation response is required.</p><p><a href="https://glossary.slb.com/terms/e/equivalent_circulating_density" target="_blank" rel="noopener">SLB · ECD</a> · <a href="https://www.usgs.gov/programs/national-geological-and-geophysical-data-preservation-program/las-format" target="_blank" rel="noopener">USGS · LAS</a></p></article>`;
  document.querySelector(".content").append(page);
  const nav = document.createElement("button");
  nav.className = "nav";
  nav.dataset.page = page.id;
  nav.textContent = "Drilling programme";
  nav.onclick = () => {
    WellApp.navigate(page.id);
    $("crumb").textContent = "DRILLING PROGRAMME";
  };
  $("navigation").append(nav);
  const planFields = {
    wobTf: ["WOB target", "tf"],
    rpm: ["Rotary speed", "rpm"],
    ropMph: ["ROP target", "m/h"],
    flowLpm: ["Pump flow", "L/min"],
    mudKgM3: ["Mud density", "kg/m³"],
  };
  function input(id, label, value) {
    return `<label>${esc(label)}<input type="number" step="any" id="${id}" value="${esc(value ?? "")}"></label>`;
  }
  function invalid(message = "Inputs changed. Apply edits and recalculate.") {
    report = null;
    $("dp-results").innerHTML = "";
    for (const id of ["dp-save", "dp-report"]) $(id).disabled = true;
    $("dp-status").textContent = message;
  }
  function form() {
    for (const k of ["gamma", "mwd", "lwd", "rss"])
      $("dp-req-" + k).checked = (draft.required || []).includes(k);
    $("dp-name").value = draft.name;
    $("dp-quality").value = draft.quality;
    $("dp-basis").textContent =
      `${draft.study.quality} · ${draft.study.source} · ${draft.study.components.length} components · MD datum: frozen survey origin`;
    $("dp-global").innerHTML = Object.entries(planFields)
      .map(([k, [label, u]]) =>
        input("dp-plan-" + k, `${label} (${u})`, draft.plan[k]),
      )
      .join("");
    $("dp-interval").innerHTML = draft.intervals
      .map(
        (r, i) =>
          `<option value="${i}">${esc(r.lithology)} · ${r.from}–${r.to} m MD</option>`,
      )
      .join("");
    selected = Math.min(selected, Math.max(0, draft.intervals.length - 1));
    $("dp-interval").value = selected;
    editor();
    logs();
  }
  function editor() {
    const r = draft.intervals[selected];
    if (!r) {
      $("dp-interval-editor").innerHTML =
        "<p>Import or add an interval first.</p>";
      return;
    }
    $("dp-interval-editor").innerHTML =
      `<div class="workform">${input("dp-from", "From MD (m)", r.from)}${input("dp-to", "To MD (m)", r.to)}<label>Lithology<input id="dp-lith" value="${esc(r.lithology)}"></label><label>Lithology source / revision<input id="dp-source" value="${esc(r.source)}"></label></div><details open><summary>Operating bounds · this interval</summary><label>Limits source / revision<input id="dp-limit-source" value="${esc(r.limits?.source || "")}"></label><p>Blank means unknown. Enter already derated limits on the same measurement basis. Negative signed build is drop.</p><div class="dp-limit-grid">${Object.entries(
        M.fields,
      )
        .map(
          ([k, [label, u]]) =>
            `<div><b>${esc(label)} (${u})</b>${input("dp-min-" + k, "Minimum", r.limits?.[k]?.min)}${input("dp-max-" + k, "Maximum", r.limits?.[k]?.max)}</div>`,
        )
        .join(
          "",
        )}</div></details><details><summary>Interval targets · optional overrides</summary><div class="workform">${Object.entries(
        planFields,
      )
        .map(([k, [label, u]]) =>
          input("dp-local-" + k, `${label} (${u})`, r.plan?.[k]),
        )
        .join(
          "",
        )}</div><p>Blank uses the common target.</p></details><details><summary>Pump and annular pressure profile · source required</summary><p>Supply the source model/measurements at the fixed flow and mud density below. CSV columns: <code>md_m,spp_bar,annular_bar</code>. No extrapolation or scaling to a different flow. Changing targets to another flow or density makes this profile unavailable.</p><div class="workform"><label>Hydraulic source / revision<input id="dp-h-source" value="${esc(r.hydraulics?.source || "")}"></label>${input("dp-h-flow", "Profile flow (L/min)", r.hydraulics?.flowLpm)}${input("dp-h-mud", "Profile density (kg/m³)", r.hydraulics?.mudKgM3)}</div><textarea id="dp-h-rows" rows="5">${r.hydraulics ? esc("md_m,spp_bar,annular_bar\n" + r.hydraulics.rows.map((x) => [x.md, x.sppBar, x.annularBar].join(",")).join("\n")) : ""}</textarea></details><details><summary>Associated directional response · optional</summary><p>Import JSON with <code>study,flowLpm,mudKgM3,rpm,surface,settings</code>. The study must exactly match the frozen study; the surface fixes this formation and tool configuration. The same flow, density and RPM are required. Use the Directional Response Lab to prepare a sourced response. This provides build/drop/DLS versus WOB, not a universal pressure law.</p><label class="filebtn">Import interval response<input id="dp-response" type="file" accept=".json" hidden></label><button id="dp-response-template">Export association template</button><p>${esc(r.response?.surface?.source || "No response associated")}</p></details>`;
    $("dp-response-template").onclick = () =>
      download("directional-association-template.json", {
        study: draft.study,
        flowLpm: draft.plan.flowLpm,
        mudKgM3: draft.plan.mudKgM3,
        rpm: draft.plan.rpm,
        surface: null,
        settings: null,
      });
    $("dp-response").onchange = async (e) =>
      guardAsync(async () => {
        const d = JSON.parse(await fileText(e));
        DirectionalResponse.validate(d.surface);
        if (BhaQuick.identity(d.study) !== BhaQuick.identity(draft.study))
          throw Error("Response study does not match frozen study");
        draft.intervals[selected].response = d;
        invalid("Response associated; recalculate.");
        editor();
      });
  }
  function logs() {
    const rows = draft.intervals;
    let previous = 0,
      gaps = [];
    for (const r of rows) {
      if (r.from > previous)
        gaps.push(`${previous.toFixed(1)}–${r.from.toFixed(1)} m`);
      previous = r.to;
    }
    const end = draft.study.survey.at(-1).md;
    if (previous < end) gaps.push(`${previous.toFixed(1)}–${end.toFixed(1)} m`);
    $("dp-log-list").innerHTML =
      `<p>${rows.length} intervals · Unlogged: ${esc(gaps.join("; ") || "none within survey coverage")}. No geological interpolation across gaps.</p>`;
    if (!rows.length) {
      $("dp-log-track").innerHTML = "";
      return;
    }
    const total = Math.max(end, 1),
      st = WellEngine.survey(draft.study.survey),
      maxX = Math.max(1, ...st.map((p) => Math.hypot(p.n, p.e)));
    const colours = ["#b36b49", "#897b67", "#d9b88a", "#7b8c79", "#b89585"];
    $("dp-log-track").innerHTML =
      `<svg viewBox="0 0 750 360" role="img" aria-label="Lithology intervals and trajectory by measured depth"><text x="20" y="18">MD (m) ↓</text><text x="470" y="18">Trajectory · horizontal displacement</text><path d="${st.map((p, i) => `${i ? "L" : "M"}${470 + (230 * Math.hypot(p.n, p.e)) / maxX} ${32 + (300 * p.md) / total}`).join(" ")}" fill="none" stroke="#b8aaa0" stroke-width="2"/>${rows
        .map((r, i) => {
          const y = 32 + (300 * r.from) / total,
            h = (300 * (r.to - r.from)) / total,
            ps = [
              WellEngine.interp(st, r.from),
              ...st.filter((p) => p.md > r.from && p.md < r.to),
              WellEngine.interp(st, r.to),
            ];
          return `<rect x="80" y="${y}" width="35" height="${h}" fill="${colours[i % 5]}"/><text x="5" y="${y + 10}" font-size="10">${r.from.toFixed(0)}</text><text x="130" y="${y + 12}" font-size="11">${esc(r.lithology)}</text><path d="${ps.map((p, j) => `${j ? "L" : "M"}${470 + (230 * Math.hypot(p.n, p.e)) / maxX} ${32 + (300 * p.md) / total}`).join(" ")}" fill="none" stroke="${colours[i % 5]}" stroke-width="5"><title>${esc(r.lithology)} · ${r.from}–${r.to} m</title></path>`;
        })
        .join("")}<text x="5" y="347">${end.toFixed(0)}</text></svg>`;
  }
  function numeric(id, optional = false) {
    const text = $(id).value.trim();
    if (!text) {
      if (optional) return null;
      throw Error("Missing " + $(id).parentElement.textContent);
    }
    const n = Number(text);
    if (!Number.isFinite(n)) throw Error("Invalid numeric input");
    return n;
  }
  function apply() {
    const next = copy(draft);
    next.required = ["gamma", "mwd", "lwd", "rss"].filter(
      (k) => $("dp-req-" + k).checked,
    );
    next.name = $("dp-name").value;
    next.quality = $("dp-quality").value;
    for (const k of Object.keys(planFields))
      next.plan[k] = numeric("dp-plan-" + k);
    const r = next.intervals[selected];
    if (r) {
      r.from = numeric("dp-from");
      r.to = numeric("dp-to");
      r.lithology = $("dp-lith").value;
      r.source = $("dp-source").value;
      r.plan = {};
      for (const k of Object.keys(planFields)) {
        const v = numeric("dp-local-" + k, true);
        if (v != null) r.plan[k] = v;
      }
      r.limits = { source: $("dp-limit-source").value };
      for (const k of Object.keys(M.fields)) {
        const min = numeric("dp-min-" + k, true),
          max = numeric("dp-max-" + k, true);
        if (min != null || max != null) r.limits[k] = { min, max };
      }
      if (Object.keys(r.limits).length === 1 && !r.limits.source.trim())
        delete r.limits;
      const text = $("dp-h-rows").value.trim();
      if (text) {
        r.hydraulics = {
          source: $("dp-h-source").value,
          flowLpm: numeric("dp-h-flow"),
          mudKgM3: numeric("dp-h-mud"),
          rows: WellCore.csv(text).map((x) => {
            if (!x.md_m || !x.spp_bar || !x.annular_bar)
              throw Error("Missing hydraulic CSV cell");
            return {
              md: Number(x.md_m),
              sppBar: Number(x.spp_bar),
              annularBar: Number(x.annular_bar),
            };
          }),
        };
        M.hydraulic(r.hydraulics, r.from, { ...next.plan, ...r.plan });
      } else delete r.hydraulics;
    }
    M.validate(next);
    draft = next;
    invalid("Targets applied. Calculate depth windows.");
    form();
  }
  function guard(fn) {
    try {
      $("dp-error").textContent = "";
      fn();
    } catch (e) {
      $("dp-error").textContent = e.message;
    }
  }
  async function guardAsync(fn) {
    try {
      $("dp-error").textContent = "";
      await fn();
    } catch (e) {
      $("dp-error").textContent = e.message;
    }
  }
  function download(name, data, raw = false) {
    const blob = new Blob([raw ? data : JSON.stringify(data, null, 2)], {
        type: raw ? "text/plain" : "application/json",
      }),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function fileText(e) {
    const f = e.target.files?.[0];
    if (!f) throw Error("No file selected");
    if (f.size > 4000000) throw Error("File exceeds 4 MB; split the study");
    const text = await f.text();
    e.target.value = "";
    return text;
  }
  $("dp-apply").onclick = () => guard(apply);
  $("dp-interval").onchange = () => {
    const requested = +$("dp-interval").value;
    guard(() => {
      apply();
      selected = requested;
      $("dp-interval").value = selected;
      editor();
    });
    $("dp-interval").value = selected;
  };
  page.addEventListener("input", (e) => {
    if (
      e.target.type !== "file" &&
      e.target.id !== "dp-interval" &&
      !e.target.id.startsWith("dp-las-")
    )
      invalid();
  });
  $("dp-capture").onclick = () =>
    guard(() => {
      draft.study = StringInHole.snapshot().input;
      for (const r of draft.intervals) {
        delete r.response;
        delete r.hydraulics;
      }
      invalid(
        "Study recaptured. Previous hydraulic and directional associations cleared.",
      );
      form();
    });
  $("dp-bha").onclick = () =>
    document.querySelector('[data-route="string-in-hole"]').click();
  $("dp-quick").onclick = () =>
    guard(() => {
      apply();
      StringInHole.applyStudy(copy(draft.study));
      $("bq-capture").click();
      for (const k of ["gamma", "mwd", "lwd", "rss"]) {
        $("bq-" + k).checked = (draft.required || []).includes(k);
        $("bq-" + k).dispatchEvent(new Event("input"));
      }
      document.querySelector('[data-route="bha-quick"]').click();
    });
  $("dp-demo").onclick = () => {
    draft = M.demo(StringInHole.snapshot().input);
    selected = 0;
    invalid(
      "Fictional example loaded. First interval deliberately exceeds its ROP cap.",
    );
    form();
  };
  $("dp-template").onclick = () =>
    download(
      "lithology-template.csv",
      "from_m,to_m,lithology,source\n0,100,Sandstone,Replace with interpreted log source and revision\n",
      true,
    );
  $("dp-add").onclick = () => {
    const from = draft.intervals.at(-1)?.to || 0,
      end = draft.study.survey.at(-1).md;
    if (from >= end) {
      $("dp-error").textContent = "Intervals already reach survey end";
      return;
    }
    draft.intervals.push({
      from,
      to: Math.min(from + 100, end),
      lithology: "Unspecified formation",
      source: "User-entered interpretation",
    });
    selected = draft.intervals.length - 1;
    invalid();
    form();
  };
  $("dp-log-file").onchange = (e) =>
    guardAsync(async () => {
      const name = e.target.files?.[0]?.name || "",
        text = await fileText(e);
      const rows = /\.las$/i.test(name)
        ? M.las(
            text,
            $("dp-las-curve").value,
            JSON.parse($("dp-las-map").value),
            $("dp-las-source").value,
          )
        : /\.json$/i.test(name)
          ? M.validateIntervals(JSON.parse(text))
          : M.csv(text);
      const next = { ...draft, intervals: rows };
      M.validate(next);
      draft = next;
      selected = 0;
      invalid("Litholog loaded; enter formation limits.");
      form();
    });
  $("dp-import").onchange = (e) =>
    guardAsync(async () => {
      const p = JSON.parse(await fileText(e));
      M.validate(p);
      draft = p;
      selected = 0;
      invalid("Imported programme. Recalculate results.");
      form();
    });
  $("dp-json").onclick = () =>
    guard(() => {
      apply();
      download("WellScope-drilling-program.json", draft);
    });
  $("dp-save").onclick = () =>
    guard(() => {
      if (!report) throw Error("Recalculate first");
      WellEvidence.project().drilling_program = copy(draft);
      WellEvidence.changed();
      $("dp-status").textContent =
        "Saved to project; Export Project includes this programme.";
    });
  $("dp-load").onclick = () =>
    guard(() => {
      const p = WellEvidence.project().drilling_program;
      if (!p) throw Error("No saved programme in this project");
      M.validate(p);
      draft = copy(p);
      invalid("Saved programme loaded; recalculate.");
      form();
    });
  window.addEventListener("wellscope:project-loaded", () => {
    invalid(
      "Project changed. Use Load saved programme or recapture the 3D study.",
    );
  });
  $("dp-cancel").onclick = () => {
    cancel = true;
  };
  $("dp-run").onclick = () =>
    guardAsync(async () => {
      if (busy) return;
      apply();
      const st = M.validate(draft),
        depths = M.stations(draft),
        segments = [];
      busy = true;
      cancel = false;
      for (const el of page.querySelectorAll("input,select,textarea,button"))
        el.disabled = true;
      $("dp-cancel").disabled = false;
      try {
        for (let i = 0; i < draft.intervals.length; i++) {
          const rows = [];
          for (const md of depths[i]) {
            if (cancel) throw Error("Cancelled; partial results discarded");
            $("dp-status").textContent =
              `Calculating ${draft.intervals[i].lithology} at ${md.toFixed(1)} m…`;
            await new Promise((r) => setTimeout(r, 0));
            rows.push(M.sample(draft, draft.intervals[i], md, st));
          }
          segments.push({ interval: copy(draft.intervals[i]), rows });
        }
        report = {
          schema: "wellscope-program-results/1",
          programme: copy(draft),
          segments,
        };
        render();
      } finally {
        busy = false;
        for (const el of page.querySelectorAll("input,select,textarea,button"))
          el.disabled = false;
        $("dp-cancel").disabled = true;
        for (const id of ["dp-save", "dp-report"]) $(id).disabled = !report;
      }
    });
  function plot(k) {
    const points = [],
      lower = [],
      upper = [];
    for (const s of report.segments) {
      points.push(...s.rows.map((r) => ({ x: r.values[k] ?? NaN, y: r.md })), {
        x: NaN,
        y: NaN,
      });
      const b = s.interval.limits?.[k];
      for (const [side, list] of [
        ["min", lower],
        ["max", upper],
      ]) {
        if (b?.[side] != null)
          list.push(
            { x: b[side], y: s.interval.from },
            { x: b[side], y: s.interval.to },
          );
        list.push({ x: NaN, y: NaN });
      }
    }
    return H.svg(
      [
        { name: "Planned / calculated", points },
        {
          name: "Entered minimum",
          points: lower,
          color: "#847550",
          dash: "6 4",
        },
        {
          name: "Entered maximum",
          points: upper,
          color: "#ad432f",
          dash: "6 4",
        },
      ],
      {
        x: M.fields[k].join(" (") + ")",
        y: "Bit measured depth (m) ↓",
        depth: true,
        regions: report.segments.map((s) => ({
          from: s.interval.from,
          to: s.interval.to,
          min: s.interval.limits?.[k]?.min,
          max: s.interval.limits?.[k]?.max,
        })),
      },
    );
  }
  function render() {
    const rows = report.segments.flatMap((s) => s.rows),
      exceeded = rows.filter((r) => r.status === "EXCEEDED").length;
    let html = `<article class="panel"><h2>4 · Depth windows & governing limits</h2><p>${esc(draft.quality)} / frozen study ${esc(draft.study.quality)} · ${rows.length} sampled stations · <strong>${exceeded} with an exceeded bound</strong>. Within entered bounds never means operational approval. Missing limits and predictions stay unknown.</p><p>Depth increases downwards. Dashed lines are sourced bounds for each lithology interval. No line is drawn across unlogged gaps. Off-bottom loads exclude drilling bit torque and WOB transfer. ROP is a target; duration below excludes connections, trips and nonproductive time.</p><p>Required capabilities missing from frozen BHA: ${esc(BhaQuick.requirements(draft.study, draft.required || []).join(", ") || "none requested or none missing")}</p><div class="dp-window-table"><table><thead><tr><th>Formation / MD</th><th>Status</th><th>Entered target time</th><th>Exceeded quantities</th><th>Missing limits / predictions</th></tr></thead><tbody>${report.segments
      .map((s) => {
        const exceeded = [
            ...new Set(
              s.rows.flatMap((r) =>
                Object.entries(r.checks)
                  .filter(([k, v]) => v.status === "EXCEEDED")
                  .map(([k]) => M.fields[k][0]),
              ),
            ),
          ],
          unknown = [
            ...new Set(
              s.rows.flatMap((r) =>
                Object.entries(r.checks)
                  .filter(([k, v]) =>
                    ["NO_LIMIT", "NOT_CALCULATED"].includes(v.status),
                  )
                  .map(([k]) => M.fields[k][0]),
              ),
            ),
          ],
          rop = { ...draft.plan, ...s.interval.plan }.ropMph;
        if (s.rows.some((r) => r.loadLimitExceeded))
          exceeded.push("Frozen study equipment/body limit");
        unknown.push(
          ...BhaQuick.requirements(draft.study, draft.required || []).map(
            (k) => "Missing tool: " + k,
          ),
        );
        return `<tr><td>${esc(s.interval.lithology)}<br>${s.interval.from.toFixed(1)}–${s.interval.to.toFixed(1)} m</td><td class="${exceeded.length ? "dp-exceeded" : "dp-unknown"}">${exceeded.length ? "EXCEEDED" : unknown.length ? "INCOMPLETE" : "Within entered bounds"}</td><td>${rop > 0 ? ((s.interval.to - s.interval.from) / rop).toFixed(1) + " h" : "Not evaluable"}</td><td>${esc(exceeded.join(", ") || "None at sampled stations")}</td><td>${esc(unknown.join(", ") || "None in this limited assessment")}</td></tr>`;
      })
      .join(
        "",
      )}</tbody></table></div></article><div class="dp-charts">${Object.keys(
      M.fields,
    )
      .map(
        (k) =>
          `<article class="panel"><h3>${esc(M.fields[k][0])}</h3>${plot(k)}</article>`,
      )
      .join(
        "",
      )}</div><article class="panel"><h3>Build/drop and DLS versus WOB · by formation</h3>${report.segments
      .map((s) => {
        const d = s.interval.response,
          a = { ...draft.plan, ...s.interval.plan };
        if (!d)
          return `<p>${esc(s.interval.lithology)}: no associated response. Open Directional Response Lab; do not infer this curve from lithology or SPP.</p>`;
        if (
          BhaQuick.identity(d.study) !== BhaQuick.identity(draft.study) ||
          d.flowLpm !== a.flowLpm ||
          d.mudKgM3 !== a.mudKgM3 ||
          d.rpm !== a.rpm
        )
          return `<p>${esc(s.interval.lithology)}: response conditions mismatch.</p>`;
        try {
          const settings = {
              ...d.settings,
              wobN: a.wobTf * 9806.65,
              inclination: WellEngine.interp(
                WellEngine.survey(draft.study.survey),
                (s.interval.from + s.interval.to) / 2,
              ).inc,
            },
            r = DirectionalPlanning.sample(d.surface, settings, 12);
          return (
            `<h4>${esc(s.interval.lithology)} · ${esc(d.surface.quality)}</h4><p>${esc(d.surface.source)}</p>` +
            H.svg(
              ["build", "dls"].flatMap((k) => [
                {
                  name: k,
                  points: r.map((x) => ({ x: x.wobN / 9806.65, y: x[k] })),
                },
                ...["min", "max"]
                  .filter((b) => Number.isFinite(s.interval.limits?.[k]?.[b]))
                  .map((b) => ({
                    name: `${k} ${b} · entered bound`,
                    color: "#a54e35",
                    dash: "6 4",
                    points: [r[0], r.at(-1)].map((x) => ({
                      x: x.wobN / 9806.65,
                      y: s.interval.limits[k][b],
                    })),
                  })),
              ]),
              { x: "WOB (tf)", y: "Rate (°/30 m)" },
            )
          );
        } catch (e) {
          return `<p>${esc(e.message)}</p>`;
        }
      })
      .join(
        "",
      )}</article><details><summary>Station details and margins</summary><div class="dp-window-table"><table><thead><tr><th>MD / formation</th><th>Quantity</th><th>Value</th><th>Check</th><th>Margin to nearest entered bound</th></tr></thead><tbody>${rows.flatMap((r) => Object.entries(r.checks).map(([k, c]) => `<tr><td>${r.md.toFixed(1)} m · ${esc(r.lithology)}</td><td>${esc(M.fields[k].join(" / "))}</td><td>${r.values[k] == null ? "Not calculated" : r.values[k].toFixed(3)}</td><td>${c.status}</td><td>${c.margin == null ? "Unknown" : c.margin.toFixed(3)}</td></tr>`)).join("")}</tbody></table></div></details>`;
    $("dp-results").innerHTML = html;
    $("dp-status").textContent =
      "Programme calculated. Review exceeded bounds and missing evidence.";
  }
  $("dp-report").onclick = () => {
    if (!report) return;
    const html = `<!doctype html><meta charset="utf-8"><title>${esc(draft.name)}</title><style>body{font:14px Arial;color:#382e29;max-width:1100px;margin:30px auto}svg{width:100%;max-height:450px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d7c8b9;padding:8px;text-align:left}.dp-exceeded{color:#ad432f}.dp-charts{display:grid;grid-template-columns:1fr 1fr}article{break-inside:avoid}summary{font-weight:bold}</style><h1>${esc(draft.name)}</h1><p>${esc(draft.quality)} · CLIENT DRAFT / PRELIMINARY · Frozen study: ${esc(draft.study.source)}</p>${$("dp-results").innerHTML}<h2>Sources and limitations</h2><ul>${draft.intervals.map((r) => `<li>${esc(r.lithology)}: lithology ${esc(r.source)}; limits ${esc(r.limits?.source || "missing")}; hydraulics ${esc(r.hydraulics?.source || "missing")}</li>`).join("")}</ul><p>Off-bottom soft-string screening only. No prediction of ROP, stiff-string buckling, stick-slip or drilling bit torque. Bottom pressure uses hydrostatic pressure plus sourced annular loss, atmospheric annulus outlet. SPP is separate. Directional curves require exact associated response inputs. Targets and sampled margins are not an operational approval.</p>`;
    download("WellScope-programme-client-draft.html", html, true);
  };
  window.DrillingProgramWorkspace = {
    snapshot: () => copy({ draft, report }),
    load: (p) => {
      M.validate(p);
      draft = copy(p);
      invalid();
      form();
    },
  };
  form();
})();
