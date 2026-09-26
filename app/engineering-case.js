/* Original fictional training well. Canonical SI, independent axial screening. */
(function (root, factory) {
  const api = factory(
    root.WellEngine ||
      (typeof require === "function" ? require("./engine") : null),
    root.WellCore || (typeof require === "function" ? require("./core") : null),
  );
  root.EngineeringCase = api;
  if (typeof module === "object") module.exports = api;
})(globalThis, function (E, C) {
  "use strict";
  const G = 9.80665;
  const presets = {
    metric: {
      length: "m",
      diameter: "mm",
      force: "tf",
      torque: "tf.m",
      pressure: "bar",
      density: "sg",
      flow: "L/min",
      mass: "t",
      linear: "kg/m",
    },
    si: {
      length: "m",
      diameter: "mm",
      force: "kN",
      torque: "kN.m",
      pressure: "bar",
      density: "kg/m3",
      flow: "L/min",
      mass: "kg",
      linear: "kg/m",
    },
    field: {
      length: "ft",
      diameter: "in",
      force: "klbf",
      torque: "klbf.ft",
      pressure: "psi",
      density: "ppg",
      flow: "US gal/min",
      mass: "lb",
      linear: "lb/ft",
    },
  };
  const base = {
    length: "m",
    diameter: "m",
    force: "N",
    torque: "N.m",
    pressure: "Pa",
    density: "kg/m3",
    flow: "m3/s",
    mass: "kg",
    linear: "kg/m",
  };
  function demo() {
    const anchors = [
      [0, 0, 35],
      [700, 0, 35],
      [1200, 18, 38],
      [1800, 42, 48],
      [2300, 65, 60],
      [2800, 82, 68],
      [3800, 82, 68],
    ];
    const survey = [];
    for (let md = 0; md <= 3800; md += 25) {
      let i = anchors.findIndex((a) => a[0] >= md);
      if (i <= 0) i = 1;
      const a = anchors[i - 1],
        b = anchors[i],
        f = (md - a[0]) / (b[0] - a[0]);
      survey.push({
        md,
        inc: a[1] + f * (b[1] - a[1]),
        azi: a[2] + f * (b[2] - a[2]),
      });
    }
    const parts = [
      ["PDC bit · 6 blades", "pdc-bit", 0.32, 0.2159, 0.045, 175, "4½ REG"],
      [
        "Push-the-bit RSS",
        "push-the-bit-rss",
        4.1,
        0.17145,
        0.057,
        132,
        "4½ IF",
      ],
      ["Near-bit stabilizer", "stabilizer", 1.6, 0.2127, 0.071, 108, "4½ IF"],
      ["LWD resistivity tool", "lwd", 6.8, 0.17145, 0.057, 123, "4½ IF"],
      ["MWD telemetry & surveys", "mwd", 8.7, 0.17145, 0.057, 120, "4½ IF"],
      ["Non-magnetic collar", "nonmag", 9.2, 0.17145, 0.0714, 145, "4½ IF"],
      ["String stabilizer", "stabilizer", 1.55, 0.2127, 0.0714, 105, "4½ IF"],
      [
        "Drill collars · 6 joints",
        "drill-collar",
        55.8,
        0.17145,
        0.0714,
        146,
        "4½ IF",
      ],
      ["Hydraulic drilling jar", "jar", 9.4, 0.1651, 0.0714, 118, "4½ IF"],
      ["Jar accelerator", "accelerator", 4.2, 0.1651, 0.0714, 110, "4½ IF"],
      [
        "Heavyweight pipe · 18 joints",
        "hwdp",
        167.4,
        0.127,
        0.0762,
        74,
        "NC50",
      ],
    ];
    const bha = parts.map(
      ([name, type, length, od, id, mass, connection], i) => ({
        name,
        type,
        length,
        od,
        id,
        mass,
        connection,
        serial: "DEMO-" + String(i + 1).padStart(3, "0"),
        source: "Original synthetic tally / 1",
      }),
    );
    bha.push({
      name: "Drill pipe · 5 in, S-135 (illustrative)",
      type: "drill-pipe",
      length: 3800 - bha.reduce((a, b) => a + b.length, 0),
      od: 0.127,
      id: 0.1086,
      mass: 29.1,
      connection: "NC50",
      serial: "DEMO-DP",
      source: "Original synthetic tally / 1",
    });
    const c = {
      schema: "wellscope-engineering-case/1",
      name: "Northbank N-04 · Run 07",
      quality: "SYNTHETIC",
      source: "Original fictional training case / 1",
      objective:
        "Compare expected axial loads with a mock connection log while drilling the 8½ in section. Explore friction sensitivity and explain a rising drag trend.",
      reference:
        "Local N/E; MD and TVD from rotary table; no geodetic coordinates",
      survey,
      bha,
      sections: [
        { name: "Surface casing", from: 0, to: 450, od: 0.508, id: 0.476 },
        {
          name: "Intermediate casing",
          from: 450,
          to: 1800,
          od: 0.339725,
          id: 0.3153,
        },
        {
          name: "Production casing",
          from: 1800,
          to: 2600,
          od: 0.244475,
          id: 0.2168,
        },
        { name: "Open hole", from: 2600, to: 3800, od: 0.2159, id: 0.2159 },
      ],
      settings: {
        mud: 1260,
        steel: 7850,
        muCased: 0.18,
        muOpen: 0.25,
        casingShoe: 2600,
        blockForce: 32000 * G,
        bitMD: 3800,
        flow: 0.032,
        rpm: 120,
        wob: 90000,
        pressure: 21500000,
      },
      units: structuredClone(presets.metric),
      observations: [],
      notes:
        "Training interpretation: investigate the rising pickup/slackoff spread below 3,200 m. These observations are intentionally fictitious; no cleaning instruction or operating limit is inferred.",
    };
    const baseline = calculate(c);
    c.observations = baseline.rows
      .filter((_, i) => i % 2 === 0)
      .map((r, i) => {
        const excess = Math.max(0, (r.md - 3150) / 650);
        return {
          md: r.md,
          pu: r.pu + excess * 65000 + Math.sin(i * 0.9) * 7500,
          so: r.so - excess * 40000 + Math.cos(i) * 5500,
          fr: r.fr + Math.sin(i * 0.7) * 3500,
          torque:
            6000 + (r.md - 2000) * 3.8 + excess * 2300 + Math.sin(i) * 250,
          flow: c.settings.flow,
          rpm: 30,
          pressure: 18000000 + (r.md - 2000) * 2300,
          ecd: 1275 + excess * 24,
          record: "MOCK-" + String(i + 1).padStart(3, "0"),
          operation: "Off-bottom connection check",
          quality: "SYNTHETIC",
        };
      });
    return c;
  }
  function validate(c) {
    if (
      c?.schema !== "wellscope-engineering-case/1" ||
      c.quality !== "SYNTHETIC"
    )
      throw Error(
        "This training workspace accepts only labelled synthetic case backups",
      );
    if (!c.settings || !c.units || !Array.isArray(c.survey) || !Array.isArray(c.bha) || !Array.isArray(c.sections) || !Array.isArray(c.observations)) throw Error("Incomplete case backup");
    if (c.sections.length !== 4 || !c.survey.length || !c.bha.length || c.observations.length > 10000) throw Error("Invalid case structure");
    for (const kind of Object.keys(base)) C.convert(1, base[kind], c.units[kind]);
    for (const o of c.observations) for (const k of ["md", "pu", "so", "fr", "torque", "flow", "rpm", "pressure", "ecd"]) C.number(o[k], "Observation " + k);
    const s = c.settings;
    for (const k of [
      "mud",
      "steel",
      "muCased",
      "muOpen",
      "casingShoe",
      "blockForce",
      "bitMD",
      "flow",
      "rpm",
      "wob",
      "pressure",
    ])
      s[k] = C.number(s[k], k);
    if (
      s.mud <= 0 ||
      s.mud >= s.steel ||
      s.blockForce < 0 ||
      s.flow <= 0 ||
      s.rpm < 0 ||
      s.wob < 0 ||
      s.pressure < 0
    )
      throw Error("Invalid fluid or operating conditions");
    if (
      s.bitMD < 2000 ||
      s.bitMD > 3800 ||
      s.casingShoe < 1800 ||
      s.casingShoe > s.bitMD
    )
      throw Error(
        "Training bit depth must be 2000–3800 m; casing shoe must be between 1800 m and bit",
      );
    if (c.survey.length > 10000 || c.bha.length > 1000)
      throw Error("Case too large");
    for (const section of c.sections) {
      for (const key of ["from", "to", "od", "id"]) C.number(section[key], "Section " + key);
      if (section.from < 0 || section.to < section.from || section.id <= 0 || section.od < section.id) throw Error("Invalid section geometry");
    }
    E.normalizeBha(c.bha);
    for (const [kind, unit] of Object.entries(c.units))
      C.convert(1, base[kind], unit);
    return c;
  }
  function calculate(c) {
    validate(c);
    const stations = E.survey(c.survey),
      s = c.settings,
      rows = [],
      depths = [];
    for (let d = 2000; d < s.bitMD; d += 50) depths.push(d);
    depths.push(s.bitMD);
    for (const o of c.observations) if (o.md >= 2000 && o.md <= s.bitMD) depths.push(o.md);
    for (const md of [...new Set(depths)].sort((a,b) => a-b)) {
      const one = (mode, muOpen = s.muOpen) =>
        E.td(stations, c.bha, {
          ...s,
          mu: s.muOpen,
          muOpen,
          bitMD: md,
          bitForce: 0,
          mode,
        }).stringTopAxialForce + s.blockForce;
      rows.push({
        md,
        pu: one("pooh"),
        so: one("rih"),
        fr: one("static"),
        puLow: one("pooh", Math.max(0, s.muOpen - 0.1)),
        puHigh: one("pooh", Math.min(1.5, s.muOpen + 0.1)),
        soLow: one("rih", Math.max(0, s.muOpen - 0.1)),
        soHigh: one("rih", Math.min(1.5, s.muOpen + 0.1)),
      });
    }
    return {
      rows,
      stations,
      tvd: E.interp(stations, s.bitMD).tvd,
      dryMass: c.bha.reduce((sum, b) => sum + b.mass * b.length, 0),
      model: "PRELIMINARY_AXIAL_SOFT_STRING",
      torqueModel: "NOT_COMPUTED",
      assumptions:
        "Off-bottom axial screening + declared travelling-block offset. No torsional, stiff-string, hydraulic, buckling or fatigue model. FRW uses static axial equilibrium; it does not model rotational friction.",
    };
  }
  function value(v, kind, u) {
    return C.convert(v, base[kind], u[kind]);
  }
  function canonical(v, kind, u) {
    return C.convert(v, u[kind], base[kind]);
  }
  return { demo, calculate, validate, presets, base, value, canonical };
});
