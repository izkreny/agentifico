// Each fixture is written to a temporary directory because Vale lints files rather than strings, and that directory sits outside any tree an agent discovers skills in.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, it } from "vitest";
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

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "skills-guru-vale-"));
  ini = path.join(tmp, ".vale.ini");
  fs.writeFileSync(ini, shipped.replace(/^StylesPath = .*$/m, `StylesPath = ${styles}`));
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

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

describe("FileLength, enabled for every markdown file but a SKILL.md and a README.md", () => {
  it("a workflow file past the cap is measured", () => {
    expectHit(alerts("file-cap/workflows/long.md", `# Workflow\n\n${body(3501)}\n`), "FileLength", 1);
  });
  it("a SKILL.md is not measured by it", () => {
    expectClean(alerts("file-cap/SKILL.md", `---\nname: x\ndescription: Use when.\n---\n\n${body(3501)}\n`), "FileLength");
  });
  it("a README.md is not measured by any file-length rule", () => {
    const found = alerts("file-cap/README.md", `# Readme\n\n${body(3600)}\n`);
    expectClean(found, "FileLength");
    expectClean(found, "SkillSplit");
    expectClean(found, "SkillLength");
  });
});

describe("ClosingRecap, enabled for every markdown file but a README.md", () => {
  const recap = "# Title\n\n## Step 1\n\nDo it.\n\n## Rules\n\n- Do it.\n";
  it("a workflow file ending on a Rules section is warned", () => {
    expectHit(alerts("recap/workflows/closing.md", recap), "ClosingRecap", 7);
  });
  it("a README.md ending on one is not", () => {
    expectClean(alerts("recap/README.md", recap), "ClosingRecap");
  });
  it("a Python file whose last section comment reads as one is not", () => {
    expectClean(alerts("recap/script.py", "## Setup\nx = 1\n\n## Rules\ny = 2\n"), "ClosingRecap");
  });
});

describe("what the shipped configuration reaches", () => {
  // A rule's own case sets its view itself, so only a file read under the shipped configuration shows the code section and the Python View in effect.
  it("a Python comment is read by the comment rules, and a module docstring is not", () => {
    const found = alerts("reach/script.py", '"""One. Two."""\n\n# One. Two.\nx = 1\n');
    expectHit(found, "CommentSentences", 3);
    assert.ok(!only(found, "CommentSentences").some((f) => f.line === 1), `wanted no CommentSentences on the module docstring, got ${JSON.stringify(found)}`);
  });
  it("a backticked digit in a code comment is a literal, and a bare one warns", () => {
    const found = alerts("reach/exit.py", "# It exits `2` on a refusal.\nx = 1\n# It exits 3 on a timeout.\ny = 2\n");
    expectHit(found, "Digits", 3);
    assert.ok(!only(found, "Digits").some((f) => f.line === 1), `wanted no Digits on the backticked digit, got ${JSON.stringify(found)}`);
  });
  it("a README is read by the phrase rules", () => {
    expectHit(alerts("reach/README.md", "# Readme\n\nIt covers all three forms.\n"), "Counts", 3);
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
      const entries = Array.isArray(source.tokens)
        ? source.tokens.map((token) => [token, { tokens: [token] }])
        : Object.entries(source.swap ?? {}).map(([key, word]) => [key, { swap: { [key]: word } }]);
      if (entries.length === 0) continue;
      const trip = tests?.find((c) => c.name === TRIP_CASE);
      assert.ok(trip, `${rule} has tokens and no "${TRIP_CASE}" case`);
      const fixture = path.join(tokDir, `${rule.toLowerCase()}.md`);
      fs.writeFileSync(fixture, trip.input);
      for (const [token, alone] of entries) {
        fs.writeFileSync(path.join(tokDir, "T", `${rule}.yml`), YAML.stringify({ ...source, ...alone }));
        if (vale(tokIni, fixture).length === 0) unreached.push(`${rule}: ${token}`);
      }
    }
    assert.deepEqual(unreached, [], `no trip line trips:\n${unreached.join("\n")}`);
  });
});

describe("word classes", () => {
  // A group holding a word from no class is left alone, so a pronoun beside the determiners does not force a token apart.
  it("every group of one class's words is that class's list, or its source comment says why it narrows", () => {
    const classes = YAML.parse(fs.readFileSync(path.join(styles, "word-classes.yml"), "utf8"));
    const classOf = (alts) => Object.keys(classes).find((c) => alts.every((a) => classes[c].includes(a)));
    const drifted = [];
    for (const file of fs.readdirSync(styleDir).filter((f) => f.endsWith(".yml"))) {
      const rule = file.replace(/\.yml$/, "");
      const tokens = YAML.parseDocument(fs.readFileSync(path.join(styleDir, file), "utf8")).get("tokens", true);
      if (!tokens) continue;
      for (const [i, item] of tokens.items.entries()) {
        // The first token's comment is parsed onto the sequence rather than the item.
        const comment = ((i === 0 ? tokens.commentBefore : item.commentBefore) ?? "").replace(/\s+/g, " ");
        for (const [, group] of item.value.matchAll(/\(\?:([^()]*)\)/g)) {
          const alts = group.split("|").map((a) => a.trim());
          if (alts.some((a) => !/^[a-z]+$/.test(a))) continue;
          const cls = classOf(alts);
          if (!cls || classes[cls].every((w) => alts.includes(w))) continue;
          if (!new RegExp(`Narrows ${cls}: \\S`).test(comment)) drifted.push(`${rule}: ${item.value} narrows ${cls}`);
        }
      }
    }
    assert.deepEqual(drifted, [], `a group narrows its class with no "Narrows <class>: <reason>" in its comment:\n${drifted.join("\n")}`);
  });
  it("Digits swaps each digit from two to twenty for its word in the numbers list", () => {
    const { numbers } = YAML.parse(fs.readFileSync(path.join(styles, "word-classes.yml"), "utf8"));
    const { swap } = YAML.parse(fs.readFileSync(path.join(styleDir, "Digits.yml"), "utf8"));
    // A key opens on lookbehinds and closes on lookaheads, so its digit is the number standing between a closing and an opening parenthesis.
    const swapped = Object.entries(swap).map(([key, word]) => [Number(key.match(/\)(\d+)\(/)[1]), word]);
    assert.deepEqual(
      swapped,
      numbers.map((word, i) => [i + 2, word]),
    );
  });
});
