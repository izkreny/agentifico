// The mechanical audit as one command. workflows/check.md states the target
// shapes, the two linters, the exclusions and what each exit code means.
// Usage: node check.js [target]
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { globby } from "globby";
import { lint } from "markdownlint/promise";
import { config, rules } from "./lint-config.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const valeConfig = path.join(here, "..", ".vale.ini");

const target = path.resolve(process.argv[2] ?? ".");

// Dot-directories are left out because an agent's skills directory carries
// its own and a fixture tree keeps its fixtures under one, so walking them
// reports findings against trees nobody is auditing. Symlinks are followed,
// because an agent's skills directory is a directory of them pointing into
// the canonical tree.
const files = (await globby(["**/*.md", "!**/node_modules/**"], { cwd: target, absolute: true })).sort();

if (!files.length) {
  console.log(`no markdown file found under ${target}: nothing was checked`);
  process.exit(1);
}

// Without the target the layout rule would walk past it and call a skill
// nested under someone else's tree a defect of this one.
const results = await lint({ files, customRules: rules, config: { ...config, "skill-layout": { root: target } } });

// One line per markdownlint finding, in file order, printed before Vale runs
// so that a structural finding is never withheld by a prose linter that
// cannot start.
let issues = 0;
for (const file of files) {
  const rel = path.relative(target, file);
  for (const e of results[file] ?? []) {
    issues++;
    const detail = e.errorDetail ? ` [${e.errorDetail}]` : "";
    const context = e.errorContext ? ` [Context: "${e.errorContext}"]` : "";
    console.log(`${rel}:${e.lineNumber} ${e.ruleNames.join("/")} ${e.ruleDescription}${detail}${context}`);
  }
}

// Vale reads the same files, from this package's configuration and no other:
// --config names it so the search for one never starts, and --no-global drops
// the user's own configuration and default styles directory, where a style of
// the same name would shadow this one. Its exit code is not read, because it
// is non-zero only for an error-level alert and every alert is wanted here;
// the JSON carries them all. A binary that is not there, or a configuration
// Vale refuses to load, is a setup failure and not a clean run: the summary
// counts what markdownlint found, and the run fails whatever that count.
const vale = spawnSync("vale", ["--config", valeConfig, "--no-global", "--output=JSON", ...files], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (vale.error?.code === "ENOENT" || vale.status === 2 || vale.error) {
  const why =
    vale.error?.code === "ENOENT"
      ? "vale is not on PATH: the prose rules did not run. Install Vale 3.20 or later, per workflows/check.md, and run the check again."
      : `vale could not run: ${(vale.stderr || vale.stdout || String(vale.error)).trim()}`;
  console.log(`${files.length} files checked, ${issues} issues, prose rules not run`);
  console.log(why);
  process.exit(1);
}
const alerts = vale.stdout.trim() ? JSON.parse(vale.stdout) : {};

// One line per Vale alert, in file order. Its severity decides which count it
// lands in: an error is an issue and fails the run, a warning or suggestion is
// a helper that points a reviewer somewhere and is printed and counted without
// failing anything.
let warnings = 0;
for (const file of files) {
  const rel = path.relative(target, file);
  for (const a of alerts[file] ?? []) {
    if (a.Severity === "error") issues++;
    else warnings++;
    console.log(`${rel}:${a.Line} ${a.Check} (${a.Severity}) ${a.Message}`);
  }
}
console.log(`${files.length} files checked, ${issues} issues, ${warnings} warnings`);
process.exit(issues ? 1 : 0);
