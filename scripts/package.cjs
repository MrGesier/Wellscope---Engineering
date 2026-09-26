/* Create a clean runtime staging directory; archive with the OS ZIP tool. */
const fs = require("node:fs"),
  path = require("node:path");
const dest = path.resolve(process.argv[2] || "dist/WellScope-v0.5");
if (fs.existsSync(dest))
  throw Error(
    "Choose a new staging directory; existing output is never overwritten",
  );
fs.mkdirSync(dest, { recursive: true });
for (const entry of [
  "app",
  "docs",
  "demo_data",
  "research",
  "tests",
  "scripts",
  "README.md",
  "LAUNCH_WELLSCOPE.cmd",
  "package.json",
  "package-lock.json",
])
  fs.cpSync(path.resolve(__dirname, "..", entry), path.join(dest, entry), {
    recursive: true,
  });
console.log("Staged offline runtime at " + dest);
