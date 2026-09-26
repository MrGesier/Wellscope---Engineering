# Equipment catalogue — 0.8

The catalogue now contains 72 individually illustrated tool types in nine groups. These are original identification schematics, not manufacturer drawings or dimensioned assembly drawings. Internal features are selectively exposed to explain otherwise similar external housings. The distinction field explains each drawing.

57 types accept source-backed inline geometry. Fifteen completion, casing and fishing types enter a separate reference register. Catalogue inspection never changes a string. Adding inline geometry requires a source/revision, length, body OD, bore ID and linear mass; no invented dimensions or ratings are supplied. Model and source distinguish actual product variants. Specific properties can be edited on the selected assembly component. Neither a drawing nor a catalogue entry adds a physical tool-performance solver.

Assembly review flags missing provenance, duplicate identity, bit position, explicit connection-name differences, inconsistent expansion/gauge diameters and nonsteel buoyancy limitations. Different connection names require review; they do not prove incompatibility. These checks do not certify an assembly. Current preliminary axial calculations use geometry and mass with one global material density; motor, RSS, sensor, hydraulic, jar, fishing and completion mechanisms are not simulated.

## Research coverage and limits

The existing private research inventory was revisited. An automated equipment-term scan covered 123 local text extracts (including duplicate fragments, not 123 unique reports). Focused rereading covered underreamer training, stabilizer training, drilling bits and acquisition-while-drilling material. Earlier directional/report analysis remains documented in DIRECTIONAL_SENSITIVITY.md. This is not an exhaustive rereading of every file in the Drive.

Seven equipment library archives were downloaded and their archive structures inspected. They contain Firebird database backups. Those databases were not restored or exhaustively decoded, so their complete manufacturer/model catalogues have not been imported. No private reports, customer dimensions or proprietary library data are redistributed here.

## Public technical background

These references support distinctions and functions, not dimensions, ratings or design approval:

- [SLB BHA tools](https://www.slb.com/products-and-services/innovating-in-oil-and-gas/well-construction/drilling/directional-drilling/bha-tools): stabilization, enlargement and auxiliary tools.
- [NOV Bowen](https://www.nov.com/products-and-services/brands/bowen): fishing tools, internal/external engagement and milling.
- [SLB liner hangers](https://www.slb.com/products-and-services/innovating-in-oil-and-gas/completions/well-completions/liner-hangers): liner suspension.
- [SLB casing hardware glossary](https://glossary.slb.com/terms/c/casing_hardware): casing accessories.
- [Baker Hughes impregnated diamond bits](https://www.bakerhughes.com/drilling/drill-bits/pdc-drill-bits/specialty-products/irev-impregnated-diamond-bit): impregnated cutting structures.
- [SLB SonicScope](https://www.slb.com/products-and-services/innovating-in-oil-and-gas/well-construction/measurements/logging-while-drilling-services/sonicscope-multipole-sonic-while-drilling-service): sonic acquisition.
- [NOV Agitator](https://www.nov.com/products/agitatorhe-plus-system): axial oscillation tool function.

## Verification

Unit tests assert 72 different SVG geometries, exact asset/generator agreement, catalogue scopes and consistency review behavior. Browser tests verify read-only inspection, source and geometry rejection, millimetre conversion, reference-register isolation, mobile layout and a rendered contact sheet. Existing directional, unit conversion, project, report and geometry tests remain in the suite. Drawing differences were also visually inspected together; this does not constitute manufacturer design validation.
