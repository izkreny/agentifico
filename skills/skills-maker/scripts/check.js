// The mechanical audit, as one command over one target: a skill's own
// directory, a directory of skills, or a package root whose skills sit further
// down, defaulting to the current directory. It globs the markdown under the
// target and runs markdownlint over it with this package's configuration and
// nothing else: no file under the target is read as configuration, so the
// tree being audited cannot switch off the rules that judge it, and the same
// rules apply wherever the target lives. A target with no markdown under it is
// a wrong target, and its silence reads exactly like a clean sweep, so
// checking nothing exits non-zero.
// Usage: node check.js [target]
import path from "node:path";
import { globby } from "globby";
import { lint } from "markdownlint/promise";
import { config, rules } from "./lint-config.js";

const target = path.resolve(process.argv[2] ?? ".");

// Dot-directories are left out by default, which is what the walk did: an
// agent's skills directory carries its own, and a fixture tree keeps its
// fixtures under one. Symlinks are followed, because an agent's skills
// directory is a directory of them pointing into the canonical tree.
const files = (await globby(["**/*.md", "!**/node_modules/**"], { cwd: target, absolute: true })).sort();

if (!files.length) {
  console.log(`no markdown file found under ${target}: nothing was checked`);
  process.exit(1);
}

// The layout rule stops its ancestor search at the target.
const results = await lint({ files, customRules: rules, config: { ...config, "skill-layout": { root: target } } });

let issues = 0;
for (const file of files) {
  for (const e of results[file] ?? []) {
    issues++;
    const detail = e.errorDetail ? ` [${e.errorDetail}]` : "";
    const context = e.errorContext ? ` [Context: "${e.errorContext}"]` : "";
    console.log(`${path.relative(target, file)}:${e.lineNumber} ${e.ruleNames.join("/")} ${e.ruleDescription}${detail}${context}`);
  }
}
console.log(`${files.length} files checked, ${issues} issues`);
process.exit(issues ? 1 : 0);
