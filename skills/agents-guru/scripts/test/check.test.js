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
  // A built-in rule that carries no detail.
  mk(path.join(tmp, "detail-less"), block("detail-less"));
  fs.writeFileSync(path.join(tmp, "detail-less", "notes.md"), "# Notes\n\nbody");
  mk(path.join(tmp, "bad"), "name: bad\ndescription: review PR #N and more");
  fs.mkdirSync(path.join(tmp, "empty"));
  // The real .vale.ini is resolved from the script's own directory, so a stub on PATH is what reaches the refused-configuration branch.
  const refuses = path.join(tmp, "refuses-bin");
  fs.mkdirSync(refuses);
  fs.writeFileSync(path.join(refuses, "vale"), '#!/bin/sh\necho "E100 [core] cannot parse config: bad line" >&2\nexit 2\n', { mode: 0o755 });
  // One stub per minor under 3.25, so an off-by-one threshold fails on 3.24.0, and one at 3.25.0, so a threshold one minor too high fails there.
  for (const version of ["3.23.0", "3.24.0", "3.25.0"]) {
    const bin = path.join(tmp, `stub-bin-${version}`);
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "vale"), `#!/bin/sh\nif [ "$1" = --version ]; then echo "vale version ${version}"; else echo "{}"; fi\n`, { mode: 0o755 });
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
  // A README.md that is a folder is no file markdownlint is handed, so the rule's own read is the one that names it.
  mk(path.join(tmp, "readme-folder"), block("readme-folder"), null);
  fs.mkdirSync(path.join(tmp, "readme-folder", "README.md"));
  // A folder the markdown pattern matches by name, holding a file whose finding shows it was still read.
  mk(path.join(tmp, "md-folder"), block("md-folder"));
  fs.mkdirSync(path.join(tmp, "md-folder", "notes.md"));
  fs.writeFileSync(path.join(tmp, "md-folder", "notes.md", "inner.md"), "# Inner\n\nbody");
  mk(path.join(tmp, "dangling-md"), block("dangling-md"));
  fs.symlinkSync("nowhere.md", path.join(tmp, "dangling-md", "gone.md"));
  // A link to itself, which statSync cannot resolve for a reason other than a missing target.
  mk(path.join(tmp, "looped-md"), block("looped-md"));
  fs.symlinkSync("loop.md", path.join(tmp, "looped-md", "loop.md"));
  // A second name extending the first by a character that sorts below a comma, so a sort over "file,code" strings would put it first.
  mk(path.join(tmp, "dangling-order"), block("dangling-order"));
  fs.symlinkSync("nowhere.md", path.join(tmp, "dangling-order", "a.md"));
  fs.symlinkSync("nowhere.md", path.join(tmp, "dangling-order", "a.md (1).md"));
  fs.mkdirSync(path.join(tmp, "dangling-only"));
  fs.symlinkSync("nowhere.md", path.join(tmp, "dangling-only", "gone.md"));

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

  const agent = (file, name) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `---\nname: ${name}\ndescription: Reviews code.\n---\n\nBody.\n`);
  };
  const dupes = path.join(tmp, "dupes", ".claude", "agents");
  agent(path.join(dupes, "same.md"), "same");
  agent(path.join(dupes, "review", "deep.md"), "same");
  agent(path.join(dupes, "alone.md"), "alone");
  const three = path.join(tmp, "three", ".claude", "agents");
  for (const name of ["a", "b", "c"]) agent(path.join(three, `${name}.md`), "same");
  // WHY: nested project folders follow an order the page documents, so the same name in each is no duplicate.
  agent(path.join(tmp, "nested", ".claude", "agents", "same.md"), "same");
  agent(path.join(tmp, "nested", "sub", ".claude", "agents", "same.md"), "same");
  fs.mkdirSync(path.join(tmp, "plugin-dupes", ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "plugin-dupes", ".claude-plugin", "plugin.json"), '{ "name": "plugin-dupes" }\n');
  agent(path.join(tmp, "plugin-dupes", "agents", "same.md"), "same");
  agent(path.join(tmp, "plugin-dupes", "agents", "review", "same.md"), "same");
  // WHY: each sibling holds the name in a way that declares nothing, so a reader taking the text at its word reports the file beside it.
  const decoys = path.join(tmp, "decoys", ".claude", "agents");
  agent(path.join(decoys, "same.md"), "same");
  agent(path.join(decoys, "notes.txt"), "same");
  agent(path.join(decoys, ".archive", "same.md"), "same");
  fs.writeFileSync(path.join(decoys, "late.md"), "\n---\nname: same\n---\n\nBody.\n");
  fs.writeFileSync(path.join(decoys, "unclosed.md"), "---\nname: same\n");
  fs.writeFileSync(path.join(decoys, "body.md"), "# Notes\nname: same\n---\n");
  fs.writeFileSync(path.join(decoys, "unparsed.md"), "---\nname: same\nother: [1, 2\n---\n\nBody.\n");
  fs.writeFileSync(path.join(decoys, "nameless.md"), "---\ndescription: Reviews code.\n---\n\nBody.\n");
  fs.mkdirSync(path.join(decoys, "same-folder.md"));
  const crlf = path.join(tmp, "crlf", ".claude", "agents");
  agent(path.join(crlf, "same.md"), "same");
  fs.writeFileSync(path.join(crlf, "windows.md"), "---\r\nname: same\r\n---\r\n\r\nBody.\r\n");
  const bom = path.join(tmp, "bom", ".claude", "agents");
  agent(path.join(bom, "same.md"), "same");
  fs.writeFileSync(path.join(bom, "marked.md"), "\uFEFF---\nname: same\n---\n\nBody.\n");

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
  // A path naming the default folder itself replaces it with itself, so nothing in it is ignored.
  mkPlugin("self", JSON.stringify({ name: "self", commands: "./commands/" }), { "commands/x.md": "# X\n\nbody\n" });
  // The replaced folder holds one file, a level down, so a walk that stops at the top finds none.
  mkPlugin("deep", JSON.stringify({ name: "deep", commands: "./extra/" }), { "commands/sub/x.md": "# X\n\nbody\n" });
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
  // Two replaced folders holding no file Claude Code could load: one never created, one holding only a dangling link.
  mkPlugin("folderless", JSON.stringify({ name: "folderless", commands: "./extra/" }));
  mkPlugin("dangling", JSON.stringify({ name: "dangling", agents: "./other/" }));
  fs.mkdirSync(path.join(plugins, "dangling", "agents"));
  fs.symlinkSync(path.join("..", "nowhere.md"), path.join(plugins, "dangling", "agents", "gone.md"));
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

  const dbMatcher = JSON.stringify({ hooks: { PreToolUse: [{ matcher: "mcp__db__.*", hooks: [{ type: "command", command: "true" }] }] } }, null, 2);
  const server = { db: { command: "node" } };
  mkPlugin("own-wrapped", JSON.stringify({ name: "own-wrapped" }), { ".mcp.json": JSON.stringify({ mcpServers: server }), "hooks/hooks.json": dbMatcher });
  mkPlugin("own-flat", JSON.stringify({ name: "own-flat" }), { ".mcp.json": JSON.stringify(server), "hooks/hooks.json": dbMatcher });
  mkPlugin("own-inline", JSON.stringify({ name: "own-inline", mcpServers: server }), { "hooks/hooks.json": dbMatcher });
  mkPlugin("own-file", JSON.stringify({ name: "own-file", mcpServers: "./mcp/servers.json" }), {
    "mcp/servers.json": JSON.stringify({ mcpServers: server }),
    "hooks/hooks.json": dbMatcher,
  });
  mkPlugin("own-list", JSON.stringify({ name: "own-list", mcpServers: ["./bundle.mcpb", "https://example.com/s.mcpb", "./mcp/flat.json", 5, null] }), {
    "bundle.mcpb": "not json",
    "mcp/flat.json": JSON.stringify(server),
    "hooks/hooks.json": dbMatcher,
  });
  mkPlugin("own-dotted", JSON.stringify({ name: "own-dotted", mcpServers: { "my.db": { command: "node" } } }), {
    "hooks/hooks.json": JSON.stringify({ hooks: { PreToolUse: [{ matcher: "mcp__my_db__.*", hooks: [{ type: "command", command: "true" }] }] } }),
  });
  mkPlugin("own-other", JSON.stringify({ name: "own-other", mcpServers: { api: { command: "node" } } }), { "hooks/hooks.json": dbMatcher });
  mkPlugin("own-unreadable", JSON.stringify({ name: "own-unreadable", mcpServers: "./gone.json" }), { ".mcp.json": "{", "hooks/hooks.json": dbMatcher });
  const userConfigMonitors = JSON.stringify([{ name: "m", command: `tail \${user_config.path}`, description: "d" }], null, 2);
  mkPlugin("monitor-default", JSON.stringify({ name: "monitor-default" }), { "monitors/monitors.json": userConfigMonitors });
  mkPlugin("monitor-named", JSON.stringify({ name: "monitor-named", experimental: { monitors: "./watch/m.json" } }), { "watch/m.json": userConfigMonitors });
  mkPlugin("monitor-top", JSON.stringify({ name: "monitor-top", monitors: "./watch/m.json" }), { "watch/m.json": userConfigMonitors });
  mkPlugin("monitor-inline", JSON.stringify({ name: "monitor-inline", experimental: { monitors: JSON.parse(userConfigMonitors) } }));
  mkPlugin("monitor-gone", JSON.stringify({ name: "monitor-gone", experimental: { monitors: "./watch/gone.json" } }));
  mkPlugin("monitor-clean", JSON.stringify({ name: "monitor-clean" }), { "monitors/monitors.json": "[]\n" });
  // No manifest at all, so neither reader that opens it has one to read.
  put(path.join(plugins, "manifestless", "README.md"), "# manifestless\n\nbody\n");
  put(path.join(plugins, "manifestless", "hooks", "hooks.json"), dbMatcher);
  fs.mkdirSync(path.join(plugins, "manifestless", ".claude-plugin"));

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
  it("a vale older than 3.25 fails the run, and says so", () => {
    for (const version of ["3.23.0", "3.24.0"]) {
      const r = run(path.join(tmp, "bad"), { ...process.env, PATH: path.join(tmp, `stub-bin-${version}`) });
      assert.equal(r.code, 1, version);
      assert.match(r.out, /2 files checked, \d+ issues, prose rules not run/);
      assert.match(r.out, new RegExp(`vale ${version.replaceAll(".", "\\.")} is older than 3\\.25`));
    }
  });
  it("a vale at 3.25 is not refused for its version", () => {
    const r = run(path.join(tmp, "bad"), { ...process.env, PATH: path.join(tmp, "stub-bin-3.25.0") });
    assert.match(r.out, /2 files checked, \d+ issues/);
    assert.doesNotMatch(r.out, /prose rules not run/);
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
    assert.match(r.out, /^prose rules: not run\n\d+ files checked, /m);
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
    assert.match(r.out, /^ {2}rule\.yml:2 yaml-duplicate-key Map keys must be unique at line 2, column 1:$/m);
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
  it("a folder named like a markdown file is walked into, and its own file is still read", () => {
    const r = run(path.join(tmp, "md-folder"));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /^ {2}notes\.md\/inner\.md:3 MD047\//m);
    assert.equal(r.linted, 3, r.out);
  });
  it("a dangling link is named as an issue, and every other file is still read", () => {
    const r = run(path.join(tmp, "dangling-md"));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /^dangling links: 1\n {2}gone\.md dangling-link cannot be resolved \(ENOENT\), so nothing was read from it$/m);
    assert.match(r.out, /^2 files checked, 1 issues, /m);
  });
  it("a target whose only markdown is a dangling link names it rather than refusing", () => {
    const r = run(path.join(tmp, "dangling-only"));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /^dangling links: 1\n {2}gone\.md dangling-link /m);
    assert.doesNotMatch(r.out, /no markdown file found/);
  });
  it("a link to itself is named as a dangling link, and every other file is still read", () => {
    const r = run(path.join(tmp, "looped-md"));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /^dangling links: 1\n {2}loop\.md dangling-link cannot be resolved \(ELOOP\), so nothing was read from it$/m);
    assert.match(r.out, /^2 files checked, 1 issues, /m);
  });
  it("dangling links print in path order", () => {
    assert.match(run(path.join(tmp, "dangling-order")).out, /^dangling links: 2\n {2}a\.md dangling-link .*\n {2}a\.md \(1\)\.md dangling-link /m);
  });
  it("a plain file the walk cannot stat is never named as a dangling link", () => {
    const dir = path.join(tmp, "locked");
    mk(dir, block("locked"));
    fs.mkdirSync(path.join(dir, "sub"));
    fs.writeFileSync(path.join(dir, "sub", "x.md"), "# X\n\nbody\n");
    // WHY: read without execute lets the walk list the folder while every stat inside it fails with EACCES.
    fs.chmodSync(path.join(dir, "sub"), 0o644);
    try {
      const r = run(dir);
      assert.notEqual(r.code, 0, r.out);
      assert.doesNotMatch(r.out, /dangling-link/);
    } finally {
      fs.chmodSync(path.join(dir, "sub"), 0o755);
    }
  });
  it("a dangling link two targets reach is named once", () => {
    assert.match(run([path.join(tmp, "dangling-md"), path.join(tmp, "dangling-md")]).out, /^dangling links: 1$/m);
  });
  it("a dangling link counts as an issue when Vale did not run", () => {
    const r = run(path.join(tmp, "dangling-md"), { ...process.env, PATH: path.join(tmp, "empty") });
    assert.match(r.out, /^2 files checked, 1 issues, prose rules not run$/m);
  });
  it("a run with no dangling link says so", () => {
    assert.match(run(path.join(tmp, "good")).out, /^dangling links: none$/m);
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
  it("one folder named twice prints from that folder", () => {
    assert.match(run([path.join(tmp, "good"), path.join(tmp, "good")]).out, /^ {2}\.$/m);
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
  describe("two agents declaring one name", () => {
    const duplicate = /agent-frontmatter .*also declared by/;
    it("each file of the pair names the other, across a subfolder", () => {
      const r = run(path.join(tmp, "dupes", ".claude"));
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /^ {2}agents\/same\.md:\d+ agent-frontmatter .*name "same" is also declared by review\/deep\.md/m);
      assert.match(r.out, /^ {2}agents\/review\/deep\.md:\d+ agent-frontmatter .*name "same" is also declared by same\.md/m);
      assert.doesNotMatch(r.out, /agents\/alone\.md:\d+ agent-frontmatter/);
    });
    it("a file target is compared with the tree it sits in, not only with what the run reads", () => {
      const r = run(path.join(tmp, "dupes", ".claude", "agents", "same.md"));
      assert.equal(r.code, 1, r.out);
      assert.equal(r.linted, 1, r.out);
      assert.match(r.out, /also declared by review\/deep\.md/);
    });
    it("a file with a name of its own is clean beside the pair", () => {
      assert.doesNotMatch(run(path.join(tmp, "dupes", ".claude", "agents", "alone.md")).out, duplicate);
    });
    it("every other file declaring the name is listed, in order", () => {
      assert.match(run(path.join(tmp, "three", ".claude", "agents", "b.md")).out, /also declared by a\.md, c\.md:/);
    });
    it("agents in different trees are not duplicates", () => {
      const r = run([path.join(tmp, "nested", ".claude"), path.join(tmp, "nested", "sub", ".claude")]);
      assert.doesNotMatch(r.out, duplicate);
    });
    it("a plugin's agents are not duplicates", () => {
      assert.doesNotMatch(run(path.join(tmp, "plugin-dupes")).out, duplicate);
    });
    it("a file that declares no name is no duplicate, and neither is a file no agent loads from", () => {
      assert.doesNotMatch(run(path.join(tmp, "decoys", ".claude", "agents", "same.md")).out, duplicate);
    });
    it("a sibling with CRLF line endings declares its name", () => {
      assert.match(run(path.join(tmp, "crlf", ".claude", "agents", "same.md")).out, /also declared by windows\.md/);
    });
    it("a sibling the rule cannot read fails the run, naming it, and the rest are still compared", () => {
      const dir = path.join(tmp, "locked-file", ".claude", "agents");
      fs.mkdirSync(dir, { recursive: true });
      for (const name of ["same", "other", "shut"]) fs.writeFileSync(path.join(dir, `${name}.md`), "---\nname: same\n---\n\nBody.\n");
      fs.chmodSync(path.join(dir, "shut.md"), 0o000);
      try {
        const r = run(path.join(dir, "same.md"));
        assert.equal(r.code, 1, r.out);
        assert.equal(r.linted, 1, r.out);
        assert.match(r.out, /also declared by other\.md:/);
        assert.match(r.out, /could not read shut\.md \(EACCES\)/);
      } finally {
        fs.chmodSync(path.join(dir, "shut.md"), 0o644);
      }
    });
    it("a folder the rule cannot list fails the run, naming it, and the rest are still compared", () => {
      const dir = path.join(tmp, "locked-tree", ".claude", "agents");
      fs.mkdirSync(path.join(dir, "shut"), { recursive: true });
      for (const name of ["same", "other"]) fs.writeFileSync(path.join(dir, `${name}.md`), "---\nname: same\n---\n\nBody.\n");
      fs.chmodSync(path.join(dir, "shut"), 0o000);
      try {
        const r = run(path.join(dir, "same.md"));
        assert.equal(r.code, 1, r.out);
        assert.equal(r.linted, 1, r.out);
        assert.match(r.out, /also declared by other\.md:/);
        assert.match(r.out, /could not read shut \(EACCES\)/);
      } finally {
        fs.chmodSync(path.join(dir, "shut"), 0o755);
      }
    });
    it("a link that loops fails the run, naming it, and the rest are still compared", () => {
      const dir = path.join(tmp, "looped", ".claude", "agents");
      fs.mkdirSync(dir, { recursive: true });
      for (const name of ["same", "other"]) fs.writeFileSync(path.join(dir, `${name}.md`), "---\nname: same\n---\n\nBody.\n");
      fs.symlinkSync("loop.md", path.join(dir, "loop.md"));
      const r = run(path.join(dir, "same.md"));
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /also declared by other\.md:/);
      assert.match(r.out, /could not read loop\.md \(ELOOP\)/);
    });
    it("a link to a file declares what the file declares, and a dangling one declares nothing", () => {
      const dir = path.join(tmp, "linked", ".claude", "agents");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "same.md"), "---\nname: same\n---\n\nBody.\n");
      fs.writeFileSync(path.join(tmp, "linked", "elsewhere.md"), "---\nname: same\n---\n\nBody.\n");
      fs.symlinkSync(path.join(tmp, "linked", "elsewhere.md"), path.join(dir, "link.md"));
      fs.symlinkSync("gone.md", path.join(dir, "dangling.md"));
      const r = run(path.join(dir, "same.md"));
      assert.match(r.out, /also declared by link\.md:/);
      assert.doesNotMatch(r.out, /could not read|dangling\.md/);
    });
    it("a link the rule would never compare fails nothing", () => {
      const dir = path.join(tmp, "looped-text", ".claude", "agents");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "same.md"), "---\nname: same\n---\n\nBody.\n");
      fs.symlinkSync("notes.txt", path.join(dir, "notes.txt"));
      const r = run(path.join(dir, "same.md"));
      assert.equal(r.code, 0, r.out);
      assert.doesNotMatch(r.out, /could not read/);
    });
    it("a sibling whose frontmatter the parser throws on declares nothing, and was read", () => {
      const dir = path.join(tmp, "merge-key", ".claude", "agents");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "same.md"), "---\nname: same\n---\n\nBody.\n");
      fs.writeFileSync(path.join(dir, "bad.md"), "---\nname: same\n<<: 1\n---\n\nBody.\n");
      const r = run(path.join(dir, "same.md"));
      assert.equal(r.code, 0, r.out);
      assert.doesNotMatch(r.out, /could not read|also declared by/);
    });
    it("a sibling whose name has no string form declares nothing, and was read", () => {
      const dir = path.join(tmp, "stringless", ".claude", "agents");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "same.md"), "---\nname: same\n---\n\nBody.\n");
      fs.writeFileSync(path.join(dir, "obj.md"), "---\nname: {toString: 1}\n---\n\nBody.\n");
      const r = run(path.join(dir, "same.md"));
      assert.equal(r.code, 0, r.out);
      assert.doesNotMatch(r.out, /could not read|also declared by/);
    });
    it("the agents folder itself, when it cannot be listed, is named", () => {
      const dir = path.join(tmp, "unlistable", ".claude", "agents");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "same.md"), "---\nname: same\n---\n\nBody.\n");
      fs.chmodSync(dir, 0o311);
      try {
        const r = run(path.join(dir, "same.md"));
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /could not read \. \(EACCES\)/);
      } finally {
        fs.chmodSync(dir, 0o755);
      }
    });
    it("a sibling opening with a BOM declares its name", () => {
      assert.match(run(path.join(tmp, "bom", ".claude", "agents", "same.md")).out, /also declared by marked\.md:/);
    });
    it("a judged file opening with a BOM is compared like any other", () => {
      assert.match(run(path.join(tmp, "bom", ".claude", "agents", "marked.md")).out, /also declared by same\.md:/);
    });
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
  it("a commands map's sources are the paths it loads", () => {
    assert.doesNotMatch(run(path.join(tmp, "plugins", "mapped")).out, /plugin-manifest/);
  });
  it("a replaced folder's nested files are what Claude Code ignores", () => {
    assert.match(run(path.join(tmp, "plugins", "deep")).out, /plugin-manifest \(error\) commands replaces the default commands\//);
  });
  it("a commands path naming the default folder loads everything in it", () => {
    assert.doesNotMatch(run(path.join(tmp, "plugins", "self")).out, /plugin-manifest/);
  });
  it("a replaced folder that does not exist holds nothing Claude Code ignores", () => {
    assert.doesNotMatch(run(path.join(tmp, "plugins", "folderless")).out, /plugin-manifest/);
  });
  it("a dangling link in a replaced folder is no file", () => {
    const r = run(path.join(tmp, "plugins", "dangling"));
    assert.doesNotMatch(r.out, /plugin-manifest|TypeError/);
    assert.match(r.out, /^ {2}agents\/gone\.md dangling-link /m);
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
  for (const name of ["own-wrapped", "own-flat", "own-inline", "own-file", "own-list"]) {
    it(`${name}: the hooks file is held to the plugin's own server names`, () => {
      const r = run(path.join(tmp, "plugins", name));
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /^ {2}hooks\/hooks\.json:\d+ plugin-hooks \(error\) matcher names the plugin's own MCP server db by its bare key/m);
    });
  }
  it("a server key is matched in the form its tool names take", () => {
    assert.match(run(path.join(tmp, "plugins", "own-dotted")).out, /plugin-hooks \(error\) matcher names the plugin's own MCP server my_db/);
  });
  it("a server the plugin does not declare is no bare key of its own", () => {
    assert.doesNotMatch(run(path.join(tmp, "plugins", "own-other")).out, /plugin-hooks/);
  });
  it("an MCP file that cannot be read declares nothing", () => {
    assert.doesNotMatch(run(path.join(tmp, "plugins", "own-unreadable")).out, /plugin-hooks|TypeError/);
  });
  it("a plugin with no manifest declares no server and reads the default monitors path", () => {
    const r = run(path.join(tmp, "plugins", "manifestless"));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^plugin files: none$/m);
  });
  it("a monitors file is reported under its own path", () => {
    const r = run(path.join(tmp, "plugins", "monitor-default"));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /^ {2}monitors\/monitors\.json:\d+ plugin-manifest \(error\) monitor command names \$\{user_config/m);
  });
  it("a monitors file the manifest names is read in place of the default", () => {
    assert.match(run(path.join(tmp, "plugins", "monitor-named")).out, /^ {2}watch\/m\.json:\d+ plugin-manifest \(error\) monitor command/m);
  });
  it("a monitors file the top-level key names is read", () => {
    assert.match(run(path.join(tmp, "plugins", "monitor-top")).out, /^ {2}watch\/m\.json:\d+ plugin-manifest \(error\) monitor command/m);
  });
  it("inline monitors are reported in the manifest", () => {
    assert.match(run(path.join(tmp, "plugins", "monitor-inline")).out, /^ {2}\.claude-plugin\/plugin\.json:\d+ plugin-manifest \(error\) monitor command/m);
  });
  it("a named monitors file that does not exist is left to the validator", () => {
    const r = run(path.join(tmp, "plugins", "monitor-gone"));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^plugin files: none$/m);
  });
  it("a monitors file read is a file checked", () => {
    const r = run(path.join(tmp, "plugins", "monitor-clean"));
    assert.equal(r.code, 0, r.out);
    assert.equal(r.linted, 3, r.out);
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
  it("a finding with no detail prints none", () => {
    assert.match(run(path.join(tmp, "detail-less")).out, /^ {2}notes\.md:3 MD047\/single-trailing-newline Files should end with a single newline character$/m);
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
  it("a skipped hard wrap is withheld, named and counted", () => {
    const r = run(["--skip", "skill-hard-wrap", path.join(tmp, "wrapped")]);
    assert.equal(r.code, 0, r.out);
    assert.doesNotMatch(r.out, /SKILL\.md:\d+ skill-hard-wrap/);
    assert.match(r.out, /^prose shape: none$/m);
    assert.match(r.out, /^skipped rules: 1\n {2}skill-hard-wrap: 1 findings withheld\n2 files checked, 0 issues, 0 warnings, 1 rule\(s\) skipped\n$/m);
  });
  it("a skipped YAML comment wrap is withheld, named and counted", () => {
    const r = run(["--skip", "yaml-comment-wrap", path.join(tmp, "yaml-wrapped")]);
    assert.equal(r.code, 0, r.out);
    assert.doesNotMatch(r.out, /rule\.yml:\d+ yaml-comment-wrap/);
    assert.match(r.out, /^yaml files: none$/m);
    assert.match(r.out, /^ {2}yaml-comment-wrap: 1 findings withheld$/m);
    assert.match(r.out, /^3 files checked, 0 issues, 0 warnings, 1 rule\(s\) skipped$/m);
  });
  it("--skip repeats, and a rule named twice is skipped once", () => {
    const targets = [path.join(tmp, "wrapped"), path.join(tmp, "yaml-wrapped")];
    const both = run(["--skip", "yaml-comment-wrap", "--skip", "skill-hard-wrap", ...targets]);
    assert.equal(both.code, 0, both.out);
    assert.match(both.out, /^skipped rules: 2\n {2}skill-hard-wrap: 1 findings withheld\n {2}yaml-comment-wrap: 1 findings withheld$/m);
    assert.match(both.out, /, 0 warnings, 2 rule\(s\) skipped$/m);
    const twice = run(["--skip", "skill-hard-wrap", "--skip", "skill-hard-wrap", ...targets]);
    assert.match(twice.out, /^skipped rules: 1$/m);
    assert.match(twice.out, /, 0 issues, 1 warnings, 1 rule\(s\) skipped$/m);
  });
  it("skipping a convention rule leaves a contract issue failing the run", () => {
    const r = run(["--skip", "skill-hard-wrap", path.join(tmp, "bad")]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /TRUNCATED/);
    assert.match(r.out, /^ {2}skill-hard-wrap: 0 findings withheld$/m);
  });
  it("--skip with no path checks the working directory", () => {
    const r = run(["--skip", "skill-hard-wrap"], process.env, path.join(tmp, "wrapped"));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^ {2}skill-hard-wrap: 1 findings withheld$/m);
  });
  it("without vale the skipped rules are still named and counted", () => {
    const r = run(["--skip", "skill-hard-wrap", path.join(tmp, "wrapped")], { ...process.env, PATH: path.join(tmp, "empty") });
    assert.equal(r.code, 1);
    assert.match(r.out, /^ {2}skill-hard-wrap: 1 findings withheld$/m);
    assert.match(r.out, /^2 files checked, 0 issues, prose rules not run, 1 rule\(s\) skipped$/m);
  });
  it("a --skip naming a contract rule, no rule, or nothing refuses the run and names the skippable rules", () => {
    const good = path.join(tmp, "good");
    // A bare --skip runs from the fixture, since any path after it would be read as the rule's name.
    for (const [args, named] of [
      [["--skip", "skill-name", good], "--skip skill-name"],
      [["--skip", "no-such-rule", good], "--skip no-such-rule"],
      [["--skip"], "--skip names no rule"],
    ]) {
      const r = run(args, process.env, good);
      assert.equal(r.code, 1, named);
      assert.ok(r.out.startsWith(`${named}: only skill-hard-wrap, yaml-comment-wrap can be skipped: nothing was checked\n`), r.out);
      assert.doesNotMatch(r.out, /found under/, named);
    }
  });
});

describe("skill-bundled-files", () => {
  // WHY: each fixture states every file it holds, so a test reads as the tree it judges.
  const tree = (name, files) => {
    const dir = path.join(tmp, "bundled", name);
    mk(dir, block(name));
    for (const [file, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), text);
    }
    return dir;
  };
  const reports = (out, file) => new RegExp(`skill-bundled-files .*${file}\\S* is named by no file`).test(out);

  it("a file nothing names fails the run, under scripts and under references", () => {
    const r = run(tree("unnamed", { "scripts/lost.py": "x\n", "references/lost.md": "# Lost\n\nbody\n" }));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /^ {2}SKILL\.md:\d+ skill-bundled-files .*scripts\/lost\.py is named by no file/m);
    assert.match(r.out, /^ {2}SKILL\.md:\d+ skill-bundled-files .*references\/lost\.md is named by no file/m);
  });
  it("a file named in the SKILL.md is clean", () => {
    const dir = tree("named", { "scripts/kept.py": "x\n" });
    fs.appendFileSync(path.join(dir, "SKILL.md"), "\nRun `scripts/kept.py` first.\n");
    assert.equal(reports(run(dir).out, "kept"), false);
  });
  it("any other file of the skill can name it, by its bare name", () => {
    const r = run(tree("sibling", { "scripts/main.sh": "./helper.sh\n", "scripts/helper.sh": "x\n", "workflows/a.md": "# A\n\nRun `scripts/main.sh`.\n" }));
    assert.equal(reports(r.out, "helper"), false, r.out);
    assert.equal(reports(r.out, "main"), false, r.out);
  });
  it("a path to another file with the same name is not the name", () => {
    const dir = tree("same-name", { "references/review.md": "# R\n\nbody\n", "workflows/review.md": "# W\n\nbody\n" });
    fs.appendFileSync(path.join(dir, "SKILL.md"), "\nRead workflows/review.md.\n");
    const r = run(dir);
    assert.equal(reports(r.out, "references\\/review\\.md"), true, r.out);
  });
  // WHY: a skill reaches its own file in each of these spellings, and none of them points elsewhere.
  for (const [id, text] of [
    ["own-path", "Read references/kept.md."],
    ["own-path-relative", "Read ../references/kept.md."],
    ["own-path-placeholder", "Read <skill-dir>/references/kept.md."],
    ["variable", "Read $DIR/kept.md."],
    ["braced-variable", `Read \${DIR}/kept.md.`],
    ["substitution", 'Read "$(dirname "$0")/kept.md".'],
    ["quoted-variable", 'Read "$DIR"/kept.md.'],
    ["quoted-braced-variable", `Read "\${DIR}"/references/kept.md.`],
    ["quoted-substitution", 'Read "$(dirname "$0")"/references/kept.md.'],
    ["placeholder-then-placeholder", "Read <plugin-dir>/skills/<name>/references/kept.md."],
    ["placeholder-then-file", "Read <skill-dir>/<topic>/kept.md."],
    ["variable-then-placeholder", "Read $DIR/<x>/references/kept.md."],
    ["default-value", `Read \${DIR:-.}/references/kept.md.`],
    ["glob-folder", "Read skills/*/references/kept.md."],
    ["glob-any-depth", "Read **/kept.md."],
    ["backtick-substitution", 'Run `` `dirname "$0"`/references/kept.md ``.'],
    ["template-expression", `Read \${{ github.workspace }}/references/kept.md.`],
    ["windows-variable", "Read %DIR%/references/kept.md."],
    ["two-variables", "Read $A/$B/kept.md."],
    ["own-path-after-variable", "Read $DIR/references/kept.md."],
    ["unknown-working-directory", "Run `cd references && ./kept.md`."],
    ["up-from-unknown-working-directory", "Run `cd scripts && ../references/kept.md`."],
    ["bare", "Read kept.md."],
  ]) {
    it(`a file is named by ${id}`, () => {
      const dir = tree(id, { "references/kept.md": "# K\n\nbody\n", "scripts/a.sh": "x\n" });
      fs.appendFileSync(path.join(dir, "SKILL.md"), `\n${text}\n`);
      assert.equal(reports(run(dir).out, "kept"), false);
    });
  }
  it("an extensionless file is not named by the word alone", () => {
    const dir = tree("word", { "scripts/deploy": "x\n" });
    fs.appendFileSync(path.join(dir, "SKILL.md"), "\nUse this to deploy the thing.\n");
    assert.equal(reports(run(dir).out, "scripts\\/deploy"), true);
  });
  it("an extensionless file is named by its own path", () => {
    const dir = tree("word-path", { "scripts/deploy": "x\n" });
    fs.appendFileSync(path.join(dir, "SKILL.md"), "\nRun `scripts/deploy` first.\n");
    assert.equal(reports(run(dir).out, "scripts\\/deploy"), false);
  });
  it("an extensionless file is named by a sibling's dot slash", () => {
    const dir = tree("word-sibling", { "scripts/deploy": "x\n", "scripts/run.sh": "./deploy\n" });
    fs.appendFileSync(path.join(dir, "SKILL.md"), "\nRun `scripts/run.sh` first.\n");
    assert.equal(reports(run(dir).out, "scripts\\/deploy"), false);
  });
  // WHY: each of these points at a file of the same name somewhere other than this one.
  for (const [id, file, text] of [
    ["another-skill", "SKILL.md", "\nRead ../other-skill/references/review.md.\n"],
    ["longer-path", "SKILL.md", "\nRead skills/foo/references/review.md.\n"],
    ["own-folder-dot-slash", "workflows/a.md", "./review.md\n"],
    ["up-to-nothing", "references/a.md", "\nSee ../review.md.\n"],
    ["home", "SKILL.md", "\nRead ~/review.md.\n"],
    ["filesystem-root", "SKILL.md", "\nRead /review.md.\n"],
    ["quoted-filesystem-root", "SKILL.md", '\nRead "/review.md".\n'],
    ["url", "SKILL.md", "\nRead https://example.com/review.md.\n"],
    ["variable-then-another-folder", "SKILL.md", "\nRead $DIR/workflows/review.md.\n"],
  ]) {
    it(`a path elsewhere does not name it: ${id}`, () => {
      const dir = tree(`elsewhere-${id}`, {
        "references/review.md": "# R\n\nbody\n",
        "workflows/a.md": "# A\n\nbody\n",
        "workflows/review.md": "# W\n\nbody\n",
      });
      fs.appendFileSync(path.join(dir, file), text);
      assert.equal(reports(run(dir).out, "references\\/review\\.md"), true);
    });
  }
  // WHY: a root says nothing about the writer's folder, so a sibling of the same name does not settle what it means.
  for (const [id, text] of [
    ["placeholders", "<skill-dir>/<topic>/review.md"],
    ["variable", "$DIR/review.md"],
    ["quoted-substitution", '"$(dirname "$0")"/review.md'],
  ]) {
    it(`a rooted path is not settled on the writer's sibling: ${id}`, () => {
      const dir = tree(`rooted-${id}`, {
        "references/review.md": "# R\n\nbody\n",
        "workflows/review.md": "# W\n\nbody\n",
        "workflows/a.md": `# A\n\nRead ${text}.\n`,
      });
      assert.equal(reports(run(dir).out, "references\\/review\\.md"), false);
    });
  }
  it("a path up from a file reaches the file it lands on, and not one of the same name", () => {
    const dir = tree("up-to-root", {
      "references/review.md": "# R\n\nbody\n",
      "references/a.md": "# A\n\nSee ../review.md.\n",
      "review.md": "# Root\n\nbody\n",
    });
    assert.equal(reports(run(dir).out, "references\\/review\\.md"), true);
    const up = tree("up-a-level", { "references/kept.md": "# K\n\nbody\n", "references/sub/a.md": "# A\n\nSee ../kept.md.\n" });
    assert.equal(reports(run(up).out, "references\\/kept"), false);
  });
  it("a dot slash that lands on no file may mean another working directory", () => {
    const dir = tree("working-directory", { "scripts/deploy.sh": "x\n" });
    fs.appendFileSync(path.join(dir, "SKILL.md"), "\n```bash\ncd scripts && ./deploy.sh\n```\n");
    assert.equal(reports(run(dir).out, "scripts\\/deploy"), false);
    const extensionless = tree("working-directory-word", { "scripts/deploy": "x\n" });
    fs.appendFileSync(path.join(extensionless, "SKILL.md"), "\n```bash\ncd scripts && ./deploy\n```\n");
    assert.equal(reports(run(extensionless).out, "scripts\\/deploy"), false);
  });
  it("a dot slash names a file of the same folder", () => {
    const dir = tree("own-folder", { "references/kept.md": "# K\n\nbody\n", "references/a.md": "# A\n\nSee ./kept.md.\n" });
    fs.appendFileSync(path.join(dir, "SKILL.md"), "\nRead references/a.md.\n");
    assert.equal(reports(run(dir).out, "references\\/kept"), false);
  });
  for (const [id, line] of [
    ["plain", "import helper"],
    ["list", "import os, helper"],
    ["aliased", "import helper as h"],
    ["from", "from helper import run"],
    ["from-package", "from scripts.helper import run"],
    ["from-dot", "from . import helper"],
    ["from-relative", "from .helper import run"],
    ["from-relative-up", "from ..helper import run"],
    ["from-own-folder", "from scripts import helper"],
    ["import-own-folder", "import scripts.helper"],
    ["from-dot-list", "from . import os, helper as h"],
    ["from-dot-lines", "from . import (\n    other,\n    helper,\n)"],
    ["from-dot-comment", "from . import (\n    other,  # first\n    helper,\n)"],
    ["backslash", "import os, \\\n    helper"],
    ["from-backslash", "from . import other, \\\n    helper"],
    ["from-longer-package", "from pkg.scripts import helper"],
    ["import-longer-package", "import pkg.scripts.helper"],
    ["from-relative-folder", "from ..scripts import (helper)"],
    ["from-package-module", "from pkg.scripts.helper import run"],
    ["indented", "try:\n    import helper\nexcept ImportError:\n    pass"],
    ["same-line-block", "try: import helper\nexcept ImportError: pass"],
    ["after-semicolon", "import os; import helper"],
  ]) {
    it(`a Python file is named by an import: ${id}`, () => {
      const r = run(tree(`py-${id}`, { "scripts/main.py": `${line}\n`, "scripts/helper.py": "x\n", "notes.md": "# N\n\nRun main.py.\n" }));
      assert.equal(reports(r.out, "scripts\\/helper"), false, r.out);
    });
  }
  for (const [id, line] of [
    ["longer", "import helper_two"],
    ["attribute", "from os import helper"],
    ["dotted", "import os.helper"],
    ["alias", "import json as helper"],
    ["imported-from-longer", "from helper_two import helper"],
    ["comment", "# import helper"],
    ["from-another-package", "from email.helper import formatdate"],
    ["from-a-module-of-another-package", "from os.helper import join"],
    ["import-another-package", "import email.helper"],
    ["module-beneath-it", "import helper.sub"],
  ]) {
    it(`a Python line does not name it: ${id}`, () => {
      const r = run(tree(`py-not-${id}`, { "scripts/main.py": `${line}\n`, "scripts/helper.py": "x\n", "notes.md": "# N\n\nRun main.py.\n" }));
      assert.equal(reports(r.out, "scripts\\/helper"), true, r.out);
    });
  }
  it("only a Python file imports, and only a Python file is imported", () => {
    const r = run(
      tree("py-prose", {
        "scripts/tool.sh": "x\n",
        "scripts/caller.py": "import tool\n",
        "scripts/helper.py": "x\n",
        "notes.md": "# N\n\nimport helper\n\nRun caller.py.\n",
      }),
    );
    assert.equal(reports(r.out, "scripts\\/tool"), true, r.out);
    assert.equal(reports(r.out, "scripts\\/helper"), true, r.out);
  });
  it("a file does not name itself", () => {
    assert.equal(reports(run(tree("self", { "references/self.md": "# Self\n\nThis is self.md.\n" })).out, "references\\/self\\.md"), true);
  });
  it("a longer name holding the name is not the name", () => {
    const dir = tree("longer", {
      "references/setup.md": "# Setup\n\nbody\n",
      "references/other-setup.md": "# Other\n\nbody\n",
      "references/a-b.md": "# A\n\nSee other-setup.md and setup.md.bak and x.setup.md and setup.md-old.\n",
    });
    fs.appendFileSync(path.join(dir, "SKILL.md"), "\nRead `references/a-b.md`.\n");
    assert.equal(reports(run(dir).out, "references\\/setup\\.md"), true);
  });
  it("a name closing a sentence is the name", () => {
    const dir = tree("sentence", { "references/setup.md": "# Setup\n\nbody\n" });
    fs.appendFileSync(path.join(dir, "SKILL.md"), "\nRead references/setup.md.\n");
    assert.equal(reports(run(dir).out, "setup"), false);
  });
  it("a name's regex characters are taken as written", () => {
    const dir = tree("literal", { "scripts/a+b.py": "x\n" });
    fs.appendFileSync(path.join(dir, "SKILL.md"), "\nRun aab.py and axb.py.\n");
    assert.equal(reports(run(dir).out, "a\\+b"), true);
    fs.appendFileSync(path.join(dir, "SKILL.md"), "\nRun a+b.py.\n");
    assert.equal(reports(run(dir).out, "a\\+b"), false);
  });
  it("a dot-named file, a file in a subfolder and a file elsewhere are not bundled", () => {
    const r = run(
      tree("exempt", {
        "scripts/.gitignore": "x\n",
        "scripts/test/deep.js": "x\n",
        "references/more/deep.md": "# D\n\nbody\n",
        "assets/free.txt": "x\n",
        "free.md": "# F\n\nbody\n",
      }),
    );
    assert.doesNotMatch(r.out, /skill-bundled-files/);
  });
  it("what names a file in node_modules or a dot-folder does not count", () => {
    const r = run(
      tree("skips", { "scripts/lost.py": "x\n", "node_modules/dep/a.md": "lost.py\n", ".cache/a.md": "lost.py\n", "scripts/.hidden": "lost.py\n" }),
    );
    assert.equal(reports(r.out, "lost"), true, r.out);
  });
  it("a linked file is bundled, and a linked folder is followed", () => {
    const dir = tree("links", { "shared/real.md": "# R\n\nbody\n" });
    fs.mkdirSync(path.join(dir, "scripts"));
    fs.symlinkSync(path.join(dir, "shared", "real.md"), path.join(dir, "scripts", "linked.sh"));
    fs.symlinkSync(path.join(dir, "shared"), path.join(dir, "references"));
    const r = run(dir);
    assert.equal(reports(r.out, "scripts\\/linked\\.sh"), true, r.out);
    assert.equal(reports(r.out, "references\\/real\\.md"), true, r.out);
  });
  // WHY: directory order decides which path is walked first, so each order is built, with the real folder's name sorting first in one and last in the other.
  for (const [name, real] of [
    ["link-first", "a-shared"],
    ["link-last", "z-shared"],
  ]) {
    it(`a linked folder is read beside the folder it points at, as ${name}`, () => {
      const dir = tree(name, { [`${real}/real.md`]: "# R\n\nbody\n" });
      fs.symlinkSync(path.join(dir, real), path.join(dir, "references"));
      assert.equal(reports(run(dir).out, "references\\/real\\.md"), true);
    });
  }
  it("a link to a file is that file, so its own text does not name it", () => {
    const dir = tree("alias", { "shared/self.sh": "# self.sh\n" });
    fs.mkdirSync(path.join(dir, "scripts"));
    fs.symlinkSync(path.join(dir, "shared", "self.sh"), path.join(dir, "scripts", "self.sh"));
    assert.equal(reports(run(dir).out, "scripts\\/self\\.sh"), true);
  });
  it("two links back up the tree end, since each would otherwise double the walk", () => {
    const dir = tree("cycles", { "scripts/kept.py": "x\n" });
    fs.appendFileSync(path.join(dir, "SKILL.md"), "\nRun scripts/kept.py.\n");
    fs.symlinkSync(dir, path.join(dir, "up-one"));
    fs.symlinkSync(dir, path.join(dir, "up-two"));
    assert.doesNotMatch(run(dir).out, /skill-bundled-files/);
  });
  it("a link back up the tree ends, and costs no finding", () => {
    const dir = tree("cycle", { "scripts/kept.py": "x\n" });
    fs.appendFileSync(path.join(dir, "SKILL.md"), "\nRun scripts/kept.py.\n");
    fs.symlinkSync(dir, path.join(dir, "up"));
    assert.doesNotMatch(run(dir).out, /skill-bundled-files/);
  });
  it("a link to itself is left to the group that names it", () => {
    const dir = tree("self-link", {});
    fs.mkdirSync(path.join(dir, "scripts"));
    fs.symlinkSync(path.join(dir, "scripts", "loop.sh"), path.join(dir, "scripts", "loop.sh"));
    assert.doesNotMatch(run(dir).out, /skill-bundled-files/);
  });
  it("a dangling link is left to the group that names it", () => {
    const dir = tree("dangling", {});
    fs.mkdirSync(path.join(dir, "scripts"));
    fs.symlinkSync(path.join(dir, "gone.md"), path.join(dir, "scripts", "gone.md"));
    const r = run(dir);
    assert.doesNotMatch(r.out, /skill-bundled-files/);
    assert.match(r.out, /scripts\/gone\.md dangling-link/);
  });
  it("a file it cannot read is named, and costs the comparison that file alone", () => {
    const dir = tree("shut-file", { "scripts/shut.py": "x\n", "scripts/kept.py": "x\n", "notes.md": "# N\n\nRun kept.py.\n" });
    fs.chmodSync(path.join(dir, "scripts", "shut.py"), 0o000);
    try {
      const r = run(dir);
      assert.match(r.out, /^ {2}SKILL\.md:\d+ skill-bundled-files .*could not read scripts\/shut\.py \(EACCES\)/m);
      assert.equal(reports(r.out, "kept"), false, r.out);
    } finally {
      fs.chmodSync(path.join(dir, "scripts", "shut.py"), 0o644);
    }
  });
  it("a folder it cannot read is named", () => {
    const dir = tree("shut-folder", { "shut/inner.txt": "x\n" });
    fs.chmodSync(path.join(dir, "shut"), 0o000);
    try {
      assert.match(run(dir).out, /skill-bundled-files .*could not read shut \(EACCES\)/);
    } finally {
      fs.chmodSync(path.join(dir, "shut"), 0o755);
    }
  });
  it("only a SKILL.md starts the read", () => {
    const dir = path.join(tmp, "bundled", "no-skill");
    fs.mkdirSync(path.join(dir, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(dir, "notes.md"), "# N\n\nbody\n");
    fs.writeFileSync(path.join(dir, "scripts", "lost.py"), "x\n");
    assert.doesNotMatch(run(dir).out, /skill-bundled-files/);
  });
});

describe("skill-package-runners, off a tree", () => {
  const dir = () => path.join(tmp, "runners");
  beforeAll(() => {
    mk(dir(), block("runners"), "# Runners\n\n## Install\n\n```bash\nnpx skills add owner/repo\n```\n");
    fs.mkdirSync(path.join(dir(), "workflows"));
    fs.writeFileSync(path.join(dir(), "workflows", "run.md"), "# Run\n\nRun `npx eslint .` first.\n");
  });
  it("a workflow of the skill is read, and a warning leaves the run passing", () => {
    const r = run(dir());
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^ {2}workflows\/run\.md:3 skill-package-runners \(warning\) .*npx eslint \. names no version/m);
  });
  it("a README is for a person, so its install line raises nothing", () => {
    assert.doesNotMatch(run(dir()).out, /README\.md:\d+ skill-package-runners/);
  });
  it("a markdown file outside any skill is not read", () => {
    const outside = path.join(tmp, "runners-outside");
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "notes.md"), "# Notes\n\nRun `npx eslint .` first.\n");
    assert.doesNotMatch(run(outside).out, /skill-package-runners/);
  });
  it("a file target resolves against the folder the command runs in", () => {
    assert.match(run(path.join(dir(), "workflows", "run.md"), process.env, dir()).out, /skill-package-runners/);
    assert.doesNotMatch(run(path.join(dir(), "workflows", "run.md"), process.env, path.join(dir(), "workflows")).out, /skill-package-runners/);
  });
});

