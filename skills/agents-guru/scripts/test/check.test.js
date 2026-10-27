// Fixtures live in a temporary directory outside any tree an agent discovers, because a fixture shipped as a real SKILL.md is read by some agents as a broken skill.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, it } from "vitest";
import { looksLikePath, owningSkill, resolves } from "../rules/paths.js";
import { enclosingSkill } from "../rules/skill-layout.js";
import { carriesInstallForm } from "../rules/skill-readme.js";

const check = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "check.js");
const strykerChild = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "stryker-child.js");
let tmp;

// Every fixture carries a README unless `readme` is null, so a skill-readme finding never lands in a test about another rule.
const README = "# A skill\n\n## Install\n\n```bash\nskills add owner/repo\n```\n";
function mk(dir, fm, readme = README) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "SKILL.md"), `---\n${fm}\n---\n\nbody\n`);
  if (readme !== null) fs.writeFileSync(path.join(dir, "README.md"), readme);
}
const block = (name, text = "Fine.") => `name: ${name}\ndescription: |\n  ${text}`;

// WHY: Stryker's Vitest runner activates a mutant and collects coverage in this process only, and the spawned check reaches most of what it mutates.
function underStryker(args, env) {
  const ns = globalThis.__stryker__;
  if (ns?.activeMutant !== undefined) return { args, env: { ...env, __STRYKER_ACTIVE_MUTANT__: ns.activeMutant } };
  if (ns?.currentTestId === undefined) return { args, env };
  const dump = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "stryker-child-")), "coverage.json");
  const absorb = () => {
    if (fs.existsSync(dump)) {
      ns.mutantCoverage ??= { static: {}, perTest: {} };
      ns.mutantCoverage.perTest[ns.currentTestId] ??= {};
      const into = ns.mutantCoverage.perTest[ns.currentTestId];
      for (const [id, hits] of Object.entries(JSON.parse(fs.readFileSync(dump, "utf8")).static)) into[id] = (into[id] ?? 0) + hits;
    }
    fs.rmSync(path.dirname(dump), { recursive: true });
  };
  return { args: ["--import", strykerChild, ...args], env: { ...env, STRYKER_CHILD_COVERAGE: dump }, absorb };
}

