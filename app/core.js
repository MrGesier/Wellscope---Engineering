/* Independent SI geometry and evidence utilities. No operational approvals. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object") module.exports = api;
  root.WellCore = api;
})(globalThis, function () {
  "use strict";
  const version = "0.4.2";
  const status = {
    data: [
      "SYNTHETIC",
      "IMPORTED_UNCHECKED",
      "USER_ENTERED",
      "MEASURED_QC_PASS",
      "MEASURED_QC_FAIL",
      "MISSING",
    ],
    model: [
      "NOT_COMPUTED",
      "ILLUSTRATIVE",
      "PRELIMINARY_UNVERIFIED",
      "BENCHMARKED",
      "FIELD_VALIDATED",
    ],
    limit: [
      "NOT_CONFIGURED",
      "NOT_EVALUABLE",
      "WITHIN_USER_LIMIT",
      "WARNING",
      "EXCEEDED",
    ],
    review: ["DRAFT", "REVIEWED", "REJECTED", "SUPERSEDED"],
  };
  function number(v, label = "Value") {
    if (
      !["number", "string"].includes(typeof v) ||
      v === null ||
      v === undefined ||
      typeof v === "boolean" ||
      String(v).trim() === ""
    )
      throw Error(label + " is missing");
    const n = Number(v);
    if (!Number.isFinite(n)) throw Error(label + " must be finite");
    return n;
  }
  const units = {
    m: ["length", 1],
    ft: ["length", 0.3048],
    in: ["length", 0.0254],
    mm: ["length", 0.001],
    N: ["force", 1],
    kN: ["force", 1000],
    tf: ["force", 9806.65],
    lbf: ["force", 4.4482216152605],
    klbf: ["force", 4448.2216152605],
    kg: ["mass", 1],
    t: ["mass", 1000],
    lb: ["mass", 0.45359237],
    g: ["mass", 0.001],
    deg: ["angle", 1],
    rpm: ["speed", 1],
    "m3/s": ["flow", 1],
    "L/min": ["flow", 1 / 60000],
    "US gal/min": ["flow", 0.003785411784 / 60],
    Pa: ["pressure", 1],
    bar: ["pressure", 1e5],
    psi: ["pressure", 6894.757293168],
    MPa: ["pressure", 1e6],
    "N.m": ["torque", 1],
    "kN.m": ["torque", 1000],
    "tf.m": ["torque", 9806.65],
    "lbf.ft": ["torque", 1.3558179483314004],
    "klbf.ft": ["torque", 1355.8179483314004],
    "kg/m3": ["density", 1],
    sg: ["density", 1000],
    ppg: ["density", 119.826427316],
    "kg/m": ["linear_mass", 1],
    "lb/ft": ["linear_mass", 0.45359237 / 0.3048],
    "deg/30m": ["dogleg", 1],
    "m/h": ["rop", 1],
    "ft/h": ["rop", 0.3048],
    percent: ["fraction", 0.01],
  };
  function convert(v, from, to) {
    if (!units[from] || !units[to] || units[from][0] !== units[to][0])
      throw Error("Incompatible units: " + from + " / " + to);
    return (number(v) * units[from][1]) / units[to][1];
  }
  const referenceKeys = [
    "coordinate_system",
    "datum",
    "vertical_reference",
    "azimuth_reference",
    "length_unit",
  ];
  function compatible(a, b) {
    return (
      !!a &&
      !!b &&
      referenceKeys.every(
        (k) => typeof a[k] === "string" && a[k].length && a[k] === b[k],
      ) &&
      ["LOCAL_NE_TVD", "PROJECTED_NE_TVD"].includes(a.coordinate_system) &&
      a.length_unit === "m" &&
      [
        "epsg",
        "origin_N",
        "origin_E",
        "origin_z",
        "grid_convergence",
        "magnetic_declination",
      ].every((k) => a[k] === b[k])
    );
  }
  const sub = (a, b) => a.map((v, i) => v - b[i]),
    dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
    xyz = (p) => [number(p.n), number(p.e), number(p.tvd)],
    clamp = (x) => Math.max(0, Math.min(1, x));
  function point(a, b, t) {
    return Object.fromEntries(
      ["n", "e", "tvd", "md"].map((k) => [
        k,
        number(a[k]) + t * (number(b[k]) - number(a[k])),
      ]),
    );
  }
  // Closest points on finite segments; includes parallel and degenerate segments.
  function segmentPair(a, b, c, d) {
    const u = sub(xyz(b), xyz(a)),
      v = sub(xyz(d), xyz(c)),
      w = sub(xyz(a), xyz(c)),
      A = dot(u, u),
      B = dot(u, v),
      C = dot(v, v),
      D = dot(u, w),
      F = dot(v, w);
    let s = 0,
      t = 0;
    if (A <= 1e-24 && C <= 1e-24) {
    } else if (A <= 1e-24) t = clamp(F / C);
    else if (C <= 1e-24) s = clamp(-D / A);
    else {
      const det = A * C - B * B;
      s = det > 1e-14 * A * C ? clamp((B * F - C * D) / det) : 0;
      t = (B * s + F) / C;
      if (t < 0) {
        t = 0;
        s = clamp(-D / A);
      } else if (t > 1) {
        t = 1;
        s = clamp((B - D) / A);
      }
    }
    const ref = point(a, b, s),
      offset = point(c, d, t);
    return {
      ref,
      offset,
      md: ref.md,
      distance: Math.hypot(...sub(xyz(ref), xyz(offset))),
      refTangent: A ? u.map((x) => x / Math.sqrt(A)) : null,
      offsetTangent: C ? v.map((x) => x / Math.sqrt(C)) : null,
    };
  }
  function bounds(points) {
    const coords = points.map(xyz);
    return {
      min: [0, 1, 2].map((k) => Math.min(...coords.map((p) => p[k]))),
      max: [0, 1, 2].map((k) => Math.max(...coords.map((p) => p[k]))),
    };
  }
  function boxDistance(a, b) {
    return Math.hypot(
      ...[0, 1, 2].map((k) =>
        Math.max(0, a.min[k] - b.max[k], b.min[k] - a.max[k]),
      ),
    );
  }
  function segmentIndex(rows) {
    const segments = rows
      .slice(1)
      .map((p, i) => ({
        a: rows[i],
        b: p,
        index: i,
        box: bounds([rows[i], p]),
      }));
    function build(items) {
      const box = {
        min: [0, 1, 2].map((k) => Math.min(...items.map((x) => x.box.min[k]))),
        max: [0, 1, 2].map((k) => Math.max(...items.map((x) => x.box.max[k]))),
      };
      if (items.length <= 8) return { box, items };
      const spans = box.max.map((x, k) => x - box.min[k]),
        axis = spans.indexOf(Math.max(...spans));
      items.sort(
        (a, b) =>
          a.box.min[axis] + a.box.max[axis] - b.box.min[axis] - b.box.max[axis],
      );
      const mid = items.length >> 1;
      return {
        box,
        left: build(items.slice(0, mid)),
        right: build(items.slice(mid)),
      };
    }
    return build(segments);
  }
  function scan(ref, offset, a, b, radii) {
    if (!compatible(a, b)) throw Error("INCOMPATIBLE REFERENCE — NO SCAN");
    if (ref.length < 2 || offset.length < 2)
      throw Error("Two stations per path required");
    let best = null,
      checks = 0;
    const tree = segmentIndex(offset);
    for (let i = 1; i < ref.length; i++) {
      const box = bounds([ref[i - 1], ref[i]]);
      function visit(node) {
        if (best && boxDistance(box, node.box) > best.distance) return;
        if (node.items) {
          for (const item of node.items) {
            if (best && boxDistance(box, item.box) > best.distance) continue;
            checks++;
            const q = segmentPair(ref[i - 1], ref[i], item.a, item.b);
            if (!best || q.distance < best.distance)
              best = { ...q, refSegment: i - 1, offsetSegment: item.index };
          }
        } else {
          const nodes = [node.left, node.right].sort(
            (a, b) => boxDistance(box, a.box) - boxDistance(box, b.box),
          );
          nodes.forEach(visit);
        }
      }
      visit(tree);
    }
    let clearance = null;
    if (radii) {
      if (radii.some((r) => number(r) < 0) || radii.length !== 2)
        throw Error("Invalid radii");
      clearance = best.distance - radii[0] - radii[1];
    }
    return {
      ...best,
      clearance,
      segment_checks: checks,
      uncertainty: "NOT INCLUDED",
      model: "PRELIMINARY_UNVERIFIED",
    };
  }
  function csv(text, delimiter = ",") {
    const rows = [];
    let row = [],
      cell = "",
      quoted = false;
    const s = String(text).replace(/^\uFEFF/, "");
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '"') {
        if (quoted && s[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (!quoted && cell !== "") throw Error("Malformed CSV quote");
        else quoted = !quoted;
      } else if (c === delimiter && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && s[i + 1] === "\n") i++;
        row.push(cell);
        if (row.some((x) => x.trim())) rows.push(row);
        row = [];
        cell = "";
      } else cell += c;
    }
    if (quoted) throw Error("Unclosed CSV quote");
    row.push(cell);
    if (row.some((x) => x.trim())) rows.push(row);
    if (rows.length < 2) throw Error("CSV needs headers and data");
    const head = rows.shift().map((h) => h.trim());
    if (head.some((h) => !h) || new Set(head).size !== head.length)
      throw Error("Empty or duplicate CSV headers");
    return rows.map((r, i) => {
      if (r.length !== head.length)
        throw Error("CSV column count on row " + (i + 2));
      return Object.fromEntries(head.map((h, j) => [h, r[j].trim()]));
    });
  }
  function validateLimit(r) {
    if (
      typeof r.id !== "string" ||
      !r.id.trim() ||
      typeof r.metric !== "string" ||
      !r.metric.trim() ||
      typeof r.source !== "string" ||
      !r.source.trim() ||
      !Number.isInteger(r.revision) ||
      r.revision < 1
    )
      throw Error("Limit requires id, metric, source and revision");
    for (const key of ["valid_from_utc", "valid_to_utc"])
      if (
        r[key] &&
        (!String(r[key]).endsWith("Z") || !Number.isFinite(Date.parse(r[key])))
      )
        throw Error("Invalid UTC rule validity");
    if (
      r.valid_from_utc &&
      r.valid_to_utc &&
      Date.parse(r.valid_from_utc) > Date.parse(r.valid_to_utc)
    )
      throw Error("Reversed time validity");
    if (![">", ">=", "<", "<=", "outside_band"].includes(r.operator))
      throw Error("Invalid operator");
    if (!units[r.unit]) throw Error("Unknown limit unit");
    number(r.warning, "Warning");
    if (
      r.critical !== null &&
      r.critical !== undefined &&
      r.operator !== "outside_band" &&
      (([">", ">="].includes(r.operator) &&
        number(r.critical) < number(r.warning)) ||
        (["<", "<="].includes(r.operator) &&
          number(r.critical) > number(r.warning)))
    )
      throw Error(
        "Critical threshold must be beyond warning in the comparison direction",
      );
    if (r.critical !== null && r.critical !== undefined)
      number(r.critical, "Critical");
    if (
      r.operator === "outside_band" &&
      number(r.critical) <= number(r.warning)
    )
      throw Error("Band maximum must exceed minimum");
    if (r.md_from !== undefined && number(r.md_from) < 0)
      throw Error("Negative MD");
    if (r.md_to !== undefined && number(r.md_to) < number(r.md_from))
      throw Error("MD interval reversed");
    return r;
  }
  function evaluate(r, m) {
    if (!r || r.active === false) return { status: "NOT_CONFIGURED" };
    validateLimit(r);
    const base = {
      limit_id: r.id,
      limit_revision: r.revision,
      metric: m.metric,
      md: m.md,
      wellbore: m.wellbore,
      component: m.component,
      operation: m.operation,
      source: r.source,
      data: m.data,
      model: m.model,
      review: "DRAFT",
      measurement: { ...m },
    };
    const inactive =
      r.metric !== m.metric ||
      (r.wellbore && r.wellbore !== m.wellbore) ||
      (r.component && r.component !== m.component) ||
      (r.operation && r.operation !== m.operation) ||
      (r.md_from !== undefined &&
        (!Number.isFinite(m.md) || m.md < r.md_from)) ||
      (r.md_to !== undefined && (!Number.isFinite(m.md) || m.md > r.md_to));
    if (
      r.valid_from_utc &&
      (!Number.isFinite(Date.parse(m.timestamp_utc)) ||
        Date.parse(m.timestamp_utc) < Date.parse(r.valid_from_utc))
    )
      return {
        ...base,
        status: "NOT_EVALUABLE",
        explanation: "Outside time validity",
      };
    if (
      r.valid_to_utc &&
      (!Number.isFinite(Date.parse(m.timestamp_utc)) ||
        Date.parse(m.timestamp_utc) > Date.parse(r.valid_to_utc))
    )
      return {
        ...base,
        status: "NOT_EVALUABLE",
        explanation: "Outside time validity",
      };
    if (r.data === "SYNTHETIC" && m.data !== "SYNTHETIC")
      return {
        ...base,
        status: "NOT_EVALUABLE",
        explanation: "Synthetic rule cannot apply to real data",
      };
    if (inactive)
      return {
        ...base,
        status: "NOT_EVALUABLE",
        explanation: "Rule does not apply to this scope",
      };
    if (
      !["SYNTHETIC", "USER_ENTERED", "MEASURED_QC_PASS"].includes(m.data) ||
      ![
        "ILLUSTRATIVE",
        "PRELIMINARY_UNVERIFIED",
        "BENCHMARKED",
        "FIELD_VALIDATED",
      ].includes(m.model) ||
      m.dirty
    )
      return {
        ...base,
        status: "NOT_EVALUABLE",
        explanation: "Missing, unchecked, QC-failed or stale result",
      };
    let value;
    try {
      value = convert(m.value, m.unit, r.unit);
    } catch (e) {
      return { ...base, status: "NOT_EVALUABLE", explanation: e.message };
    }
    const compare = (t) =>
      r.operator === ">"
        ? value > t
        : r.operator === ">="
          ? value >= t
          : r.operator === "<"
            ? value < t
            : value <= t;
    const outside = r.operator === "outside_band";
    const crossed = outside
      ? value < number(r.warning) || value > number(r.critical)
      : compare(number(r.warning));
    const exceeded =
      !outside &&
      r.critical !== null &&
      r.critical !== undefined &&
      compare(number(r.critical));
    return {
      ...base,
      value,
      unit: r.unit,
      status: exceeded ? "EXCEEDED" : crossed ? "WARNING" : "WITHIN_USER_LIMIT",
      explanation:
        "Comparison with configured numeric rule only; no engineering acceptability verdict",
      checks: [
        "CHECK: verify source, units, sensor zero and acquisition conditions",
        "CHECK: review the project engineering program",
      ],
    };
  }
  function evaluateSeries(rule, measurements) {
    const duration =
        rule.persistence_seconds == null ? 0 : number(rule.persistence_seconds),
      gap =
        rule.max_sample_gap_seconds == null
          ? null
          : number(rule.max_sample_gap_seconds);
    if (duration < 0 || (duration > 0 && (gap === null || gap <= 0)))
      throw Error(
        "Persistence requires nonnegative seconds and a positive maximum sample gap",
      );
    const rows = measurements
        .map((m, index) => ({ m, index }))
        .sort(
          (a, b) =>
            (Date.parse(a.m.timestamp_utc) || 0) -
              (Date.parse(b.m.timestamp_utc) || 0) || a.index - b.index,
        ),
      groups = new Map();
    return rows.map(({ m }) => {
      const e = evaluate(rule, m),
        key = [m.wellbore, m.component, m.operation, m.metric].join("|"),
        violation = ["WARNING", "EXCEEDED"].includes(e.status),
        time = Date.parse(m.timestamp_utc);
      if (!violation) {
        groups.delete(key);
        return e;
      }
      if (!Number.isFinite(time))
        return duration
          ? {
              ...e,
              status: "NOT_EVALUABLE",
              comparison_status: e.status,
              explanation:
                "Persistence cannot be evaluated without a valid timestamp",
            }
          : e;
      let group = groups.get(key);
      if (
        !group ||
        time <= group.last ||
        (gap !== null && time - group.last > gap * 1000)
      )
        group = { start: time, last: time };
      group.last = time;
      groups.set(key, group);
      const result = {
        ...e,
        group_id: rule.id + "@" + rule.revision + "|" + key + "|" + group.start,
        observed_duration_seconds: (time - group.start) / 1000,
      };
      if (time - group.start < duration * 1000)
        return {
          ...result,
          status: "NOT_EVALUABLE",
          comparison_status: e.status,
          explanation:
            "Threshold crossed; configured observed-duration requirement not yet met",
        };
      return result;
    });
  }
  function motor(curve, q, conditions) {
    if (!curve)
      return {
        status: "NOT_COMPUTED",
        reason: "No source-backed performance curve",
      };
    if (
      !curve.source ||
      !curve.revision ||
      !Array.isArray(curve.points) ||
      curve.points.length < 2
    )
      return {
        status: "NOT_COMPUTED",
        reason: "Missing source, revision or points",
      };
    if (curve.quality !== "MEASURED_QC_PASS" && curve.quality !== "SYNTHETIC")
      return { status: "NOT_COMPUTED", reason: "Curve QC not passed" };
    const pts = curve.points.map((p) => ({
      flow: number(p.flow),
      rpm: number(p.rpm),
    }));
    for (let i = 0; i < pts.length; i++)
      if (
        pts[i].flow < 0 ||
        pts[i].rpm < 0 ||
        (i && pts[i].flow <= pts[i - 1].flow)
      )
        throw Error("Invalid motor curve domain");
    q = number(q);
    if (
      !conditions ||
      !curve.conditions ||
      ["mud", "temperature_c"].some(
        (k) => conditions[k] !== curve.conditions[k],
      )
    )
      return {
        status: "NOT_COMPUTED",
        reason: "Curve test conditions do not match",
      };
    if (q < pts[0].flow || q > pts.at(-1).flow)
      return {
        status: "NOT_COMPUTED",
        reason: "Outside source curve domain; no extrapolation",
      };
    let i = pts.findIndex((p) => p.flow >= q);
    if (i === 0) i = 1;
    const a = pts[i - 1],
      b = pts[i];
    return {
      status: "PRELIMINARY_UNVERIFIED",
      shaft_rpm: a.rpm + ((q - a.flow) / (b.flow - a.flow)) * (b.rpm - a.rpm),
      source: curve.source,
      revision: curve.revision,
    };
  }
  function directional(c) {
    if (
      !c ||
      !["SYNTHETIC", "MEASURED_QC_PASS", "USER_ENTERED"].includes(c.quality) ||
      !c.source
    )
      return { status: "NOT_COMPUTED", reason: "Missing source or usable QC" };
    if (
      c.md_from != null &&
      c.md_to != null &&
      (number(c.md_from) < 0 || number(c.md_to) < number(c.md_from))
    )
      throw Error("Directional MD interval invalid");
    if (c.nbs_distance_m != null && number(c.nbs_distance_m) < 0)
      throw Error("NBS distance must be nonnegative");
    const bit = number(c.bit_nominal_diameter_m),
      caliper = number(c.caliper_diameter_m);
    if (bit <= 0 || caliper <= 0) throw Error("Diameters must be positive");
    return {
      status: "PRELIMINARY_UNVERIFIED",
      overgauge_m: caliper - bit,
      pad_contact:
        c.max_pad_diameter_m === null || c.max_pad_diameter_m === undefined
          ? "NOT COMPUTED"
          : caliper > number(c.max_pad_diameter_m)
            ? "POTENTIAL NO-CONTACT CONDITION"
            : "Geometric reach only; contact force NOT COMPUTED",
      predicted_bur: "NOT_COMPUTED",
      predicted_tur: "NOT_COMPUTED",
      source: c.source,
    };
  }
  function psd(s) {
    const fail = (reason) => ({ status: "NOT ESTIMABLE", reason });
    if (!s || !["SYNTHETIC", "MEASURED_QC_PASS"].includes(s.quality))
      return fail("Sample QC has not passed");
    if (s.weighting_basis !== "dry_mass" || s.wet_dry !== "dry")
      return fail(
        "Dry-mass sieve analysis cannot use count, area or wet weighting",
      );
    if (!s.provenance || !s.collection_point || !s.method)
      return fail("Missing collection, method or provenance");
    if (
      !s.lag_model ||
      !s.lag_uncertainty ||
      s.source_md_from == null ||
      s.source_md_to == null
    )
      return fail("Missing source interval or lag model/uncertainty");
    if (
      number(s.source_md_from) < 0 ||
      number(s.source_md_to) < number(s.source_md_from)
    )
      return fail("Source MD interval invalid");
    if (
      !s.collection_time_start_utc?.endsWith("Z") ||
      !s.collection_time_end_utc?.endsWith("Z") ||
      !Number.isFinite(Date.parse(s.collection_time_start_utc)) ||
      !Number.isFinite(Date.parse(s.collection_time_end_utc)) ||
      Date.parse(s.collection_time_end_utc) <
        Date.parse(s.collection_time_start_utc)
    )
      return fail("UTC collection interval invalid");
    if (
      s.sampling_screen_aperture_mm == null ||
      number(s.sampling_screen_aperture_mm) <= 0
    )
      return fail("Screen aperture context missing");
    if (!s.calibration_valid || !s.recovery_complete || s.censored)
      return fail("Calibration, recovery or censoring prevents estimation");
    if (!Array.isArray(s.bins) || !s.bins.length) return fail("No sieve bins");
    let last = 0,
      total = 0;
    const bins = s.bins.map((b, i) => {
      let lo = number(b.lower_mm),
        hi = number(b.upper_mm),
        mass = number(b.mass_kg);
      if (lo < 0 || hi <= lo || mass < 0 || (i && Math.abs(lo - last) > 1e-10))
        throw Error(
          "Bins must be contiguous, increasing and have nonnegative dry masses",
        );
      last = hi;
      total += mass;
      return { lower_mm: lo, upper_mm: hi, mass_kg: mass };
    });
    if (total <= 0) return fail("No recovered dry mass");
    let sum = 0;
    const rows = bins.map((b) => {
      sum += b.mass_kg;
      return {
        ...b,
        fraction: b.mass_kg / total,
        cumulative_passing: sum / total,
      };
    });
    const percentile = (p) => {
      let prev = 0;
      for (const b of rows) {
        if (b.cumulative_passing >= p && b.fraction > 0) {
          if (b.lower_mm <= 0) return null;
          return Math.exp(
            Math.log(b.lower_mm) +
              ((p - prev) / b.fraction) * Math.log(b.upper_mm / b.lower_mm),
          );
        }
        prev = b.cumulative_passing;
      }
      return null;
    };
    return {
      status: "DESCRIPTIVE ONLY",
      total_mass_kg: total,
      rows,
      D10_mm: percentile(0.1),
      D50_mm: percentile(0.5),
      D90_mm: percentile(0.9),
      coarse_fraction_percent:
        s.coarse_cutoff_mm != null &&
        rows.some((b) => b.lower_mm === number(s.coarse_cutoff_mm))
          ? 100 *
            rows
              .filter((b) => b.lower_mm >= number(s.coarse_cutoff_mm))
              .reduce((v, b) => v + b.fraction, 0)
          : null,
      method: "Log-size interpolation within bracketed dry-mass bins",
      interval:
        s.source_md_from === undefined
          ? null
          : [number(s.source_md_from), number(s.source_md_to)],
      lag_uncertainty: s.lag_uncertainty,
      warning:
        "Surface sample affected by lag, transport and shaker selection; no stability diagnosis or hole-diameter inference",
    };
  }
  function canonical(value) {
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    if (value && typeof value === "object")
      return (
        "{" +
        Object.keys(value)
          .sort()
          .filter((k) => value[k] !== undefined)
          .map((k) => JSON.stringify(k) + ":" + canonical(value[k]))
          .join(",") +
        "}"
      );
    return JSON.stringify(value);
  }
  async function fingerprint(value) {
    const bytes = new TextEncoder().encode(canonical(value));
    return Array.from(
      new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes)),
      (x) => x.toString(16).padStart(2, "0"),
    ).join("");
  }
  function createProject(mode = "USER_DATA") {
    return {
      schema_version: version,
      id: "local-project",
      revision: 1,
      mode,
      reference: {
        coordinate_system: "LOCAL_NE_TVD",
        datum: "LOCAL",
        vertical_reference: "RT",
        azimuth_reference: "GRID",
        length_unit: "m",
      },
      wells: [],
      bha: [],
      limits: [],
      events: [],
      model_runs: [],
      measurements: [],
      directional_response_cases: [],
      cuttings_samples: [],
      review: "DRAFT",
    };
  }
  return {
    version,
    status,
    number,
    units,
    convert,
    compatible,
    segmentPair,
    scan,
    csv,
    validateLimit,
    evaluate,
    evaluateSeries,
    motor,
    directional,
    psd,
    canonical,
    fingerprint,
    createProject,
  };
});
