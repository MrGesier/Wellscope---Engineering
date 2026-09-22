# WellScope Engineering — Alpha 0.3 (English interface + contextual help)

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
