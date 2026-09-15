import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { globby } from "globby";
import { lint } from "markdownlint/promise";
import { config, contractRuleNames, proseShapeRuleNames, rules } from "./lint-config.js";
import { isSkillFile } from "./rules/frontmatter.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const valeConfig = path.join(here, "..", ".vale.ini");

const target = path.resolve(process.argv[2] ?? ".");

// Dot-directories stay out because an agent's skills directory and a fixture tree each keep their own, which nobody is auditing.
const files = (await globby(["**/*.md", "!**/node_modules/**"], { cwd: target, absolute: true })).sort();

if (!files.length) {
  console.log(`no markdown file found under ${target}: nothing was checked`);
  process.exit(1);
}

// The skills found are printed before the findings because a file count alone cannot tell a sweep that covered one skill of a package from one that covered all of them.
const skills = files
  .filter(isSkillFile)
  .map((file) => path.relative(target, path.dirname(file)) || ".")
  .sort();
console.log(skills.length ? `${skills.length} skill(s) found under ${target}` : `no skill found under ${target}`);
for (const skill of skills) console.log(`  ${skill}`);

// A constant because the branch reporting a Vale that could not start prints this heading too, and a rename reaching one site and not the other would land on the run whose reader most needs to recognise it.
const PROSE_RULES = "prose rules";

// A count of zero prints too, because a reader who has to infer from silence that the class this skill exists to catch found nothing is the reader this grouping is for.
const report = (label, lines, summary = lines.length || "none") => {
  console.log(`${label}: ${summary}`);
  for (const line of lines) console.log(`  ${line}`);
};

// The target is passed to the layout and referenced-path rules so neither reads a tree nobody asked it to read.
const results = await lint({
  files,
  customRules: rules,
  config: { ...config, "skill-layout": { root: target }, "skill-referenced-paths": { root: target } },
  // Without this a <!-- markdownlint-disable --> in the target would switch off every rule, skill-vale-directive included.
  noInlineConfig: true,
});

// Every markdownlint class prints before Vale runs, so a structural finding is never withheld by a prose linter that cannot start.
let issues = 0;
const contractFindings = [];
const proseShapeFindings = [];
const generalFindings = [];
for (const file of files) {
  const rel = path.relative(target, file);
  for (const e of results[file] ?? []) {
    issues++;
    const detail = e.errorDetail ? ` [${e.errorDetail}]` : "";
    const context = e.errorContext ? ` [Context: "${e.errorContext}"]` : "";
    const line = `${rel}:${e.lineNumber} ${e.ruleNames.join("/")} ${e.ruleDescription}${detail}${context}`;
    const bucket = e.ruleNames.some((name) => contractRuleNames.has(name))
      ? contractFindings
      : e.ruleNames.some((name) => proseShapeRuleNames.has(name))
        ? proseShapeFindings
        : generalFindings;
    bucket.push(line);
  }
}
report("skill rules", contractFindings);
report("prose shape", proseShapeFindings);
report("general lint", generalFindings);

// --no-global drops the user's own configuration and default styles directory, where a style of the same name would shadow this one.
const vale = spawnSync("vale", ["--config", valeConfig, "--no-global", "--output=JSON", ...files], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
// A binary that is not there, or a configuration Vale refuses to load, is a setup failure and not a clean run.
if (vale.error?.code === "ENOENT" || vale.status === 2 || vale.error) {
  const why =
    vale.error?.code === "ENOENT"
      ? "vale is not on PATH: the prose rules did not run. Install Vale 3.21 or later, per workflows/check.md, and run the check again."
      : `vale could not run: ${(vale.stderr || vale.stdout || String(vale.error)).trim()}`;
  report(PROSE_RULES, [], "not run");
  console.log(`${files.length} files checked, ${issues} issues, prose rules not run`);
  console.log(why);
  process.exit(1);
}
// Vale's exit code is not read because it is non-zero only for an error-level alert and the JSON carries every alert.
const alerts = vale.stdout.trim() ? JSON.parse(vale.stdout) : {};

// A warning or suggestion is counted apart from the issues because one figure summing them reads as a failure count on a run that passed.
let warnings = 0;
let proseIssues = 0;
const proseFindings = [];
for (const file of files) {
  const rel = path.relative(target, file);
  for (const a of alerts[file] ?? []) {
    if (a.Severity === "error") {
      issues++;
      proseIssues++;
    } else warnings++;
    proseFindings.push(`${rel}:${a.Line} ${a.Check} (${a.Severity}) ${a.Message}`);
  }
}
report(PROSE_RULES, proseFindings, proseFindings.length ? `${proseIssues} issues, ${warnings} warnings` : "none");
console.log(`${files.length} files checked, ${issues} issues, ${warnings} warnings`);
process.exit(issues ? 1 : 0);
