> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Retire daisyui-designer

Issue [#200](https://github.com/izkreny/agentifico/issues/200). Not part of an epic, so the branch is cut from `main` and not stacked.

## Approach

Delete the whole package directory, `skills/daisyui-designer/` (delete), then remove the two places `.agents/gh-solo.md` names the package: its row in the label table and its term in the mandatory-axis audit query. The owner approved that repository-level edit on this branch.

The package was never tagged and carries no version, so nothing is bumped. `scripts/version-check.py` treats a package whose whole directory is gone as a retirement and passes it.

Two mentions stay, because they are dated records rather than instructions: plans under `docs/plans/`, and the calibration comment in `skills/skills-maker/assets/Agentifico/ParagraphLength.yml`, which belongs to another package.

## Steps

- Delete the whole of `skills/daisyui-designer/` (delete).
- Remove the `daisyui-designer` row and the `-label:daisyui-designer` query term from `.agents/gh-solo.md`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `git grep -n daisyui-designer -- ':!docs/plans' ':!skills/skills-maker/assets/Agentifico/ParagraphLength.yml'` prints nothing and exits 1

The grep matches today, so it has been seen to fail. No gate sees whether anyone still installs the skill from this repository; the GitHub label is deleted by hand once #200 closes.
