require("esbuild").buildSync({
  entryPoints: ["src/string-view3d.js"],
  outfile: "app/string-view3d.bundle.js",
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  legalComments: "eof",
});
