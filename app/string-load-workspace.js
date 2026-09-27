(() => {
  const $ = (id) => document.getElementById(id),
    esc = EngineeringCharts.esc,
    tf = 9806.65;
  const box = document.createElement("section");
  box.id = "sl-workspace";
  box.className = "panel";
  const style = document.createElement("style");
  style.textContent =
    "#sl-workspace button{padding:9px 13px;border:1px solid #b9cbd4;border-radius:5px;background:#fff;color:#274453;margin:10px 8px 10px 0;cursor:pointer}#sl-workspace button:disabled{opacity:.45;cursor:default}#sl-workspace svg text{fill:#304c5e;font-family:inherit}#sl-workspace details{margin:16px 0}";
  document.head.append(style);
  const fields = [
    [
      "bottomForceN",
      "Bottom effective force (tf; negative = compression)",
      0,
      tf,
    ],
    ["bottomTorqueNm", "Bottom torque (tf.m)", 0, tf],
    ["axialSpeedMps", "Axial speed (m/s; + pull out, − run in)", 0.1, 1],
    ["rpm", "String RPM", 0, 1],
    ["muCased", "Cased friction μ", 0.2, 1],
    ["muOpen", "Open-hole friction μ", 0.3, 1],
    ["stepM", "Axial integration step (m)", 5, 1],
    ["blockN", "Block / tare (tf)", 32, tf],
    ["rigLimitN", "Allowable hookload (tf; blank = unknown)", "", tf],
    [
      "driveLimitNm",
      "Allowable surface torque (tf.m; blank = unknown)",
      "",
      tf,
    ],
  ];
  box.innerHTML = `<h3>Distributed loads → 3D shape</h3><p>Calculate the effective tension along this exact tally at the current bit depth. Loads are recalculated after geometry or depth changes. Positive bottom force pulls the string down; negative force represents effective bottom compression. This is not a conversion of measured WOB without a pressure/boundary reconciliation.</p><div class="work-toolbar"><label>Axial model <select id="sl-mode"><option value="constant">Prescribed constant tension</option><option value="soft-string">Distributed soft-string profile</option></select></label></div><div class="formgrid">${fields.map(([k, l, v]) => `<label>${l}<input id="sl-${k}" type="number" step="any" value="${v}"></label>`).join("")}<label>Load assumptions / revision<input id="sl-source" value="SYNTHETIC sensitivity assumptions"></label><label>Surface limits source / revision<input id="sl-limitSource" placeholder="Required to assess equipment limits"></label></div><button id="sl-apply">Apply loads / calculate shape</button><p id="sl-draft" role="status"></p><p id="sl-summary"></p><button id="sl-export" disabled>Export load profile CSV</button><div id="sl-chart"></div><div id="sl-actions"></div><details><summary>Selected component: sourced limits</summary><p>Use allowable (already derated) ratings. Tube-body von Mises checks include axial wall stress, pressure and torsion, but exclude bending. Ratings alone do not certify the combined loaded shape.</p><div id="sl-tool" class="formgrid"></div><button id="sl-save">Apply limits / recalculate</button><p id="sl-limit-status"></p></details><p>One-way coupling: soft-string tension drives transverse stiffness. 3D wall reactions do not feed back into torque/drag. Equal internal/external mud density, zero surface pressure, hydrostatic pressure, uniform string RPM. No dynamic, post-buckling, fatigue or wear prediction.</p><p><a href="https://www.aade.org/download_file/2710/491" target="_blank" rel="noopener">AADE: load and component limits</a> · <a href="https://www.hpinc.com/resources/technical-paper/stiff-string-casing-design-tortuosity-and-centralisation" target="_blank" rel="noopener">H&P: why stiffness and clearance matter</a></p>`;
  $("sd-workspace").before(box);
  let key = "",
    selected = -1,
    state = StringInHole.snapshot();
  const ratings = [
    ["allowableTensionN", "Allowable tension (tf)", tf],
    ["allowableCompressionN", "Allowable compression (tf)", tf],
    ["allowableTorqueNm", "Allowable torque (tf.m)", tf],
    ["yieldPa", "Tube yield (MPa)", 1e6],
    ["designFactor", "Tube design factor", 1],
  ];
  function edit() {
    const b = state.input.components[state.selected];
    if (!b) return;
    $("sl-tool").innerHTML =
      `<b>${esc(b.name)}</b><label>Body assessment<select id="sl-body"><option value="">Unknown</option><option value="annular_tube">Uniform annular tube</option><option value="rated_tool">Rated tool (no body stress check)</option></select></label>` +
      ratings
        .map(
          ([k, l, f]) =>
            `<label>${l}<input id="sl-tool-${k}" type="number" step="any" value="${b[k] == null ? "" : b[k] / f}"></label>`,
        )
        .join("") +
      `<label>Rating source / revision<input id="sl-tool-source" value="${esc(b.limitSource || "")}"></label>`;
    $("sl-body").value = b.bodyModel || "";
    $("sl-tool").oninput = () => {
      $("sl-limit-status").textContent =
        "Unapplied limits; displayed assessment still uses saved values.";
    };
  }
  function graph(r, depth) {
    const curves = [
      [
        "Effective tension (tf)",
        r.rows.map((x) => [x.effectiveN / tf, x.md]),
        "#2f596d",
      ],
      [
        "Transmitted torque (tf.m)",
        r.rows.map((x) => [x.torqueNm / tf, x.md]),
        "#b2753c",
      ],
    ];
    $("sl-chart").innerHTML =
      `<svg viewBox="0 0 900 340" role="img" aria-label="Effective tension and torque versus measured depth, depth increasing downward" style="width:100%;max-height:380px">${curves
        .map(([title, points, color], j) => {
          const left = 65 + j * 450,
            top = 45,
            w = 345,
            h = 240,
            lo = Math.min(0, ...points.map((p) => p[0])),
            hi = Math.max(1, ...points.map((p) => p[0])),
            x = (v) => left + (w * (v - lo)) / (hi - lo),
            y = (md) => top + (h * md) / depth;
          return (
            `<text x="${left}" y="18">${title}</text>` +
            Array.from({ length: 5 }, (_, i) => {
              const v = lo + ((hi - lo) * i) / 4,
                md = (depth * i) / 4;
              return `<path d="M${x(v)},${top}v${h} M${left},${y(md)}h${w}" stroke="#dce3e7"/><text x="${x(v)}" y="35" text-anchor="middle" font-size="11">${v.toFixed(2)}</text><text x="${left - 8}" y="${y(md) + 4}" text-anchor="end" font-size="11">${md.toFixed(0)}</text>`;
            }).join("") +
            `<polyline points="${points.map(([v, md]) => `${x(v)},${y(md)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="2"/><text x="${left}" y="320" font-size="12">Measured depth (m) ↓</text>`
          );
        })
        .join("")}</svg>`;
  }
  function render(next) {
    state = next;
    const k = JSON.stringify(state.input);
    if (k !== key) {
      key = k;
      const a = state.input.axial;
      $("sl-mode").value = a ? "soft-string" : "constant";
      if (a) {
        for (const [n, , v, f] of fields)
          $("sl-" + n).value = a[n] == null ? "" : a[n] / f;
        $("sl-source").value = a.source;
        $("sl-limitSource").value = a.limitSource || "";
      }
      $("sl-draft").textContent = "";
      edit();
    }
    if (selected !== state.selected) {
      selected = state.selected;
      edit();
      $("sl-limit-status").textContent = "";
    }
    $("si-tension").disabled = !!state.input.axial;
    const r = state.result?.axial;
    $("sl-export").disabled = !r;
    $("sl-chart").innerHTML = "";
    $("sl-actions").innerHTML = "";
    if (!r) {
      $("sl-summary").textContent = state.input.axial
        ? "No current coupled result. Check the calculation message, inputs and compression stability."
        : "Constant-tension preview: select the distributed profile and apply to evaluate loads and supplied limits.";
      return;
    }
    const compressed = r.rows.filter((x) => x.effectiveN < 0);
    $("sl-summary").textContent =
      `${state.input.quality} · ${r.status} (axial/torsional checks only) · hookload ${(r.hookN / tf).toFixed(2)} tf · surface torque ${(r.surfaceTorqueNm / tf).toFixed(3)} tf.m · ${r.meshIntervals} axial intervals. ${compressed.length ? "Effective compression present: constrained buckling is not assessed." : "No effective compression at sampled stations."}`;
    graph(r, state.input.bitMD);
    const failed = r.checks
      .filter((c) => c.margin < 0)
      .sort(
        (a, b) =>
          a.margin / Math.max(a.limit, 1) - b.margin / Math.max(b.limit, 1),
      );
    const c = r.governing;
    $("sl-actions").innerHTML =
      `<h4>What to review next</h4>${c ? `<p>Smallest configured relative margin: ${esc(c.name)} at ${c.md.toFixed(1)} m MD (${esc(c.componentId)}): ${((100 * c.margin) / Math.max(c.limit, 1)).toFixed(1)}%. This excludes bending and unprovided limits.</p>` : "<p>No configured limits: enter manufacturer ratings and their source below.</p>"}${
        failed.length
          ? `<p><b>${failed.length} sampled limit exceedances. Review the governing component, boundary load and rating before comparing another design.</b></p><ul>${failed
              .slice(0, 6)
              .map(
                (c) =>
                  `<li>${esc(c.name)} · ${esc(c.componentId)} · ${c.md.toFixed(1)} m MD</li>`,
              )
              .join("")}</ul>`
          : ""
      }<p>Complete missing data before interpreting a window; then compare friction / bottom-load scenarios and refine the mesh. Tube body checks do not include the displayed bending stress.</p><details><summary>${r.coverage.length} missing-data / model-coverage items</summary><ul>${r.coverage.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>`;
  }
  $("sl-export").onclick = () => {
    const r = StringInHole.snapshot().result?.axial;
    if (!r) return;
    const csv =
      "MD_m,component_index,effective_force_tf,wall_force_tf,torque_tf_m\n" +
      r.rows
        .map((n) =>
          [
            n.md,
            Number(n.componentId.replace("component-", "")),
            n.effectiveN / tf,
            n.wallN / tf,
            n.torqueNm / tf,
          ].join(","),
        )
        .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      a = document.createElement("a");
    a.href = url;
    a.download = "wellscope-distributed-loads.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $("sl-apply").onclick = () => {
    try {
      const p = StringInHole.snapshot().input;
      if ($("sl-mode").value === "constant") delete p.axial;
      else {
        p.axial = {
          mode: "soft-string",
          source: $("sl-source").value,
          limitSource: $("sl-limitSource").value,
        };
        for (const [k, , , f] of fields) {
          const v = $("sl-" + k).value;
          if (v !== "" || !["rigLimitN", "driveLimitNm"].includes(k)) {
            if (v === "") throw Error(k + " required");
            p.axial[k] = Number(v) * f;
          }
        }
        StringLoads.solve(p);
      }
      StringInHole.applyStudy(p);
    } catch (e) {
      $("sl-draft").textContent = "Not applied: " + e.message;
    }
  };
  $("sl-save").onclick = () => {
    try {
      const p = StringInHole.snapshot().input,
        b = p.components[state.selected];
      for (const [k, , f] of ratings) {
        const v = $("sl-tool-" + k).value;
        if (v === "") delete b[k];
        else b[k] = Number(v) * f;
      }
      b.bodyModel = $("sl-body").value || undefined;
      b.limitSource = $("sl-tool-source").value;
      // Validate ratings even when the current preview is constant-tension.
      const temp = {
        ...p,
        axial: p.axial || {
          mode: "soft-string",
          source: "Validation only",
          stepM: 5,
          muCased: 0,
          muOpen: 0,
          bottomForceN: 0,
          bottomTorqueNm: 0,
          axialSpeedMps: 0,
          rpm: 0,
          blockN: 0,
        },
      };
      StringLoads.solve(temp);
      StringInHole.applyStudy(p);
      $("sl-limit-status").textContent = "Limits applied.";
    } catch (e) {
      $("sl-limit-status").textContent = "Not applied: " + e.message;
    }
  };
  for (const el of box.querySelectorAll("input,select"))
    el.addEventListener("input", () => {
      $("sl-draft").textContent =
        "Unapplied load settings. Displayed results use the last applied settings.";
    });
  window.addEventListener("string-shape-update", (e) => render(e.detail));
  render(state);
})();
