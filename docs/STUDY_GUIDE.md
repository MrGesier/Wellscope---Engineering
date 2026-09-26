# WellScope 0.5 — Study workspace

Start in **Study library**, choose a question, and follow three steps: define its source and basis, load and review inputs, then inspect and save the result. The report guide explains required data and interpretation for every study. Existing geometry, BHA, limits, dynamics and cuttings tools remain accessible.

## Supported studies

| Study | Purpose and local capability | Boundary |
|---|---|---|
| Directional run review | Observed build/turn by explicitly selected stable interval; wrap azimuth across north | No predicted response, inferred overgauge or automatic segmentation |
| Mechanical specific energy | Teale axial + rotary energy, depth per revolution, drilling strength | Surface inputs are a proxy; no inferred bit torque or automatic dysfunction diagnosis |
| Operations follow-up | Matched pickup/free/slackoff differences and measured-minus-planned SPP/ECD | Requires matching sensor zero, operation and conditions; no friction fitting |
| Hydraulic observation review | Hydrostatic pressure and ECD from supplied annular pressure loss | Does not predict pressure loss; SPP is not annular loss |
| Jar pressure-area review | Convert supplied effective axial tension to pipe-wall tension | Not a jar placement, impact or coupled hydraulic-mechanical solver |
| Axial friction sensitivity | Multiple bit-depth/open-hole-friction cases using the existing axial model | String-top loads, not rig hookload; no torque, stiff-string contact or buckling |
| Casing standoff geometry | Minimum radial gap and standoff from supplied eccentricity | No centralizer force, casing deformation or cement-displacement prediction |
| Measured casing wear | Remaining wall and nominal loss with explicit nominal/minimum-wall denominators | No MFCL signal interpretation, wear-factor prediction, burst or collapse rating |
| Plan / actual reconciliation | N/E/TVD residuals at matching MD in a common frame | No datum transformation, interpolation or clearance assessment |
| BHA directional pre-analysis | Record external solver quantities with model/revision/units | External result review only |
| Vibration / modal study | Record external mode and operating-envelope quantities | No eigenmode or critical-speed solver; measured spectra remain in Dynamics |
| Stress / fatigue study | Record external stress/damage results and their provenance | No cumulative fatigue or remaining-life prediction |
| Completion running study | Record external run-in cases and assumptions | No lockup prediction |
| Sag / local dogleg review | Record external survey corrections and derived geometry | No inferred micro-doglegs or sag correction |
| Casing load-case register | Record external design loads and ratings | No API rating or triaxial verification |
| Drilling dysfunction review | Record external interpretations alongside author commentary | No automated classifier or causal diagnosis |

## Input workflow

Use **Download CSV template** for exact headers and units, or add rows in the editable table. Import resets evidence quality to unchecked. A nonempty source/revision and reference basis plus an explicit QC selection are required before calculation. This selection records the author's review; the application does not independently certify measurements. Synthetic examples are blocked in USER_DATA projects.

The well/wellbore and run/operating-condition fields travel with each study. Record BHA revision, fluid, operation, interval and sensor matching there. Calculations only use the inputs documented in the selected study; free-text context does not configure a hidden solver. Shared-project inputs are used only by axial friction sensitivity.

Input and result grids display the first 200 rows for responsiveness. All imported rows (maximum 10,000) participate in calculation and CSV/report exports. A friction matrix is limited to 200 depth/coefficient cases. Units are fixed in each template; convert source spreadsheets before import. Native proprietary databases, legacy XLS, XLSX and WITSML are not directly imported by the study workspace.

## Versioned reports

**Save report version** stores source, quality, reference, well/run context, exact input snapshot, results, interpretation, limitations and an input SHA256. Changed inputs disable save/export until recalculation. This hash identifies inputs; it is not a signature or external verification.

The **Study reports** page supports report preview, standalone HTML, browser Print / Save PDF and comparison at common MD. Comparisons require the same type, well/run context, reference and measurement basis. Directional interval endpoints and external quantities/units must match. Duplicate MD cases are refused rather than silently paired. Friction matrices are reviewed separately by coefficient. No interpolation occurs.

**Revise saved study** reopens table inputs for a new calculation and retains the parent version ID. Old reports remain unchanged. Friction matrices are recreated from the current shared trajectory/string because reopening an old report must not silently replace project geometry.

Use **Export Project** to persist work to a JSON file. Importing that backup restores saved studies. Unsaved drafts and changes are not guaranteed across a browser restart. This is a local application without a shared database, cloud sync or automated report approval.

## Validation boundary

Analytic tests check dimensional conversions, limiting geometries, force signs, residuals and invalid-input gates. Edge tests exercise file-origin import, calculation, result invalidation, report revision/comparison, backup restoration and exports without external requests. These checks do not validate operational decisions or establish numerical equivalence to commercial engineering software. Advanced contact mechanics, coupled hydraulics, cement placement, thermal/rheology models and API casing design remain outside this version.
