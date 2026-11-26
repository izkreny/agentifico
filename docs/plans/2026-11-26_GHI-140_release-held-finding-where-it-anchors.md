> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Release a held finding where it anchors

Issue #140 holds the acceptance criteria. This plan says how.

## What is left

43b3fc9 (#237) already fixed the batch failure the issue reports. `release` now tests every anchor against the diff, names one it cannot anchor, and writes the rest. A run on a held `LEFT` entry in an added file confirms it: `release` names that entry as "outside the diff" and still writes the sound one. So AC3 is ticked on the issue.

Two gaps remain. `build` passes a `LEFT` side through unchecked, so on a full pass one such finding still fails the whole post with a `422` and costs a pass. And `release` gives the generic reason, not the real one.

## Approach

`build` gains a required `--added-paths` argument: a file holding the output of `git diff --name-only -z --diff-filter=A`. It refuses any finding whose `side` is `LEFT` on a listed path, and names the finding and the reason (AC2). `-z` keeps a path with unusual characters unquoted, which is what #313 is about. The script stays free of git, so its build cases need no repository.

`plugins/gh-solo/skills/pr-flow/workflows/review.md` writes that file before each `build`. A full pass diffs the base against the pin, because that is what the reviewer read. A re-review diffs the base against local `HEAD`, because an unpushed fix can add the file.

`release` already runs git against `--base`. Before testing a `LEFT` anchor, it checks whether the pull request adds that path. Where it does, it names the entry with that reason rather than "outside the diff" (AC1). The paths are read with the same `-z` parse `build` uses.

`plugins/gh-solo/skills/reviewer/SKILL.md` already says when a finding takes `LEFT`. One clause adds that a file the pull request adds has no base side, so every finding on it takes `RIGHT` (AC4).

`plugins/gh-solo/skills/pr-flow/workflows/resolve.md` says both "post it all the same" and "stop on its exit `2`" about a `release` that names an entry. An agent following the second would still lose the batch, so the second is reworded to match the first.

The version moves from 6.0.3 to 6.0.4, by the patch, since #140 is a child of epic #240.

## Steps

- ::S1:: Add the bench cases to `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` and watch them fail: `build` given a `LEFT` finding on an added path, and `release` given a batch of a `LEFT` entry on an added file beside a sound `RIGHT` entry
- ::S2:: Give `build` in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` the `--added-paths` argument and the refusal
- ::S3:: Give `release` the added-file reason
- ::S4:: Write the added-paths file before both `build` calls in `plugins/gh-solo/skills/pr-flow/workflows/review.md`
- ::S5:: Add the clause on added files to the anchor rule in `plugins/gh-solo/skills/reviewer/SKILL.md`
- ::S6:: Reword the stop on exit `2` in Step 6 of `plugins/gh-solo/skills/pr-flow/workflows/resolve.md`
- ::S7:: Move the version in `plugins/gh-solo/.claude-plugin/plugin.json` to 6.0.4

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-26_GHI-140_release-held-finding-where-it-anchors.md`
- ::V2:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` passes, its new cases first watched failing on the pre-fix `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`: `build` exits `2` without naming the added path, and `release` names the entry only as "outside the diff"
- ::V3:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans` exits zero
- ::V4:: `python3 scripts/version-check.py`
- ::V5:: `python3 scripts/manifest-check.py`

No gate can see whether a reviewer obeys the new clause, since it is prose. A round runs the installed plugin, not this branch, so the workflow changes can only be judged after a release ships them. `plugins/gh-solo` is off the agents-guru list on this stack, so that check is not a gate here.

## Open questions

None.

## Settled

None yet.
