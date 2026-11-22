> 🤖 Written by AI --- read/modified by izkreny! 🤓

# State the sweep issue's title format

Issue #333 holds the acceptance criteria. This plan says how.

## Approach

One paragraph lands in *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md`, right after the sweep's invocation block. It names the title shapes the open sweeps already use:

- An epic's last child: `sweep <package> before epic #<epic-number> merges`.
- A sweep outside an epic: `sweep <package> before its next tag`, or `before its first tag` for a package never tagged yet.

N1 files #298 under "next tag", but #213, #298 and #379 were all titled "first tag". The paragraph keeps both words, since a package with no tag has no "next" one.

The paragraph also says why the title names a moment before the merge or the tag: the sweep has to close by then, so a title naming a later moment tells the next reader it can wait. That covers AC2.

The paragraph carries no history and no length claim. The tracker's own *Titles* cap governs length, and `sweep action-policy-guru before epic #444 merges` already runs past ~40 characters, so a claim here would be false and a second copy of that cap.

The section already opens four paragraphs in a row with a bolded lead, so this one paragraph keeps the run within the check's cap of five.

The tracker's *Titles* rule says not to encode the epic in a title. Here the epic number names the moment, not the parent relation, and the issue asks for that shape, so the plan follows the issue.

## Steps

- ::S1:: Add the title-format paragraph after the sweep's invocation block in `.agents/gh-solo.md`

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-22_GHI-333_sweep-title-format.md`
- ::V2:: `node skills/agents-guru/scripts/check.js AGENTS.md .agents/gh-solo.md .agents/dependencies.md` exits zero
- ::V3:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V4:: `python3 scripts/version-check.py`

V4 passes without exercising anything, since this branch touches no package. No gate can see whether the paragraph reads right, or whether a future sweep will copy it.

## Open questions

None.

## Settled

None yet.