function run(targets, env = process.env, cwd = undefined) {
  const spawn = underStryker([check, ...[targets].flat()], env);
  const r = spawnSync(process.execPath, spawn.args, { encoding: "utf8", env: spawn.env, cwd });
  spawn.absorb?.();
  const linted = /^(\d+) files checked/m.exec(r.stdout);
  return { code: r.status, out: r.stdout + r.stderr, linted: linted ? Number(linted[1]) : null };
}

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agents-guru-check-"));
  mk(path.join(tmp, "good"), block("good"));
  // A sibling whose name extends good's, so a folder test made on strings rather than path segments would put it inside good.
  mk(path.join(tmp, "good-too"), block("good-too"));
  mk(path.join(tmp, "bad"), "name: bad\ndescription: review PR #N and more");
  fs.mkdirSync(path.join(tmp, "empty"));
  // The real .vale.ini is resolved from the script's own directory, so a stub on PATH is what reaches the refused-configuration branch.
  const refuses = path.join(tmp, "refuses-bin");
  fs.mkdirSync(refuses);
  fs.writeFileSync(path.join(refuses, "vale"), '#!/bin/sh\necho "E100 [core] cannot parse config: bad line" >&2\nexit 2\n', { mode: 0o755 });
  // One stub per minor under 3.23, so an off-by-one threshold fails on 3.22.0.
  for (const version of ["3.21.0", "3.22.0"]) {
    const bin = path.join(tmp, `old-bin-${version}`);
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "vale"), `#!/bin/sh\necho "vale version ${version}"\n`, { mode: 0o755 });
  }
  const unversioned = path.join(tmp, "unversioned-bin");
  fs.mkdirSync(unversioned);
  fs.writeFileSync(path.join(unversioned, "vale"), '#!/bin/sh\necho "vale version master"\n', { mode: 0o755 });
  fs.mkdirSync(path.join(tmp, "notes"));
  fs.writeFileSync(path.join(tmp, "notes", "notes.txt"), "- **lead.** first\n\n  the reason\n\n  a second paragraph\n");

  const pkg = path.join(tmp, "pkg");
  mk(path.join(pkg, "skills", "alpha"), block("alpha", "Alpha, under a package root."));
  mk(path.join(pkg, "skills", "beta"), block("beta", "Beta, under the same root."));
  mk(path.join(pkg, "skills", "alpha", "references"), block("references", "An example SKILL.md quoted inside a skill."));
  mk(path.join(pkg, ".hidden"), block("hidden", "A skill inside a dot-directory."));
  fs.mkdirSync(path.join(pkg, "agents"));
  fs.writeFileSync(path.join(pkg, "agents", "reviewer.md"), "# Reviewer\n\nbody\n");
  fs.writeFileSync(path.join(pkg, "README.md"), "# Package\n\nbody\n");

  // Shaped as a package so the owning skill and the target root are different directories, which a fixture conflating them could not tell apart.
  const refs = path.join(tmp, "refs");
  const inner = path.join(refs, "skills", "inner");
  mk(inner, block("inner"));
  fs.mkdirSync(path.join(inner, "workflows", "deep"), { recursive: true });
  fs.writeFileSync(path.join(inner, "workflows", "new.md"), "# New\n\nbody\n");
  fs.writeFileSync(path.join(refs, "top.md"), "# Top\n\nbody\n");
  fs.writeFileSync(path.join(inner, "workflows", "deep", "sibling.md"), "body\n");
  // One file per resolution base, so a base dropped from paths.js is a named failure rather than a fixture that still passes through another.
  fs.writeFileSync(path.join(inner, "workflows", "deep", "only-skill.md"), "Reaches the owning skill alone: `workflows/new.md`.\n");
  fs.writeFileSync(path.join(inner, "workflows", "deep", "only-own-dir.md"), "Reaches this file's own directory alone: `sibling.md`.\n");
  fs.writeFileSync(path.join(inner, "workflows", "deep", "only-root.md"), "Reaches the target root alone: `top.md`.\n");
  fs.appendFileSync(
    path.join(inner, "SKILL.md"),
    "\nA span `workflows/new.md` resolves and `workflows/gone.md` does not.\n\nNot paths: `feat/GHI-50_login-form`, `github/gh-stack`, `/usr/bin/env`, `~/.agents/skills/x/SKILL.md`, `docs/*.md`, `E:/work/notes.md`.\n\nThe example-path case, quoted so the rule never sees it: 'workflows/deliberately-absent.md'.\n\nA path the served repository holds, named by its root: `<repo-root>/.agents/gh-solo.md`.\n\n```bash\ncat workflows/also-gone.md\n```\n",
  );

  mk(path.join(tmp, "no-readme"), block("no-readme"), null);
  mk(path.join(tmp, "readme-no-install"), block("readme-no-install"), "# A skill\n\nWhat it does, and nothing about getting it.\n");
  mk(path.join(tmp, "readme-fenced-install"), block("readme-fenced-install"), "# A skill\n\n## Getting it\n\n```bash\nnpm install -g thing\n```\n");

  // <tmp>/ab is not inside <tmp>/a though its path string opens with it, which is enclosingSkill's own boundary.
  mk(path.join(tmp, "ab"), block("ab"));
  mk(path.join(tmp, "ab", "x"), block("x"));

  mk(path.join(tmp, "many", "one", "skills", "review"), "name: review\ndescription: review PR #N in one plugin");
  mk(path.join(tmp, "many", "two", "skills", "review"), "name: review\ndescription: review PR #N in another");

  const configured = path.join(tmp, "configured");
  mk(configured, "name: configured\ndescription: review PR #N and more");
  fs.appendFileSync(path.join(configured, "SKILL.md"), "trailing space here \n");
  fs.writeFileSync(path.join(configured, ".markdownlint-cli2.jsonc"), '{ "config": { "skill-description": false, "skill-frontmatter-parsed": false } }\n');
  fs.writeFileSync(path.join(configured, ".markdownlint.json"), '{ "default": false }\n');

  for (const [dir, comment] of [
    ["inline-disabled", "<!-- markdownlint-disable -->"],
    ["inline-disabled-rule", "<!-- markdownlint-disable skill-vale-directive -->"],
    ["inline-configured", '<!-- markdownlint-configure-file { "skill-vale-directive": false } -->'],
  ]) {
    mk(path.join(tmp, dir), block(dir));
    fs.appendFileSync(path.join(tmp, dir, "SKILL.md"), `\n${comment}\n\n<!-- vale off -->\n`);
  }

  // The cli2 configuration names a rule module whose dependency is not installed, so a runner that discovered configuration would abort where this check reads markdown only.
  const configuredPackage = path.join(tmp, "configured-package", "some-skill");
  mk(configuredPackage, block("some-skill"));
  fs.mkdirSync(path.join(configuredPackage, "scripts", "rules"), { recursive: true });
  fs.writeFileSync(path.join(configuredPackage, ".markdownlint-cli2.jsonc"), '{ "customRules": ["./scripts/rules/x.js"] }\n');
  fs.writeFileSync(path.join(configuredPackage, "scripts", "rules", "x.js"), 'import "nothing-installed-here";\nexport default {};\n');

  // A directory of symlinks is what an agent's own skills directory is.
  fs.mkdirSync(path.join(tmp, "linked"));
  fs.symlinkSync(path.join(pkg, "skills", "beta"), path.join(tmp, "linked", "beta"));
  fs.symlinkSync(path.join(tmp, "good"), path.join(tmp, "linked", "good"));

  const long = Array.from({ length: 41 }, (_, i) => Array.from({ length: 50 }, (_, j) => `word${i}x${j}`).join(" ")).join("\n\n");
  mk(path.join(tmp, "long"), block("long", "A long skill."));
  fs.appendFileSync(path.join(tmp, "long", "SKILL.md"), `\n${long}\n`);
  // A wrapped paragraph alone, so the run's exit code says whether a hard-wrap warning fails it.
  mk(path.join(tmp, "wrapped"), block("wrapped"));
  fs.appendFileSync(path.join(tmp, "wrapped", "SKILL.md"), "\nOne paragraph\nover two lines.\n");

  // The grouping is only legible on a target that reaches every heading, so it is watched here rather than on a clean one.
  const classes = path.join(tmp, "classes");
  mk(classes, "name: classes\ndescription: review PR #N and more");
  fs.appendFileSync(path.join(classes, "SKILL.md"), "\nthe example above says so. \n\n- lead\n\n  one\n\n  two\n");
  fs.appendFileSync(path.join(classes, "SKILL.md"), `\n${"- **lead.** a run past the cap\n".repeat(7)}`);

  // Markdown under a target keeping no skill is a legitimate target, where an empty one is a wrong target.
  fs.mkdirSync(path.join(tmp, "prose-only"));
  fs.writeFileSync(path.join(tmp, "prose-only", "notes.md"), "# Notes\n\nthe example above says so.\n");

  // The same comment sits under node_modules so the exclusion is watched on a code file, where a dependency's own comments are nobody's finding.
  const code = path.join(tmp, "code");
  mk(code, block("code"));
  fs.mkdirSync(path.join(code, "scripts", "node_modules", "dep"), { recursive: true });
  fs.writeFileSync(path.join(code, "scripts", "run.js"), "// The first sentence says why. The second narrates the line.\nconst a = 1;\n");
  fs.writeFileSync(
    path.join(code, "scripts", "node_modules", "dep", "index.js"),
    "// The first sentence says why. The second narrates the line.\nconst a = 1;\n",
  );

  // One failure per fixture, so a finding that fires on the wrong file is a named failure rather than a match on its neighbour's.
  for (const [dir, yaml] of [
    ["yaml-broken", "a: 1\nb: value: other\n"],
    ["yaml-duplicate", "a: 1\na: 2\n"],
    ["yaml-directive", "%YAML 1.2\n"],
    ["yaml-wrapped", "# A comment wrapped at\n# a column.\nkey: value\n"],
    // The block scalar holds a wrapped "comment" that is text, so a check reading raw lines would fail a clean file.
    [
      "yaml-separate",
      "# One note.\n# Another note.\n# A paragraph's close, before an empty line.\n#\n# The next paragraph.\nkey: |\n  # a heading inside a block scalar\n  # and its text\n",
    ],
    ["yaml-mid-stop", "# A first sentence. A second one wrapped\n# at a column.\nkey: value\n"],
    ["yaml-indented", "key:\n  # A nested comment wrapped at\n  # a column.\n  inner: 1\n"],
    ["yaml-blank-hash", "# A note before a separator\n#   \n# The next paragraph.\nkey: value\n"],
    ["yaml-trailing-space", "# A note that ends.  \n# Another note.\nkey: value\n"],
    ["yaml-trailing-comment", "key: value # a note after the value\n"],
  ]) {
    mk(path.join(tmp, dir), block(dir));
    fs.writeFileSync(path.join(tmp, dir, "rule.yml"), yaml);
  }
  // A stream of several documents is well-formed YAML, so it parses rather than failing as one document with a second appended.
  fs.writeFileSync(path.join(tmp, "yaml-separate", "stream.yaml"), "a: 1\n---\nb: 2\n");

  // Every skill-only rule reports this file's frontmatter and place inside a skill when it is named SKILL.md, so one firing on another name is a named failure.
  mk(path.join(tmp, "not-a-skill"), block("not-a-skill"));
  fs.mkdirSync(path.join(tmp, "not-a-skill", "nested"));
  fs.writeFileSync(
    path.join(tmp, "not-a-skill", "nested", "agents.md"),
    "---\nname: Wrong Name\ndescription: review PR #N and more\ndisable-model-invocation: yes\n---\n\n# Agents\n\nbody\n",
  );

  // A plugin is told apart by the .claude-plugin folder beside its agents folder, which a string fixture in rules.test.js has no disk for.
  const plugin = path.join(tmp, "plugin");
  fs.mkdirSync(path.join(plugin, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(plugin, ".claude-plugin", "plugin.json"), '{ "name": "plugin" }\n');
  fs.mkdirSync(path.join(plugin, "agents", "review"), { recursive: true });
  fs.writeFileSync(path.join(plugin, "agents", "tooled.md"), "---\nname: tooled\ndescription: Reviews code.\nmcpServers: {}\n---\n\nBody.\n");
  fs.writeFileSync(path.join(plugin, "agents", "review", "nameless.md"), "---\ndescription: Reviews code.\ninitialPrompt: Start.\n---\n\nBody.\n");
  // A plugin whose one agent draws only a warning, so the run's exit code says whether a warning fails it.
  const longName = path.join(tmp, "long-name");
  fs.mkdirSync(path.join(longName, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(longName, ".claude-plugin", "plugin.json"), '{ "name": "long-name" }\n');
  fs.mkdirSync(path.join(longName, "agents"), { recursive: true });
  fs.writeFileSync(path.join(longName, "agents", "long.md"), `---\nname: ${"a".repeat(300)}\ndescription: Reviews code.\n---\n\nBody.\n`);
  // A field a plugin's agent is reported for, so this folder counted as a plugin's is a named failure.
  fs.mkdirSync(path.join(tmp, "loose", "agents"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "loose", "agents", "tooled.md"), "---\nname: tooled\ndescription: Reviews code.\nmcpServers: {}\n---\n\nBody.\n");
  fs.mkdirSync(path.join(tmp, "project", ".claude", "agents"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "project", ".claude", "agents", "nameless.md"), "---\ndescription: Reviews code.\n---\n\nBody.\n");

  // Each plugin carries markdown, since a folder with none is a target the check refuses before it looks for a plugin.
  const plugins = path.join(tmp, "plugins");
  const put = (file, text) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  const mkPlugin = (name, manifest, files = {}) => {
    put(path.join(plugins, name, ".claude-plugin", "plugin.json"), manifest);
    put(path.join(plugins, name, "README.md"), `# ${name}\n\nbody\n`);
    for (const [file, text] of Object.entries(files)) put(path.join(plugins, name, file), text);
  };
  const stopMatcher = JSON.stringify({ hooks: { Stop: [{ matcher: "x", hooks: [{ type: "command", command: "true" }] }] } }, null, 2);
  mkPlugin("plug", JSON.stringify({ name: "plug", commands: "./extra/", experimental: { monitors: [] } }, null, 2), {
    "commands/x.md": "# X\n\nbody\n",
    "monitors/monitors.json": "[]\n",
    "hooks/hooks.json": stopMatcher,
  });
  // One file of each kind the summary counts, so a sum that drops a kind prints the wrong total.
  mkPlugin("counted", JSON.stringify({ name: "counted" }), { "rule.yml": "key: value\n" });
  mkPlugin("listed", JSON.stringify({ name: "listed", commands: ["./commands/", "./extra/"] }), { "commands/x.md": "# X\n\nbody\n" });
  mkPlugin("inside", JSON.stringify({ name: "inside", commands: ["./commands/deploy.md"] }), { "commands/deploy.md": "# Deploy\n\nbody\n" });
  mkPlugin("partial", JSON.stringify({ name: "partial", commands: ["./commands/deploy.md"] }), {
    "commands/deploy.md": "# Deploy\n\nbody\n",
    "commands/rollback.md": "# Rollback\n\nbody\n",
    "commands/.gitkeep": "",
    "commands/.drafts/old.md": "# Old\n\nbody\n",
  });
  mkPlugin("mapped", JSON.stringify({ name: "mapped", commands: { deploy: { source: "./commands/deploy.md" } } }), {
    "commands/deploy.md": "# Deploy\n\nbody\n",
  });
  mkPlugin("hollow", JSON.stringify({ name: "hollow", agents: "./elsewhere/" }));
  fs.mkdirSync(path.join(plugins, "hollow", "agents"));
  mkPlugin("broken", "{", { "hooks/hooks.json": '{ "hooks": { "Stop": [ { "matcher": "x", "hooks": [] }, ] } }' });
  mkPlugin("linked", JSON.stringify({ name: "linked", agents: "./other/" }), { "shared/rev.md": "# Rev\n\nbody\n" });
  fs.mkdirSync(path.join(plugins, "linked", "agents"));
  fs.symlinkSync(path.join("..", "shared", "rev.md"), path.join(plugins, "linked", "agents", "rev.md"));
  // No markdown, so only a search for .claude-plugin itself finds this plugin under a wider target.
  put(path.join(plugins, "hookonly", ".claude-plugin", "plugin.json"), '{ "name": "hookonly" }');
  put(path.join(plugins, "hookonly", "hooks", "hooks.json"), stopMatcher);
  // A hooks file reported for a matcher, so this folder read as a plugin's is a named failure.
  put(path.join(plugins, "unmarked", "README.md"), "# unmarked\n\nbody\n");
  put(path.join(plugins, "unmarked", "hooks", "hooks.json"), stopMatcher);

  mk(path.join(tmp, "dotted"), block("dotted"));
  fs.mkdirSync(path.join(tmp, "dotted", ".hidden"));
  fs.writeFileSync(path.join(tmp, "dotted", ".hidden", "w.md"), "- **lead.** first\n\n  the reason\n\n  a second paragraph\n");
});

afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe("check.js", () => {
  it("a single skill directory is checked and passes", () => {
    const r = run(path.join(tmp, "good"));
    assert.equal(r.code, 0, r.out);
    assert.equal(r.linted, 2);
  });
  it("a single bad skill fails with the rule named", () => {
    const r = run(path.join(tmp, "bad"));
    assert.equal(r.code, 1);
    assert.match(r.out, /skill-description/);
    assert.match(r.out, /TRUNCATED/);
  });
  it("a long SKILL.md gets the split warning, counted apart and not failing", () => {
    const r = run(path.join(tmp, "long"));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /SKILL\.md:1 Agentifico\.SkillSplit \(warning\)/);
    assert.match(r.out, /^prose rules: 0 issues, 1 warnings$/m);
    assert.match(r.out, /2 files checked, 0 issues, 1 warnings/);
  });
  it("a hard-wrapped paragraph is a warning, counted apart and not failing", () => {
    const r = run(path.join(tmp, "wrapped"));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^ {2}SKILL\.md:\d+ skill-hard-wrap \(warning\) .*paragraph spans 2 lines/m);
    assert.match(r.out, /^prose shape: 0 issues, 1 warnings$/m);
    assert.match(r.out, /2 files checked, 0 issues, 1 warnings/);
  });
  it("without vale the structural findings are still printed, and the run fails", () => {
    // PATH holds one empty directory so vale is not found whatever bin directory this machine keeps it in, while the check is spawned by absolute path.
    const r = run(path.join(tmp, "bad"), { ...process.env, PATH: path.join(tmp, "empty") });
    assert.equal(r.code, 1);
    assert.match(r.out, /skill-description/);
    assert.match(r.out, /2 files checked, \d+ issues, prose rules not run/);
    assert.match(r.out, /vale is not on PATH/);
    const code = run(path.join(tmp, "code"), { ...process.env, PATH: path.join(tmp, "empty") });
    assert.match(code.out, /2 files checked, \d+ issues, prose rules not run/);
  });
  it("a vale that refuses its configuration fails the run, and says so", () => {
    const r = run(path.join(tmp, "bad"), { ...process.env, PATH: path.join(tmp, "refuses-bin") });
    assert.equal(r.code, 1);
    assert.match(r.out, /2 files checked, \d+ issues, prose rules not run/);
    assert.match(r.out, /vale could not run/);
    assert.match(r.out, /cannot parse config/);
    assert.ok(r.out.endsWith("vale could not run: E100 [core] cannot parse config: bad line\n"), r.out);
  });
  it("a vale older than 3.23 fails the run, and says so", () => {
    for (const version of ["3.21.0", "3.22.0"]) {
      const r = run(path.join(tmp, "bad"), { ...process.env, PATH: path.join(tmp, `old-bin-${version}`) });
      assert.equal(r.code, 1, version);
      assert.match(r.out, /2 files checked, \d+ issues, prose rules not run/);
      assert.match(r.out, new RegExp(`vale ${version.replaceAll(".", "\\.")} is older than 3\\.23`));
    }
  });
  it("a vale whose version cannot be read fails the run, and says so", () => {
    const r = run(path.join(tmp, "bad"), { ...process.env, PATH: path.join(tmp, "unversioned-bin") });
    assert.equal(r.code, 1);
    assert.match(r.out, /2 files checked, \d+ issues, prose rules not run/);
    assert.match(r.out, /could not read Vale's version from "vale version master"/);
  });
  it("a target with nothing under it fails rather than passing silently", () => {
    const r = run(path.join(tmp, "empty"));
    assert.equal(r.code, 1);
    assert.match(r.out, /nothing was checked/);
  });
  it("a non-markdown file is not prose the rules reach", () => {
    const r = run(path.join(tmp, "notes"));
    assert.equal(r.code, 1);
    assert.match(r.out, /nothing was checked/);
  });
  it("a package root: the skills under it, the files beside them, and not a dot-directory", () => {
    const r = run(path.join(tmp, "pkg"));
    assert.equal(r.linted, 8, r.out);
    assert.doesNotMatch(r.out, /hidden/);
  });
  it("a SKILL.md inside another skill is a layout finding, naming the enclosing skill", () => {
    const r = run(path.join(tmp, "pkg"));
    assert.equal(r.code, 1);
    assert.match(r.out, /references\/SKILL\.md.*skill-layout.*inside the skill at .*alpha/);
    assert.doesNotMatch(r.out, /skills\/alpha\/SKILL\.md.*skill-layout/);
  });
  it("the layout search stops at the target", () => {
    const r = run(path.join(tmp, "pkg", "skills", "alpha", "references"));
    assert.equal(r.code, 0, r.out);
  });
  it("two package roots side by side, each reported by its own path", () => {
    const r = run(path.join(tmp, "many"));
    assert.equal(r.code, 1);
    assert.equal(r.linted, 4);
    assert.match(r.out, /one\/skills\/review\/SKILL\.md:\d+ skill-description/);
    assert.match(r.out, /two\/skills\/review\/SKILL\.md:\d+ skill-description/);
  });
  it("configuration under the target changes nothing", () => {
    const r = run(path.join(tmp, "configured"));
    assert.equal(r.code, 1);
    assert.match(r.out, /TRUNCATED/);
    assert.match(r.out, /MD009/);
  });
  it("an inline markdownlint comment under the target changes nothing", () => {
    for (const dir of ["inline-disabled", "inline-disabled-rule", "inline-configured"]) {
      const r = run(path.join(tmp, dir));
      assert.equal(r.code, 1, `${dir}: ${r.out}`);
      assert.match(r.out, /skill-vale-directive/, dir);
    }
  });
  it("a package with its own cli2 configuration under the target is linted, never imported", () => {
    const r = run(path.join(tmp, "configured-package"));
    assert.equal(r.code, 0, r.out);
    assert.equal(r.linted, 3);
  });
  it("a directory of symlinks into the canonical tree is followed", () => {
    const r = run(path.join(tmp, "linked"));
    assert.equal(r.code, 0, r.out);
    assert.equal(r.linted, 4);
  });
  it("a dot-directory inside a skill is skipped", () => {
    const r = run(path.join(tmp, "dotted"));
    assert.equal(r.code, 0, r.out);
    assert.equal(r.linted, 2);
  });
  it("each class of finding prints under its own heading", () => {
    const r = run(path.join(tmp, "classes"));
    assert.equal(r.code, 1);
    assert.match(r.out, /^skill rules: 2$/m);
    assert.match(r.out, /^ {2}SKILL\.md:\d+ skill-description .*TRUNCATED/m);
    assert.match(r.out, /^prose shape: 2$/m);
    assert.match(r.out, /^ {2}SKILL\.md:\d+ skill-continuations .*cap is 1/m);
    assert.match(r.out, /^ {2}SKILL\.md:\d+ skill-bolded-runs .*cap is 5/m);
    assert.match(r.out, /^general lint: 1$/m);
    assert.match(r.out, /^ {2}SKILL\.md:\d+ MD009/m);
    assert.match(r.out, /^prose rules: 1 issues, 0 warnings$/m);
    assert.match(r.out, /^ {2}SKILL\.md:\d+ Agentifico\.Position \(error\)/m);
  });
  it("the class this skill exists to catch prints first, and the prose shape apart from it", () => {
    const r = run(path.join(tmp, "classes"));
    const contract = r.out.indexOf("skill rules:");
    const shape = r.out.indexOf("prose shape:");
    const general = r.out.indexOf("general lint:");
    const yaml = r.out.indexOf("yaml files:");
    const prose = r.out.indexOf("prose rules:");
    assert.ok(contract > -1 && contract < shape && shape < general && general < yaml && yaml < prose, r.out);
    assert.ok(r.out.indexOf("skill-description") < shape, r.out);
    assert.ok(r.out.indexOf("skill-continuations") > shape && r.out.indexOf("skill-continuations") < general, r.out);
  });
  it("a clean run states each class rather than leaving it silent", () => {
    const r = run(path.join(tmp, "good"));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^skill rules: none$/m);
    assert.match(r.out, /^prose shape: none$/m);
    assert.match(r.out, /^general lint: none$/m);
    assert.match(r.out, /^yaml files: none$/m);
    assert.match(r.out, /^prose rules: none$/m);
  });
  it("without vale the prose heading says so rather than going missing", () => {
    const r = run(path.join(tmp, "bad"), { ...process.env, PATH: path.join(tmp, "empty") });
    assert.equal(r.code, 1);
    assert.match(r.out, /^prose rules: not run$/m);
  });
  it("a single skill is named, as the target itself", () => {
    const r = run(path.join(tmp, "good"));
    assert.match(r.out, /^1 skill\(s\) found under .*good$/m);
    assert.match(r.out, /^ {2}\.$/m);
  });
  it("a code file under the target reaches the prose rules, and one under node_modules does not", () => {
    const r = run(path.join(tmp, "code"));
    assert.equal(r.code, 1);
    assert.match(r.out, /^ {2}scripts\/run\.js:1 Agentifico\.CommentSentences \(error\)/m);
    assert.doesNotMatch(r.out, /node_modules/);
    assert.equal(r.linted, 3);
  });
  it("a YAML file that does not parse fails, naming the file and the line", () => {
    const r = run(path.join(tmp, "yaml-broken"));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /^yaml files: 1$/m);
    assert.match(r.out, /^ {2}rule\.yml:2 yaml-parse /m);
  });
  it("a stream of directives with no document fails as a file that does not parse", () => {
    const r = run(path.join(tmp, "yaml-directive"));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /^ {2}rule\.yml:2 yaml-parse /m);
  });
  it("a duplicate key fails, naming the file and the line", () => {
    const r = run(path.join(tmp, "yaml-duplicate"));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /^ {2}rule\.yml:2 yaml-duplicate-key /m);
  });
  it("a comment line continuing a sentence is a warning, naming the line that continues it and not failing", () => {
    const r = run(path.join(tmp, "yaml-wrapped"));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^ {2}rule\.yml:2 yaml-comment-wrap \(warning\) /m);
    assert.match(r.out, /^yaml files: 0 issues, 1 warnings$/m);
  });
  it("a sentence ending inside a comment line does not end the line", () => {
    const r = run(path.join(tmp, "yaml-mid-stop"));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^ {2}rule\.yml:2 yaml-comment-wrap \(warning\) /m);
  });
  it("an indented comment block is read as whole lines", () => {
    const r = run(path.join(tmp, "yaml-indented"));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^ {2}rule\.yml:3 yaml-comment-wrap \(warning\) /m);
  });
  for (const [dir, why] of [
    ["yaml-blank-hash", "a # line holding only spaces separates paragraphs"],
    ["yaml-trailing-space", "spaces after a full stop still end the sentence"],
    ["yaml-trailing-comment", "a comment after a value is no comment line"],
  ]) {
    it(why, () => {
      const r = run(path.join(tmp, dir));
      assert.equal(r.code, 0, r.out);
      assert.match(r.out, /^yaml files: none$/m);
    });
  }
  it("separate one-line comments in a row pass, and a block scalar's text is not a comment", () => {
    const r = run(path.join(tmp, "yaml-separate"));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^yaml files: none$/m);
    assert.equal(r.linted, 4);
  });
  it("a package root names every skill under it, by its own path", () => {
    const r = run(path.join(tmp, "pkg"));
    assert.match(r.out, /^3 skill\(s\) found under /m);
    assert.match(r.out, /^ {2}skills\/alpha$/m);
    assert.match(r.out, /^ {2}skills\/alpha\/references$/m);
    assert.match(r.out, /^ {2}skills\/beta$/m);
  });
  it("markdown under a target with no skill is read and reported as such", () => {
    const r = run(path.join(tmp, "prose-only"));
    assert.equal(r.code, 1);
    assert.match(r.out, /^no skill found under .*prose-only$/m);
    assert.match(r.out, /^prose rules: 1 issues, 0 warnings$/m);
    assert.match(r.out, /1 files checked, 1 issues, 0 warnings/);
  });
  it("a relative target resolves against the working directory", () => {
    const r = run("good", process.env, tmp);
    assert.equal(r.code, 0, r.out);
  });
  it("several folder targets are each checked, every path printed from the folder they share", () => {
    const r = run([path.join(tmp, "good"), path.join(tmp, "bad")]);
    assert.equal(r.code, 1, r.out);
    assert.equal(r.linted, 4, r.out);
    assert.match(r.out, /^ {2}bad\/SKILL\.md:\d+ skill-description/m);
    assert.match(r.out, /^2 skill\(s\) found under /m);
    assert.match(r.out, /^ {2}good$/m);
  });
  it("two sibling targets, one name extending the other, print from their parent", () => {
    const r = run([path.join(tmp, "good"), path.join(tmp, "good-too")]);
    assert.match(r.out, /^ {2}good$/m);
    assert.match(r.out, /^ {2}good-too$/m);
  });
  it("the summary counts markdown, YAML and plugin files, with Vale and without", () => {
    const target = path.join(tmp, "plugins", "counted");
    assert.match(run(target).out, /^3 files checked, /m);
    assert.match(run(target, { ...process.env, PATH: path.join(tmp, "empty") }).out, /^3 files checked, \d+ issues, prose rules not run$/m);
  });
  it("a wrong target among right ones fails the run, naming it", () => {
    const r = run([path.join(tmp, "good"), path.join(tmp, "empty")]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /no markdown file found under .*empty: nothing was checked/);
  });
  it("a single file is checked, and printed by its own name", () => {
    const r = run(path.join(tmp, "prose-only", "notes.md"));
    assert.equal(r.code, 1, r.out);
    assert.equal(r.linted, 1, r.out);
    assert.match(r.out, /^ {2}notes\.md:\d+ Agentifico\.Position \(error\)/m);
  });
  it("a file named inside a dot-folder is read, where a walk skips it", () => {
    const r = run(path.join(tmp, "dotted", ".hidden", "w.md"));
    assert.equal(r.code, 1, r.out);
    assert.equal(r.linted, 1, r.out);
    assert.match(r.out, /^ {2}w\.md:\d+ skill-continuations/m);
  });
  it("a file not named SKILL.md gets no skill-only rule", () => {
    // Run from tmp, so the skill around the file is inside the root the layout search stops at.
    const r = run(path.join("not-a-skill", "nested", "agents.md"), process.env, tmp);
    assert.equal(r.linted, 1, r.out);
    assert.match(r.out, /^skill rules: none$/m);
  });
  it("a plugin's agent is held to the fields a plugin agent ignores, in a subfolder too, and not to a name", () => {
    const r = run(path.join(tmp, "plugin"));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /^ {2}agents\/tooled\.md:\d+ agent-frontmatter .*mcpServers is ignored/m);
    assert.match(r.out, /^ {2}agents\/review\/nameless\.md:\d+ agent-frontmatter .*initialPrompt is ignored/m);
    assert.doesNotMatch(r.out, /no name/);
  });
  it("a plugin's agent named past 256 characters is a warning, which leaves the run passing", () => {
    const r = run(path.join(tmp, "long-name"));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^ {2}agents\/long\.md:\d+ agent-plugin-name \(warning\) .*300 characters/m);
    assert.match(r.out, /^skill rules: 0 issues, 1 warnings$/m);
  });
  it("an agent named inside a .claude folder is held to a name", () => {
    const r = run(path.join(tmp, "project", ".claude", "agents", "nameless.md"));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /^ {2}nameless\.md:\d+ agent-frontmatter .*no name/m);
  });
  it("a plugin's hooks file and manifest are read by their fixed paths", () => {
    const r = run(path.join(tmp, "plugins", "plug"));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /^plugin files: 3 issues, 0 warnings$/m);
    assert.match(r.out, /^ {2}hooks\/hooks\.json:\d+ plugin-hooks .*matcher on Stop/m);
    assert.match(r.out, /^ {2}\.claude-plugin\/plugin\.json:\d+ plugin-manifest \(error\) commands replaces the default commands\/, which still holds files/m);
    assert.match(
      r.out,
      /^ {2}\.claude-plugin\/plugin\.json:\d+ plugin-manifest \(error\) experimental\.monitors replaces the default monitors\/monitors\.json, which Claude Code now ignores$/m,
    );
    // Both markdown files and both JSON files, so a JSON file read is a file checked.
    assert.equal(r.linted, 4, r.out);
  });
  it("a plugin under a package target is found", () => {
    assert.match(run(path.join(tmp, "plugins")).out, /^ {2}plug\/hooks\/hooks\.json:\d+ plugin-hooks /m);
  });
  it("a plugin holding no markdown is found under a package target", () => {
    assert.match(run(path.join(tmp, "plugins")).out, /^ {2}hookonly\/hooks\/hooks\.json:\d+ plugin-hooks .*matcher on Stop/m);
  });
  it("a key that lists its own default folder, or a path inside it, in a list or an object map, shadows nothing", () => {
    const r = run(path.join(tmp, "plugins"));
    assert.doesNotMatch(r.out, /^ {2}(listed|inside|mapped)\/.*plugin-manifest/m);
  });
  it("each file a key leaves out of its default folder is a warning, even beside a listed one", () => {
    const r = run(path.join(tmp, "plugins", "partial"));
    assert.equal(r.code, 0, r.out);
    assert.match(
      r.out,
      /^ {2}\.claude-plugin\/plugin\.json:\d+ plugin-manifest \(warning\) commands replaces the default commands\/, so Claude Code ignores commands\/rollback\.md$/m,
    );
    assert.doesNotMatch(r.out, /ignores commands\/(deploy\.md|\.gitkeep|\.drafts)/);
    assert.match(r.out, /^plugin files: 0 issues, 1 warnings$/m);
  });
  it("a default folder dropped whole fails the run, and one holding only a symlink still holds files", () => {
    const r = run(path.join(tmp, "plugins", "linked"));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /plugin-manifest \(error\) agents replaces the default agents\//);
  });
  it("an empty default folder is not shadowed", () => {
    assert.doesNotMatch(run(path.join(tmp, "plugins", "hollow")).out, /plugin-manifest/);
  });
  it("a file that is not valid JSON is left to the validator", () => {
    const r = run(path.join(tmp, "plugins", "broken"));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^plugin files: none$/m);
  });
  it("a hooks file with no .claude-plugin beside it is not a plugin's", () => {
    assert.doesNotMatch(run(path.join(tmp, "plugins", "unmarked")).out, /plugin-hooks/);
  });
  it("an agents folder with no .claude-plugin beside it is not a plugin's", () => {
    assert.doesNotMatch(run(path.join(tmp, "loose")).out, /agent-frontmatter/);
  });
  it("a YAML file named alone is read by the YAML rules", () => {
    const r = run(path.join(tmp, "yaml-duplicate", "rule.yml"));
    assert.equal(r.code, 1, r.out);
    assert.equal(r.linted, 1, r.out);
    assert.match(r.out, /^ {2}rule\.yml:2 yaml-duplicate-key /m);
  });
  it("a file two targets reach is checked once", () => {
    const r = run([path.join(tmp, "good"), path.join(tmp, "good", "SKILL.md")]);
    assert.equal(r.code, 0, r.out);
    assert.equal(r.linted, 2, r.out);
  });
  it("a path that does not exist fails, naming it", () => {
    const r = run([path.join(tmp, "good"), path.join(tmp, "nope.md")]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /no such file or folder: .*nope\.md/);
  });
  it("a file no reader takes fails, naming it", () => {
    const r = run(path.join(tmp, "notes", "notes.txt"));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /no reader takes .*notes\.txt: nothing was checked/);
  });
  it("a reader's extension inside a longer one is not that reader's", () => {
    fs.writeFileSync(path.join(tmp, "notes", "data.json"), "{}\n");
    const r = run(path.join(tmp, "notes", "data.json"));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /no reader takes .*data\.json: nothing was checked/);
  });
  it("a file target's paths resolve against the working directory", () => {
    const file = path.join("skills", "inner", "workflows", "deep", "only-root.md");
    const inside = run(file, process.env, path.join(tmp, "refs"));
    assert.doesNotMatch(inside.out, /skill-referenced-paths/);
    assert.equal(inside.linted, 1, inside.out);
    const outside = run(path.join(tmp, "refs", file), process.env, tmp);
    assert.match(outside.out, /only-root\.md:\d+ skill-referenced-paths .*top\.md/);
  });
  it("the default target is the working directory", () => {
    const r = run([], process.env, path.join(tmp, "bad"));
    assert.equal(r.code, 1);
    assert.match(r.out, /TRUNCATED/);
  });
});

