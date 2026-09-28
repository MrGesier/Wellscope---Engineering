const { chromium } = require("playwright-core"),
  assert = require("node:assert/strict"),
  path = require("path"),
  { pathToFileURL } = require("url");
(async () => {
  const b = await chromium.launch({
    executablePath:
      process.env.EDGE_PATH ||
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const p = await b.newPage({ viewport: { width: 1450, height: 1000 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      pathToFileURL(path.resolve(__dirname, "../app/index.html")).href +
        "#drilling-program",
    );
    assert.ok(await p.locator("#drilling-program").isVisible());
    await p.locator("#dp-demo").click();
    await p.locator("#dp-run").click();
    await p.waitForFunction(() => !!DrillingProgramWorkspace.snapshot().report);
    assert.equal(await p.locator("#dp-error").textContent(), "");
    assert.match(await p.locator("#dp-results").textContent(), /EXCEEDED/);
    assert.equal(await p.locator("#dp-results .dp-charts article").count(), 11);
    assert.ok((await p.locator("#dp-results .entered-envelope").count()) > 0);
    assert.ok(
      (await p
        .locator('#dp-results polyline[stroke-dasharray="6 4"]')
        .count()) > 0,
    );
    const snap = await p.evaluate(() => DrillingProgramWorkspace.snapshot());
    assert.equal(snap.report.segments.length, 3);
    await p.locator("#dp-save").click();
    assert.equal(
      await p.evaluate(() => WellEvidence.project().drilling_program.schema),
      "wellscope-drilling-program/1",
    );
    await p.locator("#dp-plan-flowLpm").fill("1300");
    assert.equal(await p.locator("#dp-report").isDisabled(), true);
    await p.locator("#dp-run").click();
    await p.waitForFunction(() => !!DrillingProgramWorkspace.snapshot().report);
    assert.equal(
      await p.evaluate(
        () =>
          DrillingProgramWorkspace.snapshot().report.segments[0].rows[0]
            .hydraulics.status,
      ),
      "CONDITIONS_MISMATCH",
    );
    await p.locator("#dp-load").click();
    await p.locator("#dp-run").click();
    await p.waitForFunction(() => !!DrillingProgramWorkspace.snapshot().report);
    const reportBefore = await p.evaluate(() =>
      JSON.stringify(DrillingProgramWorkspace.snapshot().report),
    );
    await p.locator("#dp-log-file").setInputFiles({
      name: "bad.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("from_m,to_m,lithology,source\n90,10,Shale,S"),
    });
    assert.match(await p.locator("#dp-error").textContent(), /positive length/);
    assert.equal(
      await p.evaluate(() =>
        JSON.stringify(DrillingProgramWorkspace.snapshot().report),
      ),
      reportBefore,
    );
    await p.selectOption("#dp-interval", "1");
    await p.locator("#dp-lith").fill("Test shale");
    await p.selectOption("#dp-interval", "2");
    assert.equal(
      await p.evaluate(
        () => DrillingProgramWorkspace.snapshot().draft.intervals[1].lithology,
      ),
      "Test shale",
    );
    await p.evaluate(() => {
      const d = DrillingProgramWorkspace.snapshot().draft;
      d.intervals[0].response = {
        study: structuredClone(d.study),
        flowLpm: d.plan.flowLpm,
        mudKgM3: d.plan.mudKgM3,
        rpm: d.plan.rpm,
        surface: DirectionalResponse.demo(),
        settings: { mode: "rss", activation: 1, toolface: 0 },
      };
      DrillingProgramWorkspace.load(d);
    });
    await p.locator("#dp-run").click();
    await p.waitForFunction(() => !!DrillingProgramWorkspace.snapshot().report);
    assert.match(
      await p.locator("#dp-results").textContent(),
      /dls max · entered bound/,
    );
    await p.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: terracotta programme, visible bounds, sourced pump mismatch, stale gating, save/load, failed import preservation and mobile",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
