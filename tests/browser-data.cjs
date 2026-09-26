const { chromium } = require("playwright-core"),
  assert = require("node:assert/strict"),
  path = require("node:path"),
  { pathToFileURL } = require("node:url");
(async () => {
  const b = await chromium.launch({
    executablePath:
      process.env.EDGE_PATH ||
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      pathToFileURL(path.resolve(__dirname, "../app/index.html")).href,
    );
    const nav = (id) => p.locator(`[data-page="${id}"]`).click();
    const fill = (id, value) => p.locator("#" + id).fill(String(value));
    const click = (id) => p.locator("#" + id).click();
    assert.ok(
      await p
        .locator(".brandmark img")
        .evaluate(
          (i) =>
            i.complete &&
            i.naturalWidth > 0 &&
            i.naturalWidth === i.naturalHeight,
        ),
    );
    await click("fixture-load");
    await nav("dataqc");
    await click("canonical-example");
    await click("canonical-import");
    assert.match(
      await p.locator("#canonical-result").textContent(),
      /Imported project/,
    );
    assert.equal(
      await p.evaluate(() => WellApp.snapshot().state.tieInMD),
      2200,
    );
    assert.equal(
      await p.evaluate(
        () => WellEvidence.project().canonical_source.wells.length,
      ),
      4,
    );
    await nav("overview");
    for (const [id, value] of [
      ["completion-label", "Synthetic test casing"],
      ["completion-from", 0],
      ["completion-to", 1000],
      ["completion-od", 0.3],
      ["completion-id", 0.27],
      ["completion-source", "Synthetic browser fixture"],
    ])
      await fill(id, value);
    await click("completion-add");
    assert.equal(
      await p.evaluate(
        () => WellEvidence.project().completion_intervals.length,
      ),
      1,
    );
    await p.selectOption("#linked-view", "Depth Schematic");
    await nav("bha");
    const curve = {
      kind: "DP_TORQUE",
      source: "Synthetic browser table",
      revision: "1",
      quality: "SYNTHETIC",
      conditions: { mud: "test", temperature_c: 20, density_kg_m3: 1000 },
      x_unit: "bar",
      y_unit: "kN.m",
      points: [
        { dp: 10, torque: 1 },
        { dp: 30, torque: 3 },
      ],
    };
    await fill("vendor-table", JSON.stringify(curve));
    for (const [id, value] of [
      ["vendor-query", 20],
      ["vendor-unit", "bar"],
      ["vendor-mud", "test"],
      ["vendor-temp", 20],
      ["vendor-density", 1000],
    ])
      await fill(id, value);
    await click("vendor-run");
    assert.equal(
      JSON.parse(await p.locator("#vendor-result").textContent()).value,
      2000,
    );
    await nav("td");
    const originalGeometry = await p.evaluate(() =>
      JSON.stringify(WellApp.snapshot().derived.ref),
    );
    for (const [id, value] of [
      ["casing-shoe", 1000],
      ["mu-cased", 0.15],
      ["mu-open", 0.3],
    ])
      await fill(id, value);
    await click("friction-split");
    assert.equal(
      await p.evaluate(() => JSON.stringify(WellApp.snapshot().derived.ref)),
      originalGeometry,
    );
    assert.equal(await p.evaluate(() => WellApp.snapshot().state.muOpen), 0.3);
    const weights = ["PUW", "FRW", "SOW"].map((operation, i) => ({
      operation,
      md: 1000,
      basis_id: "triplet",
      zero_basis: "test",
      wellbore: "REFERENCE",
      source: "synthetic",
      quality: "SYNTHETIC",
      value: [140, 120, 110][i],
      unit: "kN",
      timestamp_utc: new Date(Date.UTC(2026, 0, 1, 0, 0, i * 10)).toISOString(),
    }));
    await fill("matched-json", JSON.stringify(weights));
    await fill("matched-tolerance", 30);
    await click("matched-run");
    assert.match(
      await p.locator("#matched-result").textContent(),
      /DESCRIPTIVE ONLY/,
    );
    await nav("dynamics");
    const channel = {
      source: "Synthetic browser signal",
      quality: "SYNTHETIC",
      unit: "m/s2",
      clock_alignment: "uniform",
      anti_alias_filter: "synthetic bandlimited",
      sample_rate_hz: 16,
      samples: Array.from({ length: 64 }, (_, i) => ({
        time_s: i / 16,
        value: Math.sin((2 * Math.PI * 2 * i) / 16),
      })),
    };
    await fill("spectrum-json", JSON.stringify(channel));
    await click("spectrum-run");
    assert.equal(
      JSON.parse(await p.locator("#spectrum-result").textContent()).peak
        .frequency_hz,
      2,
    );
    assert.match(
      await p.locator("#spectrum-result").textContent(),
      /NOT_COMPUTED/,
    );
    await nav("directional");
    await fill(
      "observed-surveys",
      JSON.stringify({
        source: "synthetic",
        quality: "SYNTHETIC",
        stations: [
          { md: 0, inc: 10, azi: 359 },
          { md: 30, inc: 12, azi: 1 },
        ],
      }),
    );
    await click("observed-run");
    assert.equal(
      JSON.parse(await p.locator("#observed-result").textContent())[0]
        .observed_tur_deg_30m,
      2,
    );
    await nav("dataqc");
    await click("canonical-example");
    const project = JSON.parse(
      await p.locator("#canonical-project").inputValue(),
    );
    project.wells[1].reference.vertical_reference = "MSL";
    await fill("canonical-project", JSON.stringify(project));
    await click("canonical-import");
    assert.match(await p.locator("#work-error").textContent(), /NO SCAN/);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: browser canonical mapping, source completion editor, pressure/torque table, split friction invariance, matched observations, measured spectrum, observed BUR/TUR, invalid-reference rollback and logo load",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
