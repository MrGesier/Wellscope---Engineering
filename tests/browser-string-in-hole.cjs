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
  });
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 1100 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      pathToFileURL(path.resolve(__dirname, "../app/index.html")).href +
        "#string-in-hole",
    );
    assert.equal(await p.locator("#si-tools button").count(), 12);
    const before = await p.evaluate(() => StringInHole.snapshot());
    assert.equal(before.result.rows.at(-1).md, 3800);
    await p.locator("#si-angle").fill("95");
    assert.deepEqual(
      (await p.evaluate(() => StringInHole.snapshot())).result,
      before.result,
    );
    await p.locator("#si-up").click();
    await p.waitForTimeout(850);
    await p.locator("#si-stop").click();
    const up = await p.evaluate(() => StringInHole.snapshot());
    assert.ok(up.input.bitMD < 3800);
    await p.locator("#si-down").click();
    await p.waitForTimeout(850);
    await p.locator("#si-stop").click();
    assert.ok(
      (await p.evaluate(() => StringInHole.snapshot())).input.bitMD >
        up.input.bitMD,
    );
    await p.locator("#si-tools button").nth(11).click();
    assert.match(await p.locator("#si-detail").textContent(), /Drill ?pipe/i);
    await p.locator("#si-depth").fill("9000");
    assert.equal(
      (await p.evaluate(() => StringInHole.snapshot())).result,
      null,
    );
    await p.locator("#si-calc").click();
    assert.match(
      await p.locator("#si-status").textContent(),
      /outside declared range/,
    );
    await p.locator("#si-demo").click();
    await p.setViewportSize({ width: 480, height: 900 });
    assert.equal(await p.locator("#si-tools button").count(), 12);
    assert.deepEqual(errors, []);
    console.log(
      "Whole-string browser travel, selection, camera invariance and invalidation passed",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
