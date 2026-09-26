/* Schema-driven component properties; geometry only, no inferred ratings. */
(() => {
  "use strict";
  const C = WellCore,
    A = WellApp,
    $ = (id) => document.getElementById(id);
  let selected = 0,
    dragged = null;
  const host = document.createElement("article");
  host.className = "panel bha-design-studio";
  host.innerHTML =
    '<h2>BHA design · equipment families</h2><p class="work-note">23 equipment families with original technical illustrations. Select a tool to insert it, then replace the illustrative dimensions. Assemble from bit to surface; select a row to inspect or edit.</p><div class="work-toolbar"><label>Find equipment<input id="bha-family-search" placeholder="Motor, RSS, stabilizer, jar…"></label><span id="bha-family-count">23 families</span></div><div class="work-assets" id="asset-catalog"></div><div class="bha-design-columns"><div><h3>Assembly · bit → surface</h3><div id="component-order"></div></div><div><div id="component-illustration"></div><h3>Component properties</h3><div class="workform" id="component-fields"></div></div></div><div class="work-toolbar"><button id="save-component" class="primary">Apply component properties</button><button id="export-bha" class="smallbutton">Export BHA JSON</button><label class="filebtn">Import BHA JSON<input type="file" id="import-bha" accept=".json" hidden></label></div><div class="work-error" id="component-error" role="alert"></div>';
  $("bha").querySelector(".page-head").after(host);
  const oldLibrary = $("toolgallery").closest(".tool-panel");
  oldLibrary.hidden = true;
  const numeric = [
    "length",
    "od",
    "id",
    "mass",
    "max_od_m",
    "elastic_modulus_pa",
    "shear_modulus_pa",
    "density_kg_m3",
    "temperature_min_c",
    "temperature_max_c",
    "pressure_max_pa",
    "bit_to_bend_m",
    "bend_angle_deg",
    "toolface_deg",
    "rotor_lobes",
    "stator_lobes",
    "stage_count",
    "power_section_length_m",
    "flow_min_m3_s",
    "flow_max_m3_s",
    "continuous_dp_pa",
    "stall_dp_pa",
    "stall_torque_nm",
    "pad_width_m",
    "max_extended_od_m",
    "pad_force_n",
  ];
  for (const item of WellBhaRegistry)
    for (const field of item.fields)
      if (
        /(_m|_m2|_m3_s|_pa|_n|_nm|_nm_rad|_count|_measured)$/.test(field) &&
        !numeric.includes(field)
      )
        numeric.push(field);
  function guard(fn) {
    try {
      $("component-error").textContent = "";
      fn();
    } catch (e) {
      $("component-error").textContent = e.message;
    }
  }
  for (const item of WellBhaRegistry) {
    const b = document.createElement("button"),
      img = document.createElement("img"),
      label = document.createElement("span");
    img.src = item.asset;
    img.alt = item.label + " schematic";
    label.textContent = item.label;
    b.append(img, label);
    b.dataset.family = item.id;
    b.title = "Insert " + item.label;
    b.onclick = () =>
      guard(() => {
        const bha = A.snapshot().state.bha;
        const component = {
          stable_id: crypto.randomUUID(),
          family: item.id,
          name: item.label,
          length: 1,
          od: 0.127,
          id: 0.075,
          mass: 30,
          quality: "SYNTHETIC",
          source: "Synthetic geometry placeholder; replace all dimensions",
        };
        bha.splice(Math.min(selected, bha.length), 0, component);
        A.setBha(bha);
        render();
      });
    $("asset-catalog").append(b);
  }
  function move(from, to) {
    const bha = A.snapshot().state.bha;
    if (to < 0 || to >= bha.length) return;
    const [x] = bha.splice(from, 1);
    bha.splice(to, 0, x);
    selected = to;
    A.setBha(bha);
    render();
  }
  function render() {
    const { state, derived } = A.snapshot();
    selected = Math.max(0, Math.min(selected, state.bha.length - 1));
    $("component-order").replaceChildren();
    derived.bha.elements.forEach((b, i) => {
      const row = document.createElement("div");
      row.className =
        "work-toolbar assembly-row" + (i === selected ? " selected" : "");
      row.draggable = true;
      row.ondragstart = () => {
        dragged = i;
      };
      row.ondragover = (e) => e.preventDefault();
      row.ondrop = (e) => {
        e.preventDefault();
        guard(() => move(dragged, i));
      };
      const choose = document.createElement("button");
      choose.className = i === selected ? "primary" : "smallbutton";
      choose.textContent = `${i + 1}. ${b.name} · ${b.start.toFixed(2)}–${b.end.toFixed(2)} m from bit`;
      choose.onclick = () => {
        selected = i;
        render();
        const bit = derived.td.pooh.rows.at(-1).md,
          md = bit - (b.start + b.end) / 2;
        if (md >= 0)
          A.selectLocation({
            wellbore: "REFERENCE",
            md,
            to: Math.min(bit, bit - b.start),
            component: b.stable_id || b.name,
          });
      };
      const icon = document.createElement("img");
      const family =
        b.family ||
        {
          pdc: "pdc-bit",
          motor: "bent-pdm",
          rss: "rss-push",
          stab: "string-stabilizer",
          dp: "drillpipe",
        }[BhaIcons.typeOf(b.name)] ||
        BhaIcons.typeOf(b.name);
      icon.src = (
        WellBhaRegistry.find((x) => x.id === family) ||
        WellBhaRegistry.find((x) => x.id === "drillpipe")
      ).asset;
      icon.alt = family + " technical illustration";
      row.append(icon, choose);
      for (const [text, delta] of [
        ["↑", -1],
        ["↓", 1],
      ]) {
        const btn = document.createElement("button");
        btn.textContent = text;
        btn.className = "smallbutton";
        btn.setAttribute(
          "aria-label",
          (delta < 0 ? "Move toward bit: " : "Move toward surface: ") + b.name,
        );
        btn.disabled = i + delta < 0 || i + delta >= state.bha.length;
        btn.onclick = () => guard(() => move(i, i + delta));
        row.append(btn);
      }
      $("component-order").append(row);
    });
    const b = state.bha[selected],
      schema =
        WellBhaRegistry.find((x) => x.id === b.family) ||
        WellBhaRegistry.find((x) => x.id === "drillpipe");
    $("component-illustration").innerHTML = EquipmentDrawing.svg(
      b.family ||
        {
          pdc: "pdc-bit",
          motor: "bent-pdm",
          rss: "rss-push",
          stab: "string-stabilizer",
          dp: "drillpipe",
        }[BhaIcons.typeOf(b.name)] ||
        BhaIcons.typeOf(b.name),
    );
    $("component-fields").replaceChildren();
    const advanced = document.createElement("details"),
      summary = document.createElement("summary"),
      advancedFields = document.createElement("div");
    summary.textContent = "Source, ratings & family-specific properties";
    advancedFields.className = "workform";
    advanced.append(summary, advancedFields);
    for (const key of [
      "name",
      "family",
      "stable_id",
      "source",
      "length",
      "od",
      "id",
      "mass",
      ...schema.fields,
    ]) {
      const label = document.createElement("label"),
        input = document.createElement("input");
      label.textContent =
        {
          length: "Length (m)",
          od: "Body OD (m)",
          id: "Bore ID (m)",
          mass: "Linear mass (kg/m)",
        }[key] || key.replaceAll("_", " ");
      input.dataset.property = key;
      input.type = numeric.includes(key) ? "number" : "text";
      input.step = "any";
      input.value = b[key] ?? "";
      input.placeholder = numeric.includes(key)
        ? "Unknown"
        : "Source-backed value";
      label.append(input);
      if (
        ["name", "family", "length", "od", "id", "mass", "source"].includes(key)
      )
        $("component-fields").append(label);
      else advancedFields.append(label);
    }
    $("component-fields").append(advanced);
  }
  $("save-component").onclick = () =>
    guard(() => {
      const bha = A.snapshot().state.bha,
        component = { ...bha[selected] };
      for (const input of $("component-fields").querySelectorAll("input"))
        component[input.dataset.property] = numeric.includes(
          input.dataset.property,
        )
          ? input.value === ""
            ? null
            : C.number(input.value)
          : input.value;
      for (const k of ["length", "od", "id", "mass"]) C.number(component[k], k);
      if (
        component.max_od_m !== null &&
        component.max_od_m !== undefined &&
        component.max_od_m < component.od
      )
        throw Error("Maximum OD cannot be less than body OD");
      if (
        component.temperature_min_c != null &&
        component.temperature_max_c != null &&
        component.temperature_min_c > component.temperature_max_c
      )
        throw Error("Temperature range reversed");
      if (
        component.family &&
        !WellBhaRegistry.some((r) => r.id === component.family)
      )
        throw Error("Choose a known family ID from the catalog");
      if (
        [
          "body_rating_n",
          "connection_rating_n",
          "bearing_rating_n",
          "drive_shaft_rating_nm",
        ].some((k) => component[k] != null) &&
        !component.rating_source
      )
        throw Error("Ratings require an explicit source");
      component.stable_id = component.stable_id || crypto.randomUUID();
      component.quality = "USER_ENTERED";
      bha[selected] = component;
      A.setBha(bha);
      render();
    });
  $("export-bha").onclick = () => {
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(A.snapshot().state.bha, null, 2)], {
          type: "application/json",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "WellScope-BHA.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $("import-bha").onchange = async (e) => {
    try {
      const bha = JSON.parse(await e.target.files[0].text());
      WellEngine.normalizeBha(bha);
      A.setBha(
        bha.map((b) => ({
          ...b,
          stable_id: b.stable_id || crypto.randomUUID(),
          quality: "IMPORTED_UNCHECKED",
        })),
      );
      render();
    } catch (err) {
      $("component-error").textContent = err.message;
    }
    e.target.value = "";
  };
  $("bha-family-search").oninput = (e) => {
    let count = 0;
    for (const button of $("asset-catalog").children) {
      const visible =
        button.textContent
          .toLowerCase()
          .includes(e.target.value.toLowerCase()) ||
        button.dataset.family.includes(e.target.value.toLowerCase());
      button.hidden = !visible;
      if (visible) count++;
    }
    $("bha-family-count").textContent = count + " families";
  };
  window.addEventListener("wellscope:project-loaded", render);
  document.querySelector('[data-page="bha"]').addEventListener("click", render);
  render();
})();
