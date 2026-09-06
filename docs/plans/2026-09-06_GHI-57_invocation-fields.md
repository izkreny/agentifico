> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Check the frontmatter fields that decide who may invoke a skill

Closes #57. `skills/skills-maker` documents `disable-model-invocation` and never `user-invocable`, and its mechanical sweep reads neither. The reachable answer for a skill that only an agent loads therefore looks like `disable-model-invocation: true`, which blocks exactly that call. This branch documents both fields, adds one check for them, and bumps the version.

Stacked on #75, whose branch this one is cut from and whose PR is this one's base, which is itself stacked on #77, #88 and #54. That is the exception `.agents/gh-solo.md` states for an epic child's `blockedBy`: #75 is the blocker, and its branch is the base. The trunk-staleness step of the `open` workflow does not apply on a stacked branch.

## What the fields do

Read from the Claude Code skills reference on 2026-09-06, and matching the observation the issue records against 2.1.252. `disable-model-invocation` defaults to `false`; `true` keeps the description out of the model's context, blocks the model's call through the Skill tool, and stops the skill being preloaded into a subagent, while `/name` typed by the owner still works. `user-invocable` defaults to `true`; `false` hides the skill from the `/` menu and from `/name`, while the model can still invoke it. The two are independent, so a skill can be owner-only, model-only, or open to both. Whether one skill invoking another by name in the same session is blocked is untested, per the issue, and nothing here asserts it.

## Where the new checks live

**One new node script, check-invocation.js under `skills/skills-maker/scripts/`, sharing `skills/skills-maker/scripts/walk.js`.** `skills/skills-maker/scripts/check-descriptions.js` is a raw-line sweep over the one `description:` key and its bench asserts on that output shape, so a second key does not belong in it. The shell loop `skills/skills-maker/workflows/check.md` used to carry is the reason `skills/skills-maker/scripts/check-names.js` is a script: shell written as prose is never run and never tested. A script gets `skills/skills-maker/scripts/test-checks.sh`, where each case is a fixture.

**The scalar reader moves out of the name check into a shared module both scripts require.** The new check has to read `true # note` as `true`, which is the reader `skills/skills-maker/scripts/check-names.js` already carries. A second copy is the drift #101's notes name as the live defect, so the reader is extracted rather than copied, into scalar.js beside the walk. This edits the name check for that extraction and nothing else.

**#101 migrates this script with the others**, and its delete list does not yet name it. The handoff says so for the owner to amend the issue; this branch does not edit #101.

## What the check tests

**Each field present must parse to `true` or `false`, lowercase, once.** `yes`, `on`, `True` and their kin are the boolean trap the description sweep already rejects: a value some parsers read as a boolean and others as a string is a policy that holds on some agents. A duplicate key is the silent-last-wins trap, reported as the description sweep reports it.

**A field at a non-default value needs a description that says anything about invocation.** `disable-model-invocation: true` or `user-invocable: false` is a policy another agent ignores silently, so the description has to carry it too. The test is a keyword match: the description mentions invocation, spawning, or the skill's own `/name`. A field at its default relies on nothing and triggers no cross-check. What the heuristic cannot decide is whether the sentence it found matches the field, which stays with the reviewer, as `skills/skills-maker/workflows/check.md` already says of the continuation check.

**Calibrated against the real skills before it is trusted.** It must pass `plugins/gh-solo/skills/reviewer`, whose description says it is spawned, and flag `skills/review-text`, whose description is silent under `disable-model-invocation: true`. That second result is a finding in another package, reported in the handoff and not fixed here.

## Steps

- Extract the scalar reader from `skills/skills-maker/scripts/check-names.js` into scalar.js beside `skills/skills-maker/scripts/walk.js`, and have the name check require it; the bench stays green.
- Write check-invocation.js under `skills/skills-maker/scripts/`: walk the target, read both fields, flag a value outside `true`/`false`, flag a duplicate key, and flag a non-default value whose description says nothing about invocation. Same reporting shape as the sibling checks: one line per defect, a count line, non-zero on defects and on an empty target.
- Add fixtures to `skills/skills-maker/scripts/test-checks.sh`: a bad value, a duplicate key, each field at its non-default value with a silent description, each with a description that states the policy, a field at its default with a silent description, a value carrying a trailing comment, the empty target, and a package root. Watch the silent-description and bad-value assertions fail with the rule absent before the rule lands.
- Add `user-invocable` to the frontmatter table in `skills/skills-maker/workflows/new.md`, with its default and what `false` does, and extend the `disable-model-invocation` row: `true` blocks the Skill tool, so it never goes on a skill an agent loads that way, and `user-invocable: false` is the field for that case. Fold `user-invocable` into the sentence naming the Claude Code extensions other agents ignore.
- Add an invocation-check section to `skills/skills-maker/workflows/check.md`: the command, what it tests, and what it cannot decide.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from 1.5.0 to 1.6.0: a check added, nothing removed.

## Verification

- The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- `python3 scripts/version-check.py`.
- `bash skills/skills-maker/scripts/test-checks.sh`.
- `node skills/skills-maker/scripts/check-descriptions.js skills/skills-maker`, `node skills/skills-maker/scripts/check-names.js skills/skills-maker` and `node skills/skills-maker/scripts/check-continuations.js skills/skills-maker`.
- The new invocation check, run over `skills/skills-maker` from the repository root, exits zero.

**What these gates cannot see.** `skills/` is not a docs-check target, so nothing mechanical reads the new prose. The version check's range on this stack spans the bumps of #54, #88, #77 and #75, so it passes whether or not this branch moves the version. The keyword heuristic is calibrated by hand against `plugins/gh-solo/skills/reviewer` and `skills/review-text`, and the bench fixes that calibration only as far as its fixtures go.

## Open questions

- None.

## Settled

- **Script or prose sweep?** Script, for the reason `skills/skills-maker/workflows/check.md` gives for the name check: a value check written as shell prose is never run and never tested, and a script gets the bench.
- **JavaScript, when #101 moves everything to Ruby?** JavaScript: a Ruby script today would need its own copy of the walk, which is the duplication #101 exists to end, and #101 migrates the node checks as a set.
