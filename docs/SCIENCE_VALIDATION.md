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
