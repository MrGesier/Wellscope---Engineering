# Startup and prepared training project

The visible sequence of unrelated legacy workspaces came from eagerly initialized script tags, including an automatic case navigation, before final workflow navigation ran. A single generated runtime preserves dependency order and an explicit boot screen hides legacy DOM until load completes. Runtime errors remain visible on that screen. No additional application window is launched.

The initial form is populated with an independently authored fictional Northbank N-04 study. It contains 153 survey stations, a build/hold/slight-drop trajectory, a complete string and casing/open-hole architecture, and nine interpreted lithology intervals spanning MD 0–3800 m. The lithology is an along-hole interpretation, not a spatial geological model or field import. CSV templates describe the four import schemas.

The dashboard restores a combined pickup/slackoff depth plot with sourced bounds, a separate torque track, plan and vertical-section views, survey build/drop/DLS, and separate response build/drop and DLS versus WOB. Axes begin at zero where requested; unsupported WOB values remain blank rather than extrapolated. Drop magnitudes are positive. Toolface 0/180 comparisons are steering cases, distinct from the selected-toolface rates. ROP remains an entered target.

The friction comparison changes only open-hole axial friction, holds other conditions fixed and reports reference/trial/difference without mutating the prepared study. The contact table shows beam-station reactions and excludes end supports. Its mesh-dependent transverse model is not coupled back to friction and does not certify passage or freedom from sticking.

Scientific interpretation references:
- SLB, Defining Directional Drilling: https://www.slb.com/resource-library/oilfield-review/defining-series/defining-directional-drilling
- SLB, Dogleg: https://glossary.slb.com/terms/d/dogleg
- SLB, real-time torque and drag monitoring: https://www.slb.com/resource-library/technical-paper/di/an-innovative-workflow-for-real-time-torque-and-drag-monitoring

These definitions support the distinction between trajectory curvature and BHA response; they do not validate the fictional response coefficients.

Build after any runtime source change: npm run build:3d, then npm run build:runtime. CI verifies that the committed bundles match their sources.
