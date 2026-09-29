> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Resolve paths a branch adds or deletes

Issue [#193](https://github.com/izkreny/agentifico/issues/193). It is not part of an epic, so the branch is cut from `main` and not stacked.

## The design

A plan tags a span naming a file it will create or delete: `` `scripts/new-check.py` (new) `` or `` `scripts/old-check.py` (delete) ``. The tag is exact: one space after the closing backtick, then `(new)` or `(delete)`, lowercase.

`plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` gains one option, `--plans DIR`, naming the directory that holds plans. A checked file under DIR honours the tags: a tagged span is skipped rather than resolved. No other file honours them, so a README that tags a missing path still fails. The plans to check are still passed as targets, so the repository's command keeps its `$(git diff ...)` substitution.

The span pattern gains an optional tag after the closing backtick, so the tag is read in the same pass as the span. A directory span ending in `/` is a span like any other, so it takes a tag the same way.

A `(new)` path is never checked, before or after the file exists. That is the blind spot single quotes also have, and the review round catches a wrong one.

## The bench

`plugins/gh-solo/skills/pr-flow/scripts/test-docs-check.sh` (new) builds a throwaway tree with a plans directory and a doc outside it, and drives the script through its command line. It takes the script's path as an optional argument, so it can run against another copy.

Each acceptance criterion is a case. The positive cases are watched failing against the trunk's copy of the script. The "still fails" cases pass against the trunk's copy, so each is watched failing against a mutant instead: one that honours the tags in every file, and one that skips every span.

## The docs

- `plugins/gh-solo/skills/pr-flow/workflows/open.md` gains the tag rule where it describes the plan. Its paragraph saying a plan legitimately fails on "a file the plan will create" names `--plans` instead.
- `plugins/gh-solo/skills/pr-flow/SKILL.md`, the `plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` row of the supporting-files table, names `--plans` and the bench.

`version` in `plugins/gh-solo/.claude-plugin/plugin.json` moves a minor, `4.8.0` to `4.9.0`: the script gains behaviour.

## Steps

- Write the bench, with a case per acceptance criterion.
- Run it against the trunk's copy of the script and read the positive cases fail.
- Add `--plans` and the tag to the script, and update its docstring.
- Run the bench green, then against each mutant, and read the "still fails" cases fail.
- Update `plugins/gh-solo/skills/pr-flow/workflows/open.md` and `plugins/gh-solo/skills/pr-flow/SKILL.md`.
- Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` to `4.9.0`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `python3 scripts/manifest-check.py`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-docs-check.sh`

The docs check carries `--plans docs/plans` so this plan's own tagged span resolves; the repository's command adopts it under #194. The gates cannot tell whether a `(new)` path names the file the branch actually created.

## Open questions

None.

## Settled

- The diff against the trunk cannot resolve a planned file at plan time, so a plan tags the span instead, with `(new)` or `(delete)` only. `--trunk` is dropped and `--plans DIR` stays.
- `.agents/gh-solo.md` adopts `--plans` under #194, not on this branch.
