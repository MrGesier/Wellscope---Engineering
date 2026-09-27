(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    esc = EngineeringCharts.esc,
    clone = (x) => JSON.parse(JSON.stringify(x));
  const key = "wellscope-static-bha-v1";
  let result = null,
    baseline = null,
    angle = 0.45,
    dirty = true,
    forceUnit = "tf";
  const tool = (name, length, od, contactOD) => ({
    name,
    length,
    od,
    id: 0.071,
    contactOD,
    E: 210e9,
    G: 80e9,
    mass: 145,
    source: "Fictional uniform steel equivalent",
  });
  function demo() {
    return {
      version: 1,
      name: "Fictional inclined BHA / 12 m span",
      source: "Synthetic straight 65° interval; not a field case",
      bitMD: 3000,
      length: 12,
      n: 40,
      inc: 65,
      wobN: 15000,
      torqueNm: 5000,
      rho: 1200,
      sections: [
        {
          from: 0,
          to: 2600,
          diameter: 0.224,
          kind: "CASED",
          source: "Fictional casing ID",
        },
        {
          from: 2600,
          to: 3100,
          diameter: 0.216,
          kind: "OPEN",
          source: "Fictional nominal hole diameter",
        },
      ],
      components: [
        tool("Bit adapter", 1, 0.171, 0.2),
        tool("Lower collar", 3, 0.171, 0.171),
        tool("Stabilizer", 0.5, 0.171, 0.21),
        tool("Upper collar", 7.5, 0.171, 0.171),
      ],
    };
  }
  let input = demo();
  const page = document.createElement("section");
  page.id = "bha-static";
  page.className = "page";
  page.innerHTML = `<div class="page-head"><div><div class="eyebrow">WELL ARCHITECTURE / LOCAL BHA MECHANICS</div><h1>Architecture & BHA deformation</h1><p>Compare static bending and frictionless wall contacts in a short BHA interval.</p></div><span class="tag">PRELIMINARY / SMALL DEFLECTION</span></div>
  <div class="work-toolbar"><button id="bs-demo">Fictional example</button><button id="bs-capture">Capture bottom 12 m of project</button><button id="bs-save">Save study locally</button><button id="bs-load">Load saved study</button><button id="bs-export">Export study JSON</button><label class="filebtn">Import study JSON<input id="bs-import" type="file" accept=".json" hidden></label></div>
  <article class="panel"><h2>1 · Well architecture</h2><p>Contiguous MD intervals from surface. Enter casing/liner internal diameter, or open-hole nominal/caliper diameter. This study has its own explicit architecture snapshot.</p><div id="bs-identity" class="workform"></div><div id="bs-architecture" class="tablebox"></div><button id="bs-section">Add section</button></article>
  <article class="panel"><h2>2 · BHA and loading</h2><p>Bit to top; equivalent uniform tube properties must be supplied for each tool. End positions are pinned to the well centre; end rotations are free. The model excludes the remainder of the drillstring.</p><div id="bs-controls" class="workform"></div><div id="bs-components" class="tablebox"></div><button id="bs-add">Add component</button><p>Constant effective compression = entered WOB. Axial weight transfer, friction, internal tool flexibility, coupled torque/buckling and dynamics are excluded. Torque affects elastic twist only; it does not change the lateral shape.</p></article>
  <div class="work-toolbar"><button id="bs-calc" class="primary">Calculate deformation</button><button id="bs-baseline" disabled>Keep as design A</button><button id="bs-clear">Clear comparison</button></div><p id="bs-state" role="status"></p><div id="bs-error" role="alert" class="error"></div>
  <article class="panel"><div class="panel-title"><h2>3 · Local 3D view</h2><label>Transverse magnification<select id="bs-scale"><option value="1">1× — true scale</option><option value="10">10×</option><option value="25" selected>25× — inspect contacts</option></select></label></div><p>Drag to orbit. Both hole and tool cross-sections use the displayed transverse magnification. Heat colours: calculated magnitude · copper dots: wall contact · dashed: design A. End pins are imposed supports, not predicted contacts.</p><canvas id="bs-canvas" width="1100" height="430" style="width:100%;background:#f5f7f8;touch-action:none" aria-label="Orbitable three-dimensional BHA deformation inside bore"></canvas><div id="bs-summary"></div><label>Inspect station <input id="bs-station" type="range" min="0" max="40" value="20"></label><div id="bs-inspect"></div><div id="bs-profile"></div></article>
  <article class="panel"><h2>Interpretation and qualification</h2><p>This is a local, two-plane Euler–Bernoulli beam calculation with circular, frictionless contact constraints and a constant prescribed compressive force. It is not a whole-string stiff-string solver. Buckling regimes are rejected when the unconstrained tangent stiffness loses positive definiteness; post-buckling is not solved. No approved operating window is inferred.</p><p>The top and bit are ideal centred pins. Changing the modeled length changes those boundary conditions. Stabilizer contact uses an axisymmetric envelope; complex tools use your entered equivalent stiffness. Check mesh sensitivity before comparing contact forces. Survey interpolation cannot resolve unmeasured micro-tortuosity.</p><p>Rotational vibration, whirl, stick-slip, fatigue, rock/bit steering and DLS prediction require separate models. Geometry and boundary assumptions must be checked against an independent reference before field use.</p></article>`;
  document.querySelector(".content").append(page);
  const viewControls = document.createElement("div");
  viewControls.className = "work-toolbar";
  viewControls.innerHTML = `<label>Colour field<select id="bs-field"><option value="bendingPa">Bending stress magnitude (MPa)</option><option value="momentNm">Bending moment magnitude</option><option value="offset">Eccentricity (mm)</option></select></label><label><input id="bs-mesh" type="checkbox" checked> Beam mesh</label><label><input id="bs-arrows" type="checkbox" checked> Contact reactions</label><div id="bs-legend" role="status"></div><p>Colours show calculated magnitudes, not allowable utilization. Beam elements carry mean endpoint values, not a solid stress distribution. Circles: nodes · squares: element midpoints. Click a marker to inspect it. Design A uses the same colour scale and dashed lines. Arrows show wall reaction direction with lengths proportional to force; they are not displacements.</p>`;
  $("bs-canvas").before(viewControls);
  const nav = document.createElement("button");
  nav.className = "nav";
  nav.dataset.page = page.id;
  nav.textContent = "Architecture & BHA deformation";
  let firstVisit = true;
  nav.onclick = () => {
    WellApp.navigate(page.id);
    $("crumb").textContent = "ARCHITECTURE / BHA DEFORMATION";
    if (firstVisit) {
      firstVisit = false;
      load(clone(window.BhaImportExample));
    }
    draw();
  };
  const importSample = document.createElement("button");
  importSample.id = "bs-mock-import";
  importSample.textContent = "Load detailed mock import";
  importSample.onclick = () => load(clone(window.BhaImportExample));
  $("bs-demo").before(importSample);
  const sampleLink = document.createElement("a");
  sampleLink.href = "assets/examples/bha-static-training.json";
  sampleLink.download = "bha-static-training.json";
  sampleLink.textContent = "Download mock import JSON";
  $("bs-demo").after(sampleLink);
  document.querySelector('[data-page="bha"]').after(nav);
  const directionalLink = document.createElement("button");
  directionalLink.id = "bs-directional-planning";
  directionalLink.className = "smallbutton";
  directionalLink.textContent = "Build / drop and DLS vs WOB →";
  directionalLink.onclick = () => {
    document.querySelector('[data-page="directional"]').click();
    document.getElementById("directional-planning").scrollIntoView();
  };
  page.querySelector(".page-head").after(directionalLink);
  const field = (id, label, v, type = "number") =>
    `<label>${label}<input id="${id}" type="${type}" ${type === "number" ? 'step="any"' : ""} value="${esc(v)}"></label>`;
  function table(target, rows, cols) {
    $(target).innerHTML =
      `<table><thead><tr>${cols.map((c) => `<th>${c[1]}</th>`).join("")}<th></th></tr></thead><tbody>${rows.map((r, i) => `<tr>${cols.map(([k, l, factor = 1]) => `<td><input aria-label="${esc(l)} row ${i + 1}" data-row="${i}" data-key="${k}" data-factor="${factor}" value="${esc(typeof r[k] === "number" ? r[k] / factor : r[k])}" style="min-width:90px;width:100%"></td>`).join("")}<td><button data-remove="${i}">Remove</button></td></tr>`).join("")}</tbody></table>`;
  }
  const archCols = [
    ["from", "From MD (m)"],
    ["to", "To MD (m)"],
    ["kind", "OPEN / CASED"],
    ["diameter", "Bore ID (mm)", 0.001],
    ["source", "Source / revision"],
  ];
  const compCols = [
    ["name", "Tool"],
    ["length", "Length (m)"],
    ["od", "Body OD (mm)", 0.001],
    ["id", "Body ID (mm)", 0.001],
    ["contactOD", "Contact OD (mm)", 0.001],
    ["mass", "Mass (kg/m)"],
    ["E", "E (GPa)", 1e9],
    ["G", "G (GPa)", 1e9],
    ["source", "Source / revision"],
  ];
  function paint() {
    $("bs-identity").innerHTML =
      field("bs-name", "Study name", input.name, "text") +
      field("bs-source", "Geometry source / datum", input.source, "text");
    const f = forceUnit === "tf" ? 9806.65 : 1000;
    $("bs-controls").innerHTML =
      `<label>Force / torque units<select id="bs-units"><option ${forceUnit === "tf" ? "selected" : ""}>tf</option><option ${forceUnit === "kN" ? "selected" : ""}>kN</option></select></label>` +
      field("bs-md", "Bit MD (m)", input.bitMD) +
      field("bs-inc", "Inclination (°)", input.inc) +
      field("bs-wob", "WOB (" + forceUnit + ")", input.wobN / f) +
      field("bs-torque", "Torque (" + forceUnit + "·m)", input.torqueNm / f) +
      field("bs-rho", "Mud density (kg/m³)", input.rho) +
      field("bs-n", "Mesh intervals", input.n);
    $("bs-units").onchange = (e) => {
      collect();
      forceUnit = e.target.value;
      paint();
    };
    $("bs-inc").disabled = !!input.survey;
    table("bs-architecture", input.sections, archCols);
    table("bs-components", input.components, compCols);
    for (const [id, prop] of [
      ["bs-architecture", "sections"],
      ["bs-components", "components"],
    ])
      $(id)
        .querySelectorAll("[data-remove]")
        .forEach(
          (b) =>
            (b.onclick = () => {
              collect();
              input[prop].splice(+b.dataset.remove, 1);
              paint();
              invalidate();
            }),
        );
    invalidate();
  }
  function collect() {
    for (const [id, prop] of [
      ["bs-architecture", "sections"],
      ["bs-components", "components"],
    ])
      $(id)
        .querySelectorAll("input[data-key]")
        .forEach((el) => {
          const k = el.dataset.key;
          input[prop][+el.dataset.row][k] = ["name", "source", "kind"].includes(
            k,
          )
            ? el.value
            : el.value.trim() === ""
              ? NaN
              : Number(el.value) * Number(el.dataset.factor);
        });
    const forceScale = forceUnit === "tf" ? 9806.65 : 1000;
    for (const [id, k, f = 1] of [
      ["bs-md", "bitMD"],
      ["bs-inc", "inc"],
      ["bs-wob", "wobN", forceScale],
      ["bs-torque", "torqueNm", forceScale],
      ["bs-rho", "rho"],
      ["bs-n", "n"],
    ])
      input[k] = $(id).value.trim() === "" ? NaN : Number($(id).value) * f;
    input.name = $("bs-name").value;
    input.source = $("bs-source").value;
    input.length = input.components.reduce((s, b) => s + b.length, 0);
  }
  function invalidate() {
    dirty = true;
    result = null;
    $("bs-baseline").disabled = true;
    $("bs-state").textContent =
      "Inputs changed — calculate to display a current result.";
    $("bs-summary").textContent = "";
    $("bs-inspect").textContent = "";
    $("bs-profile").textContent = "";
    draw();
  }
  page.addEventListener("input", (e) => {
    if (
      !["bs-scale", "bs-station", "bs-field", "bs-mesh", "bs-arrows"].includes(
        e.target.id,
      )
    )
      invalidate();
  });
  function prepare() {
    if (!input.name.trim() || !input.source.trim())
      throw Error("Study name and geometry source are required");
    if (!Number.isInteger(input.n) || input.n < 12 || input.n > 100)
      throw Error("Use 12–100 mesh intervals");
    if (input.survey) {
      const st = WellEngine.survey(input.survey),
        top = input.bitMD - input.length;
      if (top < st[0].md || input.bitMD > st.at(-1).md)
        throw Error("Captured survey does not cover the modeled interval");
      const bit = WellEngine.interp(st, input.bitMD),
        a = (bit.azi * Math.PI) / 180,
        inc = (bit.inc * Math.PI) / 180;
      input.inc = bit.inc;
      $("bs-inc").value = bit.inc;
      // Cross-plane basis: horizontal right and downward low side.
      const right = [-Math.sin(a), Math.cos(a), 0],
        low = [
          -Math.cos(inc) * Math.cos(a),
          -Math.cos(inc) * Math.sin(a),
          Math.sin(inc),
        ];
      input.centers = Array.from({ length: input.n + 1 }, (_, i) => {
        const p = WellEngine.interp(
            st,
            input.bitMD - (i * input.length) / input.n,
          ),
          v = [p.n - bit.n, p.e - bit.e, p.tvd - bit.tvd];
        return [right, low].map((axis) =>
          axis.reduce((s, t, j) => s + t * v[j], 0),
        );
      });
    } else delete input.centers;
  }
  function calculate() {
    try {
      collect();
      prepare();
      result = BhaStatic.solve(input);
      dirty = false;
      $("bs-error").textContent = "";
      $("bs-state").textContent = result.status + " · " + input.source;
      $("bs-baseline").disabled = false;
      $("bs-station").max = input.n;
      summary();
      draw();
    } catch (e) {
      invalidate();
      $("bs-error").textContent = e.message;
    }
  }
  const forceScale = () => (forceUnit === "tf" ? 9806.65 : 1000);
  function metrics(r) {
    return `<td>${(r.maxOffset * 1000).toFixed(2)}</td><td>${(r.maxBendingPa / 1e6).toFixed(2)}</td><td>${((r.twistRad * 180) / Math.PI).toFixed(2)}</td><td>${r.contacts}</td>`;
  }
  function summary() {
    if (!result) return;
    const same =
      baseline &&
      JSON.stringify(baseline.input.sections) ===
        JSON.stringify(input.sections) &&
      baseline.input.bitMD === input.bitMD &&
      baseline.input.length === input.length &&
      JSON.stringify(baseline.input.survey) === JSON.stringify(input.survey) &&
      baseline.input.inc === input.inc;
    $("bs-summary").innerHTML =
      `<table><tr><th>Design</th><th>Max eccentricity (mm)</th><th>Max bending stress (MPa)</th><th>Elastic twist (°)</th><th>Contact nodes</th></tr><tr><th>Current<br>${(input.wobN / forceScale()).toFixed(2)} ${forceUnit} / ${(input.torqueNm / forceScale()).toFixed(2)} ${forceUnit}·m</th>${metrics(result)}</tr>${baseline ? `<tr><th>A: ${esc(baseline.input.name)}<br>${(baseline.input.wobN / forceScale()).toFixed(2)} ${forceUnit} / ${(baseline.input.torqueNm / forceScale()).toFixed(2)} ${forceUnit}·m</th>${metrics(baseline.result)}</tr>` : ""}</table><p>Convergence residual ${result.residualN.toFixed(3)} N. Contact-node count is mesh dependent, not a count of physical tools.${baseline && !same ? " Comparison uses different geometry / boundaries: overlay disabled." : ""}</p>`;
    input.overlayCompatible = !!same;
    const max = Math.max(1, ...result.rows.map((r) => r.bendingPa / 1e6)),
      rows = result.rows;
    $("bs-profile").innerHTML =
      `<h3>Bending stress versus measured depth</h3><svg viewBox="0 0 700 250" role="img" aria-label="Bending stress horizontal, measured depth increasing downward"><path d="M70 20V215H650" fill="none" stroke="#8396a3"/><polyline fill="none" stroke="#31566e" stroke-width="2" points="${[
        ...rows,
      ]
        .reverse()
        .map(
          (r) =>
            `${70 + (r.bendingPa / 1e6 / max) * 570},${20 + ((r.md - (input.bitMD - input.length)) / input.length) * 195}`,
        )
        .join(
          " ",
        )}"/><text x="70" y="242">0 → ${max.toFixed(1)} MPa</text><text x="5" y="20">${(input.bitMD - input.length).toFixed(1)} m</text><text x="5" y="215">${input.bitMD.toFixed(1)} m</text></svg>`;
    inspect();
  }
  let picked = null,
    hitTargets = [];
  const colourField = () => {
    const k = $("bs-field").value;
    return {
      key: k,
      unit:
        k === "bendingPa" ? "MPa" : k === "offset" ? "mm" : forceUnit + "·m",
      factor: k === "bendingPa" ? 1e6 : k === "offset" ? 0.001 : forceScale(),
    };
  };
  const heatColour = (t) => {
    t = Math.max(0, Math.min(1, t));
    const stops = [
        [49, 86, 110],
        [222, 184, 115],
        [165, 66, 38],
      ],
      j = t < 0.5 ? 0 : 1,
      f = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    return `rgb(${stops[j].map((v, i) => Math.round(v + (stops[j + 1][i] - v) * f)).join(",")})`;
  };
  function inspect() {
    if (!result) return;
    if (picked) {
      const rows = picked.design === "A" ? baseline?.result.rows : result.rows;
      if (rows && rows[picked.i]) {
        const a = rows[picked.i],
          b = picked.kind === "element" ? rows[picked.i + 1] : a,
          f = colourField();
        if (b) {
          $("bs-inspect").textContent =
            `${picked.design} · ${picked.kind} ${picked.i} · MD ${a.md.toFixed(2)}${b !== a ? " → " + b.md.toFixed(2) : ""} m · ${a.name}${b.name !== a.name ? " / " + b.name : ""} · ${f.key}: ${((a[f.key] + b[f.key]) / 2 / f.factor).toFixed(3)} ${f.unit}${b !== a ? " (mean of endpoints)" : ""} · endpoint reaction ${(a.reactionN / forceScale()).toFixed(3)} ${forceUnit}${b !== a ? " / " + (b.reactionN / forceScale()).toFixed(3) + " " + forceUnit : ""} · ${a.x === 0 || picked.i === rows.length - 1 ? "Imposed pin" : a.contact ? "Wall contact" : "No wall contact"}`;
          return;
        }
      }
      picked = null;
    }
    const r = result.rows[Math.min(input.n, +$("bs-station").value)];
    $("bs-inspect").textContent =
      `MD ${r.md.toFixed(2)} m · ${r.name} · eccentricity ${(r.offset * 1000).toFixed(2)} mm · bending ${(r.bendingPa / 1e6).toFixed(2)} MPa · ${r.x === 0 || r.x === input.length ? "Imposed end support" : r.contact ? "Wall contact" : "No wall contact"} · reaction ${(r.reactionN / forceScale()).toFixed(3)} ${forceUnit}`;
  }
  function draw() {
    const c = $("bs-canvas");
    if (!c) return;
    const g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    g.font = "15px Segoe UI";
    g.fillStyle = "#536979";
    if (!result) {
      hitTargets = [];
      picked = null;
      $("bs-legend").textContent = "No current calculated field";
      g.fillText("Calculate a valid study to view the deformation.", 35, 50);
      return;
    }
    const mag = +$("bs-scale").value,
      scale = 800 / input.length,
      project = (x, y, z) => [
        120 + x * scale + Math.sin(angle) * y * scale * mag * 0.45,
        215 + (Math.cos(angle) * y + Math.sin(angle) * z) * scale * mag,
      ];
    const line = (points, color, width = 1, dash = []) => {
      g.beginPath();
      g.setLineDash(dash);
      points.forEach((p, i) => {
        const q = project(...p);
        i ? g.lineTo(...q) : g.moveTo(...q);
      });
      g.strokeStyle = color;
      g.lineWidth = width;
      g.stroke();
      g.setLineDash([]);
    };
    const field = colourField(),
      comparison = baseline && input.overlayCompatible;
    const allRows = [
      ...result.rows,
      ...(comparison ? baseline.result.rows : []),
    ];
    const fieldMax = Math.max(
      0,
      ...allRows.map((r) => r[field.key] / field.factor),
    );
    const maxReaction = Math.max(
      0,
      ...allRows.filter((r) => r.contact).map((r) => r.reactionN),
    );
    $("bs-legend").innerHTML =
      `<div style="width:250px;height:12px;background:linear-gradient(90deg,${heatColour(0)},${heatColour(0.5)},${heatColour(1)})"></div><span>0 — ${(fieldMax / 2).toFixed(3)} — ${fieldMax.toFixed(3)} ${field.unit} · ${comparison ? "shared current / A" : "current design"}${fieldMax === 0 ? " · zero field" : ""}</span><br><small>${result.rows.length} nodes / ${result.rows.length - 1} beam elements${comparison ? " · A: " + baseline.result.rows.length + " nodes" : ""}. Arrow maximum: ${(maxReaction / forceScale()).toFixed(3)} ${forceUnit} = 60 px (screen schematic).</small>`;
    hitTargets = [];
    for (let side = 0; side < 4; side++) {
      const a = (side * Math.PI) / 2;
      line(
        result.rows.map((r) => [
          r.x,
          r.center[0] + (Math.cos(a) * r.hole) / 2,
          r.center[1] + (Math.sin(a) * r.hole) / 2,
        ]),
        "#b7c4cd",
      );
    }
    for (const r of result.rows.filter((_, i) => i % 4 === 0))
      line(
        Array.from({ length: 25 }, (_, j) => [
          r.x,
          r.center[0] + (Math.cos((j * Math.PI) / 12) * r.hole) / 2,
          r.center[1] + (Math.sin((j * Math.PI) / 12) * r.hole) / 2,
        ]),
        "#d4dde3",
      );
    function renderDesign(rows, design) {
      rows.slice(0, -1).forEach((a, i) => {
        const b = rows[i + 1],
          value = (a[field.key] + b[field.key]) / 2 / field.factor,
          col = heatColour(fieldMax ? value / fieldMax : 0);
        if (design === "Current") {
          const quad = [
            [a.x, a.u[0], a.u[1] - a.od / 2],
            [b.x, b.u[0], b.u[1] - b.od / 2],
            [b.x, b.u[0], b.u[1] + b.od / 2],
            [a.x, a.u[0], a.u[1] + a.od / 2],
          ];
          g.beginPath();
          quad.forEach((p, j) =>
            j ? g.lineTo(...project(...p)) : g.moveTo(...project(...p)),
          );
          g.closePath();
          g.globalAlpha = 0.65;
          g.fillStyle = col;
          g.fill();
          g.globalAlpha = 1;
        }
        line(
          [
            [a.x, ...a.u],
            [b.x, ...b.u],
          ],
          col,
          design === "A" ? 5 : 3,
          design === "A" ? [4, 4] : [],
        );
        if ($("bs-mesh").checked) {
          const q = project(
            (a.x + b.x) / 2,
            (a.u[0] + b.u[0]) / 2,
            (a.u[1] + b.u[1]) / 2,
          );
          g.fillStyle = col;
          g.fillRect(q[0] - 3, q[1] - 3, 6, 6);
          g.strokeStyle = "#233e50";
          g.strokeRect(q[0] - 3, q[1] - 3, 6, 6);
          hitTargets.push({ q, design, kind: "element", i });
        }
      });
      rows.forEach((r, i) => {
        const q = project(r.x, ...r.u);
        if ($("bs-mesh").checked) {
          g.beginPath();
          g.arc(...q, 3.5, 0, 2 * Math.PI);
          g.fillStyle = design === "A" ? "#fff5e8" : "#fff";
          g.fill();
          g.strokeStyle = "#233e50";
          g.stroke();
          hitTargets.push({ q, design, kind: "node", i });
          if (i % 5 === 0 || i === rows.length - 1) {
            g.font = "11px Segoe UI";
            g.fillStyle = "#233e50";
            g.fillText(
              (design === "A" ? "A" : "N") + i,
              q[0] - 5,
              q[1] + (design === "A" ? -12 : 18),
            );
          }
        }
        if ($("bs-arrows").checked && r.contact && r.reactionN > 0) {
          const v = r.reactionVectorN,
            tip = project(
              r.x,
              r.u[0] + v[0] / r.reactionN,
              r.u[1] + v[1] / r.reactionN,
            ),
            dx = tip[0] - q[0],
            dy = tip[1] - q[1],
            norm = Math.hypot(dx, dy);
          if (norm > 1e-7) {
            const length = (60 * r.reactionN) / (maxReaction || 1),
              x = q[0] + (dx / norm) * length,
              y = q[1] + (dy / norm) * length,
              theta = Math.atan2(dy, dx);
            g.strokeStyle = "#8c3e2d";
            g.lineWidth = 2;
            g.setLineDash(design === "A" ? [3, 3] : []);
            g.beginPath();
            g.moveTo(...q);
            g.lineTo(x, y);
            g.stroke();
            g.setLineDash([]);
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(
              x - 6 * Math.cos(theta - 0.45),
              y - 6 * Math.sin(theta - 0.45),
            );
            g.lineTo(
              x - 6 * Math.cos(theta + 0.45),
              y - 6 * Math.sin(theta + 0.45),
            );
            g.closePath();
            g.fillStyle = "#8c3e2d";
            g.fill();
          }
        }
      });
    }
    renderDesign(result.rows, "Current");
    if (comparison) renderDesign(baseline.result.rows, "A");
    for (let s of [-1, 1])
      line(
        result.rows.map((r) => [r.x, r.u[0], r.u[1] + (s * r.od) / 2]),
        "#31566e",
        2,
      );
    for (const r of result.rows) {
      if (r.contactOD > r.od + 0.001)
        line(
          Array.from({ length: 17 }, (_, j) => [
            r.x,
            r.u[0] + (Math.cos((j * Math.PI) / 8) * r.contactOD) / 2,
            r.u[1] + (Math.sin((j * Math.PI) / 8) * r.contactOD) / 2,
          ]),
          "#718795",
          1,
        );
      if (r.contact) {
        const q = project(r.x, ...r.u);
        g.beginPath();
        g.arc(...q, 3, 0, 2 * Math.PI);
        g.fillStyle = "#b77842";
        g.fill();
      }
    }
    g.fillStyle = "#233e50";
    g.font = "15px Segoe UI";
    if (picked && $("bs-mesh").checked) {
      const rows =
        picked.design === "A" && comparison
          ? baseline.result.rows
          : result.rows;
      const a = rows[picked.i],
        b = picked.kind === "element" ? rows[picked.i + 1] : a;
      if (a && b) {
        const q = project(
          (a.x + b.x) / 2,
          (a.u[0] + b.u[0]) / 2,
          (a.u[1] + b.u[1]) / 2,
        );
        g.beginPath();
        g.arc(...q, 8, 0, Math.PI * 2);
        g.strokeStyle = "#101f29";
        g.lineWidth = 2;
        g.stroke();
      }
    }
    g.fillText("BIT · pinned", 65, 400);
    g.fillText("TOP · pinned", 870, 400);
    g.fillText(
      "Transverse scale " +
        mag +
        "× · length " +
        input.length.toFixed(2) +
        " m · orbit " +
        Math.round((angle * 180) / Math.PI) +
        "°",
      30,
      30,
    );
    inspect();
  }
  $("bs-calc").onclick = calculate;
  $("bs-demo").onclick = () => {
    input = demo();
    baseline = null;
    paint();
    calculate();
  };
  $("bs-baseline").onclick = () => {
    if (result && !dirty) {
      baseline = { input: clone(input), result: clone(result) };
      summary();
      draw();
    }
  };
  $("bs-clear").onclick = () => {
    baseline = null;
    if (result) summary();
    draw();
  };
  $("bs-section").onclick = () => {
    collect();
    const from = input.sections.at(-1)?.to || 0;
    input.sections.push({
      from,
      to: from + 100,
      diameter: 0.216,
      kind: "OPEN",
      source: "Enter geometry source",
    });
    paint();
  };
  $("bs-add").onclick = () => {
    collect();
    input.components.push(tool("New equivalent tool", 1, 0.171, 0.171));
    paint();
  };
  $("bs-capture").onclick = () => {
    try {
      const s = WellApp.snapshot().state;
      input = demo();
      input.bitMD = s.bitMD;
      input.survey = WellEngine.parseCSV(s.refcsv);
      input.name = "Project reference / bottom 12 m";
      input.source =
        "Captured reference survey and BHA; review nominal architecture and equivalent E/G";
      let remaining = 12;
      input.components = [];
      for (const b of s.bha) {
        if (remaining <= 0) break;
        const len = Math.min(remaining, b.length);
        input.components.push({
          ...tool(b.name, len, b.od, b.contactOD || b.od),
          id: b.id,
          mass: b.mass,
          source: "Project dimensions; ASSUMED steel-equivalent E/G — verify",
        });
        remaining -= len;
      }
      input.length = 12 - remaining;
      input.sections = [
        {
          from: 0,
          to: input.bitMD + 1,
          diameter: 0.216,
          kind: "OPEN",
          source: "ASSUMED 216 mm — replace with actual architecture",
        },
      ];
      baseline = null;
      paint();
      $("bs-state").textContent =
        "Project captured. Review architecture, contact diameters and equivalent stiffness before calculating.";
    } catch (e) {
      $("bs-error").textContent = e.message;
    }
  };
  $("bs-save").onclick = () => {
    try {
      collect();
      prepare();
      BhaStatic.solve(input);
      localStorage.setItem(key, JSON.stringify(input));
      $("bs-state").textContent = "Study saved separately on this device.";
    } catch (e) {
      $("bs-error").textContent = e.message;
    }
  };
  function load(p) {
    if (
      p.version !== 1 ||
      !Array.isArray(p.components) ||
      !Array.isArray(p.sections)
    )
      throw Error("Unsupported study JSON");
    BhaStatic.solve(p);
    input = p;
    baseline = null;
    paint();
    calculate();
  }
  $("bs-load").onclick = () => {
    try {
      const s = localStorage.getItem(key);
      if (!s) throw Error("No saved deformation study");
      load(JSON.parse(s));
    } catch (e) {
      $("bs-error").textContent = e.message;
    }
  };
  $("bs-export").onclick = () => {
    try {
      collect();
      prepare();
      BhaStatic.solve(input);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(input, null, 2)], {
          type: "application/json",
        }),
      );
      a.download = "wellscope-bha-static.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
      $("bs-error").textContent = e.message;
    }
  };
  $("bs-import").onchange = async (e) => {
    try {
      if (e.target.files[0]) load(JSON.parse(await e.target.files[0].text()));
    } catch (err) {
      $("bs-error").textContent = err.message;
    }
    e.target.value = "";
  };
  $("bs-scale").onchange = draw;
  for (const id of ["bs-field", "bs-mesh", "bs-arrows"]) $(id).onchange = draw;
  $("bs-station").oninput = () => {
    picked = null;
    inspect();
  };
  let drag = null;
  let pointerStart = null,
    moved = false;
  $("bs-canvas").onpointerdown = (e) => {
    drag = e.clientX;
    pointerStart = [e.clientX, e.clientY];
    moved = false;
    e.target.setPointerCapture(e.pointerId);
  };
  $("bs-canvas").onpointermove = (e) => {
    if (drag !== null) {
      if (
        Math.hypot(e.clientX - pointerStart[0], e.clientY - pointerStart[1]) > 4
      )
        moved = true;
      angle += (e.clientX - drag) * 0.01;
      drag = e.clientX;
      draw();
    }
  };
  $("bs-canvas").onpointerup = (e) => {
    if (!moved && result && $("bs-mesh").checked) {
      const rect = e.target.getBoundingClientRect(),
        x = ((e.clientX - rect.left) * e.target.width) / rect.width,
        y = ((e.clientY - rect.top) * e.target.height) / rect.height;
      let best = null,
        distance = 12;
      for (const t of hitTargets) {
        const d = Math.hypot(t.q[0] - x, t.q[1] - y);
        if (d < distance) {
          best = t;
          distance = d;
        }
      }
      if (best) {
        picked = best;
        draw();
      }
    }
    drag = null;
    pointerStart = null;
  };
  $("bs-canvas").onpointercancel = () => {
    drag = null;
    pointerStart = null;
  };
  window.BhaStaticWorkspace = {
    snapshot: () => clone({ input, result, baseline }),
    demo,
  };
  paint();
  if (location.hash === "#bha-static") nav.onclick();
})();
