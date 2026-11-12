> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Answer only the owner in discuss

Issue #3 holds the acceptance criteria. This plan says how.

## Approach

`plugins/gh-solo/skills/pr-flow/references/review-protocol.md` already owns the rule, in *The cast*, and the test, in *Recognising the owner*. `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` gets a pointer at both under *Reading the threads*, plus the one local consequence: a signal that fails the test is named in Step 5's report and given nothing else, in this round and every later one. Its *Review bodies and Conversation comments* section stops classifying a mentor's body by the owner's table, and stops counting it as live. Step 5 names what was read and left alone.

`plugins/gh-solo/skills/pr-flow/workflows/watch.md` and `plugins/gh-solo/skills/pr-flow/scripts/watch.py` do not change, since the watch already emits a mentor's comments. The change brings the workflow in line with its own protocol, so the version moves its patch, from 5.3.0 to 5.3.1.

## Steps

- ::S1:: Point *Reading the threads* in `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` at *The cast* and *Recognising the owner*, and state that a signal failing the test is reported and never answered or carried as live
- ::S2:: Rewrite the classification sentence of *Review bodies and Conversation comments* in the same file to apply the test
- ::S3:: Add the read-and-left-alone line to Step 5 of the same file
- ::S4:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` to 5.3.1

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-08_GHI-3_answer-only-the-owner.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V5:: `git grep -n "the owner's or the mentor's" -- plugins/gh-solo` exits 1, watched exiting 0 on the tree before S2

V5 catches the contradicting sentence surviving. It cannot see another sentence that answers a mentor in different words, so that is the review round's to catch. The criteria gate is off here, since `.agents/gh-solo.md` carries no `Test files:` line.

## Open questions

None.

## Settled

- ::Q1:: Should a repository list the logins agents never answer, in a `Never reply to:` line? No, settled in the terminal: the protocol already answers only the owner, so `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` applies its test and no config line is added. #3 was rewritten to match.
