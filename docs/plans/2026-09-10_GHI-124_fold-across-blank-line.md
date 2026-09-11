> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Read a fold across a blank line

Issue [#124](https://github.com/izkreny/agentifico/issues/124), the bottom child of epic [#156](https://github.com/izkreny/agentifico/issues/156).

## The defect

`folded()` in `skills/skills-maker/scripts/rules/frontmatter.js` stops at the first blank line, because its loop continues only on `/^\s+\S/`. YAML does not stop there: a run of empty lines between two content lines of a plain multi-line scalar becomes that many newlines, and the scalar goes on. So a description written across a blank line loads whole, and `skill-frontmatter-parsed` still reports it as `SILENTLY MUTATED`, because the raw reading it compares against is the truncated one. The check sends the author to fix frontmatter that already works.

The same short read hides a real trap in the other direction. A ` #` on a line after the blank truncates the value exactly as it does on the first line, and neither `skill-description` nor the differential can see it today, since neither ever reads that far.

## What the parser actually does

Taken from a run of the `yaml` package at the version this package pins, under the same `{ version: "1.1", uniqueKeys: false }` the differential uses, rather than from memory:

| Frontmatter | Parses to |
|---|---|
| `description: one` / `  two` / `` / `  three` | `"one two\nthree"` |
| `description: one` / `` / `` / `  two` | `"one\n\ntwo"` |
| `description: one` / `  two` / `` / `  three #x` | `"one two\nthree"` |
| `description: one` / `  two` / `` / `name: a` | `"one two"` |

So: a content line folds in with a space, a run of n blank lines becomes n newlines, a ` #` still cuts the value wherever it sits, and a blank line followed by a dedented line means the scalar had already ended, with nothing trailing.

## The criterion that names the wrong file

The issue's third acceptance criterion asks that the comment above `folded()` stop saying a fold across a blank line is not read. That comment does not say it: the sentence is at `skills/skills-maker/scripts/rules/skill-description.js:21`, inside the comment above the `value` binding. Both comments are wrong once the loop changes, so both are corrected and the criterion is read as covering the claim rather than the location.

## Steps

- Let the loop in `folded()` cross blank lines while a following indented content line is still coming, emitting one `\n` per blank crossed and a space otherwise. The separator is written by the content line that arrives, so a run of blanks before a dedented key contributes nothing, which is what the parser does.
- Correct the comment above `folded()`, which claims continuation lines are joined by spaces, and the comment at `skills/skills-maker/scripts/rules/skill-description.js:21`, which admits the gap this closes.
- Add the fixtures to `skills/skills-maker/scripts/test/rules.test.js`, each watched failing before it is trusted, per that file's own header rule. In the differential: a fold across a blank line reporting nothing; the same shape with a trailing ` #` reporting `SILENTLY MUTATED` and asserted on the raw text it names, since the detail is what separates a fixed reading from the truncated one that also reports; and a two-blank run asserted the same way, which is what tells one newline per blank from a single newline. In the raw sweep: the trailing ` #` after a blank reporting `TRUNCATED`. A raw-sweep fixture for the clean fold is left out, because it reports nothing before the change and nothing after, so no change to the rule could break it.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.0.0` to `3.0.1`. A patch: the check stops reporting a value that always loaded and starts reporting one that never did, and no interface moves.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

Vale 3.20.0 is on PATH and `skills/skills-maker/node_modules` is installed, so the suite and the check have what they need. What no gate here can see is whether the reading is the parser's rather than merely self-consistent: the suite compares the rule against fixtures whose expected values this plan took from a parser run, so a mistake in that run would be a green suite over a wrong answer. The differential itself is the standing guard against that, since it parses every skill's real frontmatter on every run.

## Open questions

None.
