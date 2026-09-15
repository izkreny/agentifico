// Fixtures go through markdownlint's string input, keyed by the path the rule sees, so nothing is ever written to disk.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lint } from "markdownlint/promise";
import { description as descriptionValue } from "../rules/frontmatter.js";
import boldedParagraphs from "../rules/skill-bolded-paragraphs.js";
import boldedRuns from "../rules/skill-bolded-runs.js";
import continuations from "../rules/skill-continuations.js";
import description from "../rules/skill-description.js";
import parsed from "../rules/skill-frontmatter-parsed.js";
import invocation from "../rules/skill-invocation.js";
import name from "../rules/skill-name.js";
import portablePaths from "../rules/skill-portable-paths.js";
import valeDirective from "../rules/skill-vale-directive.js";

const RULES = [description, parsed, name, invocation, continuations, boldedRuns, boldedParagraphs, portablePaths, valeDirective];

// noInlineConfig is set as check.js sets it, or a fixture's own markdownlint comment would switch off the rule it is there to test.
async function findings(path, content, ...only) {
  const config = { default: false };
  for (const r of only) config[r.names[0]] = true;
  const results = await lint({ strings: { [path]: content }, customRules: RULES, config, noInlineConfig: true });
  return results[path].map((e) => ({ rule: e.ruleNames[0], line: e.lineNumber, detail: e.errorDetail ?? "" }));
}

// The blank line after the frontmatter is deliberate, since the frontmatter pattern swallows it and the reader has to give it back.
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
    // The first line is clean and the one the parser loads carries a trap, so a sweep of the first line would call the winning value clean.
    ["t-dupe-winner-trapped", "name: x\ndescription: Plain and clean.\ndescription: “Use for PR #N”", "curly quotes"],
    ["t-colon", "name: x\ndescription: Use when: reviewing", "colon inside"],
    ["t-tailcolon", "name: x\ndescription: Use when reviewing:", "colon inside"],
    ["t-backslash", 'name: x\ndescription: "matches \\d+ digits"', "risky backslash"],
    ["t-innerdq", 'name: x\ndescription: "say "hi" now"', "inner double quote"],
    ["t-unclosed", 'name: x\ndescription: "never closed', "unclosed double quote"],
    ["t-apostrophe", "name: x\ndescription: 'Don't use'", "apostrophe"],
    ["t-bool", "name: x\ndescription: yes", "boolean"],
    ["t-missing", "name: x", "no description"],
    // Each of these block scalar headers loads, so a finding on any of them is the check libelling correct YAML.
    ["good-block-indent", "name: x\ndescription: |2\n   Use when reviewing X: safe & sound", null],
    ["good-block-indent-chomp", "name: x\ndescription: |-2\n   Use when reviewing X: safe & sound", null],
    ["good-block-chomp-indent", "name: x\ndescription: |2-\n   Use when reviewing X: safe & sound", null],
    ["good-block-comment", "name: x\ndescription: | # note\n  Use when reviewing X: safe & sound", null],
    // A ` #` on a line after a blank line truncates the value exactly as one on the first line does.
    ["t-blank-fold-comment", "name: x\ndescription: one\n  two\n\n  three #x", "TRUNCATED"],
    // A line whose first non-space character is `#` ends a plain scalar while inside a quoted scalar the same line is content, which is why the guard reads the opening character.
    ["good-blank-then-comment", "name: x\ndescription: Use when doing X,\n  and when doing Y.\n\n  # unsure\ncompatibility: node 22", null],
    ["good-comment-line", "name: x\ndescription: one\n  # c\ncompatibility: node 22", null],
    ["good-quoted-hash-continuation", 'name: x\ndescription: "one\n  # two"', null],
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

