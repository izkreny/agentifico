// The Vale rules against their fixtures. Vale lints files rather than strings,
// so each fixture is written into a temporary directory that setup creates and
// teardown removes, beside a configuration of the suite's own that points at
// this package's style directory; nothing here is ever a real SKILL.md on
// disk, which some agents would discover as a broken skill. Every rule gets a
// fixture that trips it and a guards fixture of lines it must leave alone, and
// each assertion was watched failing against the rule with its token removed
// or the fixture with its defect removed before it was trusted. The coverage
// test at the end is the mechanical form of that: a Vale rule that matches
// nothing fails silently, so a rule no fixture reaches is indistinguishable
// from one that is broken.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const styles = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "styles");
let tmp;
let ini;
const fired = new Set();

// The suite's own configuration: the file-length rules are on for a fixture
// whose name says it stands for a SKILL.md, and off elsewhere, which is what
// .vale.ini does for a real one through its own section. A section glob is
// matched against the whole path, so it opens with **/ to reach a basename.
before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "skills-maker-vale-"));
  ini = path.join(tmp, ".vale.ini");
  fs.writeFileSync(
    ini,
    `StylesPath = ${styles}\nMinAlertLevel = suggestion\n\n[*.md]\nBasedOnStyles = Agentifico\nAgentifico.SkillSplit = NO\nAgentifico.SkillLength = NO\n\n[**/skill-*.md]\nBasedOnStyles = Agentifico\nAgentifico.SkillSplit = YES\nAgentifico.SkillLength = YES\n`,
  );
});
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

// Lints one fixture and returns its alerts as rule, line, severity, match and
// message. Vale's exit code is not read: it is non-zero only for an error, and
// a fixture that trips a warning is a pass here too.
function alerts(name, content) {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, content);
  const r = spawnSync("vale", ["--config", ini, "--no-global", "--output=JSON", file], { encoding: "utf8" });
  assert.equal(r.error, undefined, `vale did not run: ${r.error}`);
  assert.notEqual(r.status, 2, `vale refused the configuration: ${r.stderr || r.stdout}`);
  const found = (r.stdout.trim() ? JSON.parse(r.stdout)[file] : []) ?? [];
  for (const a of found) fired.add(a.Check);
  return found.map((a) => ({ rule: a.Check.replace("Agentifico.", ""), line: a.Line, severity: a.Severity, match: a.Match, message: a.Message }));
}

const only = (found, rule) => found.filter((f) => f.rule === rule);
const expectHit = (found, rule, line) =>
  assert.ok(
    only(found, rule).some((f) => f.line === line),
    `wanted ${rule} on line ${line}, got ${JSON.stringify(found)}`,
  );
const expectClean = (found, rule) => assert.equal(only(found, rule).length, 0, `wanted no ${rule}, got ${JSON.stringify(only(found, rule))}`);

// A paragraph of n distinct words, so a word-boundary token counts each once.
const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
// A body of n words spread over short paragraphs, none long enough to trip
// the paragraph cap, so a file-length fixture trips the file rules alone.
const body = (n) => Array.from({ length: Math.ceil(n / 50) }, (_, i) => words(Math.min(50, n - i * 50))).join("\n\n");

describe("ParagraphLength, the one-claim helper", () => {
  it("a paragraph over the cap is named, with its count, as a warning", () => {
    const found = alerts("para-over.md", `# Title\n\nShort.\n\n${words(121)}\n`);
    expectHit(found, "ParagraphLength", 5);
    assert.equal(only(found, "ParagraphLength")[0].severity, "warning");
    assert.match(only(found, "ParagraphLength")[0].message, /121 words/);
  });
  it("a paragraph at the cap is not", () => {
    expectClean(alerts("para-at.md", `# Title\n\n${words(120)}\n`), "ParagraphLength");
  });
  it("a list item, a blockquote and a code block are not paragraphs", () => {
    const found = alerts("para-guards.md", `# Title\n\n- ${words(130)}\n\n> ${words(130)}\n\n\`\`\`text\n${words(130)}\n\`\`\`\n`);
    expectClean(found, "ParagraphLength");
  });
});

describe("SkillSplit and SkillLength, the file caps", () => {
  it("past 2,000 words the split rule fires and the cap does not", () => {
    const found = alerts("skill-split.md", `---\nname: x\ndescription: Use when.\n---\n\n${body(2001)}\n`);
    expectHit(found, "SkillSplit", 1);
    expectClean(found, "SkillLength");
  });
  it("past 3,500 words both fire, as warnings", () => {
    const found = alerts("skill-cap.md", `---\nname: x\ndescription: Use when.\n---\n\n${body(3501)}\n`);
    expectHit(found, "SkillSplit", 1);
    expectHit(found, "SkillLength", 1);
    assert.equal(only(found, "SkillLength")[0].severity, "warning");
  });
  it("under 2,000 words neither fires", () => {
    const found = alerts("skill-small.md", `---\nname: x\ndescription: Use when.\n---\n\n${body(1999)}\n`);
    expectClean(found, "SkillSplit");
    expectClean(found, "SkillLength");
  });
  it("a file that is not a SKILL.md is not measured, however long", () => {
    const found = alerts("reference.md", `# Reference\n\n${body(3600)}\n`);
    expectClean(found, "SkillSplit");
    expectClean(found, "SkillLength");
  });
});

// Last, because it reads what every test above fired.
describe("coverage", () => {
  it("every rule in the style fired on some fixture", () => {
    const rules = fs
      .readdirSync(path.join(styles, "Agentifico"))
      .filter((f) => f.endsWith(".yml"))
      .map((f) => `Agentifico.${f.replace(/\.yml$/, "")}`);
    const missing = rules.filter((r) => !fired.has(r));
    assert.deepEqual(missing, [], `no fixture reaches: ${missing.join(", ")}`);
  });
});
