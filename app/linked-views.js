(() => {
  "use strict";
  const A = WellApp,
    C = WellCore,
    $ = (id) => document.getElementById(id),
    host = document.createElement("article");
  host.className = "panel";
  host.innerHTML =
    '<h2>Linked well / interval selection</h2><div class="workform"><label>Wellbore<select id="linked-well"><option>REFERENCE</option><option>OFFSET A</option><option>OFFSET B</option><option>SIDETRACK</option></select></label><label>MD from (m)<input type="number" id="linked-from" value="2700" step="any"></label><label>MD to (m, optional)<input type="number" id="linked-to" step="any"></label><button id="linked-select" class="primary">Select interval</button></div><p id="linked-info" class="work-note">Views share the selected well and MD interval. T&D is calculated only for the reference string.</p><div class="workform"><label>View<select id="linked-view"><option>Vertical Section</option><option>Depth Schematic</option><option>Spider</option><option>Ladder</option><option>Traveling Cylinder</option></select></label><label>Section azimuth (degrees)<input id="section-azimuth" type="number" value="70" step="any"></label></div><canvas id="linked-canvas" width="1000" height="360" aria-label="Linked geometric well view"></canvas><p class="work-note">Geometry only. Traveling-cylinder view uses local right/highside offsets; uncertainty is absent. Depth schematic requires source-backed casing intervals; empty intervals are not inferred.</p><details><summary>Casing / hole sections JSON</summary><textarea id="schematic-json" class="work-json" aria-label="Casing sections">[]</textarea><button id="schematic-apply" class="smallbutton">Apply geometry intervals</button></details><h3>Synthetic acceptance scenarios</h3><div class="workform"><label>Fixture<select id="fixture-select"></select></label><button id="fixture-run" class="smallbutton">Run synthetic fixture</button><button id="fixture-load" class="smallbutton">Load CASE_F into workspace</button></div><pre id="fixture-result" class="workresult"></pre>';
  $("overview").append(host);
  let sections = [];
  for (const [id, c] of Object.entries(WellScenarios.cases)) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id + " · " + c.label;
    $("fixture-select").append(opt);
  }
  function attempt(fn) {
    try {
      $("work-error").textContent = "";
      fn();
    } catch (e) {
      $("work-error").textContent = e.message;
    }
  }
  $("linked-select").onclick = () =>
    attempt(() => {
      const md = C.number($("linked-from").value),
        to =
          $("linked-to").value === "" ? null : C.number($("linked-to").value);
      if (to !== null && to < md) throw Error("Interval end precedes start");
      A.selectLocation({ wellbore: $("linked-well").value, md, to });
      draw();
    });
  $("schematic-apply").onclick = () =>
    attempt(() => {
      const rows = JSON.parse($("schematic-json").value);
      if (!Array.isArray(rows)) throw Error("Expected section array");
      for (const row of rows)
        if (
          C.number(row.from) < 0 ||
          C.number(row.to) <= row.from ||
          C.number(row.od_m) <= 0 ||
          !row.source
        )
          throw Error(
            "Each section needs ordered from/to MD, positive od_m and source",
          );
      sections = rows;
      A.load({ hole_sections: rows });
      draw();
    });
  $("fixture-run").onclick = () =>
    attempt(() => {
      const c = WellScenarios.cases[$("fixture-select").value];
      if (c.surveys) {
        $("fixture-result").textContent = JSON.stringify(c, null, 2);
        return;
      }
      try {
        $("fixture-result").textContent = JSON.stringify(
          {
            ...WellCore.scan(
              c.reference,
              c.offset,
              WellScenarios.frame,
              c.offset_reference || WellScenarios.frame,
            ),
            expected_distance_m: c.expected_distance_m,
            interpretation: c.interpretation,
          },
          null,
          2,
        );
      } catch (e) {
        $("fixture-result").textContent = e.message;
      }
    });
  $("fixture-load").onclick = () =>
    attempt(() => {
      const c = WellScenarios.cases.CASE_F_TD,
        toCSV = (rows) =>
          "md,inc,azi\n" +
          rows.map((p) => [p.md, p.inc, p.azi].join(",")).join("\n"),
        bha = A.snapshot().state.bha;
      bha[bha.length - 1].length += Math.max(
        0,
        4500 - bha.reduce((s, b) => s + b.length, 0),
      );
      A.load({
        refcsv: toCSV(c.surveys),
        offcsv: toCSV(c.surveys),
        offBcsv: toCSV(c.surveys),
        sidecsv: toCSV(
          c.surveys.map((p) => ({ ...p, azi: p.md > 2200 ? 110 : p.azi })),
        ),
        bha,
        bitMD: 4200,
        tieInMD: 2200,
        sections: c.sections,
        location: { wellbore: "REFERENCE", md: 3450 },
      });
      $("bit-md-v4").value = 4200;
      $("fixture-result").textContent =
        "SYNTHETIC CASE_F loaded; 4200 mMD, editable sections, selected landing/lateral inspection MD 3450. Parent branch ties at 2200 mMD.";
    });
  function draw() {
    const { state, derived: d } = A.snapshot(),
      loc = state.location || {
        wellbore: "REFERENCE",
        md: d.ref[state.select].md,
      },
      canvas = $("linked-canvas"),
      g = canvas.getContext("2d");
    g.clearRect(0, 0, 1000, 360);
    const az = (C.number($("section-azimuth").value) * Math.PI) / 180,
      kind = $("linked-view").value,
      paths = [
        ["REFERENCE", d.ref, "#31566e"],
        ["OFFSET A", d.off, "#b77842"],
        ["OFFSET B", d.offB, "#688299"],
        ["SIDETRACK", d.side, "#c6a8ff"],
      ],
      center = WellEngine.interp(d.ref, loc.md);
    let series = [];
    for (const [name, rows, color] of paths) {
      const projected = rows.map((p) => {
        let xy;
        if (kind === "Spider") xy = [p.e, p.n];
        else if (kind === "Ladder") {
          const q = WellEngine.closestOnPolyline(p, d.ref);
          xy = [q.distance, p.md];
        } else if (kind === "Traveling Cylinder") {
          const t = WellPlus.transverseOffset(center, p);
          xy = [t.x, t.y];
        } else if (kind === "Depth Schematic") xy = [0, p.md];
        else xy = [p.n * Math.cos(az) + p.e * Math.sin(az), p.tvd];
        return { ...p, x: xy[0], y: xy[1] };
      });
      series.push({ name, color, rows: projected });
    }
    const points = series.flatMap((s) => s.rows),
      xmin = Math.min(...points.map((p) => p.x)),
      xmax = Math.max(...points.map((p) => p.x)),
      ymin = Math.min(...points.map((p) => p.y)),
      ymax = Math.max(...points.map((p) => p.y)),
      X = (x) => 70 + ((x - xmin) / (xmax - xmin || 1)) * 850,
      Y = (y) => 35 + ((kind === "Spider" || kind === "Traveling Cylinder") ? 1-(y-ymin)/(ymax-ymin||1) : (y-ymin)/(ymax-ymin||1)) * 270;
    g.font = "14px Segoe UI";
    g.fillStyle = "#526e80";
    g.fillText(kind + ((kind === "Spider") ? " · East → / North ↑ (m)" : kind === "Traveling Cylinder" ? " · Right → / Highside ↑ (m)" : kind === "Ladder" ? " · Separation → (m) / MD ↓ (m)" : " · Section → (m) / Depth ↓ (m)"), 20, 20);
    if (kind === "Depth Schematic") {
      g.strokeStyle = "#52738a";
      g.beginPath();
      g.moveTo(500, 35);
      g.lineTo(500, 305);
      g.stroke();
      for (const section of sections) {
        const y = Y(section.from),
          height = Y(section.to) - y,
          w = section.od_m * 150;
        g.strokeStyle = "#688299";
        g.strokeRect(500 - w / 2, y, w, height);
        g.fillStyle = "#526e80";
        g.fillText(
          (section.label || "Casing") +
            " " +
            section.from +
            "–" +
            section.to +
            " mMD",
          550,
          y + 16,
        );
      }
      if (!sections.length)
        g.fillText("No casing/hole interval data loaded", 370, 150);
    } else {
      series.forEach((s, i) => {
        g.strokeStyle = s.color;
        g.beginPath();
        s.rows.forEach((p, j) =>
          j ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y)),
        );
        g.lineWidth = s.name === loc.wellbore ? 3 : 1.5;
        g.stroke();
        g.fillStyle = s.color;
        g.fillText(s.name, 30 + i * 200, 340);
      });
    }
    $("linked-info").textContent =
      `${loc.wellbore} · ${loc.md} ${loc.to ? "– " + loc.to : ""} mMD · ${loc.component || "no component selected"} · ${loc.wellbore === "REFERENCE" ? "Reference axial plot linked" : "Axial model NOT COMPUTED for this well"}`;
  }
  $("linked-view").onchange = () => attempt(draw);
  $("section-azimuth").onchange = () => attempt(draw);
  window.addEventListener("wellscope:change", () => attempt(draw));
  draw();
})();
