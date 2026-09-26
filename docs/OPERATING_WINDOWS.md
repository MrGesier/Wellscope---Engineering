# Operating windows and force units — 0.9

## Deliverable and scope

Operating windows is a source-labelled, independent design study. It exports a client **draft**, with numeric margins, a selected-section tension–torque curve, a candidate WOB–RPM map, frequency tables, generalized first-mode forced response, normalized lateral mode shapes and the complete SI input snapshot. It saves versioned input/result records in project backups. Edits invalidate results. The map is clickable to inspect a sampled point.

It is not an implementation of DrillScan's proprietary full-BHA solver. The mechanics panel evaluates the entered local and surface load state; it does not derive these loads from WOB/RPM or claim that its headroom is the weakest point of a complete string. The candidate map intersects only its declared directional scenarios and linear resonance exclusions. It is not a global operational approval. Whole-string torque, nonlinear contact, stick-slip, whirl, fatigue, pressure/bending stresses and manufacturer connection interaction remain uncomputed.

## Engineering basis

For a uniform circular annulus, A = pi(OD²-ID²)/4, I = pi(OD⁴-ID⁴)/64 and J = 2I. Local axial stress is tension/A and outer-fibre torsional shear is torque × OD/(2J). The pipe-body check uses sqrt(axial² + 3 shear²) against entered material yield/design factor. Connection tension and torque limits are already-derated independent caps; this is not a manufacturer combined-load chart. The selected-section overpull headroom is the minimum of rig hookload headroom, pipe-body residual tension capacity at fixed local torque and connection tension headroom. An exceeded body, connection torque or separate surface drive torque check yields zero positive headroom. Negative individual margins remain visible. Incremental transfer is assumed one-to-one, at fixed torque and consistent hookload tare.

Axial and torsional branches are uniform fixed–free rods:

- f_axial,n = (2n-1)/(4L) × sqrt(E/rho)
- f_torsion,n = (2n-1)/(4L) × sqrt(G/rho)

The independent lateral model is a uniform pinned–pinned Euler–Bernoulli span with constant compression P:

- omega_n² = [EI(n*pi/L)⁴ - P(n*pi/L)²] / (structural mass/m + added mass/m)
- P = entered WOB × explicit span-compression fraction
- P_critical = pi² EI / L²

This Euler threshold is an ideal-span stability limit, **not** a borehole-constrained sinusoidal/helical buckling prediction. A nonpositive first eigenvalue makes the span unstable; the UI suppresses its forced response and excludes its grid cells. The entered effective span is not inferred from stabilizer positions or static contact analysis. Rod material density sets axial/torsional propagation; separately entered lateral linear mass and fluid added mass affect only the lateral branch.

Excitation = order × (surface RPM + exciter speed offset)/60. Natural frequencies are expanded to cover the maximum study excitation and its exclusion margin, with a fail-closed 300-mode-per-branch cap. Critical surface RPM = 60f/order - offset. The margin is user-supplied; it is not a universal safe distance. The first three lateral sine shapes are normalized illustrations of the ideal boundary conditions. No amplitude can be read from those shapes.

For the first lateral mode, generalized mass = lateral mass/m × span/2 and stiffness = generalized mass × omega_1². At frequency ratio r and damping ratio zeta, amplification = 1/sqrt((1-r²)² + (2*zeta*r)²). The entered constant generalized harmonic force produces displacement = force/stiffness × amplification. This generalized coordinate is not a predicted sensor amplitude, unbalance model or complete multimode response. Damping and forcing must be sourced; no tool failure threshold is invented.

Directional CSV rows specify scenario, WOB, build and right-walk curvature in deg/30 m. Each scenario fixes geometry, bit, formation and hole gauge externally. Linear interpolation stays inside each scenario's domain. DLS = hypot(build,right). Every declared scenario must satisfy entered build bounds and maximum DLS. Missing or incomplete coverage is NOT_EVALUABLE, never a candidate. The grid samples 25 WOB values and 61 RPM values; endpoints are sampled intervals, not continuous certified boundaries.

## Unit handling

The legacy T&D inputs, outputs, graph, section tiles, report and observed hookload offer tf/kN/klbf. Historical project fields bitforce/hookref/hookcap remain canonical kN for compatibility; conversion occurs at the UI boundary. Study tables, charts and exports convert canonical *_kN / *_kNm fields; CSV import accepts explicit tf, kN or klbf variants and rejects duplicate unit columns. BHA force/torque properties expose a selector while retaining canonical N and N.m. The new windows store SI and display tf / tf.m, kN / kN.m or klbf / klbf.ft. Existing case and directional selectors remain available. Raw reproducibility JSON keeps its declared canonical units.

1 tf = 9,806.65 N. Tonne-force is a force; tonne is a mass.

## Sources revisited

Focused rereading used the user's privately supplied Holistic Approach To Find Fit-for-purpose BHA Design white paper; 103a theoretical T&D background (combined-load limits and overpull); 103b calculations (model and buckling limitations); 103c case studies (trajectory resolution and lock-up); 104a drilling dynamics (excitation and vibration families); and the full text of 104b vibration modal analysis (frequencies, boundary conditions, span effects and WOB sensitivity). No private figures, customer data, library contents or numerical recommended operating ranges are redistributed. The UI examples and scenario coefficients are original fictional fixtures. This focused review is not an exhaustive rereading of every Drive file.

Public primary background: [H&P advanced well engineering](https://www.hpinc.com/technologies/advanced-well-engineering) describes RPM/WOB vibration windows; [H&P predictive vibration mapping](https://www.hpinc.com/wp-content/uploads/2025/08/PVM-Sales-Deck.pdf) distinguishes static contact, modal mapping and forced response. These describe a richer commercial model and do not validate the independent uniform-element calculations implemented here.

## Validation

Analytic tests cover known rod frequencies, length/added-mass/compression scaling, Euler instability, damping at resonance, governing overpull, separate local/surface torque and directional interpolation/coverage. Browser tests cover physical invariance under unit changes, explicit-unit CSV import, result invalidation, save/reload, draft export, sensitivity and mobile rendering. These are software and analytic checks, not field validation or independent full-BHA benchmarks.
