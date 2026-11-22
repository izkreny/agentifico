> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Gate the loop on its settings

Issue #80 holds the acceptance criteria. This plan says how.

## Approach

The gate is one script, `plugins/gh-solo/skills/pr-flow/scripts/settings-check.py` (new), with two entrances. A script rather than prose, because AC6 needs a bench to watch the refusal fire.

`preflight` makes the preflight's one `gh repo view` call, with the four merge fields added to `nameWithOwner` and `viewerPermission`. It prints the name and the permission, so the preflight still has what it confirms today, and that is how AC2 holds: the call moves into the script rather than gaining a sibling. It refuses, naming `/gh-solo:setup`, when squash is not the only enabled method or `deleteBranchOnMerge` is off. Below ADMIN it says the settings went unchecked and passes, which is AC3.

`door` runs in Step 1 of `plugins/gh-solo/skills/pr-flow/workflows/merge.md`. It reads `repos/{owner}/{repo}` and the trunk's protection over REST. It refuses when any repository setting differs, the title and message pair included, and when the protection is absent or does not hold. A 404 on the protection is a refusal; any other failed read exits 2 and is not one.

The expected values are not written a second time. The script loads `REPO_SETTINGS` and `protection_holds` from `plugins/gh-solo/skills/setup/scripts/setup.py` by path, as that script loads `plugins/gh-solo/skills/pr-flow/scripts/read-config.py`. So the gate cannot demand a state that `setup` would answer with "nothing to change", and AC5's test is the one N5 names.

The prose the gate makes false changes with it: the `--squash` fallback claims (AC7), the "reads none of them" lines in `plugins/gh-solo/skills/pr-flow/references/repo-settings.md` (N5), and the sentences in `plugins/gh-solo/skills/pr-flow/workflows/merge.md` that say nothing reads `delete_branch_on_merge`. The version moves from 5.2.9 to 5.2.10, a patch, as a stacked branch does. The commit carries `!`, because a repository the loop served yesterday now refuses every verb until `setup` runs.

## Steps

- ::S1:: Write `plugins/gh-solo/skills/pr-flow/scripts/settings-check.py` (new) with the `preflight` and `door` entrances above, loading `REPO_SETTINGS` and `protection_holds` from `plugins/gh-solo/skills/setup/scripts/setup.py`
- ::S2:: Write the bench `plugins/gh-solo/skills/pr-flow/scripts/test-settings-check.sh` (new), faking `gh` as `plugins/gh-solo/skills/setup/scripts/test-setup.sh` does: each wrong value alone refuses, all-good passes, below ADMIN passes at `preflight`, a protection 404 refuses, another failed read exits 2, and every refused state makes `setup.py plan` exit 1
- ::S3:: Replace the `gh repo view` call in the preflight of `plugins/gh-solo/skills/pr-flow/SKILL.md` with the script, in the shortest form that states the gate, and add the script to its *Supporting files* table
- ::S4:: Add the `door` run to Step 1 of `plugins/gh-solo/skills/pr-flow/workflows/merge.md`, and reword its opening paragraph and Step 4's claim that nothing it reads carries `delete_branch_on_merge`
- ::S5:: Leave one statement of why `--squash` stays, beside the command in Step 3 of `plugins/gh-solo/skills/pr-flow/workflows/merge.md`, and drop the fallback claim from the stacked-PR bullets there
- ::S6:: Drop the fallback claim from `plugins/gh-solo/skills/pr-flow/workflows/stack.md` and `plugins/gh-solo/skills/pr-flow/workflows/help.md`
- ::S7:: In `plugins/gh-solo/skills/pr-flow/references/repo-settings.md`, say the gate reads these settings, and reword the paragraphs that ask for a manual check the gate now makes
- ::S8:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` from 5.2.9 to 5.2.10

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-22_GHI-80_gate-the-loop-on-its-settings.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-settings-check.sh` exits 0, watched failing with each entrance mutated to pass every state
- ::V7:: `python3 plugins/gh-solo/skills/pr-flow/scripts/settings-check.py preflight` and `python3 plugins/gh-solo/skills/pr-flow/scripts/settings-check.py door` exit 0 on this repository, which already holds every setting

No gate sees a real repository refuse: none on hand has a wrong setting, so the bench is the only place a refusal fires. No gate sees whether the preflight prose reads clearly. The criteria gate is off, since this repository's config sets no `test_files`.

## Open questions

- ::Q1:: **May this branch list the new bench under *The plugin's benches* in the repository-level `.agents/gh-solo.md`?** Recommendation: yes, as #79 did for its own bench, so a later edit to the script knows which bench it owes. Until you answer, the edit stays out of `## Steps`.

## Settled

None yet.
