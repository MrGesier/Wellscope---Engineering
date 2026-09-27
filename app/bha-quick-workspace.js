(() => {
  const $ = (id) => document.getElementById(id),
    H = EngineeringCharts,
    Q = BhaQuick,
    F = StringPhase;
  const box = document.createElement("article");
  box.id = "bha-quick";
  box.className = "panel";
  box.innerHTML = `<div class="eng-kicker">PRE-DESIGN / QUICK SIMULATION</div><h2>BHA candidate shortlist</h2><p>Start from the whole-string study, including its imported trajectory, architecture, tally and loads. Generate placement alternatives using your existing components, then compare sampled contact and bending. This does not invent a trajectory or manufacturer tools.</p><div class="work-toolbar"><button id="bq-capture" class="primary">Use current whole-string study</button><button id="bq-loads">Edit loads / import study</button><label class="filebtn">Import candidate response surfaces<input id="bq-response" type="file" accept=".json" hidden></label></div><p id="bq-source"></p><div class="formgrid"><label>Phase start MD (m)<input id="bq-from" type="number"></label><label>Phase end MD (m)<input id="bq-to" type="number"></label><label>Depth stations<input id="bq-count" type="number" value="3" min="2" max="21"></label><label>Max build (°/30 m)<input id="bq-build" type="number" value="3" min="0" step="any"></label><label>Max drop (°/30 m)<input id="bq-drop" type="number" value="3" min="0" step="any"></label><label>Max DLS (°/30 m)<input id="bq-dls" type="number" value="4" min="0" step="any"></label><label>Target northing (m)<input id="bq-n" type="number" step="any"></label><label>Target easting (m)<input id="bq-e" type="number" step="any"></label><label>Target TVD (m)<input id="bq-tvd" type="number" step="any"></label><label>Target tolerance (m)<input id="bq-tolerance" type="number" value="10" min="0"></label></div><p>Target uses the survey local origin and checks the full planned trajectory endpoint. Initial target equals the current endpoint. Directional limits are editable design objectives, not tool ratings.</p><fieldset><legend>Required capabilities</legend>${[
    ["gamma", "Gamma ray"],
    ["mwd", "MWD / surveys"],
    ["lwd", "LWD"],
    ["rss", "RSS"],
  ]
    .map(
      ([id, name]) =>
        `<label style="display:inline-block;margin:10px"><input id="bq-${id}" type="checkbox"> ${name}</label>`,
    )
    .join(
      "",
    )}</fieldset><p>Unknown capabilities stay missing; gamma ray is not inferred from MWD/LWD. Declare supported capabilities in imported component data. Required tools are retained; this first search changes placement only.</p><div class="work-toolbar"><button id="bq-run" class="primary">Generate and compare BHA candidates</button><button id="bq-cancel" disabled>Cancel</button><button id="bq-export" disabled>Export pre-design report</button></div><p id="bq-status" role="status"></p><div id="bq-results"></div><div id="bq-detail"></div><details><summary>Model scope and response import format</summary><p>The shortlist is Pareto-based on peak sampled contact reaction and bending stress: a candidate is retained when no other assessed candidate improves one without worsening the other. Unknown mechanical ratings and directional response remain unresolved. No globally optimal or operationally approved BHA is claimed.</p><p>Jar packages remain contiguous, but connection compatibility, neutral-zone placement, latch settings, hammer mass, magnetic spacing, tool directional ratings and formation response require review. Sparse survey/depth samples can miss local doglegs and contact peaks. Refine before interpreting.</p><p>Directional import: JSON schema <code>wellscope-candidate-responses/1</code>, with <code>entries</code> containing an exact <code>study</code> from the exported candidate, a <code>wellscope-directional-surface/1</code> surface and settings (mode, wobN, activation, toolface, inclination). Changes to study inputs invalidate association. Build/drop/DLS versus WOB are available only for an associated response; changing stabilizer positions does not generate a bit/rock response law.</p></details>`;
  $("bha").querySelector(".page-head").after(box);
  const style = document.createElement("style");
  style.textContent =
    "#bha-quick input[type=checkbox]{width:auto}#bq-anatomy{display:flex;overflow:auto;gap:12px}#bq-anatomy>div{flex:0 0 130px;text-align:center}#bq-anatomy svg{height:140px;width:70px}#bha-quick td,#bha-quick th,#sp-workspace td,#sp-workspace th{padding:9px;border-bottom:1px solid #dce3e7;text-align:left}#bq-charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:12px}";
  document.head.append(style);
  style.textContent +=
    "#bha-quick>.formgrid{grid-template-columns:repeat(4,minmax(0,1fr))}#bha-quick button:not(.primary),#sp-workspace button{padding:8px;border:1px solid #b8c8d0;border-radius:5px;background:#fff;color:#274453;cursor:pointer}#bha-quick button:disabled,#sp-workspace button:disabled{opacity:.5;cursor:default}@media(max-width:1100px){#bha-quick>.formgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){#bha-quick>.formgrid{grid-template-columns:1fr}}";
  const jump = document.createElement("button");
  jump.className = "primary";
  jump.textContent = "Quick simulation · BHA pre-design";
  jump.onclick = () => {
    document.querySelector('[data-page="bha"]').click();
    box.scrollIntoView();
  };
  $("string-in-hole").prepend(jump);
  let input,
    entries = [],
    report = null,
    busy = false,
    cancel = false;
  const fmt = (v, s = 1) => (v == null ? "Not evaluated" : (v / s).toFixed(2));
  function invalidate() {
    report = null;
    $("bq-results").innerHTML = "";
    $("bq-detail").innerHTML = "";
    $("bq-export").disabled = true;
    $("bq-status").textContent = "Inputs changed; generate a new comparison.";
  }
  function capture() {
    input = StringInHole.snapshot().input;
    const end = WellEngine.survey(input.survey).at(-1);
    for (const k of ["n", "e", "tvd"]) $("bq-" + k).value = end[k];
    $("bq-from").value = Math.max(1, input.bitMD - 200);
    $("bq-to").value = input.bitMD;
    $("bq-source").textContent =
      input.quality +
      " · " +
      input.source +
      " · " +
      input.components.length +
      " components · " +
      (input.axial
        ? "Distributed load inputs present"
        : "Load graphs require distributed inputs: Edit loads / import study");
    invalidate();
    $("bq-status").textContent = "Study frozen. Later edits require recapture.";
  }
  function options() {
    const num = (id) => {
      if (!$(id).value.trim()) throw Error("Missing " + id.replace("bq-", ""));
      return Number($(id).value);
    };
    return {
      maxBuild: num("bq-build"),
      maxDrop: num("bq-drop"),
      maxDLS: num("bq-dls"),
      tolerance: num("bq-tolerance"),
      target: Object.fromEntries(
        ["n", "e", "tvd"].map((k) => [k, num("bq-" + k)]),
      ),
      required: ["gamma", "mwd", "lwd", "rss"].filter(
        (k) => $("bq-" + k).checked,
      ),
    };
  }
  function draw(index) {
    const c = report.candidates[index],
      complete = c.rows.every((r) => r.status === "SOLVED_SCREENING");
    $("bq-detail").innerHTML =
      `<h3>${H.esc(c.name)}</h3><div id="bq-anatomy">${c.input.components.map((b) => `<div>${EquipmentDrawing.svg(b.family || b.type || "drill-collar")}<b>${H.esc(b.name)}</b><p>${fmt(b.length)} m · OD ${fmt(b.od, 0.001)} mm</p></div>`).join("")}</div><p>Missing required capabilities: ${H.esc(c.missing.join(", ") || "none declared missing")}. Directional response: ${H.esc(c.directional.status)}. Mechanical shortlist does not establish directional feasibility or safe limits.</p><p>Load curves use off-bottom pickup/slackoff (no rotation) and off-bottom rotation, with zero bit force and bit torque. Friction, mud, block weight and RPM come from the frozen study. Mechanical contact uses the original study load case, not these separate operating modes.</p><div class="bq-diagnostics"><h4>Why this result?</h4><p>${H.esc(c.comparisonReason)}</p><ul>${c.unresolved.map((x) => `<li>${H.esc(x)}</li>`).join("")}</ul><p>Change versus reference: contact ${fmt(c.deltaFromReference?.[0], 9806.65)} tf · bending ${fmt(c.deltaFromReference?.[1], 1e6)} MPa. Negative means lower; these differences do not quantify numerical uncertainty.</p></div><div id="bq-charts"></div><div id="bq-inspect"></div>`;
    const charts = $("bq-charts"),
      add = (html) =>
        charts.insertAdjacentHTML(
          "beforeend",
          "<section>" + html + "</section>",
        );
    if (complete) {
      add(
        H.svg(
          [
            {
              name: "Contact reaction",
              points: c.rows.map((r) => ({ x: r.contactN / 9806.65, y: r.md })),
            },
          ],
          { x: "Total contact reaction (tf)", y: "Bit MD (m)", depth: true },
        ),
      );
      add(
        H.svg(
          [
            {
              name: "Interior bending",
              points: c.rows.map((r) => ({
                x: r.bendingPa == null ? NaN : r.bendingPa / 1e6,
                y: r.md,
              })),
            },
          ],
          {
            x: "Peak sampled bending stress (MPa)",
            y: "Bit MD (m)",
            depth: true,
          },
        ),
      );
    } else
      add(
        "<p>Incomplete mechanical sweep; no continuous curve drawn across failed stations.</p>",
      );
    if (c.loads.every((r) => r.status === "CALCULATED")) {
      add(
        H.svg(
          ["pickup", "slackoff"].map((k) => ({
            name: k,
            points: c.loads.map((r, i) => ({
              x: r[k].hookN / 9806.65,
              y: report.depths[i],
            })),
          })),
          { x: "Hookload (tf)", y: "Bit MD (m)", depth: true },
        ),
      );
      if (c.loads.every((r) => r.rotating))
        add(
          H.svg(
            [
              {
                name: "Rotating torque",
                points: c.loads.map((r, i) => ({
                  x: r.rotating.torqueNm / 9806.65,
                  y: report.depths[i],
                })),
              },
            ],
            { x: "Surface torque (tf.m)", y: "Bit MD (m)", depth: true },
          ),
        );
    } else
      add(
        "<p>Load curves unavailable: " +
          H.esc(
            c.loads.find((r) => r.status !== "CALCULATED")?.error ||
              "Supply distributed loads and friction inputs.",
          ) +
          "</p>",
      );
    if (c.directional.rows) {
      add(
        "<p>" +
          H.esc(c.directional.status + " · " + c.directional.source) +
          "<br>" +
          H.esc(c.directional.conditions || "Conditions not described") +
          "</p>",
      );
      add(
        H.svg(
          [
            {
              name: "Signed build",
              points: c.directional.rows.map((r) => ({
                x: r.wobN / 9806.65,
                y: r.build,
              })),
            },
            {
              name: "Drop magnitude",
              points: c.directional.rows.map((r) => ({
                x: r.wobN / 9806.65,
                y: Math.max(0, -r.build),
              })),
            },
          ],
          { x: "WOB (tf)", y: "Rate (°/30 m)" },
        ),
      );
      add(
        H.svg(
          [
            {
              name: "DLS",
              points: c.directional.rows.map((r) => ({
                x: r.wobN / 9806.65,
                y: r.dls,
              })),
            },
          ],
          { x: "WOB (tf)", y: "DLS (°/30 m)" },
        ),
      );
      add(
        "<p>WOB ranges within directional objectives: " +
          (c.directional.windows
            .map(
              (w) => fmt(w.fromN, 9806.65) + "–" + fmt(w.toN, 9806.65) + " tf",
            )
            .join(", ") || "none") +
          ". Source surface only; not a full operating window.</p>",
      );
    } else
      add(
        "<p>Build/drop/DLS versus WOB: missing candidate-specific response surface. No geometry-derived prediction is fabricated.</p>",
      );
    $("bq-inspect").innerHTML = c.rows
      .map(
        (r, i) =>
          `<p>${fmt(r.md)} m · ${H.esc(r.error || r.status)} · body limits: ${H.esc(r.bodyStatus || "Not evaluated")} ${
            r.status === "SOLVED_SCREENING"
              ? ["peakContact", "peakBending"]
                  .filter((k) => r[k])
                  .map(
                    (k) =>
                      `<button data-depth="${i}" data-field="${k}">Inspect ${k === "peakContact" ? "peak contact" : "peak bending"} · ${H.esc(r[k].name)} at ${fmt(r[k].md)} m</button>`,
                  )
                  .join(" ")
              : ""
          }</p>`,
      )
      .join("");
    $("bq-inspect").onclick = (e) => {
      const b = e.target.closest("[data-depth]");
      if (!b) return;
      const p = structuredClone(c.input);
      p.bitMD = report.depths[+b.dataset.depth];
      StringInHole.applyStudy(p);
      const point = c.rows[+b.dataset.depth][b.dataset.field];
      if (point && StringInHole.snapshot().result)
        StringInHole.select(point.component, point.md);
      document.querySelector('[data-page="bha-static"]').click();
      $("sd-workspace").scrollIntoView();
    };
  }
  function render() {
    const g = report.geometry;
    $("bq-results").innerHTML =
      `<p>Trajectory endpoint distance to target: ${fmt(g.targetDistanceM)} m · ${g.targetWithinTolerance ? "within requested tolerance" : "TARGET MISMATCH"}. ${g.violations.length} survey intervals exceed build/drop/DLS objectives. Max build ${fmt(g.maxBuild)}, drop ${fmt(g.maxDrop)}, DLS ${fmt(g.maxDLS)} °/30 m.</p><div style="overflow:auto"><table><thead><tr><th>Candidate</th><th>Mechanical comparison</th><th>Peak contact (tf)</th><th>Peak bending (MPa)</th><th>Required capabilities</th><th>Response surface</th></tr></thead><tbody>${report.candidates.map((c, i) => `<tr><td><button data-candidate="${i}">${H.esc(c.name)}</button></td><td>${c.mechanicalCandidate ? "Pareto candidate · preliminary" : "Not shortlisted · see reasons"}</td><td>${fmt(c.metrics?.[0], 9806.65)}</td><td>${fmt(c.metrics?.[1], 1e6)}</td><td>${H.esc(c.missing.join(", ") || (report.options.required.length ? "Present" : "None requested"))}</td><td>${H.esc(c.directional.status)}</td></tr>`).join("")}</tbody></table></div>`;
    draw(0);
  }
  $("bq-results").onclick = (e) => {
    const b = e.target.closest("[data-candidate]");
    if (b) draw(+b.dataset.candidate);
  };
  $("bq-capture").onclick = capture;
  $("bq-loads").onclick = () => {
    document.querySelector('[data-page="bha-static"]').click();
    $("string-in-hole").scrollIntoView();
  };
  for (const el of box.querySelectorAll("input:not([type=file])"))
    el.oninput = invalidate;
  $("bq-response").onchange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5000000) throw Error("Response bundle exceeds 5 MB");
      const data = JSON.parse(await file.text());
      if (
        data.schema !== "wellscope-candidate-responses/1" ||
        !Array.isArray(data.entries) ||
        data.entries.length > 50
      )
        throw Error("Invalid response bundle");
      const seenStudies = new Set();
      for (const x of data.entries) {
        const key = Q.identity(x.study);
        if (seenStudies.has(key))
          throw Error(
            "Duplicate response association: keep one surface per study.",
          );
        seenStudies.add(key);
        if (!x.study?.components)
          throw Error("Exact study association required");
        DirectionalResponse.validate(x.surface);
        DirectionalResponse.response(x.surface, x.settings);
      }
      entries = data.entries;
      invalidate();
      $("bq-status").textContent =
        entries.length + " response associations loaded; recompute candidates.";
    } catch (e) {
      $("bq-status").textContent = e.message;
    } finally {
      $("bq-response").value = "";
    }
  };
  $("bq-cancel").onclick = () => {
    cancel = true;
  };
  $("bq-run").onclick = async () => {
    if (busy) return;
    invalidate();
    try {
      const opt = options(),
        geometry = Q.geometry(input, opt),
        depths = F.depths(
          input,
          Number($("bq-from").value),
          Number($("bq-to").value),
          Number($("bq-count").value),
        ),
        candidates = Q.generate(input);
      busy = true;
      cancel = false;
      for (const el of box.querySelectorAll("input,button")) el.disabled = true;
      $("bq-cancel").disabled = false;
      for (const c of candidates) {
        c.rows = [];
        c.loads = [];
        c.geometry = geometry;
        c.missing = Q.requirements(c.input, opt.required);
        c.directional = Q.directional(c, entries, opt);
        for (const md of depths) {
          if (cancel) throw Error("Cancelled; partial report discarded.");
          $("bq-status").textContent =
            "Calculating " + c.name + " at " + fmt(md) + " m…";
          await new Promise((r) => setTimeout(r, 20));
          c.rows.push(F.sample(c.input, md));
          c.loads.push(Q.loads(c.input, md));
        }
      }
      if (cancel) throw Error("Cancelled; partial report discarded.");
      report = {
        schema: "wellscope-bha-predesign/1",
        options: opt,
        geometry,
        depths,
        candidates: Q.shortlist(candidates),
        responseImportTemplate: {
          schema: "wellscope-candidate-responses/1",
          entries: candidates.map((c) => ({
            study: c.input,
            surface: null,
            settings: null,
          })),
        },
      };
      render();
      $("bq-status").textContent =
        candidates.length +
        " assemblies compared at " +
        depths.length +
        " depths. Preliminary placement shortlist; inspect missing data before deciding.";
    } catch (e) {
      $("bq-status").textContent = e.message;
    } finally {
      busy = false;
      for (const el of box.querySelectorAll("input,button"))
        el.disabled = false;
      $("bq-cancel").disabled = true;
      $("bq-export").disabled = !report;
    }
  };
  $("bq-export").onclick = () => {
    if (!report) return;
    const u = URL.createObjectURL(
        new Blob([JSON.stringify(report, null, 2)], {
          type: "application/json",
        }),
      ),
      a = document.createElement("a");
    a.href = u;
    a.download = "wellscope-bha-predesign.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  };
  capture();
  if (location.hash === "#bha-quick") {
    document.querySelector('[data-page="bha"]').click();
    box.scrollIntoView();
  }
})();