describe("skill-frontmatter-parsed, the differential", () => {
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
    // The ` #` edit drops the tail of whatever key it lands in, so the differential covers every top-level plain scalar.
    ["good-compat", "name: x\ndescription: |\n  ok\ncompatibility: Requires Node 22 or later", null],
    ["t-compat-comment", "name: x\ndescription: |\n  ok\ncompatibility: Requires Node 22 # and Vale 3.20", "compatibility SILENTLY MUTATED"],
    // good-boolean-key and good-value-on-next-line are the shapes a naive widening reports falsely, and good-nested-key proves neither guard on its own.
    ["good-nested-key", 'name: x\ndescription: |\n  ok\nmetadata:\n  version: "1.0"', null],
    ["good-boolean-key", "name: x\ndescription: |\n  ok\ndisable-model-invocation: true", null],
    ["good-value-on-next-line", "name: x\ndescription: |\n  ok\ncompatibility:\n  Requires Node 22 or later", null],
    ["t-empty", "name: x\ndescription:", "never advertised"],
    ["t-empty-block", "name: x\ndescription: |", "never advertised"],
    ["t-empty-quoted", 'name: x\ndescription: ""', "never advertised"],
    ["t-empty-blank", 'name: x\ndescription: "   "', "never advertised"],
    ["t-toolong", `name: x\ndescription: ${"a".repeat(1025)}`, "1024"],
    // A block scalar is the shape that grows past the cap unnoticed, and its clipped trailing newline is the style's artifact, so the same content passes in either style.
    ["good-compat-at-cap", `name: x\ndescription: |\n  ok\ncompatibility: |\n  ${"a".repeat(500)}`, null],
    ["t-compat-toolong", `name: x\ndescription: |\n  ok\ncompatibility: |\n  ${"a".repeat(501)}`, "500"],
    ["good-compat-plain-at-cap", `name: x\ndescription: |\n  ok\ncompatibility: ${"a".repeat(500)}`, null],
    ["good-desc-block-at-cap", `name: x\ndescription: |\n  ${"a".repeat(1024)}`, null],
    ["t-indicator-over-cap", `name: x\ndescription: |2\n    ${"a".repeat(340)}\n    ${"b".repeat(340)}\n    ${"c".repeat(340)}`, "1024"],
    ["good-block-under-cap", `name: x\ndescription: |\n  ${"a".repeat(340)}\n  ${"b".repeat(340)}\n  ${"c".repeat(339)}`, null],
    ["good-quoted-under-cap", `name: x\ndescription: "${"a".repeat(1023)}"`, null],
    // Each trap fixture asserts the raw text the detail names rather than the finding alone, because a short read reports the same finding for the wrong reason.
    ["good-blank-fold", "name: x\ndescription: one\n  two\n\n  three", null],
    ["t-blank-fold-comment", "name: x\ndescription: one\n  two\n\n  three #x", 'raw line says "one two\\nthree #x"'],
    ["t-two-blank-fold", "name: x\ndescription: one\n\n\n  two #x", 'raw line says "one\\n\\ntwo #x"'],
    ["good-blank-then-key", "name: x\ndescription: one\n  two\n\ncompatibility: c", null],
    ["good-blank-then-comment", "name: x\ndescription: Use when doing X,\n  and when doing Y.\n\n  # unsure\ncompatibility: node 22", null],
    ["good-comment-line", "name: x\ndescription: one\n  # c\ncompatibility: node 22", null],
  ];
  for (const [id, fm, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(fm), parsed);
      if (want) expectDetail(found, "skill-frontmatter-parsed", want);
      else expectClean(found, "skill-frontmatter-parsed");
    });
  }
  it("a blank line after the closing delimiter is not part of the frontmatter", async () => {
    // Without the trailing-blank strip the closing `---` is parsed as a second document and every real skill file reports a parse error.
    expectClean(await findings("fx/x/SKILL.md", skill('name: x\ndescription: |\n  Fine.\nmetadata:\n  version: "1.0"'), parsed), "skill-frontmatter-parsed");
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
    // Each name matches its directory exactly, so only the charset clause can decide it.
    ["My_Skill--v2", "name: My_Skill--v2\ndescription: |\n  x", "lowercase"],
    ["-leading-hyphen", "name: -leading-hyphen\ndescription: |\n  x", "hyphen"],
    // The name is all lowercase letters, so only the length clause can decide it.
    [`${"a".repeat(65)}`, `name: ${"a".repeat(65)}\ndescription: |\n  x`, "over the spec's 64"],
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
    // The rule reads the last description key, the one the skill loads with, so a silent first cannot produce a finding against a second that speaks.
    ["i-dupe-desc", "description: |\n  Nothing about how it is reached.\ndescription: |\n  Explicit invocation only.\ndisable-model-invocation: true", null],
    // The parser cuts a plain scalar at ` #`, so a policy stated in a YAML comment is silent whatever the line says.
    ["i-plain-comment", "description: Use for X # invoked by hand\ndisable-model-invocation: true", silent],
    // Frontmatter the parser rejects still yields description text, so the unloadable file gets the differential's parse error and not a second finding here.
    ["i-unparsed", "description: |\n  Explicit invocation only.\ndisable-model-invocation: true\nother: [1, 2", null],
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

// Each want is a literal from a run against the pinned yaml, because an assertion that asked the parser again could only fail if two calls disagreed about options.
describe("description(), the value a caller reads", () => {
  const cases = [
    ["pipe keeps one trailing newline", ["description: |", "  one", "  two"], "one\ntwo\n"],
    ["pipe-strip keeps none", ["description: |-", "  one", "  two"], "one\ntwo"],
    ["pipe-keep keeps what is there", ["description: |+", "  one", "  two"], "one\ntwo\n"],
    ["a fold joins with a space", ["description: >", "  one", "  two"], "one two\n"],
    ["fold-strip folds and strips", ["description: >-", "  one", "  two"], "one two"],
    ["fold-keep folds and keeps", ["description: >+", "  one", "  two"], "one two\n"],
    ["one blank line is one newline", ["description: >", "  one", "", "  two"], "one\ntwo\n"],
    ["two blank lines are two", ["description: >", "  one", "", "", "  two"], "one\n\ntwo\n"],
    ["a deeper line keeps its breaks", ["description: >", "  one", "    deep", "  two"], "one\n  deep\ntwo\n"],
    ["an indicator wins over the first line", ["description: |3", "   one", "    two"], "one\n two\n"],
    ["an indicator wins on a fold too", ["description: >3", "   one", "    two"], "one\n two\n"],
    ["a duplicate key reads as the last", ["description: |", "  first", "description: |", "  second"], "second\n"],
  ];
  for (const [label, fm, want] of cases) {
    it(label, () => assert.equal(descriptionValue(["name: x", ...fm]), want));
  }
  it("falls back to text a rejected parse cannot supply", () => {
    const got = descriptionValue(["name: x", "description: |", "  Explicit invocation only.", "other: [1, 2"]);
    assert.match(got, /invocation/);
  });
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
    ["c-quoted", "> -\n>   **lead.** its text starts on the line after the marker\n>\n>   the one continuation\n", []],
    ["c-footnote", "text[^1]\n\n[^1]: -\n      **lead.** its text starts on the line after the marker\n", []],
    ["c-markeralone", "-\n  **lead.** its text starts on the line after the marker\n\n  the one continuation\n", []],
  ];
  for (const [id, body, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(`name: ${id}\ndescription: |\n  x`, body), continuations);
      for (const w of want) expectDetail(found, "skill-continuations", w);
      if (!want.length) expectClean(found, "skill-continuations");
    });
  }
  it("frontmatter is not body: its sequence item claims nothing below", async () => {
    // A YAML sequence item under `allowed-tools:` would otherwise read the indented body paragraphs as its continuations.
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

describe("skill-bolded-runs", () => {
  const cap = "cap is 5";
  const bolded = (n, marker = "-") => Array.from({ length: n }, (_, i) => `${marker === "1." ? `${i + 1}.` : marker} **lead ${i}.** the rest\n`).join("");
  const cases = [
    ["b-seven", bolded(7), ["7 bolded-lead items in a row"]],
    ["b-six", bolded(6), ["6 bolded-lead items in a row"]],
    ["b-five", bolded(5), []],
    ["b-broken", `${bolded(3)}- a plain item ends the run\n${bolded(3)}`, []],
    ["b-ordered", bolded(7, "1."), ["7 bolded-lead items in a row"]],
    ["b-spaced", bolded(7).replaceAll("\n", "\n\n"), ["7 bolded-lead items in a row"]],
    ["b-nested", `${bolded(3)}\n  - **inner a.** x\n  - **inner b.** y\n  - **inner c.** z\n\n${bolded(2)}`, []],
    ["b-markeralone", "-\n  **lead.** its text starts on the line after the marker\n".repeat(7), ["7 bolded-lead items in a row"]],
    ["b-quoted", "> -\n>   **lead.** its text starts on the line after the marker\n".repeat(7), ["7 bolded-lead items in a row"]],
    ["b-midbold", "- a lead that is **bolded later** in the line\n".repeat(7), []],
  ];
  for (const [id, body, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(`name: ${id}\ndescription: |\n  x`, body), boldedRuns);
      for (const w of want) expectDetail(found, "skill-bolded-runs", w);
      if (!want.length) expectClean(found, "skill-bolded-runs");
    });
  }
  it("a workflow file is read, not only SKILL.md", async () => {
    expectDetail(await findings("fx/b-sub/workflows/w.md", bolded(7), boldedRuns), "skill-bolded-runs", cap);
  });
  it("names the run's first item", async () => {
    const found = await findings("fx/b-line/w.md", `intro\n\n- a plain item\n${bolded(7)}`, boldedRuns);
    assert.deepEqual(
      found.map((f) => f.line),
      [4],
    );
  });
});

describe("skill-bolded-paragraphs", () => {
  const cap = "cap is 5";
  const bolded = (n) => Array.from({ length: n }, (_, i) => `**lead ${i}.** the rest\n\n`).join("");
  const cases = [
    ["p-seven", bolded(7), ["7 bolded-lead paragraphs in a row"]],
    ["p-six", bolded(6), ["6 bolded-lead paragraphs in a row"]],
    ["p-five", bolded(5), []],
    ["p-plain", `${bolded(3)}a plain paragraph ends the run\n\n${bolded(3)}`, []],
    ["p-heading", `${bolded(3)}## a heading ends the run\n\n${bolded(3)}`, []],
    ["p-setext", `${bolded(3)}a setext heading\n---\n\n${bolded(3)}`, []],
    ["p-fence", `${bolded(3)}\`\`\`bash\necho hi\n\`\`\`\n\n${bolded(3)}`, ["6 bolded-lead paragraphs in a row"]],
    ["p-list", `${bolded(3)}- a plain item\n- another\n\n${bolded(3)}`, ["6 bolded-lead paragraphs in a row"]],
    ["p-table", `${bolded(3)}| a | b |\n| --- | --- |\n| c | d |\n\n${bolded(3)}`, ["6 bolded-lead paragraphs in a row"]],
    ["p-quoted", "> **lead.** a quoted paragraph\n>\n".repeat(7), []],
    ["p-items", "- **lead.** an item\n\n".repeat(7), []],
    ["p-midbold", "a paragraph **bolded later** in the line\n\n".repeat(7), []],
    ["p-endheading", `${bolded(6)}## a heading\n\n`, ["6 bolded-lead paragraphs in a row"]],
    ["p-endplain", `${bolded(6)}a plain paragraph\n\n`, ["6 bolded-lead paragraphs in a row"]],
  ];
  for (const [id, body, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(`name: ${id}\ndescription: |\n  x`, body), boldedParagraphs);
      for (const w of want) expectDetail(found, "skill-bolded-paragraphs", w);
      if (!want.length) expectClean(found, "skill-bolded-paragraphs");
    });
  }
  it("a workflow file is read, not only SKILL.md", async () => {
    expectDetail(await findings("fx/p-sub/workflows/w.md", bolded(7), boldedParagraphs), "skill-bolded-paragraphs", cap);
  });
  it("names the run's first paragraph", async () => {
    const found = await findings("fx/p-line/w.md", `intro\n\n${bolded(7)}`, boldedParagraphs);
    assert.deepEqual(
      found.map((f) => f.line),
      [3],
    );
  });
});

