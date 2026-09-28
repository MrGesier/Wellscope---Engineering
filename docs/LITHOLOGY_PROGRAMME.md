# Lithology and drilling programme — 2026-09-28

## Product scope

An inexpensive, transparent interval-planning workflow, not a replacement for a validated coupled stiff-string / bit-rock / hydraulic simulator. The terracotta, sand and dark-earth palette and stratified header support a practical geoscience workspace. The supplied LinkedIn post describes Andy McDonald's Probe Lab as a teaching resource; no assets or proprietary calculations are copied.

## Inputs and outputs

- Freeze an independent whole-string study. Import interpreted lithology via interval CSV (`from_m,to_m,lithology,source`), JSON interval array, or a restricted LAS 2.0 / WRAP.NO facies-code log. LAS requires DEPT/DEPTH in m or ft, increasing samples, a named code curve and explicit code-to-rock mapping. Nulls remain gaps; no last-sample extrapolation. GR is not automatically a lithology interpretation. DLIS/LIS/PDF need external conversion.
- Common and per-formation planned WOB, RPM, ROP, flow and mud density; optional required gamma/MWD/LWD/RSS capabilities. These targets do not predict performance.
- Sourced, already derated min/max bounds, with unknown values preserved. Five discrete stations per interval, visible depth tracks, entered envelopes, margins and exceedances. Unlogged gaps are never connected. Planned on-bottom duration is interval length / entered ROP, excluding trips, connections and NPT.
- Pickup/slackoff/rotating torque use the existing off-bottom soft-string cases. WOB is not silently converted to effective bottom compression. Drilling bit torque and nonlinear coupled contact feedback are absent. Existing exceeded load-model ratings remain exclusions even if programme limits are looser.
- Supplied hydraulic profiles interpolate in MD at exactly matched flow and density for the frozen geometry. Recapturing geometry clears hydraulic and directional associations. SPP is separate from annular loss; pressure reference assumes atmospheric annulus outlet. BHP = density*g*TVD + annular loss; ECD = density + annular loss/(g*TVD), undefined at zero TVD. No rheology, choke backpressure, surge/swab or well-control certification.
- Directional build/drop/DLS needs an exact study-associated response for the formation, flow, density and RPM. No universal SPP-to-drop or lithology-to-ROP law is fabricated. BHA comparison remains a separate contact/bending placement screen, not a full global optimizer.
- Save the draft to the project and export project JSON, programme JSON or a standalone HTML client draft. Recalculate after import or any edit. Failed imports preserve the prior valid draft/report.

## Sources consulted

- User's reference / Probe Lab explanation: https://www.linkedin.com/feed/update/urn:li:activity:7510024206944763904
- SLB, ECD definition and annular pressure-loss basis: https://glossary.slb.com/terms/e/equivalent_circulating_density
- SLB, hydrostatic pressure: https://glossary.slb.com/terms/h/hydrostatic_pressure
- SLB, mud motor hydraulic drive: https://glossary.slb.com/terms/m/mud_motor
- USGS, LAS format and CWLS stewardship: https://www.usgs.gov/programs/national-geological-and-geophysical-data-preservation-program/las-format

## Verification

Analytic hydrostatic/ECD balance, SPP separation, exact hydraulic-condition matching and no extrapolation; LAS depth conversion/null gaps/mapping refusal; limit boundaries and missing-data refusal; immutable snapshots. Browser coverage: worked example, dashed limits and bands, stale gating, source mismatch, save/load, invalid import preservation and mobile layout. These are software/analytic checks, not field calibration.
