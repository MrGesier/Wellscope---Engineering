/* Independent complete training project: fictional, not imported field evidence. */
(function (root) {
  function programme() {
    const c = EngineeringCase.demo(),
      study = {
        source:
          "SYNTHETIC · Northbank N-04 / Run 07 / prepared engineering project rev 2 · local NE frame, MD/TVD from RT",
        quality: "SYNTHETIC",
        survey: c.survey,
        sections: c.sections.map((s) => ({
          from: s.from,
          to: s.to,
          diameter: s.id,
          kind: s.name === "Open hole" ? "OPEN" : "CASED",
          source: "Fictional casing / open-hole programme",
        })),
        components: c.bha.map((b) => ({
          ...b,
          E: 210e9,
          contactOD: b.od,
          source: "Fictional tally, assumed steel stiffness",
        })),
        bitMD: 3800,
        stepM: 10,
        tensionN: 0,
        rho: 1200,
        adaptive: true,
        fineStepM: 1,
      };
    for (const r of study.survey)
      if (r.md > 3000)
        r.inc = r.md < 3300 ? 82 - ((r.md - 3000) * 4) / 300 : 78;
    const p = DrillingProgram.demo(study),
      bounds = [0, 350, 900, 1600, 2350, 2900, 3200, 3400, 3600, 3800],
      names = [
        "Clay / unconsolidated cover",
        "Sandstone",
        "Shale",
        "Limestone",
        "Marl",
        "Interbedded sandstone / shale",
        "Sandstone",
        "Shale",
        "Limestone",
      ];
    const reference = structuredClone(p.intervals);
    p.name = "Northbank N-04 · prepared training project";
    p.intervals = names.map((lithology, i) => {
      const r = structuredClone(reference[i >= 6 ? i - 6 : i % 3]);
      r.from = bounds[i];
      r.to = bounds[i + 1];
      r.lithology = lithology;
      r.source =
        "SYNTHETIC interpreted intervals along MD · geological sequence for training, not a geological section";
      r.limits.bottomBar = { max: 400 };
      r.limits.slackoffTf = { min: 0 };
      r.response.study = structuredClone(p.study);
      r.hydraulics.rows = [
        {
          md: r.from,
          sppBar: 20 + (180 * r.from) / 3800,
          annularBar: (10 * r.from) / 3800,
        },
        {
          md: r.to,
          sppBar: 20 + (180 * r.to) / 3800,
          annularBar: (10 * r.to) / 3800,
        },
      ];
      return r;
    });
    return p;
  }
  root.WellTraining = { programme };
})(globalThis);
