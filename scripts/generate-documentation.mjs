import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = {
  overview: "README.md",
  plugins: "docs/PLUGINS.md",
  api: "docs/API.md",
  database: "docs/DATABASE.md",
  audit: "docs/AUDIT.md",
  contributing: "CONTRIBUTING.md",
};

const sources = Object.fromEntries(
  Object.entries(files).map(([slug, file]) => [slug, readFileSync(join(root, file), "utf8")]),
);
const output = [
  "/** Generated from the repository Markdown files by scripts/generate-documentation.mjs. */",
  `export const documentationSources: Record<string, string> = ${JSON.stringify(sources, null, 2)};`,
  "",
].join("\n");

writeFileSync(join(root, "src/generated/documentation.ts"), output, "utf8");
