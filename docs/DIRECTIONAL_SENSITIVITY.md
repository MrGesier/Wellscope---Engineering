# Directional response and chart conventions — 0.7

## Model boundary

This module simulates a supplied directional response surface. It is not a flexible BHA contact solver and does not derive bit side force, tilt, rock cutting, equilibrium curvature or buckling from a component tally. The fictional example is original and intentionally shows differing WOB trends across steering modes and activation levels. No private report values were copied.

The workflow separates geometry, directional response, sensitivity and observed survey behavior. Reviewed training examples distinguish rotating motor, sliding motor and RSS studies, with WOB, toolface, bit steerability and activation sensitivities. They also require fixed-condition segments for post-analysis. A WOB-to-DLS relationship is therefore not universal.

Official background: [SLB directional drilling](https://www.slb.com/resource-library/oilfield-review/defining-series/defining-directional-drilling) describes the influence of stiffness, stabilizer position/gauge, WOB, hole geometry and formation on directional tendency. [SLB directional systems modeling abstract](https://www.slb.com/resource-library/technical-paper/dr/spe-170644) distinguishes passive BHA behavior and active steering. Neither source supplies calibration for this implementation.

## Transparent calculation

Each mode has ordered positive WOB knots in newtons. At each knot, passiveBuild, passiveRight, activeHigh and activeRight are curvature components in degrees per 30 m. Linear interpolation is used only between supplied WOB knots. Out-of-range queries are refused. No generic WOB polynomial is presented as a physical law.

For activation a and toolface angle t, the assumed active vector is rotated in the local highside/right plane:

- build = passiveBuild + a × (activeHigh × cos(t) − activeRight × sin(t))
- right curvature = passiveRight + a × (activeHigh × sin(t) + activeRight × cos(t))
- DLS = hypot(build, right curvature)
- azimuth turn rate = right curvature / sin(inclination)

These are local differential curvature quantities. Turn rate is omitted within 1 degree of vertical; DLS remains defined. Inclination changes coordinate conversion only, not the source BHA mechanics. The rotating mode sets a to zero. The motor sliding fraction uses the same explicit vector blend; it is not a simulated sequence of slide/rotate drilling intervals. The activation blend and toolface rotation assume an isotropic response around the passive vector; formation anisotropy and nonlinear contact/actuator behavior are not computed.

100 ft equals 30.48 m, so rates in deg/100 ft equal rates in deg/30 m multiplied by 1.016. WOB can be displayed in tf, kN or klbf. Exported tables identify all units.

## Source surface format

See `demo_data/directional-response-surface.json` for the complete original example. The schema is `wellscope-directional-surface/1`. Required fields are quality (SYNTHETIC or EXTERNAL_MODEL), source, revision, bha and curves. Document fixed formation, gauge, inclination and modeling assumptions in conditions. Each curve has a unique mode (rotating, sliding or rss) and at least two strictly increasing WOB rows. Each row contains wobN, passiveBuild, passiveRight, activeHigh and activeRight.

An EXTERNAL_MODEL surface retains its label and source; import is not independent validation. Geometry edits do not recalibrate it. Use the BHA identity and revision to match the source design. Save sensitivity case stores a complete snapshot and SHA256 in the project; Export Project preserves it. JSON surface export preserves the response coefficients, while CSV and standalone HTML report preserve the selected response context. Unapplied changes disable report/CSV export and saving.

## Graphics and component families

Depth tracks use measured depth vertically downward; trajectory profiles use TVD downward and radial horizontal displacement horizontally. WOB plots use horizontal WOB and vertical curvature, not a depth-style inversion. The steering envelope uses right curvature horizontally and signed build vertically with equal axis scales; this is deliberately not an azimuth-turn polar plot. Plan views use North upward and traveling-cylinder views highside upward. Spectra and particle distributions keep frequency or particle size horizontally.

Technical equipment illustrations are original family schematics, not manufacturer drawings. Axial lengths are compressed. PDC, tricone, motors, RSS, stabilizers, collars, telemetry/logging, drillpipe, HWDP, reamers, jars, shock/acceleration tools and subs share one visual system. Dimensions and ratings still require explicit sources.

## Validation

Analytic tests cover interpolation, activation endpoints, toolface vector reversal, DLS identity, near-vertical turn refusal, domain validation and unit scaling. Browser tests cover the searchable 23-family catalog, mode/parameter changes, unit invariance within floating-point tolerance, import/export, project snapshots, depth-down tracks, standalone reports and mobile layouts. These software checks do not establish field validity of the illustrative coefficients.
