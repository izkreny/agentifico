// Each fixture is written to a temporary directory because Vale lints files rather than strings, and that directory sits outside any tree an agent discovers skills in.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, "..", "..");
const styles = path.join(pkg, "assets");
const styleDir = path.join(styles, "Agentifico");
const config = path.join(pkg, ".vale.ini");
let tmp;
let ini;

// The shipped .vale.ini is read rather than copied, so an edit to it is what these fixtures test.
const shipped = fs.readFileSync(config, "utf8");

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "skills-guru-vale-"));
  ini = path.join(tmp, ".vale.ini");
  fs.writeFileSync(ini, shipped.replace(/^StylesPath = .*$/m, `StylesPath = ${styles}`));
});
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

// Vale's exit code is not read because it is non-zero only for an error, and a fixture that trips a warning is a pass here too.
function vale(config, file) {
  const r = spawnSync("vale", ["--config", config, "--no-global", "--output=JSON", file], { encoding: "utf8" });
  assert.equal(r.error, undefined, `vale did not run: ${r.error}`);
  assert.notEqual(r.status, 2, `vale refused the configuration: ${r.stderr || r.stdout}`);
  return (r.stdout.trim() ? JSON.parse(r.stdout)[file] : []) ?? [];
}

function alerts(name, content) {
  const file = path.join(tmp, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return vale(ini, file).map((a) => ({ rule: a.Check.replace("Agentifico.", ""), line: a.Line }));
}

const only = (found, rule) => found.filter((f) => f.rule === rule);
const expectHit = (found, rule, line) =>
  assert.ok(
    only(found, rule).some((f) => f.line === line),
    `wanted ${rule} on line ${line}, got ${JSON.stringify(found)}`,
  );
const expectClean = (found, rule) => assert.equal(only(found, rule).length, 0, `wanted no ${rule}, got ${JSON.stringify(only(found, rule))}`);

const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
// Short paragraphs keep the paragraph cap quiet, so a file-length fixture trips the file rules alone.
const body = (n) => Array.from({ length: Math.ceil(n / 50) }, (_, i) => words(Math.min(50, n - i * 50))).join("\n\n");

// The rules' own cases hold what each rule matches; what stays here is what a case cannot express, since a case's input has no file name for a glob in .vale.ini to match.
describe("SkillSplit and SkillLength, enabled for a SKILL.md alone", () => {
  it("a SKILL.md is measured", () => {
    const found = alerts("skill-cap/SKILL.md", `---\nname: x\ndescription: Use when.\n---\n\n${body(3501)}\n`);
    expectHit(found, "SkillSplit", 1);
    expectHit(found, "SkillLength", 1);
  });
  it("a file that is not a SKILL.md is not measured, however long", () => {
    const found = alerts("reference.md", `# Reference\n\n${body(3600)}\n`);
    expectClean(found, "SkillSplit");
    expectClean(found, "SkillLength");
  });
});

function valeTest(...args) {
  const r = spawnSync("vale", ["--no-global", "--config", config, "test", ...args], { encoding: "utf8" });
  assert.equal(r.error, undefined, `vale did not run: ${r.error}`);
  assert.equal(r.status, 0, r.stdout + r.stderr);
}

describe("the rules' own cases", () => {
  // The style alone, because a project case firing a rule would otherwise cover a rule whose own cases never fire.
  it("every rule's cases pass, and every rule fires in one of its own", () => valeTest("--coverage", styleDir));
  it("the cases that need the shipped configuration pass", () => valeTest(path.join(here, "vale.test.yml")));
});

const TRIP_CASE = "fires on each recorded shape, once per line";

describe("per-token coverage", () => {
  // One alert anywhere in a rule marks it covered, so each token is run alone over its rule's trip case to catch a phrasing nobody has seen it catch.
  it("every token of every phrase rule fired on its rule's trip case", () => {
    const tokDir = path.join(tmp, "tok");
    const tokIni = path.join(tokDir, ".vale.ini");
    fs.mkdirSync(path.join(tokDir, "T"), { recursive: true });
    // No TokenIgnores, so each token runs as isolated as the trip case it is checked against.
    fs.writeFileSync(tokIni, `StylesPath = ${tokDir}\nMinAlertLevel = suggestion\n\n[*.md]\nBasedOnStyles = T\n`);
    // The rules come from the style directory, so a tokens-based rule added without a trip case fails here.
    const unreached = [];
    for (const file of fs.readdirSync(styleDir).filter((f) => f.endsWith(".yml"))) {
      const rule = file.replace(/\.yml$/, "");
      const { tests, ...source } = YAML.parse(fs.readFileSync(path.join(styleDir, file), "utf8"));
      if (!Array.isArray(source.tokens)) continue;
      const trip = tests?.find((c) => c.name === TRIP_CASE);
      assert.ok(trip, `${rule} has tokens and no "${TRIP_CASE}" case`);
      const fixture = path.join(tokDir, `${rule.toLowerCase()}.md`);
      fs.writeFileSync(fixture, trip.input);
      for (const token of source.tokens) {
        fs.writeFileSync(path.join(tokDir, "T", `${rule}.yml`), YAML.stringify({ ...source, tokens: [token] }));
        if (vale(tokIni, fixture).length === 0) unreached.push(`${rule}: ${token}`);
      }
    }
    assert.deepEqual(unreached, [], `no trip line trips:\n${unreached.join("\n")}`);
  });
});
