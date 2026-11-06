// Fixtures go through markdownlint's string input, keyed by the path the rule sees, so nothing is ever written to disk.
import assert from "node:assert/strict";
import { lint } from "markdownlint/promise";
import { describe, it } from "vitest";
import agentFrontmatter, { defects as agentDefects, pluginNameWarnings } from "../rules/agent-frontmatter.js";
import { description as descriptionValue, scalar } from "../rules/frontmatter.js";
import { hooksDefects, manifestDefects, monitorFileDefects } from "../rules/plugin-files.js";
import argumentHint from "../rules/skill-argument-hint.js";
import argumentPlaceholders from "../rules/skill-argument-placeholders.js";
import bashBlocks from "../rules/skill-bash-blocks.js";
import boldedParagraphs from "../rules/skill-bolded-paragraphs.js";
import boldedRuns from "../rules/skill-bolded-runs.js";
import continuations from "../rules/skill-continuations.js";
import description from "../rules/skill-description.js";
import fork from "../rules/skill-fork.js";
import parsed from "../rules/skill-frontmatter-parsed.js";
import hardWrap from "../rules/skill-hard-wrap.js";
import injectedCommands from "../rules/skill-injected-commands.js";
import invocation from "../rules/skill-invocation.js";
import name from "../rules/skill-name.js";
import packageRunners from "../rules/skill-package-runners.js";
import portablePaths from "../rules/skill-portable-paths.js";
import referencedPaths from "../rules/skill-referenced-paths.js";
import valeDirective from "../rules/skill-vale-directive.js";

const RULES = [
  description,
  parsed,
  name,
  invocation,
  fork,
  agentFrontmatter,
  continuations,
  boldedRuns,
  boldedParagraphs,
  hardWrap,
  portablePaths,
  valeDirective,
  argumentHint,
  bashBlocks,
  referencedPaths,
  argumentPlaceholders,
  injectedCommands,
  packageRunners,
];

// noInlineConfig is set as check.js sets it, or a fixture's own markdownlint comment would switch off the rule it is there to test.
async function findings(path, content, ...only) {
  const config = { default: false };
  for (const r of only) {
    config[r.names[0]] = true;
  }
  const results = await lint({ strings: { [path]: content }, customRules: RULES, config, noInlineConfig: true });
  return results[path].map((e) => ({ rule: e.ruleNames[0], line: e.lineNumber, detail: e.errorDetail ?? "", context: e.errorContext }));
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
    // An escaped closing quote leaves the value open, and a quote found later in it does not close it.
    ["t-unclosed-escaped", 'name: x\ndescription: "a\\"', "unclosed double quote"],
    // A blank line folds into a newline, and text after the closing quote stays text after the quote across that fold.
    ["t-double-then-text", 'name: x\ndescription: "a"\n\n  b', "parse error"],
    ["t-single-then-text", "name: x\ndescription: 'a'\n\n  b", "parse error"],
    ["t-single-across-blank", "name: x\ndescription: 'a'\n\n  b'", "stray apostrophe"],
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
    ["t-xml-open", "name: x\ndescription: Formats <output> blocks.", "XML tag"],
    ["t-xml-close", "name: x\ndescription: Formats blocks up to </output>.", "XML tag"],
    ["t-xml-self-closing", "name: x\ndescription: Formats a <br/> well.", "XML tag"],
    ["t-xml-attribute", 'name: x\ndescription: |\n  Formats a <a href="x"> link.', "XML tag"],
    ["t-xml-block", "name: x\ndescription: >-\n  Formats\n  <output> blocks.", "XML tag"],
    ["t-xml-quoted", 'name: x\ndescription: "Formats <output> blocks."', "XML tag"],
    ["t-xml-single-quoted", "name: x\ndescription: 'Formats <output> blocks.'", "XML tag"],
    ["t-xml-folded", "name: x\ndescription: Formats\n  <output> blocks.", "XML tag"],
    ["t-xml-placeholder", "name: x\ndescription: Reads <branch> names.", "XML tag"],
    ["good-less-than", "name: x\ndescription: Use when a < b and c > d.", null],
    ["good-tight-number", "name: x\ndescription: Use when a<5 or b>3.", null],
    ["good-arrow", "name: x\ndescription: Use for a -> b and c <- d.", null],
    ["good-tag-in-comment", 'name: x\ndescription: "Plain." # <note>', null],
    ["good-quoted-wide-comment", 'name: x\ndescription: "Plain."  # two spaces before the note', null],
    ["good-inner-curly", "name: x\ndescription: Use for the repository’s own skills.", null],
    ["good-inner-ampersand", "name: x\ndescription: Fix bugs & ship", null],
    ["good-ends-in-no", "name: x\ndescription: Say no", null],
    ["good-strip-block", "name: x\ndescription: |-\n  Use when reviewing X: safe & sound", null],
    ["good-block-wide-comment", "name: x\ndescription: |  # two spaces before the note\n  Use when reviewing X: safe & sound", null],
    // Only a header can follow the indicator, so text after it is a plain scalar with its traps.
    ["t-indicator-then-text", "name: x\ndescription: >bad: value", "colon inside"],
    ["good-apostrophe-then-comment-line", "name: x\ndescription: it's one\n  # c\ncompatibility: node 22", null],
    ["t-spaced-blank-fold-comment", "name: x\ndescription: one\n  two\n  \n  three #x", "TRUNCATED"],
    ["t-one-space-fold-comment", "name: x\ndescription: one\n two #x", "TRUNCATED"],
  ];
  for (const [id, fm, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(fm), description);
      if (want) {
        expectDetail(found, "skill-description", want);
      } else {
        expectClean(found, "skill-description");
      }
    });
  }
  it("a file with no frontmatter at all has no description", async () => {
    expectDetail(await findings("fx/bare/SKILL.md", "body\n", description), "skill-description", "no description");
  });
  it("a truncation says how many characters it loses", async () => {
    expectDetail(
      await findings("fx/t-count/SKILL.md", skill("name: x\ndescription: review PR #N and more"), description),
      "skill-description",
      "loses 12 chars",
    );
  });
  it("an XML tag's finding says what carries a placeholder instead", async () => {
    const found = await findings("fx/xml-remedy/SKILL.md", skill("name: x\ndescription: Reads <branch> names."), description);
    expectDetail(found, "skill-description", "square brackets");
    expectDetail(found, "skill-description", "argument-hint");
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
    ["t-colon", "name: x\ndescription: Use when: reviewing", "PARSE ERROR, skill will not load: Nested mappings are not allowed"],
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
    // A nested key is no top-level key, though its name is one.
    ["good-nested-shadow", "name: x\nmetadata:\n  description: other\ndescription: real", null],
    ["t-strip-over-cap", `name: x\ndescription: |-\n  ${"a".repeat(512)}\n  ${"b".repeat(512)}`, "1025 characters"],
    ["t-scalar", "just a scalar", "not a mapping"],
    ["t-comment-only", "# only a comment", "not a mapping"],
    ["t-apostrophe-truncated", "name: x\ndescription: |\n  d\ncompatibility: node's 22 #c", "SILENTLY MUTATED"],
  ];
  for (const [id, fm, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(fm), parsed);
      if (want) {
        expectDetail(found, "skill-frontmatter-parsed", want);
      } else {
        expectClean(found, "skill-frontmatter-parsed");
      }
    });
  }
  it("an absent or bare description is never called the wrong type", async () => {
    const results = await Promise.all(["name: x", "name: x\ndescription:"].map((fm) => findings("fx/x/SKILL.md", skill(fm), parsed)));
    for (const found of results) {
      assert.ok(!has(found, "skill-frontmatter-parsed", "not a string"), JSON.stringify(found));
    }
  });
  it("a duplicate key is compared once, against the value that wins", async () => {
    const found = await findings("fx/x/SKILL.md", skill("name: x\ndescription: |\n  d\ncompatibility: one\ncompatibility: two #c"), parsed);
    assert.deepEqual(
      found.map((f) => f.detail),
      ['compatibility SILENTLY MUTATED: raw line says "one" but parses as "two"'],
    );
  });
  it("a file with no frontmatter has nothing to parse", async () => {
    expectClean(await findings("fx/x/SKILL.md", "body\n", parsed), "skill-frontmatter-parsed");
  });
  it("a closing delimiter with trailing spaces still closes", async () => {
    expectClean(await findings("fx/x/SKILL.md", "---\nname: x\ndescription: |\n  Fine.\n---  \n\nbody\n", parsed), "skill-frontmatter-parsed");
  });
  it("a whitespace-only line after the closing delimiter is not part of the frontmatter", async () => {
    expectClean(await findings("fx/x/SKILL.md", "---\nname: x\ndescription: |\n  Fine.\n---\n   \n\nbody\n", parsed), "skill-frontmatter-parsed");
  });
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
    // The last name loads, so a matching first line must not hide a mismatching last one.
    ["dup", 'name: "dup"\nname: other\ndescription: |\n  x', 'name is "other", directory is "dup"'],
    ["dupkey", "name: dupkey\nname: dupkey\ndescription: |\n  x", "duplicate name key"],
    // Each name matches its directory exactly, so only the charset clause can decide it.
    ["My_Skill--v2", "name: My_Skill--v2\ndescription: |\n  x", "lowercase"],
    ["-leading-hyphen", "name: -leading-hyphen\ndescription: |\n  x", "hyphen"],
    ["trailing-hyphen-", "name: trailing-hyphen-\ndescription: |\n  x", "hyphen"],
    // The name is all lowercase letters, so only the length clause can decide it.
    [`${"a".repeat(65)}`, `name: ${"a".repeat(65)}\ndescription: |\n  x`, "over the spec's 64"],
    [`${"a".repeat(64)}`, `name: ${"a".repeat(64)}\ndescription: |\n  x`, null],
  ];
  for (const [dir, fm, want] of cases) {
    it(dir, async () => {
      const found = await findings(`fx/${dir}/SKILL.md`, skill(fm), name);
      if (want) {
        expectDetail(found, "skill-name", want);
      } else {
        expectClean(found, "skill-name");
      }
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
    // A name is matched literally, so a dot in it is not a wildcard that a slash command could miss.
    ["i.dot", "description: |\n  Type `/i.dot` yourself.\ndisable-model-invocation: true", null],
    ["i-quote-in-comment", 'description: |\n  Explicit invocation only.\nuser-invocable: true # "really"', null],
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
      if (want) {
        expectDetail(found, "skill-invocation", want);
      } else {
        expectClean(found, "skill-invocation");
      }
    });
  }
});

