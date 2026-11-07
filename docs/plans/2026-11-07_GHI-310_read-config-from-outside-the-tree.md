> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Read a repository's config from outside its tree

Issue #310 holds the acceptance criteria. This plan says how.

## Approach

A new reference, `plugins/gh-solo/skills/pr-flow/references/repo-config.md` (new), owns the lookup. It states the order: `<home-dir>/.agents/gh-solo/<owner>/<repo>.md`, then `<repo-root>/.agents/gh-solo.md`, then `<repo-root>/.claude/gh-solo.md`, and the first that exists is the config, whole, with nothing merged from the others. It states that `<owner>/<repo>` is the `nameWithOwner` that `gh repo view --json nameWithOwner` reports, the same call the preflight makes. It states that the in-repo file stays the default, and that the user-level file is for a tree that is not the owner's to write into, such as a fork.

Each skill's top file points at that reference: `pr-flow`, `tracker`, `implement` and `reviewer`. The reviewer is spawned with a PR number and a sha only, so `plugins/gh-solo/skills/reviewer/SKILL.md` tells it to resolve `nameWithOwner` itself before it reads the config.

Every other site that names an in-repo path is rewritten to say "the repository's config" and point at the reference. The sites are the ones `git grep -n "gh-solo\.md" -- plugins/gh-solo` lists outside the benches. The tracker's offer to write a config, in `plugins/gh-solo/skills/tracker/workflows/create.md`, gains the fork case: there it offers the user-level file.

`plugins/gh-solo/skills/pr-flow/scripts/criteria-check.py` is the one code site. Its `read_config` tries the user-level path first, keyed by `nameWithOwner`, and its gate-off message names the file it actually read. Its docstring points at the reference rather than restating the order.

*Working in a fork* in `plugins/gh-solo/README.md` names the user-level file as where a fork's config lives. A new reader is new behaviour, so `plugins/gh-solo/.claude-plugin/plugin.json` moves from 5.2.1 to 5.3.0.

## Steps

- ::S1:: Write `plugins/gh-solo/skills/pr-flow/references/repo-config.md` (new): the order, the `nameWithOwner` key, the in-repo default, and which file to offer when a repository has none
- ::S2:: Point the config bullet of `plugins/gh-solo/skills/pr-flow/SKILL.md`, the preflight read of `plugins/gh-solo/skills/tracker/SKILL.md`, the repository contract of `plugins/gh-solo/skills/implement/SKILL.md` and the precedence list of `plugins/gh-solo/skills/reviewer/SKILL.md` at the reference
- ::S3:: Rewrite every other site under `plugins/gh-solo/skills/` that names an in-repo path as a pointer at the reference, workflows, references and help files included
- ::S4:: Rewrite the same sites in `plugins/gh-solo/README.md`, `plugins/gh-solo/skills/pr-flow/README.md`, `plugins/gh-solo/skills/implement/README.md`, `plugins/gh-solo/skills/reviewer/README.md` and `plugins/gh-solo/skills/tracker/README.md`, and name the user-level file under *Working in a fork*
- ::S5:: Read the user-level file first in `plugins/gh-solo/skills/pr-flow/scripts/criteria-check.py`, and add the user-level cases to `plugins/gh-solo/skills/pr-flow/scripts/test-criteria-check.sh`, with `HOME` pointed at a temporary directory and `gh repo view` faked
- ::S6:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` to 5.3.0
- ::S7:: Watch the tracker on a fork, for AC5

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-07_GHI-310_read-config-from-outside-the-tree.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-criteria-check.sh`, its user-level cases watched failing against `plugins/gh-solo/skills/pr-flow/scripts/criteria-check.py` as `origin/main` holds it
- ::V7:: `git grep -nE 'gh-solo\.md.*gh-solo\.md' -- plugins/gh-solo ':!plugins/gh-solo/skills/pr-flow/references/repo-config.md' ':!*test-*.sh' ':!*.py'` exits 1, watched exiting 0 on the tree before S2

V7 catches a site that still restates the in-repo pair. It cannot see a site that names one in-repo path without the pointer, so that is the review round's to catch. The criteria gate is off here, since `.agents/gh-solo.md` carries no `Test files:` line.

S7 is a judgement, not a gate. On a scratch clone of a fork the owner holds, with Issues off, a fresh subagent reads `plugins/gh-solo/skills/tracker/SKILL.md` from this branch's tree by path, since the installed copy predates the change. It proposes labels for an issue without creating one. With only the user-level file present it must use that file's taxonomy; with an in-repo file beside it, the user-level one must still win. The user-level file is deleted afterwards.

## Open questions

None.

## Settled

- ::Q1:: May the AC5 observation write a user-level config file under the owner's home and clone a fork into the session folder? Yes, settled in the terminal: write it for the run, delete it afterwards, and write nothing to GitHub.
