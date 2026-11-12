> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Add a setup skill

Issue #79 holds the acceptance criteria. This plan says how.

## Approach

The work is one script with two passes, a template, and a skill that runs them with the owner's yes in between.

`plugins/gh-solo/skills/setup/scripts/setup.py` (new) has a `plan` pass and an `apply` pass. `plan` reads the repository, its trunk protection and its config lookup, prints every change it would make, and writes nothing. It exits 0 when nothing would change and 1 when changes are pending. `apply` reads the same state again and writes only what differs. So a second `apply` writes nothing, which is AC6. A refusal exits 2, and the script refuses before any read where `viewerPermission` is below ADMIN.

The six repository settings go in one PATCH, sent only when one of them differs. That keeps squash on in the same call that turns the other methods off, and sends the title and message pair together, which is AC3.

Branch protection is the risky write, because a PUT replaces the whole protection object. The script sends a PUT only when a load-bearing value is wrong or protection is absent. The load-bearing values are `enforce_admins` true and `required_approving_review_count` 0. The PUT carries forward every other field the GET returned, `contexts` included, so a rerun never drops a check. With no protection and no existing contexts, `required_status_checks` goes as null, which is AC4.

The scaffold goes where *Writing a config* in `plugins/gh-solo/skills/pr-flow/references/repo-config.md` says to offer it: the in-repo `.agents/gh-solo.md` in the owner's own repository, and the user-level file when `gh repo view` reports a fork. Where any file in the config lookup already exists, the script writes nothing, because a scaffold beneath it would never be read. The lookup is imported from `plugins/gh-solo/skills/pr-flow/scripts/read-config.py`, so the two never disagree.

AC10 needs to know whether the config itself sets `mandatory_axis`, and `read-config.py get` cannot say, since it falls back to the default. So `get` gains `--no-default`, which exits 1 when the found config leaves the key unset.

The skill sets `disable-model-invocation: true`, so only the owner starts it, which is the reason #79 gives for making it a skill. The version moves from 5.2.8 to 5.2.9, a patch, as a stacked branch does. The commits are `feat`, which marks the new behaviour for the sweep.

## Steps

- ::S1:: Write `plugins/gh-solo/skills/setup/scripts/setup.py` (new) with the `plan` and `apply` passes above, checking the protection PUT's replace semantics against GitHub's REST reference before relying on them
- ::S2:: Write the template `plugins/gh-solo/skills/setup/assets/gh-solo.md` (new): a `json` block valid against `plugins/gh-solo/skills/pr-flow/references/repo-config.md` that sets no `mandatory_axis`, and a pointer at that file for the keys
- ::S3:: Write the bench `plugins/gh-solo/skills/setup/scripts/test-setup.sh` (new), faking `gh` as `plugins/gh-solo/skills/pr-flow/scripts/test-read-config.sh` fakes it, and `plugins/gh-solo/skills/setup/scripts/.gitignore` (new) for the bytecode it leaves; watch every case fail on a wrong value before trusting it
- ::S4:: Write `plugins/gh-solo/skills/setup/SKILL.md` (new), with `disable-model-invocation: true` and a grant narrowed to `gh`, `git` and `python3`, and `plugins/gh-solo/skills/setup/README.md` (new)
- ::S5:: Add `--no-default` to `get` in `plugins/gh-solo/skills/pr-flow/scripts/read-config.py`, with a case in `plugins/gh-solo/skills/pr-flow/scripts/test-read-config.sh`
- ::S6:: Make the offer in Step 3 of `plugins/gh-solo/skills/tracker/workflows/create.md` fire when `get mandatory_axis --no-default` exits 1, and name `setup` where no config exists at all
- ::S7:: Name `setup` in `plugins/gh-solo/skills/pr-flow/references/repo-settings.md` as the way to apply what it describes
- ::S8:: In `plugins/gh-solo/README.md`, add `setup` to *What is inside*, to *How each skill is reached* with its policy and load cost, and to the Python list under *Requirements*, and say in *Working in a fork* that it writes the fork's config to the user-level file
- ::S9:: List the new bench under *The plugin's benches* in `.agents/gh-solo.md`
- ::S10:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` from 5.2.8 to 5.2.9

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-12_GHI-79_add-a-setup-skill.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `bash plugins/gh-solo/skills/setup/scripts/test-setup.sh` exits 0, each case watched failing with the script's target value for that setting changed
- ::V7:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-read-config.sh` exits 0, the `--no-default` case watched failing with the flag made to fall back
- ::V8:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-criteria-check.sh`
- ::V9:: `python3 plugins/gh-solo/skills/setup/scripts/setup.py plan` exits 0 on this repository, which already holds every setting; the bench's wrong-value cases are where it is seen exiting 1

No gate runs `apply` against a real repository, and none will on this branch: the bench is the only place a write happens. No gate sees whether the skill's prose reads clearly. The criteria gate is off, since this repository's config sets no `test_files`.

## Open questions

None.

## Settled

None yet.
