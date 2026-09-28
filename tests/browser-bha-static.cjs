const { chromium } = require("playwright-core"),
  assert = require("node:assert/strict"),
  path = require("node:path"),
  { pathToFileURL } = require("node:url");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.EDGE_PATH ||
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1550, height: 1050 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      pathToFileURL(path.resolve(__dirname, "../app/index.html")).href,
    );
    await page.evaluate(id => WellWorkflow.open(id), "bha-static");
    for(const summary of await page.locator("#bha-static details.workflow-fold > summary").all()) await summary.click();
    const imported = await page.evaluate(() => BhaStaticWorkspace.snapshot());
    assert.equal(imported.input.components.length, 6);
    assert.equal(imported.input.sections.length, 4);
    assert.match(imported.input.source, /SYNTHETIC mock manual import/);
    assert.ok(imported.result);
    await page.locator("#bs-name").fill("Pending import replacement");
    await page
      .locator("#bs-import")
      .setInputFiles(
        path.resolve(
          __dirname,
          "../app/assets/examples/bha-static-training.json",
        ),
      );
    await page.waitForFunction(
      () => BhaStaticWorkspace.snapshot().result !== null,
    );
    assert.deepEqual(
      await page.evaluate(() => BhaStaticWorkspace.snapshot().result),
      imported.result,
    );
    await page.locator("#bs-demo").click();
    assert.equal(await page.locator("#bs-error").textContent(), "");
    let s = await page.evaluate(() => BhaStaticWorkspace.snapshot());
    assert.ok(s.result.contacts > 0);
    await page.selectOption("#bs-units", "kN");
    await page.locator("#bs-calc").click();
    assert.equal(await page.locator("#bs-error").textContent(), "");
    const units = await page.evaluate(() => BhaStaticWorkspace.snapshot());
    assert.ok(Math.abs(units.result.maxOffset - s.result.maxOffset) < 1e-10);
    await page.selectOption("#bs-units", "tf");
    await page.locator("#bs-calc").click();
    await page.locator("#bs-baseline").click();
    await page.locator("#bs-wob").fill("2");
    assert.equal(
      await page.evaluate(() => BhaStaticWorkspace.snapshot().result),
      null,
    );
    await page.locator("#bs-calc").click();
    assert.equal(await page.locator("#bs-error").textContent(), "");
    assert.ok(
      await page.evaluate(() => BhaStaticWorkspace.snapshot().baseline),
    );
    const beforeView = await page.evaluate(
      () => BhaStaticWorkspace.snapshot().result,
    );
    assert.match(
      await page.locator("#bs-legend").textContent(),
      /shared current \/ A/,
    );
    const commonMax = await page.evaluate(() => {
      const s = BhaStaticWorkspace.snapshot();
      return Math.max(
        ...s.result.rows.map((r) => r.bendingPa / 1e6),
        ...s.baseline.result.rows.map((r) => r.bendingPa / 1e6),
      ).toFixed(3);
    });
    assert.ok(
      (await page.locator("#bs-legend").textContent()).includes(commonMax),
    );
    await page.selectOption("#bs-field", "momentNm");
    assert.match(await page.locator("#bs-legend").textContent(), /tf·m/);
    await page.locator("#bs-mesh").uncheck();
    await page.locator("#bs-arrows").uncheck();
    assert.deepEqual(
      await page.evaluate(() => BhaStaticWorkspace.snapshot().result),
      beforeView,
    );
    await page.locator("#bs-mesh").check();
    await page.locator("#bs-arrows").check();
    await page.locator("#bs-clear").click();
    await page.selectOption("#bs-field", "bendingPa");
    const point = await page.evaluate(() => {
      const s = BhaStaticWorkspace.snapshot(),
        a = s.result.rows[8],
        b = s.result.rows[9],
        x = (a.x + b.x) / 2,
        y = (a.u[0] + b.u[0]) / 2,
        z = (a.u[1] + b.u[1]) / 2,
        scale = 800 / s.input.length,
        mag = 25;
      return [
        120 + x * scale + Math.sin(0.45) * y * scale * mag * 0.45,
        215 + (Math.cos(0.45) * y + Math.sin(0.45) * z) * scale * mag,
      ];
    });
    await page.locator("#bs-canvas").scrollIntoViewIfNeeded();
    const box = await page.locator("#bs-canvas").boundingBox();
    await page.locator("#bs-canvas").click({
      position: {
        x: (point[0] * box.width) / 1100,
        y: (point[1] * box.height) / 430,
      },
    });
    assert.match(
      await page.locator("#bs-inspect").textContent(),
      /Current · element 8/,
    );
    await page.locator("#bs-save").click();
    await page.locator("#bs-load").click();
    assert.equal(await page.locator("#bs-error").textContent(), "");
    await page.locator("#bs-wob").fill("100");
    await page.locator("#bs-calc").click();
    assert.match(await page.locator("#bs-error").textContent(), /UNSTABLE/);
    assert.equal(
      await page.evaluate(() => BhaStaticWorkspace.snapshot().result),
      null,
    );
    await page.locator("#bs-demo").click();
    await page.locator("#bs-canvas").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.resolve(__dirname, "../screenshots/bha-static.png"),
    });
    assert.deepEqual(errors, []);
    console.log("Static architecture/browser flow passed");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