describe("plugin-body-variables", () => {
  const plugin = () => path.join(tmp, "body-vars", "plugin");
  const skillBody = (dir, body) => {
    mk(dir, block(path.basename(dir)));
    fs.writeFileSync(path.join(dir, "SKILL.md"), `---\n${block(path.basename(dir))}\n---\n\n${body}\n`);
  };
  beforeAll(() => {
    fs.mkdirSync(path.join(plugin(), ".claude-plugin"), { recursive: true });
    fs.writeFileSync(path.join(plugin(), ".claude-plugin", "plugin.json"), '{"name":"plugin"}\n');
    skillBody(
      path.join(plugin(), "skills", "bare"),
      "Run `$CLAUDE_PLUGIN_ROOT/scripts/a.sh`.\n\nKeep state in $CLAUDE_PLUGIN_DATA.\n\n```bash\ncd $CLAUDE_PROJECT_DIR\n```",
    );
    skillBody(
      path.join(plugin(), "skills", "braced"),
      `Run \`"\${CLAUDE_PLUGIN_ROOT}/scripts/a.sh"\`, \${CLAUDE_PLUGIN_DATA} and \${CLAUDE_PROJECT_DIR}.\n\nAnd $CLAUDE_PLUGIN_ROOTS too.`,
    );
    fs.mkdirSync(path.join(plugin(), "agents"));
    fs.writeFileSync(path.join(plugin(), "agents", "bare.md"), "---\nname: bare\ndescription: x\n---\n\nRun $CLAUDE_PLUGIN_ROOT/a.sh.\n");
    fs.writeFileSync(path.join(plugin(), "agents", "braced.md"), `---\nname: braced\ndescription: x\n---\n\nRun \${CLAUDE_PLUGIN_ROOT}/a.sh.\n`);
    fs.writeFileSync(path.join(plugin(), "skills", "bare", "notes.md"), "# Notes\n\nA hook reads $CLAUDE_PROJECT_DIR.\n");
  });
  it("each bare variable in a plugin's skill fails the run on its own line, and names the braced form", () => {
    const r = run(plugin());
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /^ {2}skills\/bare\/SKILL\.md:\d+ plugin-body-variables .*\$CLAUDE_PLUGIN_ROOT .*write \$\{CLAUDE_PLUGIN_ROOT\}/m);
    assert.match(r.out, /^ {2}skills\/bare\/SKILL\.md:\d+ plugin-body-variables .*\$CLAUDE_PLUGIN_DATA .*write \$\{CLAUDE_PLUGIN_DATA\}/m);
    assert.match(r.out, /^ {2}skills\/bare\/SKILL\.md:\d+ plugin-body-variables .*\$CLAUDE_PROJECT_DIR .*write \$\{CLAUDE_PROJECT_DIR\}/m);
  });
  it("a plugin's agent is read", () => {
    assert.match(run(plugin()).out, /^ {2}agents\/bare\.md:\d+ plugin-body-variables .*\$CLAUDE_PLUGIN_ROOT/m);
  });
  it("the braced form and a longer name are clean", () => {
    const r = run(plugin());
    assert.doesNotMatch(r.out, /skills\/braced\/SKILL\.md:\d+ plugin-body-variables/);
    assert.doesNotMatch(r.out, /agents\/braced\.md:\d+ plugin-body-variables/);
  });
  it("a file the plugin never loads as content is not read", () => {
    assert.doesNotMatch(run(plugin()).out, /notes\.md:\d+ plugin-body-variables/);
  });
  it("a skill outside any plugin is not held to it", () => {
    const dir = path.join(tmp, "body-vars", "standalone");
    skillBody(dir, "Read $CLAUDE_PROJECT_DIR here.");
    assert.doesNotMatch(run(dir).out, /plugin-body-variables/);
  });
  it("a marketplace's root is not a plugin, so a skill beside it is not held to it", () => {
    const root = path.join(tmp, "body-vars", "market");
    fs.mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
    fs.writeFileSync(path.join(root, ".claude-plugin", "marketplace.json"), "{}\n");
    skillBody(path.join(root, "skills", "free"), "Read $CLAUDE_PROJECT_DIR here.");
    assert.doesNotMatch(run(root).out, /plugin-body-variables/);
  });
  it("the frontmatter is not the body", () => {
    const dir = path.join(plugin(), "skills", "in-fm");
    mk(dir, "name: in-fm\ndescription: |\n  Reads $CLAUDE_PROJECT_DIR.");
    assert.doesNotMatch(run(dir).out, /plugin-body-variables/);
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
  it("reports a README.md that is a folder as unreadable, and the run still finishes", () => {
    const r = run(path.join(tmp, "readme-folder"));
    assert.equal(r.code, 1, r.out);
    const findings = r.out.match(/skill-readme .*/g) ?? [];
    assert.equal(findings.length, 1, r.out);
    assert.match(findings[0], /README\.md cannot be read \(EISDIR\): .*readme-folder\/README\.md\]$/);
    assert.match(r.out, /^\d+ files checked, /m);
  });
  it("a fenced install command counts, with no install heading", () => {
    const r = run(path.join(tmp, "readme-fenced-install"));
    assert.equal(r.code, 0, r.out);
  });
});

