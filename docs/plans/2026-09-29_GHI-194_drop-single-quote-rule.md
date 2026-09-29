> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Drop the single-quote rule for plans

Issue [#194](https://github.com/izkreny/agentifico/issues/194). It is not part of an epic, so the branch is cut from `main` and not stacked.

## What changes

One file, `.agents/gh-solo.md`, under *Check commands*.

The fenced docs-check command gains `--plans docs/plans`, after the plan substitution and before the first `--ignore`. That is where #193's own verification line put it.

The paragraph opening *A plan may not backtick a path it will create or delete* is rewritten. It points at the tag rule in `plugins/gh-solo/skills/pr-flow/workflows/open.md` rather than restating it. It points at *Paths must survive any working directory and any machine* in `skills/skills-maker/workflows/new.md` for the placeholders a path relative to a package uses. It adds what neither owner says from where it sits: only a file under `--plans` honours a tag, and a placeholder span is skipped outright, so neither needs an ignore.

The paragraph on why the substitution is unquoted stays. It is about shell quoting, not about paths in a plan.

## Out of this diff

Merged plans keep their single quotes, since a plan is a record of intent. The open plan for #189 is rewritten on that branch, in its own worktree, before it goes on.

Both files are repository-level, so no package's version moves.

## Steps

- Add `--plans docs/plans` to the docs-check command in `.agents/gh-solo.md`.
- Rewrite the single-quote paragraph in `.agents/gh-solo.md` to the tag and placeholder rule.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`

The gates cannot tell whether the rewritten paragraph reads clearly or points at the right owners. That is the review round's.

## Open questions

None.

## Settled

None yet.
