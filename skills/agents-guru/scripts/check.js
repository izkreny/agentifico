import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { glob } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lint } from "markdownlint/promise";
import YAML from "yaml";
import { config, contractRuleNames, proseShapeRuleNames, rules, warningRuleNames } from "./lint-config.js";
import { isSkillFile } from "./rules/frontmatter.js";
import { hooksDefects, isPluginRoot, manifestDefects } from "./rules/plugin-files.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const valeConfig = path.join(here, "..", ".vale.ini");

const targets = (process.argv.length > 2 ? process.argv.slice(2) : ["."]).map((arg) => path.resolve(arg));

const nothingChecked = (why) => {
  console.log(`${why}: nothing was checked`);
  process.exit(1);
};

// Each file keeps the root of the first target reaching it, so a file two targets reach is read once.
const rootOf = new Map();
const folders = [];
for (const target of targets) {
  const stat = fs.statSync(target, { throwIfNoEntry: false });
  if (!stat) nothingChecked(`no such file or folder: ${target}`);
  let reached = [target];
  if (stat.isDirectory()) {
    // Dot-directories stay out because an agent's skills directory and a fixture tree each keep their own, which nobody is auditing.
    reached = (
      await Array.fromAsync(
        glob(["**/*.md", "**/*.js", "**/*.py", "**/*.yml", "**/*.yaml"], { cwd: target, exclude: ["**/node_modules/**"], followSymlinks: true }),
      )
    ).map((file) => path.join(target, file));
    if (!reached.some((file) => file.endsWith(".md"))) nothingChecked(`no markdown file found under ${target}`);
  } else if (!/\.(md|js|py|ya?ml)$/.test(target)) nothingChecked(`no reader takes ${target}`);
  // A file names no tree of its own, so its paths resolve against the folder the command runs in, which is the one its path was written against.
  const root = stat.isDirectory() ? target : process.cwd();
  for (const file of reached) if (!rootOf.has(file)) rootOf.set(file, root);
  folders.push(stat.isDirectory() ? target : path.dirname(target));
}

// Paths print from the folder every target shares, so no printed path repeats the part common to all of them.
const base = folders.reduce((shared, folder) => {
  while (shared !== folder && !folder.startsWith(shared.endsWith(path.sep) ? shared : shared + path.sep)) shared = path.dirname(shared);
  return shared;
});

const found = [...rootOf.keys()];
const files = found.filter((file) => file.endsWith(".md")).sort();
// A code file reaches Vale alone, which reads it as its comments and docstrings, and never markdownlint.
const codeFiles = found.filter((file) => /\.(js|py)$/.test(file)).sort();
// A YAML file is read by this script alone, since Vale leaves it out for the reason workflows/check.md gives.
const yamlFiles = found.filter((file) => /\.ya?ml$/.test(file)).sort();

// The skills found are named because a file count alone cannot tell a sweep that covered one skill of a package from one that covered all of them.
const skills = files
  .filter(isSkillFile)
  .map((file) => path.relative(base, path.dirname(file)) || ".")
  .sort();
console.log(skills.length ? `${skills.length} skill(s) found under ${base}` : `no skill found under ${base}`);
for (const skill of skills) console.log(`  ${skill}`);

// A constant because the branch reporting a Vale that could not start prints this heading too, and a rename reaching one site and not the other would put a heading no other run uses on the run whose reader most needs to recognise it.
const PROSE_RULES = "prose rules";

// A count of zero prints too, because a reader who has to infer from silence that the class this skill exists to catch found nothing is the reader this grouping is for.
const report = (label, lines, summary = lines.length || "none") => {
  console.log(`${label}: ${summary}`);
  for (const line of lines) console.log(`  ${line}`);
};

// One run per root, passed to the layout and referenced-path rules so neither reads a tree nobody asked it to read.
const results = {};
for (const root of new Set(files.map((file) => rootOf.get(file)))) {
  Object.assign(
    results,
    await lint({
      files: files.filter((file) => rootOf.get(file) === root),
      customRules: rules,
      config: { ...config, "skill-layout": { root }, "skill-referenced-paths": { root } },
      // Without this a <!-- markdownlint-disable --> in the target would switch off every rule, skill-vale-directive included.
      noInlineConfig: true,
    }),
  );
}

