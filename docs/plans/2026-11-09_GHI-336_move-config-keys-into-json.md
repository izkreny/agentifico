> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Move the config keys into a JSON block

Issue #336 holds the acceptance criteria. This plan says how.

## Approach

One new script owns the config: `plugins/gh-solo/skills/pr-flow/scripts/read-config.py` (new). It finds the config file by the lookup `plugins/gh-solo/skills/pr-flow/references/repo-config.md` states, reads the one fenced `json` block, checks it against the schema, and prints one key's value. It also makes every refusal in AC4 and AC5.

Every reader goes through it. `plugins/gh-solo/skills/pr-flow/scripts/criteria-check.py` calls it for `test_files`, and an agent calls it for every other key. So there is one parser, and the refusals hold for every key, not only for the one a script reads.

`plugins/gh-solo/skills/pr-flow/references/repo-config.md` states the schema once: each key, its type, its default and which skill reads it. Every other file names a key and points there.

## Decisions

**The keys are `reviewer_model`, `test_files`, `labels`, `branch_format`, `branch_types`, `issue_types`, `default_branch`, `remote` and `commit_scope`.** The branch format and its `{type}` vocabulary are two keys, since one is a template and the other a list.

**`labels` is an object.** `axis` names the mandatory axis, and `values` maps each label to what its deliverable is. Absent, the default Layer set applies.

**`commit_scope` takes `"label"`.** A branch commit then carries the issue's mandatory-axis label as its scope. Absent, a branch commit carries no scope, which is the plugin's default.

**An unknown key, or a value of the wrong type, refuses like an unparseable block.** A typo such as `reviewr_model` would otherwise be ignored, and its gate would switch off.

**An old line counts only at column one outside every fence.** So a backticked `Reviewer model:` in prose that explains the refusal does not trip it.

**`read-config.py get <key>` exits 0 and prints the value**, as JSON for an object or a list. It exits 1 when the key is unset, so the caller applies the default. It exits 2 with a `⛔ REFUSED` line on any refusal, or when it could not run.

**The version moves to 8.0.0, a major**, since every existing config with a Title-case line refuses after this change.

## Steps

- ::S1:: Write `plugins/gh-solo/skills/pr-flow/scripts/read-config.py` (new): the lookup moved out of the criteria check, the block parse, the schema check, the refusals and the `get` subcommand
- ::S2:: Write `plugins/gh-solo/skills/pr-flow/scripts/test-read-config.sh` (new): no config, no block, one block, every key read, an unset key, two blocks, an unparseable block, an unknown key, a wrong type, each old line, and an old line inside a fence or backticks that is not read
- ::S3:: In `plugins/gh-solo/skills/pr-flow/scripts/criteria-check.py`, read `test_files` through the new script and remove its own lookup and `Test files:` regex; in `plugins/gh-solo/skills/pr-flow/scripts/test-criteria-check.sh`, write every config fixture as a block and add a case that an old line refuses
- ::S4:: In `plugins/gh-solo/skills/pr-flow/references/repo-config.md`, state the block, the schema table, the refusals and how to call the new script
- ::S5:: In pr-flow, name the keys in the new form: `plugins/gh-solo/skills/pr-flow/SKILL.md` (the remote and default-branch conventions, the config bullet, the supporting-files table), `plugins/gh-solo/skills/pr-flow/references/reviewer-appointment.md`, `plugins/gh-solo/skills/pr-flow/workflows/review.md` and `plugins/gh-solo/skills/pr-flow/workflows/ready.md`
- ::S6:: In tracker, the same: `plugins/gh-solo/skills/tracker/SKILL.md` (its tools line and *Per-repo config*), `plugins/gh-solo/skills/tracker/references/tracker-fields.md` (the layer set, issue types, and the audit, which builds its exclusions from `labels`), `plugins/gh-solo/skills/tracker/references/formats.md` (`branch_format`, `branch_types`, `commit_scope`), `plugins/gh-solo/skills/tracker/workflows/create.md` and `plugins/gh-solo/skills/tracker/workflows/status.md`
- ::S7:: In `plugins/gh-solo/README.md` and `plugins/gh-solo/skills/reviewer/README.md`, show the keys as a block
- ::S8:: In `.agents/gh-solo.md`, put the keys in one block, which replaces the `Reviewer model:` line, the labels table and the hand-written audit query; point the commit header section at `commit_scope`; add the bench entry for `plugins/gh-solo/skills/pr-flow/scripts/test-read-config.sh` (new)
- ::S9:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` from 7.0.0 to 8.0.0

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-09_GHI-336_move-config-keys-into-json.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-read-config.sh`, with each refusal case watched failing on the new script with that refusal removed
- ::V7:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-criteria-check.sh`, with the block fixtures watched failing against the criteria check from before S3
- ::V8:: `git grep -nE 'Reviewer model|Test files' -- plugins/gh-solo ':!*read-config*' ':!*repo-config.md'` exits 1, watched exiting 0 on the tree before S5
- ::V9:: `python3 plugins/gh-solo/skills/pr-flow/scripts/read-config.py get reviewer_model` prints `opus` and exits 0 in this repository, watched exiting 2 on the `.agents/gh-solo.md` from before S8

No gate can see whether an agent reading the prose calls the script rather than reading the file itself, or whether the audit query it builds is right; the review round judges both. The criteria gate stays off, since this repository sets no `test_files`.

## Open questions

None.

## Settled

None yet.
