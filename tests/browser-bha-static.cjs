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
    await page.locator('[data-page="bha-static"]').click();
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
