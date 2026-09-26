# WellScope Engineering Studio — 0.9

An offline workspace organized around engineering questions, source data and reproducible study reports. The default workspace opens a fully populated fictional Torque & Drag case. The study library contains 16 workflows: nine transparent local calculations and seven clearly labelled external-result reviews. Geometry, BHA editing, cuttings, measured dynamics and the evidence/limits workbench remain available.

## Start on Windows

Extract the complete package and double-click `LAUNCH_WELLSCOPE.cmd`, or open `app/index.html` in Edge or Chrome. No server, account or runtime installation is required.

To install or update the desktop shortcut, run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-desktop.ps1
```

The installer uses `%LOCALAPPDATA%\Programs\WellScope` and the actual Windows desktop. It updates only a recognized WellScope installation and assigns the new original trajectory/strata icon.

## First study

1. Open **Torque & Drag study**: a fictional 3,800 m well, 153 survey stations, 12 string components and 19 mock connection records are already populated.
2. Choose **Metric**, **SI** or **Oilfield** units. Customize individual dimensions if needed. Metric uses metres, millimetres, tonnes-force and tonne-force metres; mass remains tonnes.
3. In **Well & conditions**, change cased/open-hole friction and apply. The axial curves change; mock observations remain fixed.
4. Inspect the component drawings and full tally in **BHA & drillstring**, then compare the connection log.
5. In **Report & export**, add an interpretation and export unit-aware CSV, standalone HTML or Print / Save PDF. Export the case JSON for an editable backup. **Save case** adds an immutable snapshot to the project; **Export Project** includes these snapshots.

See [training case and units](docs/TRAINING_CASE.md) for the exact model boundary and conversion factors.

For real observations, create a USER_DATA project in **Data & QC**, then use a study's CSV template. Import sets QC to unchecked; the author must review units, source and matching basis. No synthetic examples or default approval thresholds are silently inserted into real projects.

## Included

- Searchable study library and a methodology guide explaining the purpose, inputs, outputs and limits of every report.
- MSE/DOC, observed directional intervals, operations residuals, ECD from supplied losses, pressure-area force conversion, axial friction matrices, standoff geometry, measured wall loss and plan/actual residuals.
- External result records for BHA prediction, modal/vibration, fatigue, completion running, sag/local doglegs, casing design and dysfunction interpretation.
- Versioned reports with well/run context, source/QC, chart, result table, input snapshot, interpretation and limitations. Changed inputs invalidate results.
- Restrained slate/neutral engineering layout, depth-down plots, technical tool illustrations, desktop/mobile views and original branding.
- Existing minimum-curvature geometry, nominal segment proximity, 23-tool BHA catalog, source-backed completion data, vendor-table interpolation, measured spectra, sieve distributions and versioned limits.

See [study guide](docs/STUDY_GUIDE.md), [model ledger](docs/MODEL_LEDGER.md), [validation record](docs/SCIENCE_VALIDATION.md), [specification coverage](docs/SPEC_COVERAGE.md) and [release limitations](docs/RELEASE_STATUS.md).

## BHA design and directional sensitivity

All 23 equipment families use the same original technical illustration system in the searchable catalog, inspector and assembled string. Source-backed dimensions remain editable; expanded properties stay available in a disclosure. The global slate/white engineering theme also covers legacy workspaces and charts.

In **Directional Response Lab**, inspect DLS versus WOB, a build/right-curvature steering envelope, and signed build/azimuth-turn curves. Choose rotating, motor sliding blend or RSS, toolface and activation. The initial surface is explicitly fictional. Import a source-labelled external response surface to review an independently calculated BHA. No response is inferred from editing the component geometry. Export a standalone HTML report or CSV and save the complete case in project backups.

See [directional model, chart conventions and sources](docs/DIRECTIONAL_SENSITIVITY.md). Depth tracks increase downward; WOB sensitivities retain WOB on the horizontal axis. Plan views use North upward, and transverse views use highside upward.

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

Application version is 0.9.0. Project schema remains 0.4.2 with additive `study_runs`, `engineering_cases` and `directional_sensitivity_runs` collections to preserve prior backup compatibility. Older application versions do not provide the new report interface.

## Equipment catalogue

Version 0.9 expands the catalogue to 72 individually illustrated types, source-backed geometry entry, a separate reference register and assembly consistency notes. See [coverage and limitations](docs/EQUIPMENT_CATALOG.md).

## Operating windows (0.9)

Force selectors now cover the older axial analysis, study tables/exports and BHA force/torque properties. A dedicated operating-window study adds entered load limits, selected-section overpull and tension–torque screening, directional scenario intersections and a reduced-order modal/forced-response model. See [equations, coverage and limitations](docs/OPERATING_WINDOWS.md).