describe("skill-portable-paths", () => {
  // The same characters are a finding inside a code span and nothing in a sentence, where no reader copies them anywhere.
  const cases = [
    ["t-span", "A span `/home/someone/notes.md` here.", "/home/someone/notes.md"],
    ["t-fenced", "```bash\ncat /home/someone/notes.md\n```", "/home/someone/notes.md"],
    ["t-link", "A [note](/Users/someone/notes.md) here.", "/Users/someone/notes.md"],
    ["t-drive", "A span `C:\\Users\\someone\\notes.md` here.", "C:\\Users\\someone\\notes.md"],
    ["good-prose", "The skill reads /home/someone/notes.md in prose, where nobody copies it out.", null],
    ["good-tilde", "A span `~/.agents/skills/foo/SKILL.md` here.", null],
    ["good-relative", "A span `workflows/new.md` and a [link](references/managing.md).", null],
    ["good-skill-dir", "A span `<skill-dir>/scripts/check.js` here.", null],
    // The `s:/` of `https://` is a letter, a colon and a slash, which the drive-letter branch would match.
    ["good-url", "A [link](https://skills.sh) and a span `https://docs.vale.sh/topics/installation`.", null],
    // A URL path can carry /home/ exactly as a filesystem path can.
    ["good-url-home", "A [link](https://example.test/home/someone/notes.md) here.", null],
    // An absolute path is this rule's, so `paths.js` refuses a drive-lettered span for skill-referenced-paths.
    ["t-drive-span", "A span `D:/work/notes.md` here.", "D:/work/notes.md"],
    // Single quotes hide an example path because the rule reads backticked spans and link destinations only.
    ["good-quoted-example", "Never write '/home/someone/notes.md'; write the `~/` form.", null],
  ];
  for (const [id, body, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(`name: ${id}\ndescription: |\n  x`, body), portablePaths);
      if (want) expectDetail(found, "skill-portable-paths", want);
      else expectClean(found, "skill-portable-paths");
    });
  }
  it("names the line the path sits on, not the block's first line", async () => {
    const body = "intro\n\n```bash\necho one\ncat /home/someone/notes.md\n```";
    const found = await findings("fx/p-line/SKILL.md", skill("name: p-line\ndescription: |\n  x", body), portablePaths);
    assert.deepEqual(
      found.map((f) => f.line),
      [11],
    );
  });
});

