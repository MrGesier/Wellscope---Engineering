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
    '<h2>BHA design · equipment catalog</h2><p class="work-note">Distinct tool types with original identification drawings. Inspect function and model support before adding source-backed geometry to the string.</p><div class="work-toolbar"><label>Find equipment<input id="bha-family-search" placeholder="Motor, RSS, stabilizer, jar…"></label><label>Equipment group<select id="bha-group"><option value="">All groups</option></select></label><label>Use in WellScope<select id="bha-scope"><option value="">All uses</option><option value="STRING_GEOMETRY">Inline string geometry</option><option value="REFERENCE_ONLY">Reference register</option></select></label><span id="bha-family-count"></span></div><div class="work-assets" id="asset-catalog"></div><article id="catalog-inspector" class="catalog-inspector" hidden></article><details><summary>Reference equipment register <span id="equipment-register-count"></span></summary><div id="equipment-register"></div><button id="export-equipment-register" class="smallbutton">Export equipment register</button></details><details id="tool-integrity"><summary>Assembly consistency review <span id="tool-integrity-count"></span></summary><p class="work-note">Source and geometry checks only. No rating, hydraulic, fishing, or mechanical design approval.</p><ul id="tool-integrity-list"></ul></details><div class="bha-design-columns"><div><h3>Assembly · bit → surface</h3><div id="component-order"></div></div><div><div id="component-illustration"></div><h3>Component properties</h3><div class="workform" id="component-fields"></div></div></div><div class="work-toolbar"><button id="save-component" class="primary">Apply component properties</button><button id="export-bha" class="smallbutton">Export BHA JSON</button><label class="filebtn">Import BHA JSON<input type="file" id="import-bha" accept=".json" hidden></label></div><div class="work-error" id="component-error" role="alert"></div>';
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
    b.title = 'Inspect '+item.label;
    b.onclick=()=>inspect(item);
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
    const issues=ToolIntegrity.review(state.bha,state.steel);$('tool-integrity-count').textContent='('+issues.length+' notes)';$('tool-integrity-list').replaceChildren();
    for(const text of issues.length?issues:['No inconsistency found by these limited checks. Ratings and operating suitability remain unverified.']){const li=document.createElement('li');li.textContent=text;$('tool-integrity-list').append(li);}
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
      if(WellBhaRegistry.find(t=>t.id===component.family)?.scope==='REFERENCE_ONLY')throw Error("This type belongs in the reference register, not the drilling string.");
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
      if(bha.some(b=>WellBhaRegistry.find(t=>t.id===b.family)?.scope==='REFERENCE_ONLY'))throw Error("Reference-only equipment cannot be imported into the drilling string.");
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
  const escape = EngineeringCharts.esc;
  const sources={
   'Bits & coring':'https://www.bakerhughes.com/drilling/drill-bits',
   'Steering & drive':'https://www.slb.com/products-and-services/innovating-in-oil-and-gas/well-construction/drilling/directional-drilling',
   'Stabilization & enlargement':'https://www.slb.com/products-and-services/innovating-in-oil-and-gas/well-construction/drilling/directional-drilling/bha-tools',
   'Tubulars & flex elements':'https://seabed.software.slb.com/tubular/WebHelp/Tubular_files/Tubu9.htm',
   'Measurement & logging':'https://www.slb.com/products-and-services/innovating-in-oil-and-gas/well-construction/measurements/logging-while-drilling-services',
   'Impact & vibration':'https://www.nov.com/our-business-units/downhole',
   'Circulation & connections':'https://www.slb.com/products-and-services/innovating-in-oil-and-gas/well-construction/drilling/directional-drilling/bha-tools',
   'Completion & casing':'https://glossary.slb.com/terms/c/casing_hardware',
   'Fishing & intervention':'https://www.nov.com/products-and-services/brands/bowen'
  };
  function inspect(item){
   const box=$('catalog-inspector');box.hidden=false;
   box.innerHTML=`<div class="catalog-drawing">${EquipmentDrawing.svg(item.id)}<small>Identification schematic<br>Not to scale</small></div><div><div class="eng-kicker">${escape(item.group)} · ${escape(item.id)}</div><h3>${escape(item.label)}</h3><p><b>Function</b> · ${escape(item.purpose)}</p><p><b>Drawing key</b> · ${escape(item.distinction)}</p><p class="work-note">${escape(item.drawing)}</p><p><b>Useful in WellScope</b> · ${item.scope==='STRING_GEOMETRY'?'Length, OD, bore and linear mass feed the string tally and preliminary axial screening. Tool mechanisms, sensor physics, ratings and directional performance are not simulated.':'Reference equipment register only. This object does not enter the drilling BHA solver; anchoring, sealing, fishing and centralization performance are not computed.'}</p><p><b>Tool-specific information</b> · ${item.fields.map(x=>escape(x.replaceAll('_',' '))).join(' · ')}</p><p><a href="${sources[item.group]}" target="_blank" rel="noopener noreferrer">Public technical background ↗</a> · Category reference, not a dimension or rating certificate.</p><div class="catalog-entry-form"><label>Instance name<input id="catalog-instance" value="${escape(item.label)}"></label><label>Manufacturer / model (optional)<input id="catalog-model"></label><label>Source / revision<input id="catalog-source" placeholder="Drawing, datasheet or measured tally revision"></label>${item.scope==='STRING_GEOMETRY'?'<label>Length (m)<input id="catalog-length" type="number" step="any"></label><label>Body OD (mm)<input id="catalog-od" type="number" step="any"></label><label>Bore ID (mm)<input id="catalog-id" type="number" step="any"></label><label>Linear mass (kg/m)<input id="catalog-mass" type="number" step="any"></label>':''}</div><div class="work-toolbar"><button id="catalog-add" class="primary">${item.scope==='STRING_GEOMETRY'?'Add geometry to string':'Add to reference register'}</button><button id="catalog-close" class="smallbutton">Close tool sheet</button></div><div id="catalog-error" class="work-error" role="alert"></div></div>`;
   $('catalog-close').onclick=()=>box.hidden=true;
   $('catalog-add').onclick=()=>{try{$('catalog-error').textContent='';const name=$('catalog-instance').value.trim(),source=$('catalog-source').value.trim();if(!name||!source)throw Error('An instance name and source / revision are required.');const component={stable_id:crypto.randomUUID(),family:item.id,name,source,model:$('catalog-model').value.trim(),quality:'USER_ENTERED'};
    if(item.scope==='STRING_GEOMETRY'){for(const k of ['length','od','id','mass'])component[k]=C.number($('catalog-'+k).value,k);component.od/=1000;component.id/=1000;WellEngine.normalizeBha([component]);const bha=A.snapshot().state.bha;selected=Math.min(selected,bha.length);bha.splice(selected,0,component);A.setBha(bha);render();$('catalog-error').textContent='Geometry added. Select its assembly row to edit advanced properties.';}
    else{const project=WellEvidence.project();(project.equipment_register||=[]).push({...component,purpose:item.purpose,scope:item.scope,group:item.group});WellEvidence.changed('Reference equipment recorded');renderRegister();$('catalog-error').textContent='Recorded outside the drilling solver.';}
   }catch(e){$('catalog-error').textContent=e.message;}};
  }
  function renderRegister(){const rows=WellEvidence.project().equipment_register||[];$('equipment-register-count').textContent='('+rows.length+')';$('equipment-register').innerHTML=rows.length?'<div class="equipment-register-rows">'+rows.map(r=>`<div class="equipment-reference"><img src="assets/bha/${WellBhaRegistry.some(t=>t.id===r.family)?r.family:'crossover'}.svg" alt="Equipment schematic"><div><b>${escape(r.name)}</b><p>${escape(r.purpose)}<br>${escape(r.source)} · ${escape(r.model||'No model specified')}</p><small>REFERENCE ONLY · not used in axial calculations</small></div></div>`).join('')+'</div>':'<p>No reference equipment recorded. Choose a completion or fishing item in the catalog.</p>';}
  $('export-equipment-register').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(WellEvidence.project().equipment_register||[],null,2)],{type:'application/json'}));a.href=u;a.download='WellScope-equipment-register.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);};
  for(const group of [...new Set(WellToolCatalog.map(t=>t.group))]){const o=document.createElement('option');o.value=o.textContent=group;$('bha-group').append(o);}
  function filterCatalog(){const query=$('bha-family-search').value.toLowerCase(),group=$('bha-group').value,scope=$('bha-scope').value;let count=0;for(const button of $('asset-catalog').children){const item=WellBhaRegistry.find(t=>t.id===button.dataset.family),visible=(!group||item.group===group)&&(!scope||item.scope===scope)&&[item.label,item.id,item.purpose,item.distinction].join(' ').toLowerCase().includes(query);button.hidden=!visible;if(visible)count++;}$('bha-family-count').textContent=count+' / '+WellToolCatalog.length+' tool types';}
  $('bha-family-search').oninput=filterCatalog;$('bha-group').onchange=$('bha-scope').onchange=filterCatalog;filterCatalog();renderRegister();
  window.addEventListener('wellscope:project-loaded',()=>{renderRegister();$('catalog-inspector').hidden=true;});
  window.addEventListener("wellscope:project-loaded", render);
  document.querySelector('[data-page="bha"]').addEventListener("click", render);
  render();
})();
