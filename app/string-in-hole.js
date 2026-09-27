(() => {
  const $ = (id) => document.getElementById(id),
    esc = EngineeringCharts.esc;
  const panel = document.createElement("article");
  panel.id = "string-in-hole";
  panel.className = "panel";
  panel.innerHTML = `<div class="eng-kicker">WHOLE STRING / PRELIMINARY CONTACT EQUILIBRIUM</div><h2>BHA + drillpipe moving inside the well</h2><p>Survey overview and magnified component mesh. Red dots mark calculated wall reactions; the bit and surface are centred supports. Select a tool or contact to inspect it.</p><div class="work-toolbar"><button id="si-demo">Load synthetic 3,800 m example</button><label>Import complete study JSON<input id="si-import" type="file" accept=".json"></label><button id="si-export">Export study</button></div><div class="work-toolbar"><label>Bit MD (m)<input id="si-depth" type="number" min="1" value="3800"></label><button id="si-calc">Move / calculate</button><button id="si-down">Run in ↓</button><button id="si-up">Pull out ↑</button><button id="si-stop">Stop</button><label>Travel step (m)<input id="si-speed" type="number" min="1" max="100" value="20"></label><label>Beam mesh (m)<select id="si-step"><option>5</option><option selected>10</option><option>20</option></select></label><label>Constant axial tension (tf)<input id="si-tension" type="number" value="0" step="1"></label></div><div class="work-toolbar"><label>Inspect MD (m)<input id="si-inspect" type="number" value="3770"></label><label>Window (m)<select id="si-span"><option>12</option><option selected>60</option><option>200</option></select></label><label><input id="si-follow" type="checkbox" checked> Follow bit</label><label>Orbit angle<input id="si-angle" type="range" min="0" max="360" value="35"></label><label><input id="si-wire" type="checkbox" checked> Surface mesh</label></div><p id="si-status" role="status"></p><canvas id="si-canvas" width="1200" height="650" style="width:100%;background:#f3f5f6" aria-label="Whole drillstring survey and three dimensional meshed inspection window"></canvas><div id="si-tools" class="work-toolbar"></div><div id="si-detail"></div><label>Calculated contacts (MD / reaction)<select id="si-contacts"></select></label><p class="work-note">Transverse dimensions in the inspection view are magnified relative to length; bore and equipment share the same transverse scale. Surface triangles are a display mesh; dots are the actual beam stations. Coarse cells use conservative contact envelopes and equivalent stiffness: refine the beam mesh before interpreting local contacts. Tool profiles are illustrative, with entered body/contact diameters, not manufacturer CAD. This preliminary model uses constant tension or a one-way soft-string effective tension profile, frictionless transverse walls and centred ends. No torque coupling, buckling, dynamic running loads, cuttings transport or casing-wear prediction. It is not an operating-limit certification.</p>`;
  $("bs3-panel").before(panel);
  const jump = document.createElement("button");
  jump.className = "primary";
  jump.textContent = "Whole string in hole · movement & contacts";
  jump.onclick = () => {
    document.querySelector('[data-page="bha-static"]').click();
    panel.scrollIntoView();
  };
  $("bha-static").querySelector(".page-head").after(jump);
  let input,
    result,
    timer = null,
    selected = 0;
  const colors = [
    "#ac7747",
    "#476d83",
    "#7b8775",
    "#a78b55",
    "#677f8d",
    "#8f7770",
  ];
  function meshSelect(value) {
    const el = $("si-step");
    if (![...el.options].some((o) => o.value === String(value)))
      el.add(new Option(String(value), String(value)));
    el.value = value;
  }
  function demo() {
    const c = EngineeringCase.demo();
    input = {
      source:
        "Original synthetic Northbank N-04 / assumed elastic properties and joints",
      quality: "SYNTHETIC",
      adaptive: true,
      fineStepM: 1,
      survey: c.survey,
      components: c.bha.map((b) => ({
        ...b,
        E: 210e9,
        contactOD: b.od,
        source: "Synthetic geometry; assumed steel E = 210 GPa",
        ...(/drill-pipe|hwdp/.test(b.type)
          ? { jointSpacing: 9.3, jointLength: 0.45, jointOD: 0.168 }
          : {}),
      })),
      sections: c.sections.map((s) => ({
        from: s.from,
        to: s.to,
        diameter: s.id,
        kind: s.name === "Open hole" ? "OPEN" : "CASED",
        source: "Synthetic architecture",
      })),
      bitMD: 3800,
      stepM: 10,
      tensionN: 0,
      rho: 1260,
    };
    $("si-depth").value = 3800;
    $("si-step").value = 10;
    $("si-tension").value = 0;
    calculate();
  }
  function stop() {
    clearTimeout(timer);
    timer = null;
  }
  function calculate() {
    result = null;
    try {
      input.bitMD = +$("si-depth").value;
      input.stepM = +$("si-step").value;
      input.tensionN = +$("si-tension").value * 9806.65;
      result = StringContact.solve(input);
      if ($("si-follow").checked)
        $("si-inspect").value = Math.max(
          0,
          input.bitMD - +$("si-span").value / 2,
        );
      $("si-status").textContent =
        `${input.quality} · ${input.bitMD.toFixed(1)} m MD · ${result.rows.length} beam stations · ${result.contacts} contact stations · residual ${result.residualN.toFixed(3)} N · ${input.source}`;
      tools();
      draw();
    } catch (e) {
      stop();
      $("si-status").textContent = e.message;
      draw();
    }
  }
  function sample(md) {
    const a = result.rows;
    let i = 0,
      hi = a.length - 1;
    while (hi - i > 1) {
      const m = (hi + i) >> 1;
      if (a[m].md <= md) i = m;
      else hi = m;
    }
    i = Math.min(i, a.length - 2);
    const r = a[i],
      s = a[i + 1],
      t = Math.max(0, Math.min(1, (md - r.md) / (s.md - r.md)));
    return {
      offset: r.position.map(
        (v, k) =>
          (v - r.center[k]) * (1 - t) + (s.position[k] - s.center[k]) * t,
      ),
      axes: r.axes,
      hole: r.hole,
    };
  }
  function family(b) {
    const map = {
      "push-the-bit-rss": "rss-push",
      "drill-pipe": "drillpipe",
      stabilizer: "string-stabilizer",
      nonmag: "nmdc",
      "drill-collar": "slick-collar",
    };
    return WellBhaRegistry.find(
      (r) => r.id === (b.family || map[b.type] || b.type),
    );
  }
  function tools() {
    $("si-tools").innerHTML = result.parts
      .map(
        (b, i) =>
          `<button data-tool="${i}" style="border-bottom:3px solid ${colors[i % colors.length]}">${esc(b.name)}</button>`,
      )
      .join("");
    $("si-tools")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            selected = +b.dataset.tool;
            const p = result.parts[selected];
            $("si-follow").checked = false;
            $("si-inspect").value = Math.max(
              0,
              input.bitMD - (p.start + Math.min(p.end, input.bitMD)) / 2,
            );
            draw();
          }),
      );
    $("si-contacts").innerHTML =
      '<option value="">Inspect a contact…</option>' +
      result.rows
        .filter((r) => r.contact)
        .map(
          (r) =>
            `<option value="${r.md}">${r.md.toFixed(1)} m · ${(r.reactionN / 9806.65).toFixed(3)} tf · ${esc(result.parts[r.component].name)}</option>`,
        )
        .join("");
  }
  const canvas = $("si-canvas"),
    g = canvas.getContext("2d");
  function draw() {
    g.clearRect(0, 0, 1200, 650);
    window.dispatchEvent(
      new CustomEvent("string-shape-update", {
        detail: {
          input,
          result,
          selected,
          inspectMD: +$("si-inspect").value,
          span: +$("si-span").value,
        },
      }),
    );
    if (!result) return;
    const span = +$("si-span").value,
      mid = Math.max(0, Math.min(input.bitMD, +$("si-inspect").value)),
      lo = Math.max(0, Math.min(input.bitMD - span, mid - span / 2)),
      hi = Math.min(input.bitMD, lo + span),
      angle = (+$("si-angle").value * Math.PI) / 180;
    g.font = "16px sans-serif";
    g.fillStyle = "#304856";
    g.fillText("Whole well · occupied string + contacts", 20, 28);
    g.fillText(
      `Inspection ${lo.toFixed(1)}–${hi.toFixed(1)} m MD · transverse ${(((hi - lo) * 900) / 520).toFixed(0)}×`,
      390,
      28,
    );
    const survey = WellEngine.survey(input.survey),
      maxH = Math.max(1, ...survey.map((r) => Math.hypot(r.n, r.e))),
      maxV = Math.max(1, ...survey.map((r) => r.tvd));
    const xy = (r) => [
      35 + (Math.hypot(r.n, r.e) / maxH) * 285,
      65 + (r.tvd / maxV) * 520,
    ];
    g.lineWidth = 9;
    g.strokeStyle = "#c7c4bb";
    g.beginPath();
    survey.forEach((r, i) => {
      const p = xy(r);
      i ? g.lineTo(...p) : g.moveTo(...p);
    });
    g.stroke();
    result.rows.forEach((r, i) => {
      const q = xy({ n: r.center[0], e: r.center[1], tvd: r.center[2] });
      if (i) {
        const prev = result.rows[i - 1],
          v = xy({ n: prev.center[0], e: prev.center[1], tvd: prev.center[2] });
        g.strokeStyle = colors[r.component % 6];
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(...v);
        g.lineTo(...q);
        g.stroke();
      }
      if (r.contact) {
        g.fillStyle = "#bc4c3d";
        g.fillRect(q[0] - 2, q[1] - 2, 4, 4);
      }
      if (r.md >= lo && r.md <= hi) {
        g.strokeStyle = "#ac7747";
        g.strokeRect(q[0] - 7, q[1] - 7, 14, 14);
      }
    });
    const transverse = 900,
      y = (md) => 65 + ((md - lo) / Math.max(0.01, hi - lo)) * 520;
    function proj(md, radius, theta) {
      const s = sample(md),
        u = s.offset.reduce((v, x, k) => v + x * s.axes[0][k], 0),
        v = s.offset.reduce((v, x, k) => v + x * s.axes[1][k], 0),
        x = u + radius * Math.cos(theta),
        z = v + radius * Math.sin(theta);
      return [
        780 + transverse * (x * Math.cos(angle) - z * Math.sin(angle)),
        y(md) + transverse * 0.22 * (x * Math.sin(angle) + z * Math.cos(angle)),
      ];
    }
    // Bore section walls, independent of the displaced string centre.
    for (let md = lo; md < hi; md += Math.max(0.1, (hi - lo) / 150)) {
      const s = input.sections.find((s) => md >= s.from && md <= s.to);
      if (!s) continue;
      g.fillStyle = s.kind === "CASED" ? "#d2d1ca" : "#e1d5bc";
      const yy = y(md),
        hh = Math.max(2, y(Math.min(hi, md + (hi - lo) / 150)) - yy + 1);
      g.fillRect(780 - (s.diameter / 2) * transverse - 9, yy, 9, hh);
      g.fillRect(780 + (s.diameter / 2) * transverse, yy, 9, hh);
    }
    const faces = [];
    for (let idx = 0; idx < result.parts.length; idx++) {
      const b = result.parts[idx],
        from = Math.max(lo, input.bitMD - b.end, 0),
        to = Math.min(hi, input.bitMD - b.start);
      if (to <= from) continue;
      const stations = [from, to];
      const step = Math.min((to - from) / 4, (hi - lo) / 30);
      for (let md = from + step; md < to; md += step) stations.push(md);
      if (b.jointSpacing)
        for (let x = 0; x < b.length; x += b.jointSpacing)
          for (const edge of [x, x + b.jointLength]) {
            const md = input.bitMD - b.start - edge;
            if (md > from && md < to) stations.push(md);
          }
      stations.sort((a, b) => a - b);
      const profile = (md, t) => {
        const x = input.bitMD - md - b.start,
          f = x / b.length;
        let rad = b.od / 2;
        if (b.jointSpacing && x % b.jointSpacing <= b.jointLength + 0.00001)
          rad = b.jointOD / 2;
        const type = b.type || b.family || "";
        if (/stabilizer|rss/.test(type))
          rad *= 0.82 + 0.18 * Math.max(0, Math.cos(3 * t + x * 2));
        if (/^(pdc-bit|tricone|bit)$/.test(type))
          rad *= 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, Math.max(0, f)));
        if (/jar|accelerator|mwd|lwd/.test(type) && f % 0.2 < 0.04) rad *= 0.9;
        return rad;
      };
      for (let j = 1; j < stations.length; j++)
        for (let k = 0; k < 12; k++) {
          const t = (k * Math.PI) / 6,
            tt = ((k + 1) * Math.PI) / 6,
            a = stations[j - 1],
            bmd = stations[j];
          const points = [
            [a, t],
            [a, tt],
            [bmd, tt],
            [bmd, t],
          ].map(([md, t]) => proj(md, profile(md, t), t));
          faces.push({
            points,
            z: Math.sin(t + angle),
            color: colors[idx % 6],
          });
        }
    }
    faces.sort((a, b) => a.z - b.z);
    for (const f of faces) {
      g.beginPath();
      f.points.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p)));
      g.closePath();
      g.fillStyle = f.color;
      g.fill();
      if ($("si-wire").checked) {
        g.strokeStyle = "#243e4c88";
        g.lineWidth = 0.5;
        g.stroke();
        g.beginPath();
        g.moveTo(...f.points[0]);
        g.lineTo(...f.points[2]);
        g.stroke();
      }
    }
    for (const r of result.rows.filter((r) => r.md >= lo && r.md <= hi)) {
      const u = r.position.reduce(
          (v, x, k) => v + (x - r.center[k]) * r.axes[0][k],
          0,
        ),
        v = r.position.reduce(
          (v, x, k) => v + (x - r.center[k]) * r.axes[1][k],
          0,
        );
      const p = proj(r.md, r.contact ? r.contactOD / 2 : 0, Math.atan2(v, u));
      g.fillStyle = r.contact ? "#bd3327" : "#263c48";
      g.beginPath();
      g.arc(...p, r.contact ? 5 : 2, 0, Math.PI * 2);
      g.fill();
      if (r.contact) {
        g.fillStyle = "#71362d";
        g.fillText(
          `${r.md.toFixed(0)} m · ${(r.reactionN / 9806.65).toFixed(2)} tf`,
          980,
          y(r.md),
        );
      }
    }
    g.fillStyle = "#304856";
    g.fillText("Red: contact reaction • Black: beam station", 390, 628);
    const b = result.parts[selected],
      f = family(b);
    $("si-detail").innerHTML =
      `${f ? `<img src="${esc(f.asset)}" style="height:110px;float:left;margin-right:20px" alt="${esc(b.name)}">` : ""}<b>${esc(b.name)}</b><p>Length ${b.length.toFixed(2)} m · body OD ${(b.od * 1000).toFixed(1)} mm · contact envelope ${(Math.max(b.contactOD, b.jointOD || 0) * 1000).toFixed(1)} mm. ${esc(b.source)}. Selected component may be partly or entirely above surface.</p><div style="clear:both"></div>`;
  }
  function play(direction) {
    stop();
    if (
      input.axial &&
      (direction < 0
        ? input.axial.axialSpeedMps <= 0
        : input.axial.axialSpeedMps >= 0)
    ) {
      $("si-status").textContent =
        "Set axial speed positive for pull out, negative for run in, then apply loads. Travel playback does not set physical speed.";
      return;
    }
    function tick() {
      const max = Math.min(
        input.survey.at(-1).md,
        input.sections.at(-1).to,
        input.components.reduce((s, b) => s + b.length, 0),
      );
      const next = Math.max(
        1,
        Math.min(
          max,
          input.bitMD +
            direction * Math.max(1, Math.min(100, +$("si-speed").value || 20)),
        ),
      );
      if (next === input.bitMD) return;
      $("si-depth").value = next;
      calculate();
      if (result) timer = setTimeout(tick, 700);
    }
    tick();
  }
  ["si-depth", "si-step", "si-tension"].forEach((id) =>
    $(id).addEventListener("input", () => {
      stop();
      result = null;
      draw();
      $("si-contacts").innerHTML = "";
      $("si-status").textContent =
        "Inputs changed — Move / calculate to refresh geometry.";
    }),
  );
  $("si-demo").onclick = () => {
    stop();
    demo();
  };
  $("si-calc").onclick = () => {
    stop();
    calculate();
  };
  $("si-up").onclick = () => play(-1);
  $("si-down").onclick = () => play(1);
  $("si-stop").onclick = stop;
  ["si-inspect", "si-span", "si-follow", "si-angle", "si-wire"].forEach(
    (id) =>
      ($(id).oninput = () => {
        if (id === "si-inspect") $("si-follow").checked = false;
        if ($("si-follow").checked)
          $("si-inspect").value = input.bitMD - +$("si-span").value / 2;
        draw();
      }),
  );
  $("si-contacts").onchange = () => {
    if ($("si-contacts").value) {
      $("si-follow").checked = false;
      $("si-inspect").value = $("si-contacts").value;
      draw();
    }
  };
  $("si-import").onchange = async () => {
    stop();
    try {
      const p = JSON.parse(await $("si-import").files[0].text());
      StringContact.solve(p);
      input = p;
      $("si-depth").value = p.bitMD;
      meshSelect(p.stepM);
      $("si-tension").value = p.tensionN / 9806.65;
      calculate();
    } catch (e) {
      result = null;
      draw();
      $("si-status").textContent = "Import rejected: " + e.message;
    }
  };
  $("si-export").onclick = () => {
    if (!result) return;
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(input, null, 2)], {
          type: "application/json",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "wellscope-string-contact.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  document.addEventListener(
    "click",
    (e) => {
      if (!e.target.closest("#string-in-hole")) stop();
    },
    true,
  );
  window.StringInHole = {
    applyStudy: (p) => {
      stop();
      input = structuredClone(p);
      $("si-depth").value = p.bitMD;
      meshSelect(p.stepM);
      $("si-tension").value = p.tensionN / 9806.65;
      selected = Math.min(selected, input.components.length - 1);
      calculate();
    },
    select: (index, md) => {
      selected = index;
      $("si-follow").checked = false;
      const b = result?.parts[index];
      if (b)
        $("si-inspect").value =
          md ??
          Math.max(
            0,
            input.bitMD - (b.start + Math.min(b.end, input.bitMD)) / 2,
          );
      draw();
    },
    snapshot: () => ({
      input: structuredClone(input),
      result: structuredClone(result),
      playing: timer !== null,
      selected,
      inspectMD: +$("si-inspect").value,
      span: +$("si-span").value,
    }),
  };
  demo();
  if (location.hash === "#string-in-hole") {
    document.querySelector('[data-page="bha-static"]').click();
    panel.scrollIntoView();
  }
})();
