/* Compact summaries keep interchange JSON in an optional disclosure. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const style = document.createElement("style");
  style.textContent =
    ".workform select{background:#0b1e2d;color:#d4e6ef;border:1px solid #355269;border-radius:6px;padding:10px;min-height:38px}.page>.panel{margin-bottom:18px}details{margin:12px 0;color:#aac5d4}summary{cursor:pointer;padding:8px 0}.evidence-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:14px 0}.evidence-summary>div{padding:14px;background:#102838;border:1px solid #315269;border-radius:8px;overflow-wrap:anywhere}.evidence-summary b{display:block;color:#dff4f2;margin-bottom:7px}.evidence-summary small{color:#a7c4d3;line-height:1.5}.report-figure img{max-width:100%;height:auto}.report-figure{break-inside:avoid}@media print{.workresult{color:#111!important}.evidence-summary>div{background:white;color:#111}.evidence-summary b,.evidence-summary small{color:#111}details{display:block}details>*{display:block!important}}";
  document.head.append(style);
  function cards(host, items) {
    host.replaceChildren();
    for (const [label, value] of items) {
      const box = document.createElement("div"),
        b = document.createElement("b"),
        small = document.createElement("small");
      b.textContent = label;
      small.textContent = value ?? "NOT COMPUTED";
      box.append(b, small);
      host.append(box);
    }
  }
  function disclose(id, label, summaryFn) {
    const node = $(id+"-engineering")?.querySelector("svg") || $(id);
    if (!node) return;
    const details = document.createElement("details"),
      title = document.createElement("summary");
    title.textContent = label;
    node.before(details);
    details.append(title, node);
    if (summaryFn) {
      const summary = document.createElement("div");
      summary.className = "evidence-summary";
      details.before(summary);
      const update = () => {
        try {
          cards(summary, summaryFn(JSON.parse(node.textContent)));
        } catch {
          cards(summary, [["Status", node.textContent]]);
        }
      };
      new MutationObserver(update).observe(node, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      update();
    }
  }
  disclose("psd-result", "Full sample calculation and provenance", (r) =>
    r.rows
      ? [
          [
            "D10",
            r.D10_mm == null ? "NOT ESTIMABLE" : r.D10_mm.toFixed(3) + " mm",
          ],
          [
            "D50",
            r.D50_mm == null ? "NOT ESTIMABLE" : r.D50_mm.toFixed(3) + " mm",
          ],
          [
            "D90",
            r.D90_mm == null ? "NOT ESTIMABLE" : r.D90_mm.toFixed(3) + " mm",
          ],
          ["Recovered dry mass", r.total_mass_kg + " kg"],
          ["Source MD interval", r.interval?.join("–") + " m"],
          ["Lag uncertainty", r.lag_uncertainty],
          ["Interpretation", r.warning],
        ]
      : [
          ["Status", r.status],
          ["Reason", r.reason],
        ],
  );
  disclose("directional-result", "Full directional case calculation", (r) => [
    ["Model", r.status],
    [
      "Hole overgauge",
      r.overgauge_m == null
        ? "NOT COMPUTED"
        : (r.overgauge_m * 1000).toFixed(2) + " mm",
    ],
    ["Pad geometry", r.pad_contact],
    ["Predictive BUR / TUR", "NOT COMPUTED"],
    ["Source", r.source || r.reason],
  ]);
  disclose("limit-catalog", "Rule revision history (JSON)", (rows) =>
    rows.length
      ? rows
          .filter((r) => r.active)
          .map((r) => [
            r.id + " · rev " + r.revision,
            `${r.metric} ${r.operator} ${r.warning} ${r.unit} · ${r.source}`,
          ])
      : [["Rules", "NOT CONFIGURED"]],
  );
  disclose("event-inspector", "Full event provenance and checks", (e) => [
    ["Comparison", e.status],
    ["Selected location", `${e.wellbore} / ${e.md} mMD`],
    ["Rule", `${e.limit_id} revision ${e.limit_revision}`],
    ["Evidence", `${e.data} / ${e.model} / ${e.review}`],
    ["Source", e.source],
    ["Interpretation", e.explanation],
    ["Checks", (e.checks || []).join("; ")],
  ]);
  disclose("motor-result", "Full motor estimate provenance", (r) => [
    ["Result", r.status],
    [
      "Shaft speed",
      r.shaft_rpm == null ? "NOT COMPUTED" : r.shaft_rpm.toFixed(1) + " rpm",
    ],
    ["Source / domain", r.reason || r.source],
  ]);
  disclose("directional-json", "Advanced directional case JSON");
  disclose("psd-json", "Advanced sample JSON");
  const reportButton = $("build-report-v4");
  reportButton.addEventListener("click", () => {
    let host = $("report-figures");
    if (!host) {
      host = document.createElement("article");
      host.id = "report-figures";
      host.className = "panel";
      $("report").append(host);
    }
    host.replaceChildren();
    for (const [id, label] of [
      ["scene", "Selected well geometry"],
      ["tdplot", "Axial force screening"],
      ["psd-chart", "Cuttings cumulative distribution"],
    ]) {
      const figure = document.createElement("figure");
      figure.className = "report-figure";
      const caption = document.createElement("figcaption");
      caption.textContent = label + " — preliminary / source-labelled data";
      const image = document.createElement("img");
      image.alt = label;
      const node = $(id+"-engineering")?.querySelector("svg") || $(id);
      image.src =
        node.tagName.toLowerCase() === "canvas"
          ? node.toDataURL("image/png")
          : "data:image/svg+xml;charset=utf-8," +
            encodeURIComponent(new XMLSerializer().serializeToString(node));
      figure.append(caption, image);
      host.append(figure);
    }
  });
})();
