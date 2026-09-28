> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Resolve paths a branch adds or deletes

Issue [#193](https://github.com/izkreny/agentifico/issues/193). It is not part of an epic, so the branch is cut from `main` and not stacked.

## The design

`plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` gains two options, used together:

- `--trunk REF`: the ref the branch is compared against.
- `--plans DIR`: the directory that holds plans.

With both set, the script runs `git diff --name-status --no-renames REF...HEAD` once. `--no-renames` makes a rename one delete and one add, as the issue asks. From that one diff it takes three sets:

- The plans: every Markdown file under DIR that the branch adds or modifies. Each is checked like a target.
- The added paths and the deleted paths.

Inside a plan, a span also resolves when its path is in the added or deleted set. A span ending in `/` resolves when the branch adds or deletes a file under it. Outside a plan, nothing changes, so a doc naming a deleted file still fails.

Git paths are relative to the repository top, and the script's resolution bases are not. So a span is resolved against each base, then made relative to `git rev-parse --show-toplevel` before the set lookup.

Neither option has a default. A default of `origin/main` would assume the remote's name, which `plugins/gh-solo/skills/pr-flow/SKILL.md` forbids. One without the other is a usage error, and so is a ref git cannot resolve: exit 2.

The diff reads commits, not the working tree, so a plan must be committed before the check can see it. The docstring says so.

## Why an option for the directory, and not for each plan

The repository's command today passes plans as a positional `$(git diff --name-only origin/main...HEAD -- docs/plans)`. That substitution has to stay unquoted, and `.agents/gh-solo.md` spends a paragraph on why. With `--plans`, the script finds the plans from the same diff it already runs, so the substitution goes away.

## The bench

'plugins/gh-solo/skills/pr-flow/scripts/test-docs-check.sh' is new. It builds a throwaway git repository with a trunk and a branch, and drives the script through its command line, since the feature is git and options rather than one function. It takes the script's path as an optional argument, so it can run against another copy.

Each acceptance criterion is a case. The positive cases are watched failing against the trunk's copy of the script. The two "still fails" cases pass against the trunk's copy, so each is watched failing against a mutant instead: one that applies the added and deleted sets to every file, and one that resolves every span.

The path above is in single quotes because this plan is checked by the current command, which cannot resolve a file the branch has yet to write. That is the problem this branch removes.

## The docs

- `plugins/gh-solo/skills/pr-flow/workflows/open.md` says a plan legitimately fails on "a file the plan will create". That becomes false with the options, so it names them instead.
- `plugins/gh-solo/skills/pr-flow/SKILL.md`, the `plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` row of the supporting-files table, names the options and the bench.

`version` in `plugins/gh-solo/.claude-plugin/plugin.json` moves a minor, `4.8.0` to `4.9.0`: the script gains behaviour.

## Steps

- Write the bench, with a case per acceptance criterion.
- Run it against the trunk's copy of the script and read the positive cases fail.
- Add `--trunk` and `--plans` to the script, and update its docstring.
- Run the bench green, then against each mutant, and read the two "still fails" cases fail.
- Update `plugins/gh-solo/skills/pr-flow/workflows/open.md` and `plugins/gh-solo/skills/pr-flow/SKILL.md`.
- Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` to `4.9.0`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `python3 scripts/manifest-check.py`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-docs-check.sh`

The gates cannot tell whether the repository's own command should switch to the new options. That is a repository-level edit, and it is the open question below.

## Open questions

- `.agents/gh-solo.md` is a `repo` file, so this branch leaves it alone. Once this lands, its check command could become `--trunk origin/main --plans docs/plans`, and two of its paragraphs would go stale: the one on why the substitution is unquoted, and *A plan may not backtick a path it will create or delete*. Should that edit land on this branch, or as its own `repo` issue?

## Settled

None yet.
