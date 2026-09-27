# Distributed run mechanics — 0.10

## Workflow and data ownership

Open **Whole-string loads & pull**. Capture the current project's reference survey and
bit-to-surface assembly, enter run identity/conditions and allowable component ratings,
then calculate. The snapshot owns all inputs consumed by this solver. Capturing again
resets ratings deliberately: a changed component must not inherit an unrelated rating.
A geometry change makes linked results stale and disables saving/export. The fictional
example is independent and never overwrites the project trajectory or assembly.

Save creates an immutable-by-copy `run_studies` record and updates `active_run` in the
project. These collections participate in project input hashes and report appendices.
Other legacy study pages are not migrated to this data model in this release.

All persisted physical values are SI numbers. Display conversion changes neither the
solver result nor the physical input. Available force/torque pairs: tf/tf.m, kN/kN.m,
klbf/klbf.ft. One metric tonne-force is 9806.65 N. Length is metres and material yield
is displayed in MPa. The UI supports source-labelled ratings for every component.

## Independent model

This is a soft-string screening implementation, not a reproduction of proprietary
DrillScan algorithms. It does not include bending stiffness, constrained buckling,
fatigue, wear, viscous drag, hydraulic pressure losses, tool dynamics or vibration.

MD increases downward; effective tension F is positive. For uniform section areas
Ai, Ao, dry linear mass m, and densities rhoi/rhoo:

- effective weight per length w = g (m + rhoi Ai - rhoo Ao);
- hydrostatic pi/po use the survey TVD and the declared surface pressures;
- wall tension = F + pi Ai - po Ao;
- distributed contact resultant n = hypot(F sin(I) dA/dMD, F dI/dMD - w sin(I));
- upward integration dF/ds = w cos(I) + mu n va / hypot(va, vt);
- resisting torque gradient = mu n r vt / hypot(va, vt), with vt = RPM 2 pi r / 60.

The inclination/azimuth derivatives use increasing MD (hence the gravity/contact sign).
Axial speed va is positive upward. No-motion friction is zero, not a static stick/slip
solution. Bottom force and resisting torque are prescribed boundaries. Equal angular
speed is assumed along the string; a motor/RSS speed profile is not represented.

RK4 integrates effective tension and torque with local inclination/curvature frozen at
the cell midpoint. The mesh includes survey stations, casing shoe and every component
boundary. Both sides of a boundary are retained for wall-force/body checks. Survey
station coordinates use minimum curvature; within-station inclination, azimuth and TVD
are interpolated. Refine survey and integration spacing to check convergence.

Hydrostatic volume uses uniform annular OD/ID, even for `rated_tool` sections. Complex
components/tool joints need an appropriate equivalent section; their external silhouette
is not a displacement-volume model. Surface hookload is top effective tension plus tare;
users must reconcile measured hookload, pressure boundary and block basis before comparison.

## Limits and pull headroom

All in-hole components require geometry/limit sources, declared assessment type and
allowable tension/torque. Compression ratings are required when wall force is negative.
Tube bodies additionally require yield stress and a design factor: axial wall stress,
Lame radial/hoop stress and torsional shear produce a maximum inner/outer von Mises stress.
Tool ratings are separate caps, without a manufacturer combined-load interaction law.
Rig hookload and drive torque limits require their own source. Limits are already derated;
the body design factor applies only to yield stress. Bending is excluded from all checks.

Effective compression reports constrained buckling as unevaluated. An exceeded known
limit has status EXCEEDED even if other information is missing. Otherwise missing evidence
returns NOT_FULLY_EVALUABLE. WITHIN_CONFIGURED_LIMITS means only the enumerated checks.
Every check and margin is retained in the JSON output; the governing check is the smallest
relative margin. Samples at mesh endpoints can miss sub-cell stress maxima.

Pull headroom requires an initially within-configured-limit, off-bottom run with upward
motion and nonnegative effective tension. Hydrostatic wall compression can remain, but
must have an explicit allowable compression rating. Additional bottom tension is swept
while friction/contact/torque are re-solved. An exponential search brackets an exceedance;
64 ascending load samples find the first sampled failure, then 32 bisection steps refine
it. It is a sampled model headroom, not a guaranteed global maximum: narrow unsampled
nonmonotonic failures are not excluded. Fixed speed, RPM, pressures and torque boundary
are assumptions. The additional hookload differs from additional bottom tension.

## Reference comparisons and evidence

The UI exports a reference template; import requires matching runId, revision, well,
datum, operation, a source and explicit inputMatchConfirmed=true. Rows contain md and
optional effectiveN/torqueNm in SI. The engine rejects duplicate/out-of-domain MD and
never extrapolates. Linear interpolation and RMSE quantify differences only. User
confirmation is a provenance declaration, not proof that the inputs match. Comparison
results and imported reference are included in run JSON. It never sets a validated status.

No matched real-report validation has been completed. The reviewed private workbook
contains output curves, but a corresponding complete input deck has not been established.
Private customer worksheets, numeric profiles and limits are not distributed in this repo.

Tests cover vertical/horizontal force balances, helical friction resolution, pressure
conversion, hydrostatic stress, component transitions, missing limits, pull governed by
a component, mesh convergence, comparison context and range rejection. Browser tests
exercise unit switching, persistence, report export and stale geometry invalidation.
These verify selected implemented behaviours, not field predictive accuracy.

## Public scientific background

- Johancsik, Dawson and Friesen, *Torque and Drag in Directional Wells—Prediction and
  Measurement*: https://www.osti.gov/biblio/5571160 (friction model and field calibration).
- US4972703A: https://patents.google.com/patent/US4972703A/en (primary historical discussion
  of drillstring force/torque models and soft-string limitations).

Private training material guided the requirements for traceable inputs, distributed
profiles and limits; it is not shipped and does not establish equivalence to its solver.