describe("skill-fork", () => {
  const idle = "agent does nothing without context: fork";
  const cases = [
    ["f-agent-alone", "agent: Explore", idle],
    ["f-agent-inline", "context: inline\nagent: Explore", idle],
    ["f-agent-empty-context", "context:\nagent: Explore", idle],
    ["f-forked", "context: fork\nagent: Explore", null],
    ["f-fork-alone", "context: fork", null],
    ["f-neither", "description: |\n  Neither field.", null],
    ["f-fork-comment", "context: fork # runs in a subagent\nagent: Explore", null],
    ["f-fork-quoted", 'context: "fork"\nagent: Explore', null],
    ["f-fork-next-line", "context:\n  fork\nagent: Explore", null],
    ["f-fork-block", "context: >-\n  fork\nagent: Explore", null],
    // A clipped block keeps its line break, and Claude Code compares the value to `fork` exactly, so the skill runs inline.
    ["f-fork-literal", "context: |\n  fork\nagent: Explore", idle],
    ["f-fork-folded", "context: >\n  fork\nagent: Explore", idle],
    // Frontmatter the parser rejects gets the differential's parse error and not a second finding here.
    ["f-unparsed", "agent: Explore\nother: [1, 2", null],
    // The last key is the one a last-wins parser loads, so a fork overridden by a later key is the idle case.
    ["f-dupe-context", "context: fork\ncontext: inline\nagent: Explore", idle],
  ];
  for (const [dir, fm, want] of cases) {
    it(dir, async () => {
      const found = await findings(`fx/${dir}/SKILL.md`, skill(`name: ${dir}\n${fm}`), fork);
      if (want) {
        expectDetail(found, "skill-fork", want);
      } else {
        expectClean(found, "skill-fork");
      }
    });
  }
  it("leaves a file other than SKILL.md alone", async () => {
    expectClean(await findings("fx/f/workflows/w.md", skill("agent: Explore"), fork), "skill-fork");
  });
  it("frontmatter that loads as no mapping holds no agent", async () => {
    expectClean(await findings("fx/f-comment/SKILL.md", skill("# only a comment"), fork), "skill-fork");
    expectClean(await findings("fx/f-scalar/SKILL.md", skill("just a scalar"), fork), "skill-fork");
  });
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
    assert.equal(got, "  Explicit invocation only.");
  });
  it("an escaped closing quote leaves a double-quoted scalar unclosed, so it is read as written", () => assert.equal(scalar('"a\\"'), '"a\\"'));
  for (const [raw, want] of [
    ["'it''s'", "it's"],
    ["'plain' # a note", "plain"],
    ["'never closed", "'never closed"],
  ]) {
    it(`a single-quoted scalar: ${raw}`, () => assert.equal(scalar(raw), want));
  }
  it("frontmatter holding only a comment has no description", () => assert.equal(descriptionValue(["# only a comment"]), ""));
  it("an apostrophe inside a plain scalar opens no quote", () => assert.equal(scalar("it's fine # a note"), "it's fine"));
  it("a scalar that is only a comment is empty", () => assert.equal(scalar(" # only a note"), ""));
  it("the fallback ends a block at the first line with no indent", () => {
    assert.equal(descriptionValue(["description: |", "  text", "other: [1, 2"]), "  text");
    assert.equal(descriptionValue(["description: |", "  text", "other: [1, 2", "  more"]), "  text");
  });
  it("the fallback reads a description on the first line", () => assert.equal(descriptionValue(["description: |", "  text", "other: [1, 2"]), "  text"));
  it("the fallback reads a plain description", () => assert.equal(descriptionValue(["name: x", "description: plain text", "other: [1, 2"]), "plain text"));
  it("an escaped quote inside a double-quoted scalar is the quote", () => assert.equal(scalar('"say \\"hi\\""'), 'say "hi"'));
  it("the fallback keeps a block's lines and the blank line between them", () => {
    const got = descriptionValue(["name: x", "description: |", "  one", "", "  two", "other: [1, 2"]);
    assert.equal(got, "  one\n\n  two");
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
    ["c-leadcode", "-     indented code as the lead\n\n  first.\n\n  second.\n", [`2 ${cap}`]],
    ["c-quoted", "> -\n>   **lead.** its text starts on the line after the marker\n>\n>   the one continuation\n", []],
    ["c-footnote", "text[^1]\n\n[^1]: -\n      **lead.** its text starts on the line after the marker\n", []],
    ["c-markeralone", "-\n  **lead.** its text starts on the line after the marker\n\n  the one continuation\n", []],
    ["c-quoted-two", "> - **lead.** first line\n>\n>   the reason\n>\n>   a second paragraph\n", [`2 ${cap}`]],
    // A link definition is no paragraph, so it is not a continuation.
    ["c-definition", "- **lead.** first line\n\n  the reason\n\n  [x]: https://example.com\n", []],
  ];
  for (const [id, body, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(`name: ${id}\ndescription: |\n  x`, body), continuations);
      for (const w of want) {
        expectDetail(found, "skill-continuations", w);
      }
      if (want.length === 0) {
        expectClean(found, "skill-continuations");
      }
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
    // An item with no lead block has no bolded lead, so it ends the run as a plain item does.
    ["b-empty-item", `${bolded(5)}-\n${bolded(1)}`, []],
  ];
  for (const [id, body, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(`name: ${id}\ndescription: |\n  x`, body), boldedRuns);
      for (const w of want) {
        expectDetail(found, "skill-bolded-runs", w);
      }
      if (want.length === 0) {
        expectClean(found, "skill-bolded-runs");
      }
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
      for (const w of want) {
        expectDetail(found, "skill-bolded-paragraphs", w);
      }
      if (want.length === 0) {
        expectClean(found, "skill-bolded-paragraphs");
      }
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
    ["good-home-dir", "A span `<home-dir>/.agents/skills/foo/SKILL.md` here.", null],
    ["good-tilde-form", "Write a user location as `~/` inside a command.", null],
    ["good-tilde-fenced", "```bash\nls ~/.agents/skills/foo\n```", null],
    // A command pasted into a shell expands `~` and not a placeholder, and prose names a root without claiming a shell.
    ["t-tilde-prose", "A span `~/.agents/skills/foo/SKILL.md` here.", "~/.agents/skills/foo/SKILL.md"],
    ["t-tilde-inline", "A span `cat ~/.agents/skills/foo/SKILL.md` here.", "~/.agents/skills/foo/SKILL.md"],
    ["t-tilde-quoted", 'A span `cat "~/.agents/x.md"` here.', "~/.agents/x.md"],
    ["t-tilde-flag", "A span `--dir=~/.agents/x` here.", "~/.agents/x"],
    ["t-tilde-path-list", 'A span `export PATH="$PATH:~/.local/bin"` here.', "~/.local/bin"],
    ["good-tilde-in-word", "A span `a~/b.md` here.", null],
    ["good-tilde-after-slash", "A span `foo/~/bar.md` here.", null],
    ["good-tilde-in-url", "A span `https://h/~/x.md` here.", null],
    ["t-home-dir-fenced", "```bash\nls <home-dir>/.agents/skills/foo\n```", "<home-dir>/.agents/skills/foo"],
    ["good-relative", "A span `workflows/new.md` and a [link](references/managing.md).", null],
    ["good-skill-dir", "A span `<skill-dir>/scripts/check.js` here.", null],
    // The `s:/` of `https://` is a letter, a colon and a slash, which the drive-letter branch would match.
    ["good-url", "A [link](https://skills.sh) and a span `https://docs.vale.sh/topics/installation`.", null],
    // A URL path can carry /home/ exactly as a filesystem path can.
    ["good-url-home", "A [link](https://example.test/home/someone/notes.md) here.", null],
    // An absolute path is this rule's, so `paths.js` refuses a drive-lettered span for skill-referenced-paths.
    ["t-drive-span", "A span `D:/work/notes.md` here.", "D:/work/notes.md"],
    // Single quotes hide an example path because the rule reads backticked spans and link destinations only.
    ["good-quoted-example", "Never write '/home/someone/notes.md'; write the `<home-dir>/` form.", null],
  ];
  for (const [id, body, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(`name: ${id}\ndescription: |\n  x`, body), portablePaths);
      if (want) {
        expectDetail(found, "skill-portable-paths", want);
      } else {
        expectClean(found, "skill-portable-paths");
      }
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
    // Vale honours a comment anywhere in an HTML block, not only where the block opens.
    ["t-html-block", "<div>\n<!-- vale off -->\n</div>\n\nProse.", true],
    ["t-html-mid-line", "<div>x <!-- vale off --></div>\n\nProse.", true],
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
      if (trips) {
        expectDetail(found, "skill-vale-directive", "exceptions key");
      } else {
        expectClean(found, "skill-vale-directive");
      }
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

  it("names the line inside an HTML block that holds the directive, and quotes it", async () => {
    const body = "<div>\n<!-- vale off -->\n</div>";
    const found = await findings("fx/v-block/SKILL.md", skill("name: v-block\ndescription: |\n  x", body), valeDirective);
    assert.deepEqual(
      found.map((f) => [f.line, f.context]),
      [[8, "<!-- vale off -->"]],
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

describe("skill-argument-hint", () => {
  const unrouted = (verb) => `advertises \`${verb}\``;
  const unadvertised = (verb) => `routes \`${verb}\``;
  const routing = (...bullets) => `## Routing\n\n${bullets.map((b) => `- ${b}`).join("\n")}`;
  const cases = [
    ["h-clean", "[new <name> | check [<path>...]]", routing("If it starts with `new` → read a.", "If it starts with `check` → read b."), null],
    ["h-unrouted", "[new | check | export]", routing("If it starts with `new` → read a.", "If it starts with `check` → read b."), unrouted("export")],
    ["h-unadvertised", "[new]", routing("If it starts with `new` → read a.", "If it starts with `check` → read b."), unadvertised("check")],
    ["h-exactly", "[help | status]", routing("If the argument is exactly `help` → print it.", "If it starts with `status` → read a."), null],
    ["h-list", "[state | start | close]", routing("If it starts with `state`, `start` or `close` → read a."), null],
    // CommonMark reads a line ending inside a code span as a space, so the words either side stay apart.
    ["h-span-broken", "[new]", routing("If it starts with `new\n  mode` → read a."), null],
    // Everything after the arrow names files, tools and other skills, so a span there routes nothing.
    [
      "h-after-arrow",
      "[ready]",
      routing("If it starts with `ready` → read `workflows/ready.md`. **If it also contains `review`** → continue, then `TaskStop`."),
      null,
    ],
    ["h-placeholder", "[<pr-number> | fix <pr-number>]", routing("If the argument starts with `fix` → read a.", "Otherwise → read b."), null],
    // Neither the empty route nor the catch-all carries a span before its arrow, so neither is a verb.
    ["h-empty-and-catch-all", "[check]", routing("If it starts with `check`, or is empty → read a.", "If it matches no verb in this list → say so."), null],
    [
      "h-sentence-span",
      "[create issues for X | next]",
      routing("If it starts with `next` → read a.", "If the argument reads as prose - `create issues for X` - → read b."),
      null,
    ],
    ["h-heading-case", "[new | check]", "## Explicit routing\n\n- If it starts with `new` → read a.", unrouted("check")],
    ["h-table-ignored", "[merge]", "## Routing\n\n| Says | Workflow |\n|---|---|\n| `land it` | `merge` |\n\n- If it starts with `merge` → read a.", null],
    ["h-section-ends", "[new]", "## Routing\n\n- If it starts with `new` → read a.\n\n## Supporting files\n\n- If it starts with `check` → read b.", null],
    ["h-no-hint", null, routing("If it starts with `new` → read a."), null],
    ["h-no-routing", "[text | file] [issues | style]", "## Arguments\n\n- If it starts with `text` → read a.", null],
    // A routing section the rule reads no route from cannot be told from one that routes nothing, so it is left alone.
    [
      "h-table-routing",
      "[new | check]",
      "## Routing\n\n| Says | Workflow |\n|---|---|\n| `new` | `workflows/new.md` |\n| `check` | `workflows/check.md` |",
      null,
    ],
    ["h-no-arrow", "[new | check]", routing("If it starts with `new`, read a.", "If it starts with `check`, read b."), null],
    // A `|` inside a nested bracket separates that bracket's alternatives, not the outer group's.
    ["h-nested-group", "[manage [x | y]] [new | check]", routing("If it starts with `new` → read a.", "If it starts with `check` → read b."), null],
    [
      "h-between-groups",
      "[new | check] or [help | status]",
      routing(
        "If it starts with `new` → read a.",
        "If it starts with `check` → read b.",
        "If it starts with `help` → read c.",
        "If it starts with `status` → read d.",
      ),
      null,
    ],
    [
      "h-subsection",
      "[new]",
      "## Routing\n\n- If it starts with `new` → read a.\n\n### Detail\n\n- If it starts with `check` → read b.",
      unadvertised("check"),
    ],
    ["h-arrow-in-span", "[new]", routing("If it starts with `new` → read a.", "If it names `a→b` or starts with `check` → read b."), unadvertised("check")],
    ["h-placeholder-span", "[new]", routing("If it starts with `new` or `<n>` → read a."), null],
    // Only an item's lead paragraph states its route, so a later paragraph in the item routes nothing.
    ["h-continuation", "[new]", "## Routing\n\n- If it starts with `new` → read a.\n\n  If it starts with `check` → read b.", null],
    ["h-definition-item", "[new]", "## Routing\n\n- If it starts with `new` → read a.\n- [a]: https://example.com", null],
    ["h-lone-first-group", "[manage] [new | check]", routing("If it starts with `new` → read a.", "If it starts with `check` → read b."), null],
    // A group with no `|` is a placeholder, as in the [issue-number] and [filename] [format] hints Claude Code's own docs show.
    ["h-bare-placeholder", "[new | check] [issue-number]", routing("If it starts with `new` → read a.", "If it starts with `check` → read b."), null],
    // The documented gap: a one-word group is not held to routing, so its unrouted verb passes.
    ["h-lone-group-unchecked", "[new | check] [manage]", routing("If it starts with `new` → read a.", "If it starts with `check` → read b."), null],
    ["h-bare-placeholders", "[new | check] [filename] [format]", routing("If it starts with `new` → read a.", "If it starts with `check` → read b."), null],
    // Each pairs the bold bullet with a plain one, since a section routing nothing is left alone whatever the bold does.
    ["h-bold-condition", "[new | check]", routing("**If it starts with `new`** → read a.", "If it starts with `check` → read b."), null],
    ["h-bold-arrow", "[new | check]", routing("**If it starts with `new` → read a.**", "If it starts with `check` → read b."), null],
    ["h-nested", "[new | check]", "## Routing\n\n- If it starts with `new` → read a.\n  - If it starts with `check` → read b.", null],
    ["h-setext", "[new]", "Routing\n-------\n\n- If it starts with `new` → read a.\n- If it starts with `check` → read b.", unadvertised("check")],
    // A level-2 heading inside a level-1 routing section is a subsection of it, so the bullets under it still route.
    [
      "h-setext-level",
      "[new]",
      "Routing\n=======\n\n- If it starts with `new` → read a.\n\nDetail\n------\n\n- If it starts with `check` → read b.",
      unadvertised("check"),
    ],
    // A setext underline may carry trailing spaces, which do not change its level.
    [
      "h-setext-trailing",
      "[new]",
      "Routing\n=======  \n\n- If it starts with `new` → read a.\n\nDetail\n------\n\n- If it starts with `check` → read b.",
      unadvertised("check"),
    ],
    [
      "h-setext-ends",
      "[new]",
      "Routing\n-------\n\n- If it starts with `new` → read a.\n\nSupporting files\n----------------\n\n- If it starts with `check` → read b.",
      null,
    ],
    // A word that is not a bare lowercase word all the way through is a placeholder or a target, not a verb.
    ["h-capital-word", "[Fix | new]", routing("If it starts with `new` → read a."), null],
    ["h-path-word", "[new | check/x]", routing("If it starts with `new` → read a."), null],
    // Only an item's lead paragraph states its route, so a continuation's arrow routes nothing.
    ["h-continuation", "[new]", "## Routing\n\n- If it starts with `new` → read a.\n\n  Then `check` → b.", null],
    // A definition opening an item's lead block leaves the paragraph after it to be read.
    [
      "h-definition-lead",
      "[new | check]",
      "## Routing\n\n- [d]: https://example.com\n  If it starts with `new` → read a.\n- If it starts with `check` → read b.",
      null,
    ],
    // A fence opening an item holds no paragraph, so the paragraph after it is the item's lead.
    [
      "h-fence-lead",
      "[new]",
      "## Routing\n\n- If it starts with `new` → read a.\n- ```\n  x\n  ```\n\n  If it starts with `check` → read b.",
      unadvertised("check"),
    ],
  ];
  for (const [id, hint, body, want] of cases) {
    it(id, async () => {
      const fm = hint === null ? `name: ${id}` : `name: ${id}\nargument-hint: "${hint}"`;
      const found = await findings(`fx/${id}/SKILL.md`, skill(fm, body), argumentHint);
      if (want) {
        expectDetail(found, "skill-argument-hint", want);
      } else {
        expectClean(found, "skill-argument-hint");
      }
    });
  }
  it("reads no hint from frontmatter that is missing, does not parse, or loads as no mapping", async () => {
    const body = routing("If it starts with `new` → read a.");
    expectClean(await findings("fx/h-none/SKILL.md", `${body}\n`, argumentHint), "skill-argument-hint");
    expectClean(await findings("fx/h-unparsed/SKILL.md", skill('argument-hint: "[new | check]"\nother: [1, 2', body), argumentHint), "skill-argument-hint");
    expectClean(await findings("fx/h-comment/SKILL.md", skill("# only a comment", body), argumentHint), "skill-argument-hint");
  });
  it("leaves a file other than SKILL.md alone", async () => {
    const body = routing("If it starts with `new` → read a.");
    expectClean(await findings("fx/h/workflows/w.md", skill('argument-hint: "[check]"', body), argumentHint), "skill-argument-hint");
  });
  // markdownlint admits no line inside the frontmatter, so an unrouted verb lands on the first body line as every frontmatter finding does.
  it("names the first body line for an unrouted verb and the bullet's line for an unadvertised one", async () => {
    const body = routing("If it starts with `new` → read a.", "If it starts with `check` → read b.");
    const found = await findings("fx/h-lines/SKILL.md", skill('name: h-lines\nargument-hint: "[new | export]"', body), argumentHint);
    assert.deepEqual(
      found.map((f) => f.line).sort((a, b) => a - b),
      [6, 9],
    );
  });
});

describe("skill-bash-blocks", () => {
  const cases = [
    ["b-fish", "```fish\necho hi\n```", "tagged fish"],
    ["b-zsh", "```zsh\necho hi\n```", "tagged zsh"],
    ["b-set", "```bash\nset files (ls)\n```", "set <name> ("],
    ["b-or", "```sh\nmake; or echo failed\n```", "; or"],
    ["b-and", "```\nmake; and make install\n```", "; and"],
    ["good-bash", '```bash\nset -euo pipefail\nfiles=$(ls) && echo "$files"\n```', null],
    ["good-text-tag", "```text\nset files (ls); or echo failed\n```", null],
    // check.md and new.md name the phrasings in code spans, which no agent executes.
    ["good-span", "Fish writes `set x (cmd)` and `; or`.", null],
    ["good-comment", "```bash\n# build; and then test\nmake\n```", null],
    ["good-word", "```bash\nmake; order-files\n```", null],
    // A heredoc body and a quoted string are data the command carries, never syntax Bash runs.
    ["good-heredoc", "```bash\ncat > body.md <<'EOF'\nFixed it; and pushed.\nEOF\n```", null],
    ["good-heredoc-bare", "```bash\ncat > body.md <<EOF\nset files (ls)\nEOF\n```", null],
    ["good-double-quoted", '```bash\ngh pr comment 1 -b "fixed; or not"\n```', null],
    ["good-single-quoted", "```bash\necho 'a; and b'\n```", null],
    ["b-beside-quotes", '```bash\necho "x"; or echo y\n```', "; or"],
    ["b-after-heredoc", "```bash\ncat <<EOF\nok\nEOF\nmake; and true\n```", "; and"],
    // A `<<` inside quotes or arithmetic is no heredoc, so the lines after it are still read.
    ["b-quoted-shift", '```bash\necho "a << b"\nmake; and true\n```', "; and"],
    ["b-arith-shift", "```bash\necho $(( 1 << 2 ))\nmake; and true\n```", "; and"],
    ["b-arith-var", "```bash\necho $(( x << y ))\nmake; and true\n```", "; and"],
    ["b-hyphen-bare", "```bash\ncat <<END-BODY\nok\nEND-BODY\nmake; and true\n```", "; and"],
    ["good-heredoc-after-quote", "```bash\necho 'a' && cat <<EOF\nfixed; and pushed\nEOF\n```", null],
    ["good-heredoc-touching-quote", "```bash\ncat 'f'<<EOF\nfixed; and pushed\nEOF\n```", null],
    ["b-after-quoted-terminator", "```bash\ncat <<'EOF'\nfixed; and pushed\nEOF\nmake; and true\n```", "; and"],
    ["b-after-double-quoted-terminator", '```bash\ncat <<"EOF"\nfixed; and pushed\nEOF\nmake; and true\n```', "; and"],
    // Without the dash, a tab before the terminator makes it a line of the body.
    ["good-tab-without-dash", "```bash\ncat <<EOF\n\tEOF\nfixed; and pushed\nEOF\n```", null],
    // <<- strips every leading tab from the terminator line and nothing else.
    ["b-tabs-terminator", "```bash\ncat <<-EOF\n\tok\n\t\tEOF\nmake; and true\n```", "; and"],
    ["good-tab-after-terminator", "```bash\ncat <<-EOF\nEOF\t\nfixed; and pushed\nEOF\n```", null],
    ["good-hyphen-quoted", "```bash\ncat <<'END-BODY'\nfixed; and pushed\nEND-BODY\n```", null],
    ["good-digit-terminator", "```bash\ncat <<1EOF\nfixed; and pushed\n1EOF\n```", null],
    ["good-backslash-heredoc", "```bash\ncat > body.md <<\\EOF\nFixed it; and pushed.\nEOF\n```", null],
    // Bash ends a heredoc only on its exact terminator line, stripping leading tabs for `<<-` alone.
    ["good-indented-terminator", "```bash\ncat <<EOF\nok\n  EOF\nset files (ls)\nEOF\n```", null],
    ["b-tab-terminator", "```bash\ncat <<-EOF\n\tok\n\tEOF\nmake; and true\n```", "; and"],
    ["b-set-after-command", "```bash\ntrue; set files (ls)\n```", "set <name> ("],
    ["b-set-wide-name", "```bash\nset  files (ls)\n```", "set <name> ("],
    ["b-set-wide-paren", "```bash\nset files  (ls)\n```", "set <name> ("],
    ["b-or-unspaced", "```bash\nmake;or true\n```", "; or"],
    ["b-and-unspaced", "```bash\nmake;and true\n```", "; and"],
    ["good-double-quoted-heredoc", '```bash\ncat <<"EOF"\nfixed; and pushed\nEOF\n```', null],
    ["b-after-backslash-terminator", "```bash\ncat <<\\EOF\nok\nEOF\nmake; and true\n```", "; and"],
    // A comment after code on the same line leaves that line's code to be read.
    ["b-trailing-comment", "```bash\nmake; and true # then deploy\n```", "; and"],
    ["good-indented-comment", "```bash\n  # build; and then test\n```", null],
    // A quoted string touching the next word shrinks to an empty quote pair, so the word is not read as opening the line.
    ["good-quote-before-set", '```bash\necho "x"set files (ls)\n```', null],
    // The opening fence carries words after its tag, which are no command.
    ["good-fence-meta", "```bash title; and more\necho hi\n```", null],
    ["b-in-list-item", "- a step\n\n  ```fish\n  echo hi\n  ```", "tagged fish"],
  ];
  for (const [id, body, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(`name: ${id}`, body), bashBlocks);
      if (want) {
        expectDetail(found, "skill-bash-blocks", want);
      } else {
        expectClean(found, "skill-bash-blocks");
      }
    });
  }
  it("a workflow file is read, not only SKILL.md", async () => {
    expectDetail(await findings("fx/b/workflows/w.md", "```fish\necho hi\n```\n", bashBlocks), "skill-bash-blocks", "tagged fish");
  });
  it("says what to write instead", async () => {
    const found = await findings("fx/b-advice/SKILL.md", skill("name: b-advice", "```fish\necho hi\n```"), bashBlocks);
    assert.deepEqual(
      found.map((f) => f.detail),
      ["a fenced block tagged fish: write it in Bash, the shell an agent runs commands through"],
    );
  });
  it("names the fence's line for a tag and the command's line for a phrase", async () => {
    const body = "```fish\necho hi\n```\n\n```bash\necho one\nmake; or true\n```";
    const found = await findings("fx/b-lines/SKILL.md", skill("name: b-lines", body), bashBlocks);
    assert.deepEqual(
      found.map((f) => f.line),
      [5, 11],
    );
  });
});

describe("agent-frontmatter", () => {
  // A path under .claude/agents/ is an agents directory by its name alone, so these fixtures need no tree on disk.
  const cases = [
    ["clean", "name: code-reviewer\ndescription: Reviews code.", null],
    // The sub-agents page bars neither, so a rule holding an agent's name to a skill's charset would flag a file Claude Code loads.
    ["capital-underscore", "name: Code_Reviewer\ndescription: Reviews code.", null],
    ["no-name", "description: Reviews code.", "no name"],
    ["colon", "name: my:reviewer\ndescription: Reviews code.", 'contains ":"'],
    ["leading-dash", "name: -reviewer\ndescription: Reviews code.", 'starts with "-"'],
    ["at-limit", `name: ${"a".repeat(256)}\ndescription: Reviews code.`, null],
    ["over-limit", `name: ${"a".repeat(257)}\ndescription: Reviews code.`, "257 characters"],
    // WHY: claude plugin validate 2.1.318 passes a timestamp and a binary as a name and rejects a mapping, a list and a set.
    ["timestamp-name", "name: 2026-11-06\ndescription: Reviews code.", null],
    ["merged-timestamp-name", "<<: {name: 2026-11-06}\ndescription: Reviews code.", null],
    ["binary-name", "name: !!binary aGk=\ndescription: Reviews code.", null],
    ["mapping-name", "name: {a: 1}\ndescription: Reviews code.", "name must be a string"],
    ["list-name", "name: [a]\ndescription: Reviews code.", "name must be a string"],
    ["set-name", "name: !!set {a, b}\ndescription: Reviews code.", "name must be a string"],
    ["bypass", "name: r\ndescription: Reviews code.\npermissionMode: bypassPermissions", "bypassPermissions"],
    ["other-mode", "name: r\ndescription: Reviews code.\npermissionMode: plan", null],
    ["specifier-in-string", "name: r\ndescription: Reviews code.\ndisallowedTools: Write, Bash(git push *)", 'entry "Bash(git push *)" removes the whole tool'],
    [
      "specifier-in-list",
      "name: r\ndescription: Reviews code.\ndisallowedTools:\n  - Write\n  - Bash(git push *)",
      'entry "Bash(git push *)" removes the whole tool',
    ],
    // WHY: a comma inside the parentheses separates nothing, so the entry prints whole.
    ["specifier-with-comma", "name: r\ndescription: Reviews code.\ndisallowedTools: Agent(a, b), Edit", 'entry "Agent(a, b)" removes the whole tool'],
    ["specifier-unclosed", "name: r\ndescription: Reviews code.\ndisallowedTools: Write, Bash(git", 'entry "Bash(git" removes the whole tool'],
    ["whole-tools", "name: r\ndescription: Reviews code.\ndisallowedTools: Write, Edit", null],
    ["whole-tools-list", "name: r\ndescription: Reviews code.\ndisallowedTools: [Write, Edit]", null],
    ["whole-server", "name: r\ndescription: Reviews code.\ndisallowedTools: mcp__github, mcp__jira__*", null],
    ["no-entries", "name: r\ndescription: Reviews code.\ndisallowedTools:", null],
    ["not-entries", "name: r\ndescription: Reviews code.\ndisallowedTools: 1", null],
    ["not-entry-in-list", "name: r\ndescription: Reviews code.\ndisallowedTools: [1, Write]", null],
    // WHY: the page says this of disallowedTools alone.
    ["specifier-in-tools", "name: r\ndescription: Reviews code.\ntools: Bash(git status *)", null],
    // Frontmatter that does not parse is the validator's to report, so this rule says nothing rather than a second thing.
    ["unparsed", "description: Reviews code.\nother: [1, 2", null],
  ];
  for (const [id, fm, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/.claude/agents/${id}.md`, skill(fm), agentFrontmatter);
      if (want) {
        expectDetail(found, "agent-frontmatter", want);
      } else {
        expectClean(found, "agent-frontmatter");
      }
    });
  }
  it("an opening --- after a blank line is not frontmatter", async () => {
    const found = await findings("fx/.claude/agents/late.md", `\n${skill("name: r\ndescription: Reviews code.")}`, agentFrontmatter);
    expectDetail(found, "agent-frontmatter", "not the first line");
  });
  it("an opening --- that is never closed is not a late one", async () => {
    const found = await findings("fx/.claude/agents/unclosed.md", "---\nname: r\ndescription: Reviews code.\n\nbody\n", agentFrontmatter);
    expectDetail(found, "agent-frontmatter", "never closed");
    assert.ok(!has(found, "agent-frontmatter", "not the first line"), JSON.stringify(found));
  });
  it("empty frontmatter has no name", async () => {
    expectDetail(await findings("fx/.claude/agents/empty.md", "---\n---\n\nbody\n", agentFrontmatter), "agent-frontmatter", "no name");
  });
  it("a file with no frontmatter has no name", async () => {
    expectDetail(await findings("fx/.claude/agents/notes.md", "# Notes\n\nbody\n", agentFrontmatter), "agent-frontmatter", "no name");
  });
  it("a subfolder of an agents directory is scanned too", async () => {
    expectDetail(await findings("fx/.claude/agents/review/x.md", skill("description: Reviews code."), agentFrontmatter), "agent-frontmatter", "no name");
  });
  it("an agents folder that is neither a plugin's nor under .claude is left alone", async () => {
    expectClean(await findings("fx/pkg/agents/x.md", skill("name: -x\nmcpServers: {}"), agentFrontmatter), "agent-frontmatter");
  });
  it("a markdown file outside any agents folder is left alone", async () => {
    expectClean(await findings("fx/notes/x.md", skill("name: -x"), agentFrontmatter), "agent-frontmatter");
  });

  // Exercised directly because a plugin is told apart by a folder on disk, which a string fixture has none of.
  const lines = (fm) => fm.split("\n");
  it("a plugin's agent loses the whole tool to a specifier too", () => {
    assert.match(agentDefects(lines("description: Reviews code.\ndisallowedTools: Bash(git push *)"), true).join("\n"), /removes the whole tool/u);
  });
  it("each entry with a specifier is its own finding", () => {
    const found = agentDefects(lines("name: r\ndisallowedTools: Bash(git push *), Read(./secrets/**)"), false);
    assert.equal(found.length, 2, JSON.stringify(found));
  });
  it("a plugin's agent with no name loads under its filename", () => {
    assert.deepEqual(agentDefects(lines("description: Reviews code."), true), []);
  });
  it("an agent whose name is null has no name", () => {
    assert.match(agentDefects(["name:", "description: Reviews code."], false).join("\n"), /^no name/mu);
  });
  it("a plugin's agent whose frontmatter does not parse is not measured", () => {
    assert.deepEqual(pluginNameWarnings([`name: ${"x".repeat(300)}`, "other: [1, 2"]), []);
  });
  it("a plugin's agent whose frontmatter holds only a comment has no name to measure", () => {
    assert.deepEqual(pluginNameWarnings(["# only a comment"]), []);
  });
  it("a plugin's agent with no frontmatter loads under its filename", () => {
    assert.deepEqual(agentDefects(null, true, ["# Reviewer"]), []);
  });
  // The delimiter is a whole line of three dashes, trailing spaces allowed, and a line holding only spaces is as empty as one holding nothing.
  for (const [label, given, want] of [
    ["an unclosed delimiter with trailing spaces", ["---  ", "name: r"], "never closed"],
    ["dashes after text", ["a ---", "name: r"], "^no name"],
    ["text after dashes", ["--- a", "name: r"], "^no name"],
    ["a late delimiter with trailing spaces", ["", "---  ", "name: r", "---"], "not the first line"],
    ["late dashes after text", ["", "a ---"], "^no name"],
    ["late text after dashes", ["", "--- a"], "^no name"],
    ["a delimiter after a line of spaces", ["  ", "---", "name: r", "---"], "not the first line"],
  ]) {
    it(`no frontmatter: ${label}`, () => {
      const found = agentDefects(null, false, given);
      assert.equal(found.length, 1, JSON.stringify(found));
      assert.match(found[0], new RegExp(want, "u"));
    });
  }
  for (const key of ["permissionMode", "hooks", "mcpServers", "initialPrompt"]) {
    it(`a plugin's agent setting ${key}`, () => {
      const found = agentDefects(lines(`name: r\ndescription: Reviews code.\n${key}: x`), true);
      assert.ok(
        found.some((d) => d.startsWith(`${key} is ignored`)),
        JSON.stringify(found),
      );
    });
  }
});

describe("agent-plugin-name", () => {
  const lines = (fm) => fm.split("\n");
  const cases = [
    ["over-limit", `name: ${"a".repeat(257)}\ndescription: Reviews code.`, "257 characters"],
    ["at-limit", `name: ${"a".repeat(256)}\ndescription: Reviews code.`, null],
    // On Claude Code 2.1.310 a plugin's agent named either way loaded under that name, so neither is warned on.
    ["leading-dash", "name: -reviewer\ndescription: Reviews code.", null],
    ["colon", "name: my:reviewer\ndescription: Reviews code.", null],
    ["no-name", "description: Reviews code.", null],
    ["unparsed", "description: Reviews code.\nother: [1, 2", null],
  ];
  for (const [id, fm, want] of cases) {
    it(id, () => {
      const found = pluginNameWarnings(lines(fm));
      assert.equal(found.length === 0, want === null, JSON.stringify(found));
      assert.equal(
        found.some((d) => want !== null && d.includes(want)),
        want !== null,
        JSON.stringify(found),
      );
    });
  }
  it("no frontmatter", () => {
    assert.deepEqual(pluginNameWarnings(null), []);
  });
});

describe("plugin-hooks", () => {
  const hooksFile = (event, group) => JSON.stringify({ hooks: { [event]: [group] } }, null, 2);
  const command = (extra = {}) => ({ type: "command", command: "echo hi", ...extra });
  const http = (extra = {}) => ({ type: "http", url: "https://example.com/hook", ...extra });
  const expectHook = (source, part) => {
    const found = hooksDefects(source);
    assert.ok(
      found.some((d) => d.detail.includes(part)),
      `wanted "${part}", got ${JSON.stringify(found)}`,
    );
  };
  const expectNoHook = (source) => assert.deepEqual(hooksDefects(source), []);

  for (const event of [
    "CwdChanged",
    "UserPromptSubmit",
    "PostToolBatch",
    "Stop",
    "TeammateIdle",
    "TaskCreated",
    "TaskCompleted",
    "WorktreeCreate",
    "WorktreeRemove",
    "MessageDisplay",
  ]) {
    it(`a matcher on ${event}`, () => expectHook(hooksFile(event, { matcher: "x", hooks: [command()] }), `matcher on ${event}`));
  }
  it("a matcher on an event with matcher support", () => expectNoHook(hooksFile("PreToolUse", { matcher: "Bash", hooks: [command()] })));
  // A malformed file is the schema's to report, so each of these is read past rather than thrown on.
  it("a group with no hooks list", () => expectNoHook(hooksFile("PreToolUse", { matcher: "Bash" })));
  it("a hooks list holding a string", () => expectNoHook(hooksFile("PreToolUse", { hooks: ["x"] })));
  it("user_config in an http hook's command field", () => expectNoHook(hooksFile("PreToolUse", { hooks: [http({ command: `\${user_config.x}` })] })));
  it("a commands list holding a number", () =>
    assert.deepEqual(manifestDefects(JSON.stringify({ name: "p", commands: ["./commands/", 5] }), "/no/such/plugin"), []));
  it("a commands value of null", () => assert.deepEqual(manifestDefects(JSON.stringify({ name: "p", commands: null }), "/no/such/plugin"), []));
  it("a headers list holding null", () => expectNoHook(hooksFile("PreToolUse", { hooks: [http({ headers: [null] })] })));
  it("a command hook with no command", () => expectNoHook(hooksFile("PreToolUse", { hooks: [{ type: "command" }] })));
  it("a commands map holding null", () => assert.deepEqual(manifestDefects(JSON.stringify({ name: "p", commands: { x: null } }), "/no/such/plugin"), []));
  it("no matcher on an event without matcher support", () => expectNoHook(hooksFile("Stop", { hooks: [command()] })));
  it("async on an http hook", () => expectHook(hooksFile("PreToolUse", { hooks: [http({ async: true })] }), "async"));
  it("async on a command hook", () => expectNoHook(hooksFile("PreToolUse", { hooks: [command({ async: true })] })));
  it("once in a hooks file", () => expectHook(hooksFile("PreToolUse", { hooks: [command({ once: true })] }), "once"));
  it("a header naming an unlisted variable", () =>
    expectHook(hooksFile("PreToolUse", { hooks: [http({ headers: { Authorization: "Bearer $MY_TOKEN" } })] }), "MY_TOKEN"));
  it("a braced header variable that is unlisted", () =>
    expectHook(hooksFile("PreToolUse", { hooks: [http({ headers: { "X-Key": `\${API_KEY}` }, allowedEnvVars: ["OTHER"] })] }), "API_KEY"));
  it("a header naming listed variables", () =>
    expectNoHook(
      hooksFile("PreToolUse", {
        hooks: [http({ headers: { Authorization: "Bearer $MY_TOKEN", "X-Key": `\${API_KEY}` }, allowedEnvVars: ["MY_TOKEN", "API_KEY"] })],
      }),
    ));
  it("user_config in a shell-form command", () =>
    expectHook(hooksFile("PreToolUse", { hooks: [command({ command: `curl \${user_config.url}` })] }), "user_config"));
  // Exec form substitutes into command as well as args, so only a missing args makes the same command a defect.
  it("user_config in an exec-form command", () => expectNoHook(hooksFile("PreToolUse", { hooks: [command({ command: `\${user_config.tool}`, args: [] })] })));
  describe("onFailure with no effect", () => {
    for (const event of ["Stop", "SubagentStop", "TaskCompleted", "TeammateIdle"]) {
      it(`onFailure on ${event}`, () => expectHook(hooksFile(event, { hooks: [command({ onFailure: "block" })] }), `onFailure on ${event}`));
    }
    it("onFailure on an http hook of such an event", () => expectHook(hooksFile("Stop", { hooks: [http({ onFailure: "block" })] }), "onFailure on Stop"));
    for (const field of ["async", "asyncRewake"]) {
      it(`onFailure beside ${field}`, () => expectHook(hooksFile("PreToolUse", { hooks: [command({ onFailure: "block", [field]: true })] }), `sets ${field}`));
      it(`onFailure beside ${field} set to false`, () => expectNoHook(hooksFile("PreToolUse", { hooks: [command({ onFailure: "block", [field]: false })] })));
    }
    it("onFailure on an event it works on", () => expectNoHook(hooksFile("PreToolUse", { hooks: [command({ onFailure: "block" })] })));
    it("async on an http hook leaves its onFailure working", () => {
      const details = hooksDefects(hooksFile("PreToolUse", { hooks: [http({ onFailure: "block", async: true })] })).map((d) => d.detail);
      assert.equal(details.length, 1, JSON.stringify(details));
      assert.match(details[0], /^async on a http hook/u);
    });
    it("names the line onFailure sits on", () => {
      const source = hooksFile("Stop", { hooks: [command({ onFailure: "block" })] });
      assert.deepEqual(
        hooksDefects(source).map((d) => d.line),
        [source.split("\n").findIndex((l) => l.includes('"onFailure"')) + 1],
      );
    });
  });
  describe("args beside a command holding more than the program", () => {
    for (const held of ["node script.js", "node ./script.js", `node \${CLAUDE_PLUGIN_ROOT}/script.js`]) {
      it(held, () => expectHook(hooksFile("PreToolUse", { hooks: [command({ command: held, args: ["--fix"] })] }), "args is set"));
    }
    for (const held of ["node", "./bin/run", `\${CLAUDE_PLUGIN_ROOT}/my tool`, "/opt/my tool/run", "C:\\Program Files\\nodejs\\node.exe"]) {
      it(held, () => expectNoHook(hooksFile("PreToolUse", { hooks: [command({ command: held, args: ["--fix"] })] })));
    }
    it("the same command in shell form", () => expectNoHook(hooksFile("PreToolUse", { hooks: [command({ command: "node script.js" })] })));
    it("the same fields on an http hook", () => expectNoHook(hooksFile("PreToolUse", { hooks: [http({ command: "node script.js", args: [] })] })));
  });
  describe("a placeholder PowerShell never expands", () => {
    const powershell = (held, extra = {}) => hooksFile("PreToolUse", { hooks: [command({ shell: "powershell", command: held, ...extra })] });
    for (const variable of ["CLAUDE_PROJECT_DIR", "CLAUDE_PLUGIN_ROOT", "CLAUDE_PLUGIN_DATA"]) {
      it(`a bare $${variable}`, () => expectHook(powershell(`& "$${variable}\\check.ps1"`), `bare $${variable}`));
      it(`\${${variable}} in single quotes`, () => expectHook(powershell(`& '\${${variable}}\\check.ps1'`), `\${${variable}}`));
      it(`\${${variable}} in double quotes`, () => expectNoHook(powershell(`& "\${${variable}}\\check.ps1"`)));
      it(`$env:${variable}`, () => expectNoHook(powershell(`& "$env:${variable}\\check.ps1"`)));
    }
    it("a double quote inside the single quotes", () => expectHook(powershell(`'a "b" \${CLAUDE_PROJECT_DIR}'`), `\${CLAUDE_PROJECT_DIR}`));
    it("a single quote each side, inside double quotes", () => expectNoHook(powershell(`"it's \${CLAUDE_PROJECT_DIR}/it's"`)));
    it("an escaped double quote before the single quotes", () => expectNoHook(powershell(`"a\`"'\${CLAUDE_PROJECT_DIR}'"`)));
    it("single quotes after a closed double-quoted string", () => expectHook(powershell(`"a" '\${CLAUDE_PROJECT_DIR}'`), `\${CLAUDE_PROJECT_DIR}`));
    it("single quotes holding another variable", () => expectNoHook(powershell(`'\${OTHER}'`)));
    it("a longer name that starts with a placeholder's", () => expectNoHook(powershell(`& "$CLAUDE_PROJECT_DIRECTORY"`)));
    it("no shell set", () => expectNoHook(hooksFile("PreToolUse", { hooks: [command({ command: `"$CLAUDE_PROJECT_DIR/x" '\${CLAUDE_PROJECT_DIR}'` })] })));
    it("shell set to bash", () => expectNoHook(hooksFile("PreToolUse", { hooks: [command({ shell: "bash", command: `"$CLAUDE_PROJECT_DIR/x"` })] })));
    it("exec form, where shell is ignored", () => expectNoHook(powershell("$CLAUDE_PROJECT_DIR/x", { args: [] })));
    it("an http hook", () => expectNoHook(hooksFile("PreToolUse", { hooks: [http({ shell: "powershell", command: "$CLAUDE_PROJECT_DIR/x" })] })));
  });
  describe("an MCP server prefix with no .*", () => {
    const matched = (matcher, event = "PreToolUse") => hooksFile(event, { matcher, hooks: [command()] });
    for (const event of ["PreToolUse", "PostToolUse", "PostToolUseFailure", "PermissionRequest", "PermissionDenied"]) {
      it(`mcp__memory on ${event}`, () => expectHook(matched("mcp__memory", event), "matcher part mcp__memory"));
    }
    for (const [matcher, part] of [
      ["mcp__brave-search", "mcp__brave-search"],
      ["mcp__my_server", "mcp__my_server"],
      ["mcp__memory__", "mcp__memory__"],
      ["Bash|mcp__memory", "mcp__memory"],
      ["Edit, mcp__memory", "mcp__memory"],
    ]) {
      it(matcher, () => expectHook(matched(matcher), `matcher part ${part}`));
    }
    for (const matcher of ["mcp__memory__.*", "mcp__memory__read", "Bash", "mcp__memory|Edit.*", "mcp__.*", "not_mcp__memory"]) {
      it(matcher, () => expectNoHook(matched(matcher)));
    }
    it("an event that does not match tools", () => expectNoHook(matched("mcp__memory", "Notification")));
    it("a matcher that is no string", () => expectNoHook(matched(5)));
  });
  describe("the plugin's own MCP server by its bare key", () => {
    const own = new Set(["db"]);
    const expectOwn = (source, part) => {
      const details = hooksDefects(source, own).map((d) => d.detail);
      assert.ok(
        details.some((d) => d.includes(part)),
        `wanted "${part}", got ${JSON.stringify(details)}`,
      );
    };
    const expectNotOwn = (source) => assert.deepEqual(hooksDefects(source, own), []);
    const matched = (matcher, event = "PreToolUse") => hooksFile(event, { matcher, hooks: [command()] });
    for (const matcher of [
      "mcp__db__.*",
      "mcp__db__query",
      "^mcp__db__.*$",
      "Bash|mcp__db__.*",
      "Edit, mcp__db__query",
      "mcp__db",
      "mcp__db.*",
      "Bash|mcp__db.*",
      "(mcp__db__.*)",
      "^(mcp__db__.*)$",
      "(?:mcp__db__.*)",
      "^(?:mcp__db__.*)$",
      "mcp__db.+",
      "(mcp__db.*)",
      "^mcp__db.*$",
    ]) {
      it(matcher, () => expectOwn(matched(matcher), "own MCP server db"));
    }
    for (const matcher of [
      "mcp__dbx__.*",
      "mcp__other__.*",
      "mcp__plugin_p_db__.*",
      "Bash",
      "not_mcp__db__x",
      "mcp__db_x.*",
      "mcp__db-x__.*",
      "mcp__db[12]__.*",
      "mcp__db\\d__.*",
      "mcp__db.x__.*",
      "mcp__db.+__.*",
      "mcp__db.*_replica__.*",
    ]) {
      it(matcher, () => expectNotOwn(matched(matcher)));
    }
    for (const [key, matcher] of [
      ["my.server", "mcp__my.server__.*"],
      ["my server", "mcp__my server__.*"],
    ]) {
      it(`${matcher} with the key ${key}`, () => {
        const details = hooksDefects(matched(matcher), new Set([key])).map((d) => d.detail);
        assert.ok(
          details.some((d) => d.includes(`own MCP server ${key}`)),
          JSON.stringify(details),
        );
        assert.ok(
          details.some((d) => d.endsWith("write mcp__plugin_<plugin-name>_my_server__")),
          JSON.stringify(details),
        );
      });
    }
    // WHY: the rule reads a matcher's spelling and never runs it, so these stay unreported though none reaches the plugin's own tool, rather than a regex parser growing here.
    for (const [key, matcher] of [
      ["db", "mcp__db(__.*)"],
      ["db", "mcp__db(?:__.*)"],
      ["db", "(mcp__db)__.*"],
      ["db", "mcp__db.{1,}"],
      ["db", "mcp__db.*__.*"],
      ["db", "mcp__db.*?"],
      ["my.server", "mcp__my\\.server__.*"],
    ]) {
      it(`known limit: ${matcher} with the key ${key}`, () => assert.deepEqual(hooksDefects(matched(matcher), new Set([key])), []));
    }
    it("an event that does not match tools", () => expectNotOwn(matched("mcp__db__.*", "Notification")));
    it("a set that does not hold the key", () => expectNoHook(matched("mcp__db__.*")));
    const tool = (server, type = "mcp_tool") => hooksFile("Stop", { hooks: [{ type, server, tool: "query" }] });
    it("an mcp_tool hook's server", () => expectOwn(tool("db"), "server db"));
    it("an mcp_tool hook's scoped server", () => expectNotOwn(tool("plugin:p:db")));
    it("a server field on another hook type", () => expectNotOwn(tool("db", "http")));
    it("an mcp_tool hook with no server", () => expectNotOwn(hooksFile("Stop", { hooks: [{ type: "mcp_tool", tool: "query" }] })));
  });
  it("a finding names the line its key sits on", () => {
    const source = hooksFile("Stop", { matcher: "x", hooks: [command()] });
    const line = source.split("\n").findIndex((l) => l.includes('"matcher"')) + 1;
    assert.deepEqual(
      hooksDefects(source).map((d) => d.line),
      [line],
    );
  });
  // A file that is not JSON is the validator's to report, so the rule says nothing rather than a second thing.
  it("a file that is not valid JSON", () => expectNoHook('{ "hooks": { "Stop": [ { "matcher": "x", "hooks": [] }, ] } }'));
  for (const [id, source] of [
    ["an event map that is a list", '{ "hooks": [] }'],
    ["a top level that is a list", "[]"],
    ["a top level that is null", "null"],
  ]) {
    it(id, () => expectNoHook(source));
  }
});

describe("plugin-manifest", () => {
  const defects = (manifest) => manifestDefects(JSON.stringify({ name: "p", ...manifest }, null, 2), "/no/such/plugin");
  describe("a dependency's version", () => {
    const depending = (entry) => defects({ dependencies: [entry] });
    for (const version of ["latest", "not.a.range", 1, null, ["^2.0"]]) {
      it(`the version ${JSON.stringify(version)}`, () => {
        const found = depending({ name: "x", version });
        assert.equal(found.length, 1, JSON.stringify(found));
        assert.match(found[0].detail, /is not a node-semver range/u);
      });
    }
    for (const version of ["~2.1.0", "^2.0", ">=1.4", "=2.1.0", "^2.0.0-0", "*"]) {
      it(`the range ${version}`, () => assert.deepEqual(depending({ name: "x", version }), []));
    }
    it("a string entry", () => assert.deepEqual(depending("x@market"), []));
    it("an entry with no version", () => assert.deepEqual(depending({ name: "x" }), []));
    it("a dependencies value that is no list", () => assert.deepEqual(defects({ dependencies: "x" }), []));
    it("names the line the version sits on", () => {
      const source = JSON.stringify({ name: "p", dependencies: [{ name: "x", version: "latest" }] }, null, 2);
      assert.deepEqual(
        manifestDefects(source, "/no/such/plugin").map((d) => d.line),
        [source.split("\n").findIndex((l) => l.includes('"version"')) + 1],
      );
    });
  });
  describe("user_config in a monitor's command", () => {
    const monitor = (command) => ({ name: "m", command, description: "d" });
    const held = `tail \${user_config.path}`;
    it("inline under experimental", () =>
      assert.match(defects({ experimental: { monitors: [monitor(held)] } })[0].detail, /monitor command names \$\{user_config/u));
    it("inline under the top-level key", () => assert.match(defects({ monitors: [monitor(held)] })[0].detail, /monitor command names \$\{user_config/u));
    it("names the line the command sits on", () => {
      const source = JSON.stringify({ name: "p", experimental: { monitors: [monitor(held)] } }, null, 2);
      assert.deepEqual(
        manifestDefects(source, "/no/such/plugin").map((d) => d.line),
        [source.split("\n").findIndex((l) => l.includes('"command"')) + 1],
      );
    });
    it("a command with no user_config", () => assert.deepEqual(defects({ experimental: { monitors: [monitor("tail x.log")] } }), []));
    it("an entry that is no map", () => assert.deepEqual(defects({ experimental: { monitors: ["x"] } }), []));
    it("a path, which is the file's to answer", () => assert.deepEqual(defects({ experimental: { monitors: "./m.json" } }), []));
    it("the file's own reader", () => {
      const source = JSON.stringify([monitor(held)], null, 2);
      assert.deepEqual(
        monitorFileDefects(source).map((d) => d.line),
        [source.split("\n").findIndex((l) => l.includes('"command"')) + 1],
      );
    });
    it("a file that is not valid JSON", () => assert.deepEqual(monitorFileDefects("["), []));
  });
});

describe("skill-hard-wrap", () => {
  const spans = (n) => `paragraph spans ${n} lines`;
  const cases = [
    ["w-paragraph", "One\nwrapped.", spans(2)],
    ["w-three", "One\ntwo\nthree.", spans(3)],
    ["w-item", "- item\n  wrapped", spans(2)],
    ["w-ordered", "1. item\n   wrapped", spans(2)],
    ["w-nested", "- outer\n  - inner\n    wrapped", spans(2)],
    ["w-continuation", "- item\n\n  a continuation\n  wrapped", spans(2)],
    ["w-quote", "> quote\n> wrapped", spans(2)],
    ["w-quote-lazy", "> quote\nlazy", spans(2)],
    ["w-item-lazy", "- item\nlazy", spans(2)],
    ["w-break-spaces", "hard  \nbreak", spans(2)],
    ["w-break-backslash", "hard\\\nbreak", spans(2)],
    // A column-0 table closes the list, and an item numbered `2.` cannot interrupt a paragraph, so it runs on as that paragraph's text.
    ["w-broken-list", "1. one\n\n| a | b |\n| --- | --- |\n| c | d |\n\n   a paragraph\n2. two", spans(2)],
    ["c-lines", "One line.\n\nAnother line.", null],
    ["c-items", "- a\n- b\n\n1. c\n2. d", null],
    ["c-quote", "> a\n>\n> b", null],
    ["c-fence", "```bash\necho a\necho b\n```", null],
    ["c-fence-in-item", "- item\n\n  ```bash\n  echo a\n  echo b\n  ```", null],
    ["c-indented", "    a\n    b", null],
    ["c-table", "| a | b |\n| --- | --- |\n| c | d |", null],
    ["c-html", "<div>\nsome html\nover lines\n</div>", null],
    ["c-setext", "A heading\n---------", null],
    ["c-heading", "## A heading\n\nOne line.", null],
  ];
  for (const [id, body, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/w.md`, `${body}\n`, hardWrap);
      if (want) {
        expectDetail(found, "skill-hard-wrap", want);
      } else {
        expectClean(found, "skill-hard-wrap");
      }
    });
  }
  it("frontmatter is not read", async () => {
    expectClean(await findings("fx/w-fm/SKILL.md", skill("name: w-fm\ndescription: |\n  a\n  b", "One line."), hardWrap), "skill-hard-wrap");
  });
  it("names the paragraph's first line, past the frontmatter", async () => {
    const found = await findings("fx/w-line/SKILL.md", skill("name: w-line\ndescription: |\n  x", "intro\n\nOne\nwrapped."), hardWrap);
    assert.deepEqual(
      found.map((f) => f.line),
      [9],
    );
  });
  it("reports each wrapped paragraph once", async () => {
    const found = await findings("fx/w-count/w.md", "a\nb\n\n- c\n  d\n\n> e\n> f\n", hardWrap);
    assert.deepEqual(
      found.map((f) => f.line),
      [1, 4, 7],
    );
  });
});

describe("skill-argument-placeholders", () => {
  const cases = [
    ["t-fence", "```bash\nawk '{print $1}' file\n```", "$1 "],
    ["t-indented", "    awk '{print $1}' file", "$1 "],
    ["t-span", "Run `awk '{print $2}' file` here.", "$2 "],
    ["t-other-tag", "```yaml\nrun: echo $0\n```", "$0 "],
    ["t-two-digits", "`echo $12`", "$12 "],
    // The page says only a single backslash escapes, and a doubled one leaves the placeholder live.
    ["t-doubled-backslash", "`echo \\\\$1`", "$1 "],
    ["t-word-after", "`echo $1abc`", "$1 "],
    ["good-escaped", "```bash\nawk '{print \\$1}' file\n```", null],
    ["good-span-escaped", "`awk '{print \\$1}' file`", null],
    ["good-long-form", "```bash\ngh issue view $ARGUMENTS[0]\n```", null],
    ["good-arguments", "`$ARGUMENTS`", null],
    ["good-shell-variable", `\`\`\`bash\necho $HOME \${1} $NF\n\`\`\``, null],
    // The page's own example, so a finding here fails a correct file.
    ["good-prose", "Migrate the $0 component from $1 to $2.", null],
    ["good-price", "It costs $1.00 a month.", null],
  ];
  for (const [id, body, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill("name: x\ndescription: |\n  x", body), argumentPlaceholders);
      if (want) {
        expectDetail(found, "skill-argument-placeholders", want);
      } else {
        expectClean(found, "skill-argument-placeholders");
      }
    });
  }
  it("each placeholder gets a finding on its own line", async () => {
    const found = await findings(
      "fx/lines/SKILL.md",
      skill("name: x\ndescription: |\n  x", "```bash\necho $1\necho hi\necho $2 $3\n```"),
      argumentPlaceholders,
    );
    assert.deepEqual(
      found.map((f) => f.line),
      [8, 10, 10],
    );
  });
  it("the finding offers both forms", async () => {
    const found = await findings("fx/forms/SKILL.md", skill("name: x\ndescription: |\n  x", "`echo $1`"), argumentPlaceholders);
    expectDetail(found, "skill-argument-placeholders", "write \\$1");
    expectDetail(found, "skill-argument-placeholders", "$ARGUMENTS[1]");
  });
  it("a file that is not a SKILL.md gets no substitution", async () => {
    expectClean(await findings("fx/other/workflows/a.md", "`echo $1`\n", argumentPlaceholders), "skill-argument-placeholders");
  });
  it("the frontmatter is not the body", async () => {
    expectClean(await findings("fx/fm/SKILL.md", skill("name: x\ndescription: |\n  Costs `$1` a month."), argumentPlaceholders), "skill-argument-placeholders");
  });
});

describe("skill-injected-commands", () => {
  const cases = [
    ["t-after-equals", "KEY=!`cmd`", "does not run"],
    ["t-after-word", "see!`cmd`", "does not run"],
    ["t-after-bold", "**!`cmd`**", "does not run"],
    ["t-after-paren", "(!`cmd`)", "does not run"],
    ["good-after-space", "Branch: !`git branch --show-current`", null],
    ["good-after-tab", "Branch:\t!`git branch --show-current`", null],
    ["good-line-start", "!`git status`", null],
    ["good-indented", "  !`git status`", null],
    ["good-list-item", "- !`git status`", null],
    // The `!` sits inside the span in both, so nothing here is a command.
    ["good-bang-span", "A leading `!` eats the first word.", null],
    ["good-bang-in-span", "Call `step.advance!` here.", null],
    ["good-escaped", "KEY=\\!`cmd`", null],
    ["good-no-bang", "KEY=`cmd`", null],
    ["good-bang-then-space", "Stop! `cmd` here.", null],
    ["good-image", "![alt `code`](a.png)", null],
    ["t-bell", "Run !`a\u0007b` now.", "control character"],
    ["t-escape", "!`a\u001bb`", "control character"],
    ["t-delete", "!`a\u007fb`", "control character"],
    ["t-c1", "!`a\u009fb`", "control character"],
    ["t-nul", "!`a\u0000b`", "control character"],
    ["good-tab-in-command", "!`a\tb`", null],
    ["good-newline-in-command", "!`a\nb`", null],
    ["good-control-outside-command", "Plain `a\u0007b` span and a\u0007b text.", null],
    ["t-fence-control", "```!\nnode --version\na\u0007b\n```", "control character"],
    ["good-fence", "```!\nnode --version\ngit status --short\n```", null],
    ["good-fence-tab", "```!\na\tb\n```", null],
    ["good-other-fence-control", "```bash\na\u0007b\n```", null],
    ["good-untagged-fence-control", "```\na\u0007b\n```", null],
    // The fence's own line is no command, so a control character in its meta stops nothing.
    ["good-fence-meta-control", "```! a\u0007b\nnode --version\n```", null],
    ["good-bang-before-bold", "Wow!**bold** text.", null],
    ["good-span-opens-paragraph", "`ls` opens the paragraph.", null],
  ];
  for (const [id, body, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill("name: x\ndescription: |\n  x", body), injectedCommands);
      if (want) {
        expectDetail(found, "skill-injected-commands", want);
      } else {
        expectClean(found, "skill-injected-commands");
      }
    });
  }
  it("a command in the wrong place is reported for its place alone, since it never reaches the tool", async () => {
    const found = await findings("fx/both/SKILL.md", skill("name: x\ndescription: |\n  x", "KEY=!`a\u0007b`"), injectedCommands);
    assert.equal(found.length, 1);
    expectDetail(found, "skill-injected-commands", "does not run");
  });
  it("a fence's finding lands on the line holding the character", async () => {
    const found = await findings("fx/fence-line/SKILL.md", skill("name: x\ndescription: |\n  x", "```!\nok\na\u0007b\n```"), injectedCommands);
    assert.deepEqual(
      found.map((f) => f.line),
      [9],
    );
  });
  it("a file that is not a SKILL.md runs no command", async () => {
    expectClean(await findings("fx/other/workflows/a.md", "KEY=!`cmd`\n", injectedCommands), "skill-injected-commands");
  });
});

