const fs = require("node:fs"),
  path = require("node:path"),
  esbuild = require("esbuild");
const root = path.resolve(__dirname, "..");
const sources = require("./runtime-sources.json");
const code = sources
  .map(
    (f) =>
      "/* " +
      f +
      " */\n" +
      fs.readFileSync(path.join(root, "app", f), "utf8") +
      "\n;",
  )
  .join("\n");
const result = esbuild.transformSync(code, {
  minify: true,
  target: "es2020",
  legalComments: "eof",
});
fs.writeFileSync(path.join(root, "app/runtime.bundle.js"), result.code);
console.log(
  "Bundled " + sources.length + " ordered scripts into one offline runtime.",
);
