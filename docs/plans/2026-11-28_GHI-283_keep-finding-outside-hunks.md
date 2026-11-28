> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Keep a finding the diff caused outside its hunks

Issue #283 holds the acceptance criteria. This plan says how.

## Approach

**The anchor is the nearest line the diff shows in the same file** (N1). The record Review is one atomic call to the reviews endpoint, and its `comments[]` items take `path`, `position`, `body`, `line`, `side`, `start_line` and `start_side`, with no `subject_type`. A file-level comment would need a second endpoint outside that call, so it would break the atomic post. A Conversation comment does not thread, so the merge gate cannot audit it. A line anchor posts as an ordinary thread, and every gate already reads it.

**Where the file has no line in the diff, the anchor is the diff line whose change made the defect true.** On izkreny/groupifico#363 that is the new `asked?` call. The finding's text names the stale line by `path:line`, so the fixer is not sent to the anchor.

**The scope stays the diff's** (N2). The rule admits a defect only when the branch made it true. A defect that predates the branch stays out, wherever it sits.

**`build` refuses an anchor the diff does not show** (AC2). It gains `--pr-diff`, a file holding `git diff --unified=3` of the pull request, which is the context GitHub lets a thread anchor to. It refuses each finding whose `line` that diff does not show on its `side`, naming the finding's index and `path:line`. A held finding is skipped, since `release` already tests its anchor after the push. The flag is required on both passes. The full pass diffs at the pin; the re-review diffs at local `HEAD`, as its `--added-paths` does. Today such a finding reaches GitHub, whose `422` fails the whole post without naming it.

**The diff file is split per file on its `diff --git` header**, the way `unpushed_paths` already splits the unpushed diff, and the header's new-side path is the one a finding names, so a renamed file is tested under its new name. A file whose header git quoted, because its path holds an unusual character, is left untested. That fails open to GitHub's `422`, as every anchor does today, where a misread path would refuse a valid finding and throw away a paid pass.

**`plugins/gh-solo/skills/reviewer/workflows/rescope.md` does not change.** The anchor route is stated in `plugins/gh-solo/skills/reviewer/SKILL.md`, which binds both passes. Rescope's own qualification, for a line only the unpushed fixes carry, still stands beside it.

The commits are marked `fix`. The reviewer was always meant to report a defect the branch caused, and no interface an installer calls changes. The version moves from 6.0.6 to 6.0.7, by the patch, since #283 is a child of epic #240.

## Steps

- ::S1:: Add the bench cases to `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` and watch them fail: a `RIGHT` finding on a line the diff shows builds; a `RIGHT` finding outside every hunk is refused with its index and `path:line`; a `LEFT` finding is tested against the base side; a finding on a renamed file is tested under its new path; a held finding outside the diff still builds; `--pr-diff` is required on both passes. `run_build` passes a default diff that shows every existing case's anchor, so the existing cases stay green
- ::S2:: Add `--pr-diff` and the anchor check to `build` in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`, splitting the file on its `diff --git` headers and reading each file's hunks with the same parse `diff_lines` uses
- ::S3:: In `plugins/gh-solo/skills/pr-flow/workflows/review.md`, write the diff file in Step 2 item 4 and in Step 5's re-review block, with `--output` and the exit-code stop the added-paths line already has, and pass it to `build`. Reword item 5's `422` paragraph and the discard-record list in Step 1, which both place the unanchorable finding at the post rather than at `build`
- ::S4:: State the anchor route and its scope line in *The scenario and the anchor* of `plugins/gh-solo/skills/reviewer/SKILL.md`, replacing "anchor by reading the diff more carefully or drop". Point step 2's "your findings may be about nothing else" in `plugins/gh-solo/skills/reviewer/workflows/full.md` at that route, so it cannot read as excluding a defect outside the hunks
- ::S5:: Take the dropped-for-want-of-an-anchor case out of *Your report*'s "what you could not establish" item in `plugins/gh-solo/skills/reviewer/SKILL.md`, with the rescope clause that only qualified that case
- ::S6:: Move the version in `plugins/gh-solo/.claude-plugin/plugin.json` to 6.0.7

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-28_GHI-283_keep-finding-outside-hunks.md`
- ::V2:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` passes. On the pre-fix `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` every new case fails only on the unknown flag, so each is watched failing on a mutation instead: the refusal, `LEFT` and rename cases with the flag parsed and the anchor check removed, and the in-diff and held cases with the check made to refuse every finding, held ones included
- ::V3:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans` exits zero
- ::V4:: `python3 scripts/version-check.py`
- ::V5:: `python3 scripts/manifest-check.py`

No gate can see whether a reviewer follows the anchor route, since the procedure is prose. A round runs the installed plugin, not this branch, so that can only be judged after a release ships it. `plugins/gh-solo` is off the agents-guru list on this stack, so that check is not a gate here.

## Open questions

None.

## Settled

None yet.
