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
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }),
      errors = [],
      requests = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (r) => {
      if (/^https?:/.test(r.url())) requests.push(r.url());
    });
    const nav = (id) => p.locator(`.nav[data-page="${id}"]`).click(),
      click = (id) => p.locator("#" + id).click();
    await p.goto(
      pathToFileURL(path.resolve(__dirname, "../app/index.html")).href,
    );
    await nav("studies");
    await p.waitForSelector("#studies.active");
    assert.equal(await p.locator(".study-card").count(), 16);
    fs.mkdirSync(path.resolve(__dirname, "../screenshots/v05"), {
      recursive: true,
    });
    await p.screenshot({
      path: path.resolve(__dirname, "../screenshots/v05/home.png"),
      fullPage: true,
    });
    await click("home-demo");
    await click("study-run");
    await p.waitForFunction(() => !!StudyWorkspace.getCurrent());
    assert.equal(await p.locator("#study-results tbody tr").count(), 3);
    const originalHash = await p.evaluate(
      () => StudyWorkspace.getCurrent().input_sha256,
    );
    await p.locator("#study-interpretation").fill("Synthetic validation case");
    await click("study-save");
    assert.equal(await p.locator(".case-card").count(), 1);
    assert.match(
      await p.locator("#study-report-preview").textContent(),
      /Synthetic validation case/,
    );
    await nav("study");
    await p
      .locator('#study-inputs input[data-key="torque_kNm"]')
      .first()
      .fill("4");
    assert.equal(await p.locator("#study-save").isDisabled(), true);
    await click("study-run");
    await p.waitForFunction(() => !!StudyWorkspace.getCurrent());
    assert.notEqual(
      await p.evaluate(() => StudyWorkspace.getCurrent().input_sha256),
      originalHash,
    );
    await click("study-save");
    assert.equal(await p.locator(".case-card").count(), 2);
    const ids = await p.evaluate(() =>
      WellEvidence.project().study_runs.map((r) => r.id),
    );
    await p.selectOption("#compare-study-a", ids[0]);
    await p.selectOption("#compare-study-b", ids[1]);
    await click("compare-study");
    assert.match(
      await p.locator("#study-comparison").textContent(),
      /difference b minus a/,
    );
    const dl = p.waitForEvent("download");
    await click("study-report-html");
    const html = fs.readFileSync(await (await dl).path(), "utf8");
    assert.match(html, /Input SHA256/);
    assert.match(html, /Surface inputs/);
    assert.ok(!html.includes("<script"));
    assert.ok(
      !html.includes('src="assets/'),
      "Standalone report must not depend on app files",
    );
    assert.match(html, /Synthetic training well/);
    await click("study-revise");
    assert.equal(
      await p
        .locator('#study-inputs input[data-key="torque_kNm"]')
        .first()
        .inputValue(),
      "4",
    );
    assert.equal(await p.locator("#study-save").isDisabled(), true);
    await click("study-run");
    await p.waitForFunction(() => !!StudyWorkspace.getCurrent());
    assert.equal(
      await p.evaluate(() => StudyWorkspace.getCurrent().revision_of),
      ids[1],
    );
    const backup = p.waitForEvent("download");
    await click("btnsave");
    const f = await (await backup).path();
    const saved = JSON.parse(fs.readFileSync(f, "utf8"));
    assert.equal(saved.study_runs.length, 2);
    await nav("dataqc");
    await p.locator("#load-project-v4").setInputFiles(f);
    await p.waitForFunction(
      () =>
        WellEvidence.project().study_runs?.length === 2 &&
        document.getElementById("data-result").textContent.includes("Imported"),
    );
    await nav("casebook");
    assert.equal(await p.locator(".case-card").count(), 2);
    for (const id of [
      "standoff",
      "wear",
      "jar",
      "hydraulics",
      "operations",
      "directional",
      "survey",
      "friction",
      "modal",
    ]) {
      await p.evaluate((id) => StudyWorkspace.open(id), id);
      await click("study-example");
      await click("study-run");
      await p.waitForFunction(() => !!StudyWorkspace.getCurrent());
      assert.equal(await p.locator("#study-error").textContent(), "");
      if (id === "friction")
        assert.equal(await p.locator("#study-chart svg").count(), 3);
    }
    await p.evaluate(() => StudyWorkspace.open("mse"));
    const bad = Buffer.from(
      "md_m,bit_diameter_m,wob_kN,torque_kNm,rpm,rop_m_h\n1000,0.216,80,3,120,20",
    );
    await p.locator("#study-import").setInputFiles({
      name: "observations.csv",
      mimeType: "text/csv",
      buffer: bad,
    });
    await p.waitForFunction(
      () => document.querySelectorAll("#study-inputs tbody tr").length === 1,
    );
    await p.locator("#study-reference").fill("MD/RT / aligned bit sensors");
    await click("study-run");
    assert.match(await p.locator("#study-error").textContent(), /QC/);
    await p.selectOption("#study-quality", "MEASURED_QC_PASS");
    await click("study-run");
    await p.waitForFunction(() => !!StudyWorkspace.getCurrent());
    await p.screenshot({
      path: path.resolve(__dirname, "../screenshots/v05/study.png"),
      fullPage: true,
    });
    await p.setViewportSize({ width: 390, height: 844 });
    await nav("studies");
    await p.screenshot({
      path: path.resolve(__dirname, "../screenshots/v05/mobile.png"),
      fullPage: true,
    });
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
      "Mobile page overflow",
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    console.log(
      "PASS: study library, calculations, stale-result refusal, versioned reports, case comparison, standalone report, project round-trip, all new processors, CSV QC gate, offline and mobile layout",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
