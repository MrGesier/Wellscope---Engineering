# Whole-string transverse contact preview

Open `#string-in-hole` or BHA static > Whole string in hole. The original synthetic Northbank example contains a full 3,800 m tally, survey, casing/open-hole architecture and assumed steel stiffness. It does not load or overwrite the current project's engineering inputs. Export its JSON to see the complete schema; import a complete sourced study to replace it. Joint dimensions in the example are assumptions, not vendor ratings.

Run in / Pull out changes bit MD and recalculates static equilibrium every 700 ms. Travel step is a visualization step, not a physical running speed. Disable Follow bit to watch components pass a fixed well interval. Select a component or contact for inspection. Surface triangles show schematic body features and repeated pipe joints; beam stations are a separate calculation mesh. Arbitrary imported equipment gets an equivalent tube unless its family is recognized. No manufacturer CAD accuracy is claimed.

## Formulation and limitations
Two transverse unknowns per survey station, in fixed local normal planes. Minimize discrete bending energy EI |p[i-1]-2p[i]+p[i+1]|^2/(2h^3), prescribed constant-tension energy T |p[i+1]-p[i]|^2/(2h), and buoyed gravity potential, subject to circular clearance disks. Both endpoints are centred pins. Equivalent EI is harmonically averaged in cells spanning components. Contact diameters and bore clearance conservatively cover each cell; short features may therefore affect nearby stations. Repeated joint envelopes are modeled where cells intersect declared joint intervals; the preflight interference check conservatively checks maximum joint OD throughout the component.

Banded Cholesky rejects an indefinite free system before projected SOR. Maximum projected equilibrium residual must be below 0.5 N. Transverse displacement gradients above 0.1 are rejected. Reactions are lumped nodal reactions, and depend on mesh spacing: they are not distributed contact pressures. Compare 5 / 10 / 20 m meshes; local tool contacts need refinement beyond this whole-well preview. The 1,000-interval limit is explicit.

The inspection view straightens the survey for readable local offsets; overview shows actual survey geometry. Transverse magnification is reported and shared by bore and string. Red marks show contact envelopes, which may exceed a rendered body at a coarse station. Surface and bit supports are not wall contacts. No nonlinear postbuckling, friction, torque coupling, actual axial tension profile, vibrations, wear or cuttings transport is solved. Constant tension is an independent trial input, not inferred from hookload/WOB. This is a preliminary visualization model, not a validated stiff-string operating-window calculation.

## Verification
Analytical simply supported gravity beam deflection within 1%, zero transverse load for a vertical beam, rotation invariance, tensile stiffening, circular clearance constraints, rejection of unstable compression and geometric interference, and full-string motion across casing shoes. Browser checks cover both travel directions, tool selection, camera invariance, invalidation after input edits and mobile rendering.

## Background
DrillScan/H&P, Casing Wear and Stiff String Modeling Sensitivity Analysis (SPE 183388), distinguishes pipe-body/tool-joint contacts and trajectory effects: https://hpinc.com/media/technical-publications/Casing-Wear-and-Stiff-String-Modeling-Sensitivity-Analysis.pdf . This independent prototype does not reproduce or claim validation against that proprietary solver.
