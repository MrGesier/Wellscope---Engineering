# 0.5 verification additions

`npm test` now includes independent analytic vectors for MSE unit conversions, DOC, standoff limiting geometry, nominal/minimum-wall denominators, ECD, pressure-area signs, matched operations residuals, azimuth wrap, coordinate distance and vertical axial friction matrices. Source/QC, missing-value, invalid-geometry and case-count refusal checks are included.

`npm run test:browser` includes real Edge file-origin tests of the 16-card library, all calculation processors, external records, stale-result refusal, report versions and revisions, quantity-aware comparisons, self-contained HTML, SHA256 changes, complete project round-trip, CSV QC refusal and mobile layout. HTTP requests and page errors are asserted absent. Existing geometry/data browser suites also pass locally.

These checks verify implementation behavior and simple analytic cases. They do not validate operational engineering models, calibrate source observations, establish commercial-software equivalence or approve field use.

# Validation record

Environment: Node.js 26.9.0; installed Microsoft Edge, headless Chromium through Playwright; Windows; file-origin launch. The runtime application has no npm/CDN dependency.

## Automated checks

`npm test` runs the unchanged original tests plus `tests/test_v042.js`:

- Original engine: 11 checks (survey geometry, buoyancy/friction and input validation).
- Original v0.3: 21 checks (orthonormal frames, illustrative covariance projection, sections and shared branch geometry).
- Original English help: 76 definitions, 26 heading tips and 11 original equipment-family tips.
- v0.4.2: 20 acceptance groups covering analytic crossing/skew/degenerate geometry, indexed versus exhaustive proximity, observed-duration grouping with gap refusal, reference failure, rule boundaries, dimensional mismatch, scope/QC/revision behavior, quoted CSV/missing inputs, azimuth wrap/antipodal rejection, weight integration across component boundaries, motor-domain refusal, directional no-prediction gate, PSD normalization/bracketing and invalid sampling bases, empty real-project defaults and canonical ordering.

`npm run test:browser` exercises actual file-origin Edge UI:

- Load CASE_F and a source-labelled synthetic warning at exactly 3450 mMD; click it and verify shared selection.
- Analyze synthetic sieve data and directional geometry; verify interval linkage and NOT_COMPUTED predictions.
- Load all 23 local SVGs and reorder components.
- Change bit depth and check the actual axial result boundary.
- Build SHA256 report, export/reimport backup, retain four wells and source trace.
- Reject mismatched RT/MSL references and block evaluation; recover with compatible references.
- Verify laptop and mobile layout, zero browser exceptions and zero external resource requests.

Real captured UI images are under `screenshots/v042/`. Browser screenshots are evidence of rendering only, not solver qualification.

## Scientific limits of these tests

Analytic mathematical cases establish those specific calculations within the stated tolerances. They do not promote the model to BENCHMARKED or FIELD_VALIDATED. ISCWSA Rev5, validated directional response, stiff-string mechanics, dynamics, equipment ratings and operational acceptance remain separately gated. No proprietary study vectors were used.

## Expanded source-data acceptance

`tests/test_data.js` adds 12 groups: canonical role/unit/source mapping, reference/elevation refusal, completion validation, vendor units/conditions/domain, separate pressure–torque tables, matched PUW/FRW/SOW and time bounds, known 2 Hz amplitude spectrum, clock/QC refusal, observed BUR/TUR, spatial pruning on 1000 segments, and analytic horizontal loads with separate open/cased friction.

`tests/browser-data.cjs` verifies canonical import and tie-in preservation, completion editing, vendor pressure–torque interpolation, friction geometry invariance, matched observations, measured frequency response, observed directional intervals, invalid-reference rollback and logo loading in actual Edge.

The Windows CI workflow runs both numerical and browser suites. A synthetic scaling test measures precise segment-check reduction; it is not a wall-clock benchmark of an entire large field project.
