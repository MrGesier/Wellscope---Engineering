(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    api = WellEvidence;
  const form = $("lim-component").closest(".workform");
  for (const [id, label, type] of [
    ["lim-duration", "Observed persistence (s, optional)", "number"],
    ["lim-gap", "Maximum sample gap (s)", "number"],
    ["lim-valid-from", "Valid from UTC (ISO + Z)", "text"],
    ["lim-valid-to", "Valid to UTC (ISO + Z)", "text"],
  ]) {
    const l = document.createElement("label"),
      input = document.createElement("input");
    l.textContent = label;
    input.id = id;
    input.type = type;
    input.step = "any";
    l.append(input);
    form.append(l);
  }
  const sliderLabel = document.createElement("label"),
    slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "1000";
  slider.step = "any";
  slider.disabled = true;
  sliderLabel.textContent =
    "Warning threshold adjustment (same units; numeric field is authoritative)";
  sliderLabel.append(slider);
  form.append(sliderLabel);
  $("lim-warn").addEventListener("input", () => {
    slider.disabled = $("lim-warn").value === "";
    if (!slider.disabled) {
      const v = Number($("lim-warn").value);
      slider.min = String(Math.min(0, v * 2));
      slider.max = String(Math.max(1, Math.abs(v) * 2));
      slider.value = String(v);
    }
  });
  slider.oninput = () => {
    $("lim-warn").value = slider.value;
  };
  const baseSave = $("save-limit").onclick;
  $("save-limit").onclick = async () => {
    const duration = $("lim-duration").value,
      gap = $("lim-gap").value;
    try {
      if (
        duration !== "" &&
        (+duration < 0 || (+duration > 0 && (gap === "" || +gap <= 0)))
      )
        throw Error("Persistence needs a positive maximum sample gap");
      for (const id of ["lim-valid-from", "lim-valid-to"])
        if (
          $(id).value &&
          (!$(id).value.endsWith("Z") ||
            !Number.isFinite(Date.parse($(id).value)))
        )
          throw Error(
            "Time validity requires an ISO UTC timestamp ending in Z",
          );
      if (
        $("lim-valid-from").value &&
        $("lim-valid-to").value &&
        Date.parse($("lim-valid-from").value) >
          Date.parse($("lim-valid-to").value)
      )
        throw Error("Time validity interval reversed");
      const before = api.project().limits.length;
      await baseSave();
      if (api.project().limits.length > before) {
        Object.assign(api.project().limits.at(-1), {
          persistence_seconds: duration === "" ? 0 : Number(duration),
          max_sample_gap_seconds: gap === "" ? null : Number(gap),
          valid_from_utc: $("lim-valid-from").value || null,
          valid_to_utc: $("lim-valid-to").value || null,
        });
        $("limit-catalog").textContent = JSON.stringify(
          api.project().limits,
          null,
          2,
        );
      }
    } catch (e) {
      $("work-error").textContent = e.message;
    }
  };
  function annotate() {
    for (const label of document.querySelectorAll(".workform label")) {
      if (label.querySelector(".help-trigger")) continue;
      const input = label.querySelector("input,select");
      if (!input) continue;
      const text = label.childNodes[0]?.textContent.trim() || input.id;
      const help = `${text}. Use the stated unit and declared reference. Expected source: a source-labelled project record, measurement or equipment document. Missing numeric fields remain unknown; invalid ranges or incompatible units block evaluation. Geometry and screening methods are documented in Help & Science. No approval or operating recommendation is implied.`;
      const tip = document.createElement("span");
      tip.className = "help-trigger";
      tip.tabIndex = 0;
      tip.setAttribute("role", "button");
      tip.setAttribute("aria-label", "Explain: " + text);
      tip.dataset.help = help;
      tip.textContent = "i";
      label.insertBefore(tip, input);
      input.setAttribute("aria-description", help);
    }
  }
  function status() {
    for (const article of document.querySelectorAll(".kpis article")) {
      let footer = article.querySelector(".variable-status");
      if (!footer) {
        footer = document.createElement("small");
        footer.className = "variable-status";
        footer.style.cssText =
          "display:block;white-space:normal;line-height:1.7;font-size:9px;margin-top:9px";
        article.append(footer);
      }
      footer.textContent = `${api.project().mode === "SYNTHETIC" ? "SYNTHETIC" : "IMPORTED_UNCHECKED"} · PRELIMINARY_UNVERIFIED · ${api.project().limits.length ? "see scoped limit evaluation" : "NOT_CONFIGURED"} · DRAFT`;
    }
  }
  annotate();
  status();
  window.addEventListener("wellscope:change", () => {
    annotate();
    status();
  });
})();
