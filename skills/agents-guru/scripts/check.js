import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { glob } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { lint } from "markdownlint/promise";
import { LineCounter, Parser, parseAllDocuments, parseDocument } from "yaml";
import { config, contractRuleNames, proseShapeRuleNames, rules, skippableRuleNames, warningRuleNames } from "./lint-config.js";
import { isSkillFile } from "./rules/frontmatter.js";
import { byCodeUnit } from "./rules/order.js";
import { hooksDefects, isPluginRoot, manifestDefects, monitorFileDefects, monitorsFile, ownServers } from "./rules/plugin-files.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const valeConfig = path.join(here, "..", ".vale.ini");

const nothingChecked = (why) => {
  console.log(`${why}: nothing was checked`);
  process.exit(1);
};

// --skip is taken out before any argument resolves as a path, so a run naming only --skip still checks the working directory.
const skip = new Set();
const paths = [];
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] !== "--skip") {
    paths.push(process.argv[i]);
    continue;
  }
  i += 1;
  const name = process.argv[i];
  if (!skippableRuleNames.has(name)) {
    nothingChecked(`${name === undefined ? "--skip names no rule" : `--skip ${name}`}: only ${[...skippableRuleNames].join(", ")} can be skipped`);
  }
  skip.add(name);
}
// Stryker disable next-line StringLiteral: path.resolve reads an empty target as the working directory, as it reads ".".
const targets = (paths.length > 0 ? paths : ["."]).map((arg) => path.resolve(arg));

// Each file keeps the root of the first target reaching it, so a file two targets reach is read once.
const rootOf = new Map();
const folders = [];
// The walk matches names rather than files, so a folder named notes.md arrives beside the files inside it, and a link statSync cannot resolve arrives as a file nothing can read.
const dangling = new Map();
// WHY: every target is stat'ed before any folder is walked, so a mistyped one refuses at once rather than after the walks of the targets beside it.
for (const target of targets) {
  const stat = fs.statSync(target, { throwIfNoEntry: false });
  if (!stat) {
    nothingChecked(`no such file or folder: ${target}`);
  }
  if (!(stat.isDirectory() || /\.(?:md|js|py|ya?ml)$/u.test(target))) {
    nothingChecked(`no reader takes ${target}`);
  }
}
// Dot-directories stay out because an agent's skills directory and a fixture tree each keep their own, which nobody is auditing.
const walks = await Promise.all(
  targets.map((target) =>
    fs.statSync(target, { throwIfNoEntry: false })?.isDirectory()
      ? Array.fromAsync(
          glob(["**/*.md", "**/*.js", "**/*.py", "**/*.yml", "**/*.yaml"], { cwd: target, exclude: ["**/node_modules/**"], followSymlinks: true }),
        )
      : [],
  ),
);
for (const [i, target] of targets.entries()) {
  // WHY: a target can vanish while the walks are awaited, and it is refused in the script's own words rather than by a stack trace.
  const stat = fs.statSync(target, { throwIfNoEntry: false });
  if (!stat) {
    nothingChecked(`no such file or folder: ${target}`);
  }
  let reached = [target];
  if (stat.isDirectory()) {
    const lost = [];
    reached = walks[i]
      .map((file) => path.join(target, file))
      .filter((file) => {
        try {
          return fs.statSync(file).isFile();
        } catch (error) {
          // A plain file that cannot be stat'ed is no link, so it stops the run rather than being named as one.
          if (!fs.lstatSync(file).isSymbolicLink()) {
            throw error;
          }
          lost.push([file, error.code]);
          return false;
        }
      });
    for (const [file, code] of lost) {
      dangling.set(file, code);
    }
    // A dangling link counts as markdown found, so a target holding nothing else reaches the group that names it.
    if (![...reached, ...lost.map(([file]) => file)].some((file) => file.endsWith(".md"))) {
      nothingChecked(`no markdown file found under ${target}`);
    }
  }
  // A file names no tree of its own, so its paths resolve against the folder the command runs in, which is the one its path was written against.
  const root = stat.isDirectory() ? target : process.cwd();
  for (const file of reached) {
    if (!rootOf.has(file)) {
      rootOf.set(file, root);
    }
  }
  folders.push(stat.isDirectory() ? target : path.dirname(target));
}

// Paths print from the folder every target shares, so no printed path repeats the part common to all of them.
const base = folders.reduce((sharedSoFar, folder) => {
  let shared = sharedSoFar;
  while (shared !== folder && !folder.startsWith(shared.endsWith(path.sep) ? shared : shared + path.sep)) {
    shared = path.dirname(shared);
  }
  return shared;
});

