// The wrapper against the argument shapes workflows/check.md states. These
// need a filesystem, so they run in a temporary directory that setup
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
import { enclosingSkill } from "../rules/skill-layout.js";

const check = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "check.js");
let tmp;

// A skill at `dir`: the frontmatter given, a blank line, a body.
function mk(dir, fm) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "SKILL.md"), `---\n${fm}\n---\n\nbody\n`);
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
  // A vale that refuses its configuration: exit 2 with a message on stderr, the
  // shape Vale itself uses for a config it cannot parse. The real .vale.ini is
  // resolved from the script's own directory, so it cannot be corrupted from a
  // target, and a stub on PATH is what reaches that branch.
  const refuses = path.join(tmp, "refuses-bin");
  fs.mkdirSync(refuses);
  fs.writeFileSync(path.join(refuses, "vale"), '#!/bin/sh\necho "E100 [core] cannot parse config: bad line" >&2\nexit 2\n', { mode: 0o755 });
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

  // A skill whose directory name extends a sibling path's, for enclosingSkill's
  // own boundary: <tmp>/ab is not inside <tmp>/a, though its path string opens
  // with it.
  mk(path.join(tmp, "ab"), block("ab"));
  mk(path.join(tmp, "ab", "x"), block("x"));

  // Two package roots side by side, each with a skill of the same name.
  mk(path.join(tmp, "many", "one", "skills", "review"), "name: review\ndescription: review PR #N in one plugin");
  mk(path.join(tmp, "many", "two", "skills", "review"), "name: review\ndescription: review PR #N in another");

  // A target carrying its own markdownlint configuration, in both file shapes,
  // each trying to switch off a rule that its skill breaks.
  const configured = path.join(tmp, "configured");
  mk(configured, "name: configured\ndescription: review PR #N and more");
  fs.appendFileSync(path.join(configured, "SKILL.md"), "trailing space here \n");
  fs.writeFileSync(path.join(configured, ".markdownlint-cli2.jsonc"), '{ "config": { "skill-description": false, "skill-frontmatter-parsed": false } }\n');
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

  // A SKILL.md past the split figure, which the production .vale.ini reaches
  // through its own section: a warning that is printed and does not fail.
  const long = Array.from({ length: 41 }, (_, i) => Array.from({ length: 50 }, (_, j) => `word${i}x${j}`).join(" ")).join("\n\n");
  mk(path.join(tmp, "long"), block("long", "A long skill."));
  fs.appendFileSync(path.join(tmp, "long", "SKILL.md"), `\n${long}\n`);

  // A skill carrying a finding of every class at once: a truncated description
  // for the contract rules, a list item over the continuation cap for the
  // prose-shape rule, a trailing space for markdownlint's defaults, and a
  // positional pointer for Vale. The grouping is only legible on a target that
  // reaches every heading, so it is watched here rather than on a clean one.
  const classes = path.join(tmp, "classes");
  mk(classes, "name: classes\ndescription: review PR #N and more");
  fs.appendFileSync(path.join(classes, "SKILL.md"), "\nthe example above says so. \n\n- lead\n\n  one\n\n  two\n");

  // Markdown under a target that keeps no skill: a different answer from the
  // empty target, which is a wrong target rather than a legitimate one.
  fs.mkdirSync(path.join(tmp, "prose-only"));
  fs.writeFileSync(path.join(tmp, "prose-only", "notes.md"), "# Notes\n\nthe example above says so.\n");

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
  it("a long SKILL.md gets the split warning, counted apart and not failing", () => {
    const r = run(path.join(tmp, "long"));
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /SKILL\.md:1 Agentifico\.SkillSplit \(warning\)/);
    // RF5: one figure summing the two read as a failure count on a passing run.
    assert.match(r.out, /^prose rules: 0 issues, 1 warnings$/m);
    assert.match(r.out, /1 files checked, 0 issues, 1 warnings/);
  });
  it("without vale the structural findings are still printed, and the run fails", () => {
    // PATH holds one empty directory, so vale is not found whatever bin
    // directory this machine keeps it in; the check itself is spawned by its
    // absolute path and needs no PATH.
    const r = run(path.join(tmp, "bad"), { ...process.env, PATH: path.join(tmp, "empty") });
    assert.equal(r.code, 1);
    assert.match(r.out, /skill-description/);
    assert.match(r.out, /1 files checked, \d+ issues, prose rules not run/);
    assert.match(r.out, /vale is not on PATH/);
  });
  it("a vale that refuses its configuration fails the run, and says so", () => {
    // SM-09: the branch handled ENOENT, exit 2 and any other spawn error, and
    // only ENOENT had ever been seen to fail.
    const r = run(path.join(tmp, "bad"), { ...process.env, PATH: path.join(tmp, "refuses-bin") });
    assert.equal(r.code, 1);
    assert.match(r.out, /1 files checked, \d+ issues, prose rules not run/);
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
  it("each class of finding prints under its own heading", () => {
    const r = run(path.join(tmp, "classes"));
    assert.equal(r.code, 1);
    assert.match(r.out, /^skill rules: 2$/m);
    assert.match(r.out, /^ {2}SKILL\.md:\d+ skill-description .*TRUNCATED/m);
    assert.match(r.out, /^prose shape: 1$/m);
    assert.match(r.out, /^ {2}SKILL\.md:\d+ skill-continuations .*cap is 1/m);
    assert.match(r.out, /^general lint: 1$/m);
    assert.match(r.out, /^ {2}SKILL\.md:\d+ MD009/m);
    assert.match(r.out, /^prose rules: 1 issues, 0 warnings$/m);
    assert.match(r.out, /^ {2}SKILL\.md:\d+ Agentifico\.Position \(error\)/m);
  });
  it("the class this skill exists to catch prints first, and the prose shape apart from it", () => {
    // The whole point of the grouping: on a real run the one silent-failure
    // finding sat in the middle of the markdownlint wall, and on a target with
    // many continuation findings it would be buried among those instead.
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
  it("a package root names every skill under it, by its own path", () => {
    const r = run(path.join(tmp, "pkg"));
    assert.match(r.out, /^3 skill\(s\) found under /m);
    assert.match(r.out, /^ {2}skills\/alpha$/m);
    assert.match(r.out, /^ {2}skills\/alpha\/references$/m);
    assert.match(r.out, /^ {2}skills\/beta$/m);
  });
  it("markdown under a target with no skill is read and reported as such", () => {
    // Distinct from the empty target, which fails as a wrong target.
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

// The search's own boundary test, exercised directly because check.js globs
// under its target and so can never hand the function a path outside it, while
// the function is exported and callable on its own.
describe("enclosingSkill", () => {
  it("a sibling whose name extends the target's is outside it", () => {
    assert.equal(enclosingSkill(path.join(tmp, "ab", "x", "SKILL.md"), path.join(tmp, "a")), null);
  });
  it("a skill directly above the file, inside the target, is still found", () => {
    assert.equal(enclosingSkill(path.join(tmp, "ab", "x", "SKILL.md"), tmp), path.join(tmp, "ab"));
  });
  it("the filesystem root is a stop like any other", () => {
    // path.sep appended to "/" is "//", which no resolved path opens with, so a
    // prefix built without care stops the walk before it starts.
    assert.equal(enclosingSkill(path.join(tmp, "ab", "x", "SKILL.md"), "/"), path.join(tmp, "ab"));
  });
});
