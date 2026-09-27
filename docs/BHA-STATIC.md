# Local architecture and BHA deformation

Open **Architecture & BHA deformation**, then **Fictional example**. Keep design A, change a component length/contact diameter or WOB, and calculate again. Drag the scene to rotate its cross-plane view. Transverse magnification applies equally to bore, body, and displacement. Switch to 1× for physical proportions. Stress plots put MD downward.

Architecture is an explicit study snapshot, independent of the existing project export. Contiguous sections contain MD bounds, OPEN/CASED type, internal diameter and source. Casing/liner uses internal diameter; open hole uses nominal or caliper diameter. Use study JSON to transfer the inputs, or save locally on the current origin. Local installation and hosted site have different storage. Design A is session-only; export each design separately to retain it.

Capture reads the reference survey and bottom 12 m of the project's bit-to-top tally. Equivalent steel E/G and a 216 mm open hole are explicitly assumed, not imported manufacturer/architecture properties. Review them before calculating. Captured surveys determine the inclination and local two-plane centreline. Nearby wells stay in the existing 3D well/anticollision workspace: they are not mechanical contact surfaces. This first release is a local span model, not an entire-string model.

## Mechanical formulation

SI input; two lateral displacement degrees of freedom per node along the local bit-to-top axis. Endpoint translations equal bore-centre coordinates; rotations are free (centred pins). Uniform grid, 12–100 intervals, maximum modeled length 30 m.

The energy is `sum(EI * |u[i-1]-2u[i]+u[i+1]|² / (2h³)) - sum(P * |u[i+1]-u[i]|² / (2h)) - sum(f[i]·u[i])`. P is constant prescribed effective compression, entered as WOB. Nodal transverse gravity uses component linear mass minus displaced metal-volume mud mass. End gravity weights are half intervals. All components are equivalent annular elastic tubes; no OEM tool qualification is implied.

Cholesky checks positive definiteness of the free-node stiffness. Loss of definiteness rejects the case, even where contact might stabilize a real post-buckled string. The unconstrained solution initializes projected successive over-relaxation on circular contact disks. A projected force residual below 0.1 N is required; nonconvergence is an error, with no retained current result. Local trajectory and beam slopes are limited to 0.1. Lateral displacement remains inside the nodal bore clearance.

Contact diameter is the largest tool envelope intersecting the nodal control volume; bore ID is the smallest section ID intersecting it. This conservatively rasterizes narrow tools/transitions and makes reaction forces mesh dependent. Component bending stiffness is sampled at curvature nodes. Mesh refinement and independent validation are necessary at tool interfaces. Nodes are not physical point-contact counts.

Bending moment is EI times discrete curvature, bending stress is E times curvature times outer radius. This stress excludes axial, torsional and combined-load checks. Elastic twist integrates T/(GJ) with uniform prescribed torque. Torque is deliberately uncoupled from lateral shape. No friction, axial load-transfer solution, motor bend, anisotropic blades, large rotations, helical post-buckling, bit/rock reaction, directional tendency, wear or dynamic vibration is predicted. WOB is not hookload. No safe/unsafe window is produced.

## Verification

`tests/test_bha_static.js`: simply-supported uniform load deflection 5qL⁴/(384EI), qL²/8 bending moment, Saint-Venant twist TL/(GJ), global transverse equilibrium, mesh refinement, zero transverse gravity, compression amplification, instability rejection, interference and architecture rejection, circular two-plane contact, uncoupled torque invariance.

`tests/browser-bha-static.cjs`: worked example, baseline preservation, dirty-result invalidation, local save/load, unstable-case removal, browser errors and screenshot. These are analytical/software checks, not field validation or a matched DrillScan benchmark.

Industry scope reference: [H&P DrillScan engineering overview](https://www.helmerichpayne.com/media/product-literature/Drilling-Engineering.pdf). Its whole-string stiff-string, modal and bit/BHA capabilities exceed this local prototype. Do not equate the two.
