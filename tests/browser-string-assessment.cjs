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
    const p = await b.newPage({ viewport: { width: 1500, height: 1100 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      pathToFileURL(path.resolve(__dirname, "../app/index.html")).href +
        "#string-in-hole",
    );
    assert.ok(
      (await p.locator("#sa-status").innerText()).includes(
        "NOT_FULLY_EVALUABLE",
      ),
    );
    await p.locator("#sl-mode").selectOption("soft-string");
    await p.locator("#sl-rpm").fill("60");
    await p.locator("#sl-apply").click();
    assert.equal(await p.locator("#sa-graph svg").count(), 1);
    assert.ok(
      (await p.locator("#sa-kpis").innerText()).includes("Not evaluated"),
    );
    await p.locator("#sa-demo-material").click();
    assert.ok(
      !(await p.locator("#sa-kpis").innerText()).includes("Not evaluated"),
    );
    const material = await p.evaluate(
      () => StringInHole.snapshot().input.components[0],
    );
    assert.equal(material.nu, 0.3);
    assert.ok(material.G > 0);
    assert.ok(material.materialSource.includes("SYNTHETIC"));
    await p.locator("#sa-table button").last().click();
    await p.locator("#sl-workspace summary").last().click();
    await p.locator("#sl-body").selectOption("annular_tube");
    await p.locator("#sl-tool-yieldPa").fill("1");
    await p.locator("#sl-tool-designFactor").fill("1.5");
    await p.locator("#sl-tool-source").fill("Synthetic low limit test");
    await p.locator("#sl-tool-G").fill("80");
    await p.locator("#sl-tool-nu").fill("0.3");
    await p.locator("#sl-save").click();
    assert.ok((await p.locator("#sa-status").innerText()).includes("EXCEEDED"));
    assert.ok(
      (await p.locator("#sa-local").innerText()).includes("Drill pipe"),
    );
    assert.ok(await p.locator("#sa-export").isEnabled());
    await p
      .locator("#sa-workspace")
      .screenshot({ path: "screenshots/v010/string-combined-mechanics.png" });
    await p.locator("#si-depth").fill("3700");
    assert.equal(await p.locator("#sa-graph svg").count(), 0);
    assert.ok(!(await p.locator("#sa-export").isEnabled()));
    await p.locator("#si-calc").click();
    assert.equal(await p.locator("#sa-graph svg").count(), 1);
    await p.setViewportSize({ width: 420, height: 900 });
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 2,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Browser combined assessment, ratings/material conversion, selection, stale gating and mobile passed",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
