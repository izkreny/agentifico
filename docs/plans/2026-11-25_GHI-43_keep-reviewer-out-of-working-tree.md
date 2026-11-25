> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Keep the reviewer out of the working tree

Issue #43 holds the acceptance criteria. This plan says how.

## Approach

All the edits are in the reviewer skill. `plugins/gh-solo/skills/reviewer/SKILL.md` binds both entrances, so the rule and the route go there and neither workflow file changes.

*Never write* in `plugins/gh-solo/skills/reviewer/SKILL.md` keeps its bullet against touching the tree and gains one sentence. It names the four commands that overwrite a file and print nothing: `git checkout <rev> -- <path>`, `git checkout -- <path>`, `git restore <path>` and `git restore --source=<rev> <path>`.

A new section in `plugins/gh-solo/skills/reviewer/SKILL.md`, *Reading a file at an older revision*, follows *What you never do*. It gives the route, `git show <rev>:<path> > <scratchpad>/<name>`, which needs no checkout and no clone. It says a command that writes into the scratchpad and everything that depends on it stay in one Bash command, chained with `&&`, because the shell comes back to the repository after each call. It says a failed read stops and is reported as not established, never retried through a checkout, a restore or a clone.

`plugins/gh-solo/skills/reviewer/references/baseline.md` sends the reviewer to an older revision, through its rule that a check never seen to fail is not evidence. That bullet gains one sentence pointing at the new section, so the reviewer meets the route at that moment.

The version moves from 6.0.1 to 6.0.2, by the patch, since #43 is a child of epic #240.

## Steps

- ::S1:: Name the four silent commands in *Never write* in `plugins/gh-solo/skills/reviewer/SKILL.md`
- ::S2:: Add *Reading a file at an older revision* to the same file: the `git show` route, the chain inside one Bash command, and the stop on a failed read
- ::S3:: Point the seen-to-fail bullet in `plugins/gh-solo/skills/reviewer/references/baseline.md` at that section
- ::S4:: Move the version in `plugins/gh-solo/.claude-plugin/plugin.json` to 6.0.2

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-25_GHI-43_keep-reviewer-out-of-working-tree.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans` exits zero
- ::V3:: `node skills/agents-guru/scripts/check.js plugins/gh-solo` exits zero
- ::V4:: `python3 scripts/version-check.py`
- ::V5:: `python3 scripts/manifest-check.py`
- ::V6:: The AC5 probe below, saved verbatim to a file in the harness scratchpad and run with `bash`, exits zero, after it was seen exiting 1 with its route line replaced by the unchained shape

No gate can see whether a reviewer actually reaches for the route. A spawned reviewer runs the installed plugin, not this branch, so its behaviour can only be judged once a release ships it.

### The AC5 probe

It builds a throwaway repository and makes the scratch path fail. The unchained shape must leave the tree dirty, and the route must leave it clean.

```bash
set -u
repo=$(mktemp -d) && cd "$repo" && git init -q \
  && echo one > f && git add f && git -c commit.gpgsign=false commit -qm a \
  && echo two > f && git -c commit.gpgsign=false commit -qam b || exit 2
missing="$repo/.no-such-dir/scratch"

cd "$missing" 2>/dev/null; git checkout HEAD~1 -- f
unchained=$(git status --porcelain)
git checkout -q HEAD -- f

git show HEAD~1:f > "$missing/f" 2>/dev/null && cat "$missing/f"
route=$(git status --porcelain)

echo "unchained=<$unchained> route=<$route>"
[ -n "$unchained" ] && [ -z "$route" ]
```

## Open questions

None.

## Settled

None yet.
