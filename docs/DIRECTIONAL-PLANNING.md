# Build / drop and DLS planning

Open **Directional** in the sidebar, then **Build / drop planning** beneath the source-response workspace. The BHA static deformation viewer is a separate calculation and is not a predictor of drilled curvature.

## Research basis

Reviewed the user's cached Drive report *WhitePaper5 – Holistic Approach To Find Fit-for-purpose BHA Design* (Florent Couliou, April 2019), confirmed its identity in Drive, and read Farrag & Menand's primary paper [AADE-19-NTCE-078](https://www.hpinc.com/media/technical-publications/Finding-the-Optimum-BHA-through-Data-Analytics-Modeling.pdf). The Drive source is [here](https://drive.google.com/file/d/1p3L3P8YI-X6w60yCpkP5OShD5SHSs8ES/view).

The implementation follows these implications, rather than copying their proprietary models or reported datasets:

- A useful design question is which WOB range meets an inclination objective under declared conditions. A near-zero build target alone does not constrain lateral dogleg.
- The bit, rock and BHA must be considered together. Stabilizer spacing/gauge, overgauge, inclination, formation, bit steerability/walk, WOB and actual toolface can affect response. More WOB does not universally mean more build.
- Surface WOB is not necessarily downhole WOB. Field comparisons require matched drilling intervals, modes and actual toolface, with calibration and subsequent validation.

## Calculations and scope

Survey input uses MD in metres and angles in degrees. Signed build is 30 ΔI / ΔMD. Positive drop magnitude is max(0, −build). Exact interval dogleg is atan2(norm(t1 cross t2), t1 dot t2), scaled to degrees per 30 m. Azimuth turn uses the shortest signed difference; it is omitted near either vertical (within 1 degree) and for exactly ambiguous 180-degree differences. Interval rates do not recover sub-survey tortuosity. The local identity DLS² = build² + (sin(I) turn)² must not replace the finite-interval dogleg formula.

The existing source response interpolates build/right curvature components between WOB knots at fixed settings. Planning intersects each segment with user WOB and signed-build bounds and the disk build² + right² ≤ DLSmax². This quadratic intersection finds interior solutions, single-point tangencies and multiple disjoint ranges. Adjacent ranges are merged; extrapolation is never used. Plots are densified because DLS is the norm of interpolated components, not a linearly interpolated scalar DLS.

Units default to tonnes-force and degrees/30 m; all objective inputs convert with the response unit selectors. Exports include canonical N and degrees/30 m, source surface, source quality, revision, assumptions, settings and ranges. Editing inputs invalidates the prior export.

**SYNTHETIC** examples are original teaching coefficients, not digitized DrillScan outputs. **EXTERNAL_MODEL** surfaces remain unvalidated external predictions. Highside/lowside use the existing rotated-vector assumption; they are not new contact/rock simulations. Inclination controls the turn-rate conversion only; it does not recalibrate a source curve. Imported sources must describe their fixed conditions. Planning does not assess mechanical operating limits or certify a safe window.

Next physical-model step requires a validated bit–rock directional closure and calibration datasets linking measured downhole loads, bit/BHA geometry, formation and actual steering history. The static beam model currently has neither that closure nor appropriate drilling-direction boundary conditions.

## Verification

Analytical tests cover pure drop, azimuth wrap, depth scaling, vertical rejection, quadratic interior roots, tangency, disconnected windows and domain clipping. A sampled independent membership check covers all three demo modes and four toolfaces. Browser checks exercise units, invalidation, the hold example and export provenance.
