> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Spell out the digit counts Digits reports

Issue [#273](https://github.com/izkreny/agentifico/issues/273). It is not part of an epic, so the branch is cut from `main` and not stacked. It has no blockers.

## What changes

**`plugins/gh-solo/skills/tracker/references/issue-shape.md` spells out its range.** Line 60 reads "ten to thirty columns" instead of "10 to 30 columns".

**`plugins/gh-solo/skills/pr-flow/scripts/post-review.py` marks its exit code as a literal.** The docstring at line 1025 reads "`2` is the refusal code". The value is an exit code, not a count, so it stays a digit inside backticks.

**The plugin's patch version moves**, from 4.13.0 to 4.13.1. Both edits are prose and change no behaviour.

## Steps

- Spell out the range in `plugins/gh-solo/skills/tracker/references/issue-shape.md`.
- Backtick the exit code in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`.
- Bump `plugins/gh-solo/.claude-plugin/plugin.json` to 4.13.1.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`
- `python3 scripts/version-check.py`
- `python3 scripts/manifest-check.py`

This branch's skills-guru has no `Digits` rule, so its check passes without seeing the fix. The run that sees it is the #272 branch's `skills/skills-guru/scripts/check.js` against this tree. Before the fix it exits 1 on exactly these two lines, and after it must exit 0.

## Open questions

None.

## Settled

None yet.
