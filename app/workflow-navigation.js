/* One navigation map, including direct entry to previously buried workspaces. */
(() => {
  const nav = document.getElementById("navigation"),
    buttons = new Map(
      [...nav.querySelectorAll("[data-page]")].map((b) => [b.dataset.page, b]),
    );
  const groups = [
    [
      "01 · PREPARE",
      [
        ["studies", "Study library"],
        ["dataqc", "Data & QC"],
        ["trajectory", "Trajectory & targets"],
        ["dp-lithology", "Lithology & formations", "drilling-program"],
      ],
    ],
    [
      "02 · DESIGN",
      [
        ["drilling-program", "Drilling programme"],
        ["bha", "BHA assembly"],
        ["bha-quick", "Quick BHA comparison", "bha"],
        ["bha-static", "Architecture & deformation"],
        ["string-in-hole", "String in hole · 3D", "bha-static"],
        ["sp-workspace", "Phase & placement", "bha-static"],
      ],
    ],
    [
      "03 · CALCULATE",
      [
        ["run-mechanics", "Torque, drag & pull"],
        ["sl-workspace", "Loads for 3D string", "bha-static"],
        ["sa-workspace", "Combined stress & limits", "bha-static"],
        ["directional", "Build / drop & DLS"],
      ],
    ],
    [
      "04 · DELIVER",
      [
        ["casebook", "Saved reports"],
        ["methodology", "Methods & report guide"],
      ],
    ],
  ];
  const theme = document.createElement("link");
  theme.rel = "stylesheet";
  theme.href = "terracotta.css";
  document.head.append(theme);
  nav.replaceChildren();
  function route(id, parent = id) {
    const original = buttons.get(parent);
    if (original) original.click();
    else WellApp.navigate(parent);
    const target = document.getElementById(id);
    target?.scrollIntoView({ block: "start" });
    history.replaceState(null, "", "#" + id);
    sync(id);
  }
  function sync(id) {
    nav.querySelectorAll("button").forEach((b) => {
      const active = (b.dataset.route || b.dataset.page) === id;
      b.classList.toggle("active", active);
      if (active) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
  }
  function item([id, label, parent], host) {
    let b = buttons.get(id);
    if (b) {
      b.textContent = label;
      b.addEventListener("click", () => {
        document.getElementById(id)?.scrollIntoView({ block: "start" });
        sync(id);
        history.replaceState(null, "", "#" + id);
      });
    } else {
      b = document.createElement("button");
      b.className = "nav";
      b.dataset.route = id;
      b.textContent = label;
      b.onclick = () => route(id, parent);
    }
    host.append(b);
    return b;
  }
  for (const [name, entries] of groups) {
    const title = document.createElement("div");
    title.className = "nav-heading";
    title.textContent = name;
    nav.append(title);
    entries.forEach((e) => item(e, nav));
  }
  const advanced = document.createElement("details");
  advanced.id = "advanced-navigation";
  advanced.innerHTML =
    "<summary>Additional & legacy tools</summary><p>Independent studies and reference tools. These do not inherit the 3D string automatically.</p>";
  nav.append(advanced);
  for (const [id, label] of [
    ["case-study", "T&D demonstration"],
    ["overview", "Well overview"],
    ["collision", "Anticollision"],
    ["study", "Current library study"],
    ["td", "Legacy axial screening"],
    ["dynamics", "Vibration reference"],
    ["operating-windows", "Independent operating envelope"],
    ["cuttings", "Cuttings analysis"],
    ["limits", "Manual limits register"],
    ["report", "Project report & sources"],
    ["science", "Help & science"],
  ])
    if (buttons.has(id)) item([id, label], advanced);
  // Keep any extension reachable without cluttering the main workflow.
  for (const [id, b] of buttons)
    if (!nav.contains(b)) {
      advanced.append(b);
      b.addEventListener("click", () => sync(id));
    }
  document.querySelectorAll("button").forEach((b) => {
    if (b.textContent === "Open operating windows →") b.remove();
  });
  // The assembly builder comes before the separate pre-design comparison.
  const quick = document.getElementById("bha-quick"),
    builder = document.querySelector(".bha-design-studio");
  if (quick && builder) quick.before(builder);
  const style = document.createElement("style");
  style.textContent = `#navigation .nav-heading{margin:14px 0 5px;padding:0 10px;font-size:10px}#navigation .nav{min-height:34px;padding:8px 10px;font-size:13px;line-height:1.3}#advanced-navigation{margin:18px 8px;color:#b4c4cd}#advanced-navigation summary{cursor:pointer;font-size:12px;padding:10px 0}#advanced-navigation p{font-size:11px;line-height:1.5}#advanced-navigation .nav{font-size:12px}.connected-assembly{display:block;width:100%;height:auto;max-width:500px;margin:auto}.connected-assembly [role=button]{cursor:pointer}.connected-assembly [role=button]:focus rect{stroke:#b77842;stroke-width:2}#connected-bha,#engineering-anatomy,#bq-anatomy{display:block!important;max-height:620px;overflow:auto;background:white;border:1px solid #dce3e7;border-radius:5px}#bq-anatomy > svg{width:100%!important;height:auto!important}#bha-quick .curve-basis{border-left:3px solid #b77842;padding:12px;background:#f5f2eb}.workflow-jumps{display:flex;flex-wrap:wrap;gap:6px;padding:10px 0;margin-bottom:12px}.workflow-jumps button{padding:8px 12px;border:1px solid #becbd1;background:white;color:#284654;border-radius:4px;cursor:pointer}`;
  document.head.append(style);
  for (const [page, links] of [
    [
      "bha",
      [
        ["bha-quick", "Quick comparison"],
        ["connected-bha", "Connected assembly"],
      ],
    ],
    [
      "bha-static",
      [
        ["string-in-hole", "Study & travel"],
        ["sd-workspace", "3D inspection"],
        ["sl-workspace", "Loads"],
        ["sa-workspace", "Stress & limits"],
        ["sp-workspace", "Phase comparison"],
      ],
    ],
  ]) {
    const bar = document.createElement("nav");
    bar.className = "workflow-jumps";
    bar.setAttribute("aria-label", "Workspace sections");
    links.forEach(([id, label]) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.onclick = () => route(id, page);
      bar.append(b);
    });
    document.getElementById(page).querySelector(".page-head")?.after(bar);
  }
  // Old bookmarks remain useful, including the independent envelope study.
  function deepLink() {
    const id = location.hash.slice(1),
      entry = groups.flatMap((g) => g[1]).find((e) => e[0] === id);
    if (entry) route(id, entry[2] || id);
    else if (["dp-context", "dp-settings", "dp-results"].includes(id))
      route(id, "drilling-program");
    else if (buttons.has(id)) {
      advanced.open = advanced.contains(buttons.get(id));
      route(id);
    }
  }
  window.addEventListener("hashchange", deepLink);
  if (location.hash) deepLink();
  else sync(document.querySelector(".page.active")?.id);
})();
