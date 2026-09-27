const { chromium } = require("playwright-core"),
  assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs"),
  { pathToFileURL } = require("node:url");
(async () => {
  const b = await chromium.launch({
    executablePath:
      process.env.EDGE_PATH ||
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const page = await b.newPage({ viewport: { width: 1600, height: 1100 } }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      pathToFileURL(path.resolve(__dirname, "../app/index.html")).href +
        "#bha-static",
    );
    assert.equal(await page.locator("#bs3-tools button").count(), 6);
    const before = await page.evaluate(
      () => BhaStaticWorkspace.snapshot().result,
    );
    await page.selectOption("#bs3-colour", "bendingPa");
    await page.selectOption("#bs3-scale", "16");
    await page.locator("#bs3-mesh").uncheck();
    assert.deepEqual(
      await page.evaluate(() => BhaStaticWorkspace.snapshot().result),
      before,
    );
    await page.locator("#bs3-tools button").nth(3).click();
    assert.equal(
      await page.evaluate(() => BhaSolidWorkspace.snapshot().selected),
      3,
    );
    await page.locator("#bs3-mesh").check();
    await page.selectOption("#bs3-scale", "8");
    await page.selectOption("#bs3-colour", "tools");
    await page.locator("#bs3-depth").fill("2995");
    await page.locator("#bs3-move").click();
    assert.equal(
      await page.evaluate(() => BhaStaticWorkspace.snapshot().input.bitMD),
      2995,
    );
    assert.ok(await page.evaluate(() => BhaStaticWorkspace.snapshot().result));
    await page.locator("#bs3-depth").fill("3000");
    await page.locator("#bs3-play").click();
    await page.waitForFunction(() => !BhaSolidWorkspace.snapshot().playing);
    assert.match(await page.locator("#bs3-status").textContent(), /12\/12/);
    assert.equal(
      await page.evaluate(() => BhaStaticWorkspace.snapshot().input.bitMD),
      3000,
    );
    await page.locator("#bs3-depth").fill("4000");
    await page.locator("#bs3-move").click();
    assert.equal(
      await page.evaluate(() => BhaSolidWorkspace.snapshot().triangles),
      0,
    );
    assert.match(await page.locator("#bs3-status").textContent(), /cover/);
    await page.locator("#bs-mock-import").click();
    fs.mkdirSync(path.resolve(__dirname, "../screenshots/v010"), {
      recursive: true,
    });
    await page
      .locator("#bs3-panel")
      .screenshot({
        path: path.resolve(
          __dirname,
          "../screenshots/v010/bha-component-mesh.png",
        ),
      });
    const camera = await page.evaluate(() => BhaSolidWorkspace.snapshot());
    await page.locator("#bs3-canvas").scrollIntoViewIfNeeded();
    const box = await page.locator("#bs3-canvas").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 90,
      box.y + box.height / 2 + 35,
    );
    await page.mouse.up();
    assert.notEqual(
      await page.evaluate(() => BhaSolidWorkspace.snapshot().yaw),
      camera.yaw,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: component mesh, view invariance, selection, depth solve/playback, invalidation, camera and mobile",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