describe("skill-pinned-sources", () => {
  const SHA = "36c6801f79a12fb1c639696d4095182a322362f2";
  const INSTALL = "# A skill\n\n## Install\n\n```bash\nskills add owner/repo\n```\n";
  const mkSkill = (name, readme) => {
    const dir = path.join(tmp, `pinned-${name}`);
    mk(dir, block(`pinned-${name}`), `${INSTALL}\n${readme}`);
    return dir;
  };
  const findings = (dir) => run(dir).out.match(/^ {2}README\.md:\d+ skill-pinned-sources .*/gm) ?? [];
  const unpinned = [
    ["a branch", "https://github.com/owner/repo/blob/main/SKILL.md"],
    ["a bare repository", "https://github.com/owner/repo"],
    ["a tag", "https://github.com/owner/repo/tree/v1.2.3"],
    ["a bare gist", "https://gist.github.com/owner/c28c7a7189726dc3d8a89b6db92c1c8d"],
    ["a gist by its id alone", "https://gist.github.com/c28c7a7189726dc3d8a89b6db92c1c8d"],
    ["GitLab", "https://gitlab.com/group/sub/repo/-/blob/main/SKILL.md"],
    ["Bitbucket", "https://bitbucket.org/owner/repo/src/main/SKILL.md"],
    ["Codeberg", "https://codeberg.org/owner/repo/src/branch/main/SKILL.md"],
    ["SourceHut, by its git subdomain", "https://git.sr.ht/~owner/repo/tree/main/item/SKILL.md"],
    ["a self-hosted git subdomain", "https://git.kernel.org/pub/scm/git/git.git/tree/README.md"],
    ["a self-hosted GitLab subdomain", "https://gitlab.gnome.org/GNOME/gtk/-/blob/main/README.md"],
    ["a sha cut short", `https://github.com/owner/repo/commit/${SHA.slice(0, 7)}`],
    ["a sha that does not end its segment", `https://github.com/owner/repo/blob/${SHA}x/SKILL.md`],
    ["a raw copy on a branch", "https://raw.githubusercontent.com/owner/repo/main/SKILL.md"],
    ["an issue, since only the domain is read", "https://github.com/owner/repo/issues/12"],
    ["a site page, since only the domain is read", "https://github.com/features/actions"],
    ["an owner's profile, since only the domain is read", "https://github.com/owner"],
    ["a bare repository with a query", "https://github.com/owner/repo?tab=readme-ov-file"],
  ];
  for (const [what, url] of unpinned)
    it(`warns on ${what} and leaves the run passing`, () => {
      const dir = mkSkill(what.toLowerCase().replace(/\W+/g, "-"), `## Sources\n\n- [A source](${url}): an idea.\n`);
      const r = run(dir);
      assert.equal(r.code, 0, r.out);
      assert.match(
        r.out,
        new RegExp(
          `^ {2}README\\.md:11 skill-pinned-sources \\(warning\\) .*${url.replaceAll(/[.?]/g, "\\$&")} names no commit: .*link the commit that was read`,
          "m",
        ),
      );
    });
  const pinned = [
    ["a blob at a commit", `https://github.com/owner/repo/blob/${SHA}/SKILL.md`],
    ["a tree at a commit", `https://github.com/owner/repo/tree/${SHA}`],
    ["a commit with a fragment", `https://github.com/owner/repo/blob/${SHA}#readme`],
    ["a gist revision", `https://gist.github.com/owner/c28c7a7189726dc3d8a89b6db92c1c8d/${SHA}`],
    ["a raw copy at a commit", `https://raw.githubusercontent.com/owner/repo/${SHA}/SKILL.md`],
    ["a SourceHut commit", `https://git.sr.ht/~owner/repo/tree/${SHA}/item/SKILL.md`],
    ["a page on no git host", "https://suchow.io/assets/docs/paper.pdf"],
    ["a word holding git in a subdomain", "https://digital.example.com/paper"],
    ["a project site on a git host's pages domain", "https://owner.github.io/repo"],
    ["a file of the repository", "../sibling/SKILL.md"],
  ];
  for (const [what, url] of pinned)
    it(`passes ${what}`, () => {
      const dir = mkSkill(`ok-${what.replace(/\W+/g, "-")}`, `## Inspiration\n\n- [A source](${url}): an idea.\n`);
      assert.deepEqual(findings(dir), []);
    });
  it("reads each section heading whatever its level or case", () => {
    for (const heading of ["## Inspiration", "### SOURCES", "Sources\n-------", "Inspiration\n==========="]) {
      const dir = mkSkill(`level-${heading.replace(/\W+/g, "-")}`, `${heading}\n\n[A source](https://github.com/owner/repo)\n`);
      assert.equal(findings(dir).length, 1, heading);
    }
  });
  it("reads an autolink, a bare URL, a reference, a table cell and a deeper heading in the section", () => {
    const url = "https://github.com/owner/repo/blob/main";
    const dir = mkSkill(
      "shapes",
      `## Sources\n\n- <${url}/autolink>\n- ${url}/bare\n\n[used][ref]\n\n[ref]: ${url}/definition\n\n| Source |\n|---|\n| [cell](${url}/cell) |\n\n### Deeper\n\n[deeper](${url}/deeper)\n`,
    );
    const found = findings(dir);
    for (const shape of ["autolink", "bare", "definition", "cell", "deeper"])
      assert.ok(
        found.some((f) => f.includes(`${url}/${shape} names no commit`)),
        `${shape}: ${found}`,
      );
    assert.equal(found.length, 5, String(found));
  });
  it("reads a link inside a heading in the section, and leaves one outside it alone", () => {
    const url = "https://github.com/owner/repo/blob/main";
    const found = findings(mkSkill("in-heading", `## Sources\n\n### [inside](${url}/inside)\n\nWhat it gave.\n\n## [After](${url}/after)\n\nText.\n`));
    assert.equal(found.length, 1, String(found));
    assert.match(found[0], /main\/inside names no commit/);
  });
  it("judges a reference where it is used, wherever its definition sits", () => {
    const url = "https://github.com/owner/repo";
    const file = `${url}/blob/main`;
    const used = `## Sources\n\n[full][Full Label] and [collapsed][] and [shortcut].\n\n## Later\n\nText.\n\n[full  label]: ${file}/full\n[COLLAPSED]: ${file}/collapsed\n[shortcut]: ${file}/shortcut\n`;
    const found = findings(mkSkill("ref-used", used));
    for (const shape of ["full", "collapsed", "shortcut"])
      assert.ok(
        found.some((f) => f.includes(`main/${shape} names no commit`)),
        `${shape}: ${found}`,
      );
    assert.equal(found.length, 3, String(found));
    assert.match(found[0], /^ {2}README\.md:11 /);
    const elsewhere = `Validated by [a tool][tool].\n\n## Sources\n\nNone from a git host.\n\n[tool]: ${url}\n`;
    assert.deepEqual(findings(mkSkill("ref-elsewhere", elsewhere)), []);
    const pinned = `## Sources\n\n[a][pin]\n\n[pin]: ${url}/blob/${SHA}/SKILL.md\n`;
    assert.deepEqual(findings(mkSkill("ref-pinned", pinned)), []);
    const unused = `## Sources\n\nNone from a git host.\n\n[unused]: ${url}\n`;
    assert.deepEqual(findings(mkSkill("ref-unused", unused)), []);
    const undefinedRef = "## Sources\n\nA [plain][bracket] pair and [another].\n";
    assert.deepEqual(findings(mkSkill("ref-undefined", undefinedRef)), []);
  });
  it("judges a reference-style image as it judges an inline one", () => {
    const url = "https://github.com/owner/repo";
    const found = findings(mkSkill("ref-image", `## Sources\n\n![badge][img]\n\n[img]: ${url}/blob/main/img.png\n`));
    assert.equal(found.length, 1, String(found));
    assert.match(found[0], /README\.md:11 .*img\.png names no commit/);
  });
  it("matches a reference to its definition as the parser does", () => {
    const url = "https://github.com/owner/repo";
    const folded = findings(mkSkill("ref-folded", `## Sources\n\n[Straße]\n\n[STRASSE]: ${url}\n`));
    assert.equal(folded.length, 1, String(folded));
    const spaced = findings(mkSkill("ref-spaced", `## Sources\n\n[a  b]\n\n[a\u00a0b]: https://example.com/x\n[a b]: ${url}\n`));
    assert.equal(spaced.length, 1, String(spaced));
  });
  it("leaves the same link alone outside a source section", () => {
    const url = "https://github.com/owner/repo";
    const dir = mkSkill(
      "outside",
      `Validated by [a tool](${url}).\n\n## Usage\n\n[a tool](${url})\n\n## Sources and more\n\n[a tool](${url})\n\n## Sources\n\nNone from a git host.\n\n## After\n\n[a tool](${url})\n\n\`\`\`text\n## Sources\n\`\`\`\n\n[a tool](${url})\n`,
    );
    assert.deepEqual(findings(dir), []);
  });
  it("a heading no deeper than the section ends it, and a later section still counts", () => {
    const url = "https://github.com/owner/repo/blob/main";
    const dir = mkSkill("ends", `### Sources\n\nNone.\n\n## After\n\n[a tool](${url})\n\n## Sources\n\n[a tool](${url}/second)\n`);
    const found = findings(dir);
    assert.equal(found.length, 1, String(found));
    assert.match(found[0], /main\/second names no commit/);
  });
  it("reads only a README beside a SKILL.md", () => {
    const url = "https://github.com/owner/repo";
    const dir = mkSkill("others", "Nothing here.\n");
    fs.mkdirSync(path.join(dir, "references"));
    fs.writeFileSync(path.join(dir, "references", "README.md"), `# R\n\n## Sources\n\n[a](${url})\n`);
    fs.writeFileSync(path.join(dir, "references", "sources.md"), `# R\n\n## Sources\n\n[a](${url})\n`);
    const elsewhere = path.join(tmp, "pinned-no-skill");
    fs.mkdirSync(elsewhere);
    fs.writeFileSync(path.join(elsewhere, "README.md"), `# R\n\n## Sources\n\n[a](${url})\n`);
    assert.doesNotMatch(run(dir).out, /skill-pinned-sources/);
    assert.doesNotMatch(run(elsewhere).out, /skill-pinned-sources/);
  });
});

