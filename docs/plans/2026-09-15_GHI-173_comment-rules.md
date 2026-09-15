> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Check code comments against the one rule

Issue [#173](https://github.com/izkreny/agentifico/issues/173), a child of epic [#157](https://github.com/izkreny/agentifico/issues/157), cut from the tip of `feat/GHI-176_one-comment-rule` and stacked on it in stack #168. The `blockedBy` on #176 records that order, per *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`: #176's rewrite is what leaves this package clean under the rules added here, and its branch is the one this was cut from and the pull request's base.

## What lands

The check hands Vale the `*.js` and `*.py` files under a target beside the markdown ones, so every prose rule the style carries reads a code comment or a docstring as it reads a paragraph. Two rule files join the style under `skills/skills-maker/assets/Agentifico/`, each scoped to `comment`: one reports a comment holding more than one sentence, the other a comment over a word cap. `skills/skills-maker/workflows/check.md` says what is read and what escapes, `skills/skills-maker/workflows/review.md` names the mechanical half, and `metadata.version` moves a minor, `3.10.0` to `3.11.0`.

## What was measured before writing this

**Measured on Vale 3.21.0 on 2026-09-15, on the branch this one is cut from**, with a probe style scoped to `comment` over fixtures and then over the package's own scripts:

- A `metric` on `words` and an `occurrence` rule each take `scope: comment`. Neither takes an `exceptions` key: Vale refuses the configuration with `E201 has invalid keys` when one is present, so a directive cannot be excepted by key and is excepted by construction instead, under *The rules* below.
- A run of line comments is read as one unit, joined with a space, so a directive line under an explanatory comment line is read together with it. A docstring and a trailing comment on a code line are each their own unit.
- An `occurrence` rule with `max: 0` fires on nothing, so the sentence rule counts sentence ends with `max: 1` rather than counting second sentences with a cap of zero. A bare `[.!?]` followed by whitespace counts "e.g. " as an end, so the token carries a lookbehind for the abbreviations a comment here writes.
- `%d` in an `occurrence` message prints the count; `%s` prints `%!s(int=2)`.
- Over the package's scripts, the style as it stands raises nothing under the code section, the sentence rule raises nothing, and the comments run to a median of 23 words and a maximum of 44 across 118 of them.
- A markdown file raises nothing under either comment-scoped rule, its HTML comments included, so neither rule needs switching off in the `[*.md]` section.

## The configuration

`skills/skills-maker/.vale.ini` gains a `[*.{js,py}]` section based on the `Agentifico` style with `SkillSplit` and `SkillLength` off, since those measure a skill file alone, and with one comment saying why the file-length rules are off, held to the comment rule #176 states. `TokenIgnores` is not repeated there: it does not reach a code comment, which `skills/skills-maker/workflows/check.md` records as an escape.

## The rules

**`'skills/skills-maker/assets/Agentifico/CommentSentences.yml'`** extends `occurrence`, scoped to `comment`, `max: 1`, an error, with a token counting a sentence end: `.`, `!` or `?` followed by whitespace or the end of the unit, behind which none of `e.g`, `i.e`, `etc` or `vs` stands. Its message opens on *A comment inside code exists only where the solution is unconventional, and is one sentence saying why* and prints the count with `%d`. A comment whose second sentence carries no terminal punctuation counts one end and escapes, which the check's table records.

**`'skills/skills-maker/assets/Agentifico/CommentLength.yml'`** extends `metric`, scoped to `comment`, `formula: words`, `condition: "> 45"`, a warning as `skills/skills-maker/assets/Agentifico/ParagraphLength.yml` is one: it points a reader at a comment long enough to be read for a second claim, and the sentence rule is the verdict. The cap sits one word above the package's longest comment, and the rule's own comment records the calibration the way the paragraph rule's does: the count, the median, the maximum and the date.

**Tool directives are excepted by construction, and each rule's comment says so.** `biome-ignore`, `eslint-disable`, `noqa` and `type: ignore` carry no sentence end, so the sentence rule counts nothing in them, and a directive with its reason beside it stays under the cap; a fixture carrying each proves it. A directive that follows an explanatory comment line is read with it, and a second sentence there is a finding, which is what the one-comment rule asks.

## The check

`skills/skills-maker/scripts/check.js` globs `**/*.js` and `**/*.py` beside `**/*.md`, `node_modules` excluded as it is. markdownlint reads the markdown files alone, the skill discovery and the "no markdown file found" exit stay keyed on markdown alone, and Vale reads every file. The closing `N files checked` line counts every file Vale read, so a code file that raised nothing is visible in the count rather than silently skipped; the suite's counts hold, since no existing fixture tree carries a code file.

## The suite

`skills/skills-maker/scripts/test/vale.test.js` writes its own Vale configuration string, so that string gains the `[*.{js,py}]` section or no code fixture is read at all. The fixtures it gains:

- a `*.js` and a `*.py` file whose line comment carries a second sentence, and a `*.py` file whose docstring does, each tripping `CommentSentences` on the comment's line;
- a `*.js` and a `*.py` file whose comment runs to 46 words, each tripping `CommentLength` with its count in the message;
- a directives fixture per file kind carrying `biome-ignore` with a reason, `eslint-disable`, `noqa` and `type: ignore`, raising nothing;
- a guards fixture whose string literal carries the two-sentence text and the long text, raising nothing, and a one-sentence comment carrying "e.g." and a path with a dot, raising nothing;
- a markdown fixture whose HTML comment and paragraph carry the two-sentence text, raising neither comment rule.

The suite's own coverage test fails on any rule no fixture reaches, and the per-token test iterates `tokens` arrays alone, so the singular `token` of the sentence rule is covered by the coverage test and by its own fixture. Each fixture is watched failing before it is trusted: the trip fixtures by dropping the second sentence or the words past the cap and reading the assertion fail, the guard fixtures by moving the text out of the string literal into a comment.

`skills/skills-maker/scripts/test/check.test.js` gains a fixture tree carrying a `*.js` file under a skill whose comment trips the sentence rule, asserting the finding lands under `prose rules` and the file is in the count, and the same comment under `**/node_modules/**` in the same tree, asserting it is not read.

## The prose

`skills/skills-maker/workflows/check.md` says under *The check* which files are read: every markdown file, and every `*.js` and `*.py` file for its comments and docstrings, with the same exclusions. Its prose-rules table gains a row per new rule. What escapes is stated beside it: a `*.sh` or `*.ini` comment is the reviewer's, since Vale reads either whole and has no comment scope for it; `TokenIgnores` does not reach a code comment, so a quoted phrase in one is read; `*.yml` stays out because the style's own rule files quote the phrases they catch; a second sentence with no terminal punctuation escapes the sentence rule.

`skills/skills-maker/workflows/review.md` names the comment rules as the mechanical half of the comment rule in its field note under *Text that does no work*, and keeps with the reviewer whether the line is unconventional enough to earn a comment and whether the sentence is a reason.

Every sentence added is itself under the check, so none counts adjacent content, claims a position or writes history.

## The widened run

The check is run over `skills/skills-maker` with the code files in reach. Every finding it raises in a comment is fixed in the comment, or excepted in the rule that misfires with the reason beside it, per *How a phrase list grows* in `skills/skills-maker/workflows/check.md`; the measurement above says the run is clean as the branch stands, so this step is expected to change nothing and is run rather than assumed.

## Steps

- Add the `[*.{js,py}]` section to `skills/skills-maker/.vale.ini`.
- Write `'skills/skills-maker/assets/Agentifico/CommentSentences.yml'` and `'skills/skills-maker/assets/Agentifico/CommentLength.yml'`, each with the reason directives raise nothing and the length rule with its calibration.
- Widen the glob in `skills/skills-maker/scripts/check.js` to `*.js` and `*.py`, keeping markdownlint, the skill discovery and the empty-target exit on markdown alone.
- Add the code section and the fixtures to `skills/skills-maker/scripts/test/vale.test.js`, and the code-file fixture tree to `skills/skills-maker/scripts/test/check.test.js`, watching each new fixture fail.
- Say in `skills/skills-maker/workflows/check.md` which files are read, add the rules to its table, and record what escapes.
- Name the mechanical half in `skills/skills-maker/workflows/review.md`.
- Run the widened check over `skills/skills-maker` and fix or except every finding it raises.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.10.0` to `3.11.0`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

The suite proves each rule fires on its fixture and stays quiet on its guards, and the check's run over the package proves the widened reach raises nothing on the package's own comments and that the new prose breaks no prose rule. No gate reads whether the cap is the right figure for a package other than this one, whether a comment that passes both rules is a reason, or whether a directive read together with the comment above it deserved the finding; the round reads those.

## Open questions

None.
