> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Ask on a push that resolves to the trunk

Issue #311 holds the acceptance criteria. This plan says how.

## Approach

`destinations` in `plugins/gh-solo/hooks/ask-before-trunk-push.py` resolves a push with no refspec the way git does. `git help push` gives the order: the command's refspecs or `--all`, `--mirror`, `--tags`; then `remote.<name>.push`; then `push.default`.

So a push with `--tags` and no refspec pushes no branch. Otherwise the hook picks the remote: the one named on the command line, else `branch.<name>.pushRemote`, `remote.pushDefault`, `branch.<name>.remote`, then `origin`, per `git help config`. If that remote has `remote.<name>.push` entries, read with `--get-all`, those are the refspecs.

Otherwise `push.default` decides, `simple` when unset:

- `simple` and `current` push to the branch's own name, which is today's answer.
- `upstream` and its alias `tracking` push to `branch.<name>.merge`, but only when the push goes to `branch.<name>.remote`. To any other remote git refuses, so the hook stays quiet.
- `matching` pushes every local branch that has a name on the remote, so the hook returns every local branch name, and `main` keeps the ones that are trunk names. This holds on a detached HEAD too.
- `nothing` pushes nothing.

A refspec whose destination holds `*` is matched against `refs/heads/<trunk>` for each trunk name, after a short destination is qualified as a branch ref. A bare `:` is git's matching refspec and resolves as `matching` does. One function does both for refspecs from the command line and from `remote.<name>.push`.

A `-c key=value` before `push` changes config for that one command, and a scratch repository showed `git -c push.default=upstream push` pushing `feat -> main` over a `simple` in the file. `push_invocations` collects those pairs and every config read passes them back to git.

The bench `plugins/gh-solo/hooks/test-ask-before-trunk-push.sh` gets a fixture repository whose config is set per case and unset after it, so the existing cases keep testing the default `simple`. A second fixture has no local trunk branch, for the quiet `matching` case. The new cases land in their own commit before the fix and are watched failing there.

The version moves from 5.2.10 to 5.2.11, a patch, as a stacked branch does. The commit type is `fix`, with no `!`: a push that used to slip past now asks, and nothing that asked before stops asking, except a push git itself would refuse or that carries no branch.

## Steps

- ::S1:: Add the new cases to `plugins/gh-solo/hooks/test-ask-before-trunk-push.sh`, on a fixture with per-case config and on a fixture with no local trunk, and commit them alone, watched failing on the current hook
- ::S2:: In `plugins/gh-solo/hooks/ask-before-trunk-push.py`, resolve a push with no refspec by the order above: `--tags`, the push remote, `remote.<name>.push`, then `push.default`
- ::S3:: Resolve a pattern destination and a bare `:` against the trunk's full ref, in one function used for refspecs from the command line and from config
- ::S4:: Collect the `-c key=value` pairs in `push_invocations` and pass them to every config read
- ::S5:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` from 5.2.10 to 5.2.11

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-22_GHI-311_ask-on-a-trunk-resolving-push.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `bash plugins/gh-solo/hooks/test-ask-before-trunk-push.sh` exits 0. Each new case is watched failing on the S1 commit, which holds the pre-fix hook. A new quiet case that passes there is watched failing under a named mutation of the fixed hook instead.

No gate sees a colon-less refspec that `remote.<name>.push` maps to the trunk, such as `git push origin feat` with `refs/heads/feat:refs/heads/main` configured: the issue scopes to a push with no refspec and to patterns, so the hook still reads that as `feat`. No gate sees a remote group, a `--repo` remote, or a config value that only exists at runtime, where the hook keeps failing open. The criteria gate is off, since this repository's config sets no `test_files`.

## Open questions

None.

## Settled

None yet.
