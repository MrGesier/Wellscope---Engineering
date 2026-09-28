const { chromium } = require("playwright-core"),
  assert = require("node:assert/strict"),
  path = require("path"),
  { pathToFileURL } = require("url");
(async () => {
  const b = await chromium.launch({
    executablePath:
      process.env.EDGE_PATH ||
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const p = await b.newPage({ viewport: { width: 1450, height: 1000 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      pathToFileURL(path.resolve(__dirname, "../app/index.html")).href,
    );
    assert.ok(await p.locator("#well-setup").isVisible());
    assert.equal(await p.locator("#navigation button").count(), 6);
    assert.equal(await p.locator("#advanced-navigation").count(), 0);
    await p.locator("#wf-demo").click();
    await p.locator('[data-wf-step="2"]').click();
    await p.locator("#wf-prepare").click();
    await p.waitForFunction(() =>
      document.getElementById("well-dashboard").classList.contains("active"),
    );
    assert.equal(await p.locator("#wf-cards .wf-value").count(), 11);
    assert.equal(await p.locator("#crumb").textContent(), "SECTION DASHBOARD");
    const cacheCheck = await p.evaluate(() => {
      const original = DrillingProgram.sample;
      let calls = 0;
      DrillingProgram.sample = (...args) => {
        calls++;
        return original(...args);
      };
      const field = document.getElementById("wf-md");
      for (const md of [3311, 3312, 3311]) {
        field.value = md;
        field.dispatchEvent(new Event("input"));
      }
      DrillingProgram.sample = original;
      return calls;
    });
    assert.equal(
      cacheCheck,
      2,
      "revisiting depth reuses the same frozen calculation",
    );
    await p.evaluate(() => {
      const slider = document.getElementById("wf-depth");
      for (const value of [3320, 3340, 3360]) {
        slider.value = value;
        slider.dispatchEvent(new Event("input"));
      }
    });
    await p.waitForFunction(
      () => document.getElementById("wf-md").value === "3360",
    );

    assert.match(await p.locator("#wf-cards").textContent(), /Pickup/);
    await p.locator("#wf-md").fill("3300");
    assert.match(await p.locator("#wf-governing").textContent(), /ROP/);
    assert.match(await p.locator("#wf-formation").textContent(), /Sandstone/);
    await p.locator("#wf-section-map [data-section-md]").last().press("Enter");
    assert.match(await p.locator("#wf-formation").textContent(), /Limestone/);
    const before = await p.evaluate(
      () => DrillingProgramWorkspace.snapshot().report.programme,
    );
    await p.locator("#wf-view3d").click();
    assert.ok(
      await p.evaluate(() => !!DrillingProgramWorkspace.snapshot().report),
    );
    await p.evaluate(() => WellWorkflow.open("well-dashboard"));
    await p.locator("#wf-edit").click();
    await p.locator('[data-wf-step="2"]').click();
    await p.locator("#wf-rpm").fill("110");
    await p.locator("#wf-prepare").click();
    await p.waitForFunction(() =>
      document.getElementById("well-dashboard").classList.contains("active"),
    );
    const after = await p.evaluate(
      () => DrillingProgramWorkspace.snapshot().report.programme,
    );
    assert.deepEqual(
      after.intervals,
      before.intervals,
      "target edit retains sourced intervals and associated conditions",
    );
    assert.equal(after.plan.rpm, 110);
    assert.ok(await p.locator("#wf-assembly .connected-assembly").count());
    await p.locator("#wf-edit").click();
    await p.locator('[data-wf-step="0"]').click();
    await p.locator("#wf-name").fill("Small user well");
    assert.equal(await p.locator("#wf-board").isVisible(), false);
    await p.locator("#wf-source").fill("User fixture");
    await p.locator("#wf-survey").fill("md,inc,azi\n0,0,0\n120,5,0");
    await p
      .locator("#wf-architecture")
      .fill("from_m,to_m,diameter_mm,kind\n0,120,216,OPEN");
    await p
      .locator("#wf-lithology")
      .fill("from_m,to_m,lithology,source\n0,120,Sandstone,Test");
    await p.locator('[data-wf-step="1"]').click();
    await p.locator("#wf-mode").selectOption("starter");
    await p.locator("#wf-mwd").check();
    await p.locator('[data-wf-step="2"]').click();
    await p
      .locator("#wf-samples")
      .evaluate((el) => (el.closest("details").open = true));
    await p.locator("#wf-samples").fill("3");
    await p.locator("#wf-prepare").click();
    await p.waitForFunction(
      () => !document.getElementById("wf-prepare").disabled,
      {},
      { timeout: 90000 },
    );
    assert.equal(await p.locator("#wf-error").textContent(), "");
    assert.ok(await p.locator("#well-dashboard").isVisible());
    assert.match(await p.locator("#wf-limit-source").textContent(), /missing/);
    const state = await p.evaluate(() => DrillingProgramWorkspace.snapshot());
    assert.equal(state.draft.study.quality, "SYNTHETIC");
    assert.ok(state.draft.selection.depths.length === 3);
    assert.ok(
      state.draft.study.components.some((b) => b.capabilities.includes("mwd")),
    );
    await p.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: focused navigation, prepare to depth dashboard, layer selection, stale gating, actual starter comparison and mobile",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
