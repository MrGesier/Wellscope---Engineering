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
    await p.locator('[data-page="operating-windows"]').click();
    await p.selectOption("#window-unit", "kN");
    assert.equal(await p.locator("#window-error").textContent(), "");
    await p.locator("#window-example").click();
    assert.equal(await p.locator("#window-error").textContent(), "");
    const snap = await p.evaluate(() => WindowWorkspace.snapshot());
    assert.ok(snap.result.cells.length === 1525);
    assert.ok(snap.result.windows.length > 0);
    await p.selectOption("#window-unit", "tf");
    const converted = await p.evaluate(() => WindowWorkspace.snapshot());
    assert.deepEqual(converted.result, snap.result);
    assert.ok(
      Math.abs(
        Number(await p.locator("#win-analysis-selectedWobN").inputValue()) -
          80000 / 9806.65,
      ) < 1e-8,
    );
    await p.locator("#window-save").click();
    assert.equal(
      await p.evaluate(
        () => WellEvidence.project().operating_window_studies.length,
      ),
      1,
    );
    const reportPromise = p.waitForEvent("download");
    await p.locator("#window-report").click();
    const report = await reportPromise;
    const html = fs.readFileSync(await report.path(), "utf8");
    assert.match(html, /Candidate WOB/);
    assert.match(html, /tf/);
    assert.match(html, /SYNTHETIC/);
    fs.mkdirSync(path.resolve(__dirname, "../screenshots/v09"), {
      recursive: true,
    });
    await p
      .locator("#window-result")
      .screenshot({
        path: path.resolve(
          __dirname,
          "../screenshots/v09/operating-windows.png",
        ),
      });
    await p
      .locator("#window-modal")
      .locator("..")
      .evaluate((e) => (e.open = true));
    await p.locator("#win-modal-span").fill("20");
    assert.equal(await p.locator("#window-save").isDisabled(), true);
    await p.locator("#window-run").click();
    const changed = await p.evaluate(() => WindowWorkspace.snapshot());
    assert.notEqual(
      changed.result.selected.modes[0].hz,
      snap.result.selected.modes[0].hz,
    );
    await p.locator("#window-load").click();
    assert.equal(
      (await p.evaluate(() => WindowWorkspace.snapshot())).input.modal.span,
      10,
    );
    await p.locator('[data-page="td"]').click();
    await p.selectOption("#td-force-unit", "tf");
    await p.locator("#bitforce").fill("10");
    await p.locator("#applytd").click();
    const before = await p.evaluate(() => WellApp.snapshot());
    assert.ok(Math.abs(before.state.bitforce - 98.0665) < 1e-8);
    await p.selectOption("#td-force-unit", "kN");
    assert.ok(
      Math.abs(Number(await p.locator("#bitforce").inputValue()) - 98.0665) <
        1e-8,
    );
    await p.locator("#applytd").click();
    const after = await p.evaluate(() => WellApp.snapshot());
    assert.ok(
      Math.abs(
        before.derived.td.pooh.hookload - after.derived.td.pooh.hookload,
      ) < 1e-7,
    );
    await p.selectOption("#td-force-unit", "tf");
    assert.match(await p.locator("#tdplot-engineering").textContent(), /tf/);
    await p.evaluate(() => StudyWorkspace.open("mse"));
    await p.locator("#study-example").click();
    const v = Number(
      await p.locator('[data-key="wob_kN"]').first().inputValue(),
    );
    assert.ok(Math.abs(v - 80 / 9.80665) < 1e-8);
    await p.locator("#study-run").click();
    const study = await p.evaluate(() => StudyWorkspace.getCurrent());
    await p.selectOption("#study-force-unit", "klbf");
    assert.ok(
      Math.abs(
        Number(
          await p.locator('[data-key="torque_kNm"]').first().inputValue(),
        ) -
          3000 / 1355.8179483314004,
      ) < 1e-8,
    );
    assert.deepEqual(
      (await p.evaluate(() => StudyWorkspace.getCurrent())).results,
      study.results,
    );
    await p.selectOption("#study-force-unit", "tf");
    await p
      .locator("#study-import")
      .setInputFiles({
        name: "metric.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
          "md_m,bit_diameter_m,wob_tf,torque_tfm,rpm,rop_m_h\n1000,0.216,10,1,120,20",
        ),
      });
    assert.equal(
      Number(await p.locator('[data-key="wob_kN"]').first().inputValue()),
      10,
    );
    await p.locator('[data-page="operating-windows"]').click();
    await p.evaluate(()=>{const b=WellApp.snapshot().state.bha;b[0].family='pdc-bit';b[0].body_rating_n=98066.5;b[0].source='Synthetic rating conversion test';WellApp.setBha(b);});
    await p.locator('[data-page="bha"]').click();
    const rating=p.locator('[data-property="body_rating_n"]');
    assert.ok(Math.abs(Number(await rating.inputValue())-10)<1e-8);
    await p.selectOption('#bha-rating-unit','kN');
    assert.ok(Math.abs(Number(await rating.inputValue())-98.0665)<1e-8);
    await p.locator('#save-component').click();
    assert.ok(Math.abs((await p.evaluate(()=>WellApp.snapshot().state.bha[0].body_rating_n))-98066.5)<1e-6);
    await p.locator('[data-page="operating-windows"]').click();
    await p.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: window evaluation, unit invariance, stale-result refusal, save/reload/export, vibration sensitivity, legacy T&D tf conversion, study tf/klbf conversion and tf CSV import, mobile layout",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
