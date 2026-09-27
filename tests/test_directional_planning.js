const assert = require("node:assert/strict"),
  P = require("../app/directional-planning"),
  D = require("../app/directional-response");
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const a = { md: 1000, inc: 60, azi: 359 };
let r = P.survey(a, { md: 1030, inc: 58, azi: 359 });
near(r.build, -2);
near(r.drop, 2);
near(r.dls, 2);
r = P.survey(a, { md: 1030, inc: 60, azi: 1 });
near(r.turn, 2);
assert.ok(r.dls < 2 && r.dls > 1.7);
near(P.survey(a, { ...a, md: 1060, inc: 64 }).build, 2);
assert.equal(P.survey({ ...a, inc: 0 }, { ...a, md: 1030, inc: 2 }).turn, null);
assert.throws(() => P.survey(a, a));
assert.throws(() => P.survey(a, { ...a, md: 1030, inc: 181 }));
const s = {
  mode: "rotating",
  wobN: 100,
  activation: 0,
  toolface: 0,
  inclination: 60,
};
const fixture = (values) => ({
  ...D.demo(),
  curves: [
    {
      mode: "rotating",
      rows: values.map(([wobN, passiveBuild, passiveRight = 0]) => ({
        wobN,
        passiveBuild,
        passiveRight,
        activeHigh: 0,
        activeRight: 0,
      })),
    },
  ],
});
const lim = { buildMin: -10, buildMax: 10, dlsMax: 1, wobMin: 0, wobMax: 1000 };
let d = fixture([
    [100, -2],
    [200, 2],
  ]),
  ranges = P.windows(d, s, lim);
near(ranges[0].fromN, 125);
near(ranges[0].toN, 175); // Both knots fail, interior succeeds.
ranges = P.windows(d, s, { ...lim, buildMin: 0, buildMax: 0.2 });
near(ranges[0].fromN, 150);
near(ranges[0].toN, 155);
ranges = P.windows(d, s, { ...lim, dlsMax: 0 });
near(ranges[0].fromN, 150);
near(ranges[0].toN, 150);
d = fixture([
  [100, 0],
  [200, 2],
  [300, 0],
]);
ranges = P.windows(d, s, lim);
assert.equal(ranges.length, 2);
near(ranges[0].toN, 150);
near(ranges[1].fromN, 250);
d = fixture([
  [100, 0],
  [200, 0],
  [300, 0],
]);
ranges = P.windows(d, s, lim);
assert.equal(ranges.length, 1);
near(ranges[0].toN, 300);
assert.deepEqual(P.windows(d, s, { ...lim, wobMin: 400 }), []);
assert.throws(() => P.windows(d, s, { ...lim, buildMin: 20 }));
assert.deepEqual(
  P.windows(
    fixture([
      [100, 0, 2],
      [200, 0, 2],
    ]),
    s,
    lim,
  ),
  [],
);
assert.equal(P.sample(d, s).length, 33);
// Numerical cross-check against many independent evaluations across demo modes/toolfaces.
for (const mode of ["rotating", "rss", "sliding"])
  for (const toolface of [0, 45, 180, 270]) {
    const data = D.demo(),
      settings = { ...s, mode, toolface, wobN: 100000, activation: 0.5 };
    const limits = {
      ...lim,
      wobMax: 200000,
      buildMin: -0.4,
      buildMax: 1.4,
      dlsMax: 1.5,
    };
    const spans = P.windows(data, settings, limits);
    for (let w = 40000; w <= 190000; w += 311) {
      const v = D.response(data, { ...settings, wobN: w });
      assert.equal(
        spans.some((x) => w >= x.fromN && w <= x.toN),
        v.build >= limits.buildMin &&
          v.build <= limits.buildMax &&
          v.dls <= limits.dlsMax,
      );
    }
  }
console.log(
  "PASS: signed survey rates, exact dogleg, wrap, interior windows, tangent, disconnected intervals, source bounds and sampled oracle",
);
