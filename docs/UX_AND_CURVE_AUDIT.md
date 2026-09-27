# Assembly and curve audit — 2026-09-28

## Evidence

H&P / DrillScan AADE-13-FTCE-21, *Borehole Tortuosity Effect on Maximum Horizontal Drilling Length Based on Advanced Buckling Modeling*: https://www.hpinc.com/media/technical-publications/Borehole-Tortuosity-Effect-on-Maximum-Horizontal-Drilling-Length-Based-on-Advanced-Buckling-Modeling.pdf

H&P Advanced Well Engineering: https://www.hpinc.com/technologies/advanced-well-engineering

These describe richer proprietary stiff-string/contact/buckling models; they do not validate the independent WellScope model. No commercial results or graphics are copied.

## Findings and changes

- Quick comparison previously connected only three bit-depth solves by default. Eleven explicit stations are now the default; markers show discrete solves without an invented continuous curve. Refinement remains necessary.
- Force is horizontal (tf); bit measured depth increases downward. A trip-depth curve (re-solving at each bit depth) differs from the local axial-force profile along a string at a fixed depth.
- The contact objective is the largest **sum of wall reactions** over sampled bit depths, not the largest individual contact reaction and not hookload. The label now says so; the inspection buttons still target the actual local peak.
- Invalid chart samples split curves instead of silently bridging gaps.
- No cosmetic nonlinear smoothing is applied. Straight uniform vertical strings may have a linear weight-depth relation. An independently checked curved frictionless case follows buoyed weight times TVD; a weightless horizontal turn follows capstan exponential amplification/attenuation. Those cases exercise the existing soft-string integrator.
- One-way soft-string loads drive the beam; beam wall reactions do not feed back into torque/drag. No full stiff-string or post-buckling equivalence is claimed.
- BHA drawings form a continuous surface-to-bit column with component selection. Lengths are compressed and coupling symbols do not establish thread compatibility.
- Primary navigation follows Prepare / Design / Calculate / Deliver. Quick comparison, 3D inspection, phase comparison and combined mechanics are explicit entries. Independent operating envelopes and the manual limits register are removed from the primary workflow, retained under Additional & legacy tools to preserve saved work.
