// The rules against their fixtures, one string each, through markdownlint's
// own string input: the name a string is keyed by is the path the rule sees, so
// a fixture is a skill by its key and nothing is ever written to disk. Every
// fixture decides something the rule itself decides, and each assertion was
// watched failing against the rule with its clause removed before it was
// trusted; a shape the parser alone decides has no fixture here, because no
// change to the rule could ever break it, and a check that has never been seen
// to fail is not evidence.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lint } from "markdownlint/promise";
import continuations from "../rules/skill-continuations.js";
import description from "../rules/skill-description.js";
import parsed from "../rules/skill-description-parsed.js";
import invocation from "../rules/skill-invocation.js";
import name from "../rules/skill-name.js";

const RULES = [description, parsed, name, invocation, continuations];

// Lints one string as the file at `path`, with only the named rules on, and
// returns each finding as its rule, line and detail.
async function findings(path, content, ...only) {
  const config = { default: false };
  for (const r of only) config[r.names[0]] = true;
  const results = await lint({ strings: { [path]: content }, customRules: RULES, config });
  return results[path].map((e) => ({ rule: e.ruleNames[0], line: e.lineNumber, detail: e.errorDetail ?? "" }));
}

// A skill file: frontmatter, a blank line, then the body. The blank line is
// deliberate, since the frontmatter pattern swallows it and the reader has to
// give it back.
const skill = (fm, body = "body") => `---\n${fm}\n---\n\n${body}\n`;

const has = (found, rule, part) => found.some((f) => f.rule === rule && f.detail.includes(part));
const expectDetail = (found, rule, part) => assert.ok(has(found, rule, part), `wanted ${rule} "${part}", got ${JSON.stringify(found)}`);
const expectClean = (found, rule) => assert.equal(found.filter((f) => f.rule === rule).length, 0, `wanted no ${rule} finding, got ${JSON.stringify(found)}`);

describe("skill-description, the raw sweep", () => {
  const cases = [
    ["good-block", "name: x\ndescription: |\n  Use for PR #N review: safe & sound", null],
    ["good-quoted", 'name: x\ndescription: "Plain quoted, no tricks"', null],
    ["good-curly", "name: x\ndescription: |\n  Use when reviewing the repository’s own skills.", null],
    ["good-quoted-comment", 'name: x\ndescription: "a real description" # note', null],
    ["good-single-doubled", "name: x\ndescription: 'it''s fine' # don't mind me", null],
    ["good-multiline", "name: x\ndescription: Use when asked to do X,\n  and also when asked to do Y.", null],
    ["t-multiline-comment", "name: x\ndescription: Use when asked to do X,\n  and PR #N work", "TRUNCATED"],
    ["good-quoted-multiline", 'name: x\ndescription: "Use for X\n  and Y"', null],
    ["good-single-multiline", "name: x\ndescription: 'Use for X\n  and Y'", null],
    ["t-unclosed-multiline", 'name: x\ndescription: "Use for X\n  and Y', "unclosed double quote"],
    ["t-comment", "name: x\ndescription: review PR #N and more", "TRUNCATED"],
    ["t-anchor", "name: x\ndescription: &draft Use when drafting", "leading &"],
    ["t-curly", "name: x\ndescription: “Use for PR #N”", "curly quotes"],
    ["t-dupe", "name: x\ndescription: first\ndescription: second", "duplicate description"],
    ["t-colon", "name: x\ndescription: Use when: reviewing", "colon inside"],
    ["t-tailcolon", "name: x\ndescription: Use when reviewing:", "colon inside"],
    ["t-backslash", 'name: x\ndescription: "matches \\d+ digits"', "risky backslash"],
    ["t-innerdq", 'name: x\ndescription: "say "hi" now"', "inner double quote"],
    ["t-unclosed", 'name: x\ndescription: "never closed', "unclosed double quote"],
    ["t-apostrophe", "name: x\ndescription: 'Don't use'", "apostrophe"],
    ["t-bool", "name: x\ndescription: yes", "boolean"],
    ["t-missing", "name: x", "no description"],
  ];
  for (const [id, fm, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(fm), description);
      if (want) expectDetail(found, "skill-description", want);
      else expectClean(found, "skill-description");
    });
  }
  it("a file with no frontmatter at all has no description", async () => {
    expectDetail(await findings("fx/bare/SKILL.md", "body\n", description), "skill-description", "no description");
  });
  it("a file that is not a SKILL.md is not a skill", async () => {
    expectClean(await findings("fx/x/README.md", skill("name: x"), description), "skill-description");
  });
  it("reports on the first body line, after the frontmatter and the blank the pattern swallows", async () => {
    const found = await findings("fx/t/SKILL.md", skill("name: x\ndescription: yes"), description);
    assert.equal(found[0].line, 6);
  });
});

