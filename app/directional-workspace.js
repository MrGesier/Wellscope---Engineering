/* Directional sensitivities are driven by explicit source-labelled response data. */
(() => {
  const D = DirectionalResponse,
    C = WellCore,
    H = EngineeringCharts,
    $ = (id) => document.getElementById(id),
    esc = H.esc;
  let surface = D.demo(),
    settings = {
      mode: "rss",
      wobN: 100000,
      activation: 0.5,
      toolface: 0,
      inclination: 60,
    },
    units = { force: "tf", interval: 30 },
    result = null;
  const panel = document.createElement("article");
  panel.className = "panel directional-studio";
  panel.id = "directional-studio";
  panel.innerHTML = `<div class="eng-case-head"><div><div class="eng-kicker">DIRECTIONAL / RESPONSE SENSITIVITY</div><h2>WOB, steering & dogleg response</h2><p>Inspect DLS, build and turn separately. Change one assumption at a time.</p></div><span id="response-quality" class="eng-demo-tag"></span></div><p id="response-source" class="work-note"></p><div class="response-layout"><form id="response-form"><label>Operating mode<select id="response-mode"><option value="rss">RSS steering</option><option value="sliding">Motor · sliding blend</option><option value="rotating">Rotating / passive</option></select></label><div class="formgrid"><label>Force unit<select id="response-force"><option>tf</option><option>kN</option><option>klbf</option></select></label><label>Curvature unit<select id="response-interval"><option value="30">deg/30 m</option><option value="30.48">deg/100 ft</option></select></label></div><label id="response-wob-label">WOB<input id="response-wob" type="number" step="any"></label><label>Activation / sliding fraction (%)<input id="response-activation" type="number" min="0" max="100" value="50"></label><label>Toolface (degrees, highside = 0)<input id="response-toolface" type="number" step="any" value="0"></label><label>Inclination · turn conversion only (°)<input id="response-inclination" type="number" min="0" max="180" step="any" value="60"></label><button type="submit" class="primary">Update sensitivity</button><p id="response-domain" class="work-note"></p><p class="work-note">Curves interpolate the supplied WOB knots. Activation uses an explicit linear blend; toolface rotates the active curvature vector. No extrapolation or BHA contact solver.</p></form><div><div id="response-kpis" class="evidence-summary"></div><div id="response-error" role="alert" class="work-error"></div><div class="response-chart-grid"><section><h3>DLS versus WOB</h3><div id="response-wob-chart"></div></section><section><h3>Build / lateral steering envelope</h3><div id="response-envelope"></div></section></div><h3>Signed build and turn versus WOB</h3><div id="response-components"></div></div></div><details><summary>Response table, provenance & model assumptions</summary><p id="response-conditions"></p><p>Build is signed inclination change. Right curvature = sin(inclination) × azimuth turn rate. DLS = √(build² + right curvature²), a local differential relation. Near vertical, azimuth turn rate is undefined and omitted. A WOB trend is specific to its source and fixed conditions; it is not a universal law. Geometry edits in the BHA builder do not recalibrate this response surface.</p><div class="tablebox" id="response-table"></div></details><div class="work-toolbar"><button id="response-save" class="primary">Save sensitivity case</button><button id="response-export" class="smallbutton">Export result CSV</button><button id="response-report" class="smallbutton">Export study report</button><button id="response-json" class="smallbutton">Export surface JSON</button><label class="filebtn">Import source surface<input type="file" id="response-import" accept=".json" hidden></label><button id="response-reset" class="smallbutton">Restore fictional example</button></div><p class="work-note">For your own BHA, import a response surface from a documented external calculation at fixed formation, gauge and inclination. An imported surface remains EXTERNAL_MODEL; it is not field validation.</p>`;
  $("directional").querySelector(".page-head").after(panel);
  function download(name, text, type) {
    const u = URL.createObjectURL(new Blob([text], { type })),
      a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  }
  const f = (v) =>
      v == null ? "Undefined" : Number(v.toFixed(3)).toLocaleString("en-US"),
    rate = (v) => (v == null ? null : (v * units.interval) / 30),
    force = (v) => C.convert(v, "N", units.force);
  function sync() {
    $("response-mode").value = settings.mode;
    $("response-wob").value = force(settings.wobN).toPrecision(10);
    $("response-activation").value = settings.activation * 100;
    $("response-toolface").value = settings.toolface;
    $("response-inclination").value = settings.inclination;
    $("response-activation").disabled = settings.mode === "rotating";
    $("response-toolface").disabled = settings.mode === "rotating";
    $("response-force").value = units.force;
    $("response-interval").value = String(units.interval);
  }
  function render() {
    result = D.response(surface, settings);
    $("response-export").disabled = false;
    $("response-save").disabled = false;
    $("response-report").disabled = false;
    const curve = surface.curves.find((c) => c.mode === settings.mode),
      ru = units.interval === 30 ? "deg/30 m" : "deg/100 ft";
    $("response-quality").textContent =
      surface.quality === "SYNTHETIC"
        ? "FICTIONAL RESPONSE SURFACE"
        : "EXTERNAL MODEL / UNVERIFIED";
    $("response-source").textContent =
      surface.bha + " · " + surface.source + " · revision " + surface.revision;
    $("response-domain").textContent =
      `WOB source domain: ${f(force(curve.rows[0].wobN))}–${f(force(curve.rows.at(-1).wobN))} ${units.force}. Fixed source conditions.`;
    $("response-wob-label").firstChild.textContent =
      "WOB (" + units.force + ")";
    $("response-conditions").textContent =
      surface.conditions || "No additional source conditions supplied.";
    $("response-kpis").innerHTML = [
      ["DLS", rate(result.dls)],
      ["Build (+) / drop (−)", rate(result.build)],
      ["Azimuth turn", rate(result.turn)],
    ]
      .map(
        ([k, v]) =>
          `<div><small>${k}</small><b>${f(v)} ${v == null ? "" : ru}</b></div>`,
      )
      .join("");
    const sweeps = [0.25, 0.5, 1];
    $("response-wob-chart").innerHTML = H.svg(
      (settings.mode === "rotating" ? [0] : sweeps).map((activation) => ({
        name:
          settings.mode === "rotating"
            ? "Passive"
            : `${activation * 100}% steering`,
        points: curve.rows.map((r) => ({
          x: force(r.wobN),
          y: rate(
            D.response(surface, { ...settings, wobN: r.wobN, activation }).dls,
          ),
        })),
      })),
      { x: `WOB (${units.force})`, y: `DLS (${ru})` },
    );
    $("response-envelope").innerHTML = H.svg(
      [0.25, 0.5, 1].map((activation) => ({
        name: `${activation * 100}% steering`,
        points: Array.from({ length: 25 }, (_, i) => {
          const r = D.response(surface, {
            ...settings,
            activation,
            toolface: i * 15,
          });
          return { x: rate(r.right), y: rate(r.build) };
        }),
      })),
      { x: `Right curvature (${ru})`, y: `Build / drop (${ru})`, equal: true },
    );
    const rows = curve.rows.map((r) =>
      D.response(surface, { ...settings, wobN: r.wobN }),
    );
    $("response-components").innerHTML = H.svg(
      ["build", "turn"].map((key) => ({
        name: key === "build" ? "Build / drop" : "Azimuth turn",
        points: rows.map((r) => ({ x: force(r.wobN), y: rate(r[key]) })),
      })),
      { x: `WOB (${units.force})`, y: `Signed rate (${ru})` },
    );
    $("response-table").innerHTML =
      `<table><thead><tr><th>WOB (${units.force})</th><th>Build (${ru})</th><th>Turn (${ru})</th><th>DLS (${ru})</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${f(force(r.wobN))}</td><td>${f(rate(r.build))}</td><td>${f(rate(r.turn))}</td><td>${f(rate(r.dls))}</td></tr>`).join("")}</tbody></table>`;
    sync();
  }
  $("response-form").oninput = () => {
    $("response-export").disabled = true;
    $("response-save").disabled = true;
    $("response-report").disabled = true;
    $("response-error").textContent =
      "Unapplied changes — Update sensitivity before exporting.";
  };
  function guard(fn) {
    try {
      $("response-error").textContent = "";
      fn();
    } catch (e) {
      $("response-error").textContent = e.message;
    }
  }
  $("response-form").onsubmit = (e) => {
    e.preventDefault();
    guard(() => {
      const next = {
        mode: $("response-mode").value,
        wobN: C.convert(C.number($("response-wob").value), units.force, "N"),
        activation: C.number($("response-activation").value) / 100,
        toolface: C.number($("response-toolface").value),
        inclination: C.number($("response-inclination").value),
      };
      D.response(surface, next);
      settings = next;
      render();
    });
  };
  // Unit switches convert the pending WOB value, preserving other edits.
  $("response-force").onchange = (e) =>
    guard(() => {
      const n = C.convert(
        C.number($("response-wob").value),
        units.force,
        e.target.value,
      );
      units.force = e.target.value;
      $("response-wob").value = n.toPrecision(10);
      $("response-wob-label").firstChild.textContent =
        "WOB (" + units.force + ")";
      $("response-form").requestSubmit();
    });
  $("response-interval").onchange = (e) => {
    units.interval = Number(e.target.value);
    $("response-form").requestSubmit();
  };
  $("response-mode").onchange = (e) => {
    $("response-activation").disabled = e.target.value === "rotating";
    $("response-toolface").disabled = e.target.value === "rotating";
  };
  $("response-reset").onclick = () => {
    surface = D.demo();
    settings = {
      mode: "rss",
      wobN: 100000,
      activation: 0.5,
      toolface: 0,
      inclination: 60,
    };
    guard(render);
  };
  $("response-save").onclick = async () => {
    try {
      const owner = WellEvidence.project();
      if (owner.mode === "USER_DATA" && surface.quality === "SYNTHETIC")
        throw Error(
          "Save fictional response cases only in a synthetic project.",
        );
      const snapshot = structuredClone({ surface, settings, units, result }),
        hash = await C.fingerprint(snapshot);
      if (WellEvidence.project() !== owner)
        throw Error("Project changed while saving");
      (owner.directional_sensitivity_runs ||= []).push({
        id: crypto.randomUUID(),
        saved_utc: new Date().toISOString(),
        input_sha256: hash,
        ...snapshot,
      });
      WellEvidence.changed("Directional sensitivity saved");
      $("response-error").textContent =
        "Sensitivity saved. Export Project keeps this snapshot.";
    } catch (e) {
      $("response-error").textContent = e.message;
    }
  };
  window.addEventListener("wellscope:project-loaded", () => {
    const saved = WellEvidence.project().directional_sensitivity_runs?.at(-1);
    try {
      if (saved) {
        D.response(saved.surface, saved.settings);
        surface = structuredClone(saved.surface);
        settings = structuredClone(saved.settings);
        units = structuredClone(saved.units);
      } else {
        surface = D.demo();
        settings = {
          mode: "rss",
          wobN: 100000,
          activation: 0.5,
          toolface: 0,
          inclination: 60,
        };
        units = { force: "tf", interval: 30 };
      }
      guard(render);
    } catch (e) {
      $("response-error").textContent =
        "Saved response could not be loaded: " + e.message;
    }
  });
  $("response-report").onclick = () =>
    download(
      "directional-sensitivity-report.html",
      `<!doctype html><html lang="en"><meta charset="utf-8"><title>Directional sensitivity</title><style>body{font:14px/1.6 Arial;color:#253e50;max-width:1000px;margin:35px auto;padding:20px}svg{width:100%}table{border-collapse:collapse;width:100%}td,th{padding:8px;border-bottom:1px solid #ddd}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>Directional response sensitivity</h1><p>${esc(surface.quality)} · ${esc(surface.bha)} · ${esc(surface.source)} · revision ${esc(surface.revision)}</p><p>${esc(surface.conditions || "")}</p><pre>${esc(JSON.stringify(settings, null, 2))}</pre><p>Model: response-surface interpolation. Fixed-condition data, linear activation blend and rotated steering vector. No BHA contact or bit-rock solver. Inclination affects azimuth-rate conversion only. No extrapolation.</p>${$("response-kpis").innerHTML}<h2>DLS versus WOB</h2>${$("response-wob-chart").innerHTML}<h2>Steering envelope</h2>${$("response-envelope").innerHTML}<h2>Build and turn</h2>${$("response-components").innerHTML}${$("response-table").innerHTML}</html>`,
      "text/html",
    );
  $("response-json").onclick = () =>
    download(
      "directional-response-surface.json",
      JSON.stringify(surface, null, 2),
      "application/json",
    );
  $("response-export").onclick = () => {
    const curve = surface.curves.find((c) => c.mode === settings.mode);
    download(
      "directional-sensitivity.csv",
      [
        `quality,source,revision,bha,model,mode,activation,toolface_deg,inclination_deg,WOB_${units.force},build_deg_per_${units.interval}m,turn_deg_per_${units.interval}m,DLS_deg_per_${units.interval}m`,
        ...curve.rows.map((r) => {
          const v = D.response(surface, { ...settings, wobN: r.wobN });
          return [
            surface.quality,
            surface.source,
            surface.revision,
            surface.bha,
            v.model,
            settings.mode,
            settings.activation,
            settings.toolface,
            settings.inclination,
            force(r.wobN),
            rate(v.build),
            rate(v.turn),
            rate(v.dls),
          ]
            .map((x) => '"' + String(x ?? "").replaceAll('"', '""') + '"')
            .join(",");
        }),
      ].join("\n"),
      "text/csv",
    );
  };
  $("response-import").onchange = async (e) => {
    try {
      const next = JSON.parse(await e.target.files[0].text());
      D.validate(next);
      const mode = next.curves[0].mode,
        wobN = next.curves[0].rows[0].wobN;
      D.response(next, { ...settings, mode, wobN });
      surface = next;
      settings = { ...settings, mode, wobN };
      guard(render);
    } catch (err) {
      $("response-error").textContent = err.message;
    }
    e.target.value = "";
  };
  render();
  window.DirectionalWorkspace = {
    snapshot: () => structuredClone({ surface, settings, units, result }),
  };
})();
