/* Run with playwright-core installed and EDGE_PATH (or the standard Windows Edge path). */
const { chromium } = require("playwright-core"),
  assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs"),
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
        viewport: { width: 1280, height: 720 },
        acceptDownloads: true,
      }),
      errors = [],
      external = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) external.push(r.url());
    });
    await page.goto(
      pathToFileURL(path.resolve(__dirname, "../app/index.html")).href,
    );
    await page.locator('[data-page="overview"]').click();
    await page.waitForSelector("#evidence-axes");
    const click = (sel) => page.locator(sel).click();
    const nav = (id) => click('[data-page="' + id + '"]');
    assert.match(
      await page.locator("#evidence-axes").textContent(),
      /SYNTHETIC/,
    );
    await nav("overview");
    await click("#fixture-load");
    await nav("limits");
    await click("#demo-limit");
    assert.match(
      await page.locator("#event-register").textContent(),
      /WARNING/,
    );
    await page.locator(".eventbutton").first().click();
    assert.match(
      await page.locator("#event-inspector").textContent(),
      /LIM-01-DEMO/,
    );
    assert.equal(
      await page.evaluate(() => WellApp.snapshot().state.location.md),
      3450,
    );
    await nav("cuttings");
    await click("#psd-demo");
    await click("#psd-evaluate");
    assert.match(
      await page.locator("#psd-result").textContent(),
      /DESCRIPTIVE ONLY/,
    );
    assert.equal(await page.locator("#psd-chart polyline").count(), 1);
    assert.equal(
      await page.evaluate(() => WellApp.snapshot().state.location.to),
      2750,
    );
    await nav("directional");
    await click("#dir-demo");
    await click("#dir-evaluate");
    assert.match(
      await page.locator("#directional-result").textContent(),
      /POTENTIAL NO-CONTACT/,
    );
    assert.match(
      await page.locator("#directional-result").textContent(),
      /NOT_COMPUTED/,
    );
    await nav("bha");
    assert.equal(await page.locator("#asset-catalog img").count(), 72);
    assert.equal(
      await page
        .locator("#asset-catalog img")
        .evaluateAll(
          (images) => images.filter((x) => x.naturalWidth > 0).length,
        ),
      72,
    );
    const before = await page.evaluate(() =>
      WellApp.snapshot().state.bha.map((x) => x.name),
    );
    await page
      .locator("#component-order")
      .getByRole("button", {
        name: "Move toward surface: " + before[0],
        exact: true,
      })
      .click();
    const after = await page.evaluate(() =>
      WellApp.snapshot().state.bha.map((x) => x.name),
    );
    assert.equal(after[1], before[0]);
    await nav("td");
    await page.locator("#bit-md-v4").fill("2000");
    await click("#set-bit-md");
    assert.equal(
      await page.evaluate(
        () => WellApp.snapshot().derived.td.pooh.rows.at(-1).md,
      ),
      2000,
    );
    await nav("report");
    await click("#build-report-v4");
    await page.waitForFunction(() => document.getElementById('report-v4').textContent.includes('input_sha256'));
    assert.match(
      await page.locator("#report-v4").textContent(),
      /input_sha256/,
    );
    const dl = page.waitForEvent("download");
    await click("#exportjson");
    const download = await dl;
    const filepath = await download.path();
    const project = JSON.parse(fs.readFileSync(filepath, "utf8"));
    assert.equal(project.schema_version, "0.4.2");
    assert.equal(project.wells.length, 4);
    assert.equal(project.input_hash.length, 64);
    await nav("dataqc");
    await page.locator("#load-project-v4").setInputFiles(filepath);
    await page.waitForFunction(() => document.getElementById('data-result').textContent.includes('Imported'));
    assert.match(await page.locator("#data-result").textContent(), /Imported/);
    const refs = JSON.parse(await page.locator("#reference-json").inputValue());
    refs["OFFSET A"].vertical_reference = "MSL";
    await page.locator("#reference-json").fill(JSON.stringify(refs));
    await click("#apply-references");
    assert.match(await page.locator("#work-error").textContent(), /NO SCAN/);
    await nav("limits");
    await click("#run-limits");
    assert.match(
      await page.locator("#work-error").textContent(),
      /NOT EVALUABLE/,
    );
    await nav("dataqc");
    refs["OFFSET A"].vertical_reference = "RT";
    await page.locator("#reference-json").fill(JSON.stringify(refs));
    await click("#apply-references");
    assert.match(
      await page.locator("#data-result").textContent(),
      /Compatible/,
    );
    await nav("limits");
    await click("#run-limits");
    assert.equal(await page.locator("#work-error").textContent(), "");
    const out = path.resolve(__dirname, "../screenshots/v042");
    fs.mkdirSync(out, { recursive: true });
    for (const id of ["overview", "limits", "directional", "cuttings", "bha"]) {
      await nav(id);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(out, id + ".png"),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await nav("cuttings");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Mobile viewport must not overflow",
    );
    await page.screenshot({
      path: path.join(out, "mobile.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, [], "No browser errors");
    assert.deepEqual(
      external,
      [],
      "Offline launch must not request network resources",
    );
    console.log(
      "PASS: offline Edge launch; limits and exact linked MD; PSD and directional gates; 72 local SVGs; BHA reorder; bit depth; SHA256 report; backup round-trip; incompatible reference block/recovery; mobile layout; no page errors or external requests",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
