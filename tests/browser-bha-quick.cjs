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
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1450, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      pathToFileURL(path.resolve(__dirname, "../app/index.html")).href +
        "#string-in-hole",
    );
    assert.equal(await page.locator("#bha-quick").count(), 1);
    await page.evaluate(() => {
      const b = {
        length: 20,
        od: 0.1,
        id: 0.08,
        mass: 22,
        E: 210e9,
        contactOD: 0.1,
        source: "Analytic",
      };
      StringInHole.applyStudy({
        source: "Browser analytic fixture",
        quality: "SYNTHETIC",
        survey: [
          { md: 0, inc: 0, azi: 0 },
          { md: 100, inc: 0, azi: 0 },
        ],
        sections: [
          { from: 0, to: 100, diameter: 0.3, kind: "OPEN", source: "Analytic" },
        ],
        components: [
          "bit",
          "drill-collar",
          "stabilizer",
          "jar",
          "accelerator",
          "drill-pipe",
        ].map((type) => ({ ...b, type, name: type })),
        bitMD: 100,
        stepM: 5,
        tensionN: 0,
        rho: 1200,
        axial: {
          mode: "soft-string",
          source: "Analytic",
          stepM: 5,
          muOpen: 0.3,
          muCased: 0.2,
          bottomForceN: 0,
          bottomTorqueNm: 0,
          axialSpeedMps: 0.1,
          rpm: 60,
          blockN: 0,
        },
      });
    });
    await page.locator("#sp-capture").click();
    await page.locator("#sp-from").fill("60");
    await page.locator("#sp-count").fill("2");
    await page.locator("#sp-tool").selectOption("2");
    await page.locator("#sp-run").click();
    await page.waitForFunction(
      () => !document.getElementById("sp-export").disabled,
    );
    assert.equal(await page.locator("#sp-results tbody tr").count(), 6);
    await page.locator('#sp-results [data-v="1"]').first().click();
    assert.equal(
      await page.evaluate(() => StringInHole.snapshot().input.bitMD),
      60,
    );
    await page.locator("#sp-from").fill("50");
    await page.locator("#sp-from").blur();
    assert.equal(await page.locator("#sp-export").isDisabled(), true);
    await page.locator("#string-in-hole > button").first().click();
    await page.locator("#bq-capture").click();
    await page.locator("#bq-from").fill("60");
    await page.locator("#bq-to").fill("100");
    await page.locator("#bq-count").fill("2");
    await page.locator("#bq-run").click();
    await page.waitForFunction(
      () => !document.getElementById("bq-export").disabled,
    );
    assert.ok(
      (await page.locator("#bq-results").innerText()).includes(
        "Pareto candidate",
      ),
    );
    assert.equal(
      await page.locator('#bq-charts svg[data-depth-down="true"]').count(),
      4,
    );
    assert.ok(
      (await page.locator("#bq-detail").innerText()).includes(
        "missing candidate-specific",
      ),
    );
    // Export contains frozen inputs and independently inspectable candidate geometry.
    const download = page.waitForEvent("download");
    await page.locator("#bq-export").click();
    const file = await download;
    assert.equal(file.suggestedFilename(), "wellscope-bha-predesign.json");
    await page.locator("#bq-gamma").check();
    assert.equal(await page.locator("#bq-export").isDisabled(), true);
    await page.locator("#bq-run").click();
    await page.waitForFunction(
      () => !document.getElementById("bq-export").disabled,
    );
    assert.ok(
      !(await page.locator("#bq-results").innerText()).includes(
        "Pareto candidate",
      ),
    );
    await page.locator("#bq-gamma").uncheck();
    const bundle = await page.evaluate(() => ({
      schema: "wellscope-candidate-responses/1",
      entries: [
        {
          study: StringInHole.snapshot().input,
          surface: DirectionalResponse.demo(),
          settings: {
            mode: "rotating",
            wobN: 40000,
            activation: 0,
            toolface: 0,
            inclination: 0,
          },
        },
      ],
    }));
    await page.locator("#bq-response").setInputFiles({
      name: "responses.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(bundle)),
    });
    await page.waitForFunction(() =>
      document
        .getElementById("bq-status")
        .textContent.includes("associations loaded"),
    );
    await page.locator("#bq-run").click();
    await page.waitForFunction(
      () => !document.getElementById("bq-export").disabled,
    );
    assert.equal(await page.locator("#bq-charts svg").count(), 6);
    assert.ok(
      (await page.locator("#bq-detail").innerText()).includes("SYNTHETIC"),
    );
    await page.locator("#bq-n").fill("200");
    await page.locator("#bq-run").click();
    await page.waitForFunction(
      () => !document.getElementById("bq-export").disabled,
    );
    assert.ok(
      (await page.locator("#bq-results").innerText()).includes(
        "TARGET MISMATCH",
      ),
    );
    assert.ok(
      !(await page.locator("#bq-results").innerText()).includes(
        "Pareto candidate",
      ),
    );
    assert.ok(
      (await page.locator(".bq-diagnostics").innerText()).includes(
        "misses the target",
      ),
    );
    const duplicate = {
      ...bundle,
      entries: [bundle.entries[0], bundle.entries[0]],
    };
    await page
      .locator("#bq-response")
      .setInputFiles({
        name: "duplicate.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(duplicate)),
      });
    await page.waitForFunction(() =>
      document
        .getElementById("bq-status")
        .textContent.includes("Duplicate response"),
    );
    assert.equal(await page.locator("#bq-export").isDisabled(), false);
    const expected = await page.evaluate(
      () => StringPhase.sample(StringInHole.snapshot().input, 60).peakBending,
    );
    await page
      .locator('#bq-inspect [data-field="peakBending"]')
      .first()
      .click();
    const selected = await page.evaluate(() => {
      const s = StringInHole.snapshot();
      return { component: s.selected, md: s.inspectMD };
    });
    assert.equal(selected.component, expected.component);
    assert.ok(Math.abs(selected.md - expected.md) < 0.01);
    await page.locator("#string-in-hole > button").first().click();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.locator("#bq-run").isVisible());
    assert.deepEqual(errors, []);
    console.log("Phase + quick design browser flows passed");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