// Every markdownlint class prints before Vale runs, so a structural finding is never withheld by a prose linter that cannot start.
let issues = 0;
// A warning or suggestion is counted apart from the issues because one figure summing them reads as a failure count on a run that passed.
let warnings = 0;
let contractWarnings = 0;
let proseShapeWarnings = 0;
const contractFindings = [];
const proseShapeFindings = [];
const generalFindings = [];
for (const file of files) {
  const rel = path.relative(base, file);
  // Stryker disable next-line ArrayDeclaration: markdownlint returns an entry for every file it is handed, so the fallback is never read.
  for (const e of results[file] ?? []) {
    const warning = e.ruleNames.some((name) => warningRuleNames.has(name));
    const proseShape = e.ruleNames.some((name) => proseShapeRuleNames.has(name));
    if (!warning) issues++;
    else if (proseShape) proseShapeWarnings++;
    else contractWarnings++;
    const detail = e.errorDetail ? ` [${e.errorDetail}]` : "";
    const context = e.errorContext ? ` [Context: "${e.errorContext}"]` : "";
    const line = `${rel}:${e.lineNumber} ${e.ruleNames.join("/")}${warning ? " (warning)" : ""} ${e.ruleDescription}${detail}${context}`;
    const bucket = e.ruleNames.some((name) => contractRuleNames.has(name)) ? contractFindings : proseShape ? proseShapeFindings : generalFindings;
    bucket.push(line);
  }
}
warnings += contractWarnings + proseShapeWarnings;
report("skill rules", contractFindings, contractWarnings ? `${contractFindings.length - contractWarnings} issues, ${contractWarnings} warnings` : undefined);
report(
  "prose shape",
  proseShapeFindings,
  proseShapeWarnings ? `${proseShapeFindings.length - proseShapeWarnings} issues, ${proseShapeWarnings} warnings` : undefined,
);
report("general lint", generalFindings);

// A comment is read off the parser's tree, because a "#" inside a block scalar is text and a raw-line scan would read it as a comment.
const commentsOf = (source) => {
  const lines = new YAML.LineCounter();
  const found = [];
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === "object") {
      if (node.type === "comment") found.push({ ...lines.linePos(node.offset), text: node.source });
      else Object.values(node).forEach(walk);
    }
  };
  for (const token of new YAML.Parser(lines.addNewLine).parse(source)) walk(token);
  // Stryker disable next-line all: the parser's tokens already arrive in source order, so the sort guards an order nothing produces.
  return found.sort((a, b) => a.line - b.line);
};

