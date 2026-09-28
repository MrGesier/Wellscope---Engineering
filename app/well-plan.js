/* Well preparation and explicitly assumed starter geometry. No OEM sizing or bit/rock law. */
(function (root) {
  const E = root.WellEngine || require("./engine"),
    C = root.WellCore || require("./core"),
    A = root.BhaStatic || require("./bha-static"),
    M = root.DrillingProgram || require("./drilling-program");
  const copy = (x) => JSON.parse(JSON.stringify(x));
  function numeric(row, key) {
    if (
      row[key] == null ||
      String(row[key]).trim() === "" ||
      !Number.isFinite(Number(row[key]))
    )
      throw Error("Missing numeric column: " + key);
    return Number(row[key]);
  }
  function survey(text) {
    const rows = C.csv(text).map((r) => ({
      md: numeric(r, "md"),
      inc: numeric(r, "inc"),
      azi: numeric(r, "azi"),
    }));
    E.survey(rows);
    if (rows[0].md !== 0) throw Error("Survey must start at MD 0");
    return rows;
  }
  function architecture(text, source) {
    const rows = C.csv(text).map((r) => ({
      from: numeric(r, "from_m"),
      to: numeric(r, "to_m"),
      diameter: numeric(r, "diameter_mm") / 1000,
      kind: r.kind?.trim().toUpperCase(),
      source,
    }));
    A.architecture(rows);
    return rows;
  }
  function tally(text) {
    const rows = C.csv(text).map((r) => ({
      name: r.name,
      type: r.type,
      length: numeric(r, "length_m"),
      od: numeric(r, "od_mm") / 1000,
      id: numeric(r, "id_mm") / 1000,
      contactOD: numeric(r, "contact_od_mm") / 1000,
      mass: numeric(r, "kg_m"),
      E: numeric(r, "E_GPa") * 1e9,
      source: r.source,
      capabilities: (r.capabilities || "").split(";").filter(Boolean),
    }));
    if (
      !rows.length ||
      rows.some(
        (b) =>
          !b.name?.trim() ||
          !b.source?.trim() ||
          !b.type?.trim() ||
          b.E <= 0 ||
          b.contactOD < b.od,
      )
    )
      throw Error(
        "Tally requires names, tool types, sources, positive stiffness and contact OD ≥ body OD",
      );
    E.normalizeBha(rows);
    return rows;
  }
  function starter(td, hole, required = []) {
    if (
      !Number.isFinite(td) ||
      td < 100 ||
      !Number.isFinite(hole) ||
      hole < 0.1 ||
      hole > 0.5
    )
      throw Error(
        "Starter geometry supports TD ≥ 100 m and minimum bore diameter 100–500 mm; otherwise import a tally",
      );
    const source =
        "GENERATED GEOMETRY ASSUMPTION · annular steel, no OEM ratings or verified connections",
      body = hole * 0.6,
      bore = body * 0.42;
    const part = (
      name,
      type,
      length,
      od = body,
      contactOD = od,
      capabilities = [],
    ) => ({
      name,
      type,
      length,
      od,
      id: Math.min(bore, od * 0.6),
      contactOD,
      mass: (7850 * Math.PI * (od * od - Math.min(bore, od * 0.6) ** 2)) / 4,
      E: 210e9,
      source,
      capabilities,
    });
    const rows = [
      part("Bit · assumed dimensions", "pdc-bit", 0.3, hole * 0.99),
      part("Near-bit stabilizer", "stabilizer", 1.5, body, hole * 0.985),
    ];
    for (const k of required)
      rows.push(
        part(
          k.toUpperCase() + " · assumed envelope",
          k === "rss" ? "push-the-bit-rss" : k,
          5,
          body,
          body,
          [k],
        ),
      );
    rows.push(
      part("Drill collar", "drill-collar", Math.min(18, td * 0.08)),
      part("String stabilizer", "stabilizer", 1.5, body, hole * 0.985),
      part("Drill collar", "drill-collar", Math.min(18, td * 0.08)),
      part("Jar", "jar", 5),
      part("Accelerator", "accelerator", 3),
      part("HWDP", "hwdp", Math.min(27, td * 0.1), hole * 0.56),
    );
    const remaining = td - rows.reduce((s, b) => s + b.length, 0);
    if (remaining < 5)
      throw Error("Requested instruments leave insufficient drillpipe length");
    rows.push(part("Drillpipe", "drill-pipe", remaining, hole * 0.52));
    return rows;
  }
  function programme(input) {
    if (!input.source?.trim() || !input.name?.trim())
      throw Error("Well name and source required");
    const st = E.survey(input.survey),
      end = st.at(-1).md;
    A.architecture(input.sections);
    E.normalizeBha(input.components);
    if (
      input.sections.at(-1).to < end ||
      input.components.reduce((s, b) => s + b.length, 0) < end - 1e-7
    )
      throw Error(
        "Architecture and tally must cover the full planned trajectory",
      );
    const study = {
      source: input.source,
      quality: input.generated ? "SYNTHETIC" : "USER_ENTERED",
      survey: copy(input.survey),
      sections: copy(input.sections),
      components: copy(input.components),
      bitMD: end,
      stepM: 10,
      tensionN: 0,
      rho: input.plan.mudKgM3,
      adaptive: true,
      fineStepM: 1,
    };
    if (input.axial) study.axial = copy(input.axial);
    const p = {
      schema: "wellscope-drilling-program/1",
      name: input.name,
      quality: "USER_ENTERED",
      study,
      required: input.required || [],
      plan: copy(input.plan),
      intervals: input.intervals.length
        ? copy(input.intervals)
        : [
            {
              from: 0,
              to: end,
              lithology: "Unknown formation",
              source: "Lithology not supplied",
            },
          ],
    };
    M.validate(p);
    return p;
  }
  function selectCandidate(candidates) {
    return (
      candidates
        .filter(
          (c) =>
            c.mechanicalCandidate &&
            !c.blockers.length &&
            c.metrics?.every(Number.isFinite),
        )
        .sort(
          (a, b) => a.metrics[0] - b.metrics[0] || a.metrics[1] - b.metrics[1],
        )[0] || null
    );
  }
  const api = {
    survey,
    architecture,
    tally,
    starter,
    programme,
    selectCandidate,
  };
  root.WellPlan = api;
  if (typeof module === "object") module.exports = api;
})(globalThis);
