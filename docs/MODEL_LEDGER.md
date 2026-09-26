# WellScope v0.4.2 model ledger

All scientific outputs remain preliminary screening. Mathematical unit tests do not establish engineering acceptance, equipment capability, independent benchmarking or field validation. Review remains DRAFT and approval controls are disabled.

| Calculation | Implementation and inputs | Capability and exclusions |
|---|---|---|
| Survey stations | Minimum curvature from explicit MD, inclination and azimuth; SI geometry | PRELIMINARY_UNVERIFIED. Starts at MD zero. Missing fields, duplicate MD and antipodal tangents are rejected. No geodetic transformations. |
| Between-station positions | Straight-segment representation between minimum-curvature stations; shortest wrapped azimuth interpolation | Geometry calculations consistently use this polygonal representation. It is not continuous minimum-curvature arc integration. |
| Proximity | Global finite segment-pair minimum for independent Offset A/B; closest points, MDs and unit tangent vectors | Geometry only. Degenerate, parallel, skew and coincident cases tested. Physical clearance subtracts two known radii. No statistical uncertainty or separation factor. |
| Sidetrack | Exact copied parent stations to declared tie-in, followed by aligned branch stations | Shared history is one borehole. Parent proximity is an intentional shared-origin context, not an independent-well anticollision verdict. No covariance reset is calculated. |
| Synthetic ellipses | Preserved v0.3 projection of explicitly assumed diagonal variances | ILLUSTRATIVE only, never ISCWSA propagation or an engineering confidence boundary. |
| Axial screening | Buoyed linear weight `mass × g × (1 − mud/steel density)`, gravity projection and signed friction; partitions at survey and component boundaries and selected bit depth | PRELIMINARY_UNVERIFIED. Pickup, slackoff and static only. No rig tare, surface-hookload prediction, torsional torque, stiffness, fatigue, validated contact or buckling. The legacy API `hookload` alias is retained for compatibility; UI labels use string-top axial force. |
| Limits | Explicit units, operator, warning/critical values, source and revision; filter metric, well, component, operation, MD/time scope | Numeric rule comparison only. Missing, unchecked, failed-QC, incompatible-unit and stale inputs cannot produce a within-limit result. Synthetic rules cannot evaluate real observations. |
| Motor interpolation | Piecewise linear shaft RPM from source/revision-labelled Q–RPM data in SI, exact declared mud and temperature conditions | No extrapolation. Missing curve/QC/conditions returns NOT_COMPUTED. No inferred manufacturer rating, stall point, torque curve or natural frequency. |
| Directional geometry | Caliper diameter minus nominal bit diameter; compare caliper with explicitly supplied maximum pad extension | Diameter geometry only. Potential no-contact is not a build-rate prediction. A/B records retain source-labelled observations and external curves. Predictive BUR/TUR remains NOT_COMPUTED. |
| Cuttings | Dry sieve mass fractions, cumulative passing and log-size interpolation inside finite bracketed bins | Descriptive only. Requires dry-mass basis, sample/calibration/recovery context, UTC collection interval, shaker aperture and source MD/lag uncertainty. Count/area/wet/censored/failed-QC input cannot masquerade as dry-mass PSD. Pan-bracketed percentiles are null. No causal diagnosis or OVG/BHA inference. |

Reference compatibility checks declared coordinate system, datum, vertical and azimuth references, SI length basis and optional EPSG/origin/convergence/declination fields. Only matching declared local/projected frames are supported. Unsupported transforms are refused.

Source hierarchy: the supplied integrated specification defines the software requirements. Public product descriptions are design context, not scientific validation. No proprietary source documents, extracted figures, traces, customer observations or equipment operating limits were added.

Public reference pointers for future independent validation:

- ISCWSA error-model documentation: https://www.iscwsa.net/error-model-documentation/
- ISCWSA sidetrack recommendation: https://www.iscwsa.net/files/801/
- Energistics WITSML: https://energistics.org/witsml-developers-users

These are pointers, not a claim that the corresponding models or standards have been implemented or independently validated.