// Exercised directly because check.js globs under its target and can never hand the function a path outside it.
describe("enclosingSkill", () => {
  it("a sibling whose name extends the target's is outside it", () => {
    assert.equal(enclosingSkill(path.join(tmp, "ab", "x", "SKILL.md"), path.join(tmp, "a")), null);
  });
  it("a skill directly above the file, inside the target, is still found", () => {
    assert.equal(enclosingSkill(path.join(tmp, "ab", "x", "SKILL.md"), tmp), path.join(tmp, "ab"));
  });
  it("the filesystem root is a stop like any other", () => {
    // path.sep appended to "/" is "//", which no resolved path opens with.
    assert.equal(enclosingSkill(path.join(tmp, "ab", "x", "SKILL.md"), "/"), path.join(tmp, "ab"));
  });
});

describe("skill-readme", () => {
  it("reports a SKILL.md with no README.md beside it", () => {
    const r = run(path.join(tmp, "no-readme"));
    assert.equal(r.code, 1);
    assert.match(r.out, /SKILL\.md:\d+ skill-readme .*no README\.md beside this SKILL\.md/);
  });
  it("reports a README that names no way to install the skill", () => {
    const r = run(path.join(tmp, "readme-no-install"));
    assert.equal(r.code, 1);
    assert.match(r.out, /skill-readme .*carries no install form/);
  });
  it("a fenced install command counts, with no install heading", () => {
    const r = run(path.join(tmp, "readme-fenced-install"));
    assert.equal(r.code, 0, r.out);
  });
});

