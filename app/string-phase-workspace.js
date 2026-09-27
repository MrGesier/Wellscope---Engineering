(() => {
  const $ = (id) => document.getElementById(id),
    esc = EngineeringCharts.esc,
    F = StringPhase;
  const box = document.createElement("section");
  box.id = "sp-workspace";
  box.className = "panel";
  box.innerHTML = `<h3>Phase passage · BHA placement comparison</h3><p>Compare a stabilizer or complete jar/accelerator package across neighbouring components. Length, mass, geometry and package order are preserved. Connections and OEM placement rules require separate review.</p><button id="sp-capture">Freeze current study</button><p id="sp-source"></p><div class="formgrid"><label>Start bit MD (m)<input id="sp-from" type="number"></label><label>End bit MD (m)<input id="sp-to" type="number"></label><label>Depth stations (2–21)<input id="sp-count" type="number" value="5"></label><label>First component<select id="sp-tool"></select></label><label>Consecutive components in package<input id="sp-block" type="number" value="1"></label></div><p id="sp-layout"></p><button id="sp-run">Compare placements</button> <button id="sp-cancel" disabled>Cancel</button> <button id="sp-export" disabled>Export comparison</button><p id="sp-status" role="status"></p><div id="sp-results" style="overflow:auto"></div><p>Discrete static screening only: refine depth spacing and beam mesh before interpreting peaks. Summed transverse wall reaction is neither hookload nor sticking probability. Survey DLS is not a tool limit. No differential sticking, pack-off, keyseating, jar impact, post-buckling or bit/rock trajectory prediction. Inspect each case for sourced limits and neutral-force crossings in Combined mechanics. No automatic placement approval.</p><p><a href="https://www.odfjelltechnology.com/activity/drilling-jar-placement-how-to-get-it-right/">Jar placement reference</a> · <a href="https://www.hpinc.com/resources/technical-paper/stiff-string-casing-design-tortuosity-and-centralisation">Stiffness and tortuosity reference</a></p>`;
  $("sa-workspace").after(box);
  let reference,
    report,
    busy = false,
    cancel = false;
  const fmt = (v, scale = 1) => (v == null ? "—" : (v / scale).toFixed(2));
  function reset() {
    report = null;
    $("sp-export").disabled = true;
    $("sp-results").innerHTML = "";
    $("sp-status").textContent =
      "Inputs changed; recompute the phase comparison.";
    const i = +$("sp-tool").value,
      n = +$("sp-block").value;
    $("sp-layout").textContent =
      "Package: " +
      reference.components
        .slice(i, i + n)
        .map((b) => b.name)
        .join(" → ");
  }
  function capture() {
    reference = StringInHole.snapshot().input;
    $("sp-source").textContent =
      reference.quality + " · frozen: " + reference.source;
    $("sp-from").value = Math.max(1, reference.bitMD - 200);
    $("sp-to").value = reference.bitMD;
    $("sp-tool").innerHTML = reference.components
      .map((b, i) =>
        i > 0 && i < reference.components.length - 1
          ? `<option value="${i}">${i + 1}. ${esc(b.name)}</option>`
          : "",
      )
      .join("");
    reset();
  }
  function render() {
    $("sp-results").innerHTML = report.variants
      .map(
        (v, k) =>
          `<h4>${esc(v.name)}</h4><p>${esc(v.input.components.map((b) => b.name).join(" → "))}</p><table><thead><tr><th>Bit MD (m)</th><th>Status</th><th>Sum of wall reactions (tf)</th><th>Bending (MPa)</th><th>Nominal radial gap (mm)</th><th>Max occupied survey DLS (°/30 m)</th><th>Body limits / jar neutral distance</th><th>3D</th></tr></thead><tbody>${v.rows.map((r, j) => `<tr><td>${fmt(r.md)}</td><td>${esc(r.error || r.status)}</td><td>${fmt(r.contactN, 9806.65)}</td><td>${fmt(r.bendingPa, 1e6)}</td><td>${fmt(r.minRadialGapM, 0.001)}</td><td>${fmt(r.maxSurveyDLS)}</td><td>${esc(r.bodyStatus || "Not evaluated")} · ${r.jarNeutral?.map((j) => esc(j.name) + ": " + (j.distanceM == null ? "Not evaluated / no zero crossing" : fmt(j.distanceM) + " m")).join("; ") || "No occupied jar"}</td><td>${r.status === "SOLVED_SCREENING" ? `<button data-v="${k}" data-r="${j}">Inspect</button>` : ""}</td></tr>`).join("")}</tbody></table>`,
      )
      .join("");
  }
  $("sp-capture").onclick = capture;
  for (const id of ["sp-tool", "sp-block", "sp-from", "sp-to", "sp-count"])
    $(id).oninput = reset;
  $("sp-cancel").onclick = () => {
    cancel = true;
  };
  $("sp-run").onclick = async () => {
    if (busy) return;
    reset();
    try {
      const ds = F.depths(
          reference,
          +$("sp-from").value,
          +$("sp-to").value,
          +$("sp-count").value,
        ),
        vs = F.variants(reference, +$("sp-tool").value, +$("sp-block").value);
      busy = true;
      cancel = false;
      for (const el of box.querySelectorAll("input,select,button"))
        el.disabled = true;
      $("sp-cancel").disabled = false;
      const next = {
        version: 1,
        scope: "Discrete screening, not operational approval",
        depths: ds,
        variants: [],
      };
      for (const v of vs) {
        const rows = [];
        for (const md of ds) {
          if (cancel) throw Error("Cancelled; partial comparison discarded.");
          $("sp-status").textContent =
            `Calculating ${v.name} at ${md.toFixed(1)} m…`;
          await new Promise((resolve) => setTimeout(resolve, 20));
          rows.push(F.sample(v.input, md));
        }
        next.variants.push({ ...v, rows });
      }
      if (cancel) throw Error("Cancelled; partial comparison discarded.");
      report = next;
      render();
      $("sp-status").textContent =
        `${vs.length} placements × ${ds.length} depths. Frozen study results; failed stations cannot establish passage. Inspect applies a case to the 3D workspace.`;
    } catch (e) {
      $("sp-status").textContent = e.message;
    } finally {
      busy = false;
      for (const el of box.querySelectorAll("input,select,button"))
        el.disabled = false;
      $("sp-cancel").disabled = true;
      $("sp-export").disabled = !report;
    }
  };
  $("sp-results").onclick = (e) => {
    const b = e.target.closest("[data-v]");
    if (!b || !report) return;
    const v = report.variants[+b.dataset.v],
      p = structuredClone(v.input);
    p.bitMD = v.rows[+b.dataset.r].md;
    StringInHole.applyStudy(p);
    const row = v.rows[+b.dataset.r],
      point = row.peakContact || row.peakBending;
    if (point && StringInHole.snapshot().result)
      StringInHole.select(point.component, point.md);
    $("sd-workspace").scrollIntoView({ behavior: "smooth" });
  };
  $("sp-export").onclick = () => {
    if (!report) return;
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(report, null, 2)], {
          type: "application/json",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "wellscope-phase-comparison.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  capture();
})();