const found = [...rootOf.keys()];
const files = found.filter((file) => file.endsWith(".md")).sort(byCodeUnit);
// A code file reaches Vale alone, which reads it as its comments and docstrings, and never markdownlint.
const codeFiles = found.filter((file) => /\.(?:js|py)$/u.test(file)).sort(byCodeUnit);
// A YAML file is read by this script alone, since Vale leaves it out for the reason workflows/check.md gives.
const yamlFiles = found.filter((file) => /\.ya?ml$/u.test(file)).sort(byCodeUnit);

// The skills found are named because a file count alone cannot tell a sweep that covered one skill of a package from one that covered all of them.
const skills = files
  .filter(isSkillFile)
  .map((file) => path.relative(base, path.dirname(file)) || ".")
  .sort(byCodeUnit);
console.log(skills.length > 0 ? `${skills.length} skill(s) found under ${base}` : `no skill found under ${base}`);
for (const skill of skills) {
  console.log(`  ${skill}`);
}

// A constant because the branch reporting a Vale that could not start prints this heading too, and a rename reaching one site and not the other would put a heading no other run uses on the run whose reader most needs to recognise it.
const PROSE_RULES = "prose rules";

// A count of zero prints too, because a reader who has to infer from silence that the class this skill exists to catch found nothing is the reader this grouping is for.
const report = (label, lines, summary = lines.length || "none") => {
  console.log(`${label}: ${summary}`);
  for (const line of lines) {
    console.log(`  ${line}`);
  }
};

// One filter by rule name serves markdownlint's findings, the YAML reader's and Vale's, so a rule joining the skippable set needs no stream of its own.
const withheld = new Map([...skip].sort(byCodeUnit).map((name) => [name, 0]));
const withholds = (names) => {
  const name = names.find((n) => skip.has(n));
  if (name) {
    withheld.set(name, withheld.get(name) + 1);
  }
  return Boolean(name);
};
// Nothing prints when nothing was skipped, so a plain run shows no group for a switch its caller never used.
const reportSkipped = () => {
  if (skip.size === 0) {
    return "";
  }
  report(
    "skipped rules",
    [...withheld].map(([name, count]) => `${name}: ${count} findings withheld`),
  );
  return `, ${skip.size} rule(s) skipped`;
};

// One run per root, passed to the layout, referenced-path and package-runner rules so none reads a tree nobody asked it to read.
const perRoot = await Promise.all(
  [...new Set(files.map((file) => rootOf.get(file)))].map((root) =>
    lint({
      files: files.filter((file) => rootOf.get(file) === root),
      customRules: rules,
      config: { ...config, "skill-layout": { root }, "skill-referenced-paths": { root }, "skill-package-runners": { root } },
      // Without this a <!-- markdownlint-disable --> in the target would switch off every rule, skill-vale-directive included.
      noInlineConfig: true,
    }),
  ),
);
const results = {};
for (const rootResults of perRoot) {
  Object.assign(results, rootResults);
}

// Every markdownlint class prints before Vale runs, so a structural finding is never withheld by a prose linter that cannot start.
let issues = dangling.size;
report(
  "dangling links",
  [...dangling.keys()]
    .sort(byCodeUnit)
    .map((file) => `${path.relative(base, file)} dangling-link cannot be resolved (${dangling.get(file)}), so nothing was read from it`),
);
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
    if (withholds(e.ruleNames)) {
      continue;
    }
    // Stryker disable next-line MethodExpression: every custom rule carries one name and no built-in rule's names are in the set, so some and every agree.
    const warning = e.ruleNames.some((name) => warningRuleNames.has(name));
    // Stryker disable next-line MethodExpression: every custom rule carries one name and no built-in rule's names are in the set, so some and every agree.
    const proseShape = e.ruleNames.some((name) => proseShapeRuleNames.has(name));
    if (!warning) {
      issues += 1;
    } else if (proseShape) {
      proseShapeWarnings += 1;
    } else {
      contractWarnings += 1;
    }
    const detail = e.errorDetail ? ` [${e.errorDetail}]` : "";
    const context = e.errorContext ? ` [Context: "${e.errorContext}"]` : "";
    const line = `${rel}:${e.lineNumber} ${e.ruleNames.join("/")}${warning ? " (warning)" : ""} ${e.ruleDescription}${detail}${context}`;
    // Stryker disable next-line MethodExpression: every custom rule carries one name and no built-in rule's names are in the set, so some and every agree.
    const contract = e.ruleNames.some((name) => contractRuleNames.has(name));
    if (contract) {
      contractFindings.push(line);
    } else if (proseShape) {
      proseShapeFindings.push(line);
    } else {
      generalFindings.push(line);
    }
  }
}
warnings += contractWarnings + proseShapeWarnings;
report(
  "skill rules",
  contractFindings,
  contractWarnings > 0 ? `${contractFindings.length - contractWarnings} issues, ${contractWarnings} warnings` : undefined,
);
report(
  "prose shape",
  proseShapeFindings,
  proseShapeWarnings > 0 ? `${proseShapeFindings.length - proseShapeWarnings} issues, ${proseShapeWarnings} warnings` : undefined,
);
report("general lint", generalFindings);

