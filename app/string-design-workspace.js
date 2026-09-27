(() => {
  const $ = (id) => document.getElementById(id),
    esc = EngineeringCharts.esc;
  const box = document.createElement("section");
  box.id = "sd-workspace";
  box.innerHTML = `<h3>3D design inspection & comparison</h3><p>Drag to orbit, wheel to zoom, right-drag to pan. Click a tool or a red contact. The bore follows the actual survey; transverse dimensions and deflection share the displayed magnification.</p><div class="work-toolbar"><label>Bore display<select id="sd-bore"><option value="cut">Cutaway</option><option value="transparent">Transparent</option><option value="hidden">Hidden</option></select></label><label>Transverse scale<select id="sd-scale"><option value="1">1× physical</option><option value="10">10×</option><option value="20" selected>20×</option><option value="40">40×</option></select></label><label>Surface<select id="sd-field"><option value="tools">Components</option><option value="stress">Bending stress</option></select></label><label><input type="checkbox" id="sd-wire" checked> Triangles</label><label><input type="checkbox" id="sd-nodes" checked> Beam stations</label><button id="sd-fit">Fit camera</button></div><div class="work-toolbar"><label><input type="checkbox" id="sd-adaptive"> Adaptive bottom 120 m</label><label>Local target spacing (m)<select id="sd-fine"><option value="2">2</option><option value="1" selected>1</option><option value="0.5">0.5</option><option value="0.25">0.25</option></select></label><button id="sd-remesh">Apply mesh / calculate</button><button id="sd-converge">Compare with finer mesh</button></div><p id="sd-mesh"></p><p id="sd-convergence" role="status"></p><div class="work-toolbar"><button id="sd-keep">Keep current as design A</button><button id="sd-restore">Restore design A</button><button id="sd-clear">Clear A</button><button id="sd-export">Export A/B comparison</button></div><p id="sd-compare" role="status"></p><div id="sd-views" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,350px),1fr));gap:16px"><div><h4>Current design B</h4><div id="sd-current" style="min-width:0"></div></div><div id="sd-baseline-pane" hidden><h4>Frozen design A · synchronized camera</h4><div id="sd-baseline" style="min-width:0"></div></div></div><p id="sd-legend"></p><div class="work-toolbar"><canvas id="sd-section" width="260" height="260" style="width:260px;height:260px;max-width:100%;flex:0 0 260px;background:#eef1f2" aria-label="Physical cross section showing body, contact envelope and clearance"></canvas><div id="sd-contact"></div></div><details><summary>Edit selected component for design B</summary><p>Equivalent properties and illustrative geometry. Keep a source for each engineering change. Length changes also shift every component above it.</p><div id="sd-editor" class="work-toolbar"></div><button id="sd-apply">Apply component / recalculate B</button><p id="sd-edit-status" role="status"></p></details><div id="sd-metrics"></div>`;
  $("si-canvas").before(box);
  const style = document.createElement("style");
  style.textContent =
    "#sd-workspace{margin:24px 0;padding:24px;background:#fafbfc;border:1px solid #d4dfe4;border-radius:8px}#sd-workspace .work-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:14px 0}#sd-workspace button{padding:9px 13px;border:1px solid #b9cbd4;border-radius:5px;background:#fff;color:#274453;cursor:pointer}#sd-workspace button:disabled{opacity:.45;cursor:default}#sd-workspace label{display:flex;align-items:center;gap:6px}#sd-workspace h4{color:#304c5e}#sd-workspace table{width:100%}#sd-editor input{max-width:140px}#sd-editor #sd-edit-source{max-width:360px}#sd-views>div{min-width:0}#sd-current,#sd-baseline{border:1px solid #ced9df;border-radius:6px;overflow:hidden}@media(max-width:600px){#sd-workspace{padding:10px}}";
  document.head.append(style);
  let baseline = null,
    state = StringInHole.snapshot(),
    currentView,
    baselineView,
    lastWindow = "",
    lastStudy = "",
    editing = -1,
    syncing = false,
    convergenceToken = 0;
  const conditionKey = (p) =>
    JSON.stringify([
      p.survey,
      p.sections,
      p.bitMD,
      p.rho,
      p.tensionN,
      p.stepM,
      !!p.adaptive,
      p.fineStepM ?? 1,
    ]);
  const metrics = (r) => ({
    offset: Math.max(...r.rows.map((r) => r.offset)) * 1000,
    stress: Math.max(...r.rows.map((r) => r.bendingPa || 0)) / 1e6,
    reaction:
      r.rows.filter((r) => r.contact).reduce((s, r) => s + r.reactionN, 0) /
      9806.65,
  });
  try {
    currentView = StringView3D.create($("sd-current"), (pick) =>
      StringInHole.select(pick.component, pick.md),
    );
    baselineView = StringView3D.create($("sd-baseline"), () => {});
    function sync(from, to) {
      if (syncing) return;
      syncing = true;
      to.camera.position.copy(from.camera.position);
      to.camera.quaternion.copy(from.camera.quaternion);
      to.controls.target.copy(from.controls.target);
      to.controls.update();
      to.render();
      syncing = false;
    }
    currentView.controls.addEventListener("change", () =>
      sync(currentView, baselineView),
    );
    baselineView.controls.addEventListener("change", () =>
      sync(baselineView, currentView),
    );
  } catch (e) {
    $("sd-current").textContent =
      "3D graphics unavailable on this device. The calculated 2D inspection remains available below.";
  }
  function editor() {
    $("sd-edit-status").textContent = "";
    const b = state.input.components[state.selected];
    if (!b) return;
    editing = state.selected;
    $("sd-editor").innerHTML =
      `<b>${esc(b.name)}</b>` +
      [
        ["length", "Length (m)", b.length],
        ["od", "Body OD (mm)", b.od * 1000],
        ["id", "Body ID (mm)", b.id * 1000],
        ["contactOD", "Contact OD (mm)", b.contactOD * 1000],
        ["mass", "Mass (kg/m)", b.mass],
        ["E", "Equivalent E (GPa)", b.E / 1e9],
      ]
        .map(
          ([k, l, v]) =>
            `<label>${l}<input id="sd-edit-${k}" type="number" step="any" value="${v}"></label>`,
        )
        .join("") +
      `<label>Change source<input id="sd-edit-source" value="${esc(b.source)}"></label>`;
    $("sd-editor")
      .querySelectorAll("input")
      .forEach(
        (el) =>
          (el.oninput = () => {
            $("sd-edit-status").textContent =
              "Unapplied component edits. The displayed shape still uses the last calculated design.";
          }),
      );
  }
  function update(next) {
    state = next;
    const key = JSON.stringify(next.input);
    if (key !== lastStudy || !next.result) {
      lastStudy = key;
      convergenceToken++;
      $("sd-convergence").textContent = "";
      editor();
    }
    if (editing !== state.selected) editor();
    $("sd-adaptive").checked = !!state.input.adaptive;
    const fine = state.input.fineStepM ?? 1;
    if (![...$("sd-fine").options].some((o) => o.value === String(fine)))
      $("sd-fine").add(new Option(String(fine), String(fine)));
    $("sd-fine").value = fine;
    render();
  }
  function render() {
    const r = state.result,
      p = state.input;
    const compatible =
      baseline && conditionKey(baseline.input) === conditionKey(p);
    $("sd-keep").disabled = !r;
    $("sd-apply").disabled = !r;
    $("sd-converge").disabled = !r;
    $("sd-export").disabled = !r || !compatible;
    $("sd-restore").disabled = !baseline;
    $("sd-clear").disabled = !baseline;
    $("sd-baseline-pane").hidden = !compatible || !r;
    $("sd-compare").textContent = !baseline
      ? "Keep design A, then edit the selected component to calculate B."
      : compatible
        ? "A/B: identical survey, architecture, depth, mud, prescribed tension and mesh settings. Geometry-sensitive station locations may differ."
        : "Comparison hidden: conditions differ from frozen A. Restore A or keep a new baseline before comparing.";
    if (!r) {
      currentView?.update(null, {});
      baselineView?.update(null, {});
      $("sd-metrics").innerHTML = "";
      $("sd-mesh").textContent = "No current solution.";
      $("sd-contact").textContent = "No current solution.";
      $("sd-section").getContext("2d").clearRect(0, 0, 260, 260);
      return;
    }
    const span = state.span || 60,
      mid = Math.max(0, Math.min(p.bitMD, state.inspectMD || 0)),
      lo = Math.max(0, Math.min(p.bitMD - span, mid - span / 2)),
      hi = Math.min(p.bitMD, lo + span),
      scale = +$("sd-scale").value;
    $("sd-mesh").textContent =
      `${r.adaptive ? "Adaptive bottom 120 m" : "Uniform"} · ${r.rows.length} beam stations · actual intervals ${r.minStepM.toFixed(3)}–${r.maxStepM.toFixed(2)} m · residual ${r.residualN.toFixed(3)} N. Upper-string joints retain conservative cell envelopes.`;
    const maxStress = Math.max(
        ...r.rows.map((r) => r.bendingPa || 0),
        ...(compatible
          ? baseline.result.rows.map((r) => r.bendingPa || 0)
          : [0]),
      ),
      options = {
        heat: $("sd-field").value === "stress",
        maxStress,
        wire: $("sd-wire").checked,
        nodes: $("sd-nodes").checked,
        bore: $("sd-bore").value,
      };
    currentView?.update(StringGeometry.mesh(p, r, lo, hi, scale), options);
    baselineView?.update(
      compatible
        ? StringGeometry.mesh(baseline.input, baseline.result, lo, hi, scale)
        : null,
      options,
    );
    const windowKey = [span, scale, !!compatible].join("/");
    if (lastWindow !== windowKey) {
      lastWindow = windowKey;
      currentView?.fit();
    }
    $("sd-legend").textContent =
      `${lo.toFixed(1)}–${hi.toFixed(1)} m MD · transverse ${scale}× · red: wall reaction / black: beam station. ${options.heat ? `Shared stress scale 0–${(maxStress / 1e6).toFixed(2)} MPa; no allowable/yield comparison.` : "Component colours; surface mesh is separate from the calculation mesh."}`;
    const nearest = r.rows.reduce((best, row) =>
        Math.abs(row.md - mid) < Math.abs(best.md - mid) ? row : best,
      ),
      s = p.sections.find((s) => nearest.md >= s.from && nearest.md <= s.to),
      b = r.parts[nearest.component],
      u = nearest.position.reduce(
        (v, x, k) => v + (x - nearest.center[k]) * nearest.axes[0][k],
        0,
      ),
      v = nearest.position.reduce(
        (v, x, k) => v + (x - nearest.center[k]) * nearest.axes[1][k],
        0,
      ),
      g = $("sd-section").getContext("2d"),
      factor = 100 / (s.diameter / 2);
    g.clearRect(0, 0, 260, 260);
    const circle = (x, y, r, color, dash = []) => {
      g.beginPath();
      g.setLineDash(dash);
      g.arc(130 + x * factor, 130 + y * factor, r * factor, 0, Math.PI * 2);
      g.strokeStyle = color;
      g.lineWidth = 2;
      g.stroke();
    };
    circle(0, 0, s.diameter / 2, "#9b8059");
    circle(u, v, b.od / 2, "#365a70");
    circle(u, v, nearest.contactOD / 2, "#bb553d", [4, 3]);
    g.setLineDash([]);
    g.fillStyle = "#345";
    g.font = "12px sans-serif";
    g.fillText("Section at actual proportions", 20, 250);
    $("sd-contact").innerHTML =
      `<b>${nearest.md.toFixed(2)} m MD · ${esc(b.name)}</b><p>${nearest.pin ? "Centred support" : nearest.contact ? "Wall contact" : "No wall reaction"} · ${(nearest.reactionN / 9806.65).toFixed(3)} tf</p><p>Eccentricity ${(nearest.offset * 1000).toFixed(2)} mm · conservative clearance ${Math.max(0, (nearest.gap - nearest.offset) * 1000).toFixed(2)} mm<br>Solid blue: body · dashed copper: cell contact envelope.<br>Section rounded to nearest calculated station; axes are local normal planes.</p>`;
    const m = metrics(r),
      a = compatible ? metrics(baseline.result) : null;
    $("sd-metrics").innerHTML =
      "<table><thead><tr><th>Whole occupied string</th><th>Current B</th>" +
      (a ? "<th>Frozen A</th><th>B − A</th>" : "") +
      "</tr></thead><tbody>" +
      [
        ["offset", "Max eccentricity (mm)"],
        ["stress", "Max sampled bending stress (MPa)"],
        ["reaction", "Sum of wall reaction magnitudes (tf)"],
      ]
        .map(
          ([k, l]) =>
            `<tr><td>${l}</td><td>${m[k].toFixed(3)}</td>${a ? `<td>${a[k].toFixed(3)}</td><td>${(m[k] - a[k]).toFixed(3)}</td>` : ""}</tr>`,
        )
        .join("") +
      '</tbody></table><p class="work-note">These are mesh-dependent model results, not acceptance limits. Check refinement for both designs before interpreting the differences.</p>';
  }
  for (const id of ["sd-bore", "sd-scale", "sd-field", "sd-wire", "sd-nodes"])
    $(id).onchange = render;
  $("sd-fit").onclick = () => currentView?.fit();
  $("sd-keep").onclick = () => {
    if (state.result) {
      baseline = structuredClone(state);
      render();
    }
  };
  $("sd-clear").onclick = () => {
    baseline = null;
    render();
  };
  $("sd-restore").onclick = () => {
    if (baseline) StringInHole.applyStudy(baseline.input);
  };
  $("sd-remesh").onclick = () => {
    const p = structuredClone(state.input);
    p.adaptive = $("sd-adaptive").checked;
    p.fineStepM = +$("sd-fine").value;
    StringInHole.applyStudy(p);
  };
  $("sd-apply").onclick = () => {
    if (!state.result) return;
    const p = structuredClone(state.input),
      b = p.components[state.selected];
    for (const k of ["length", "od", "id", "contactOD", "mass", "E"])
      b[k] =
        +$("sd-edit-" + k).value *
        (k === "E" ? 1e9 : ["od", "id", "contactOD"].includes(k) ? 0.001 : 1);
    b.source = $("sd-edit-source").value.trim();
    try {
      StringContact.prepare(p);
      StringInHole.applyStudy(p);
      $("sd-edit-status").textContent = StringInHole.snapshot().result
        ? "Design B recalculated."
        : "Calculation failed; no current B shape.";
    } catch (e) {
      $("sd-edit-status").textContent = "Edit rejected: " + e.message;
    }
  };
  $("sd-converge").onclick = () => {
    if (!state.result) return;
    const token = ++convergenceToken,
      p = structuredClone(state.input),
      old = metrics(state.result);
    p.adaptive = true;
    p.fineStepM = Math.max(0.1, (p.fineStepM ?? 1) / 2);
    p.stepM = Math.max(1, p.stepM / 2);
    $("sd-convergence").textContent = "Calculating finer mesh…";
    setTimeout(() => {
      try {
        const r = StringContact.solve(p),
          m = metrics(r);
        if (token !== convergenceToken) return;
        $("sd-convergence").textContent =
          `Refinement: ${state.result.rows.length} → ${r.rows.length} stations. Changes: eccentricity ${(m.offset - old.offset).toFixed(3)} mm; peak bending ${(m.stress - old.stress).toFixed(3)} MPa; summed wall reactions ${(m.reaction - old.reaction).toFixed(3)} tf. Residual ${r.residualN.toFixed(3)} N. No automatic convergence acceptance; repeat with the finer settings before interpreting a design difference.`;
      } catch (e) {
        if (token === convergenceToken)
          $("sd-convergence").textContent = "Refinement failed: " + e.message;
      }
    }, 0);
  };
  $("sd-export").onclick = () => {
    if (
      !baseline ||
      !state.result ||
      conditionKey(baseline.input) !== conditionKey(state.input)
    )
      return;
    const content = {
        schema: "wellscope-string-comparison/1",
        A: baseline.input,
        B: state.input,
        metrics: { A: metrics(baseline.result), B: metrics(state.result) },
        qualification:
          "Preliminary; mesh dependent; no operating-limit certification",
      },
      url = URL.createObjectURL(
        new Blob([JSON.stringify(content, null, 2)], {
          type: "application/json",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "wellscope-string-comparison.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  window.addEventListener("string-shape-update", (e) => update(e.detail));
  window.StringDesign = {
    snapshot: () => ({
      baseline: structuredClone(baseline),
      current: currentView?.snapshot(),
      baselineCamera: baselineView?.snapshot(),
      comparisonVisible: !$("sd-baseline-pane").hidden,
    }),
  };
  update(state);
})();