const yamlFindings = [];
let yamlWarnings = 0;
for (const file of yamlFiles) {
  const rel = path.relative(base, file);
  const source = fs.readFileSync(file, "utf8");
  const docs = YAML.parseAllDocuments(source);
  // A stream holding no document comes back empty and raises nothing, so a file of directives alone is parsed again as one document, which reports what is missing.
  const errors = docs.length ? docs.flatMap((doc) => doc.errors) : YAML.parseDocument(source).errors;
  for (const e of errors) {
    const rule = e.code === "DUPLICATE_KEY" ? "yaml-duplicate-key" : "yaml-parse";
    // Stryker disable next-line OptionalChaining: yaml leaves an error unplaced only at offset -1, which neither parse call here passes, so linePos is always set.
    yamlFindings.push(`${rel}:${e.linePos?.[0]?.line ?? 1} ${rule} ${e.message.split("\n")[0]}`);
  }
  const sourceLines = source.split("\n");
  // An empty "#" line separates two paragraphs, so it neither continues a sentence nor is continued by one.
  const whole = commentsOf(source).filter((c) => !sourceLines[c.line - 1].slice(0, c.col - 1).trim() && c.text.slice(1).trim());
  for (const [i, c] of whole.entries()) {
    const before = whole[i - 1];
    // A colon is no sentence end, since a wrapped comment breaks after one mid-sentence as often as after a word.
    if (before?.line === c.line - 1 && !/[.!?]["')\]`*_]*$/.test(before.text.trimEnd())) {
      yamlFindings.push(
        `${rel}:${c.line} yaml-comment-wrap (warning) continues the sentence on the line before: write each paragraph of a comment on one line`,
      );
      yamlWarnings++;
    }
  }
}
issues += yamlFindings.length - yamlWarnings;
warnings += yamlWarnings;
report("yaml files", yamlFindings, yamlWarnings ? `${yamlFindings.length - yamlWarnings} issues, ${yamlWarnings} warnings` : undefined);

// The .claude-plugin folder is searched for by name, because the walk skips dot-folders and a plugin holding no file the walk takes would otherwise go unseen.
const pluginDirs = new Set();
for (const target of targets.filter((target) => fs.statSync(target).isDirectory()))
  for await (const marker of glob("**/.claude-plugin", { cwd: target, exclude: ["**/node_modules/**"], followSymlinks: true }))
    pluginDirs.add(path.dirname(path.join(target, marker)));
const pluginFiles = [];
const pluginFindings = [];
let pluginIssues = 0;
let pluginWarnings = 0;
for (const dir of [...pluginDirs].filter(isPluginRoot).sort()) {
  const readers = [
    ["hooks/hooks.json", "plugin-hooks", hooksDefects],
    [".claude-plugin/plugin.json", "plugin-manifest", (source) => manifestDefects(source, dir)],
  ];
  for (const [name, rule, defects] of readers) {
    const file = path.join(dir, name);
    if (!fs.statSync(file, { throwIfNoEntry: false })?.isFile()) continue;
    pluginFiles.push(file);
    for (const { line, detail, severity = "error" } of defects(fs.readFileSync(file, "utf8"))) {
      if (severity === "error") pluginIssues++;
      else pluginWarnings++;
      pluginFindings.push(`${path.relative(base, file)}:${line} ${rule} (${severity}) ${detail}`);
    }
  }
}
issues += pluginIssues;
warnings += pluginWarnings;
report("plugin files", pluginFindings, pluginFindings.length ? `${pluginIssues} issues, ${pluginWarnings} warnings` : "none");

const proseNotRun = (why) => {
  report(PROSE_RULES, [], "not run");
  // The markdown, YAML and plugin files alone, since a code file's only reader is the process that did not start.
  console.log(`${files.length + yamlFiles.length + pluginFiles.length} files checked, ${issues} issues, prose rules not run`);
  console.log(why);
  process.exit(1);
};

// SKILL.md and references/setup.md name the Vale this package needs by pointing here, and each refusal prints it.
const MIN_VALE = [3, 23];
const minVale = MIN_VALE.join(".");

// An older Vale loads a rule naming a scope from config/scopes and matches nothing, so a run on one would pass with the comment rules off.
const versionRun = spawnSync("vale", ["--version"], { encoding: "utf8" });
const valeVersion = /(\d+)\.(\d+)\.\d+/.exec(versionRun.stdout ?? "");
// An unreadable version is refused like an old one, while a Vale that failed to start is left to the lint run, which names its failure.
if (!valeVersion && versionRun.status === 0)
  proseNotRun(
    `could not read Vale's version from "${versionRun.stdout.trim()}": the prose rules did not run. Install Vale ${minVale} or later, per references/setup.md, and run the check again.`,
  );
const [major, minor] = valeVersion ? [Number(valeVersion[1]), Number(valeVersion[2])] : [];
if (valeVersion && (major < MIN_VALE[0] || (major === MIN_VALE[0] && minor < MIN_VALE[1])))
  proseNotRun(
    `vale ${valeVersion[0]} is older than ${minVale}: the prose rules did not run. Install Vale ${minVale} or later, per references/setup.md, and run the check again.`,
  );

// --no-global drops the user's own configuration and default styles directory, where a style of the same name would shadow this one.
const valeFiles = [...files, ...codeFiles];
const vale = spawnSync("vale", ["--config", valeConfig, "--no-global", "--output=JSON", ...valeFiles], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
// A binary that is not there, or a configuration Vale refuses to load, is a setup failure and not a clean run.
if (vale.error?.code === "ENOENT" || vale.status === 2 || vale.error)
  proseNotRun(
    vale.error?.code === "ENOENT"
      ? `vale is not on PATH: the prose rules did not run. Install Vale ${minVale} or later, per references/setup.md, and run the check again.`
      : `vale could not run: ${(vale.stderr || vale.stdout || String(vale.error)).trim()}`,
  );
// Vale's exit code is not read because it is non-zero only for an error-level alert and the JSON carries every alert.
const alerts = vale.stdout.trim() ? JSON.parse(vale.stdout) : {};

let proseIssues = 0;
let proseWarnings = 0;
const proseFindings = [];
for (const file of valeFiles) {
  const rel = path.relative(base, file);
  for (const a of alerts[file] ?? []) {
    if (a.Severity === "error") {
      issues++;
      proseIssues++;
    } else proseWarnings++;
    proseFindings.push(`${rel}:${a.Line} ${a.Check} (${a.Severity}) ${a.Message}`);
  }
}
warnings += proseWarnings;
report(PROSE_RULES, proseFindings, proseFindings.length ? `${proseIssues} issues, ${proseWarnings} warnings` : "none");
console.log(`${valeFiles.length + yamlFiles.length + pluginFiles.length} files checked, ${issues} issues, ${warnings} warnings`);
process.exit(issues ? 1 : 0);
