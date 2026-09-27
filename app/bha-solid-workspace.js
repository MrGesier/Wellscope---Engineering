(() => {
  const $ = (id) => document.getElementById(id),
    esc = EngineeringCharts.esc;
  const panel = document.createElement("article");
  panel.id = "bs3-panel";
  panel.className = "panel";
  panel.innerHTML = `<div class="eng-kicker">ASSEMBLY / DEFORMED COMPONENT MESH</div><h2>BHA inside the borehole</h2><p>Orbit with drag, zoom with the wheel. Select a tool to inspect its dimensions and calculated bending. Tool profiles are schematic equivalents; body and contact diameters come from this study.</p>
  <div class="work-toolbar"><label>Surface colour<select id="bs3-colour"><option value="tools">Components</option><option value="bendingPa">Bending stress (MPa)</option></select></label><label>Cross-section scale<select id="bs3-scale"><option value="1">1× physical proportions</option><option value="8" selected>8× inspection</option><option value="16">16× inspection</option></select></label><label><input type="checkbox" id="bs3-mesh" checked> Triangular display mesh</label><label><input type="checkbox" id="bs3-hole" checked> Borehole cutaway</label><button id="bs3-reset">Reset camera</button></div>
  <canvas id="bs3-canvas" width="1200" height="560" style="width:100%;background:#f4f6f7;touch-action:none" aria-label="Three dimensional component BHA mesh inside cutaway borehole"></canvas>
  <div id="bs3-legend" class="work-note"></div><div id="bs3-tools" class="work-toolbar"></div><div id="bs3-inspect" role="status"></div>
  <h3>Move the assembly through the modeled hole</h3><div class="work-toolbar"><label>Bit MD (m)<input id="bs3-depth" type="number" step="0.5"></label><button id="bs3-move">Move and recalculate</button><button id="bs3-play">Play depth sequence</button><button id="bs3-stop" disabled>Stop</button></div><p id="bs3-status" role="status"></p><p class="work-note">Depth playback recalculates up to 12 static positions over the preceding modeled span, ending at the entered bit depth. Stops at missing geometry, invalid fit or solver failure. This is not a dynamic drilling or whirl simulation. The camera stays fixed during depth playback; Reset camera returns to the current assembly. Heat values come from the beam solution, not a 3D solid stress analysis. Both bore and BHA transverse dimensions use the displayed scale.</p>`;
  const beam = $("bs-canvas").closest("article");
  beam.before(panel);
  const jump = document.createElement("button");
  jump.id = "bs3-jump";
  jump.className = "primary";
  jump.textContent = "View component BHA mesh ↓";
  jump.onclick = () => panel.scrollIntoView({ behavior: "smooth" });
  $("bha-static").querySelector(".page-head").after(jump);
  let state = null,
    mesh = null,
    yaw = -0.24,
    roll = 0.62,
    zoom = 1,
    selected = 0,
    drag = null,
    hits = [],
    timer = null,
    travel = null,
    playing = false;
  const colours = [
    "#aa7848",
    "#5e7788",
    "#6e8487",
    "#bb985d",
    "#7c829b",
    "#82917d",
  ];
  const canvas = $("bs3-canvas"),
    g = canvas.getContext("2d");
  function stop() {
    clearTimeout(timer);
    timer = null;
    playing = false;
    $("bs3-stop").disabled = true;
    $("bs3-play").disabled = !state?.result;
  }
  function update(detail) {
    state = detail || BhaStaticWorkspace.snapshot();
    mesh = state.result ? BhaSolidMesh.build(state.input, state.result) : null;
    if (!mesh) stop();
    $("bs3-status").textContent = mesh
      ? "Current calculated assembly."
      : "No current solution — review the calculation inputs.";
    selected = Math.min(selected, Math.max(0, (mesh?.parts.length || 1) - 1));
    if (!playing) $("bs3-depth").value = state.input.bitMD;
    $("bs3-play").disabled = !mesh || playing;
    $("bs3-tools").innerHTML = mesh
      ? mesh.parts
          .map(
            (p) =>
              `<button class="smallbutton" data-component="${p.index}" style="border-left:5px solid ${colours[p.index % colours.length]}">${p.index + 1} · ${esc(p.name)}</button>`,
          )
          .join("")
      : "";
    $("bs3-tools")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            selected = +b.dataset.component;
            draw();
          }),
      );
    draw();
  }
  function draw() {
    g.clearRect(0, 0, canvas.width, canvas.height);
    hits = [];
    if (!mesh) {
      g.fillStyle = "#526a7a";
      g.font = "18px Segoe UI";
      g.fillText(
        "Calculate a valid study to display the component mesh.",
        35,
        55,
      );
      $("bs3-legend").textContent = "No current calculated mesh";
      $("bs3-inspect").textContent = "";
      return;
    }
    const { input, result } = state,
      mag = +$("bs3-scale").value,
      viewLength = input.length * (travel ? 2 : 1),
      scale = (900 / viewLength) * zoom,
      cy = Math.cos(yaw),
      sy = Math.sin(yaw),
      cr = Math.cos(roll),
      sr = Math.sin(roll);
    const currentFrame = travel ? BhaSolidMesh.frame(input, input.bitMD) : null;
    const project = (p, inReference = false) => {
      if (travel && !inReference)
        p = BhaSolidMesh.local(
          travel.frame,
          BhaSolidMesh.world(currentFrame, p),
        );
      const x = p[0] - viewLength / 2,
        y = (cr * p[1] - sr * p[2]) * mag,
        z = (sr * p[1] + cr * p[2]) * mag;
      return [
        600 + (x * cy + z * sy) * scale,
        275 + y * scale,
        (-x * sy + z * cy) * scale,
      ];
    };
    const stroke = (points, color, width = 1) => {
      g.beginPath();
      points.forEach((p, i) =>
        i ? g.lineTo(...p.slice(0, 2)) : g.moveTo(...p.slice(0, 2)),
      );
      g.strokeStyle = color;
      g.lineWidth = width;
      g.stroke();
    };
    const fieldMax = Math.max(0, ...result.rows.map((r) => r.bendingPa));
    const faces = [];
    for (const part of mesh.parts)
      for (const f of part.faces) {
        const q = f.map((v) => project(v.p));
        faces.push({
          q,
          part,
          depth: q.reduce((s, v) => s + v[2], 0) / 3,
          value: f.reduce((s, v) => s + v.field.bendingPa, 0) / 3,
        });
      }
    // Back half of the bore shell: open towards the camera, leaving tools visible.
    if ($("bs3-hole").checked) {
      const boreRows = travel ? travel.rows : result.rows;
      for (let i = 1; i < boreRows.length; i++) {
        const a = boreRows[i - 1],
          b = boreRows[i];
        for (let j = 0; j < 12; j++) {
          const ring = (r, k) => {
            const t = (2 * Math.PI * k) / 12;
            if (travel) return project(r.ring[k % 12], true);
            return project([
              r.x,
              r.center[0] + (r.hole / 2) * Math.cos(t),
              r.center[1] + (r.hole / 2) * Math.sin(t),
            ]);
          };
          const q = [ring(a, j), ring(b, j), ring(b, j + 1), ring(a, j + 1)];
          const centre =
            (project(travel ? a.point : [a.x, ...a.center], !!travel)[2] +
              project(travel ? b.point : [b.x, ...b.center], !!travel)[2]) /
            2;
          if (q.reduce((s, v) => s + v[2], 0) / 4 > centre) continue;
          g.beginPath();
          q.forEach((v, k) =>
            k ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1]),
          );
          g.closePath();
          g.fillStyle = "rgba(127,155,170,.10)";
          g.fill();
          g.strokeStyle = "rgba(94,121,139,.25)";
          g.lineWidth = 0.6;
          g.stroke();
        }
      }
    }
    faces.sort((a, b) => a.depth - b.depth);
    for (const f of faces) {
      const q = f.q;
      g.beginPath();
      q.forEach((v, k) => (k ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1])));
      g.closePath();
      if ($("bs3-colour").value === "tools") {
        const u = q[1].map((v, i) => v - q[0][i]),
          v = q[2].map((v, i) => v - q[0][i]);
        const n = [
          u[1] * v[2] - u[2] * v[1],
          u[2] * v[0] - u[0] * v[2],
          u[0] * v[1] - u[1] * v[0],
        ];
        const light =
          0.55 +
          (0.45 *
            Math.abs(
              (n[0] * 0.25 - n[1] * 0.45 + n[2]) / (Math.hypot(...n) || 1),
            )) /
            1.125;
        const hex = colours[f.part.index % colours.length];
        g.fillStyle = `rgb(${[1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * light)).join(",")})`;
      } else {
        const t = fieldMax ? f.value / fieldMax : 0;
        g.fillStyle = `rgb(${Math.round(49 + 156 * t)},${Math.round(86 + 42 * t)},${Math.round(110 - 57 * t)})`;
      }
      g.fill();
      g.strokeStyle = $("bs3-mesh").checked
        ? "rgba(30,49,61,.45)"
        : g.fillStyle;
      g.lineWidth = 0.6;
      g.stroke();
      hits.push(f);
    }
    for (const p of mesh.parts) {
      const x = (p.start + p.end) / 2,
        r = BhaSolidMesh.at(result.rows, x),
        q = project([x, ...r.u]);
      g.fillStyle = "#233e50";
      g.font = "bold 14px Segoe UI";
      g.fillText(String(p.index + 1), q[0], Math.max(55, q[1] - 85));
      if (p.index === selected) {
        for (const ring of [p.rings[0], p.rings.at(-1)])
          stroke(
            [...ring, ring[0]].map((v) => project(v.p)),
            "#122d3d",
            2.2,
          );
      }
    }
    g.font = "14px Segoe UI";
    g.fillStyle = "#345268";
    g.fillText(`BIT · MD ${input.bitMD.toFixed(2)} m`, 30, 525);
    g.fillText(
      `TOP · MD ${(input.bitMD - input.length).toFixed(2)} m`,
      870,
      525,
    );
    const p = mesh.parts[selected],
      vals = result.rows
        .filter((r) => r.x >= p.start && r.x <= p.end)
        .map((r) => r.bendingPa);
    vals.push(
      BhaSolidMesh.at(result.rows, p.start).bendingPa,
      BhaSolidMesh.at(result.rows, p.end).bendingPa,
    );
    $("bs3-inspect").textContent =
      `${p.index + 1} · ${p.name} · length ${(p.end - p.start).toFixed(3)} m · body OD ${(p.od * 1000).toFixed(1)} mm · contact envelope ${(p.contactOD * 1000).toFixed(1)} mm · max sampled bending ${(Math.max(...vals) / 1e6).toFixed(3)} MPa`;
    $("bs3-legend").textContent =
      `${mesh.parts.length} components · ${mesh.beamNodes} solved beam nodes / ${mesh.beamElements} elements · ${mesh.triangles} display triangles (${mesh.sides} sectors) · transverse scale ${mag}× · ${$("bs3-colour").value === "tools" ? "component colours" : `bending magnitude 0–${(fieldMax / 1e6).toFixed(3)} MPa, no allowable limit`}`;
  }
  function move(md) {
    const ok = BhaStaticWorkspace.moveDepth(md);
    if (!ok)
      throw Error($("bs-error").textContent || "No valid static solution");
  }
  $("bs3-move").onclick = () => {
    stop();
    travel = null;
    try {
      const md = WellCore.number($("bs3-depth").value);
      move(md);
      $("bs3-status").textContent = `Recalculated at ${md.toFixed(2)} m MD.`;
    } catch (e) {
      $("bs3-status").textContent = e.message;
    }
  };
  $("bs3-play").onclick = () => {
    stop();
    try {
      const end = WellCore.number($("bs3-depth").value),
        span = state.input.length,
        start = end - span;
      if (start < state.input.length)
        throw Error("Sequence must leave the full BHA below surface.");
      const M = BhaSolidMesh,
        reference = M.frame(state.input, end);
      const rows = Array.from({ length: 49 }, (_, i) => {
        const md = end - (2 * span * i) / 48,
          f = M.frame(state.input, md),
          hole = state.input.sections.find((s) => md >= s.from && md <= s.to);
        if (!hole) throw Error("Architecture does not cover playback view");
        return {
          point: M.local(reference, f.origin),
          ring: Array.from({ length: 12 }, (_, j) =>
            M.local(
              reference,
              M.world(f, [
                0,
                (hole.diameter / 2) * Math.cos((2 * Math.PI * j) / 12),
                (hole.diameter / 2) * Math.sin((2 * Math.PI * j) / 12),
              ]),
            ),
          ),
        };
      });
      travel = { frame: reference, rows };
      let i = 0;
      playing = true;
      $("bs3-stop").disabled = false;
      $("bs3-play").disabled = true;
      const tick = () => {
        if (!playing) return;
        try {
          const md = start + (span * i) / 11;
          move(md);
          $("bs3-status").textContent =
            `Static position ${i + 1}/12 · bit MD ${md.toFixed(2)} m · recomputed contacts and bending`;
          i++;
          if (i < 12) timer = setTimeout(tick, 500);
          else {
            stop();
            $("bs3-depth").value = end;
          }
        } catch (e) {
          stop();
          $("bs3-status").textContent = "Sequence stopped: " + e.message;
        }
      };
      tick();
    } catch (e) {
      $("bs3-status").textContent = e.message;
    }
  };
  $("bs3-stop").onclick = () => {
    stop();
    $("bs3-depth").value = state.input.bitMD;
    $("bs3-status").textContent = "Stopped at current static position.";
  };
  for (const id of ["bs3-scale", "bs3-mesh", "bs3-hole", "bs3-colour"])
    $(id).onchange = draw;
  $("bs3-depth").oninput = () => {
    stop();
    $("bs3-status").textContent =
      "Depth changed — move and recalculate to apply.";
  };
  $("bs3-reset").onclick = () => {
    stop();
    travel = null;
    yaw = -0.24;
    roll = 0.62;
    zoom = 1;
    draw();
  };
  canvas.onpointerdown = (e) => {
    drag = { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = (e) => {
    if (drag) {
      yaw = Math.max(-1.3, Math.min(1.3, yaw + (e.clientX - drag.x) * 0.006));
      roll += (e.clientY - drag.y) * 0.009;
      drag.x = e.clientX;
      drag.y = e.clientY;
      draw();
    }
  };
  canvas.onpointerup = (e) => {
    if (
      drag &&
      Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 5
    ) {
      const rect = canvas.getBoundingClientRect(),
        p = [
          ((e.clientX - rect.left) * canvas.width) / rect.width,
          ((e.clientY - rect.top) * canvas.height) / rect.height,
        ];
      const cross = (a, b) =>
        (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      const face = [...hits].reverse().find((f) => {
        const c = f.q.map((q, i) => cross(q, f.q[(i + 1) % 3]));
        return c.every((v) => v >= 0) || c.every((v) => v <= 0);
      });
      if (face) {
        selected = face.part.index;
        draw();
      }
    }
    drag = null;
  };
  canvas.onpointercancel = () => (drag = null);
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoom = Math.max(0.5, Math.min(2.5, zoom * Math.exp(-e.deltaY * 0.001)));
      draw();
    },
    { passive: false },
  );
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  document.addEventListener(
    "click",
    (e) => {
      if (!e.target.closest("#bs3-panel")) {
        stop();
        travel = null;
      }
    },
    true,
  );
  window.addEventListener("bha-static-update", (e) => update(e.detail));
  window.BhaSolidWorkspace = {
    snapshot: () => ({
      triangles: mesh?.triangles || 0,
      components: mesh?.parts.length || 0,
      playing,
      yaw,
      roll,
      zoom,
      selected,
    }),
  };
  update();
  if (location.hash === "#bha-mesh") {
    document.querySelector('[data-page="bha-static"]').click();
    panel.scrollIntoView();
  }
})();
