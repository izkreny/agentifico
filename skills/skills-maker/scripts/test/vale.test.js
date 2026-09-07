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
// .vale.ini does for a real one through its own section, and quoted text is
// ignored as .vale.ini ignores it, since the rule files quote their own bad
// examples. A section glob is matched against the whole path, so it opens
// with **/ to reach a basename.
before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "skills-maker-vale-"));
  ini = path.join(tmp, ".vale.ini");
  fs.writeFileSync(
    ini,
    `StylesPath = ${styles}\nMinAlertLevel = suggestion\n\n[*.md]\nBasedOnStyles = Agentifico\nTokenIgnores = ("[^"\\n]+"), (“[^”\\n]+”)\nAgentifico.SkillSplit = NO\nAgentifico.SkillLength = NO\n\n[**/skill-*.md]\nBasedOnStyles = Agentifico\nAgentifico.SkillSplit = YES\nAgentifico.SkillLength = YES\n`,
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

// The phrase rules: each fixture line carries one shape a review caught in
// this repository, so a token that stops matching its own record fails here,
// and the guards fixture carries the sanctioned forms beside each.
describe("Counts, a count of adjacent content", () => {
  it("fires on each recorded shape, once per line", () => {
    const found = alerts(
      "counts.md",
      [
        "# Title",
        "",
        "It covers all three forms of appointment.", // 3
        "Reads the two caps above and the three most memorable ones.", // 4
        "The standards are the three below.", // 5
        "Two lines matter: the subject and the body.", // 6
        "It runs in three parts: read, judge, post.", // 7
        "Both checks are per stack rather than per branch.", // 8
        "Take whichever of the two applies.", // 9
        "Two of them change what an agent does, and both sources are named.", // 10
      ].join("\n"),
    );
    for (const line of [3, 4, 5, 6, 7, 8, 9, 10]) expectHit(found, "Counts", line);
    assert.equal(only(found, "Counts")[0].severity, "error");
  });
  it("leaves caps, quoted examples and a bare both alone", () => {
    const found = alerts(
      "counts-guards.md",
      [
        "# Title",
        "",
        "Five sentences or bullets at most, and three times at most in a round.",
        "An issue carries at most one value from each axis; under roughly 2,000 words one file is right.",
        'The rule quotes "the four rules below" as its own bad example.',
        "Read both, then report both in the handoff, in both directions.",
        "A cap of `the two files` inside a code span is code.",
      ].join("\n"),
    );
    expectClean(found, "Counts");
  });
});

describe("Position, a claim of position or uniqueness", () => {
  it("fires on each recorded shape, once per line", () => {
    const found = alerts(
      "position.md",
      [
        "# Title",
        "",
        "Per the escape above, the row below is what the table means.", // 3
        "The target is the same as above.", // 4
        "It is stated in *Labels* above.", // 5
        "That is the one place a cap is stated, and nowhere else.", // 6
        "Nothing else states what follows, and every other site points here.", // 7
        "Read the next bullet and the last paragraph of this section.", // 8
        "This repository's one plugin is the newest section's subject.", // 9
        "The above holds; a skill list leaves exactly those unaccounted for.", // 10
        "This is the one that works. The first is a check a tool could answer.", // 11
      ].join("\n"),
    );
    for (const line of [3, 4, 5, 6, 7, 8, 9, 10, 11]) expectHit(found, "Position", line);
  });
  it("leaves the sanctioned forms alone", () => {
    const found = alerts(
      "position-guards.md",
      [
        "# Title",
        "",
        "Each part below earns its place:",
        "One copy owns the fact and every other copy says so.",
        '"Never do X. Doing X is bad." The second sentence should say what breaks.',
        "Resume at the first unticked step, in the current directory, with the latest release.",
        "A footer that floats above the page is CSS, and the first of these that is set wins.",
        "The sections named under *Never counted* are excluded; `the table above` is code.",
        "Keep the shared layer in one place.",
      ].join("\n"),
    );
    expectClean(found, "Position");
  });
});

describe("History, the file's own history", () => {
  it("fires on each recorded shape, once per line", () => {
    const found = alerts(
      "history.md",
      [
        "# Title",
        "",
        "This reverses an earlier rule that capped the watch.", // 3
        "It does not stop it any more, and no longer reads the config.", // 4
        "Where it previously mandated plain text, the reads now happen later.", // 5
        "The old check refused first; the block it replaced spent nothing.", // 6
        "The discovery rule is now something the rest depends on, restored from the loop.", // 7
        "It behaves exactly as it does today, which was never the reason.", // 8
        "The constraint is being lifted; until it lands, the paths named before #101 stay.", // 9
        "Worth doing, not yet done, since that reasoning still holds.", // 10
        "The scope rule is unchanged and the contract survives untouched, as before.", // 11
        "This supersedes the fix; it currently forbids a parser, a risk the gate has retired.", // 12
        "The first draft of this issue said so; an earlier shape of it was dropped.", // 13
      ].join("\n"),
    );
    for (const line of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) expectHit(found, "History", line);
  });
  it("leaves quoted examples, imperatives and state alone", () => {
    const found = alerts(
      "history-guards.md",
      [
        "# Title",
        "",
        '"We used to cap the watch at an hour" becomes a durable reason.',
        "Run it now, note it now as a finding, and stop.",
        "A branch not yet pushed is the ordinary resume; the file already exists.",
        "A claim about a rule that is gone reads as a rule about the present.",
        "The flag is used to name the target, now that the walk is a glob.",
        "A premise that has stopped being true is a defect; the check runs still, and the current branch is read.",
      ].join("\n"),
    );
    expectClean(found, "History");
  });
});

describe("Banner, a version or date banner in the opening lines", () => {
  it("fires on a banner after the frontmatter and a tools blockquote", () => {
    const found = alerts(
      "banner.md",
      "---\nname: x\ndescription: Use when.\n---\n\n> **Tools used:** none\n\nVerified against Vale 3.20.0 on 2026-09-07.\n\nA later paragraph.\n",
    );
    expectHit(found, "Banner", 8);
    assert.match(only(found, "Banner")[0].match, /^Verified against Vale 3\.20\.0/);
  });
  it("fires on a banner under an opening heading with no frontmatter", () => {
    expectHit(alerts("banner-heading.md", "# Reference\n\nTested with v3 and currently correct.\n\nMore.\n"), "Banner", 3);
  });
  it("fires on a dated observation opening the file", () => {
    expectHit(
      alerts("banner-dated.md", "# Notes\n\nOn 2026-09-06 a status read reported four reviewed pull requests, as of the commit this was filed against.\n"),
      "Banner",
      3,
    );
  });
  it("leaves the verification idiom alone", () => {
    expectClean(alerts("banner-idiom.md", "# Notes\n\nVerified against the plugin documentation rather than recalled.\n"), "Banner");
  });
  it("leaves the frontmatter, a version beside its claim and a later dated claim alone", () => {
    const found = alerts(
      "banner-guards.md",
      "---\nname: x\ndescription: Use when.\ncompatibility: Requires Vale 3.20 or later, verified against 3.20.0.\n---\n\n> **Tools used:** none\n\nA clean opening paragraph.\n\nThe field is read (Claude Code 2.1.252), and as of 2026 the docs say so; this was tested with a real parser.\n",
    );
    expectClean(found, "Banner");
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
