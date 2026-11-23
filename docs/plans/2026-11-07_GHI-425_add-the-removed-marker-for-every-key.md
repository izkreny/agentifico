> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Add the removed marker for every key

Issue #425 holds the acceptance criteria. This plan says how.

## Approach

*Keys* in `plugins/gh-solo/skills/tracker/references/formats.md` gets the new form: a removed item is `- ::{key}{n}::REMOVED:: why`, with no checkbox, for every key a body list issues. `REMOVED` replaces any marker the line carried, so a removed `READ` criterion reads `::AC4::REMOVED::`. The table gains a marker row beside `::AC{n}::READ::`.

No parser changes. `IssueKeys`, `PlanKeys`, both repeat rules and the keys check's `ITEM_KEY` match the key as a prefix, so `::AC3::REMOVED::` already passes. The criteria check's `CRITERION` needs a checkbox, so a removed line is already skipped. What changes is the bench fixtures, which write the marker form. Each new case is watched failing on a mutant before it is trusted.

`plugins/gh-solo/skills/tracker/references/issue-shape.md`, `plugins/gh-solo/skills/tracker/workflows/validate.md` and `plugins/gh-solo/skills/tracker/README.md` point at *Keys* and write no form, so they stay out of the diff.

No check refuses a removed line in the old form, so nothing an installer wrote breaks. A new marker is new behaviour, so the version moves a minor: `plugins/gh-solo/.claude-plugin/plugin.json` goes from 5.1.0 to 5.2.0.

## Steps

- ::S1:: Rewrite the removed-item paragraph of *Keys* in `plugins/gh-solo/skills/tracker/references/formats.md` to the marker form, and add the `::{key}{n}::REMOVED::` row to its table
- ::S2:: Write the removed line of the issue fixture in `plugins/gh-solo/skills/pr-flow/scripts/test-keys-check.sh` in the marker form, and add a removed `S` line to its pull request fixture
- ::S3:: Write the removed criterion in `plugins/gh-solo/skills/pr-flow/scripts/test-criteria-check.sh` in the marker form
- ::S4:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` to 5.2.0

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-07_GHI-425_add-the-removed-marker-for-every-key.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-keys-check.sh`, its marker-form cases watched failing with the `IssueKeys` and `PlanKeys` item patterns made to require a space after the key's closing `::`
- ::V7:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-criteria-check.sh`, its removed case watched failing with the checkbox made optional in `CRITERION`
- ::V8:: `git grep -nE '::[A-Z]+[0-9]+:: removed' -- plugins/gh-solo` exits 1, watched exiting 0 on the tree before S1

V1 names this plan alone. The repository's substitution would also hand it the plans of #369 and #267, which sit below this branch and carry no keys. The version check's range takes in the bumps below this branch, so only S4 holds this branch's bump. The criteria gate is off here, since `.agents/gh-solo.md` carries no `Test files:` line. No check refuses a removed line in the old form, so the form holds only because it is written that way. No gate can see whether the rewritten *Keys* paragraph reads clearly.

## Open questions

None.

## Settled

None yet.
