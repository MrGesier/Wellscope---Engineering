# WellScope Engineering Studio — 0.5

An offline workspace organized around engineering questions, source data and reproducible study reports. The new home contains 16 study workflows: nine transparent local calculations and seven clearly labelled external-result reviews. Geometry, BHA editing, cuttings, measured dynamics and the evidence/limits workbench remain available.

## Start on Windows

Extract the complete package and double-click `LAUNCH_WELLSCOPE.cmd`, or open `app/index.html` in Edge or Chrome. No server, account or runtime installation is required.

To install or update the desktop shortcut, run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-desktop.ps1
```

The installer uses `%LOCALAPPDATA%\Programs\WellScope` and the actual Windows desktop. It updates only a recognized WellScope installation and assigns the new original trajectory/strata icon.

## First study

1. Choose **Explore a synthetic MSE study** on the home page.
2. Inspect the source, reference, measurement basis and input rows, then select **Calculate study**.
3. Review the results and write your interpretation. **Save report version** keeps its input snapshot and SHA256.
4. In **Study reports**, open, revise, compare or export reports as standalone HTML or Print / Save PDF.
5. **Export Project** saves the complete project, including reports, to JSON. Keep this backup before closing or updating.

For real observations, create a USER_DATA project in **Data & QC**, then use a study's CSV template. Import sets QC to unchecked; the author must review units, source and matching basis. No synthetic examples or default approval thresholds are silently inserted into real projects.

## Included

- Searchable study library and a methodology guide explaining the purpose, inputs, outputs and limits of every report.
- MSE/DOC, observed directional intervals, operations residuals, ECD from supplied losses, pressure-area force conversion, axial friction matrices, standoff geometry, measured wall loss and plan/actual residuals.
- External result records for BHA prediction, modal/vibration, fatigue, completion running, sag/local doglegs, casing design and dysfunction interpretation.
- Versioned reports with well/run context, source/QC, chart, result table, input snapshot, interpretation and limitations. Changed inputs invalidate results.
- Warm cream, terracotta and walnut theme; responsive desktop/mobile layout; original SVG/PNG/ICO branding.
- Existing minimum-curvature geometry, nominal segment proximity, 23-tool BHA catalog, source-backed completion data, vendor-table interpolation, measured spectra, sieve distributions and versioned limits.

See [study guide](docs/STUDY_GUIDE.md), [model ledger](docs/MODEL_LEDGER.md), [validation record](docs/SCIENCE_VALIDATION.md), [specification coverage](docs/SPEC_COVERAGE.md) and [release limitations](docs/RELEASE_STATUS.md).

## Honest model scope

This is an independent exploratory implementation. It does not reproduce proprietary commercial solvers or establish operational approval. Local models are preliminary. External results remain attributed to their source model. No stiff-string contact/buckling solver, predictive bit-rock/RSS model, modal/fatigue engine, calibrated casing rating, cement displacement or geodetic/ISCWSA model is supplied. The original unavailable directional/cuttings addendum remains an acceptance gap.

Private source documents, customer examples and proprietary software are excluded from this repository and runtime package. All included demonstrations are independently created synthetic data.

## Development and packaging

```powershell
npm ci
npm test
npm run test:browser
node scripts/package.cjs <new-staging-directory>
```

Browser checks use installed Microsoft Edge; set `EDGE_PATH` when it is elsewhere. They run against local file URLs and fail on page errors or external HTTP requests. Node/npm are only development tools, not runtime requirements.

Application version is 0.5.0. Project schema remains 0.4.2 with an additive `study_runs` collection to preserve prior backup compatibility. Older application versions do not provide the new report interface.
