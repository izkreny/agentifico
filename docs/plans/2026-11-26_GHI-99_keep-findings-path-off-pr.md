> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Keep the findings path off the pull request

Issue #99 holds the acceptance criteria. This plan says how.

## Approach

The fix goes where the report is published, per the issue's N1: item 7 of Step 2 in `plugins/gh-solo/skills/pr-flow/workflows/review.md`. That item relays the reviewer's report verbatim, which is what put a local scratchpad path into the round report on #474.

Item 7 keeps the relay and gains one rule. The line naming the findings file is left out of the comment. Any other absolute local path in the report, such as a scratchpad file the reviewer wrote while reading an older revision, is cut down to its bare file name. The rest of the report is relayed verbatim as before.

The same item says why, so a later round does not put the path back. The round's only reader of that path is the orchestrator, which has already read the file and posted from it by item 7. On the pull request the path has no reader, and on a public repository it publishes a session id and the machine's layout under the owner's login.

The reviewer's own rule stays as it is, per N2. `plugins/gh-solo/skills/reviewer/SKILL.md` still requires the path on its own line, which is how the orchestrator gets it (AC2).

`plugins/gh-solo/skills/pr-flow/references/post-caps.md` and `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` both describe this relay. Neither becomes false, since what is relayed is still the reviewer's own text, so neither changes.

The version moves from 6.0.2 to 6.0.3, by the patch, since #99 is a child of epic #240.

## Steps

- ::S1:: In item 7 of Step 2 in `plugins/gh-solo/skills/pr-flow/workflows/review.md`, leave the findings-file line out of the relayed report, cut any other absolute local path to its file name, and say why
- ::S2:: Move the version in `plugins/gh-solo/.claude-plugin/plugin.json` to 6.0.3

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-26_GHI-99_keep-findings-path-off-pr.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans` exits zero
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`

No gate can see whether a round obeys the rule, because it is prose an orchestrator follows rather than a script. A round runs the installed plugin, not this branch, so the rule can only be judged on a round after a release ships it. `plugins/gh-solo` is off the agents-guru list on this stack, so that check is not a gate here.

## Open questions

None.

## Settled

None yet.
