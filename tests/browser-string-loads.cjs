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
    const p = await b.newPage({ viewport: { width: 1500, height: 1000 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      pathToFileURL(path.resolve(__dirname, "../app/index.html")).href +
        "#string-in-hole",
    );
    for(const summary of await p.locator("#bha-static details.workflow-fold > summary").all()) await summary.click();
    await p.locator("#sl-mode").selectOption("soft-string");
    await p.locator("#sl-apply").click();
    let snap = await p.evaluate(() => StringInHole.snapshot());
    assert.ok(snap.result?.axial, await p.locator("#si-status").textContent());
    assert.ok(await p.locator("#si-tension").isDisabled());
    assert.ok(
      (await p.locator("#sl-summary").textContent()).includes(
        "NOT_FULLY_EVALUABLE",
      ),
    );
    assert.equal(await p.locator("#sl-chart svg").count(), 1);
    await p
      .locator("#sl-workspace")
      .screenshot({ path: "screenshots/v010/string-distributed-loads.png" });
    await p.locator("#sd-keep").click();
    const before = snap.result.axial.hookN;
    await p.locator("#sl-muOpen").fill("0.6");
    assert.ok(
      (await p.locator("#sl-draft").textContent()).includes("Unapplied"),
    );
    await p.locator("#sl-apply").click();
    snap = await p.evaluate(() => StringInHole.snapshot());
    assert.ok(snap.result.axial.hookN > before);
    assert.equal(
      await p.evaluate(() => StringDesign.snapshot().comparisonVisible),
      false,
    );
    await p.locator("#sl-rigLimitN").fill("1");
    await p.locator("#sl-apply").click();
    assert.ok(
      (await p.locator("#sl-summary").textContent()).includes("EXCEEDED"),
    );
    await p.locator("#sl-workspace summary").last().click();
    await p.locator("#sl-tool-allowableTensionN").fill("2");
    await p.locator("#sl-tool-source").fill("Synthetic test rating");
    await p.locator("#sl-save").click();
    assert.equal(
      (await p.evaluate(() => StringInHole.snapshot())).input.components[0]
        .allowableTensionN,
      2 * 9806.65,
    );
    await p.locator("#si-down").click();
    assert.ok(
      (await p.locator("#si-status").textContent()).includes("Set axial speed"),
    );
    await p.locator("#sl-mode").selectOption("constant");
    await p.locator("#sl-apply").click();
    assert.equal(
      (await p.evaluate(() => StringInHole.snapshot())).result.axial,
      null,
    );
    assert.ok(await p.locator("#si-tension").isEnabled());
    assert.equal(await p.locator("#sl-chart svg").count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      "Browser distributed loads, tf conversion, limit priority, A/B mismatch and movement direction passed",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