describe("skill-package-runners", () => {
  const unpinned = [
    ["npx", "npx eslint ."],
    ["bunx", "bunx eslint --fix ."],
    ["uvx", "uvx ruff check ."],
    ["pipx", "pipx run black ."],
    ["deno-npm", "deno run npm:eslint"],
    ["deno-flag", "deno run --allow-read npm:eslint -- --fix ."],
    ["deno-jsr", "deno run jsr:@std/http/file-server"],
    ["go", "go run golang.org/x/tools/cmd/goimports ."],
    ["scoped", "npx @scope/tool ."],
    ["flag-first", "npx --yes eslint ."],
    ["quoted", "pipx run 'black' ."],
    ["after-and", "cd x && npx eslint ."],
    ["after-pipe", "cat a | npx eslint"],
    ["after-semicolon", "cd x; npx eslint"],
    ["in-substitution", "echo $(npx eslint)"],
    ["pinned-beside-unpinned", "npx a@1; npx b"],
    ["wide-space", "pipx   run   black"],
    ["indented", "  npx eslint ."],
    ["with-environment", "CI=1 npx eslint ."],
    ["two-assignments", "cd x && A=1 B=2 npx eslint ."],
    ["go-flag-value", "go run -tags foo golang.org/x/tools/cmd/goimports ."],
    ["deno-flag-value", "deno run --config deno.json npm:eslint"],
    ["shell-prompt", "$ npx eslint ."],
    ["sudo", "sudo npx eslint ."],
    ["time", "time npx eslint ."],
    ["env", "env CI=1 npx eslint ."],
    ["keyword", "if npx eslint .; then echo ok; fi"],
    ["xargs", "xargs npx prettier"],
    ["yaml-step", "- run: npx eslint ."],
    ["git-spec", "uvx --from git+https://github.com/astral-sh/ruff ruff check ."],
    ["extras", "uvx 'black[jupyter]' ."],
    ["hosted-spec", "npx github:user/repo"],
    ["hosted-shorthand", "npx user/repo"],
    ["flag-value-slash", "npx --prefix tools/x eslint ."],
    ["hash-in-quotes", 'git commit -m "fix #12" && npx eslint .'],
    ["hash-in-single-quotes", "echo 'a # b'; npx eslint ."],
    ["flag-before", "time -v npx eslint ."],
    ["env-flag-before", "env -v npx eslint ."],
    ["strace-flag-before", "strace -v npx eslint ."],
    ["double-quoted", 'bash -c "npx eslint ."'],
    ["single-quoted", "sh -c 'npx eslint .'"],
    ["yaml-quoted", '- run: "npx eslint ."'],
    ["registry-name-with-extension", "npx chart.js"],
    ["hosted-with-extension", "npx tools/run.js"],
    ["uvx-with-extension", "uvx tools/run.py"],
    ["flag-value-path", "npx --prefix ./tools eslint ."],
    ["quoted-substitution", 'out="$(npx "eslint" .)"'],
    ["quoted-substitution-flag", 'out="$(npx --yes "eslint" .)"'],
    ["quoted-substitution-uvx", 'out="$(uvx "ruff" check)"'],
    ["nested-quotes", `bash -c "sh -c 'npx eslint .'"`],
    ["argument-named-go", "uvx ruff check go"],
    ["arguments-named-runners", "npx prettier --check go deno"],
    ["pipx-argument-named-go", "pipx run black go"],
    // WHY: the rule warns when it cannot tell, so each of these warns although it runs no package.
    ["cannot-tell-which", "which npx uvx"],
    ["cannot-tell-list", "npx bunx uvx"],
    ["cannot-tell-prose-span", "npx or bunx"],
    ["cannot-tell-echo", "echo npx eslint"],
    ["cannot-tell-grep", "grep npx package.json"],
    ["cannot-tell-commit", 'git commit -m "use npx eslint here"'],
    ["deno-wide-space", "deno  run npm:eslint"],
    ["go-wide-space", "go  run golang.org/x/tools/cmd/goimports ."],
    ["go-two-dots", "go run go.uber.org/tools/cmd/x ."],
    // A word that only opens with a dot is no path.
    ["dot-name", "npx .tool"],
    ["pipx-not-py", "pipx run tool.pyz"],
  ];
  // Every example on the using-scripts page, so a finding here reports the page's own advice.
  const pinned = [
    "uvx ruff@0.8.0 check .",
    "uvx black@24.10.0 .",
    "pipx run 'black==24.10.0' .",
    "pipx run 'ruff==0.8.0' check .",
    "npx eslint@9 --fix .",
    "npx create-vite@6 my-app",
    "bunx eslint@9 --fix .",
    "bunx create-vite@6 my-app",
    "deno run npm:create-vite@6 my-app",
    "deno run --allow-read npm:eslint@9 -- --fix .",
    "go run golang.org/x/tools/cmd/goimports@v0.28.0 .",
    "go run github.com/golangci/golangci-lint/cmd/golangci-lint@v1.62.0 run",
    "go run golang.org/x/tools/cmd/goimports@latest .",
    "npx eslint@9.0.0 .",
    "npx @scope/tool@1 .",
    "deno run jsr:@std/http@1/file-server",
    "npx -p eslint@9 eslint .",
    "npx --package=eslint@9 eslint .",
    "uvx --from 'ruff>=0.8' ruff check .",
    "pipx run scripts/extract.py",
    "go run -tags foo golang.org/x/tools/cmd/goimports@v0.28.0 .",
    // A # inside a quoted string is no comment, so the pin after it is read.
    "uvx --from 'ruff>=0.8 # pinned' ruff check .",
  ];
  const notPackages = [
    "go run main.go",
    "go run ./cmd/x",
    "go run .",
    "go run -race main.go",
    "deno run script.ts",
    "deno run ./script.ts",
    "deno run --allow-read script.ts",
    "npx ./bin/tool",
    "npx ./bin/tool input.txt",
    'bash -c "npx ./bin/tool" eslint',
    "npx --prefix ./tools ./bin/tool",
    "npx /opt/tool",
    "npx <tool>",
    "npx $TOOL",
    'npx "$TOOL"',
    "npx",
    "pipx run",
    "npx --help",
    "pipx install black",
    "go build ./...",
    "deno test",
    "mynpx eslint",
    "npx-like eslint",
    "type npx",
    "command -v npx",
    "pipx run extract.py",
    "pipx run scripts/extract.py input.txt",
    "ls # npx eslint",
    "# npx eslint .",
    "npx ../bin/tool",
    "npx .",
    'npx "."',
    "pipx run 'extract.py'",
    "go run ./cmd.v2/x",
    "deno run ./my-npm:task.ts",
  ];
  const skillWith = (body) => skill("name: x\ndescription: |\n  x", body);
  for (const [id, command] of unpinned) {
    it(`reports ${id} in a span and a fence`, async () => {
      expectDetail(await findings(`fx/${id}/SKILL.md`, skillWith(`Run \`${command}\` now.`), packageRunners), "skill-package-runners", "names no version");
      expectDetail(
        await findings(`fx/${id}/SKILL.md`, skillWith(`\`\`\`bash\n${command}\n\`\`\``), packageRunners),
        "skill-package-runners",
        "names no version",
      );
    });
  }
  for (const command of [...pinned, ...notPackages]) {
    it(`leaves ${command} alone`, async () => {
      expectClean(await findings("fx/clean/SKILL.md", skillWith(`Run \`${command}\` now.`), packageRunners), "skill-package-runners");
      expectClean(await findings("fx/clean/SKILL.md", skillWith(`\`\`\`bash\n${command}\n\`\`\``), packageRunners), "skill-package-runners");
    });
  }
  it("names the command it found, and only the unpinned one", async () => {
    const found = await findings("fx/name/SKILL.md", skillWith("`npx a@1; npx b --flag`"), packageRunners);
    assert.equal(found.length, 1);
    expectDetail(found, "skill-package-runners", "npx b --flag names no version");
  });
  it("a space before a separator is not part of the command it names", async () => {
    expectDetail(await findings("fx/space/SKILL.md", skillWith("`npx b ; ls`"), packageRunners), "skill-package-runners", "npx b names no version");
  });
  it("a quote is not part of the command it names", async () => {
    expectDetail(
      await findings("fx/quote/SKILL.md", skillWith('`bash -c "npx eslint ."`'), packageRunners),
      "skill-package-runners",
      "npx eslint . names no version",
    );
  });
  it("a quote with no partner in the command is not part of what it names", async () => {
    const names = [
      [`sh -c 'npx eslint "$f"'`, 'npx eslint "$f" names no version'],
      ["sh -c 'cd x; npx eslint .'", "npx eslint . names no version"],
      ['bash -c "npx eslint \\"$f\\""', 'npx eslint \\"$f\\" names no version'],
      [`bash -c "sh -c 'npx eslint .'"`, "npx eslint . names no version"],
      [`bash -c 'sh -c "npx eslint ."'`, "npx eslint . names no version"],
      ['out="$(npx eslint "$f")"', 'npx eslint "$f" names no version'],
    ];
    const results = await Promise.all(names.map(([command]) => findings("fx/inner/SKILL.md", skillWith(`\`${command}\``), packageRunners)));
    for (const [i, [, detail]] of names.entries()) {
      expectDetail(results[i], "skill-package-runners", detail);
    }
  });
  it("a pin inside a quoted command counts", async () => {
    expectClean(await findings("fx/esc-pin/SKILL.md", skillWith('`bash -c "npx \\"eslint@9\\""`'), packageRunners), "skill-package-runners");
  });
  // WHY: the rule reads no shell, so a command runs to the next separator and a word past its closing quote is read with it.
  it("a word past a closing quote is read with the command", async () => {
    expectDetail(
      await findings("fx/after/SKILL.md", skillWith('`bash -c "npx eslint ." --norc`'), packageRunners),
      "skill-package-runners",
      'npx eslint ." --norc names no version',
    );
    expectClean(await findings("fx/past-pin/SKILL.md", skillWith('`bash -c "npx eslint ." x@1`'), packageRunners), "skill-package-runners");
  });
  it("a backtick substitution in a fence opens a command", async () => {
    const found = await findings("fx/backtick/SKILL.md", skillWith("```bash\nx=`npx eslint .`\n```"), packageRunners);
    expectDetail(found, "skill-package-runners", "npx eslint . names no version");
  });
  it("a quoted backtick substitution still warns", async () => {
    const found = await findings("fx/quoted-backtick/SKILL.md", skillWith('```bash\nout="`npx "eslint" .`"\n```'), packageRunners);
    expectDetail(found, "skill-package-runners", 'npx "eslint" . names no version');
  });
  it("an agent never runs a comment", async () => {
    expectClean(await findings("fx/comment/SKILL.md", skillWith("```bash\n  # npx eslint .\n```"), packageRunners), "skill-package-runners");
  });
  it("a comment after a command is no version", async () => {
    expectDetail(
      await findings("fx/trailing/SKILL.md", skillWith("```bash\nnpx eslint . # needs a@b\n```"), packageRunners),
      "skill-package-runners",
      "npx eslint . names",
    );
  });
  it("prose is not a command", async () => {
    expectClean(await findings("fx/prose/SKILL.md", skillWith("Do not run npx eslint here."), packageRunners), "skill-package-runners");
  });
  it("each finding lands on its own line", async () => {
    const found = await findings("fx/lines/SKILL.md", skillWith("```bash\nnpx a\nls\nnpx b\n```"), packageRunners);
    assert.deepEqual(
      found.map((f) => f.line),
      [8, 10],
    );
  });
});