// A comment is read off the parser's tree, because a "#" inside a block scalar is text and a raw-line scan would read it as a comment.
const commentsOf = (source) => {
  const lines = new LineCounter();
  const comments = [];
  const walk = (node) => {
    // Stryker disable next-line ConditionalExpression: an array walked as an object reaches the same items through Object.values.
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === "object") {
      if (node.type === "comment") {
        comments.push({ ...lines.linePos(node.offset), text: node.source });
      } else {
        Object.values(node).forEach(walk);
      }
    }
  };
  for (const token of new Parser(lines.addNewLine).parse(source)) {
    walk(token);
  }
  // Stryker disable next-line all: the parser's tokens already arrive in source order, so the sort guards an order nothing produces.
  return comments.sort((a, b) => a.line - b.line);
};

const yamlFindings = [];
let yamlWarnings = 0;
for (const file of yamlFiles) {
  const rel = path.relative(base, file);
  const source = fs.readFileSync(file, "utf8");
  const docs = parseAllDocuments(source);
  // A stream holding no document comes back empty and raises nothing, so a file of directives alone is parsed again as one document, which reports what is missing.
  const errors = docs.length > 0 ? docs.flatMap((doc) => doc.errors) : parseDocument(source).errors;
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
    if (before?.line === c.line - 1 && !/[.!?]["')\]`*_]*$/u.test(before.text.trimEnd()) && !withholds(["yaml-comment-wrap"])) {
      yamlFindings.push(
        `${rel}:${c.line} yaml-comment-wrap (warning) continues the sentence on the line before: write each paragraph of a comment on one line`,
      );
      yamlWarnings += 1;
    }
  }
}
issues += yamlFindings.length - yamlWarnings;
warnings += yamlWarnings;
report("yaml files", yamlFindings, yamlWarnings > 0 ? `${yamlFindings.length - yamlWarnings} issues, ${yamlWarnings} warnings` : undefined);

// Stryker disable next-line MethodExpression: a glob whose folder is a file yields nothing, so a file target adds no plugin either way.
const searched = targets.filter((dir) => fs.statSync(dir).isDirectory());
// The .claude-plugin folder is searched for by name, because the walk skips dot-folders and a plugin holding no file the walk takes would otherwise go unseen.
const markersPerDir = await Promise.all(
  searched.map((dir) => Array.fromAsync(glob("**/.claude-plugin", { cwd: dir, exclude: ["**/node_modules/**"], followSymlinks: true }))),
);
const pluginDirs = new Set(searched.flatMap((dir, i) => markersPerDir[i].map((marker) => path.dirname(path.join(dir, marker)))));
const pluginFiles = [];
const pluginFindings = [];
let pluginIssues = 0;
let pluginWarnings = 0;
for (const dir of [...pluginDirs].filter(isPluginRoot).sort(byCodeUnit)) {
  const readers = [
    ["hooks/hooks.json", "plugin-hooks", (source) => hooksDefects(source, ownServers(dir))],
    [".claude-plugin/plugin.json", "plugin-manifest", (source) => manifestDefects(source, dir)],
    [monitorsFile(dir), "plugin-manifest", monitorFileDefects],
  ];
  for (const [name, rule, defects] of readers.filter(([entry]) => entry)) {
    const file = path.join(dir, name);
    if (!fs.statSync(file, { throwIfNoEntry: false })?.isFile()) {
      continue;
    }
    pluginFiles.push(file);
    for (const { line, detail, severity = "error" } of defects(fs.readFileSync(file, "utf8"))) {
      if (severity === "error") {
        pluginIssues += 1;
      } else {
        pluginWarnings += 1;
      }
      pluginFindings.push(`${path.relative(base, file)}:${line} ${rule} (${severity}) ${detail}`);
    }
  }
}
issues += pluginIssues;
warnings += pluginWarnings;
report("plugin files", pluginFindings, pluginFindings.length > 0 ? `${pluginIssues} issues, ${pluginWarnings} warnings` : "none");

const proseNotRun = (why) => {
  report(PROSE_RULES, [], "not run");
  const skipped = reportSkipped();
  // The markdown, YAML and plugin files alone, since a code file's only reader is the process that did not start.
  console.log(`${files.length + yamlFiles.length + pluginFiles.length} files checked, ${issues} issues, prose rules not run${skipped}`);
  console.log(why);
  process.exit(1);
};

// SKILL.md and references/setup.md name the Vale this package needs by pointing here, and each refusal prints it.
const MIN_VALE_MAJOR = 3;
const MIN_VALE_MINOR = 25;
const minVale = `${MIN_VALE_MAJOR}.${MIN_VALE_MINOR}`;

