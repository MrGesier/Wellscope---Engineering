const { chromium } = require("playwright-core"),
  assert = require("node:assert/strict"),
  { pathToFileURL } = require("url"),
  path = require("path");
(async () => {
  const b = await chromium.launch({
    executablePath:
      process.env.EDGE_PATH ||
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 1100 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      pathToFileURL(path.resolve(__dirname, "../app/index.html")).href +
        "#string-in-hole",
    );
    for(const summary of await p.locator("#bha-static details.workflow-fold > summary").all()) await summary.click();
    await p.locator("#sd-adaptive").check();
    await p.locator("#sd-remesh").click();
    assert.ok(
      (await p.evaluate(() => StringInHole.snapshot())).result.adaptive,
    );
    assert.ok(
      (await p.evaluate(() => StringDesign.snapshot())).current.meshes > 0,
    );
    await p.locator("#sd-keep").click();
    const A = await p.evaluate(() => StringDesign.snapshot().baseline);
    const beforeCamera = await p.evaluate(
      () => StringDesign.snapshot().current.position,
    );
    await p.locator("#sd-current canvas").scrollIntoViewIfNeeded();
    const rect = await p.locator("#sd-current canvas").boundingBox();
    await p.mouse.move(rect.x + rect.width * 0.5, rect.y + 240);
    await p.mouse.down();
    await p.mouse.move(rect.x + rect.width * 0.5 + 80, rect.y + 260, {
      steps: 8,
    });
    await p.mouse.up();
    const cameras = await p.evaluate(() => StringDesign.snapshot());
    assert.notDeepEqual(cameras.current.position, beforeCamera);
    assert.ok(
      cameras.current.position.every(
        (v, i) => Math.abs(v - cameras.baselineCamera.position[i]) < 1e-9,
      ),
    );
    assert.deepEqual(
      (await p.evaluate(() => StringInHole.snapshot())).result,
      A.result,
    );

    assert.ok(
      (await p.evaluate(() => StringDesign.snapshot())).comparisonVisible,
    );
    await p.locator("#si-tools button").nth(6).click();
    await p.locator("#sd-workspace summary").click();
    await p.locator("#sd-edit-od").fill("200");
    await p.locator("#sd-edit-contactOD").fill("210");
    await p.locator("#sd-edit-source").fill("SYNTHETIC design B sensitivity");
    await p.locator("#sd-apply").click();
    const B = await p.evaluate(() => StringInHole.snapshot());
    assert.ok(B.result);
    assert.equal(B.input.components[6].contactOD, 0.21);
    assert.deepEqual(
      await p.evaluate(() => StringDesign.snapshot().baseline),
      A,
    );
    assert.notDeepEqual(B.result.rows, A.result.rows);
    assert.ok(
      (await p.evaluate(() => StringDesign.snapshot())).comparisonVisible,
    );
    await p.selectOption("#sd-field", "stress");
    await p.selectOption("#sd-bore", "transparent");
    assert.deepEqual(
      (await p.evaluate(() => StringInHole.snapshot())).result,
      B.result,
    );
    await p.locator("#sd-converge").click();
    await p.waitForFunction(
      () =>
        document
          .getElementById("sd-convergence")
          .textContent.startsWith("Refinement:"),
      { timeout: 20000 },
    );
    assert.match(
      await p.locator("#sd-legend").textContent(),
      /Shared stress scale/,
    );
    await p.locator("#sd-workspace").screenshot({
      path: path.resolve(
        __dirname,
        "../screenshots/v010/design-comparison.png",
      ),
    });
    await p.locator("#si-depth").fill("3780");
    assert.equal(
      (await p.evaluate(() => StringInHole.snapshot())).result,
      null,
    );
    assert.ok(
      !(await p.evaluate(() => StringDesign.snapshot())).comparisonVisible,
    );
    await p.locator("#si-calc").click();
    assert.ok(
      !(await p.evaluate(() => StringDesign.snapshot())).comparisonVisible,
    );
    assert.match(
      await p.locator("#sd-compare").textContent(),
      /conditions differ/,
    );
    await p.locator("#sd-restore").click();
    assert.ok(
      (await p.evaluate(() => StringDesign.snapshot())).comparisonVisible,
    );
    await p.setViewportSize({ width: 480, height: 900 });
    const width = await p
      .locator("#sd-section")
      .evaluate((el) => el.getBoundingClientRect().width);
    assert.ok(width <= 260);
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "WebGL, adaptive mesh, immutable A/B, editing, matched conditions, stress scales, refinement and mobile section passed",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
