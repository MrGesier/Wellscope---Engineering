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
    const p = await b.newPage({ viewport: { width: 1550, height: 1050 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      pathToFileURL(path.resolve(__dirname, "../app/index.html")).href,
    );
    await p.locator('[data-page="run-mechanics"]').click();
    await p.locator("#run-demo").click();
    assert.equal(await p.locator("#run-error").textContent(), "");
    const r = await p.evaluate(() => RunWorkspace.snapshot());
    assert.ok(r, r);
    assert.equal(r.result.status, "WITHIN_CONFIGURED_LIMITS");
    assert.equal(r.pull.status, "MODEL_HEADROOM");
    await p.selectOption("#run-unit", "kN");
    const c = await p.evaluate(() => RunWorkspace.snapshot());
    assert.deepEqual(c.result, r.result);
    assert.ok(
      Math.abs(
        Number(await p.locator("#run-s-bottomForceN").inputValue()) - 90,
      ) < 1e-6,
    );
    await p.selectOption("#run-unit", "tf");
    await p.locator("#run-save").click();
    assert.equal(
      await p.evaluate(() => WellEvidence.project().run_studies.length),
      1,
    );
    const reference = {
      runId: r.input.id,
      revision: r.input.revision,
      well: r.input.well,
      datum: r.input.reference,
      operation: r.input.settings.operation,
      source: "Synthetic zero-residual browser fixture",
      inputMatchConfirmed: true,
      rows: [
        {
          md: 0,
          effectiveN: r.result.topEffectiveN,
          torqueNm: r.result.surfaceTorqueNm,
        },
      ],
    };
    await p.locator("#run-reference-import").setInputFiles({
      name: "reference.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(reference)),
    });
    await p.waitForFunction(()=>document.getElementById("run-reference-result").textContent.includes("COMPARISON ONLY"));
    assert.match(
      await p.locator("#run-reference-result").textContent(),
      /COMPARISON ONLY/,
    );
    assert.equal(
      (await p.evaluate(() => RunWorkspace.snapshot())).comparison.metrics[0]
        .rmse,
      0,
    );
    await p.locator("#run-save").click();
    await p.evaluate(() => WellApp.navigate("report"));
    const backupPromise = p.waitForEvent("download");
    await p.locator("#exportjson").click();
    const backup = JSON.parse(
      fs.readFileSync(await (await backupPromise).path(), "utf8"),
    );
    assert.equal(backup.active_run.id, r.input.id);
    assert.equal(backup.run_studies.at(-1).comparison.metrics[0].rmse, 0);
    await p.evaluate((p) => WellEvidence.loadProject(p), backup);
    await p.locator('[data-page="run-mechanics"]').click();
    await p.locator("#run-load").click();
    assert.equal(
      (await p.evaluate(() => RunWorkspace.snapshot())).input.id,
      r.input.id,
    );
    const dl = p.waitForEvent("download");
    await p.locator("#run-report").click();
    const html = fs.readFileSync(await (await dl).path(), "utf8");
    assert.match(html, /tf/);
    assert.match(html, /SYNTHETIC/);
    assert.match(html, /Input snapshot/);
    fs.mkdirSync(path.resolve(__dirname, "../screenshots/v010"), {
      recursive: true,
    });
    await p.locator("#run-results").screenshot({
      path: path.resolve(__dirname, "../screenshots/v010/run-results.png"),
    });
    await p.locator("#run-b-0-allowableTorqueNm").fill("");
    assert.equal(await p.locator("#run-save").isDisabled(), true);
    await p.locator("#run-evaluate").click();
    assert.equal(
      (await p.evaluate(() => RunWorkspace.snapshot())).result.status,
      "NOT_FULLY_EVALUABLE",
    );
    await p.locator("#run-capture").click();
    await p.locator("#run-source").fill("Current project source under review");
    await p.locator("#run-evaluate").click();
    assert.equal(await p.locator("#run-error").textContent(), "");
    await p.evaluate(() => {
      const s = WellApp.snapshot().state;
      s.bha[0].mass += 1;
      WellApp.setBha(s.bha);
    });
    assert.match(await p.locator("#run-link").textContent(), /STALE/);
    assert.equal(await p.locator("#run-save").isDisabled(), true);
    assert.deepEqual(errors, []);
    console.log(
      "Run browser: units, complete/unknown limits, save, report and stale geometry passed",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
