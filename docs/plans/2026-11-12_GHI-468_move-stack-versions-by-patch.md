> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Move a stack's versions by patch only

Issue #468 holds the acceptance criteria. This plan says how.

## Approach

This branch writes the rule, AC1 and AC2. It touches only `AGENTS.md` and `.agents/gh-solo.md`, so it moves no package's version.

AC3 and AC4 apply the rule to epic #78's stack. Another session owns that renumber, on the stack's own branches. This branch messages that session once the rule is written, so the renumber follows the wording that lands.

In `AGENTS.md`, *An epic's work is stacked, and the stack is the release train* drops "every branch bumps exactly as it does anywhere else". It says instead that a stacked branch moves only the patch and still marks what it does. *A change to a package's own files moves that package's version* gains one sentence pointing at that exception, since it states the per-branch rule in general terms.

In `.agents/gh-solo.md`, the sweep section gains the step that sets the release's version. It reads the part off the stack's commits and pull request titles, and measures it from the version on the trunk.

## Steps

- ::S1:: Rewrite the per-branch bump sentence of *An epic's work is stacked, and the stack is the release train* in `AGENTS.md`, and point *A change to a package's own files moves that package's version* at it
- ::S2:: Add the version-setting step to *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md`
- ::S3:: Message the session that owns AC3 and AC4 that the rule is written

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-12_GHI-468_move-stack-versions-by-patch.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`

V3 passes without exercising anything, since this branch touches no package. No gate can see whether the new sentences read clearly where they sit, or whether a sentence elsewhere still implies a stacked branch bumps as it would alone.

## Open questions

None.

## Settled

None yet.
