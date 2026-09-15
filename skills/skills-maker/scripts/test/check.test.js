// Fixtures live in a temporary directory outside any tree an agent discovers, because a fixture shipped as a real SKILL.md is read by some agents as a broken skill.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { enclosingSkill } from "../rules/skill-layout.js";
import { carriesInstallForm } from "../rules/skill-readme.js";

const check = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "check.js");
let tmp;

// Every fixture carries a README unless `readme` is null, so a skill-readme finding never lands in a test about another rule.
const README = "# A skill\n\n## Install\n\n```bash\nskills add owner/repo\n```\n";
function mk(dir, fm, readme = README) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "SKILL.md"), `---\n${fm}\n---\n\nbody\n`);
  if (readme !== null) fs.writeFileSync(path.join(dir, "README.md"), readme);
}
const block = (name, text = "Fine.") => `name: ${name}\ndescription: |\n  ${text}`;

function run(target, env = process.env) {
  const r = spawnSync(process.execPath, [check, target], { encoding: "utf8", env });
  const linted = /^(\d+) files checked/m.exec(r.stdout);
  return { code: r.status, out: r.stdout + r.stderr, linted: linted ? Number(linted[1]) : null };
}

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "skills-maker-check-"));
  mk(path.join(tmp, "good"), block("good"));
  mk(path.join(tmp, "bad"), "name: bad\ndescription: review PR #N and more");
  fs.mkdirSync(path.join(tmp, "empty"));
  // The real .vale.ini is resolved from the script's own directory, so a stub on PATH is what reaches the refused-configuration branch.
  const refuses = path.join(tmp, "refuses-bin");
  fs.mkdirSync(refuses);
  fs.writeFileSync(path.join(refuses, "vale"), '#!/bin/sh\necho "E100 [core] cannot parse config: bad line" >&2\nexit 2\n', { mode: 0o755 });
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
    "\nA span `workflows/new.md` resolves and `workflows/gone.md` does not.\n\nNot paths: `feat/GHI-50_login-form`, `github/gh-stack`, `/usr/bin/env`, `~/.agents/skills/x/SKILL.md`, `docs/*.md`, `E:/work/notes.md`.\n\nThe example-path case, quoted so the rule never sees it: 'workflows/deliberately-absent.md'.\n\n```bash\ncat workflows/also-gone.md\n```\n",
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

  mk(path.join(tmp, "dotted"), block("dotted"));
  fs.mkdirSync(path.join(tmp, "dotted", ".hidden"));
  fs.writeFileSync(path.join(tmp, "dotted", ".hidden", "w.md"), "- **lead.** first\n\n  the reason\n\n  a second paragraph\n");
});

after(() => fs.rmSync(tmp, { recursive: true, force: true }));

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
  it("without vale the structural findings are still printed, and the run fails", () => {
    // PATH holds one empty directory so vale is not found whatever bin directory this machine keeps it in, while the check is spawned by absolute path.
    const r = run(path.join(tmp, "bad"), { ...process.env, PATH: path.join(tmp, "empty") });
    assert.equal(r.code, 1);
    assert.match(r.out, /skill-description/);
    assert.match(r.out, /2 files checked, \d+ issues, prose rules not run/);
    assert.match(r.out, /vale is not on PATH/);
  });
  it("a vale that refuses its configuration fails the run, and says so", () => {
    const r = run(path.join(tmp, "bad"), { ...process.env, PATH: path.join(tmp, "refuses-bin") });
    assert.equal(r.code, 1);
    assert.match(r.out, /2 files checked, \d+ issues, prose rules not run/);
    assert.match(r.out, /vale could not run/);
    assert.match(r.out, /cannot parse config/);
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
    const prose = r.out.indexOf("prose rules:");
    assert.ok(contract > -1 && contract < shape && shape < general && general < prose, r.out);
    assert.ok(r.out.indexOf("skill-description") < shape, r.out);
    assert.ok(r.out.indexOf("skill-continuations") > shape && r.out.indexOf("skill-continuations") < general, r.out);
  });
  it("a clean run states each class rather than leaving it silent", () => {
    const r = run(path.join(tmp, "good"));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^skill rules: none$/m);
    assert.match(r.out, /^prose shape: none$/m);
    assert.match(r.out, /^general lint: none$/m);
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
    const r = spawnSync(process.execPath, [check, "good"], { cwd: tmp, encoding: "utf8" });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
  it("the default target is the working directory", () => {
    const r = spawnSync(process.execPath, [check], { cwd: path.join(tmp, "bad"), encoding: "utf8" });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /TRUNCATED/);
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
  // Each form is asked for on its own, so a form dropped from the regex is a named failure rather than one case fewer.
  const headings = ["## Install", "## Installation", "### Setup", "# Getting started"];
  const commands = [
    "skills add owner/repo",
    "npm install -g thing",
    "npm ci",
    "mise use -g npm:skills",
    "claude plugin install x@y",
    "git clone https://example.test/r",
    "ln -s ../skill ~/.agents/skills/x",
  ];
  for (const h of headings) it(`heading ${h}`, () => assert.ok(carriesInstallForm(`# A skill\n\n${h}\n\ntext\n`)));
  for (const c of commands) it(`command ${c.split(" ")[0]} ${c.split(" ")[1]}`, () => assert.ok(carriesInstallForm(`# A skill\n\n\`\`\`bash\n${c}\n\`\`\`\n`)));
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
  it("a branch name, a repo slug, an absolute path, a ~/ path and a glob are not paths", () => {
    const r = run(path.join(tmp, "refs"));
    for (const span of ["GHI-50_login-form", "gh-stack", "\\/usr\\/bin\\/env", "\\.agents\\/skills", "docs\\/\\*", "E:\\/work"])
      assert.doesNotMatch(r.out, new RegExp(`${span}.*does not resolve`));
  });
});