describe("skill-vale-directive", () => {
  const cases = [
    ["t-off", "<!-- vale off -->\n\nProse the rules no longer read.", true],
    ["t-assignment", "<!-- vale Agentifico.Counts = NO -->\n\nProse.", true],
    ["t-indented", "- item\n\n  <!-- vale off -->\n\n  Prose.", true],
    ["t-inline", "A paragraph carrying <!-- vale off --> mid-sentence.", true],
    ["t-tight", "<!--vale off-->\n\nProse.", true],
    ["t-blockquote", "> <!-- vale on -->\n\nProse.", true],
    ["good-ordinary", "<!-- an ordinary comment -->\n\nProse.", false],
    ["good-span", "A span `<!-- vale off -->` naming the form.", false],
    ["good-fenced", "```markdown\n<!-- vale off -->\n```", false],
    // Vale is case-sensitive here, so a rule reporting <!-- VALE OFF --> would name a file that was never silenced.
    ["good-uppercase", "<!-- VALE OFF -->\n\nProse.", false],
    ["good-prefix", "<!-- valerie wrote this -->\n\nProse.", false],
    // markdownlint's own comments are ignored by the check rather than reported by this rule, so they silence nothing.
    ["good-markdownlint", "<!-- markdownlint-disable -->\n\nProse.", false],
  ];
  for (const [id, body, trips] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(`name: ${id}\ndescription: |\n  x`, body), valeDirective);
      if (trips) expectDetail(found, "skill-vale-directive", "exceptions key");
      else expectClean(found, "skill-vale-directive");
    });
  }
  // Nothing else here would notice the rule reporting a constant line.
  it("names the line the directive sits on, not the item's first line", async () => {
    const body = "- item\n\n  <!-- vale off -->\n\n  Prose.";
    const found = await findings("fx/v-line/SKILL.md", skill("name: v-line\ndescription: |\n  x", body), valeDirective);
    assert.deepEqual(
      found.map((f) => f.line),
      [9],
    );
  });

  // markdownlint masks an HTML comment's content in params.lines, so the context comes off the token.
  it("reports the directive's own text, not the masked line", async () => {
    const results = await lint({
      strings: { "fx/ctx/SKILL.md": skill("name: ctx\ndescription: |\n  x", "<!-- vale off -->") },
      customRules: RULES,
      config: { default: false, "skill-vale-directive": true },
    });
    assert.equal(results["fx/ctx/SKILL.md"][0].errorContext, "<!-- vale off -->");
  });
});