describe("carriesInstallForm", () => {
  // The forms are read from workflows/new.md, which owns the list, so a form added there alone fails here by name.
  const newMd = fs.readFileSync(path.resolve(path.dirname(check), "..", "workflows", "new.md"), "utf8");
  const listed = newMd.split("\n").find((l) => l.startsWith("Give the section a heading opening with")) ?? "";
  const [headingPart = "", commandPart = ""] = listed.split("or put the command in a fenced block");
  const spans = (s) => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const headings = spans(headingPart);
  const commands = spans(commandPart);
  it("reads a heading list and a command list from workflows/new.md", () => assert.ok(headings.length > 0 && commands.length > 0));
  // Each heading is asked for at more than one level and capitalised, because new.md accepts any heading that opens with the word.
  const capitalised = (s) => s[0].toUpperCase() + s.slice(1);
  for (const h of headings) {
    for (const level of ["#", "##", "###"]) {
      it(`heading ${level} ${capitalised(h)}`, () => assert.ok(carriesInstallForm(`# A skill\n\n${level} ${capitalised(h)}\n\ntext\n`)));
    }
  }
  for (const c of commands) it(`command ${c}`, () => assert.ok(carriesInstallForm(`# A skill\n\n\`\`\`bash\n${c} x\n\`\`\`\n`)));
  it("a heading opening with the word counts, without standing bare", () => assert.ok(carriesInstallForm("# A skill\n\n## Installing\n\ntext\n")));
  it("a heading quoted inside a fence is not a heading", () => assert.equal(carriesInstallForm("# A skill\n\n```markdown\n## Install\n```\n"), false));
  it("an install command in prose is not a fenced block", () => assert.equal(carriesInstallForm("# A skill\n\nnpm install -g thing, one day.\n"), false));
  it("a README with neither carries no install form", () => assert.equal(carriesInstallForm("# A skill\n\nWhat it does.\n"), false));
  it("the word install inside a sentence is not a heading", () => assert.equal(carriesInstallForm("# A skill\n\nYou install it somehow.\n"), false));
});

