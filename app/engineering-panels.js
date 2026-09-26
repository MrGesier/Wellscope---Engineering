/* Editors for the source-bound data workflows in engineering-data.js. */
(() => {
  "use strict";
  const D = WellData,
    C = WellCore,
    A = WellApp,
    P = WellEvidence,
    $ = (id) => document.getElementById(id);
  function panel(page, title, note) {
    const h = document.createElement("article");
    h.className = "panel";
    const heading = document.createElement("h2"),
      p = document.createElement("p");
    heading.textContent = title;
    p.className = "work-note";
    p.textContent = note;
    h.append(heading, p);
    $(page).append(h);
    return h;
  }
  function input(host, label, id, value, kind = "text") {
    const l = document.createElement("label");
    l.textContent = label;
    const e = document.createElement(
      kind === "textarea" ? "textarea" : "input",
    );
    e.id = id;
    e.value = value ?? "";
    if (kind === "textarea") {
      e.className = "work-json";
      e.setAttribute("aria-label", label);
    } else {
      e.type = kind;
      e.step = "any";
    }
    l.append(e);
    host.append(l);
    return e;
  }
  function button(host, label, id, fn) {
    const b = document.createElement("button");
    b.id = id;
    b.className = "primary";
    b.textContent = label;
    b.onclick = async () => {
      try {
        $("work-error").textContent = "";
        await fn();
      } catch (e) {
        $("work-error").textContent = e.message;
      }
    };
    host.append(b);
    return b;
  }
  function result(host, id) {
    const e = document.createElement("pre");
    e.id = id;
    e.className = "workresult";
    host.append(e);
    return (v) => {
      e.textContent = typeof v === "string" ? v : JSON.stringify(v, null, 2);
    };
  }
  const imp = panel(
    "dataqc",
    "Canonical project migration",
    "Choose explicit wellbore roles. Station md_m/inc_deg/azi_deg and canonical BHA geometry are mapped to the current editors. Source records are retained; imported observations remain unchecked. Different datums/elevations require an implemented explicit transform and are refused here.",
  );
  input(
    imp,
    "Wellbore role map (JSON)",
    "canonical-roles",
    JSON.stringify(
      {
        REFERENCE: "REFERENCE",
        "OFFSET A": "OFFSET A",
        "OFFSET B": "OFFSET B",
        SIDETRACK: "SIDETRACK",
      },
      null,
      2,
    ),
    "textarea",
  );
  input(imp, "Canonical project JSON", "canonical-project", "", "textarea");
  const imported = result(imp, "canonical-result");
  button(
    imp,
    "Validate and import canonical project",
    "canonical-import",
    () => {
      const p = D.importProject(
        JSON.parse($("canonical-project").value),
        JSON.parse($("canonical-roles").value),
      );
      P.loadProject(p);
      imported(
        "Imported project " +
          p.id +
          "; scientific results require re-evaluation. Original canonical source retained.",
      );
    },
  );
  button(imp, "Show current canonical fields", "canonical-example", () => {
    const p = P.snapshot();
    delete p.legacy;
    delete p.canonical_source;
    p.wells = p.wells.map((w) => ({
      ...w,
      wellbores: w.wellbores.map((b) => ({
        ...b,
        surveys: b.surveys.map((s) => ({
          ...s,
          md_m: s.md,
          inc_deg: s.inc,
          azi_deg: s.azi,
        })),
      })),
    }));
    $("canonical-project").value = JSON.stringify(p, null, 2);
  });
  const completion = panel(
    "overview",
    "Casing, cement, completion and formation intervals",
    "Depth intervals use mMD. Diameters use metres. Each record carries an explicit source. Schematic widths are enlarged for legibility; no mechanical rating is inferred.",
  );
  const fields = document.createElement("div");
  fields.className = "workform";
  completion.append(fields);
  input(
    fields,
    "Kind (HOLE / CASING / CEMENT / TUBING / PACKER / FORMATION)",
    "completion-kind",
    "CASING",
  );
  input(fields, "Label", "completion-label", "");
  input(fields, "Start MD (m)", "completion-from", "", "number");
  input(fields, "End MD (m)", "completion-to", "", "number");
  input(fields, "Outside diameter (m)", "completion-od", "", "number");
  input(fields, "Inside diameter (m, optional)", "completion-id", "", "number");
  input(fields, "Source / revision", "completion-source", "");
  const list = document.createElement("div");
  completion.append(list);
  const completionResult = result(completion, "completion-result");
  function drawCompletion() {
    list.replaceChildren();
    const rows = P.project().completion_intervals || [];
    rows.forEach((r, i) => {
      const row = document.createElement("div");
      row.className = "work-toolbar";
      const b = document.createElement("button");
      b.className = "smallbutton";
      b.textContent = `${r.kind}: ${r.label} · ${r.from}–${r.to} mMD · ${r.source}`;
      b.onclick = () =>
        A.selectLocation({ wellbore: "REFERENCE", md: r.from, to: r.to });
      const remove = document.createElement("button");
      remove.className = "smallbutton";
      remove.textContent = "Remove interval";
      remove.onclick = () => {
        rows.splice(i, 1);
        syncCompletion();
      };
      row.append(b, remove);
      list.append(row);
    });
  }
  function syncCompletion() {
    const rows = P.project().completion_intervals || [];
    A.load({ hole_sections: rows, completion_intervals: rows });
    $("schematic-json").value = JSON.stringify(
      rows.filter((r) => r.od_m != null),
    );
    $("schematic-apply").click();
    P.changed();
    drawCompletion();
    completionResult(rows);
  }
  button(completion, "Add source-backed interval", "completion-add", () => {
    const row = {
      kind: $("completion-kind").value.trim().toUpperCase(),
      label: $("completion-label").value,
      from: C.number($("completion-from").value),
      to: C.number($("completion-to").value),
      od_m:
        $("completion-od").value === ""
          ? null
          : C.number($("completion-od").value),
      id_m:
        $("completion-id").value === ""
          ? null
          : C.number($("completion-id").value),
      source: $("completion-source").value,
    };
    const [checked] = D.completion([row]);
    if (checked.to > A.snapshot().derived.ref.at(-1).md)
      throw Error("Interval exceeds the current trajectory");
    (P.project().completion_intervals ??= []).push(checked);
    syncCompletion();
  });
  const vendor = panel(
    "bha",
    "Vendor performance tables: shaft RPM and pressure–torque",
    "Tables are labelled FLOW_RPM or DP_TORQUE. Specify x_unit/y_unit, source, revision, quality, exact mud/temperature/density conditions and ordered points. Results are table interpolation only; stall and continuous ratings remain distinct metadata.",
  );
  input(vendor, "Curve JSON", "vendor-table", "null", "textarea");
  const vfields = document.createElement("div");
  vfields.className = "workform";
  vendor.append(vfields);
  input(vfields, "Query value", "vendor-query", "", "number");
  input(vfields, "Query unit", "vendor-unit", "L/min");
  input(vfields, "Mud type", "vendor-mud", "");
  input(vfields, "Temperature (°C)", "vendor-temp", "", "number");
  input(vfields, "Density (kg/m³)", "vendor-density", "", "number");
  const vr = result(vendor, "vendor-result");
  button(vendor, "Interpolate source table", "vendor-run", () => {
    const curve = JSON.parse($("vendor-table").value),
      query = {
        value: C.number($("vendor-query").value),
        unit: $("vendor-unit").value,
        conditions: {
          mud: $("vendor-mud").value,
          temperature_c: C.number($("vendor-temp").value),
          density_kg_m3: C.number($("vendor-density").value),
        },
      };
    const r = D.vendor(curve, query);
    (P.project().external_motor_curves ??= []).push({
      curve,
      query,
      result: r,
    });
    P.changed();
    vr(r);
  });
  const weights = panel(
    "td",
    "Matched PUW / SOW / FRW field comparisons",
    "Exact same MD, well, explicit basis_id and sensor zero_basis are required. Repeated tests need separate basis IDs. A configured time tolerance bounds each triplet. These descriptive differences cannot diagnose the cause of drag.",
  );
  input(weights, "Matched observations JSON", "matched-json", "[]", "textarea");
  input(
    weights,
    "Maximum time separation (seconds)",
    "matched-tolerance",
    "",
    "number",
  );
  const wr = result(weights, "matched-result");
  button(weights, "Compare matched observations", "matched-run", () => {
    const rows = JSON.parse($("matched-json").value),
      results = D.matchedWeights(rows, C.number($("matched-tolerance").value));
    P.project().matched_weight_comparisons = {
      inputs: rows,
      max_seconds: C.number($("matched-tolerance").value),
      results,
    };
    P.changed();
    wr(results);
  });
  const dynamics = panel(
    "dynamics",
    "Measured frequency response",
    "Uniform samples only, 8–2048 points. Include sample_rate_hz, unit, source, quality, clock_alignment, anti_alias_filter and samples [{time_s,value}]. A Hann-window amplitude spectrum is descriptive measurement processing; peaks are not natural frequencies or safe operating speeds.",
  );
  input(dynamics, "Measured channel JSON", "spectrum-json", "null", "textarea");
  const sr = result(dynamics, "spectrum-result");
  const canvas = document.createElement("canvas");
  canvas.id = "spectrum-chart";
  canvas.width = 1000;
  canvas.height = 300;
  canvas.setAttribute("aria-label", "Measured amplitude spectrum");
  dynamics.append(canvas);
  button(
    dynamics,
    "Analyze measured frequency response",
    "spectrum-run",
    () => {
      const channel = JSON.parse($("spectrum-json").value),
        r = D.spectrum(channel);
      P.project().measured_spectrum = { channel, result: r };
      P.changed();
      sr({
        ...r,
        bins: r.bins.length + " frequency bins; exported in project backup",
      });
      const g = canvas.getContext("2d");
      g.clearRect(0, 0, 1000, 300);
      const max = Math.max(...r.bins.map((b) => b.amplitude), 1e-12);
      g.strokeStyle = "#48d7c1";
      g.beginPath();
      r.bins.forEach((b, i) => {
        const x = 65 + (b.frequency_hz / r.nyquist_hz) * 850,
          y = 250 - (b.amplitude / max) * 200;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.stroke();
      g.fillStyle = "#b8d5df";
      g.font = "14px Segoe UI";
      g.fillText(
        "Amplitude (" + r.unit + ") · Hann window · measured response",
        30,
        25,
      );
      g.fillText("0 Hz", 55, 275);
      g.fillText(r.nyquist_hz + " Hz · Nyquist", 800, 275);
    },
  );
  const observed = panel(
    "directional",
    "Observed survey-interval BUR / TUR",
    "Derived only from loaded, source-labelled QC-passed survey intervals. Azimuth turn rate is withheld near vertical. These are observed interval descriptors, never WellScope BHA predictions.",
  );
  input(
    observed,
    "Survey observation JSON",
    "observed-surveys",
    '{"source":"","quality":"IMPORTED_UNCHECKED","stations":[]}',
    "textarea",
  );
  const or = result(observed, "observed-result");
  button(observed, "Calculate observed interval rates", "observed-run", () => {
    const p = JSON.parse($("observed-surveys").value),
      r = D.directionalIntervals(p.stations, p.source, p.quality);
    (P.project().observed_directional_intervals ??= []).push({
      input: p,
      results: r,
    });
    P.changed();
    or(r);
  });
  const friction = panel(
    "td",
    "Separate cased-hole / open-hole friction",
    "The string is partitioned exactly at the specified casing shoe and component boundaries. These coefficients are user assumptions for preliminary screening, not calibrated field values. The original coefficient is the fallback when separate values are unset.",
  );
  const fgrid = document.createElement("div");
  fgrid.className = "workform";
  friction.append(fgrid);
  input(fgrid, "Casing shoe MD (m)", "casing-shoe", "", "number");
  input(fgrid, "Cased-hole coefficient", "mu-cased", "", "number");
  input(fgrid, "Open-hole coefficient", "mu-open", "", "number");
  button(
    friction,
    "Apply separate friction assumptions",
    "friction-split",
    () => {
      A.load({
        casingShoe: C.number($("casing-shoe").value),
        muCased: C.number($("mu-cased").value),
        muOpen: C.number($("mu-open").value),
      });
      P.changed();
    },
  );
  const sections = panel(
    "td",
    "Engineer-defined well sections",
    "Explicit MD intervals and labels are used by the selection strip and force inspector. Real-data section labels are not inferred from inclination.",
  );
  input(
    sections,
    "Sections JSON: [{from,to,label,source}]",
    "sections-json",
    "[]",
    "textarea",
  );
  button(sections, "Load current section definitions", "sections-load", () => {
    $("sections-json").value = JSON.stringify(
      A.snapshot().state.sections || [],
      null,
      2,
    );
  });
  button(sections, "Apply section definitions", "sections-apply", () => {
    const rows = JSON.parse($("sections-json").value);
    if (!Array.isArray(rows)) throw Error("Expected section array");
    let previous = 0;
    for (const row of rows) {
      const start = C.number(row.from),
        end = C.number(row.to);
      if (
        start < previous ||
        end <= start ||
        end > A.snapshot().derived.ref.at(-1).md ||
        !row.label ||
        !row.source
      )
        throw Error(
          "Sections need ordered non-overlapping MD intervals, labels and sources",
        );
      previous = end;
    }
    A.load({ sections: rows });
    P.changed();
  });
  drawCompletion();
  window.addEventListener("wellscope:project-loaded", () => {
    drawCompletion();
    for (const id of [
      "directional-result",
      "psd-result",
      "motor-result",
      "vendor-result",
      "matched-result",
      "spectrum-result",
      "observed-result",
      "event-inspector",
      "report-v4",
    ])
      if ($(id))
        $(id).textContent =
          "NOT COMPUTED — project changed; load and evaluate this project’s source data.";
    for (const id of ["psd-chart", "report-figures"])
      if ($(id)) $(id).replaceChildren();
    const g = $("spectrum-chart").getContext("2d");
    g.clearRect(0, 0, 1000, 300);
  });
})();
