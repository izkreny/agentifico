> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Cap the length of non-main skill files

Issue [#218](https://github.com/izkreny/agentifico/issues/218). It is not part of an epic, so the branch is cut from `main` and not stacked.

## What changes

**A new Vale rule, `FileLength`, warns on a skill file past 2,800 words of prose.** It lives at `skills/skills-guru/assets/Agentifico/FileLength.yml` (new). It is a `metric` rule with `formula: words`, as `SkillSplit` is, and a warning for the reason the issue gives: past the cap the fix is a split, and whether a split fits is the writer's call.

**The figure is measured against this package, as `ParagraphLength`'s is.** Read through Vale's words metric on 2026-09-30, the package's files other than SKILL.md and README.md ran to a median of about 1,360 words and a maximum of 2,779, in `skills/skills-guru/workflows/check.md`. 2,800 is the round figure just above the longest, so the rule names nothing in the package today. It would have fired on `skills/skills-guru/workflows/check.md` at its old size of about 4,900 words. The rule's header comment records this measurement.

**README.md is outside the cap.** The cap exists because an agent loads a routed file whole, so its size is context spent. A README is read by a person and never loaded by an agent, so that reason does not reach it. This settles the question the issue leaves to the plan. It also narrows the issue's second criterion from "every markdown file except SKILL.md" to every markdown file except SKILL.md and README.md.

**`skills/skills-guru/.vale.ini` enables the rule for markdown and turns it off where it does not apply.** It is on in `[*.md]` and off in the SKILL.md section, in `[*.{js,py}]`, and in a new `[**/README.md]` section. Whether a later section keeps the earlier section's `= NO` lines is tested, not assumed. The two comments that say the file-length rules measure a SKILL.md and no other file are rewritten.

**The rule is stated in `skills/skills-guru/workflows/new.md`**, under *Let size decide whether to split*, with its figure and its reason. `skills/skills-guru/workflows/check.md` gets a row for it in the rule table. The package moves from 5.0.2 to 5.1.0, since every skill the check reads can now get a new warning.

## Steps

- Write `skills/skills-guru/assets/Agentifico/FileLength.yml` (new), with `tests:` cases one word over the cap and at it.
- Enable it in `skills/skills-guru/.vale.ini` for markdown other than SKILL.md and README.md, and rewrite the two comments about the file-length rules.
- Add a `describe` block to `skills/skills-guru/scripts/test/vale.test.js`: a workflow file past the cap is measured, and a SKILL.md and a README.md are not.
- State the cap in `skills/skills-guru/workflows/new.md` and add its row to the table in `skills/skills-guru/workflows/check.md`.
- Bump `metadata.version` in `skills/skills-guru/SKILL.md` to 5.1.0.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-guru test`
- `npm --prefix skills/skills-guru run lint`
- `node skills/skills-guru/scripts/check.js <package-dir>` exits zero for `plugins/gh-solo`, `skills/review-text`, `skills/skills-guru` and `skills/socratic-tutor`.
- With the rule's condition moved one word higher, `vale --no-global --config skills/skills-guru/.vale.ini test skills/skills-guru/assets/Agentifico/FileLength.yml` exits non-zero on the one-over case.
- With `FileLength` left out of `skills/skills-guru/.vale.ini`, `npm --prefix skills/skills-guru test` exits non-zero on the new `describe` block.

The check exits non-zero on errors only, so the new warnings it raises on `plugins/gh-solo` do not fail it. Several files there are over the cap, `plugins/gh-solo/skills/pr-flow/workflows/review.md` at about 6,900 words among them. Those warnings are the rule working, not a regression, and splitting those files is outside this branch.

## Open questions

None.


## Settled

- **Should the cap on a file other than SKILL.md be lower than the cap on a SKILL.md?** No, the owner settled: one figure, 3,500 words, for both. A SKILL.md is loaded on every invocation and a routed file only on its route, so the routed file does not get the tighter cap. This replaces the issue's method of measuring the figure against this package, and the 2,800 this plan derived from it.
- **What should the warning tell its reader to do?** Cut before splitting, worded as a suggestion, the owner settled. A read of the gh-solo files past the cap found restatement and rationale in each, so a split alone would move that prose without removing it, and whether to cut, split or leave a file is the owner's call.
