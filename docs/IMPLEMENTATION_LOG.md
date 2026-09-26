# Implementation log — 2026-09-26

Baseline: `724a4f751ec94c35db005ef88a3b52d04e9b3a1e`, public `MrGesier/Wellscope---Engineering`, original Alpha 0.3. Changes are on an isolated feature branch. Historical application directories and tests were retained.

The supplied integrated specification was read locally. Its controlling new-module addendum was absent from Downloads and the repository; exact-title public web search returned no result. No proprietary PDF, figure or numerical trace was copied.

Implementation added evidence/schema/units/reference utilities; bounded segment-pair search; explicit rule revisions, scope and persistence; shared selection and additional geometric views; a source-backed BHA inspector with 23 SVGs; selected-depth/component-boundary axial integration; directional geometry and cuttings workspaces; reports and offline browser checks. Runtime dependencies remain entirely local.

Actual final verification commands and outcomes:

```text
npm test
PASS: 11 original engine checks
PASS: 21 original v0.3 checks
PASS: English UI wiring and 76 help definitions, 26 heading tips, 11 original family tips
20 v0.4.2 acceptance groups passed

npm run test:browser
PASS: offline Edge launch; limits and exact linked MD; PSD and directional gates;
23 local SVGs; BHA reorder; bit depth; SHA256 report; backup round-trip;
incompatible reference block/recovery; mobile layout; no page errors or external requests

git diff --check
PASS: no whitespace errors
```

The browser harness exercised the actual file-origin app at 1280×720 and 390×844 and generated six real screenshots. These are generated evidence artifacts, excluded from Git and included in the delivered distribution's verification folder. An initial agent-browser connection failed; the final browser verification used Playwright with installed Edge. Test-discovered syntax/layout/invalidation issues were corrected before the passing run above.

The release remains an alpha. See RELEASE_STATUS.md for remaining acceptance work and separately gated P1/P2/P3 scientific capabilities. Passing these tests is not an engineering approval or a claim of complete specification compliance.

## Expanded implementation — 26 September 2026

Added explicit canonical-role mapping, source-backed completion and section editing, BHA source/property expansion, separate cased/open friction, exact-basis field-weight comparisons, sourced vendor RPM/torque tables, observed survey BUR/TUR, measured Hann-window spectra, full evidence fingerprints, an original vector logo and Windows desktop installer. Added numerical and actual-browser acceptance coverage plus pinned Windows CI. See SPEC_COVERAGE.md for the final supported scope and remaining scientific gates.
