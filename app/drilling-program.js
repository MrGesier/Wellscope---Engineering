/* Sourced interval envelopes, not a rock/bit optimizer or well-control solver. */
(function (root) {
  const E = root.WellEngine || require("./engine"),
    C = root.WellCore || require("./core"),
    Q = root.BhaQuick || require("./bha-quick"),
    D = root.DirectionalResponse || require("./directional-response");
  const G = 9.80665,
    clone = (x) => JSON.parse(JSON.stringify(x));
  const fields = {
    wobTf: ["WOB target", "tf"],
    rpm: ["Rotary speed", "rpm"],
    ropMph: ["ROP target", "m/h"],
    flowLpm: ["Flow", "L/min"],
    pickupTf: ["Pickup · off-bottom", "tf"],
    slackoffTf: ["Slackoff · off-bottom", "tf"],
    torqueTfm: ["Rotating torque · off-bottom", "tf.m"],
    sppBar: ["Standpipe pressure", "bar"],
    bottomBar: ["Circulating bottom pressure", "bar"],
    dls: ["DLS", "°/30 m"],
    build: ["Signed build", "°/30 m"],
  };
  function number(v, label, min = 0) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < min)
      throw Error(label + " must be a finite number ≥ " + min);
    return v;
  }
  function validateIntervals(rows) {
    if (!Array.isArray(rows) || !rows.length || rows.length > 200)
      throw Error("Supply 1–200 lithology intervals");
    let last = -Infinity;
    for (const r of rows) {
      number(r.from, "Interval start");
      number(r.to, "Interval end");
      if (r.to <= r.from || r.from < last)
        throw Error(
          "Intervals must be ordered, non-overlapping and have positive length",
        );
      if (
        typeof r.lithology !== "string" ||
        !r.lithology.trim() ||
        typeof r.source !== "string" ||
        !r.source.trim()
      )
        throw Error("Each interval needs lithology and source");
      last = r.to;
      if (r.limits) {
        if (!r.limits.source?.trim())
          throw Error("Limits need a source / revision");
        for (const [k, b] of Object.entries(r.limits)) {
          if (k === "source") continue;
          if (!fields[k] || !b || typeof b !== "object")
            throw Error("Unknown limit " + k);
          for (const side of ["min", "max"])
            if (b[side] != null)
              number(b[side], k + " " + side, k === "build" ? -Infinity : 0);
          if (b.min != null && b.max != null && b.min > b.max)
            throw Error(k + " minimum exceeds maximum");
        }
      }
    }
    return rows;
  }
  function csv(text) {
    const rows = C.csv(text);
    if (!rows.length) throw Error("Empty CSV");
    if (
      rows.some(
        (r) =>
          !["from_m", "to_m", "lithology", "source"].every(
            (k) => typeof r[k] === "string" && r[k].trim(),
          ),
      )
    )
      throw Error(
        "Lithology CSV requires nonblank from_m,to_m,lithology,source cells",
      );
    return validateIntervals(
      rows.map((r) => ({
        from: Number(r.from_m),
        to: Number(r.to_m),
        lithology: r.lithology,
        source: r.source,
      })),
    );
  }
  function las(text, curve, mapping, source) {
    if (!source?.trim()) throw Error("LAS source required");
    let section = "",
      version = null,
      wrap = null,
      unit = null,
      nullValue = -999.25,
      curves = [],
      samples = [];
    for (const line of text.split(/\r?\n/)) {
      const s = line.trim();
      if (!s || s.startsWith("#")) continue;
      if (s.startsWith("~")) {
        section = s[1].toUpperCase();
        continue;
      }
      if (section === "V") {
        if (/^VERS\./i.test(s))
          version = Number(s.split(":")[0].split(/\s+/)[1]);
        if (/^WRAP\./i.test(s))
          wrap = s.split(":")[0].split(/\s+/)[1]?.toUpperCase();
      } else if (section === "W" && /^NULL\./i.test(s))
        nullValue = Number(s.split(":")[0].split(/\s+/)[1]);
      else if (section === "C") {
        const m = s.match(/^([^\s.]+)\.([^\s]*)/);
        if (m) {
          curves.push(m[1].toUpperCase());
          if (curves.length === 1) unit = m[2].toUpperCase();
        }
      } else if (section === "A") {
        const values = s.split(/\s+/).map(Number);
        if (
          values.length !== curves.length ||
          values.some((v) => !Number.isFinite(v))
        )
          throw Error("Malformed LAS data row");
        samples.push(values);
      }
    }
    if (version !== 2 || wrap !== "NO")
      throw Error(
        "Supported LAS subset: version 2.0, WRAP.NO only. Export other formats to interval CSV.",
      );
    if (
      !["DEPT", "DEPTH"].includes(curves[0]) ||
      !["M", "FT", "F"].includes(unit)
    )
      throw Error("LAS first curve must be measured depth in M or FT");
    const k = curves.indexOf(String(curve).toUpperCase());
    if (k < 1)
      throw Error(
        "Choose an explicit lithology/facies code curve; gamma ray is not converted to lithology",
      );
    if (samples.length < 2 || samples.length > 20000)
      throw Error("LAS needs 2–20000 samples");
    const scale = unit === "M" ? 1 : 0.3048;
    for (let i = 1; i < samples.length; i++)
      if (samples[i][0] <= samples[i - 1][0])
        throw Error("LAS measured depths must increase");
    const out = [];
    for (let i = 0; i < samples.length - 1; i++) {
      const code = samples[i][k];
      if (code === nullValue) continue;
      const name = mapping[String(code)];
      if (typeof name !== "string" || !name.trim())
        throw Error("Missing explicit lithology mapping for code " + code);
      const from = samples[i][0] * scale,
        to = samples[i + 1][0] * scale,
        prev = out.at(-1);
      if (prev && prev.to === from && prev.lithology === name) prev.to = to;
      else out.push({ from, to, lithology: name, source });
    }
    return validateIntervals(out);
  }
  function intervalAt(rows, md) {
    return rows.find(
      (r, i) =>
        md >= r.from && (md < r.to || (i === rows.length - 1 && md === r.to)),
    );
  }
  function validate(p) {
    if (p.schema !== "wellscope-drilling-program/1")
      throw Error("Unsupported programme schema");
    if (!["SYNTHETIC", "USER_ENTERED"].includes(p.quality))
      throw Error("Declare data quality");
    if (!p.name?.trim()) throw Error("Programme name required");
    validateIntervals(p.intervals);
    if (
      p.required &&
      (!Array.isArray(p.required) ||
        p.required.some((k) => !["gamma", "mwd", "lwd", "rss"].includes(k)))
    )
      throw Error("Unknown required capability");
    const st = E.survey(p.study.survey),
      end = Math.min(
        st.at(-1).md,
        p.study.sections.at(-1).to,
        p.study.components.reduce((s, b) => s + b.length, 0),
      );
    if (p.intervals.at(-1).to > end)
      throw Error("Lithology exceeds survey, architecture or tally coverage");
    for (const r of p.intervals) {
      const a = { ...p.plan, ...r.plan };
      for (const k of ["wobTf", "rpm", "ropMph", "flowLpm", "mudKgM3"])
        number(a[k], k);
      if (a.mudKgM3 <= 0 || a.mudKgM3 > 3000)
        throw Error("Mud density outside supported range");
      if (r.hydraulics) hydraulic(r.hydraulics, r.from, a);
      if (r.response) D.validate(r.response.surface);
    }
    return st;
  }
  function hydraulic(h, md, plan) {
    if (!h) return { status: "MISSING_PROFILE" };
    if (!h.source?.trim()) throw Error("Hydraulic source required");
    number(h.flowLpm, "Hydraulic profile flow");
    number(h.mudKgM3, "Hydraulic profile density");
    if (h.mudKgM3 <= 0)
      throw Error("Hydraulic profile density must be positive");
    if (!Array.isArray(h.rows) || h.rows.length < 2)
      throw Error("Hydraulics needs at least two depth stations");
    let last = -Infinity;
    for (const r of h.rows) {
      number(r.md, "Hydraulic MD");
      number(r.sppBar, "SPP");
      number(r.annularBar, "Annular loss");
      if (r.md <= last) throw Error("Hydraulic MD must increase");
      if (r.annularBar > r.sppBar)
        throw Error(
          "Annular loss exceeds SPP: check the common surface pressure basis",
        );
      last = r.md;
    }
    if (h.flowLpm !== plan.flowLpm || h.mudKgM3 !== plan.mudKgM3)
      return { status: "CONDITIONS_MISMATCH" };
    if (md < h.rows[0].md || md > h.rows.at(-1).md)
      return { status: "OUTSIDE_PROFILE" };
    const b = h.rows.find((r) => r.md >= md),
      i = h.rows.indexOf(b),
      a = h.rows[Math.max(0, i - 1)],
      f = a.md === b.md ? 0 : (md - a.md) / (b.md - a.md);
    return {
      status: "SOURCE_INTERPOLATION",
      source: h.source,
      sppBar: a.sppBar + f * (b.sppBar - a.sppBar),
      annularBar: a.annularBar + f * (b.annularBar - a.annularBar),
    };
  }
  function assess(value, bounds) {
    if (value == null || !Number.isFinite(value))
      return { status: "NOT_CALCULATED" };
    if (!bounds || (bounds.min == null && bounds.max == null))
      return { status: "NO_LIMIT" };
    if (bounds.min != null && value < bounds.min)
      return { status: "EXCEEDED", margin: value - bounds.min };
    if (bounds.max != null && value > bounds.max)
      return { status: "EXCEEDED", margin: bounds.max - value };
    return {
      status:
        bounds.min == null || bounds.max == null
          ? "WITHIN_ENTERED_BOUND"
          : "WITHIN_ENTERED_BOUNDS",
      margin: Math.min(
        bounds.min == null ? Infinity : value - bounds.min,
        bounds.max == null ? Infinity : bounds.max - value,
      ),
    };
  }
  function sample(p, r, md, st) {
    const plan = { ...p.plan, ...r.plan },
      point = E.interp(st, md),
      row = {
        md,
        lithology: r.lithology,
        source: r.source,
        values: Object.fromEntries(
          ["wobTf", "rpm", "ropMph", "flowLpm", "mudKgM3"].map((k) => [
            k,
            plan[k],
          ]),
        ),
        checks: {},
        notes: [],
      };
    row.missingCapabilities = Q.requirements(p.study, p.required || []);
    const h = hydraulic(r.hydraulics, md, plan);
    row.hydraulics = h;
    row.hydrostaticBar = (plan.mudKgM3 * G * point.tvd) / 1e5;
    if (h.status === "SOURCE_INTERPOLATION") {
      row.values.sppBar = h.sppBar;
      row.values.bottomBar = row.hydrostaticBar + h.annularBar;
      row.ecdKgM3 =
        point.tvd > 0
          ? plan.mudKgM3 + (h.annularBar * 1e5) / (G * point.tvd)
          : null;
    } else row.notes.push("Hydraulics: " + h.status);
    if (md > 0) {
      const q = clone(p.study);
      q.rho = plan.mudKgM3;
      if (q.axial) q.axial.rpm = plan.rpm;
      const loads = Q.loads(q, md);
      row.loads = loads;
      if (loads.status === "CALCULATED") {
        row.values.pickupTf = loads.pickup.hookN / 9806.65;
        row.values.slackoffTf = loads.slackoff.hookN / 9806.65;
        if (loads.rotating)
          row.values.torqueTfm = loads.rotating.torqueNm / 9806.65;
      } else row.notes.push("Loads: " + (loads.error || loads.status));
    }
    if (r.response) {
      const d = r.response;
      if (
        Q.identity(d.study) !== Q.identity(p.study) ||
        d.flowLpm !== plan.flowLpm ||
        d.mudKgM3 !== plan.mudKgM3 ||
        d.rpm !== plan.rpm
      )
        row.notes.push("Directional response conditions/BHA mismatch");
      else {
        try {
          const settings = {
            ...d.settings,
            wobN: plan.wobTf * 9806.65,
            inclination: point.inc,
          };
          const result = D.response(d.surface, settings);
          row.values.build = result.build;
          row.values.dls = result.dls;
          row.directionalQuality = result.quality;
        } catch (e) {
          row.notes.push("Directional: " + e.message);
        }
      }
    } else
      row.notes.push(
        "Directional response missing; no lithology/SPP-to-drop law assumed",
      );
    for (const k of Object.keys(fields))
      row.checks[k] = assess(row.values[k], r.limits?.[k]);
    row.status = Object.values(row.checks).some((x) => x.status === "EXCEEDED")
      ? "EXCEEDED"
      : Object.values(row.checks).some((x) =>
            ["NOT_CALCULATED", "NO_LIMIT"].includes(x.status),
          )
        ? "INCOMPLETE"
        : "WITHIN_ENTERED_BOUNDS";
    row.loadLimitExceeded =
      !!row.loads &&
      ["pickup", "slackoff", "rotating"].some(
        (k) => row.loads[k]?.status === "EXCEEDED",
      );
    if (row.loadLimitExceeded) row.status = "EXCEEDED";
    if (row.missingCapabilities.length && row.status !== "EXCEEDED")
      row.status = "INCOMPLETE";
    return row;
  }
  function stations(p) {
    validate(p);
    return p.intervals.map((r) =>
      Array.from({ length: 5 }, (_, i) => r.from + ((r.to - r.from) * i) / 4),
    );
  }
  function demo(study) {
    const end = Math.min(study.bitMD, study.survey.at(-1).md),
      start = Math.max(1, end - 600),
      span = (end - start) / 3;
    const intervals = ["Sandstone", "Shale", "Limestone"].map(
      (lithology, i) => {
        const from = start + span * i,
          to = i === 2 ? end : start + span * (i + 1);
        return {
          from,
          to,
          lithology,
          source: "SYNTHETIC lithology for training",
          plan: { ropMph: [18, 12, 8][i] },
          response: {
            study: clone(study),
            flowLpm: 1200,
            mudKgM3: 1200,
            rpm: 100,
            surface: {
              ...D.demo(),
              source:
                "SYNTHETIC teaching response, identical in every formation; not rock-calibrated",
            },
            settings: { mode: "rss", activation: 0.5, toolface: 0 },
          },
          limits: {
            source:
              "SYNTHETIC illustrative bounds — not formation/OEM recommendations",
            wobTf: { min: 3, max: 12 },
            rpm: { min: 60, max: 130 },
            ropMph: { max: [16, 15, 10][i] },
            flowLpm: { min: 1000, max: 1500 },
            pickupTf: { max: 150 },
            slackoffTf: { min: 30 },
            torqueTfm: { max: 3 },
            sppBar: { max: 250 },
            bottomBar: { min: 200, max: 400 },
            dls: { max: 4 },
            build: { min: -3, max: 3 },
          },
          hydraulics: {
            source: "SYNTHETIC depth profile; no mud rheology prediction",
            flowLpm: 1200,
            mudKgM3: 1200,
            rows: [
              { md: from, sppBar: 170 + i * 10, annularBar: 8 + i * 2 },
              { md: to, sppBar: 180 + i * 10, annularBar: 10 + i * 2 },
            ],
          },
        };
      },
    );
    return {
      schema: "wellscope-drilling-program/1",
      quality: "SYNTHETIC",
      name: "Lithosphere · training programme",
      study: clone(study),
      plan: { wobTf: 8, rpm: 100, ropMph: 12, flowLpm: 1200, mudKgM3: 1200 },
      intervals,
    };
  }
  const api = {
    fields,
    validateIntervals,
    csv,
    las,
    intervalAt,
    validate,
    hydraulic,
    assess,
    sample,
    stations,
    demo,
  };
  root.DrillingProgram = api;
  if (typeof module === "object") module.exports = api;
})(globalThis);
