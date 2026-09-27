/* Deliberately separate source-response planning from survey measurements. */
(() => {
  const P = DirectionalPlanning,
    H = EngineeringCharts,
    C = WellCore,
    $ = (id) => document.getElementById(id);
  const fmt = (n) =>
    n == null ? "Undefined" : Number(n.toFixed(4)).toLocaleString("en-US");
  const panel = document.createElement("article");
  panel.className = "panel";
  panel.id = "directional-planning";
  panel.innerHTML = `<div class="eng-kicker">DIRECTIONAL / BUILD · HOLD · DROP</div><h2>Build / drop planning</h2>
  <p>Build increases inclination; drop decreases it. DLS includes both build and lateral curvature and is always nonnegative. A hold-inclination target can still have a turning dogleg.</p>
  <p id="planning-source" class="work-note"></p>
  <div class="response-chart-grid"><section><h3>Highside / lowside build response</h3><div id="planning-build-chart"></div></section><section><h3>Current steering: DLS versus WOB</h3><div id="planning-dls-chart"></div></section></div>
  <h3>WOB ranges meeting directional objectives</h3><p>Uses the applied mode, activation and toolface above. Units follow the sensitivity form. Boundaries are solved between source knots, including non-monotonic responses.</p>
  <form id="planning-form"><div class="formgrid"><label>Minimum signed build <span class="planning-rate-unit"></span><input id="planning-min" type="number" step="any" value="-0.2" required></label><label>Maximum signed build <span class="planning-rate-unit"></span><input id="planning-max" type="number" step="any" value="0.2" required></label><label>DLS ceiling <span class="planning-rate-unit"></span><input id="planning-dls" type="number" step="any" min="0" value="1" required></label><label>Minimum WOB <span class="planning-force-unit"></span><input id="planning-wmin" type="number" step="any" min="0" required></label><label>Maximum WOB <span class="planning-force-unit"></span><input id="planning-wmax" type="number" step="any" min="0" required></label></div><div class="work-toolbar"><button type="submit" class="primary">Calculate WOB ranges</button><button type="button" id="planning-hold" class="smallbutton">Example: passive hold</button><button type="button" id="planning-export" class="smallbutton" disabled>Export planning JSON</button></div></form>
  <div id="planning-result" role="status"></div><p class="work-note">Directional feasibility only. These ranges do not check torque, buckling, vibrations, tool ratings or formation uncertainty. Example thresholds are editable objectives, not manufacturer limits. Changing the BHA geometry does not recalculate the source response.</p>
  <details><summary>Calculate build, drop and DLS from two survey stations</summary><p>Manual interval calculator; prefilled values are fictional. No WOB is inferred from surveys. Match downhole WOB, actual toolface and drilling mode over the same drilled interval before comparing with a response curve.</p>
  <form id="survey-rate-form"><div class="formgrid">${["Start", "End"]
    .map((name, i) =>
      ["MD (m)", "Inclination (°)", "Azimuth (°)"]
        .map(
          (label, j) =>
            `<label>${name} ${label}<input id="survey-rate-${i}-${j}" type="number" step="any" required value="${
              [
                [3000, 60, 359],
                [3030, 62, 1],
              ][i][j]
            }"></label>`,
        )
        .join(""),
    )
    .join(
      "",
    )}</div><button type="submit" class="primary">Calculate survey rates</button></form><div id="survey-rate-result" role="status"></div><p class="work-note">Build = Δinclination / ΔMD. Drop magnitude = max(0, −build). DLS uses the exact angle between survey tangents. Turn uses the shortest azimuth difference; omitted within 1° of either vertical or at an ambiguous 180° difference. Finite-interval DLS need not equal the local curvature formula. Sparse surveys cannot resolve intervening tortuosity.</p></details>
  <details><summary>Research basis and required model inputs</summary><p>Directional prediction needs coupled bit–rock–BHA behavior: bit tilt and side force, bit steerability and walk, formation, stabilizer placement/gauge, hole overgauge, inclination, WOB and toolface. The static deformation viewer supplies no calibrated drilling-direction law.</p><p><a href="https://drive.google.com/file/d/1p3L3P8YI-X6w60yCpkP5OShD5SHSs8ES/view">DrillScan: Holistic Approach (2019)</a> · <a href="https://www.hpinc.com/media/technical-publications/Finding-the-Optimum-BHA-through-Data-Analytics-Modeling.pdf">Farrag & Menand, AADE-19-NTCE-078</a></p></details>`;
  $("directional-studio").after(panel);
  let priorUnits = null,
    last = null;
  const fields = ["min", "max", "dls", "wmin", "wmax"];
  const invalidate = (message) => {
    last = null;
    $("planning-export").disabled = true;
    $("planning-result").textContent = message;
  };
  function context() {
    return DirectionalWorkspace.snapshot();
  }
  function update() {
    const { surface, settings, units } = context(),
      ru = units.interval === 30 ? "deg/30 m" : "deg/100 ft";
    if (priorUnits)
      fields.forEach((k, i) => {
        const input = $("planning-" + k);
        if (input.value.trim() && Number.isFinite(Number(input.value)))
          input.value =
            i < 3
              ? (Number(input.value) * units.interval) / priorUnits.interval
              : C.convert(Number(input.value), priorUnits.force, units.force);
      });
    const curve = surface.curves.find((c) => c.mode === settings.mode);
    if (!priorUnits) {
      $("planning-wmin").value = C.convert(
        curve.rows[0].wobN,
        "N",
        units.force,
      ).toPrecision(10);
      $("planning-wmax").value = C.convert(
        curve.rows.at(-1).wobN,
        "N",
        units.force,
      ).toPrecision(10);
    }
    priorUnits = { ...units };
    panel
      .querySelectorAll(".planning-rate-unit")
      .forEach((x) => (x.textContent = `(${ru})`));
    panel
      .querySelectorAll(".planning-force-unit")
      .forEach((x) => (x.textContent = `(${units.force})`));
    $("planning-source").textContent =
      `${surface.quality} · ${surface.bha} · ${surface.source} · revision ${surface.revision}. ${surface.conditions || "Conditions not supplied."}`;
    const series = (name, patch, key) => ({
      name,
      points: P.sample(surface, { ...settings, ...patch }).map((r) => ({
        x: C.convert(r.wobN, "N", units.force),
        y: (r[key] * units.interval) / 30,
      })),
    });
    $("planning-build-chart").innerHTML = H.svg(
      [
        series("Highside 0°", { toolface: 0 }, "build"),
        series("Lowside 180°", { toolface: 180 }, "build"),
        series("Current toolface", {}, "build"),
      ],
      { x: `WOB (${units.force})`, y: `Build (+) / drop (−) (${ru})` },
    );
    $("planning-dls-chart").innerHTML = H.svg(
      [series("Current steering", {}, "dls")],
      { x: `WOB (${units.force})`, y: `DLS (${ru})` },
    );
    invalidate(
      "Source/settings applied. Calculate the ranges for these conditions.",
    );
    survey();
  }
  function survey() {
    try {
      const { units } = context();
      const station = (i) =>
        Object.fromEntries(
          ["md", "inc", "azi"].map((k, j) => [
            k,
            C.number($(`survey-rate-${i}-${j}`).value),
          ]),
        );
      const r = P.survey(station(0), station(1));
      $("survey-rate-result").textContent =
        ["build", "drop", "turn", "dls"]
          .map(
            (k) =>
              `${k}: ${fmt(r[k] == null ? null : (r[k] * units.interval) / 30)}`,
          )
          .join(" · ") + (units.interval === 30 ? " deg/30 m" : " deg/100 ft");
    } catch (e) {
      $("survey-rate-result").textContent = e.message;
    }
  }
  $("survey-rate-form").onsubmit = (e) => {
    e.preventDefault();
    survey();
  };
  $("survey-rate-form").oninput = () => {
    $("survey-rate-result").textContent =
      "Inputs changed — calculate survey rates.";
  };
  $("planning-form").oninput = () =>
    invalidate("Objectives changed — recalculate.");
  $("planning-form").onsubmit = (e) => {
    e.preventDefault();
    invalidate("");
    try {
      if ($("response-export").disabled)
        throw Error("Apply valid sensitivity settings above first.");
      const ctx = context(),
        { surface, settings, units } = ctx,
        v = fields.map((k) => C.number($("planning-" + k).value));
      const limits = {
        buildMin: (v[0] * 30) / units.interval,
        buildMax: (v[1] * 30) / units.interval,
        dlsMax: (v[2] * 30) / units.interval,
        wobMin: C.convert(v[3], units.force, "N"),
        wobMax: C.convert(v[4], units.force, "N"),
      };
      const ranges = P.windows(surface, settings, limits);
      $("planning-result").textContent =
        `${surface.quality} — ` +
        (ranges.length
          ? ranges
              .map(
                (r) =>
                  `${fmt(C.convert(r.fromN, "N", units.force))}–${fmt(C.convert(r.toN, "N", units.force))} ${units.force}`,
              )
              .join(" ; ")
          : "No WOB in the source domain meets all objectives.") +
        " · Directional objectives only.";
      last = {
        schema: "wellscope-directional-plan/1",
        ...ctx,
        limits,
        ranges,
        canonicalUnits: "N, deg/30 m",
        scope: "Response interpolation only; not an operating clearance.",
      };
      $("planning-export").disabled = false;
    } catch (err) {
      invalidate(err.message);
    }
  };
  $("planning-hold").onclick = () => {
    $("response-mode").value = "rotating";
    $("response-form").requestSubmit();
  };
  $("planning-export").onclick = () => {
    if (!last) return;
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(last, null, 2)], { type: "application/json" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "directional-plan.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  $("response-form").addEventListener("input", () =>
    invalidate("Sensitivity inputs changed — apply them above first."),
  );
  window.addEventListener("directional-response-updated", update);
  window.addEventListener("load", () => {
    if (location.hash === "#directional") {
      document.querySelector('[data-page="directional"]').click();
      panel.scrollIntoView();
    }
  });
  update();
})();