describe("carriesInstallForm", () => {
  // The forms are read from references/readme.md, which owns the list, so a form added there alone fails here by name.
  const readmeMd = fs.readFileSync(path.resolve(path.dirname(check), "..", "references", "readme.md"), "utf8");
  const listed = readmeMd.split("\n").find((l) => l.startsWith("Give the section a heading opening with")) ?? "";
  const [headingPart = "", commandPart = ""] = listed.split("or put the command in a fenced block");
  const spans = (s) => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const headings = spans(headingPart);
  const commands = spans(commandPart);
  it("reads a heading list and a command list from references/readme.md", () => assert.ok(headings.length > 0 && commands.length > 0));
  // Each heading is asked for at more than one level and capitalised, because readme.md accepts any heading that opens with the word.
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
  it("a span opening with a slash, a dash, a hash or an at sign is no path", () => {
    for (const span of ["/etc/notes.md", "-x.md", "#x.md", "@x.md"]) assert.equal(looksLikePath(span), false, span);
  });
  it("a file in the root's own folder belongs to the root's skill", () => {
    assert.equal(owningSkill(path.join(tmp, "good", "SKILL.md"), path.join(tmp, "good")), path.join(tmp, "good"));
  });
  it("the walk up stops at the filesystem root", () => assert.equal(owningSkill("/no/such/place/x.md", "/"), null));
  it("a folder whose name extends the root's is outside the root", () => {
    assert.equal(owningSkill(path.join(tmp, "good-too", "SKILL.md"), path.join(tmp, "good")), null);
  });
});
