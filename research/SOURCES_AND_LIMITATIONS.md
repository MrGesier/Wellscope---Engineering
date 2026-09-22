# WellScope Engineering Alpha 0.3 — technical sources and model boundaries

This register separates (A) concepts established in the reviewed references, (B) functions actually implemented in this independent prototype, and (C) functionality still missing. No confidential source documents or proprietary executable libraries are included in the distributable package.

## A. Information drawn from user-provided references

- `M16-112 DrillScan Software Lessons Learnt Advanced Tutorial.pdf`, pp. 9–14: BHA modelled as a bit–rock–BHA system, with relevant influences including bit geometry, stabilizer arrangement, drillstring stiffness, motor/RSS steering, formations and hole overgauge. The described push-the-bit and displacement-control assumptions and historical model limitations are not automatically transferable to this prototype.
- The same tutorial, pp. 15–17: pre-analysis sensitivity to toolface orientation (TFO), RSS activation, WOB, overgauge and rock UCS. Pages 18–22 discuss segmented post-analysis, fitting, drilling-log QA/QC and limitations of averaging automatic steering toolface measurements. Pages 23–24 describe trajectory prediction and pad-contact sensitivity to hole overgauge in the original application.
- The same tutorial, pp. 32–35: descriptions of soft-/stiff-string Torque & Drag, vibration modes, BHA sag and micro-doglegs. These descriptions do not provide enough validated reference cases to qualify a new solver.
- `BIL4-11 Drillscan vs Baker Hughes directional study.PDF`, pp. 2–5: explicit example BHA, WOB, mud, friction and modelling assumptions. Pages 8–13 compare build versus turn response; pages 22–25 compare axial, torsional and lateral natural frequencies and explicitly question the treatment of wall contacts; pages 27–31 illustrate axial tension, side forces, bending stress and a 3D drillstring plot. These are historic comparisons of one study case, not generic limits for every well.
- `DrillScan_Publication_List.pdf`, pp. 1–2: bibliography includes SPE 98965 (3D mechanics), SPE 102850 (buckling), SPE 102088 (BHA sag), SPE 110432 (BHA post-analysis), SPE 151283 (steerability), and SPE 184074 (micro-doglegs). A publication being listed does not imply that its algorithms have been reconstructed.
- `Drillscan simulation for BHA Rev5.msg` is a supplemental study exchange; manufacturer assumptions or attachments have **not** been incorporated into a validated model. User-supplied DrillScan BPL/DLL/EXE files are neither run nor redistributed; their presence is not access to the proprietary solver source code.

## B. External standards considered, but not implemented

- ISCWSA, *Error Model Documentation*, Revision 5: https://www.iscwsa.net/error-model-documentation/ . The full error-model mathematical framework, reference datasets and sidetrack clearance guidance are not implemented in this alpha.
- ISCWSA, *Error Model Sub-Committee*: https://www.iscwsa.net/committees/error-model/ . Actual instrument error codes, calibration parameters and survey procedures must come from documented and approved sources for a real well.
- ISCWSA, *Collision Avoidance Sub-Committee*: https://www.iscwsa.net/committees/collision-avoidance/ . A visual ellipse gap or one arbitrary factor cannot replace a well-specific approved collision-avoidance policy.

## C. Functionality implemented in Alpha 0.3

1. `engine.js` calculates minimum-curvature surveys, sampled geometric proximity and simplified axial-load screening. Interpolating station coordinates does **not** reproduce the actual continuous well path, and local micro-doglegs may be missed.
2. `enhanced.js` constructs a local tangent and two normal-plane axes, projects an **assumed diagonal** covariance matrix `diag(sigma_N², sigma_E², sigma_TVD²)` onto that transverse plane, and computes the orientation and radii of a displayed ellipse at `k=2`. The sigma values are manually entered, depth-invariant and independent. No instrument error propagation, interwell correlation, calibrated confidence coverage or approved EOU separation is implemented.
3. The sidetrack demonstration is a synthetic parent/daughter dataset with kickoff at 2,000 mMD. The branch coincides with the parent at kickoff; proximity screening includes only the later branch, without implementing normative sidetrack clearance procedures.
4. The named T&D well sections are hard-coded to the demonstration trajectory's MD intervals. **They must not be reused blindly for imported trajectories**; a future implementation needs to derive intervals from actual planned/realized trajectory data.
5. The eleven original SVG BHA icons are teaching illustrations. Newly inserted dimensions and masses are synthetic placeholders that users must review. No dedicated motor, RSS, pad, jar, cutter, directionality or dynamic response is calculated.
6. `tooltips.js` contains English educational explanations of inputs, units, outputs and omissions. Tooltips do not turn an unvalidated model into an operationally qualified solver.

## D. Validation required before an operational engineering application

- Common geodetic reference, approved survey-tool codes, depth-dependent 3D and interwell covariance, well-specific anticollision rules, continuous closest-approach algorithms and independent reference-case validation.
- Validated stiff-string T&D, connection and stabilizer/tool-joint contact, buckling, combined load envelopes, approved hookload and rig/equipment limits, manufacturer data and independent analytical/field benchmarks.
- Coupled bit–rock–BHA directionality, motor/RSS response, segmented pre-/post-analysis, lithology effects, BHA sag, and defensible trajectory predictions under explicitly documented assumptions.
- Documented modal boundary/contact conditions, comparison with measured downhole data, and independently validated stick-slip detection and mitigation.
- Signed engineering-report workflow including scope, survey QA/QC, input provenance, calibration, model versions, results, exclusions and engineering approval.

**Do not use any output of this synthetic alpha to approve a well trajectory, evaluate real collision clearance, specify drilling parameters, or certify a hookload or component limit.**
