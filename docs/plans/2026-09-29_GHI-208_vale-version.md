> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Name the Vale version the skills-guru checks need

Issue [#208](https://github.com/izkreny/agentifico/issues/208). It is not part of an epic, so the branch is cut from `main` and not stacked.

## What changes

One line in `.agents/gh-solo.md`, under *Check commands*: the paragraph on the skills-guru package's checks says Vale 3.20 or later, and becomes 3.21 or later. That matches `skills/skills-guru/workflows/check.md`, `skills/skills-guru/scripts/check.js` and the package's `compatibility` field.

The file is repository-level, so no package's version moves.

## Steps

- Change "Vale 3.20 or later" to "Vale 3.21 or later" in `.agents/gh-solo.md`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `git grep -n 'Vale 3\.20' -- ':!docs/plans' ':!skills/skills-guru/scripts/test'` prints nothing and exits 1. Before the fix it prints `.agents/gh-solo.md:40`.

The gates cannot tell whether any other prose implies the old version without naming it. That is the review round's.

## Open questions

None.

## Settled

- **Do the test fixtures count as naming Vale 3.20?** No. `skills/skills-guru/scripts/test/rules.test.js` and `skills/skills-guru/scripts/test/vale.test.js` hold "Vale 3.20" as input text for the rules, not as a requirement. Editing them would move the skills-guru version, which the issue's last criterion forbids. So the grep gate excludes that directory, and the second criterion is read as "no file states Vale 3.20 as a requirement".
