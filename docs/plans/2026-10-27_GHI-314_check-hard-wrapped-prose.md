> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Check that skill prose is not hard-wrapped

Issue [#314](https://github.com/izkreny/agentifico/issues/314), the first child of epic #329. *No hard wrapping* in `skills/agents-guru/workflows/new.md` asks for one line per paragraph, list item and blockquote, and nothing reads it. This branch turns it into a markdownlint rule.

## Where this branch sits

**It is cut from `main` and is the bottom of the epic's stack.** Its blocker, #229, is closed. #231's draft pull request, #293, is rebased onto this branch once this branch's work is done, and the rest of the epic's children stack above it.

## The rule

`skills/agents-guru/scripts/rules/skill-hard-wrap.js` (new) reads every markdown file, off micromark's token tree.

- A `paragraph` token whose last line is past its first is reported on its first line, naming how many lines it spans. A list item's paragraph and a blockquote's paragraph are `paragraph` tokens too, so one walk reaches all three.
- The walk does not descend into an `htmlFlow` token. markdownlint re-parses an HTML block's contents as a nested paragraph, and a prototype run reported a three-line `<div>` block as one.
- Fenced code, indented code, tables and headings are not paragraph tokens, so they are left alone without a case of their own. markdownlint strips frontmatter before parsing, so frontmatter is never read.
- A hard break, a trailing `\` or two trailing spaces, keeps the paragraph on two lines, so it is reported, as the issue's technical notes state.
- A lazy continuation line is part of its paragraph, so it is reported too. That is how a list broken by a column-0 block shows up, as the gh-solo case below does.

It joins `proseShapeRules` in `skills/agents-guru/scripts/lint-config.js`, since it reads how a file lays its prose out, and the suite's `RULES` list in `skills/agents-guru/scripts/test/rules.test.js`.

## What a prototype run found

A scratch copy of the rule ran over every package on the check's list in `.agents/gh-solo.md`.

- `skills/agents-guru`, `skills/review-text` and `skills/socratic-tutor` give no finding, so no unwrapping lands on this branch.
- `plugins/gh-solo` gives two, at lines 76 and 85 of `plugins/gh-solo/skills/pr-flow/workflows/review.md`. A table at column 0 closes the numbered list there, and `4.` and `5.` cannot interrupt the paragraph that follows, so each renders as run-on text. Fixing it moves gh-solo's version, so #357 owns it.

## The rest of the change

- `skills/agents-guru/workflows/check.md` gains *The hard-wrap rule*, naming its file and what it cannot decide, and calling itself the mechanical face of *No hard wrapping* in `skills/agents-guru/workflows/new.md`.
- `plugins/gh-solo` comes off the check's list in `.agents/gh-solo.md`, per *A package joins this list the day the check exits zero on it*. #357 puts it back. The owner approved this repository-level edit on this branch.
- `metadata.version` moves from 7.2.0 to 7.3.0, since the check reports something it did not before. Every earlier rule branch moved the minor.

## Steps

- Add the fixtures to `skills/agents-guru/scripts/test/rules.test.js` with a stub rule registered, and commit them alone. Run the suite and watch every case that wants a finding fail.
- Write `skills/agents-guru/scripts/rules/skill-hard-wrap.js` (new) and register it in `skills/agents-guru/scripts/lint-config.js`. Run the suite green.
- Add *The hard-wrap rule* to `skills/agents-guru/workflows/check.md`.
- Take `plugins/gh-solo` off the check's list in `.agents/gh-solo.md`.
- Move `metadata.version` to 7.3.0 in `skills/agents-guru/SKILL.md`.
- Run the agents-guru check on every listed package, the package's suite and its lint.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `npm --prefix skills/agents-guru test`
- `npm --prefix skills/agents-guru run lint`
- `node skills/agents-guru/scripts/check.js skills/agents-guru`
- `node skills/agents-guru/scripts/check.js skills/review-text`
- `node skills/agents-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

The fixtures cover a wrapped paragraph, list item, blockquote, hard break of both kinds and lazy continuation, each wanting a finding. They also cover a fence, an indented block, a table, frontmatter, an HTML block and a setext heading, each wanting none. The red run against the stub is the evidence each case can fire, recorded in the rule commit's body. A run of the check over `plugins/gh-solo` should report exactly the two findings above and nothing else, which is the false-positive test on the largest real input. It is not a box, because it exits non-zero until #357 lands.

## Open questions

None.

## Settled

- **What happens to gh-solo's two findings?** `plugins/gh-solo` comes off the check's list on this branch, and #357 fixes `plugins/gh-solo/skills/pr-flow/workflows/review.md` and puts it back.
- **Where does this branch sit against #293?** At the bottom of the stack, cut from `main`, with #293 rebased onto it.
- **Is a hard-wrap finding an error or a warning?** A warning, settled after the review round, because unwrapped prose is the author's convention and `skills/agents-guru/workflows/export.md` lets a skill decline its author's conventions. The check exits zero on `plugins/gh-solo` again, so it stays on the check's list, and #357 only fixes the broken list.
- **Does a wrapped YAML comment warn too?** Yes, so both faces of *No hard wrapping* behave alike.
