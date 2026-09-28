# WellScope Engineering Studio — 0.10

A local engineering workspace with a guided well setup, BHA preparation and a section dashboard. The default page collects trajectory, architecture, lithology and an existing tally or a preliminary generated assembly. Six main navigation entries keep specialist tools contextual.

## Start on Windows

Extract the complete package and double-click `LAUNCH_WELLSCOPE.cmd`, or open `app/index.html` in Edge or Chrome. No server, account or runtime installation is required.

To install or update the desktop shortcut, run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-desktop.ps1
```

The installer uses `%LOCALAPPDATA%\Programs\WellScope` and the actual Windows desktop. It updates only a recognized WellScope installation and assigns the new original trajectory/strata icon.

## First study

1. Open **Prepare the well**: the fictional Northbank N-04 project is already populated. Calculate it, or choose **New well** and use the CSV templates to enter your survey, architecture and lithology.
2. Supply your complete tally or select **Generate and compare a starter BHA**, with required instruments.
3. Enter operating targets and friction, then prepare and calculate.
4. Move along the **Section dashboard** to inspect formation intervals, sourced bounds, loads and directional response when available. Missing limits remain unknown.
5. Export the report and **Export Project** to keep your editable work. Projects remain in browser memory until exported.

The starter compares assumed geometries at sampled depths; it is not a validated OEM design. See [workflow scope](docs/CONCRETE_WORKFLOW.md) and [lithology programme](docs/LITHOLOGY_PROGRAMME.md).

## Included

- Searchable study library and a methodology guide explaining the purpose, inputs, outputs and limits of every report.
- MSE/DOC, observed directional intervals, operations residuals, ECD from supplied losses, pressure-area force conversion, axial friction matrices, standoff geometry, measured wall loss and plan/actual residuals.
- External result records for BHA prediction, modal/vibration, fatigue, completion running, sag/local doglegs, casing design and dysfunction interpretation.
- Versioned reports with well/run context, source/QC, chart, result table, input snapshot, interpretation and limitations. Changed inputs invalidate results.
- Terracotta/ivory engineering layout, depth-down plots, technical tool illustrations, desktop/mobile views and original branding.
- Existing minimum-curvature geometry, nominal segment proximity, 72-tool BHA catalog, source-backed completion data, vendor-table interpolation, measured spectra, sieve distributions and versioned limits.

See [study guide](docs/STUDY_GUIDE.md), [model ledger](docs/MODEL_LEDGER.md), [validation record](docs/SCIENCE_VALIDATION.md), [specification coverage](docs/SPEC_COVERAGE.md) and [release limitations](docs/RELEASE_STATUS.md).

## BHA design and directional sensitivity

All 72 equipment types use the same original technical illustration system in the searchable catalog, inspector and assembled string. Source-backed dimensions remain editable; expanded properties stay available in a disclosure. The global terracotta/ivory engineering theme also covers legacy workspaces and charts.

In **Directional Response Lab**, inspect DLS versus WOB, a build/right-curvature steering envelope, and signed build/azimuth-turn curves. Choose rotating, motor sliding blend or RSS, toolface and activation. The initial surface is explicitly fictional. Import a source-labelled external response surface to review an independently calculated BHA. No response is inferred from editing the component geometry. Export a standalone HTML report or CSV and save the complete case in project backups.

See [directional model, chart conventions and sources](docs/DIRECTIONAL_SENSITIVITY.md). Depth tracks increase downward; WOB sensitivities retain WOB on the horizontal axis. Plan views use North upward, and transverse views use highside upward.

## Honest model scope

This is an independent exploratory implementation. It does not reproduce proprietary commercial solvers or establish operational approval. Local models are preliminary. External results remain attributed to their source model. The contact/bending models are preliminary screening models, not a validated full stiff-string solution. No predictive bit-rock/RSS model, modal/fatigue engine, calibrated casing rating, cement displacement or geodetic/ISCWSA model is supplied. The original unavailable directional/cuttings addendum remains an acceptance gap.

Private source documents, customer examples and proprietary software are excluded from this repository and runtime package. All included demonstrations are independently created synthetic data.

## Development and packaging

```powershell
npm ci
npm run build:3d
npm run build:runtime
npm test
npm run test:browser
node scripts/package.cjs <new-staging-directory>
```

Browser checks use installed Microsoft Edge; set `EDGE_PATH` when it is elsewhere. They run against local file URLs and fail on page errors or external HTTP requests. Node/npm are only development tools, not runtime requirements.

Application version is 0.10.0. Project schema remains 0.4.2 with additive `study_runs`, `engineering_cases` and `directional_sensitivity_runs` collections to preserve prior backup compatibility. Older application versions do not provide the new report interface.

## Equipment catalogue

Version 0.9 expands the catalogue to 72 individually illustrated types, source-backed geometry entry, a separate reference register and assembly consistency notes. See [coverage and limitations](docs/EQUIPMENT_CATALOG.md).

## Operating windows (0.9)

Force selectors now cover the older axial analysis, study tables/exports and BHA force/torque properties. A dedicated operating-window study adds entered load limits, selected-section overpull and tension–torque screening, directional scenario intersections and a reduced-order modal/forced-response model. See [equations, coverage and limitations](docs/OPERATING_WINDOWS.md).

## Whole-string loads and pull (0.10)

A versioned run snapshot now drives distributed effective/wall tension, rotary torque,
component ratings, tube-body stress and sampled pull headroom. Capture current project
geometry or load the clearly fictional worked example. Geometry changes invalidate linked
results. Force and torque fields, charts and exports support tf/tf.m, kN/kN.m and klbf/klbf.ft.
Blank ratings or missing sources remain unevaluable. Existing study pages retain their own
models; this is not a universal synchronization of every legacy calculator.

See [model, assumptions and validation status](docs/DISTRIBUTED_RUN.md).

## Railway deployment

The Docker image serves only `app/` through Nginx on port 8080. Configure the Railway
public domain target port to 8080. No backend, account database or uploaded project storage
is provisioned. Documents imported in the browser remain client-side; export backups to
retain work. Local Drive report extracts and the contents of `outputs/` are not deployed.

Railway detects the root Dockerfile. Build context is allowlisted by `.dockerignore`.
The online service can run the reviewed feature branch until that PR is merged; switch
the Railway source branch to main after merging to follow subsequent releases.
## Local BHA deformation study

The **Architecture & BHA deformation** page adds an editable cased/open-hole architecture snapshot, a local two-plane static beam/contact solver, an orbitable 3D projection, unit conversions and design-A comparison. Start with **Fictional example**. Read [model assumptions and verification](docs/BHA-STATIC.md) before using imported geometry. This preliminary span model rejects buckling and does not establish a field operating window.
