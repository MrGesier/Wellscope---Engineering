/* Candidate pre-screening. Mechanical Pareto shortlist, not a calibrated BHA optimizer. */
(function (root) {
  const F = root.StringPhase || require("./string-phase"),
    E = root.WellEngine || require("./engine"),
    P = root.DirectionalPlanning || require("./directional-planning"),
    D = root.DirectionalResponse || require("./directional-response"),
    L = root.StringLoads || require("./string-loads");
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function identity(components) {
    const ordered = (v) =>
      Array.isArray(v)
        ? v.map(ordered)
        : v && typeof v === "object"
          ? Object.fromEntries(
              Object.keys(v)
                .sort()
                .map((k) => [k, ordered(v[k])]),
            )
          : v;
    return JSON.stringify(ordered(components));
  }
  function generate(input) {
    const packages = input.components.flatMap((b, i) => {
      if (!/^jar$|drilling-jar/.test(b.family || b.type || "")) return [];
      const end = input.components.findIndex(
        (c, j) => j > i && /accelerator/.test(c.family || c.type || ""),
      );
      return end < 0 ? [] : [input.components.slice(i, end + 1)];
    });
    const out = [{ name: "Current assembly", input: clone(input) }],
      seen = new Set([identity(input.components)]);
    input.components.forEach((b, i) => {
      const kind = b.family || b.type || "";
      if (
        !/stabilizer|^jar$|drilling-jar/.test(kind) ||
        i === 0 ||
        i === input.components.length - 1
      )
        return;
      let count = 1;
      if (/jar/.test(kind)) {
        // Do not silently separate a jar from an unidentified accelerator package.
        const a = input.components.findIndex(
          (c, j) => j > i && /accelerator/.test(c.family || c.type || ""),
        );
        if (a < 0) return;
        count = a - i + 1;
      }
      if (i + count >= input.components.length) return;
      for (const v of F.variants(input, i, count).slice(1)) {
        if (
          packages.some(
            (pkg) =>
              !v.input.components.some(
                (_, j) =>
                  identity(v.input.components.slice(j, j + pkg.length)) ===
                  identity(pkg),
              ),
          )
        )
          continue;
        const key = identity(v.input.components);
        if (seen.has(key) || out.length >= 9) continue;
        seen.add(key);
        out.push({ ...v, name: b.name + " · " + v.name });
      }
    });
    return out;
  }
  function geometry(input, options) {
    for (const k of ["maxBuild", "maxDrop", "maxDLS", "tolerance"])
      if (!Number.isFinite(options[k]) || options[k] < 0)
        throw Error(
          "Nonnegative finite directional limits and target tolerance required.",
        );
    if (
      !options.target ||
      !["n", "e", "tvd"].every((k) => Number.isFinite(options.target[k]))
    )
      throw Error(
        "Enter target northing, easting and TVD in the survey local frame.",
      );
    const st = E.survey(input.survey),
      end = st.at(-1),
      distance = Math.hypot(
        end.n - options.target.n,
        end.e - options.target.e,
        end.tvd - options.target.tvd,
      );
    const rates = st
      .slice(1)
      .map((s, i) => ({ ...P.survey(st[i], s), from: st[i].md, to: s.md }));
    return {
      end,
      targetDistanceM: distance,
      targetWithinTolerance: distance <= options.tolerance,
      maxBuild: Math.max(0, ...rates.map((r) => r.build)),
      maxDrop: Math.max(0, ...rates.map((r) => r.drop)),
      maxDLS: Math.max(0, ...rates.map((r) => r.dls)),
      violations: rates.filter(
        (r) =>
          r.build > options.maxBuild ||
          r.drop > options.maxDrop ||
          r.dls > options.maxDLS,
      ),
    };
  }
  function requirements(input, required) {
    const capabilities = new Set(
      input.components.flatMap((b) => {
        const a = Array.isArray(b.capabilities) ? b.capabilities : [],
          type = b.family || b.type || "";
        return [
          ...a,
          ...(/^mwd$/.test(type) ? ["mwd"] : []),
          ...(/^lwd$/.test(type) ? ["lwd"] : []),
          ...(/rss/.test(type) ? ["rss"] : []),
          ...(/gamma/.test(type) ? ["gamma"] : []),
        ];
      }),
    );
    return required.filter((k) => !capabilities.has(k));
  }
  function loads(p, md) {
    if (!p.axial) return { status: "MISSING_LOAD_INPUTS" };
    try {
      const result = { status: "CALCULATED" };
      for (const [name, speed, rpm] of [
        ["pickup", Math.abs(p.axial.axialSpeedMps) || 0.1, 0],
        ["slackoff", -(Math.abs(p.axial.axialSpeedMps) || 0.1), 0],
        ["rotating", 0, p.axial.rpm],
      ]) {
        if (name === "rotating" && rpm <= 0) {
          result.rotating = null;
          continue;
        }
        const q = clone(p);
        q.bitMD = md;
        q.axial = {
          ...q.axial,
          axialSpeedMps: speed,
          rpm,
          bottomForceN: 0,
          bottomTorqueNm: 0,
        };
        const r = L.solve(q);
        result[name] = {
          hookN: r.hookN,
          torqueNm: r.surfaceTorqueNm,
          status: r.status,
        };
      }
      return result;
    } catch (e) {
      return { status: "NOT_SOLVED", error: e.message };
    }
  }
  function directional(candidate, entries, options) {
    const entry = entries.find(
      (e) => identity(e.study) === identity(candidate.input),
    );
    if (!entry)
      return {
        status: "MISSING_BHA_RESPONSE",
        note: "A geometry change requires its own sourced directional response surface.",
      };
    D.validate(entry.surface);
    const rows = P.sample(entry.surface, entry.settings, 8),
      curve = entry.surface.curves.find((c) => c.mode === entry.settings.mode);
    return {
      status: entry.surface.quality,
      source: entry.surface.source,
      conditions: entry.surface.conditions,
      rows,
      windows: P.windows(entry.surface, entry.settings, {
        buildMin: -options.maxDrop,
        buildMax: options.maxBuild,
        dlsMax: options.maxDLS,
        wobMin: curve.rows[0].wobN,
        wobMax: curve.rows.at(-1).wobN,
      }),
    };
  }
  function shortlist(candidates) {
    const valid = candidates.filter(
      (c) =>
        !c.missing.length &&
        c.geometry.targetWithinTolerance &&
        !c.geometry.violations.length &&
        c.rows.every(
          (r) =>
            r.status === "SOLVED_SCREENING" &&
            r.bendingPa != null &&
            r.bodyStatus !== "EXCEEDED",
        ) &&
        !c.loads.some(
          (r) =>
            r.status === "NOT_SOLVED" ||
            ["pickup", "slackoff", "rotating"].some(
              (k) => r[k]?.status === "EXCEEDED",
            ),
        ),
    );
    const metrics = (c) => [
      Math.max(...c.rows.map((r) => r.contactN)),
      Math.max(...c.rows.map((r) => r.bendingPa)),
    ];
    for (const c of candidates) {
      c.metrics = c.rows.every(
        (r) => r.status === "SOLVED_SCREENING" && r.bendingPa != null,
      )
        ? metrics(c)
        : null;
      c.mechanicalCandidate =
        valid.includes(c) &&
        !valid.some((other) => {
          const a = metrics(other),
            b = metrics(c);
          return a.every((v, i) => v <= b[i]) && a.some((v, i) => v < b[i]);
        });
      c.approval = "PRELIMINARY_ONLY";
    }
    return candidates;
  }
  root.BhaQuick = {
    identity,
    generate,
    geometry,
    requirements,
    loads,
    directional,
    shortlist,
  };
  if (typeof module === "object") module.exports = root.BhaQuick;
})(globalThis);
