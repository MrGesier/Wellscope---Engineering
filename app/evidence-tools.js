(() => {
  "use strict";
  const C = WellCore,
    A = WellApp,
    $ = (id) => document.getElementById(id),
    api = WellEvidence;
  function panel(page, title) {
    const p = document.createElement("article");
    p.className = "panel";
    const h = document.createElement("h2");
    h.textContent = title;
    p.append(h);
    $(page).append(p);
    return p;
  }
  function button(parent, label, fn) {
    const b = document.createElement("button");
    b.className = "smallbutton";
    b.textContent = label;
    b.onclick = async () => {
      try {
        $("work-error").textContent = "";
        await fn();
      } catch (e) {
        $("work-error").textContent = e.message;
      }
    };
    parent.append(b);
    return b;
  }
  function result(parent) {
    const pre = document.createElement("pre");
    pre.className = "workresult";
    parent.append(pre);
    return pre;
  }
  const qc = panel("dataqc", "Measurement quality and calibration evidence");
  const note = document.createElement("p");
  note.className = "work-note";
  note.textContent =
    "Numeric import validation does not establish sensor quality. To mark a row MEASURED_QC_PASS, its source must include calibration_source, calibration_date (YYYY-MM-DD), and zero_basis for hookload. This is a data-QC record, not engineering approval.";
  qc.append(note);
  const input = document.createElement("textarea");
  input.className = "work-json";
  input.setAttribute("aria-label", "Measurement QC records");
  qc.append(input);
  button(qc, "Load imported observations for QC", () => {
    input.value = JSON.stringify(api.project().measurements, null, 2);
  });
  const qcResult = result(qc);
  button(qc, "Validate calibration metadata and apply data QC", () => {
    const rows = JSON.parse(input.value);
    if (!Array.isArray(rows)) throw Error("Expected measurement array");
    const checked = rows.map((r) => {
      C.number(r.value);
      C.number(r.md);
      if (
        !C.units[r.unit] ||
        !r.source ||
        !r.timestamp_utc?.endsWith("Z") ||
        !Number.isFinite(Date.parse(r.timestamp_utc))
      )
        throw Error("Missing channel source / timestamp / units");
      if (r.data === "SYNTHETIC") return r;
      const ok =
        r.calibration_source &&
        /^\d{4}-\d{2}-\d{2}$/.test(r.calibration_date || "") &&
        Number.isFinite(Date.parse(r.calibration_date)) &&
        (r.metric !== "hookload_measured" || r.zero_basis);
      return {
        ...r,
        data: ok ? "MEASURED_QC_PASS" : "MEASURED_QC_FAIL",
        model: "PRELIMINARY_UNVERIFIED",
        qc_checked_utc: new Date().toISOString(),
        qc_reason: ok
          ? "Calibration metadata and numerical fields present; field accuracy is not independently certified"
          : "Calibration evidence / sensor zero basis missing",
      };
    });
    api.project().measurements = checked;
    api.changed();
    qcResult.textContent = JSON.stringify(checked, null, 2);
    drawMeasurements();
  });
  const mp = panel("td", "Measured hookload · separate observation channel");
  const explanation = document.createElement("p");
  explanation.className = "work-note";
  explanation.textContent =
    "Dashed observations in the T&D selected force unit; only SYNTHETIC or MEASURED_QC_PASS channels. These are not calculated string-top axial forces. No rig-tare transform is applied.";
  mp.append(explanation);
  const mc = document.createElement("canvas");
  mc.width = 1000;
  mc.height = 250;
  mc.setAttribute("aria-label", "Measured hookload versus MD");
  mp.append(mc);
  function drawMeasurements() {
    const forceUnit=WellApp.snapshot().state.forceUnit||"tf";
    const g = mc.getContext("2d");
    g.clearRect(0, 0, 1000, 250);
    const rows = api
      .project()
      .measurements.filter(
        (r) =>
          r.metric === "hookload_measured" &&
          ["SYNTHETIC", "MEASURED_QC_PASS"].includes(r.data),
      )
      .map((r) => ({ ...r, value: C.convert(r.value, r.unit, forceUnit) }))
      .sort((a, b) => a.md - b.md);
    g.fillStyle = "#a9c7d4";
    g.font = "14px Segoe UI";
    g.fillText(
      "Measured hookload ("+forceUnit+") / MD (m) — source-labelled observations",
      20,
      22,
    );
    if (!rows.length) {
      g.fillText(
        "No quality-checked measured hookload channel loaded",
        30,
        100,
      );
      return;
    }
    const maxMD = Math.max(1, ...rows.map((r) => r.md)),
      maxValue = Math.max(1, ...rows.map((r) => r.value));
    g.setLineDash([6, 5]);
    g.strokeStyle = "#f7a957";
    g.beginPath();
    rows.forEach((r, i) => {
      const x = 60 + (r.md / maxMD) * 850,
        y = 210 - (r.value / maxValue) * 160;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.stroke();
    g.setLineDash([]);
    for (const r of rows) {
      const x = 60 + (r.md / maxMD) * 850,
        y = 210 - (r.value / maxValue) * 160;
      g.beginPath();
      g.arc(x, y, 5, 0, Math.PI * 2);
      g.fillStyle = r.data === "SYNTHETIC" ? "#c6a8ff" : "#f7a957";
      g.fill();
      g.fillText(
        `${r.value.toFixed(1)} ${forceUnit} · ${r.md} m · ${r.data}`,
        Math.min(x + 7, 720),
        y - 8,
      );
    }
  }
  button(mp, "Refresh measured observations", drawMeasurements);
  drawMeasurements();
  window.addEventListener("wellscope:change",drawMeasurements);
  const events = panel("limits", "History, acknowledgement and replay");
  const history = result(events);
  button(events, "Show historical evaluations", () => {
    history.textContent = JSON.stringify(api.project().events, null, 2);
  });
  const selector = document.createElement("select");
  selector.setAttribute("aria-label", "Historical run");
  events.append(selector);
  button(events, "Load run list", () => {
    selector.replaceChildren();
    for (const run of api.project().model_runs) {
      const opt = document.createElement("option");
      opt.value = run.id;
      opt.textContent = `${run.id} · project revision ${run.project_revision}`;
      selector.append(opt);
    }
  });
  button(events, "Replay selected historical run", () => {
    const run = api.project().model_runs.find((r) => r.id === selector.value);
    if (!run) throw Error("Select a historical run");
    const replay = run.limits.flatMap((rule) =>
      C.evaluateSeries(
        rule,
        run.inputs.filter((m) => m.metric === rule.metric),
      ),
    );
    history.textContent = JSON.stringify(
      {
        run: run.id,
        historical_revision: run.project_revision,
        outputs: replay,
      },
      null,
      2,
    );
  });
  button(events, "Acknowledge latest displayed events", () => {
    const last = api.project().model_runs.at(-1);
    if (!last) throw Error("No run to acknowledge");
    for (const event of api
      .project()
      .events.filter((e) => e.run_id === last.id))
      event.acknowledgement = {
        time: new Date().toISOString(),
        meaning: "Seen locally; not engineering approval",
      };
    history.textContent =
      "Acknowledged locally. Review remains DRAFT; no engineering approval.";
  });
  const li = document.createElement("input");
  li.type = "file";
  li.accept = ".json";
  li.setAttribute("aria-label", "Import source-backed limits JSON");
  events.append(li);
  li.onchange = async (e) => {
    try {
      const rules = JSON.parse(await e.target.files[0].text());
      if (!Array.isArray(rules)) throw Error("Expected rule array");
      rules.forEach(C.validateLimit);
      if (
        api.project().mode === "USER_DATA" &&
        rules.some((r) => r.data === "SYNTHETIC")
      )
        throw Error("Demo thresholds cannot be imported into a real project");
      for (const r of rules) {
        const existing = api.project().limits.filter((x) => x.id === r.id);
        if (existing.some((x) => x.revision >= r.revision))
          throw Error("Imported revision must exceed all stored revisions");
      }
      for (const r of rules) {
        api
          .project()
          .limits.filter((x) => x.id === r.id)
          .forEach((x) => (x.active = false));
        api.project().limits.push(r);
      }
      api.changed();
      history.textContent =
        "Imported " +
        rules.length +
        " source-backed rules. Re-evaluate current inputs.";
    } catch (e) {
      $("work-error").textContent = e.message;
    }
    li.value = "";
  };
  const compare = panel("directional", "Source-labelled case A/B comparison");
  const choices = document.createElement("div");
  choices.className = "workform";
  const selects = [
    document.createElement("select"),
    document.createElement("select"),
  ];
  selects.forEach((s, i) => {
    const l = document.createElement("label");
    l.textContent = i ? "Case B" : "Case A";
    l.append(s);
    choices.append(l);
  });
  compare.append(choices);
  const comparison = result(compare);
  button(compare, "Load recorded cases", () => {
    for (const s of selects) {
      s.replaceChildren();
      api.project().directional_response_cases.forEach((c, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = (c.id || "Case " + i) + " · " + c.source;
        s.append(opt);
      });
    }
  });
  button(compare, "Compare geometry and observations", () => {
    const cases = selects.map(
      (s) => api.project().directional_response_cases[+s.value],
    );
    if (cases.some((x) => !x)) throw Error("Record two case setups first");
    comparison.textContent = JSON.stringify(
      cases.map((c) => ({
        id: c.id,
        source: c.source,
        quality: c.quality,
        geometry: C.directional(c),
        nbs_distance_m: c.nbs_distance_m,
        observations: c.observations || [],
        external_curves: c.external_curves || [],
        prediction: "NOT COMPUTED",
      })),
      null,
      2,
    );
  });
  const store = panel("dataqc", "Local persistence");
  const storeText = document.createElement("p");
  storeText.className = "work-note";
  storeText.textContent =
    "Optional browser-local backup. Export a JSON file for durable transfer; file-origin browser storage behavior varies.";
  store.append(storeText);
  button(store, "Save in this browser", () => {
    localStorage.setItem("wellscope-v042", JSON.stringify(api.snapshot()));
    storeText.textContent = "Saved locally in this browser.";
  });
  button(store, "Download saved browser backup", () => {
    const saved = localStorage.getItem("wellscope-v042");
    if (!saved) throw Error("No saved browser backup");
    const a = document.createElement("a"),
      url = URL.createObjectURL(
        new Blob([saved], { type: "application/json" }),
      );
    a.href = url;
    a.download = "WellScope-local-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
})();
