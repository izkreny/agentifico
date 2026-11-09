> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Remove the appointed-command reviewer form

Issue #67 holds the acceptance criteria. This plan says how.

## Approach

No repository config here carries a `Reviewer command:` line, so the removal breaks nobody known. It is still a breaking change to a documented config key.

Every mechanism the form introduced goes with it. None has a reason of its own to stay:

- `unrated`, `severity_source` and `severity_basis` exist for a reviewer that gives no level. An appointed `Reviewer agent:` cannot be one. `plugins/gh-solo/skills/pr-flow/references/reviewer-appointment.md` says it "inherits the whole contract", and that contract in `plugins/gh-solo/skills/reviewer/SKILL.md` allows only `high`, `medium` and `low`.
- An absent `head` on a full pass is allowed today only because a command cannot report one. The same contract requires `head` on the full pass. So `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` now refuses a full pass with no `head`, and the "not corroborated" row goes.
- The `{sha}` requirement, the guessed `RIGHT` side and the skipped scoped re-review all lived on the command path only.

## Steps

- ::S1:: In `plugins/gh-solo/skills/pr-flow/references/reviewer-appointment.md`, drop `Reviewer command:` from the opening sentence and delete the whole *Where the appointed reviewer is a command* section, the findings-file rules and the no-re-review paragraph with it
- ::S2:: In `plugins/gh-solo/skills/pr-flow/workflows/review.md`, drop `Reviewer command:` from Step 1's key list, restate the `422` cause without the guessed side, and delete Step 5's skip paragraph
- ::S3:: In `plugins/gh-solo/skills/pr-flow/SKILL.md`, drop `Reviewer command:` from the row for the appointment reference
- ::S4:: In `plugins/gh-solo/README.md`, rewrite the subagent requirement as a hard one with no escape, keeping the sentence that reading the diff yourself is not the fallback
- ::S5:: In `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`, remove `unrated` from the severities and the axes, remove `SEVERITY_SOURCES` with both severity checks and the basis section of the record, and refuse a full pass with no `head`, removing the "not corroborated" row wording
- ::S6:: In `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`, remove the derived-severity cases, keep a case that `unrated` is refused as a severity and as an axis, and turn the no-head case into a refusal
- ::S7:: Remove the level-less reviewer bullet from `plugins/gh-solo/skills/pr-flow/references/review-protocol.md`, and from `plugins/gh-solo/skills/reviewer/SKILL.md` the `unrated` clause and the sentence about fields kept for an appointed reviewer
- ::S8:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` from 6.0.0 to 7.0.0, since removing a config key breaks whoever set it

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-09_GHI-67_remove-the-command-reviewer.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`, with S6's no-head refusal case watched failing against the posting script from before S5
- ::V7:: `git grep -n 'Reviewer command' -- plugins/gh-solo` exits 1, watched exiting 0 on the tree before S1
- ::V8:: `git grep -n -e unrated -e severity_source -e severity_basis -e corroborat -- plugins/gh-solo/skills/pr-flow plugins/gh-solo/skills/reviewer plugins/gh-solo/README.md` exits 1, watched exiting 0 on the tree before S1

No gate here can see whether the remaining prose still reads whole once the command paragraphs are gone; the review round judges that. The criteria gate is off, since `.agents/gh-solo.md` carries no `Test files:` line.

## Open questions

None.

## Settled

- ::Q1:: How should V8 read, given the bench must keep `unrated` to test that it is refused? Decided by the owner in the terminal: V8 greps only for `severity_source`, `severity_basis` and `corroborat`, which no file may still contain, and drops `unrated`. V6 covers `unrated`, through the bench cases that refuse it as a severity, an axis and an entry in `axes_run`.
- ::Q2:: Does the `Reviewer agent:` form go too? Yes, decided by the owner in a thread on #458, and #67 is rescoped to match. No repository config uses it, so `Reviewer model:` stays as the one reviewer key and the bundled agent is the only reviewer. `plugins/gh-solo/skills/pr-flow/references/reviewer-appointment.md` keeps its name, since this plan cites it by path.
