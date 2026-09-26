# 0.5 workflow reconstruction

The report-driven additions and their explicit calculation boundaries are mapped in [STUDY_GUIDE.md](STUDY_GUIDE.md). This release reorganizes the user workflow and adds reproducible report studies; it does not close the advanced-solver or missing-addendum acceptance gaps listed below.

# Integrated specification coverage — 26 September 2026

This register maps the supplied `02_WELLSCOPE_V04_2_INTEGRATED_SPEC_EN.md` to the shipped alpha. Implemented features are not a claim of operational approval or full acceptance of every requirement. The companion `03_NEW_ENGINEERING_REQUIREMENTS_EN.md` could not be found locally, in the repository, or by exact-title public web search.

| Specification area | Shipped coverage | Remaining acceptance or gated capability |
|---|---|---|
| 0. Product contract | Four separate data/model/limit/review labels, unknown and stale states, source metadata, draft review, no fabricated safe limits | Independent benchmark and field approval remain absent; exhaustive status coverage still requires acceptance review |
| 1–2. Product design and screens | English workbench, shared well/MD/interval selection, linked views, inspector, replay, field help, reports and source disclosures | Advanced screen workflows need field-user evaluation; no claim of proprietary product parity |
| 3. Canonical data | Explicit mapping of four display roles to canonical wellbore IDs, SI normalization, feet MD conversion, source-ID preservation, reference and elevation gates, backup round-trip, completion and section editing | Four-role display adapter, not arbitrary multi-well rendering; no geodetic transforms; unsupported schemas must be mapped explicitly |
| 3.2. Synthetic scenarios | CASE_A through CASE_F; independent offsets, shared parent branch, 4200 m training well and 2200 m tie-in | Synthetic acceptance vectors only |
| 4. Geometry | Finite segment closest points, MDs and tangents; BVH pruning; shared branch context; reference refusal; projected plan/section/spider/ladder/transverse views | ISCWSA covariance, correlated error propagation, named-rule separation factors and collision probability remain disabled |
| 5. Limits and alerts | Source/revision rules, dimensions, inclusive/exclusive and band operators, well/MD/component/operation/time scope, persistence grouping, history, acknowledgement, CSV trace | No manufacturer or field limits are invented; imported unchecked data cannot produce a within-limit verdict |
| 6. Axial and rig evidence | Selected bit depth, component and casing-shoe integration boundaries, separate cased/open friction, PUW/SOW/static estimates; source-labelled measured hookload, calibration metadata and matched PUW/FRW/SOW differences | No rig hookload prediction, inverse friction fit, torsional torque, stiff string, buckling, stress or fatigue solution |
| 7. BHA designer | 23 original SVG tools, family schemas, connection/stiffness/rating/sensor/motor/bit metadata, reorder and import/export; sourced Q–RPM and pressure–torque table interpolation | Metadata is not a mechanical solver; no inferred ratings; no multidimensional vendor surface fitting or extrapolation |
| 8. Dynamics | Source/QC-gated uniform-channel Hann-window amplitude spectrum with frequency resolution and Nyquist; measured peaks are descriptive | No natural-frequency inference, safe RPM, critical speed, stick-slip prediction, wavelets or modal solver; 8–2048 samples per analysis |
| 8A. Directional | Hole/bit/pad diameter geometry, labelled external/observed case records and A/B comparison; observed survey-interval BUR/TUR with azimuth wrap and near-vertical gate | No predictive BHA/bit-rock BUR/TUR; no conformance claim for missing addendum tests |
| 8B. Cuttings | Source-backed surface sample and sieve forms, lag/source MD interval, dry-mass PSD, cumulative plot, bracketed D10/D50/D90 and user-sourced coarse rules | No causal diagnosis, particle-shape classification or inference of downhole overgauge; missing addendum remains a dependency |
| 9. Data/reporting | Quoted CSV, explicit canonical mapping, QC/source records, local persistence, SHA256 including new evidence collections, JSON/CSV and printable appendix with plots | Local application; no server accounts, immutable audit service or independent approval workflow |
| 10–11. Build and acceptance | Original code preserved, numerical and real file-origin browser tests, Windows CI, offline ZIP, original logo and desktop installer | Local mathematical/UI tests do not promote models to BENCHMARKED or FIELD_VALIDATED |

## Reproducible use

Run `npm ci`, `npm test` and `npm run test:browser` (installed Edge required; override `EDGE_PATH` if necessary). Runtime use needs no npm or network. In PowerShell, run `scripts/install-desktop.ps1` to install a stable local copy and create the Windows desktop shortcut. The installer refuses to overwrite an unrecognized install directory.
