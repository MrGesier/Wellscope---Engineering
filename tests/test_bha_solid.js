const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const M = require("../app/bha-solid-mesh"),
  S = require("../app/bha-static");
const p = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../app/assets/examples/bha-static-training.json"),
    "utf8",
  ),
);
const r = S.solve(p),
  before = JSON.stringify(r),
  m = M.build(p, r);
assert.equal(m.parts.length, p.components.length);
assert.equal(m.beamNodes, p.n + 1);
assert.ok(m.triangles > 500);
assert.equal(m.parts[0].start, 0);
assert.ok(Math.abs(m.parts.at(-1).end - p.length) < 1e-9);
for (const part of m.parts) {
  const c = p.components[part.index];
  for (const ring of part.rings)
    for (const v of ring) {
      assert.ok(v.p.every(Number.isFinite));
      const a = M.at(r.rows, v.p[0]);
      assert.ok(
        Math.hypot(v.p[1] - a.u[0], v.p[2] - a.u[1]) <= c.contactOD / 2 + 1e-8,
      );
    }
}
assert.equal(JSON.stringify(r), before);
const mid = M.at(r.rows, (r.rows[5].x + r.rows[6].x) / 2);
assert.ok(
  Math.abs(mid.bendingPa - (r.rows[5].bendingPa + r.rows[6].bendingPa) / 2) <
    1e-7,
);
assert.deepEqual(M.at(r.rows, p.length + 1e-10).u, r.rows.at(-1).u);
assert.throws(() => M.at(r.rows, p.length + 1));
assert.throws(() => M.build(p, r, 5));
console.log(
  "PASS: component boundaries, contact envelopes, finite mesh, field interpolation and immutable beam solution",
);

const frame = M.frame(p, p.bitMD),
  point = [3, 0.02, -0.01],
  back = M.local(frame, M.world(frame, point));
back.forEach((v, i) => assert.ok(Math.abs(v - point[i]) < 1e-9));
assert.throws(() => M.frame(p, 4000));
