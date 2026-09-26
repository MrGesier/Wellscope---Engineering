# v0.4.2 implementation status

This is a reviewable, incremental implementation on the existing v0.3 application, preserving the offline `LAUNCH_WELLSCOPE.cmd` path and original tests. It is not an operations-approved calculation system.

## Implemented

- Shared evidence project, revision, four-axis status display, SHA256 report/input fingerprints, JSON backup round-trip and optional browser-local backup.
- Robust quoted survey/measurement CSV parsing, missing-numeric rejection, source/QC metadata, matching-reference gates and explicit blocked outputs.
- Finite segment-pair proximity, exact shared sidetrack history, well/MD/component interval selection, plot cursor and focused scene marker; plan, section, schematic, spider, ladder and transverse projected views.
- Six independently generated synthetic acceptance fixtures, including an analytic between-station crossing, skew near miss, shared 2200 m branch, high-angle geometry, incompatible-reference case and 4200 m training well.
- Source-backed editable/importable limit revisions, dimensional conversion, inclusive/exclusive boundaries, scope filters, event inspection, historical replay, local acknowledgement and CSV/report trace.
- Original 23-tool transparent SVG library, schema-driven component/source properties, keyboard and drag reorder, BHA JSON import/export and source-domain-limited motor RPM interpolation.
- Selected bit depth and component-boundary axial screening; separate source-labelled measured hookload channel, calibration metadata checks, and no output on an unsupported selected well.
- Directional geometry fields and case A/B evidence comparison; source-labelled observed/external records without fabricated predictions.
- Surface cuttings sample forms, sieve CSV, provenance and lag metadata, bracketed D10/D50/D90, cumulative chart, linked MD interval and optional user-sourced coarse-fraction rule inputs.
- Readable calculation summaries, raw-record disclosures, printable report appendix, local plot captures, preserved English help and responsive browser verification.

## Release limitations / remaining acceptance work

- The controlling companion file `03_NEW_ENGINEERING_REQUIREMENTS_EN.md` was not present locally or in the repository; exact-title public web searches returned no results. S11/S12 use the requirements available in the supplied integrated specification. Their complete DIR/PSD acceptance register cannot be certified without that addendum.
- This is an alpha implementation, not a declaration that every P0 UX and scaling criterion has passed. Full-project performance benchmarking and exhaustive per-variable status coverage still need acceptance work. Canonical role mapping and source-backed completion editing are now implemented. Bounding-volume spatial pruning and observed-duration alert grouping are implemented and tested.
- Legacy demo section labels and some legacy help retain the original training layout. The CASE_F fixture supplies its own source-labelled section intervals. Survey QC does not establish field survey-tool accuracy.
- The local standalone backup format preserves the legacy trajectory editor state alongside the canonical evidence collections. The canonical importer maps four explicit wellbore roles, preserves original IDs and refuses unsupported references or different wellhead elevations. Arbitrary external schemas still require mapping.
- Matching declared projected coordinates is supported; geodetic/datum transformations, latitude/longitude and ISCWSA covariance are not. No named-rule anticollision value is enabled.
- Separate open/cased friction, matched PUW/FRW/SOW comparisons, measured amplitude spectra and source-backed one-dimensional vendor tables are enabled. Field-friction fitting, predictive dynamics and complete vendor performance surfaces are not enabled. P2/P3 mechanics, predictive directional response, dynamics, fatigue and field validation require independent equations, reference vectors and review.
- Field calibration and sample metadata are user-supplied evidence. Their presence does not establish independent scientific validation or human approval.

No deployment, main-branch merge or operational approval is part of this release.

See SPEC_COVERAGE.md for section-by-section coverage, including canonical mapping, completion editing, observed BUR/TUR and desktop packaging.
