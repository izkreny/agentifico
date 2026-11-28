> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Record a defect-only re-review

Issue #143 holds the acceptance criteria. This plan says how.

## Approach

`build` in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` refuses a re-review whose `verdicts` is empty. The guard splits in two. `verdicts` must still be a list, so a missing or `null` value refuses as before, and `record_body` never iterates something that is not one. An empty list now builds when `findings` holds at least one entry (AC1). A re-review with neither verdicts nor findings still refuses, with a message saying it has nothing to record (AC2).

`plugins/gh-solo/skills/pr-flow/workflows/review.md` Step 5 gains the rule for a commit that claims no finding id (AC3). In a range where another commit or a body key claims an id, it rides along and the reviewer reads it under its second question. A range where nothing claims an id is never handed to the rescope entrance. It belongs to a full pass, which *The pass cap* in `plugins/gh-solo/skills/pr-flow/references/pass-cap.md` makes the owner's to buy with `approve`. That is the route #135 took for its fourth and fifth passes.

The workflow rule is the prevention, and the script change is the backstop. A round that hands an unclaimed range to `rescope` anyway, as #135 did, now records what that pass found, with `RF{n}` ids and threads.

The version moves from 6.0.4 to 6.0.5, by the patch, since #143 is a child of epic #240.

## Steps

- ::S1:: Add the bench cases to `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` and watch them fail: a re-review with findings and no verdicts must build, one with `verdicts` missing must refuse, and the existing empty case is renamed to what it now tests
- ::S2:: Split the verdicts guard in `build` in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`
- ::S3:: Add the rule for a commit claiming no finding id to Step 5 of `plugins/gh-solo/skills/pr-flow/workflows/review.md`
- ::S4:: Move the version in `plugins/gh-solo/.claude-plugin/plugin.json` to 6.0.5

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-28_GHI-143_record-defect-only-re-review.md`
- ::V2:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` passes. Its findings-only case is first watched failing on the pre-fix `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`, and its empty case, which passes there, is watched failing with the new empty-both refusal deleted from the fixed script
- ::V3:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans` exits zero
- ::V4:: `python3 scripts/version-check.py`
- ::V5:: `python3 scripts/manifest-check.py`

No gate can see whether a round follows the new rule in `plugins/gh-solo/skills/pr-flow/workflows/review.md`, since it is prose. A round runs the installed plugin, not this branch, so the rule can only be judged after a release ships it. `plugins/gh-solo` is off the agents-guru list on this stack, so that check is not a gate here.

## Open questions

None.

## Settled

None yet.
