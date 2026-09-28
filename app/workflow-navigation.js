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
    const title = document
      .getElementById(parent)
      ?.querySelector("h1")?.textContent;
    if (title)
      document.getElementById("crumb").textContent = title.toUpperCase();
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
