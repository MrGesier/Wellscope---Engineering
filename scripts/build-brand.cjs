/* Deterministic PNG and multi-resolution Windows icon from the vector master. */
const fs = require("node:fs");
const path = require("node:path");
const { Resvg } = require("@resvg/resvg-js");
const directory = path.resolve(__dirname, "../app/assets");
const svg = fs.readFileSync(path.join(directory, "wellscope-logo.svg"), "utf8");
const render = (width) =>
  new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
fs.writeFileSync(path.join(directory, "wellscope-logo.png"), render(1024));
const sizes = [16, 24, 32, 48, 64, 128, 256],
  images = sizes.map(render);
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, i) => {
  const pos = 6 + 16 * i;
  header[pos] = header[pos + 1] = size === 256 ? 0 : size;
  header.writeUInt16LE(1, pos + 4);
  header.writeUInt16LE(32, pos + 6);
  header.writeUInt32LE(images[i].length, pos + 8);
  header.writeUInt32LE(offset, pos + 12);
  offset += images[i].length;
});
fs.writeFileSync(
  path.join(directory, "wellscope-strata-v3.ico"),
  Buffer.concat([header, ...images]),
);
console.log("Built Strata PNG + 7-resolution desktop icon.");
