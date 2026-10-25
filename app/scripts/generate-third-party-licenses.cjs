const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const checkerPath = require.resolve("license-checker/bin/license-checker");
const appPackage = require(path.join(appRoot, "package.json"));
const result = spawnSync(
  process.execPath,
  [
    checkerPath,
    "--json",
    "--customPath",
    path.join(appRoot, "license-checker-custom.json"),
    "--relativeLicensePath",
    "--excludePackages",
    `${appPackage.name}@${appPackage.version}`,
  ],
  { cwd: appRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
);

if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const packages = JSON.parse(result.stdout);
const packageEntries = Object.entries(packages).sort(([left], [right]) =>
  left.localeCompare(right),
);
const report = [
  "<!doctype html>",
  '<html lang="en">',
  "<head>",
  '  <meta charset="utf-8">',
  '  <meta name="viewport" content="width=device-width, initial-scale=1">',
  "  <title>Frontend Third-Party Notices</title>",
  "  <style>",
  "    body { font: 16px/1.5 system-ui, sans-serif; margin: 2rem auto; max-width: 1200px; padding: 0 1rem; color: #222; }",
  "    table { border-collapse: collapse; width: 100%; }",
  "    th, td { border: 1px solid #ccc; padding: .4rem .6rem; text-align: left; vertical-align: top; }",
  "    th { background: #f3f3f3; }",
  "    pre { background: #f6f8fa; border: 1px solid #ddd; overflow-wrap: anywhere; overflow-x: auto; padding: 1rem; white-space: pre-wrap; }",
  "  </style>",
  "</head>",
  "<body>",
  "  <h1>Frontend Third-Party Dependency Notices</h1>",
  "  <p>Generated from the installed frontend dependency tree with "
    + "<code>license-checker</code>. This includes dependencies present in "
    + "<code>app/node_modules</code> when the report is generated; optional "
    + "packages for other operating systems may not be installed on the current "
    + "host. Compare with <code>package-lock.json</code> when supporting multiple "
    + "platforms.</p>",
  '  <p>The frontend project itself is excluded; see the repository-root '
    + '<a href="../LICENSE">LICENSE</a>.</p>',
  `  <p>Packages reported: ${packageEntries.length}</p>`,
  "  <h2>Dependency inventory</h2>",
  "  <table>",
  "    <thead><tr><th>Package</th><th>License expression</th><th>Repository</th><th>Detected license file</th></tr></thead>",
  "    <tbody>",
];

function escapeHtml(value) {
  return String(value ?? "UNKNOWN").replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

for (const [packageName, metadata] of packageEntries) {
  const licenseFile = metadata.licenseFile ?? "not detected";
  report.push(
    "      <tr><td><code>"
      + escapeHtml(packageName)
      + "</code></td><td><code>"
      + escapeHtml(metadata.licenses)
      + "</code></td><td>"
      + escapeHtml(metadata.repository)
      + "</td><td><code>"
      + escapeHtml(licenseFile)
      + "</code></td></tr>",
  );
}

const licenseTexts = new Map();
const missingTexts = [];
for (const [packageName, metadata] of packageEntries) {
  const text = metadata.licenseText;
  const licenseFile = metadata.licenseFile ?? "";
  const looksLikeReadme = /(^|[/\\])readme(?:\.[^/\\]+)?$/i.test(licenseFile);
  if (
    typeof text !== "string" ||
    !text.trim() ||
    text === "none" ||
    looksLikeReadme
  ) {
    missingTexts.push(packageName);
    continue;
  }

  const key = `${metadata.licenses ?? "UNKNOWN"}\0${text}`;
  const entry = licenseTexts.get(key) ?? {
    license: metadata.licenses ?? "UNKNOWN",
    text,
    packages: [],
  };
  entry.packages.push(packageName);
  licenseTexts.set(key, entry);
}

report.push("    </tbody>", "  </table>", "  <h2>License texts</h2>");
for (const entry of [...licenseTexts.values()].sort((a, b) =>
  a.license.localeCompare(b.license),
)) {
  report.push(
    `  <h3>${escapeHtml(entry.license)}</h3>`,
    "  <p>Packages using this license text:</p>",
    "  <ul>",
    ...entry.packages.sort().map((name) => `    <li><code>${escapeHtml(name)}</code></li>`),
    "  </ul>",
    `  <pre>${escapeHtml(entry.text.trimEnd())}</pre>`,
  );
}

if (missingTexts.length) {
  report.push(
    "  <h2>License text not included in package metadata</h2>",
    "  <p>The package reports a license identifier, but "
      + "<code>license-checker</code> did not find a standalone license text in "
      + "the installed package (README files are not treated as license texts). "
      + "Verify the upstream license and include any required text before "
      + "redistributing the corresponding package.</p>",
    "  <ul>",
    ...missingTexts.sort().map((name) => `    <li><code>${escapeHtml(name)}</code></li>`),
    "  </ul>",
  );
}

report.push("</body>", "</html>");
const outputPath = path.join(appRoot, "APP-THIRD-PARTY-NOTICES.html");
const html = report.join("\n").replace(/\r\n?/g, "\n");
fs.writeFileSync(outputPath, html + "\n", "utf8");
console.log(`Wrote ${path.relative(appRoot, outputPath)} (${packageEntries.length} packages)`);
