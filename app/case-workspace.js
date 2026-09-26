/* Detailed training study. Mock observations are fixed evidence, not predictions. */
(() => {
  "use strict";
  const D = EngineeringCase,
    C = WellCore,
    A = WellApp,
    P = WellEvidence,
    $ = (id) => document.getElementById(id),
    esc = (v) =>
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
  let c = D.demo(),
    result = D.calculate(c),
    tab = "results",
    selected = c.settings.bitMD,
    component = 0,
    dirty = false,
    sensitivity = true;
  const groups = {
    length: ["m", "ft"],
    diameter: ["mm", "in"],
    force: ["tf", "kN", "klbf"],
    torque: ["tf.m", "kN.m", "klbf.ft"],
    pressure: ["bar", "psi", "MPa"],
    density: ["sg", "kg/m3", "ppg"],
    flow: ["L/min", "US gal/min"],
    mass: ["t", "kg", "lb"],
    linear: ["kg/m", "lb/ft"],
  };
  const kindNames = {
    length: "Depth / length",
    diameter: "Diameter",
    force: "Force (tonne-force)",
    torque: "Torque",
    pressure: "Pressure",
    density: "Fluid density",
    flow: "Flow rate",
    mass: "Mass",
    linear: "Linear mass",
  };
  const val = (v, k) => D.value(v, k, c.units),
    num = (v, d = 1) =>
      Number(v).toLocaleString("en-US", { maximumFractionDigits: d }),
    f = (v, k, d = 1) => num(val(v, k), d),
    unit = (k) => c.units[k];
  const host = document.createElement("section");
  host.className = "page";
  host.id = "engineering-case";
  host.innerHTML = `<div class="eng-case-head"><div><div class="eng-kicker">NORTHBANK / WELL N-04 / ENGINEERING</div><h1>Torque &amp; Drag</h1><p>Run 07 · 8½ in directional section · Off-bottom comparison</p></div><div class="eng-head-actions"><label>Study units<select id="case-unit-preset"><option value="metric">Metric · m / tf</option><option value="si">SI · m / kN</option><option value="field">Oilfield · ft / klbf</option><option value="custom" disabled>Custom units</option></select></label><button id="case-units-toggle" class="smallbutton">Customize units</button><button id="case-save" class="primary">Save case</button></div></div><div class="eng-unit-settings" id="case-units" hidden></div><div class="eng-demo-strip"><span class="eng-demo-tag">FICTIONAL TRAINING CASE</span><span>Complete inputs + mock connection log. Local axial screening; torque is a mock observation, not a solver output.</span><button id="case-reset">Reset example</button></div><div id="case-error" role="alert"></div><div class="eng-context-strip" id="case-context"></div><div class="eng-tabs" role="tablist">${[
    ["results", "Study overview"],
    ["inputs", "Well & conditions"],
    ["string", "BHA & drillstring"],
    ["observations", "Connection log"],
    ["report", "Report & export"],
  ]
    .map(
      ([id, label]) =>
        `<button role="tab" data-case-tab="${id}">${label}</button>`,
    )
    .join(
      "",
    )}</div><div id="case-body"></div><div id="case-print-content" hidden></div>`;
  document.querySelector(".content").append(host);
  const nav = document.createElement("button");
  nav.className = "nav";
  nav.dataset.page = "engineering-case";
  nav.textContent = "Torque & Drag study";
  nav.onclick = () => {
    A.navigate("engineering-case");
    $("crumb").textContent = "TORQUE & DRAG / TRAINING CASE";
  };
  $("navigation").prepend(nav);
  document.querySelector(".brand small").textContent = "ENGINEERING / 0.7";
  const theme = document.createElement("link");
  theme.rel = "stylesheet";
  theme.href = "engineering.css";
  document.head.append(theme);
  function download(name, content, type) {
    const u = URL.createObjectURL(new Blob([content], { type })),
      a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 10000);
  }
  function guard(fn) {
    return async (...args) => {
      try {
        $("case-error").textContent = "";
        await fn(...args);
      } catch (e) {
        $("case-error").textContent = e.message;
      }
    };
  }
  function ensureClean() {
    if (dirty)
      throw Error(
        "Apply or discard input changes before switching units, tabs or exporting.",
      );
  }
  function closest(rows, md) {
    return rows.reduce((a, b) =>
      Math.abs(b.md - md) < Math.abs(a.md - md) ? b : a,
    );
  }
  function context() {
    const s = c.settings;
    $("case-context").innerHTML = [
      ["Well / run", c.name],
      ["Bit depth", `${f(s.bitMD, "length", 0)} ${unit("length")} MD`],
      ["Casing shoe", `${f(s.casingShoe, "length", 0)} ${unit("length")} MD`],
      ["Mud density", `${f(s.mud, "density", 3)} ${unit("density")}`],
      ["Friction · CH / OH", `${num(s.muCased, 2)} / ${num(s.muOpen, 2)}`],
    ]
      .map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`)
      .join("");
  }
  function units() {
    const mode =
      Object.keys(D.presets).find(
        (k) => JSON.stringify(D.presets[k]) === JSON.stringify(c.units),
      ) || "custom";
    $("case-unit-preset").value = mode;
    $("case-units").innerHTML = `<div class="eng-unit-grid">${Object.entries(
      groups,
    )
      .map(
        ([k, opts]) =>
          `<label>${kindNames[k]}<select data-unit-kind="${k}">${opts.map((u) => `<option ${u === unit(k) ? "selected" : ""}>${u}</option>`).join("")}</select></label>`,
      )
      .join(
        "",
      )}</div><p>1 tf = 9.80665 kN. 1 t is a mass of 1,000 kg. Values are stored in SI; display and exports follow the selected units. Other legacy analysis pages retain their explicitly labelled input units.</p>`;
    $("case-units")
      .querySelectorAll("[data-unit-kind]")
      .forEach(
        (el) =>
          (el.onchange = guard(() => {
            if (dirty) {
              el.value = unit(el.dataset.unitKind);
              ensureClean();
            }
            c.units[el.dataset.unitKind] = el.value;
            render();
          })),
      );
  }
  function table(headers, rows, cls = "") {
    return `<div class="eng-table ${cls}"><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  function profile() {
    const st = result.stations,
      maxN = Math.max(...st.map((p) => Math.hypot(p.n, p.e))),
      maxZ = Math.max(...st.map((p) => p.tvd));
    const point = (p) =>
        `${35 + (Math.hypot(p.n, p.e) / maxN) * 205},${35 + (p.tvd / maxZ) * 230}`,
      shoe = WellEngine.interp(st, c.settings.casingShoe),
      bit = WellEngine.interp(st, c.settings.bitMD);
    return `<svg class="eng-profile" viewBox="0 0 280 305" aria-label="Synthetic vertical section"><g fill="none" stroke="#dbe1e5" stroke-width="1"><path d="M35 25V270H260M35 95H260M35 170H260M35 245H260"/></g><polyline points="${st.map(point).join(" ")}" fill="none" stroke="#b1bcc3" stroke-width="9"/><polyline points="${st
      .filter((p) => p.md <= c.settings.bitMD)
      .map(point)
      .join(
        " ",
      )}" fill="none" stroke="#315d77" stroke-width="3"/><circle cx="${point(shoe).split(",")[0]}" cy="${point(shoe).split(",")[1]}" r="5" fill="#b07035"/><circle cx="${point(bit).split(",")[0]}" cy="${point(bit).split(",")[1]}" r="5" fill="#183b53"/><text x="38" y="18">RT / 0 ${unit("length")}</text><text x="38" y="288">TVD ${f(result.tvd, "length", 0)} ${unit("length")}</text><text x="205" y="288">Section</text></svg>`;
  }
  function chart(torque = false) {
    const data = result.rows,
      obs = c.observations.filter((o) => o.md <= c.settings.bitMD),
      kind = torque ? "torque" : "force";
    const series = torque
      ? []
      : [
          ["pu", "Pickup", "#24516d"],
          ["fr", "Free/static", "#627784"],
          ["so", "Slackoff", "#b06d30"],
        ];
    const all = torque
      ? obs.map((o) => val(o.torque, kind))
      : data
          .flatMap((r) =>
            [
              r.pu,
              r.so,
              r.fr,
              ...(sensitivity ? [r.puLow, r.puHigh, r.soLow, r.soHigh] : []),
            ].map((v) => val(v, kind)),
          )
          .concat(
            obs.flatMap((r) => [r.pu, r.so, r.fr].map((v) => val(v, kind))),
          );
    let lo = Math.min(...all),
      hi = Math.max(...all);
    const pad = Math.max((hi - lo) * 0.12, Math.abs(hi) * 0.025, 0.01);
    lo = lo >= 0 ? Math.max(0, Math.floor(lo - pad)) : Math.floor(lo - pad);
    hi = Math.ceil(hi + pad);
    const W = torque ? 380 : 650,
      H = 445,
      left = 68,
      right = W - 25,
      top = 46,
      bottom = 395,
      md0 = 2000,
      md1 = Math.max(c.settings.bitMD, 2001),
      X = (v) => left + ((val(v, kind) - lo) / (hi - lo)) * (right - left),
      Y = (md) => top + ((md - md0) / (md1 - md0)) * (bottom - top);
    let g = "";
    for (let i = 0; i <= 5; i++) {
      const v = lo + ((hi - lo) * i) / 5,
        x = left + ((right - left) * i) / 5,
        md = md0 + ((md1 - md0) * i) / 5,
        y = Y(md);
      g += `<path d="M${x} ${top}V${bottom}M${left} ${y}H${right}" stroke="#e2e7eb"/><text x="${x}" y="${top - 12}" text-anchor="middle">${num(v, 1)}</text><text x="${left - 9}" y="${y + 4}" text-anchor="end">${f(md, "length", 0)}</text>`;
    }
    const line = (key, color, dash = false) =>
      `<polyline points="${data.map((r) => `${X(r[key])},${Y(r.md)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="${dash ? 1 : 2.2}" ${dash ? 'stroke-dasharray="4 4"' : ""}/>`;
    if (!torque && sensitivity)
      for (const k of ["puLow", "puHigh", "soLow", "soHigh"])
        g += line(k, "#aebbc3", true);
    for (const [k, label, col] of series) {
      g += line(k, col);
      g += obs
        .map(
          (o) =>
            `<circle cx="${X(o[k])}" cy="${Y(o.md)}" r="3" fill="white" stroke="${col}" stroke-width="1.6"><title>${esc(o.record)}: ${f(o.md, "length", 0)} ${unit("length")}, ${label} ${f(o[k], kind)} ${unit(kind)} · MOCK</title></circle>`,
        )
        .join("");
    }
    if (torque)
      g +=
        `<polyline points="${obs.map((o) => `${X(o.torque)},${Y(o.md)}`).join(" ")}" fill="none" stroke="#836b49" stroke-width="1.4"/>` +
        obs
          .map(
            (o) =>
              `<circle cx="${X(o.torque)}" cy="${Y(o.md)}" r="3" fill="#836b49"><title>${esc(o.record)} · MOCK torque ${f(o.torque, "torque", 2)} ${unit("torque")}</title></circle>`,
          )
          .join("");
    g += `<path d="M${left} ${Y(selected)}H${right}" stroke="#ac5335" stroke-dasharray="5 4"/><text x="${left}" y="${H - 14}">Measured depth (${unit("length")}) ↓</text><text x="${(left + right) / 2}" y="15" text-anchor="middle">${torque ? "Mock FRT" : "Hookload"} (${unit(kind)})</text>`;
    return `<svg class="eng-chart" data-chart="${torque ? "torque" : "axial"}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${torque ? "Mock observed torque" : "Calculated axial hookload and mock observations"} versus measured depth">${g}</svg>`;
  }
  function selection() {
    const r = closest(result.rows, selected),
      o = closest(
        c.observations.filter((o) => o.md <= c.settings.bitMD),
        r.md,
      );
    return `<div class="eng-selection"><b>At ${f(r.md, "length", 0)} ${unit("length")} MD</b><span>Pickup <strong>${f(r.pu, "force")} ${unit("force")}</strong></span><span>Slackoff <strong>${f(r.so, "force")} ${unit("force")}</strong></span><span>Pickup residual* <strong>${f(o.pu - closest(result.rows, o.md).pu, "force")} ${unit("force")}</strong></span></div><p class="eng-caption">*Nearest mock log at ${f(o.md, "length", 0)} ${unit("length")} MD minus the model evaluated at that log depth. No pass/fail threshold.</p>`;
  }
  function overview() {
    return `<div class="eng-study-grid"><aside class="eng-overview-side"><article class="eng-card"><div class="eng-card-title"><h2>Well section</h2><span>LOCAL FRAME</span></div>${profile()}<div class="eng-facts"><div><span>Section TD</span><b>${f(c.settings.bitMD, "length", 0)} ${unit("length")}</b></div><div><span>Inclination at TD</span><b>${num(WellEngine.interp(result.stations, c.settings.bitMD).inc)}°</b></div><div><span>Hole diameter</span><b>${f(0.2159, "diameter", 2)} ${unit("diameter")}</b></div><div><span>Drillstring dry mass</span><b>${f(result.dryMass, "mass", 2)} ${unit("mass")}</b></div></div><button class="eng-text-button" data-go="inputs">Inspect well & conditions →</button></article><article class="eng-card eng-bha-preview"><div>${EquipmentDrawing.svg("push-the-bit-rss")}${EquipmentDrawing.svg("pdc-bit")}</div><h3>Run 07 assembly</h3><p>12 components · RSS + LWD/MWD<br>Stabilizers, collars, jar, HWDP and DP.</p><button class="eng-text-button" data-go="string">Inspect BHA & drillstring →</button></article></aside><div><article class="eng-card eng-chart-panel"><div class="eng-card-title"><div><h2>Axial loads & torque observations</h2><p>Lines: preliminary axial model. Open circles: fictional field measurements.</p></div><label class="eng-check"><input type="checkbox" id="case-sensitivity" ${sensitivity ? "checked" : ""}> Friction ±0.10</label></div><div class="eng-legend"><span><i style="background:#24516d"></i>Pickup / PUW</span><span><i style="background:#627784"></i>Free/static / FRW</span><span><i style="background:#b06d30"></i>Slackoff / SOW</span><span>○ Mock observations</span></div><div class="eng-charts"><div>${chart()}</div><div class="eng-torque-chart"><div class="eng-chart-tag">TORQUE · MOCK LOG ONLY</div>${chart(true)}</div></div><label class="eng-depth-picker">Inspect depth <input type="range" id="case-depth" min="2000" max="${c.settings.bitMD}" step="50" value="${selected}"><output>${f(selected, "length", 0)} ${unit("length")}</output></label>${selection()}</article><div class="eng-bottom-grid"><article class="eng-card"><span class="eng-kicker">WHAT TO LOOK FOR</span><h3>Why do the observations move away?</h3><p>The mock pickup/slackoff spread increases below ${f(3200, "length", 0)} ${unit("length")}. Change open-hole friction in Well & conditions and compare the model against the same fixed observations.</p><button class="eng-text-button" data-go="inputs">Adjust assumptions →</button></article><article class="eng-card"><span class="eng-kicker">MODEL BASIS</span><h3>Off-bottom axial comparison</h3><p>Block offset: ${f(c.settings.blockForce, "force")} ${unit("force")}. The static curve is an FRW reference, not a rotational model. Flow, WOB and RPM provide context; they do not drive this axial solver.</p><button class="eng-text-button" data-go="report">Review assumptions & export →</button></article></div></div></div>`;
  }
  const settingsFields = [
    ["mud", "Mud density", "density"],
    ["blockForce", "Travelling block / sensor offset", "force"],
    ["muCased", "Cased-hole friction", null],
    ["muOpen", "Open-hole friction", null],
    ["casingShoe", "Casing shoe MD", "length"],
    ["bitMD", "Selected bit depth", "length"],
    ["flow", "Drilling flow · context", "flow"],
    ["rpm", "Drilling RPM · context", null],
    ["wob", "Drilling WOB · context", "force"],
    ["pressure", "Standpipe pressure · context", "pressure"],
  ];
  function inputs() {
    return `<div class="eng-input-layout"><article class="eng-card"><div class="eng-card-title"><div><h2>Study conditions</h2><p>Edit the fictional case, then recalculate. Mock observations stay fixed.</p></div><span id="case-edit-status">APPLIED</span></div><form id="case-settings-form"><div class="eng-form-grid">${settingsFields.map(([key, label, kind]) => `<label>${label}${kind ? ` (${unit(kind)})` : ""}<input type="number" step="any" data-setting="${key}" value="${kind ? Number(val(c.settings[key], kind).toPrecision(12)) : c.settings[key]}" required></label>`).join("")}</div><div class="work-toolbar"><button type="submit" class="primary">Apply & recalculate</button><button type="button" id="case-discard" class="smallbutton">Discard edits</button></div></form><p class="eng-caption">Common steel density ${num(c.settings.steel, 0)} kg/m³. Metric tonne-force uses standard gravity 9.80665 m/s². The source of this case is an original synthetic fixture, not a vendor specification.</p></article><article class="eng-card"><h2>Architecture & survey</h2>${table(
      [
        "Section",
        `From (${unit("length")})`,
        `To (${unit("length")})`,
        `OD (${unit("diameter")})`,
        `ID / hole (${unit("diameter")})`,
      ],
      c.sections.map((s) => [
        s.name,
        f(s.from, "length", 0),
        f(s.to, "length", 0),
        f(s.od, "diameter", 2),
        f(s.id, "diameter", 2),
      ]),
    )}<h3>Survey control stations</h3>${table(
      [
        `MD (${unit("length")})`,
        "Inc (°)",
        "Azi (°)",
        `TVD (${unit("length")})`,
      ],
      result.stations
        .filter((_, i) => i % 12 === 0 || i === result.stations.length - 1)
        .map((s) => [
          f(s.md, "length", 0),
          num(s.inc),
          num(s.azi),
          f(s.tvd, "length", 1),
        ]),
    )}<p class="eng-caption">${c.survey.length} stations at 25 m spacing. Minimum-curvature integration in a local N/E/TVD frame. No offset-well or uncertainty model in this case.</p></article></div>`;
  }
  function stringView() {
    const b = c.bha[component],
      tally = WellEngine.normalizeBha(c.bha);
    return `<div class="eng-string-layout"><article class="eng-card eng-assembly"><div class="eng-card-title"><h2>BHA schematic</h2><span>BOTTOM → TOP</span></div><p class="eng-caption">Individual tool geometry illustrated; axial lengths compressed.</p><div class="eng-assembly-list">${c.bha.map((b, i) => `<button data-component="${i}" class="${component === i ? "selected" : ""}"><span class="eng-component-no">${String(i + 1).padStart(2, "0")}</span>${EquipmentDrawing.svg(b.type)}<span><b>${esc(b.name)}</b><small>${f(b.length, "length", 2)} ${unit("length")} · OD ${f(b.od, "diameter", 2)} ${unit("diameter")}</small></span></button>`).join("")}</div></article><div><article class="eng-card"><div class="eng-card-title"><div><span class="eng-kicker">COMPONENT ${component + 1} / ${c.bha.length}</span><h2>${esc(b.name)}</h2></div><span class="eng-demo-tag">SYNTHETIC SPECIFICATION</span></div><div class="eng-component-detail"><div class="eng-large-tool">${EquipmentDrawing.svg(b.type)}</div><div><dl>${[
      ["Tool family", b.type],
      ["Connection", b.connection],
      ["Serial / ID", b.serial],
      ["Length", f(b.length, "length", 2) + " " + unit("length")],
      [
        "OD / ID",
        f(b.od, "diameter", 2) +
          " / " +
          f(b.id, "diameter", 2) +
          " " +
          unit("diameter"),
      ],
      ["Linear mass", f(b.mass, "linear", 2) + " " + unit("linear")],
      ["Component mass", f(b.mass * b.length, "mass", 3) + " " + unit("mass")],
      [
        "From bit",
        f(tally.elements[component].start, "length", 2) + " " + unit("length"),
      ],
      ["Manufacturer ratings", "Not supplied — no capacity inference"],
    ]
      .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
      .join(
        "",
      )}</dl></div></div></article><article class="eng-card"><h2>Complete drillstring tally</h2>${table(
      [
        "#",
        "Component",
        `Length (${unit("length")})`,
        `OD (${unit("diameter")})`,
        `ID (${unit("diameter")})`,
        `Mass (${unit("mass")})`,
      ],
      c.bha.map((b, i) => [
        i + 1,
        b.name,
        f(b.length, "length", 2),
        f(b.od, "diameter", 2),
        f(b.id, "diameter", 2),
        f(b.length * b.mass, "mass", 3),
      ]),
    )}<p class="eng-caption">Full string: ${f(tally.totalLength, "length", 2)} ${unit("length")}. Dry mass: ${f(result.dryMass, "mass", 2)} ${unit("mass")}. At shallower bit depths only the submerged in-hole length is integrated by the axial model.</p></article></div></div>`;
  }
  function observationTable() {
    return table(
      [
        "Record",
        `MD (${unit("length")})`,
        `PUW (${unit("force")})`,
        `FRW (${unit("force")})`,
        `SOW (${unit("force")})`,
        `FRT (${unit("torque")})`,
        `Flow (${unit("flow")})`,
        "RPM",
        `SPP (${unit("pressure")})`,
        `ECD (${unit("density")})`,
      ],
      c.observations.map((o) => [
        o.record,
        f(o.md, "length", 0),
        f(o.pu, "force"),
        f(o.fr, "force"),
        f(o.so, "force"),
        f(o.torque, "torque", 2),
        f(o.flow, "flow", 0),
        o.rpm,
        f(o.pressure, "pressure", 1),
        f(o.ecd, "density", 3),
      ]),
    );
  }
  function observations() {
    return `<article class="eng-card"><div class="eng-card-title"><div><h2>Mock connection log</h2><p>${c.observations.length} matched depth records · Off-bottom weights and free-rotating torque · Fictional data</p></div><button class="smallbutton" id="case-export-log">Export log CSV</button></div><div class="eng-callout">These are generated training observations, not measurements from your Drive. Changing model assumptions does not change this log. Separate source quantities keep their own units.</div>${observationTable()}</article>`;
  }
  function reportContent() {
    return `<div class="eng-report"><div class="eng-kicker">WELLSCOPE / ENGINEERING STUDY</div><h1>Torque &amp; Drag — ${esc(c.name)}</h1><p><b>SYNTHETIC TRAINING DATA · PRELIMINARY AXIAL MODEL · DRAFT</b></p><h2>Objective</h2><p>${esc(c.objective)}</p><h2>Source & assumptions</h2><p>${esc(c.source)}. ${esc(c.reference)}. ${esc(result.assumptions)}</p><p>At bit ${f(c.settings.bitMD, "length", 0)} ${unit("length")}: mud ${f(c.settings.mud, "density", 3)} ${unit("density")}; cased/open friction ${num(c.settings.muCased, 2)} / ${num(c.settings.muOpen, 2)}; block offset ${f(c.settings.blockForce, "force")} ${unit("force")}. Torque is a fixed mock observation, never a WellScope prediction.</p>${chart()}${chart(true)}<h2>Author interpretation</h2><p>${esc(c.notes)}</p><h2>Result table</h2>${table(
      [
        `MD (${unit("length")})`,
        `Pickup (${unit("force")})`,
        `Free/static (${unit("force")})`,
        `Slackoff (${unit("force")})`,
      ],
      result.rows.map((r) => [
        f(r.md, "length", 0),
        f(r.pu, "force", 3),
        f(r.fr, "force", 3),
        f(r.so, "force", 3),
      ]),
    )}<h2>Drillstring</h2>${table(
      [
        "Component",
        `Length (${unit("length")})`,
        `OD (${unit("diameter")})`,
        `ID (${unit("diameter")})`,
        `Linear mass (${unit("linear")})`,
      ],
      c.bha.map((b) => [
        b.name,
        f(b.length, "length", 3),
        f(b.od, "diameter", 3),
        f(b.id, "diameter", 3),
        f(b.mass, "linear", 3),
      ]),
    )}<h2>Mock observation log</h2>${observationTable()}<details><summary>Complete canonical SI case and display-unit choices</summary><pre>${esc(JSON.stringify(c, null, 2))}</pre></details></div>`;
  }
  function reportView() {
    return `<article class="eng-card"><div class="eng-card-title"><div><h2>Interpretation & delivery</h2><p>Keep the fictional observations, assumptions and calculated results together.</p></div><span>DRAFT</span></div><label class="eng-notes">Your interpretation<textarea id="case-notes">${esc(c.notes)}</textarea></label><div class="work-toolbar"><button class="primary" id="case-export-report">Download report HTML</button><button class="smallbutton" id="case-print">Print / Save PDF</button><button class="smallbutton" id="case-export-csv">Export results CSV</button><button class="smallbutton" id="case-export-json">Export full case JSON</button><label class="filebtn">Import case JSON<input type="file" id="case-import-json" accept=".json" hidden></label></div><div class="eng-callout">HTML, printed reports and CSV use your selected display units. JSON retains SI data and the unit preferences for lossless round-trips. Mass (t) and force (tf) are separate dimensions.</div><div class="eng-report-preview">${reportContent()}</div></article>`;
  }
  function go(next) {
    ensureClean();
    tab = next;
    render();
  }
  function csv(headers, rows) {
    return [headers, ...rows]
      .map((r) =>
        r
          .map((v) => '"' + String(v ?? "").replaceAll('"', '""') + '"')
          .join(","),
      )
      .join("\r\n");
  }
  function exportCSV(log = false) {
    ensureClean();
    const quantities = log
      ? ["pu", "fr", "so", "torque", "flow", "pressure", "ecd"]
      : ["pu", "fr", "so"];
    const kinds = {
      pu: "force",
      fr: "force",
      so: "force",
      torque: "torque",
      flow: "flow",
      pressure: "pressure",
      ecd: "density",
    };
    const rows = log ? c.observations : result.rows;
    download(
      log ? "WellScope-mock-log.csv" : "WellScope-axial-results.csv",
      csv(
        [
          `MD (${unit("length")})`,
          ...quantities.map((k) => `${k} (${unit(kinds[k])})`),
          "provenance",
        ],
        rows.map((r) => [
          val(r.md, "length"),
          ...quantities.map((k) => val(r[k], kinds[k])),
          log
            ? "SYNTHETIC_MOCK_OBSERVATION"
            : "SYNTHETIC_PRELIMINARY_AXIAL_MODEL",
        ]),
      ),
      "text/csv",
    );
  }
  function bind() {
    host
      .querySelectorAll("[data-go]")
      .forEach((b) => (b.onclick = guard(() => go(b.dataset.go))));
    host.querySelectorAll("[data-component]").forEach(
      (b) =>
        (b.onclick = () => {
          component = Number(b.dataset.component);
          render();
        }),
    );
    if ($("case-depth"))
      $("case-depth").oninput = (e) => {
        selected = Number(e.target.value);
        renderBody();
      };
    if ($("case-sensitivity"))
      $("case-sensitivity").onchange = (e) => {
        sensitivity = e.target.checked;
        renderBody();
      };
    if ($("case-settings-form")) {
      $("case-settings-form").oninput = () => {
        dirty = true;
        $("case-edit-status").textContent = "UNAPPLIED CHANGES";
      };
      $("case-settings-form").onsubmit = guard((e) => {
        e.preventDefault();
        const next = structuredClone(c);
        for (const [k, , kind] of settingsFields) {
          const v = C.number(
            host.querySelector(`[data-setting="${k}"]`).value,
            k,
          );
          next.settings[k] = kind ? D.canonical(v, kind, c.units) : v;
        }
        next.sections[2].to = next.settings.casingShoe;
        next.sections[3].from = next.settings.casingShoe;
        const calculated = D.calculate(next);
        c = next;
        result = calculated;
        selected = Math.min(selected, c.settings.bitMD);
        dirty = false;
        render();
      });
      $("case-discard").onclick = () => {
        dirty = false;
        render();
      };
    }
    if ($("case-export-log"))
      $("case-export-log").onclick = guard(() => exportCSV(true));
    if ($("case-notes")) {
      $("case-notes").onchange = (e) => {
        c.notes = e.target.value;
      };
      $("case-export-csv").onclick = guard(() => exportCSV());
      $("case-export-json").onclick = guard(() => {
        ensureClean();
        download(
          "WellScope-training-case.json",
          JSON.stringify(c, null, 2),
          "application/json",
        );
      });
      $("case-export-report").onclick = guard(() => {
        ensureClean();
        download(
          "WellScope-Torque-Drag-report.html",
          `<!doctype html><html lang="en"><meta charset="utf-8"><title>WellScope training study</title><style>body{font:14px/1.6 Arial,sans-serif;color:#253541;max-width:1100px;margin:30px auto;padding:25px}h1,h2{color:#173e56}svg.eng-chart{width:48%;display:inline-block}svg text{font:11px Arial;fill:#536772}table{border-collapse:collapse;width:100%;font-size:10px}td,th{border-bottom:1px solid #cfd8dd;padding:7px;text-align:left}pre{white-space:pre-wrap;overflow-wrap:anywhere}.eng-table{overflow:auto}@media print{details,details>*{display:block}.eng-table{overflow:visible}}</style><body>${reportContent()}</body></html>`,
          "text/html",
        );
      });
      $("case-print").onclick = () => {
        $("case-print-content").innerHTML = reportContent();
        document.body.classList.add("printing-case");
        window.print();
        document.body.classList.remove("printing-case");
      };
      $("case-import-json").onchange = guard(async (e) => {
        const raw = JSON.parse(await e.target.files[0].text());
        if (!raw.observations?.length)
          throw Error("Case must include mock observations");
        const calculated = D.calculate(raw);
        c = raw;
        result = calculated;
        selected = c.settings.bitMD;
        component = 0;
        dirty = false;
        render();
      });
    }
  }
  function renderBody() {
    host.querySelectorAll("[data-case-tab]").forEach((b) => {
      b.classList.toggle("active", b.dataset.caseTab === tab);
      b.setAttribute("aria-selected", b.dataset.caseTab === tab);
    });
    $("case-body").innerHTML = {
      results: overview,
      inputs,
      string: stringView,
      observations,
      report: reportView,
    }[tab]();
    bind();
  }
  function render() {
    context();
    units();
    renderBody();
  }
  host
    .querySelectorAll("[data-case-tab]")
    .forEach((b) => (b.onclick = guard(() => go(b.dataset.caseTab))));
  $("case-unit-preset").onchange = guard((e) => {
    if (dirty) {
      units();
      ensureClean();
    }
    c.units = structuredClone(D.presets[e.target.value]);
    render();
  });
  $("case-units-toggle").onclick = () => {
    $("case-units").hidden = !$("case-units").hidden;
  };
  $("case-reset").onclick = () => {
    c = D.demo();
    result = D.calculate(c);
    dirty = false;
    selected = c.settings.bitMD;
    component = 0;
    render();
  };
  // Save complete immutable snapshots; the main project backup includes this collection.
  $("case-save").onclick = guard(async () => {
    ensureClean();
    if (P.project().mode !== "SYNTHETIC")
      throw Error(
        "A training case cannot be saved into a USER_DATA project. Export the case JSON instead.",
      );
    const owner = P.project(),
      snapshot = structuredClone(c),
      hash = await C.fingerprint(snapshot);
    if (P.project() !== owner) throw Error("Project changed while saving");
    (owner.engineering_cases ||= []).push({
      id: "case-" + crypto.randomUUID(),
      saved_utc: new Date().toISOString(),
      case: snapshot,
      input_sha256: hash,
    });
    P.changed("Training case saved");
    $("case-save").textContent = "Case saved ✓";
    setTimeout(() => ($("case-save").textContent = "Save case"), 2200);
  });
  window.addEventListener("wellscope:project-loaded", () => {
    const saved = P.project().engineering_cases?.at(-1)?.case || D.demo();
    if (saved) {
      try {
        const calculated = D.calculate(saved);
        c = structuredClone(saved);
        result = calculated;
        selected = c.settings.bitMD;
        dirty = false;
        render();
      } catch (e) {
        $("case-error").textContent =
          "Saved training case could not be opened: " + e.message;
      }
    }
  });
  new MutationObserver(() => document.body.classList.toggle("case-active", host.classList.contains("active"))).observe(host, {attributes:true, attributeFilter:["class"]});
  render();
  nav.click();
  window.CaseWorkspace = {
    snapshot: () => structuredClone(c),
    results: () => structuredClone(result),
    open: () => nav.click(),
  };
})();