// check.js prints a finding's context beside its line number, so each case pads the flagged line and wants it back trimmed, and from that line rather than the next.
describe("a finding's context is its own line, trimmed", () => {
  const bolded = (open) => Array.from({ length: 6 }, (_, i) => `${open}**Lead ${i}** text.${i ? "" : "  "}`).join(open ? "\n" : "\n\n");
  const cases = [
    [
      "c-unadvertised",
      argumentHint,
      'argument-hint: "[new]"',
      "## Routing\n\n- If it starts with `new` → read a.\n- If it starts with `check` → read b.  ",
      "- If it starts with `check` → read b.",
    ],
    ["c-tagged", bashBlocks, "", "  ```fish\n  echo hi\n  ```", "```fish"],
    ["c-fish", bashBlocks, "", "```bash\n  make; and make install\n```", "make; and make install"],
    ["c-bolded-paragraphs", boldedParagraphs, "", bolded(""), "**Lead 0** text."],
    ["c-bolded-runs", boldedRuns, "", bolded("- "), "- **Lead 0** text."],
    ["c-bold-continuation", continuations, "", "- item\n\n  **Bold** continuation.", "**Bold** continuation."],
    ["c-continuations", continuations, "", "- item  \n\n  one.\n\n  two.", "- item"],
    ["c-hard-wrap", hardWrap, "", "  First line\nsecond line.", "First line"],
    ["c-portable", portablePaths, "", "  A span `/home/someone/notes.md` here.", "A span `/home/someone/notes.md` here."],
    ["c-referenced", referencedPaths, "", "  See `workflows/gone.md` here.", "See `workflows/gone.md` here."],
    ["c-vale", valeDirective, "", "<!-- vale off -->  \n\nProse.", "<!-- vale off -->"],
    ["c-placeholder", argumentPlaceholders, "", "  Run `echo $1` here.", "Run `echo $1` here."],
    ["c-injected", injectedCommands, "", "  KEY=!`cmd`", "KEY=!`cmd`"],
    ["c-runner", packageRunners, "", "  Run `npx eslint` here.", "Run `npx eslint` here."],
  ];
  for (const [id, rule, fm, body, want] of cases) {
    it(id, async () => {
      const found = await findings(`fx/${id}/SKILL.md`, skill(`name: ${id}\ndescription: |\n  x${fm ? `\n${fm}` : ""}`, body), rule);
      assert.ok(found.length, `wanted a finding, got none`);
      for (const f of found) {
        assert.equal(f.context, want);
      }
    });
  }
});
