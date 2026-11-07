> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Sweep gh-solo before epic #266 merges

Issue #270 holds the acceptance criteria, as the last child of epic #266. This plan says how.

## The stack

Its `blockedBy` names #425, which is open. This is the stacked exception in *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`. The branch is cut from `feat/GHI-425_add-the-removed-marker-for-every-key` at `70bce42`, and that branch is the pull request's base. Every other child of #266 sits in its ancestry. The issue's `## Dependencies` names #420 as the child below, while the stack puts #425 there; the relation is what holds.

## The standard

The trunk is ahead of the stack by 19 `agents-guru` commits, which take that package from 7.2.0 in this tree to 8.8.0. The package that ships is judged by the rules it lands under, so the sweep holds it to 8.8.0. The reviewer reads `skills/agents-guru` at `origin/main` from the trunk checkout. The check runs twice, from the tree as `.agents/gh-solo.md` states it and from the trunk's copy.

## The sweep

One reviewer subagent reads the whole of `plugins/gh-solo` inline, as one document, following `skills/agents-guru/workflows/review.md` at `origin/main`. Its id is kept, so its Step 5 can judge the fixes. Its findings go on the issue as SW1, SW2 and on, and each fix commit cites its id. A fix outside the package, in `AGENTS.md` or `.agents/gh-solo.md`, lands here as the sweep's standing exception.

The version moves by the part the fixes earn: a patch, unless a fix changes what an installer runs or reads. It moves from 5.2.0 in its own commit, once the fixes are in.

## Steps

- ::S1:: Run the reviewer over `plugins/gh-solo`, and keep its id
- ::S2:: Record the findings on the issue with short ids
- ::S3:: Fix each finding, citing its id in the commit, or have the resumed reviewer refute it per Step 5
- ::S4:: Watch each new or changed check fail before trusting it
- ::S5:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json`
- ::S6:: Resume the reviewer on the fix commits for a verdict per finding, and record the verdicts on the issue

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-07_GHI-270_sweep-gh-solo-before-epic-266-merges.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `node <trunk-checkout>/skills/agents-guru/scripts/check.js plugins/gh-solo`, where `<trunk-checkout>` is a checkout of `origin/main`
- ::V7:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-docs-check.sh`
- ::V8:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-plan-check.sh`
- ::V9:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`
- ::V10:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-watch.sh`
- ::V11:: `bash plugins/gh-solo/hooks/test-ask-before-trunk-push.sh`
- ::V12:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-keys-check.sh`
- ::V13:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-criteria-check.sh`

V1 names this plan alone. The repository's substitution would also hand it the plans of #369 and #267, which sit below this branch and carry no keys. The version check's range takes in the bumps below this branch, so only S5 holds this branch's bump. Every plugin bench is listed, since which files the fixes touch is not known yet. Most fixes are prose, which no gate reads for meaning: the resumed reviewer's verdicts judge those.

## After the review round

The Vale re-mine is the last task, run after the round's fixes are pushed and before the merge, per *How a phrase list grows* in `skills/agents-guru/references/maintaining.md`. It reads everything merged since `gh-solo_4.13.0`, every other pull request in stack #414, this issue's findings, this pull request's threads and this branch's commits. Every new token goes on an `agents-guru` issue opened from this one, and none lands on this branch. The issue records what was read.

## Open questions

None.

## Settled

None yet.