describe("skill-description-parsed, the differential", () => {
  const cases = [
    ["good-block", "name: x\ndescription: |\n  Use for PR #N review: safe & sound", null],
    ["good-quoted", 'name: x\ndescription: "Plain quoted, no tricks"', null],
    ["good-plain", "name: x\ndescription: Use when reviewing a skill.", null],
    ["good-multiline", "name: x\ndescription: Use when asked to do X,\n  and also when asked to do Y.", null],
    ["t-multiline-comment", "name: x\ndescription: Use when asked to do X,\n  and PR #N work", "SILENTLY MUTATED"],
    ["t-comment", "name: x\ndescription: review PR #N and more", "SILENTLY MUTATED"],
    ["t-anchor", "name: x\ndescription: &draft Use when drafting", "SILENTLY MUTATED"],
    ["t-curly", "name: x\ndescription: “Use for PR #N”", "SILENTLY MUTATED"],
    ["t-dupe", "name: x\ndescription: first\ndescription: second", "SILENTLY MUTATED"],
    ["t-bool", "name: x\ndescription: yes", "not a string"],
    ["t-colon", "name: x\ndescription: Use when: reviewing", "PARSE ERROR"],
    ["t-tailcolon", "name: x\ndescription: Use when reviewing:", "PARSE ERROR"],
    ["t-innerdq", 'name: x\ndescription: "say "hi" now"', "PARSE ERROR"],
    ["t-apostrophe", "name: x\ndescription: 'Don't use'", "PARSE ERROR"],
    ["t-backslash", 'name: x\ndescription: "matches \\d+ digits"', "PARSE ERROR"],
    ["t-scalar-doc", "just a string", "not a mapping"],
  ];
  for (const [id, fm, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(fm), parsed);
      if (want) expectDetail(found, "skill-description-parsed", want);
      else expectClean(found, "skill-description-parsed");
    });
  }
  it("a blank line after the closing delimiter is not part of the frontmatter", async () => {
    // Without the trailing-blank strip the closing `---` is parsed as a second
    // document and every real skill file reports a parse error.
    expectClean(await findings("fx/x/SKILL.md", skill('name: x\ndescription: |\n  Fine.\nmetadata:\n  version: "1.0"'), parsed), "skill-description-parsed");
  });
});

describe("skill-name", () => {
  const cases = [
    ["good", "name: good\ndescription: |\n  x", null],
    ["mismatch", "name: something-else\ndescription: |\n  x", 'name is "something-else", directory is "mismatch"'],
    ["my [1] skill", "name: wrong\ndescription: |\n  x", 'directory is "my [1] skill"'],
    ["no-name", "description: |\n  x", "no name"],
    ["quoted", 'name: "quoted"\ndescription: |\n  x', null],
    ["commented", "name: commented # note\ndescription: |\n  x", null],
    ["twospace", "name: twospace  # two spaces before the comment\ndescription: |\n  x", null],
    ["quotecom", 'name: "quotecom" # a quoted value ends at its own quote\ndescription: |\n  x', null],
  ];
  for (const [dir, fm, want] of cases) {
    it(dir, async () => {
      const found = await findings(`fx/${dir}/SKILL.md`, skill(fm), name);
      if (want) expectDetail(found, "skill-name", want);
      else expectClean(found, "skill-name");
    });
  }
  it("a markdown file beside a skill is not held to the skill's name", async () => {
    expectClean(await findings("fx/good/workflows/w.md", skill("name: wrong"), name), "skill-name");
  });
});

describe("skill-invocation", () => {
  const silent = "description says nothing about invocation";
  const cases = [
    ["i-default", "description: |\n  Nothing about how it is reached.", null],
    ["i-dflt-set", "description: |\n  Nothing about how it is reached.\nuser-invocable: true\ndisable-model-invocation: false", null],
    ["i-dmi-stated", "description: |\n  Explicit invocation only.\ndisable-model-invocation: true", null],
    ["i-dmi-slash", "description: |\n  Type `/plug:i-dmi-slash` yourself.\ndisable-model-invocation: true", null],
    ["i-dmi-plain", "description: Only when the user invokes it by name.\ndisable-model-invocation: true", null],
    ["i-dmi-folded", "description: Does a thing for the user,\n  only when the user invokes it by name.\ndisable-model-invocation: true", null],
    ["i-dmi-silent", "description: |\n  Nothing about how it is reached.\ndisable-model-invocation: true", silent],
    ["i-ui-stated", "description: |\n  Spawned by a review round, never typed.\nuser-invocable: false", null],
    ["i-ui-silent", "description: |\n  Nothing about how it is reached.\nuser-invocable: false", silent],
    ["i-yes", "description: |\n  Explicit invocation only.\ndisable-model-invocation: yes", "not true or false"],
    ["i-caps", "description: |\n  Explicit invocation only.\ndisable-model-invocation: True", "not true or false"],
    ["i-empty", "description: |\n  Explicit invocation only.\ndisable-model-invocation:", "not true or false"],
    ["i-quoted", 'description: |\n  Explicit invocation only.\nuser-invocable: "false"', "quoted"],
    ["i-dupe", "description: |\n  Explicit invocation only.\ndisable-model-invocation: true\ndisable-model-invocation: false", "duplicate"],
    ["i-comment", "description: |\n  Explicit invocation only.\ndisable-model-invocation: true # the owner types it", null],
    ["i-para", "description: |\n  Does a thing for the user.\n\n  Only when the user invokes it by name.\ndisable-model-invocation: true", null],
    // Another skill's slash command that this name only ends, or only opens,
    // credits nothing.
    ["flow", "description: |\n  Hands the branch off to `/gh-solo:pr-flow` when the work is done.\ndisable-model-invocation: true", silent],
    ["pr", "description: |\n  Hands the branch off to `/gh-solo:pr-flow` when the work is done.\ndisable-model-invocation: true", silent],
  ];
  for (const [dir, fm, want] of cases) {
    it(dir, async () => {
      const found = await findings(`fx/${dir}/SKILL.md`, skill(`name: ${dir}\n${fm}`), invocation);
      if (want) expectDetail(found, "skill-invocation", want);
      else expectClean(found, "skill-invocation");
    });
  }
});

