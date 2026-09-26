# Detailed training case and units

The default page is an original fictional Northbank N-04 / Run 07 study: 3,800 m MD, approximately 2,284 m TVD, 153 survey stations, 12 string components and 19 connection observations. The complete editable fixture is in `demo_data/northbank-training-case.json`. No customer values or proprietary reports are included.

The workflow follows the structure encountered in engineering report examples: well architecture and string tally, operating context, pickup/slackoff/free-rotating load versus depth, separate cased/open-hole friction sensitivity, fixed connection observations, interpretation and report snapshot. Technical illustrations identify equipment families and are schematic, with compressed axial lengths; they are not manufacturing drawings or equipment ratings.

## What the curves mean

PUW/POOH and SOW/RIH use the existing preliminary axial soft-string calculation with buoyancy and separate cased/open-hole friction. A declared travelling-block force is added to the string-top load. FRW is the static axial reference, not a rotational-friction model. The two sensitivity lines vary open-hole friction by +/- 0.10. Surface loads and observations share the same declared basis in this fictional fixture.

Torque values are fixed MOCK observations, not calculated torque. Flow, RPM, WOB and SPP are operating context and do not drive this axial calculation. There is no stiff-string, buckling, hydraulic, fatigue or torsional solver in this case. Changing friction recalculates axial predictions only. The deliberately rising mock drag below 3,200 m illustrates a comparison task, without identifying a real cause or defining an operating limit.

## Unit systems

| Quantity | Metric default | SI option | Oilfield |
|---|---|---|---|
| Depth / length | m | m | ft |
| Diameter | mm | mm | in |
| Force | tf | kN | klbf |
| Torque | tf.m | kN.m | klbf.ft |
| Pressure | bar | bar | psi |
| Density | sg | kg/m3 | ppg |
| Flow | L/min | L/min | US gal/min |
| Mass | t | kg | lb |
| Linear mass | kg/m | kg/m | lb/ft |

Canonical inputs remain SI. Display changes do not alter results or regenerate observations. Forms convert back to canonical SI on Apply; unapplied edits prevent unit changes. Charts, tables and CSV/HTML exports carry the selected units. JSON backups retain canonical values and display preferences. Legacy analysis pages retain their individually labelled units; this selector applies to the detailed training case.

1 tf = 9.80665 kN; 1 t = 1,000 kg; 1 ft = 0.3048 m; 1 in = 25.4 mm; 1 tf.m = 9.80665 kN.m; 1 US gal/min = 3.785411784 L/min. Mass and force are separate dimensions; t-to-tf conversion is refused.

## Persistence and validation

Save case stores the complete input snapshot and SHA256 in a synthetic project. Real USER_DATA projects cannot silently acquire this training case. Export the complete project or case JSON to keep an editable backup. A different project without a saved case resets the workspace to the original example.

Automated checks cover dimensional conversions, round trips, invariant physical results across presets, friction response, zero-friction equilibrium, block offset, fixed observations, malformed case rejection, full backups, offline browser interactions and mobile layout. These checks establish software behavior, not field validation of a commercial engineering solver.
