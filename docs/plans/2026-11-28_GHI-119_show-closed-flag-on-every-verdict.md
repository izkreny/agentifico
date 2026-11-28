> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Show the closed flag on every verdict

Issue #119 holds the acceptance criteria. This plan says how.

## Approach

`plugins/gh-solo/skills/pr-flow/scripts/post-review.py` gains one renderer for a verdict's text. A closing verdict reads `::RF{n}::CLOSED:: {why}`, byte for byte the marker the tree already uses. A verdict that does not close reads `::RF{n}::OPEN:: {why}`, which is a new marker (AC5). Both routes call it (AC2).

**The direct route.** `build` on a re-review already validates `verdicts[]`. It now also writes `--verdicts-out`: one `{rf, closed, body}` per verdict, the body opening with the disclaimer and `via` `pr-flow` review, re-review verdict. The flag is required on a re-review and refused on a full pass, like `--anchored-at`. Step 5 of `plugins/gh-solo/skills/pr-flow/workflows/review.md` posts each body unchanged into its finding's thread, so the orchestrator types no marker (AC3).

**The held route.** A `verdict` entry handed to `followup` becomes `{rf, kind, closed, text}`, `text` being the reviewer's `why`, and `followup` refuses one whose `closed` is missing or not a boolean (AC1). `release` renders such an entry through the same function. A ledger an older version posted has no `closed`, so `release` copies its text unchanged rather than refusing it or doubling a marker typed inside it.

`ID_PATTERN` skips `::RF{n}::OPEN::` as it skips `::RF{n}::CLOSED::`, so the highest-id read never counts a verdict as an issued id. *Keys* in `plugins/gh-solo/skills/tracker/references/formats.md` gains the new marker's row. `resolve-closed` keys on `::RF{n}::CLOSED::`, which the new marker does not contain, so `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` needs no change.

The commits are marked `fix`. A verdict was always meant to state its finding's state, and no interface an installer calls changes. The version moves from 6.0.5 to 6.0.6, by the patch, since #119 is a child of epic #240.

## Steps

- ::S1:: Add the bench cases to `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` and watch them fail: `build --verdicts-out` renders a closed and a not-closed verdict and is required on a re-review and refused on a full pass; `followup` refuses a verdict entry without a boolean `closed`; `release` renders a ledger verdict in both states and copies a legacy one unchanged; the highest-id read skips `::RF{n}::OPEN::`
- ::S2:: Add the renderer, `build --verdicts-out`, the `followup` check, the `release` rendering and the `ID_PATTERN` skip to `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`
- ::S3:: Point Step 5 of `plugins/gh-solo/skills/pr-flow/workflows/review.md` at the rendered bodies, on both the direct route and the follow-up entries
- ::S4:: Add the `::RF{n}::OPEN::` row to *Keys* in `plugins/gh-solo/skills/tracker/references/formats.md`
- ::S5:: Move the version in `plugins/gh-solo/.claude-plugin/plugin.json` to 6.0.6

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-28_GHI-119_show-closed-flag-on-every-verdict.md`
- ::V2:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` passes. Each new case is first watched failing on the pre-fix `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`, and the legacy-ledger case, which passes there, is watched failing with the legacy branch of the `release` rendering deleted from the fixed script
- ::V3:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans` exits zero
- ::V4:: `python3 scripts/version-check.py`
- ::V5:: `python3 scripts/manifest-check.py`

No gate can see whether a round posts the rendered bodies rather than its own prose, since Step 5 is prose. A round runs the installed plugin, not this branch, so that can only be judged after a release ships it. `plugins/gh-solo` is off the agents-guru list on this stack, so that check is not a gate here.

## Open questions

None.

## Settled

None yet.
