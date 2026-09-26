/* Accessible field editors; JSON remains available for reproducible interchange. */
(() => {
  "use strict";
  const C = WellCore,
    $ = (id) => document.getElementById(id);
  function form(host, title, fields, id) {
    const panel = document.createElement("article");
    panel.className = "panel";
    const h = document.createElement("h2");
    h.textContent = title;
    const grid = document.createElement("div");
    grid.className = "workform";
    for (const f of fields) {
      const label = document.createElement("label"),
        input = document.createElement(f.options ? "select" : "input");
      label.textContent = f.label;
      input.id = id + "-" + f.key;
      input.dataset.key = f.key;
      if (f.options)
        for (const s of f.options) {
          const opt = document.createElement("option");
          opt.value = s;
          opt.textContent = s;
          input.append(opt);
        }
      else {
        input.type = f.type || "text";
        input.step = "any";
        input.placeholder = f.placeholder || "Required source-backed value";
      }
      label.append(input);
      grid.append(label);
    }
    panel.append(h, grid);
    host.querySelector(".page-head").after(panel);
    return {
      panel,
      grid,
      read: () =>
        Object.fromEntries(
          [...grid.querySelectorAll("input,select")].map((i) => [
            i.dataset.key,
            i.type === "number"
              ? i.value === ""
                ? null
                : C.number(i.value)
              : i.value,
          ]),
        ),
    };
  }
  const dir = form(
    $("directional"),
    "Case input fields",
    [
      { key: "id", label: "Case ID" },
      { key: "source", label: "Source / revision" },
      {
        key: "quality",
        label: "Data provenance",
        options: ["USER_ENTERED", "IMPORTED_UNCHECKED", "SYNTHETIC"],
      },
      {
        key: "bit_nominal_diameter_m",
        label: "Nominal bit diameter (m)",
        type: "number",
      },
      {
        key: "caliper_diameter_m",
        label: "Measured caliper diameter (m)",
        type: "number",
      },
      {
        key: "max_pad_diameter_m",
        label: "Maximum extended pad diameter (m)",
        type: "number",
      },
      {
        key: "nbs_distance_m",
        label: "Bit-to-NBS distance (m)",
        type: "number",
      },
      { key: "md_from", label: "Interval start MD (m)", type: "number" },
      { key: "md_to", label: "Interval end MD (m)", type: "number" },
    ],
    "dirfield",
  );
  const dirButton = document.createElement("button");
  dirButton.className = "primary";
  dirButton.textContent = "Use fields and evaluate geometry";
  dirButton.onclick = () => {
    try {
      const c = dir.read();
      $("directional-json").value = JSON.stringify(c, null, 2);
      $("dir-evaluate").click();
    } catch (e) {
      $("work-error").textContent = e.message;
    }
  };
  dir.panel.append(dirButton);
  const psd = form(
    $("cuttings"),
    "Sample metadata",
    [
      { key: "id", label: "Sample ID" },
      { key: "provenance", label: "Source / sample log" },
      {
        key: "quality",
        label: "Data provenance",
        options: ["IMPORTED_UNCHECKED", "MEASURED_QC_PASS", "SYNTHETIC"],
      },
      { key: "collection_point", label: "Point of collection" },
      { key: "method", label: "Sampling / measurement method" },
      {
        key: "collection_time_start_utc",
        label: "UTC collection start (ISO + Z)",
      },
      { key: "collection_time_end_utc", label: "UTC collection end (ISO + Z)" },
      {
        key: "weighting_basis",
        label: "Weighting basis",
        options: ["dry_mass", "count", "area"],
      },
      { key: "wet_dry", label: "Sample condition", options: ["dry", "wet"] },
      {
        key: "sampling_screen_aperture_mm",
        label: "Shaker screen aperture (mm)",
        type: "number",
      },
      { key: "lag_model", label: "Lag model / source" },
      { key: "lag_uncertainty", label: "Lag uncertainty and units" },
      {
        key: "source_md_from",
        label: "Source interval start MD (m)",
        type: "number",
      },
      {
        key: "source_md_to",
        label: "Source interval end MD (m)",
        type: "number",
      },
    ],
    "sample",
  );
  const qc = document.createElement("div");
  qc.className = "work-toolbar";
  for (const [id, label] of [
    ["calibration_valid", "Calibration documented"],
    ["recovery_complete", "Recovery complete"],
    ["censored", "Censored fraction present"],
  ]) {
    const l = document.createElement("label"),
      input = document.createElement("input");
    input.type = "checkbox";
    input.id = "sample-" + id;
    l.append(input, document.createTextNode(label));
    qc.append(l);
  }
  psd.panel.append(qc);
  const bins = document.createElement("textarea");
  bins.className = "work-json";
  bins.id = "sieve-csv";
  bins.setAttribute("aria-label", "Sieve bin masses CSV");
  bins.value = "lower_mm,upper_mm,mass_kg";
  const intro = document.createElement("p");
  intro.className = "work-note";
  intro.textContent =
    "Enter contiguous ascending sieve bins and measured retained dry mass. Percentiles are withheld for censored, unbracketed or incompletely recovered samples.";
  psd.panel.append(intro, bins);
  const psdButton = document.createElement("button");
  psdButton.className = "primary";
  psdButton.textContent = "Use fields and analyze sieve masses";
  psdButton.onclick = () => {
    try {
      const s = psd.read();
      for (const k of ["calibration_valid", "recovery_complete", "censored"])
        s[k] = $("sample-" + k).checked;
      s.bins = C.csv(bins.value).map((b) => ({
        lower_mm: C.number(b.lower_mm),
        upper_mm: C.number(b.upper_mm),
        mass_kg: C.number(b.mass_kg),
      }));
      $("psd-json").value = JSON.stringify(s, null, 2);
      $("psd-evaluate").click();
    } catch (e) {
      $("work-error").textContent = e.message;
    }
  };
  psd.panel.append(psdButton);
  // Keep example/import editors visibly synchronized with the structured inputs.
  for (const [button, input, f] of [
    ["dir-demo", "directional-json", dir],
    ["psd-demo", "psd-json", psd],
  ])
    $(button).addEventListener("click", () => {
      let s;
      try {
        s = JSON.parse($(input).value);
      } catch {
        return;
      }
      for (const i of f.grid.querySelectorAll("input,select"))
        i.value = s[i.dataset.key] ?? "";
      if (input === "psd-json") {
        for (const k of ["calibration_valid", "recovery_complete", "censored"])
          $("sample-" + k).checked = !!s[k];
        bins.value =
          "lower_mm,upper_mm,mass_kg\n" +
          (s.bins || [])
            .map((b) => [b.lower_mm, b.upper_mm, b.mass_kg].join(","))
            .join("\n");
      }
    });
})();