describe("skill-continuations", () => {
  const cap = "continuation paragraphs, cap is 1";
  const bold = "bolded lead-in";
  const cases = [
    ["c-one", "- **lead.** first line\n\n  the one continuation, which is the reason\n", []],
    ["c-two", "- **lead.** first line\n\n  the reason\n\n  a second paragraph, which is a second claim\n", [`2 ${cap}`]],
    ["c-bold", "- **lead.** first line\n\n  **a bolded continuation.** which is a heading wearing an indent\n", [bold]],
    ["c-fencein", "- **lead.** first line\n\n  ```bash\n  echo hi\n  ```\n\n  the one continuation\n", []],
    ["c-tick", "- **lead.** first line\n\n  `COMMENT`, not `REQUEST_CHANGES`\n\n  `another` one opening with a backtick\n", [`2 ${cap}`]],
    [
      "c-runon",
      "3. **three.** its lead\n\n   a continuation\n4. **four.** the marker runs straight on from the paragraph above\n\n   its reason\n\n   **and a bolded second.** which is the defect\n",
      [`2 ${cap}`, bold],
    ],
    [
      "c-nested",
      "- **outer.** its lead\n\n  - **inner.** a nested item at the parent content column\n\n  the reason\n\n  a second paragraph\n\n  **a bolded third.** which must still be seen\n",
      [`3 ${cap}`, bold],
    ],
    ["c-nested4", "- **outer.** its lead\n\n    - nested a\n    - nested b\n\n  the one continuation\n", []],
    ["c-nestedown", "- **outer.** its lead\n\n  - **inner.** a nested item\n\n    the nested item's own paragraph\n\n  the parent's one continuation\n", []],
    ["c-tablein", "- **lead.** first\n\n  the reason\n\n  | a | b |\n  | --- | --- |\n  | c | d |\n", []],
    ["c-quotein", "- **lead.** first\n\n  the reason\n\n  > a quoted line, which is not a paragraph of the item\n", []],
    ["c-leadfence", "- ```bash\n  echo hi\n  ```\n\n  the one continuation\n", []],
  ];
  for (const [id, body, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(`name: ${id}\ndescription: |\n  x`, body), continuations);
      for (const w of want) expectDetail(found, "skill-continuations", w);
      if (!want.length) expectClean(found, "skill-continuations");
    });
  }
  it("frontmatter is not body: its sequence item claims nothing below", async () => {
    // A YAML sequence item under `allowed-tools:` would otherwise read the
    // indented body paragraphs as its continuations.
    const content =
      "---\nname: c-scalar\ndescription: |\n  a first line of the scalar\n  a second line of the scalar\nallowed-tools:\n  - Read\n---\n\n    an indented paragraph the sequence item would claim\n\n    and a second one\n";
    expectClean(await findings("fx/c-scalar/SKILL.md", content, continuations), "skill-continuations");
  });
  it("a workflow file is read, not only SKILL.md", async () => {
    expectDetail(
      await findings("fx/c-sub/workflows/w.md", "- **lead.** first\n\n  the reason\n\n  a second paragraph\n", continuations),
      "skill-continuations",
      `2 ${cap}`,
    );
  });
  it("names the item's line for the cap and the paragraph's line for the bold", async () => {
    const found = await findings("fx/l/w.md", "intro\n\n- **lead.** first\n\n  the reason\n\n  **bold.** second\n", continuations);
    assert.deepEqual(found.map((f) => [f.line, f.detail.includes(bold) ? "bold" : "cap"]).sort(), [
      [3, "cap"],
      [7, "bold"],
    ]);
  });
});
