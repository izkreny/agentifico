> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Backtick the exit codes Digits warns on

Issue [#275](https://github.com/izkreny/agentifico/issues/275). It is not part of an epic, so the branch is cut from `main` and not stacked. It has no blockers.

## What changes

**Each bare exit code on the issue's lines goes in a code span.** "exits 2" reads "exits `2`", "exit code 3" reads "exit code `3`", and so on. An exit code is a literal rather than a count, so it stays a digit.

**`plugins/gh-solo/skills/pr-flow/workflows/resolve.md:101` also backticks its "Exit 0".** `Digits` does not report a zero, but the criterion asks for every exit code on the line, and a bare `0` beside a backticked `2` would read as a different kind of value.

**The plugin's patch version moves**, from 4.13.1 to 4.13.2. Every edit is prose and changes no behaviour.

## Steps

- Backtick the exit codes in `plugins/gh-solo/skills/pr-flow/SKILL.md`, `plugins/gh-solo/skills/pr-flow/workflows/merge.md`, `plugins/gh-solo/skills/pr-flow/workflows/open.md`, `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` and `plugins/gh-solo/skills/pr-flow/workflows/stack.md`.
- Backtick the exit codes in the comment and the docstring in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`.
- Bump `plugins/gh-solo/.claude-plugin/plugin.json` to 4.13.2.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`
- `python3 scripts/version-check.py`
- `python3 scripts/manifest-check.py`

This branch's skills-guru has no `Digits` rule, so its check passes without seeing the fix. The run that sees it is Vale with the #228 branch's `skills/skills-guru/assets/` and `skills/skills-guru/.vale.ini`, extracted by `git archive`, the rule raised to `error` and filtered to `Agentifico.Digits`, over `plugins/gh-solo`. Before the fix it exits 1 on exactly the issue's lines, and after it must exit 0.

## Open questions

None.

## Settled

None yet.
