const assert = require("node:assert/strict"),
  S = require("../app/string-contact");
const p = {
  source: "Analytical simply supported beam",
  quality: "SYNTHETIC",
  survey: [
    { md: 0, inc: 90, azi: 0 },
    { md: 10, inc: 90, azi: 0 },
  ],
  components: [
    {
      name: "beam",
      length: 10,
      od: 0.1,
      id: 0.08,
      mass: 22,
      E: 210e9,
      contactOD: 0.1,
      source: "Analytical",
    },
  ],
  sections: [
    { from: 0, to: 10, diameter: 2, kind: "OPEN", source: "Analytical" },
  ],
  bitMD: 10,
  stepM: 1,
  tensionN: 0,
  rho: 0,
};
const r = S.solve(p),
  I = (Math.PI * (0.1 ** 4 - 0.08 ** 4)) / 64,
  expected = (5 * 22 * 9.80665 * 10 ** 4) / (384 * 210e9 * I);
assert.ok(Math.abs(r.rows[6].offset / expected - 1) < 0.01);
assert.equal(r.contacts, 0);
const tension = S.solve({ ...p, tensionN: 50000 });
assert.ok(tension.rows[6].offset < r.rows[6].offset);
const vertical = S.solve({
  ...p,
  survey: p.survey.map((r) => ({ ...r, inc: 0 })),
});
assert.ok(vertical.rows.every((r) => r.offset < 1e-10));
const wall = S.solve({
  ...p,
  sections: [{ ...p.sections[0], diameter: 0.12 }],
});
assert.ok(wall.contacts > 0);
assert.ok(wall.rows.every((r) => r.offset <= r.gap + 1e-9));
assert.ok(!wall.rows[0].contact && !wall.rows.at(-1).contact);
assert.ok(wall.residualN < 0.5);
const rotated = S.solve({
  ...p,
  survey: p.survey.map((r) => ({ ...r, azi: 73 })),
});
assert.ok(Math.abs(rotated.rows[6].offset - r.rows[6].offset) < 1e-8);
assert.throws(() => S.solve({ ...p, tensionN: -1e7 }), /UNSTABLE/);
assert.throws(
  () => S.solve({ ...p, sections: [{ ...p.sections[0], diameter: 0.09 }] }),
  /INTERFERENCE/,
);
const C = require("../app/engineering-case").demo(),
  full = {
    source: "Synthetic",
    quality: "SYNTHETIC",
    survey: C.survey,
    components: C.bha.map((b) => ({ ...b, E: 210e9, contactOD: b.od })),
    sections: C.sections.map((s) => ({
      from: s.from,
      to: s.to,
      diameter: s.id,
      kind: s.name === "Open hole" ? "OPEN" : "CASED",
      source: "Synthetic",
    })),
    bitMD: 3800,
    stepM: 10,
    tensionN: 0,
    rho: 1260,
  };
for (const depth of [3800, 3700, 2600, 1000]) {
  const sol = S.solve({ ...full, bitMD: depth });
  assert.equal(sol.rows.at(-1).md, depth);
  assert.ok(sol.rows.every((r) => r.offset <= r.gap + 1e-9));
}
console.log(
  "Whole-string analytical deflection, contact, tension, rotation, instability and travel tests passed",
);
