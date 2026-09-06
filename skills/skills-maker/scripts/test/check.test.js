// The wrapper against the argument shapes: a skill's own directory, a directory
// of skills, a package root, two roots side by side, a directory of symlinks, a
// dot-directory, a skill inside a skill, and a target with nothing under it.
// These need a filesystem, so they run in a temporary directory that setup
// creates and teardown removes, outside any tree an agent discovers: a fixture
// is never shipped as a real SKILL.md, which some agents would read as a broken
// skill.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const check = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "check.js");
let tmp;

// A skill at `dir`: the frontmatter given, a blank line, a body.
function mk(dir, fm) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "SKILL.md"), `---\n${fm}\n---\n\nbody\n`);
}
const block = (name, text = "Fine.") => `name: ${name}\ndescription: |\n  ${text}`;

function run(target) {
  const r = spawnSync(process.execPath, [check, target], { encoding: "utf8" });
  const linted = /^(\d+) files checked/m.exec(r.stdout);
  return { code: r.status, out: r.stdout + r.stderr, linted: linted ? Number(linted[1]) : null };
}

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "skills-maker-check-"));
  mk(path.join(tmp, "good"), block("good"));
  mk(path.join(tmp, "bad"), "name: bad\ndescription: review PR #N and more");
  fs.mkdirSync(path.join(tmp, "empty"));
  fs.mkdirSync(path.join(tmp, "notes"));
  fs.writeFileSync(path.join(tmp, "notes", "notes.txt"), "- **lead.** first\n\n  the reason\n\n  a second paragraph\n");

  // A package root: skills under skills/, files that belong to no skill beside
  // them, an example SKILL.md quoted inside a skill, and a dot-directory.
  const pkg = path.join(tmp, "pkg");
  mk(path.join(pkg, "skills", "alpha"), block("alpha", "Alpha, under a package root."));
  mk(path.join(pkg, "skills", "beta"), block("beta", "Beta, under the same root."));
  mk(path.join(pkg, "skills", "alpha", "references"), block("references", "An example SKILL.md quoted inside a skill."));
  mk(path.join(pkg, ".hidden"), block("hidden", "A skill inside a dot-directory."));
  fs.mkdirSync(path.join(pkg, "agents"));
  fs.writeFileSync(path.join(pkg, "agents", "reviewer.md"), "# Reviewer\n\nbody\n");
  fs.writeFileSync(path.join(pkg, "README.md"), "# Package\n\nbody\n");

  // Two package roots side by side, each with a skill of the same name.
  mk(path.join(tmp, "many", "one", "skills", "review"), "name: review\ndescription: review PR #N in one plugin");
  mk(path.join(tmp, "many", "two", "skills", "review"), "name: review\ndescription: review PR #N in another");

  // A target carrying its own markdownlint configuration, in both file shapes,
  // each trying to switch off a rule that its skill breaks.
  const configured = path.join(tmp, "configured");
  mk(configured, "name: configured\ndescription: review PR #N and more");
  fs.appendFileSync(path.join(configured, "SKILL.md"), "trailing space here \n");
  fs.writeFileSync(path.join(configured, ".markdownlint-cli2.jsonc"), '{ "config": { "skill-description": false, "skill-description-parsed": false } }\n');
  fs.writeFileSync(path.join(configured, ".markdownlint.json"), '{ "default": false }\n');

  // A package under the target carrying its own cli2 configuration, which
  // names a rule module whose dependency is not installed: a runner that
  // discovers configuration imports that module and aborts, where this check
  // reads the package's markdown and nothing else.
  const configuredPackage = path.join(tmp, "configured-package", "some-skill");
  mk(configuredPackage, block("some-skill"));
  fs.mkdirSync(path.join(configuredPackage, "scripts", "rules"), { recursive: true });
  fs.writeFileSync(path.join(configuredPackage, ".markdownlint-cli2.jsonc"), '{ "customRules": ["./scripts/rules/x.js"] }\n');
  fs.writeFileSync(path.join(configuredPackage, "scripts", "rules", "x.js"), 'import "nothing-installed-here";\nexport default {};\n');

  // A directory of symlinks into the canonical tree, which is what an agent's
  // own skills directory is.
  fs.mkdirSync(path.join(tmp, "linked"));
  fs.symlinkSync(path.join(pkg, "skills", "beta"), path.join(tmp, "linked", "beta"));
  fs.symlinkSync(path.join(tmp, "good"), path.join(tmp, "linked", "good"));

  // A skill whose dot-directory holds prose the rule must not reach.
  mk(path.join(tmp, "dotted"), block("dotted"));
  fs.mkdirSync(path.join(tmp, "dotted", ".hidden"));
  fs.writeFileSync(path.join(tmp, "dotted", ".hidden", "w.md"), "- **lead.** first\n\n  the reason\n\n  a second paragraph\n");
});

after(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe("check.js", () => {
  it("a single skill directory is checked and passes", () => {
    const r = run(path.join(tmp, "good"));
    assert.equal(r.code, 0, r.out);
    assert.equal(r.linted, 1);
  });
  it("a single bad skill fails with the rule named", () => {
    const r = run(path.join(tmp, "bad"));
    assert.equal(r.code, 1);
    assert.match(r.out, /skill-description/);
    assert.match(r.out, /TRUNCATED/);
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
    // alpha, beta, the quoted example, reviewer.md and README.md; .hidden is not read.
    assert.equal(r.linted, 5, r.out);
    assert.doesNotMatch(r.out, /hidden/);
  });
  it("a SKILL.md inside another skill is a layout finding, naming the enclosing skill", () => {
    const r = run(path.join(tmp, "pkg"));
    assert.equal(r.code, 1);
    assert.match(r.out, /references\/SKILL\.md.*skill-layout.*inside the skill at .*alpha/);
    assert.doesNotMatch(r.out, /skills\/alpha\/SKILL\.md.*skill-layout/);
  });
  it("the layout search stops at the target", () => {
    // Run over the example alone: alpha is above the target, so it is no
    // longer an enclosing skill.
    const r = run(path.join(tmp, "pkg", "skills", "alpha", "references"));
    assert.equal(r.code, 0, r.out);
  });
  it("two package roots side by side, each reported by its own path", () => {
    const r = run(path.join(tmp, "many"));
    assert.equal(r.code, 1);
    assert.equal(r.linted, 2);
    assert.match(r.out, /one\/skills\/review\/SKILL\.md:\d+ skill-description/);
    assert.match(r.out, /two\/skills\/review\/SKILL\.md:\d+ skill-description/);
  });
  it("configuration under the target changes nothing", () => {
    // A target that could switch off the rules judging it would make a clean
    // run mean nothing; both markdownlint config file shapes are ignored.
    const r = run(path.join(tmp, "configured"));
    assert.equal(r.code, 1);
    assert.match(r.out, /TRUNCATED/);
    assert.match(r.out, /MD009/);
  });
  it("a package with its own cli2 configuration under the target is linted, never imported", () => {
    const r = run(path.join(tmp, "configured-package"));
    assert.equal(r.code, 0, r.out);
    assert.equal(r.linted, 1);
  });
  it("a directory of symlinks into the canonical tree is followed", () => {
    const r = run(path.join(tmp, "linked"));
    assert.equal(r.code, 0, r.out);
    assert.equal(r.linted, 2);
  });
  it("a dot-directory inside a skill is skipped", () => {
    const r = run(path.join(tmp, "dotted"));
    assert.equal(r.code, 0, r.out);
    assert.equal(r.linted, 1);
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
