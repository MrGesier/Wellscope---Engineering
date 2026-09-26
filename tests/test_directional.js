const assert = require("node:assert/strict"),
  D = require("../app/directional-response"),
  C = require("../app/core"),
  H = require("../app/engineering-charts");
const d = D.demo(),
  s = {
    mode: "rss",
    wobN: 100000,
    activation: 1,
    toolface: 0,
    inclination: 60,
  },
  r = D.response(d, s),
  near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9);
near(r.dls, Math.hypot(r.build, r.right));
near(r.turn * Math.sin(Math.PI / 3), r.right);
const p = D.response(d, { ...s, activation: 0 }),
  half = D.response(d, { ...s, activation: 0.5 });
near(half.build, (r.build + p.build) / 2);
near(half.right, (r.right + p.right) / 2);
const rev = D.response(d, { ...s, toolface: 180 });
near(rev.build - p.build, -(r.build - p.build));
near(rev.right - p.right, -(r.right - p.right));
const zero = D.response(d, { ...s, inclination: 0 });
assert.equal(zero.turn, null);
assert.ok(Number.isFinite(zero.dls));
const q = D.response(d, { ...s, wobN: 85000 }),
  a = D.response(d, { ...s, wobN: 70000 });
near(q.build, (a.build + r.build) / 2);
assert.deepEqual(
  D.response(d, { ...s, mode: "rotating", toolface: 45, activation: 1 }).build,
  D.response(d, { ...s, mode: "rotating", toolface: 0, activation: 0 }).build,
);
for (const patch of [
  { wobN: 1 },
  { wobN: 200000 },
  { activation: 2 },
  { inclination: -1 },
  { toolface: NaN },
])
  assert.throws(() => D.response(d, { ...s, ...patch }));
const invalid = structuredClone(d);
invalid.curves[0].rows.reverse();
assert.throws(() => D.validate(invalid));
const xss = H.svg(
  [
    {
      name: "<script>",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 2 },
      ],
    },
  ],
  { x: "Force", y: "MD", depth: true },
);
assert.ok(xss.includes('data-depth-down="true"'));
assert.ok(!xss.includes("<script>"));
near(C.convert(C.convert(100000, "N", "tf"), "tf", "N"), 100000);
near(30.48 / 30, 1.016);
console.log(
  "PASS: response interpolation, activation blend, toolface rotation, DLS vector identity, vertical turn refusal, mode behavior, no extrapolation and chart escaping",
);