describe("skill-referenced-paths", () => {
  it("reports a span naming a file that was never written, and passes one that resolves", () => {
    const r = run(path.join(tmp, "refs"));
    assert.equal(r.code, 1);
    assert.match(r.out, /SKILL\.md:\d+ skill-referenced-paths .*workflows\/gone\.md does not resolve/);
    assert.doesNotMatch(r.out, /workflows\/new\.md does not resolve/);
  });
  it("reads no fenced content, so a missing path inside a fence passes", () => {
    const r = run(path.join(tmp, "refs"));
    assert.doesNotMatch(r.out, /also-gone\.md/);
  });
  it("each resolution base is reached by a span that reaches no other", () => {
    const r = run(path.join(tmp, "refs"));
    assert.doesNotMatch(r.out, /only-skill\.md:\d+ skill-referenced-paths/);
    assert.doesNotMatch(r.out, /only-own-dir\.md:\d+ skill-referenced-paths/);
    assert.doesNotMatch(r.out, /only-root\.md:\d+ skill-referenced-paths/);
  });
  it("a path quoted as a deliberate example is invisible to the rule", () => {
    const r = run(path.join(tmp, "refs"));
    assert.doesNotMatch(r.out, /deliberately-absent/);
  });
  it("a backticked path opening with a root placeholder is not reported", () => {
    const r = run(path.join(tmp, "refs"));
    assert.doesNotMatch(r.out, /<repo-root>\/\.agents\/gh-solo\.md.*does not resolve/);
  });
  it("a branch name, a repo slug, an absolute path, a ~/ path and a glob are not paths", () => {
    const r = run(path.join(tmp, "refs"));
    for (const span of ["GHI-50_login-form", "gh-stack", "\\/usr\\/bin\\/env", "\\.agents\\/skills", "docs\\/\\*", "E:\\/work"])
      assert.doesNotMatch(r.out, new RegExp(`${span}.*does not resolve`));
  });
});

describe("paths.js", () => {
  it("a span with a trailing slash names a folder", () => assert.equal(looksLikePath("assets/"), true));
  it("only a drive letter at the start makes a span absolute", () => assert.equal(looksLikePath("notes/a:/b.md"), true));
  it("a span's trailing slashes are dropped before it is resolved", () => {
    const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
    assert.equal(resolves("SKILL.md//", path.join(pkg, "SKILL.md"), pkg), true);
  });
  it("a folder whose name extends the root's is outside the root", () => {
    assert.equal(owningSkill(path.join(tmp, "good-too", "SKILL.md"), path.join(tmp, "good")), null);
  });
});
