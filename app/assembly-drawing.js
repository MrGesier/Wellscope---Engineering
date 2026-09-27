/* Connected identification schematic; not a threaded-connection compatibility check. */
(function (root) {
  let serial = 0;
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function svg(parts, selected = -1) {
    const uid = "assembly-" + ++serial,
      pitch = 108,
      height = parts.length * pitch + 48;
    let out = `<svg class="connected-assembly" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 ${height}" role="group" aria-label="Connected assembly, surface to bit"><text x="58" y="16" font-size="11" fill="#667b88">SURFACE</text>`;
    let distance = 0;
    const positions = parts.map((b) => {
      const start = distance;
      distance += b.length;
      return start;
    });
    parts
      .map((b, i) => ({ b, i }))
      .reverse()
      .forEach(({ b, i }, j) => {
        const y = 28 + j * pitch,
          type =
            b.family ||
            b.type ||
            {
              pdc: "pdc-bit",
              motor: "bent-pdm",
              rss: "rss-push",
              stab: "string-stabilizer",
              dp: "drillpipe",
            }[root.BhaIcons?.typeOf(b.name)] ||
            root.BhaIcons?.typeOf(b.name) ||
            "drillpipe";
        const image = root.EquipmentDrawing.svg(type, uid + "-" + i).replace(
          'viewBox="0 0 120 248"',
          `x="40" y="${y}" width="80" height="${pitch}" viewBox="0 23 120 ${i === 0 ? 218 : 193}" preserveAspectRatio="none"`,
        );
        out += `<g data-assembly-component="${i}" ${selected >= 0 ? `role="button" tabindex="0" aria-label="Inspect component ${i + 1}: ${esc(b.name)}" aria-pressed="${i === selected}"` : `role="img" aria-label="${esc(b.name)}"`}><rect x="30" y="${y}" width="438" height="${pitch}" rx="4" fill="${i === selected ? "#e6eff2" : "#fff"}"/><path d="M122 ${y + pitch / 2}H144" stroke="#b9c5cb"/>${image}<text x="150" y="${y + 35}" font-size="12" fill="#213b49">${esc(b.name)}</text><text x="150" y="${y + 55}" font-size="11" fill="#617885">${Number(b.length).toFixed(2)} m · OD ${Number(b.od * 1000).toFixed(1)} mm</text><text x="150" y="${y + 73}" font-size="11" fill="#617885">${positions[i].toFixed(2)}–${(positions[i] + b.length).toFixed(2)} m from bit</text></g>`;
        if (j)
          out += `<rect class="assembly-coupling" x="70" y="${y - 5}" width="20" height="10" rx="1" fill="#b9c4c8" stroke="#526670"/><path d="M71 ${y}h18" stroke="#dce2e4"/>`;
      });
    return (
      out +
      `<text x="66" y="${height - 5}" font-size="11" fill="#667b88">BIT</text></svg><p class="work-note">Joined schematic · lengths compressed. Connector symbols do not verify thread size, gender or make-up compatibility.</p>`
    );
  }
  root.AssemblyDrawing = { svg };
  if (typeof module === "object") module.exports = root.AssemblyDrawing;
})(globalThis);
