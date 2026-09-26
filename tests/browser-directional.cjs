const { chromium } = require("playwright-core"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
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
    const p = await b.newPage({ viewport: { width: 1600, height: 1100 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      pathToFileURL(path.resolve(__dirname, "../app/index.html")).href,
    );
    const nav = (id) => p.locator(`[data-page="${id}"]`).click();
    const shot = async (name) => {
      fs.mkdirSync(path.resolve(__dirname, "../screenshots/v07"), {
        recursive: true,
      });
      await p.evaluate(() => scrollTo(0, 0));
      await p.screenshot({
        path: path.resolve(__dirname, `../screenshots/v07/${name}.png`),
        fullPage: true,
      });
    };
    await nav("bha");
    assert.equal(await p.locator("#asset-catalog button").count(), 72);
    assert.ok(await p.locator("#component-illustration svg").count());
    await p.locator("#bha-family-search").fill("rss");
    assert.equal(await p.locator("#asset-catalog button:visible").count(), 2);
    await p.locator("#bha-family-search").fill("");
    await shot("bha");
    await nav("directional");
    await p.waitForSelector("#response-wob-chart svg");
    await shot("directional");
    const original = await p.evaluate(() => DirectionalWorkspace.snapshot());
    await p.selectOption("#response-force", "klbf");
    assert.ok(
      Math.abs(
        (await p.evaluate(
          () => DirectionalWorkspace.snapshot().settings.wobN,
        )) - 100000,
      ) < 0.01,
    );
    await p.selectOption("#response-interval", "30.48");
    const converted = await p.evaluate(() => DirectionalWorkspace.snapshot());
    assert.ok(Math.abs(converted.result.dls - original.result.dls) < 1e-9);
    await p.locator("#response-toolface").fill("180");
    await p.locator("#response-form button").click();
    assert.ok(
      (await p.evaluate(() => DirectionalWorkspace.snapshot().result.build)) <
        original.result.build,
    );
    await p.locator("#response-wob").fill("999999");
    await p.locator("#response-form button").click();
    assert.match(
      await p.locator("#response-error").textContent(),
      /outside source domain/,
    );
    await p.locator("#response-reset").click();
    const dl = p.waitForEvent("download");
    await p.locator("#response-json").click();
    const fixture = await (await dl).path();
    await p.locator("#response-import").setInputFiles(fixture);
    await p.waitForTimeout(100);
    assert.equal(await p.locator("#response-error").textContent(), "");
    await p.locator("#response-save").click();
    await p.waitForFunction(
      () => WellEvidence.project().directional_sensitivity_runs?.length === 1,
    );
    const reportDl = p.waitForEvent("download");
    await p.locator("#response-report").click();
    const report = fs.readFileSync(await (await reportDl).path(), "utf8");
    assert.match(report, /response-surface interpolation/);
    assert.ok(!report.includes("<script"));
    await nav("trajectory");
    assert.equal(
      await p
        .locator("#trajectoryplot-engineering svg")
        .getAttribute("data-depth-down"),
      "true",
    );
    await shot("trajectory");
    await nav("td");
    assert.equal(
      await p
        .locator("#tdplot-engineering svg")
        .getAttribute("data-depth-down"),
      "true",
    );
    await shot("td");
    await nav("studies");
    await shot("library");
    await p.setViewportSize({ width: 390, height: 844 });
    for (const page of ["bha", "directional", "trajectory", "studies"]) {
      await nav(page);
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 2,
        ),
        page + " mobile overflow",
      );
    }
    await shot("mobile");
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 72 technical tool types, searchable BHA design, response units and invariance, toolface, domain rejection, import, depth-down legacy tracks and mobile layouts",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
