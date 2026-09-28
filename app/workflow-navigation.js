/* One navigation map, including direct entry to previously buried workspaces. */
(() => {
  const nav = document.getElementById("navigation"),
    buttons = new Map(
      [...nav.querySelectorAll("[data-page]")].map((b) => [b.dataset.page, b]),
    );
  const groups = [
    [
      "WORKSPACE",
      [
        ["well-setup", "1 · Prepare the well"],
        ["well-dashboard", "2 · Section dashboard"],

        ["bha", "Build BHA"],
        ["string-in-hole", "Contacts & movement", "bha-static"],
        ["run-mechanics", "Torque & drag"],
        ["casebook", "Saved reports"],
      ],
    ],
  ];
  const theme = document.createElement("link");
  theme.rel = "stylesheet";
  theme.href = "terracotta.css";
  document.head.append(theme);
  nav.replaceChildren();
  function route(id, parent) {
    if (id === "well-setup") window.WellFlow?.syncSetup();
    parent ||= document.getElementById(id)?.closest(".page")?.id || id;
    const original = buttons.get(parent);
    if (original) original.click();
    else WellApp.navigate(parent);
    const target = document.getElementById(id);
    let ancestor = target?.parentElement;
    while (ancestor) {
      if (ancestor.matches("details")) ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
    target?.scrollIntoView({ block: "start" });
    history.replaceState(null, "", "#" + id);
    sync(id);
  }
  function sync(id) {
    nav.querySelectorAll("button").forEach((b) => {
      const section = document.getElementById(id)?.closest(".page")?.id;
      const main = section === "bha-static" ? "string-in-hole" : section;
      const active = (b.dataset.route || b.dataset.page) === (main || id);
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
  // Retired modules retain their inputs and old bookmarks, but are no longer menu choices.
  const retired = document.createElement("div");
  retired.id = "retired-navigation";
  retired.hidden = true;
  document.body.append(retired);
  for (const [id, b] of buttons) if (!nav.contains(b)) retired.append(b);
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
        ["bha-quick", "Compare BHA alternatives"],
        ["directional", "Build / drop curves"],
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
      b.dataset.route = id;
      b.onclick = () => route(id);
      bar.append(b);
    });
    document.getElementById(page).querySelector(".page-head")?.after(bar);
  }
  function fold(element, label) {
    if (!element) return;
    const box = document.createElement("details");
    box.className = "workflow-fold";
    const summary = document.createElement("summary");
    summary.textContent = label;
    box.append(summary);
    element.before(box);
    box.append(element);
  }
  fold(quick, "Compare BHA alternatives");
  for (const id of [
    "sd-workspace",
    "sl-workspace",
    "sa-workspace",
    "sp-workspace",
  ]) {
    const el = document.getElementById(id);
    fold(el, el?.querySelector("h2")?.textContent || "Study settings");
  }
  document
    .querySelectorAll("#bha-static > .panel, #bha-static > .twocol")
    .forEach((el) => {
      if (el.id !== "string-in-hole")
        fold(
          el,
          el.querySelector("h2")?.textContent ||
            "Local bending model · additional inputs",
        );
    });
  document.querySelectorAll("#string-in-hole > button").forEach((b) => {
    if (b.textContent.includes("BHA pre-design"))
      b.onclick = () => route("bha-quick");
  });
  const scope = document.createElement("p");
  scope.className = "workflow-scope";
  scope.textContent =
    "Preliminary calculations · use sourced inputs. The prepared well feeds the dashboard and 3D inspection; other workspaces use explicit imports.";
  document.querySelector(".content > .notice")?.replaceWith(scope);
  const axes = document.getElementById("evidence-axes");
  if (axes) {
    document.getElementById("report").append(axes);
    fold(axes, "Project record");
  }
  window.WellWorkflow = { open: route };
  // Old bookmarks remain useful, including the independent envelope study.
  function deepLink() {
    const id = location.hash.slice(1),
      entry = groups.flatMap((g) => g[1]).find((e) => e[0] === id);
    if (entry) route(id, entry[2]);
    else if (
      ["dp-context", "dp-lithology", "dp-settings", "dp-results"].includes(id)
    )
      route(id, "drilling-program");
    else if (document.getElementById(id)?.closest(".page")) {
      route(id);
    }
  }
  window.addEventListener("hashchange", deepLink);
  if (location.hash) deepLink();
  else route("well-setup");
})();