// A Vale before 3.23 loads a rule naming a scope from config/scopes and matches nothing, so its run would pass with rules quietly off.
const versionRun = spawnSync("vale", ["--version"], { encoding: "utf8" });
// Stryker disable next-line StringLiteral: stdout is null only when Vale did not start, and no fallback text holds a version.
const valeVersion = /(?<major>\d+)\.(?<minor>\d+)\.\d+/u.exec(versionRun.stdout ?? "");
// An unreadable version is refused like an old one, while a Vale that failed to start is left to the lint run, which names its failure.
if (!valeVersion && versionRun.status === 0) {
  proseNotRun(
    `could not read Vale's version from "${versionRun.stdout.trim()}": the prose rules did not run. Install Vale ${minVale} or later, per references/setup.md, and run the check again.`,
  );
}
// Stryker disable next-line ArrayDeclaration: with no version read, major and minor are read only behind a test of valeVersion.
const [major, minor] = valeVersion ? [Number(valeVersion.groups.major), Number(valeVersion.groups.minor)] : [];
if (valeVersion && (major < MIN_VALE_MAJOR || (major === MIN_VALE_MAJOR && minor < MIN_VALE_MINOR))) {
  proseNotRun(
    `vale ${valeVersion[0]} is older than ${minVale}: the prose rules did not run. Install Vale ${minVale} or later, per references/setup.md, and run the check again.`,
  );
}

// --no-global drops the user's own configuration and default styles directory, where a style of the same name would shadow this one.
const valeFiles = [...files, ...codeFiles];
const MEBIBYTE = 1_048_576;
const VALE_OUTPUT_MEBIBYTES = 64;
const runVale = (batch) =>
  spawnSync("vale", ["--config", valeConfig, "--no-global", "--output=JSON", ...batch], { encoding: "utf8", maxBuffer: VALE_OUTPUT_MEBIBYTES * MEBIBYTE });
// WHY: Vale refuses the whole run over one file whose frontmatter it cannot read, naming every such file at once on stderr, so those files are set aside as findings and the rest are read again.
const refusedFiles = (run) => {
  if (run.status !== 2) {
    return [];
  }
  try {
    return run.stderr
      .split(/^(?=\{)/mu)
      .map((part) => JSON.parse(part))
      .filter((e) => e.Code === "E201" && valeFiles.includes(e.Path));
  } catch {
    return [];
  }
};
let vale = runVale(valeFiles);
const unreadable = refusedFiles(vale);
const readable = valeFiles.filter((file) => !unreadable.some((e) => e.Path === file));
// WHY: Vale handed no file prints its usage rather than JSON.
if (unreadable.length > 0) {
  vale = readable.length > 0 ? runVale(readable) : { status: 0, stdout: "" };
}
// A binary that is not there, or a configuration Vale refuses to load, is a setup failure and not a clean run.
// Stryker disable next-line ConditionalExpression,StringLiteral: a missing binary also sets vale.error, which the last test catches
if (vale.error?.code === "ENOENT" || vale.status === 2 || vale.error) {
  proseNotRun(
    vale.error?.code === "ENOENT"
      ? `vale is not on PATH: the prose rules did not run. Install Vale ${minVale} or later, per references/setup.md, and run the check again.`
      : `vale could not run: ${(vale.stderr || vale.stdout || String(vale.error)).trim()}`,
  );
}
// Vale's exit code is not read because it is non-zero only for an error-level alert and the JSON carries every alert.
const alerts = vale.stdout.trim() ? JSON.parse(vale.stdout) : {};

let proseIssues = unreadable.length;
issues += unreadable.length;
let proseWarnings = 0;
const proseFindings = unreadable.map(
  (e) => `${path.relative(base, e.Path)}:${e.Line} vale-unread (error) Vale could not read this file (${e.Text}), so no prose rule judged it`,
);
for (const file of valeFiles) {
  const rel = path.relative(base, file);
  for (const a of alerts[file] ?? []) {
    // Stryker disable next-line ConditionalExpression,ArrayDeclaration: a Vale check is named Style.Rule, and no skippable rule's name holds a dot.
    if (withholds([a.Check])) {
      continue;
    }
    if (a.Severity === "error") {
      issues += 1;
      proseIssues += 1;
    } else {
      proseWarnings += 1;
    }
    proseFindings.push(`${rel}:${a.Line} ${a.Check} (${a.Severity}) ${a.Message}`);
  }
}
warnings += proseWarnings;
report(PROSE_RULES, proseFindings, proseFindings.length > 0 ? `${proseIssues} issues, ${proseWarnings} warnings` : "none");
const skipped = reportSkipped();
console.log(`${valeFiles.length + yamlFiles.length + pluginFiles.length} files checked, ${issues} issues, ${warnings} warnings${skipped}`);
process.exit(issues ? 1 : 0);
