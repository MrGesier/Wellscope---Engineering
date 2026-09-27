const { chromium } = require("playwright-core"),
  assert = require("node:assert/strict"),
  { pathToFileURL } = require("url"),
  path = require("path");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.EDGE_PATH ||
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const p = await browser.newPage({
        viewport: { width: 1450, height: 1000 },
      }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      pathToFileURL(path.resolve(__dirname, "../app/index.html")).href,
    );
    assert.equal(
      await p.locator("#advanced-navigation").getAttribute("open"),
      null,
    );
    assert.equal(
      await p.locator('[data-page="operating-windows"]').isVisible(),
      false,
    );
    for (const id of [
      "bha-quick",
      "string-in-hole",
      "sp-workspace",
      "sl-workspace",
      "sa-workspace",
    ]) {
      await p.locator(`[data-route="${id}"]`).click();
      assert.ok(await p.locator("#" + id).isVisible());
      assert.equal(
        await p.locator(`[data-route="${id}"]`).getAttribute("aria-current"),
        "page",
      );
    }
    await p.locator('[data-page="bha"]').click();
    const geometry = await p
      .locator("#connected-bha .connected-assembly")
      .evaluate((svg) => {
        const parts = [
          ...svg.querySelectorAll("g[data-assembly-component] > svg"),
        ];
        return parts.slice(1).map((part, i) => {
          const previous = parts[i],
            aBox = previous.viewBox.baseVal,
            bBox = part.viewBox.baseVal;
          const a = new DOMPoint(aBox.x, aBox.y + aBox.height).matrixTransform(
            previous.getScreenCTM(),
          );
          const b = new DOMPoint(bBox.x, bBox.y).matrixTransform(
            part.getScreenCTM(),
          );
          return Math.abs(a.y - b.y);
        });
      });
    assert.ok(
      geometry.every((gap) => gap < 1),
      "Illustrated component bodies must meet at their boundaries",
    );
    const count = await p.evaluate(() => WellApp.snapshot().state.bha.length);
    assert.equal(
      await p.locator("#connected-bha .assembly-coupling").count(),
      count - 1,
    );
    assert.equal(
      await p
        .locator("#connected-bha [data-assembly-component]")
        .first()
        .getAttribute("data-assembly-component"),
      String(count - 1),
    );
    await p
      .locator('#connected-bha [data-assembly-component="2"]')
      .press("Enter");
    assert.equal(
      await p
        .locator('#connected-bha [data-assembly-component="2"]')
        .getAttribute("aria-pressed"),
      "true",
    );
    const selected = await p.evaluate(
      () => WellApp.snapshot().state.bha[2].name,
    );
    assert.equal(
      await p.locator("#component-fields input").first().inputValue(),
      selected,
    );
    const before = await p.evaluate(() =>
      WellApp.snapshot().state.bha.map((x) => x.name),
    );
    await p
      .getByRole("button", {
        name: "Move toward surface: " + selected,
        exact: true,
      })
      .click();
    assert.equal(
      await p
        .locator('#connected-bha [data-assembly-component="3"]')
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(
      (
        await p.evaluate(() => WellApp.snapshot().state.bha.map((x) => x.name))
      )[3],
      before[2],
    );
    await p.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    );
    await p.locator("#advanced-navigation > summary").click();
    await p.locator('[data-page="operating-windows"]').click();
    assert.ok(await p.locator("#window-example").isVisible());
    assert.deepEqual(errors, []);
    console.log(
      "PASS: workflow navigation, legacy disclosure, connected component selection/reorder and mobile",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
