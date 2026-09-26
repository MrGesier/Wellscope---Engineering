# WellScope Engineering — Alpha 0.4.2

## Integrated evidence workbench

The existing offline application now includes versioned limits and event replay; exact segment-pair geometry; shared well/MD/component selection; 23 original SVG tools and schema-driven properties; selected-bit-depth axial screening; directional case geometry; cuttings sieve analysis; calibration/source checks; and reproducible JSON/CSV/print reports.

To exercise the new workflow:

1. In **3D Well View**, scroll to **Synthetic acceptance scenarios** and load **CASE_F** for the 4200 m training well and 2200 m sidetrack tie-in.
2. In **Limits & Alert Register**, load the explicitly synthetic LIM-01 example. Click its 145 kN / 140 kN warning to select exactly 3450 mMD in the scene, inspector and plot.
3. In **Drillstring & BHA**, use the new component inspector and 23-tool catalog. Unknown properties remain unknown. Vendor RPM interpolation requires source/revision, QC, matching conditions and an in-domain query.
4. In **Directional Response Lab** and **Cuttings & Particle Size**, use the labelled synthetic examples or enter source-backed fields. Hole overgauge and particle-size distributions remain separate; no predictive BUR/TUR is generated.
5. In **Reports & Sources**, build the reproducibility appendix before exporting or printing. SHA256 fingerprints, rule revisions, provenance and model limitations are retained.

**USER_DATA projects start without demo thresholds or measurements.** The initial trajectory remains a synthetic example until replaced; creating an evidence project does not validate field data.

See [model ledger](docs/MODEL_LEDGER.md), [validation record](docs/SCIENCE_VALIDATION.md), and [release status and remaining acceptance work](docs/RELEASE_STATUS.md). This is an incremental alpha implementation, not a claim of complete P0 acceptance or operational approval. The controlling S11/S12 companion addendum was unavailable, so conformance to its undisclosed tests is not claimed.

`npm test` runs all original tests plus the new acceptance groups. `npm install` then `npm run test:browser` runs real file-origin Edge checks and captures screenshots. Set `EDGE_PATH` when Edge is installed elsewhere. Runtime launch itself needs neither Node nor npm.

`node scripts/package.cjs <new-staging-directory>` stages a clean offline runtime for ZIP distribution. The historical Alpha 02 tree is preserved in Git but excluded from this package.

## Original v0.3 guide (preserved for baseline context)

## Getting started on Windows

Extract the entire ZIP to a local folder, then double-click `LAUNCH_WELLSCOPE.cmd` (or open `app/index.html` in Edge or Chrome). The application runs locally without a server or account. No third-party DrillScan binaries are included.

## Interactive tour

1. **3D Well View:** drag to orbit, scroll to zoom, click a survey station. Reference well, Offset A/B and a synthetic sidetrack are preloaded.
2. **Trajectories:** paste or import `md,inc,azi` surveys (metres and degrees), then recalculate the minimum-curvature survey. The coordinates use a local North–East–TVD frame.
3. **Anticollision:** choose among three synthetic offset scenarios; view plan, 3D and zoomed local transverse ellipses. Select Offset A, Offset B or sidetrack, and move the MD slider. Pre-kickoff sidetrack shares the parent borehole; the demonstration kickoff is 2,000 mMD.
4. **Torque & Drag:** select a well section to see its estimated local pickup axial load. Vary fluid density and friction, then recalculate.
5. **BHA Builder:** choose a schematic tool pictogram, modify its synthetic dimensions and linear mass, and apply the new string configuration.
6. **Reports:** export project JSON and calculated stations CSV or use Print / PDF for a preliminary report.

**Detailed tooltips:** hover over or keyboard-focus any blue `i` icon beside an engineering term or input. On touch devices tap the `i` icon; Escape or tapping outside closes the popover. Tooltips explain units, expected inputs, scientific assumptions, the relationship to the result, and model limitations. Graphs and navigation controls also include contextual help.

## Scope and safety

- Surveys: minimum curvature and calculated N/E/TVD/DLS, with basic mathematical tests. No geodetic datum transformations.
- Anticollision: nominal centreline distances are sampled at reference surveys, projecting onto neighbouring straight-line segments; ellipses are calculated from **assumed**, independent N/E/TVD standard deviations and are visualization aids only. No ISCWSA error model, propagated 3D covariance, correlated well uncertainty, validated separation factor, collision probability or operating clearance. The `2σ` visual contour must not be interpreted as a safety margin or a guaranteed confidence limit.
- Torque & Drag: simplified, static segmented **axial** soft-string screening based on buoyed weight and assumed friction. It is not a stiff-string solution. No torsional torque, reliable contact force, fatigue, buckling, verified hookload capacity, connection-rating or acceptable load envelope.
- BHA: eleven schematic tool families and user-editable geometry; no bit–rock, directional response, modal solver or manufacturer-approved component specifications.

**Training / exploratory visualization only. Do not use this alpha to approve a well path, assess actual collision risk, select operational load limits, or set drilling parameters.**

See `research/SOURCES_AND_LIMITATIONS.md` for the original technical limitations and source register. Proprietary user-provided documents are deliberately excluded from this distributable package.

## Verification

With optional Node.js, run `node tests/test_engine.js` and `node tests/test_v03.js`. The application itself does not need Node.

## Update your existing GitHub repository

From the extracted folder, double-click `UPDATE_REPO_EN.cmd`. The script clones `MrGesier/Wellscope---Engineering` into a fresh temporary directory, copies the translated application and guide, creates a normal commit, rebases on the current `main`, and pushes without force. It does not upload any user-supplied engineering PDFs or proprietary DrillScan binaries. You will need Git for Windows and a GitHub account authorized for that repository. The repository is currently public.

Old screenshots, if present in your GitHub repository, may show the previous French UI; they are historical artifacts and have not been regenerated for this change.

## Expanded v0.4.2 data tools and desktop installation

Data & QC now provides canonical JSON import with an explicit four-wellbore role map. The overview has a source-backed completion editor; BHA supports source vendor RPM/torque tables; Torque & Drag has separate open/cased friction and matched field observations; Dynamics has measured amplitude spectra; Directional Response has observed interval BUR/TUR. See [full coverage register](docs/SPEC_COVERAGE.md) for supported inputs and remaining gates.

On Windows, run `powershell -ExecutionPolicy Bypass -File scripts/install-desktop.ps1` from the extracted package. It installs the offline app under `%LOCALAPPDATA%\Programs\WellScope` and creates **WellScope Engineering** on the actual Windows desktop, with the original WellScope icon. Re-run it from a newer package to update an existing recognized installation.
