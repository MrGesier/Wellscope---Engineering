# Phase passage and quick BHA pre-design

Entry points: **Whole string in hole → Phase passage**, and **Drillstring & BHA → Quick simulation** (`#bha-quick`). The latter also has a jump button at the top of the whole-string viewer.

## Data ownership

Both tools explicitly freeze the whole-string study, including its survey, architecture, bit-to-top tally, materials, mud and axial settings. They do not silently substitute the separate catalog/project tally. Recapture after editing the study. Exports contain the full frozen inputs and every candidate, depth and failure. Inspect explicitly applies a candidate/depth to the 3D workspace; recalculation failures remain failures.

The phase tool moves a user-selected contiguous package one component nearer/farther from the bit. The quick tool generates at most nine unique candidates from recognized stabilizers and jar-through-accelerator packages. Bit and top string segment remain fixed. Tools, total tally length, mass, properties and internal package ordering are preserved. Automatic candidates cannot insert another tool inside a recognized jar package. This is a placement search, not a catalog synthesis or connection-design engine. Missing required capabilities are reported, not filled with invented tool dimensions. Gamma ray is never inferred from generic MWD/LWD.

## Calculations

- Between 2 and 21 evenly spaced bit depths in a user-defined interval, including endpoints. Every static calculation uses the full occupied string and the existing transverse/contact solver. Failed stations have no successful passage label or interpolated graph.
- Sum of wall-contact reaction magnitudes (tf); peak interior tube-equivalent bending stress (MPa); nominal radial gap (mm), not remaining eccentric clearance. End supports and stencils crossing component interfaces are excluded from bending peaks. Results depend on mesh and depth sampling.
- Maximum occupied survey interval DLS (degrees/30 m), plus full planned-survey build/drop/DLS objective checks. Target is the planned endpoint in the local survey north/east/TVD frame. A target mismatch is reported; the software does not create a replacement trajectory.
- Jar distance to calculated effective-force zero crossings, if distributed loads exist. Distance zero indicates overlap; no universal acceptable distance is invented. No latch, firing-force or impact optimization is performed.
- Quick load tracks: separate off-bottom pickup/slackoff at nonzero axial speed with RPM zero, and off-bottom rotation at the input RPM. Bit force and bit torque are zero. Input friction, mud and block weight remain unchanged. A 0.1 m/s idealized trip speed is used if the supplied axial speed is zero; this quasistatic Coulomb model depends on motion direction, not trip dynamics. These load cases do not replace the original transverse calculation's boundary conditions.
- Mechanical Pareto shortlist uses maximum sampled reaction sum and bending. Known exceeded body or run limits, failed sweeps, missing requested capabilities, target mismatch and survey-objective violations exclude candidates. Unknown ratings and unknown directional response remain unresolved: a Pareto candidate is not an approved BHA. No scalar score disguises competing objectives.

## Directional response

Build/drop/DLS versus WOB cannot be inferred from this static beam. Import a `wellscope-candidate-responses/1` bundle with `entries`, each containing:

- `study`: exact candidate input from the exported report;
- `surface`: existing `wellscope-directional-surface/1` schema, sourced BHA identity/revision and explicit quality;
- `settings`: mode, wobN, activation, toolface and inclination.

Canonical structural comparison associates the complete study, not merely its name. Any geometry, load or trajectory change invalidates the association. Source conditions still need engineering review. Synthetic surfaces are labelled synthetic and are not inferred for modified BHAs. Directional WOB intervals reflect source interpolation only, not joint mechanical approval or attainment of the target along the path.

## Research and limitations

[Odfjell, jar placement](https://www.odfjelltechnology.com/activity/drilling-jar-placement-how-to-get-it-right/) emphasizes neutral-point placement, hammer mass and jar/energizer requirements. Its rules of thumb are not applied as universal OEM limits.

[H&P, SPE-207935](https://www.hpinc.com/resources/technical-paper/stiff-string-casing-design-tortuosity-and-centralisation) motivates considering stiffness, clearance and tortuosity rather than minimizing contact counts. It does not validate this solver.

The previously reviewed DrillScan holistic BHA design paper also requires bit/rock response, gauge and formation-dependent directional modelling. This release does not claim that capability. Differential sticking, pack-off, keyseating, post-buckling, dynamic jarring, formation prediction, stress concentrations and connection compatibility are not solved. Finite depth samples cannot certify continuous passage.

## Verification

Comparison diagnostics distinguish exclusion reasons from unresolved evidence. They show absolute contact/bending differences versus the reference (no percentage division by a zero reference), identify missing required equipment, trajectory/target conflicts, failed solves and exceeded limits including the original contact load case. Empty/nonfinite sweeps cannot enter the shortlist. Small differences still require mesh/depth refinement; deltas do not estimate numerical uncertainty. Missing ratings never become an operational approval.

Inspection opens the actual sampled peak-contact or peak-interior-bending component and MD in the 3D viewer. Phase inspection prioritizes peak contact and otherwise peak bending. Exports retain both locations and original load-case status. Duplicate response associations for the same study are rejected rather than silently choosing the first curve; rejected imports preserve the previous accepted report.

Analytical tests cover vertical zero lateral reaction/bending, hard interference, input bounds, immutable geometry, package preservation, target checks, capability gaps, exact source association, off-bottom load separation and Pareto dominance. Browser tests cover phase/quick controls, exports, inspection, source import, missing capabilities, target mismatch, invalidation and mobile rendering. Existing application analytical and browser suites are run alongside these tests; they are regression checks, not field validation.

Application coherence review: existing regression flows cover survey/QC, catalog and tool drawings, operating limits, unit conversions, data/report round trips, directional response gates, load/shape coupling, A/B conditions, mobile views and invalidation. New flows preserve explicit study ownership, SI storage with tf/tf.m display, source-bound response association and depth-down load tracks. A detected package-separation bug was fixed before delivery. The full synthetic 3.8 km example was also exercised with seven candidates and distributed loads; it is not independent engineering validation. Cross-module inputs remain explicitly imported/captured rather than automatically synchronizing unrelated studies.
