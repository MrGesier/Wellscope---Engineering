/* Discrete static phase screening; not a continuous passage guarantee. */
(function (root) {
  const S = root.StringContact || require("./string-contact"),
    A = root.StringAssessment || require("./string-assessment");
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function depths(p, from, to, count) {
    const end = Math.min(
      p.survey.at(-1).md,
      p.sections.at(-1).to,
      p.components.reduce((s, b) => s + b.length, 0),
    );
    if (
      !Number.isFinite(from) ||
      !Number.isFinite(to) ||
      from < 1 ||
      to <= from ||
      to > end ||
      !Number.isInteger(count) ||
      count < 2 ||
      count > 21
    )
      throw Error(
        "Choose 2–21 depths within survey, architecture and string coverage.",
      );
    return Array.from(
      { length: count },
      (_, i) => from + ((to - from) * i) / (count - 1),
    );
  }
  function variants(p, start, count) {
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(count) ||
      start < 1 ||
      count < 1 ||
      start + count >= p.components.length
    )
      throw Error(
        "Select an internal package; bit and top segment remain fixed.",
      );
    const out = [{ name: "Reference", input: clone(p) }];
    for (const dir of [-1, 1]) {
      const dest = dir < 0 ? start - 1 : start + 1;
      if (dest < 1 || start + count + (dir > 0 ? 1 : 0) >= p.components.length)
        continue;
      const q = clone(p),
        block = q.components.splice(start, count);
      q.components.splice(dest, 0, ...block);
      out.push({
        name: dir < 0 ? "Package nearer bit" : "Package farther from bit",
        input: q,
      });
    }
    return out;
  }
  function sample(p, md) {
    const input = clone(p);
    input.bitMD = md;
    try {
      const shape = S.solve(input),
        assessment = A.assess(input, shape);
      const bending = shape.rows.filter((r, i, rows) => {
        const b = shape.parts[r.component],
          x = md - r.md;
        return (
          i > 0 &&
          i < rows.length - 1 &&
          !r.pin &&
          x > b.start + 1e-8 &&
          x < b.end - 1e-8 &&
          md - rows[i - 1].md <= b.end + 1e-8 &&
          md - rows[i + 1].md >= b.start - 1e-8
        );
      });
      let dls = 0;
      for (let i = 1; i < input.survey.length; i++) {
        const x = input.survey[i - 1],
          y = input.survey[i];
        if (x.md >= md) break;
        const rad = Math.PI / 180,
          cos =
            Math.cos(x.inc * rad) * Math.cos(y.inc * rad) +
            Math.sin(x.inc * rad) *
              Math.sin(y.inc * rad) *
              Math.cos((y.azi - x.azi) * rad);
        dls = Math.max(
          dls,
          ((Math.acos(Math.max(-1, Math.min(1, cos))) / rad) * 30) /
            (y.md - x.md),
        );
      }
      const peakContact = shape.rows
          .filter((r) => r.contact && !r.pin)
          .reduce((a, b) => (!a || b.reactionN > a.reactionN ? b : a), null),
        peakBending = bending.reduce(
          (a, b) => (!a || b.bendingPa > a.bendingPa ? b : a),
          null,
        ),
        station = (r) =>
          r
            ? {
                md: r.md,
                component: r.component,
                name: shape.parts[r.component].name,
                reactionN: r.reactionN,
                bendingPa: r.bendingPa,
              }
            : null;
      return {
        md,
        status: "SOLVED_SCREENING",
        bodyStatus: assessment.status,
        axialStatus: shape.axial?.status ?? "NOT_EVALUATED",
        neutralMD: assessment.neutralMD,
        utilization: assessment.worst?.utilization ?? null,
        peakContact: station(peakContact),
        peakBending: station(peakBending),
        jarNeutral: shape.parts
          .filter((b) => /jar/.test(b.family || b.type || "") && b.start < md)
          .map((b) => ({
            name: b.name,
            fromMD: Math.max(0, md - b.end),
            toMD: md - b.start,
            distanceM: assessment.neutralMD.length
              ? Math.min(
                  ...assessment.neutralMD.map((n) =>
                    Math.max(
                      0,
                      Math.max(0, md - b.end) - n,
                      n - (md - b.start),
                    ),
                  ),
                )
              : null,
            note: shape.axial
              ? "Distance to computed effective-force zero crossings; no OEM latch or impact check"
              : "Distributed axial loads missing",
          })),
        contactN: shape.rows.reduce(
          (s, r) => s + (r.contact ? r.reactionN : 0),
          0,
        ),
        bendingPa: bending.length
          ? Math.max(...bending.map((r) => r.bendingPa))
          : null,
        minRadialGapM: Math.min(...shape.rows.map((r) => r.gap)),
        maxSurveyDLS: dls,
        residualN: shape.residualN,
      };
    } catch (e) {
      return {
        md,
        status: e.message.startsWith("INTERFERENCE:")
          ? "GEOMETRIC_INTERFERENCE"
          : "NOT_SOLVED",
        error: e.message,
      };
    }
  }
  root.StringPhase = { depths, variants, sample };
  if (typeof module === "object") module.exports = root.StringPhase;
})(globalThis);