Additional source-data processing:

- Canonical import maps explicit wellbore IDs to the four display roles, converts declared MD units and preserves source records. Different reference frames or wellhead elevations are refused rather than transformed implicitly.
- Axial screening partitions at casing shoe and applies separately declared cased/open coefficients. Curvature is the angle between interval tangent directions. It remains a preliminary axial approximation.
- Vendor FLOW_RPM and DP_TORQUE tables require source/revision, QC, exact mud/temperature/density conditions and an in-domain query. Pressure-to-torque interpolation is external table processing, not a drillstring torque model.
- Matched PUW/FRW/SOW uses one explicit well, MD, basis and sensor zero; the user sets a maximum time separation. Differences are descriptive, not a diagnosis or friction inversion.
- Measured spectra use a mean-subtracted Hann window and a one-sided DFT with coherent-gain amplitude normalization. Uniform clock, source, QC and anti-alias metadata are required. At most 2048 samples are accepted; no modal or critical-speed interpretation is performed.
- Observed BUR/TUR is survey-angle change per 30 mMD, with wrapped azimuth and TUR withheld below 0.1 degrees inclination at either interval endpoint. These observations are never BHA predictions.


## 0.5 study calculations

All rows require declared provenance and QC reviewed or synthetic status. UI metadata adds reference and well/run context. These are descriptive calculations, not validated operating envelopes.

| Model | Implemented equation and units | Explicit omissions |
|---|---|---|
| Teale MSE | A = pi D²/4; MSE = W/A + 2 pi (RPM/60) T / [A (ROP/3600)]. W in N, T in N.m, D in m, ROP in m/h; output MPa. DOC = ROP/(60 RPM), reported mm/rev; drilling strength = W/[(D/2) DOC], MPa. | No surface-to-bit correction, efficiency factor or dysfunction diagnosis. ROP/RPM must be positive. |
| Standoff | c = (hole diameter - casing OD)/2; gap = c - eccentricity; standoff = 100 gap/c. All input lengths mm. | Eccentricity is supplied; no deformation/contact/centralizer model. |
| Measured wall loss | Loss = nominal wall - measured wall; 100 loss/nominal and 100 loss/minimum-original-wall are separate denominators. | No caliper processing, predicted wear groove or pressure rating. |
| Hydraulic observation | Hydrostatic pressure = rho g TVD; ECD = rho + supplied annular pressure loss/(g TVD); g = 9.80665 m/s², pressures converted bar to Pa. | Uniform density, surface reference; no compressibility, cuttings loading, backpressure or computed losses. |
| Pressure area | With tension positive, wall axial force = effective axial force + Pi Ai - Po Ao; circular OD/ID areas in m², pressure Pa, reported kN. | Algebraic conversion from supplied profiles only; no jar impact or coupled string model. |
| Operations | PUW-FRW, FRW-SOW, PUW-SOW; measured minus planned SPP and ECD at explicitly matched input rows. | No time/depth interpolation, rig-block correction or automated friction calibration. |
| Directional intervals | BUR = delta inclination × 30/delta MD; TUR = shortest wrapped azimuth delta × 30/delta MD, deg/30m. TUR unavailable if either inclination <0.1°. | Observed apparent rates only; no inferred local curvature or formation/bit response. |
| Coordinate residuals | Actual-plan N/E/TVD at matched MD; horizontal and spatial Euclidean norms. | Requires the same frame; no transform, uncertainty or safety metric. |
| Friction sensitivity | Existing segmented axial soft-string model, repeated at declared bit depths and open-hole coefficients, with cased friction and shoe held fixed. | No torque, buckling, reliable contact force or rig hookload. Full shared input snapshot retained. |

External study records require a quantity, unit, model name and revision. They are not computed by WellScope. Graphs separate external quantity/unit/model groups and friction coefficients. Report comparison refuses incompatible references, well/run contexts, units, interval endpoints or duplicate MD cases; no interpolation is performed. Input SHA256 identifies inputs, not a reviewer's approval or cryptographic signature.
