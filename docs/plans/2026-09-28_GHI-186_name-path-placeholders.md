> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Name the placeholders a skill writes paths with

Issue [#186](https://github.com/izkreny/agentifico/issues/186). It is not part of an epic, so the branch is cut from `main` and not stacked.

## What lands

`skills/skills-maker/workflows/new.md` gains the one statement of three placeholders, each naming a root:

- `<skill-dir>`: the directory the skill is installed to.
- `<plugin-dir>`: the root of the plugin that ships the skill.
- `<repo-root>`: the top of the repository the skill serves.

A path inside the skill stays bare, relative to the skill's own directory, because a bare path is the one the check can verify. A path under any other root opens with the placeholder that names that root and keeps its backticks. The path rules already skip any span holding `<` or `>`, so a placeholder span is never reported.

`skills/skills-maker/workflows/check.md` stops telling authors to single-quote a path the target cannot resolve. That paragraph recommends the placeholder instead and points at `skills/skills-maker/workflows/new.md` for the set. `skills/skills-maker/SKILL.md` and the setup section of `skills/skills-maker/workflows/check.md` keep using `<skill-dir>`, and each points at `skills/skills-maker/workflows/new.md` for its definition.

`metadata.version` moves a minor, `3.12.0` to `3.13.0`, because the standard gains a vocabulary.

## Where each change goes

- `skills/skills-maker/workflows/new.md`, under *Paths must survive any working directory and any machine*: the three placeholders, and why a path inside the skill stays bare.
- `skills/skills-maker/workflows/check.md`, the paragraph opening *A path the target cannot resolve, and is not meant to, goes in single quotes*: rewritten to the placeholder rule. The `.agents/gh-solo.md` it names in single quotes becomes `<repo-root>/.agents/gh-solo.md`.
- `skills/skills-maker/workflows/check.md`, *The check*: `<root>/skills/` becomes `<target>/skills/`. It names the target being checked, and beside the three roots it would read as a fourth. It is the only `<root>` in the package.
- `skills/skills-maker/workflows/check.md`, *Setup, once per install*, and `skills/skills-maker/SKILL.md`: `<skill-dir>` points at `skills/skills-maker/workflows/new.md` instead of being defined in place.

The single-quoted example in the suite's `refs` fixture stays. It tests what the rule reads, and quotes still hide a span.

## The guards fixture

The `refs` fixture in `skills/skills-maker/scripts/test/check.test.js` gains a sentence with a backticked `<repo-root>/.agents/gh-solo.md` span. A new test asserts that `skill-referenced-paths` reports nothing on it.

That test passes before any change, because `skills/skills-maker/scripts/rules/paths.js` already lists `<` in `NOT_A_PATH`. To see it fail, drop `<` and `>` from that list, run the suite, read the new test fail, then restore the list.

## Steps

- Add the `<repo-root>` span and its test to `skills/skills-maker/scripts/test/check.test.js`.
- Remove `<` and `>` from `NOT_A_PATH` in `skills/skills-maker/scripts/rules/paths.js`, read the new test fail, and restore the list.
- State the three placeholders in `skills/skills-maker/workflows/new.md`.
- Rewrite the single-quote paragraph in `skills/skills-maker/workflows/check.md`.
- Rename `<root>` to `<target>` in `skills/skills-maker/workflows/check.md`.
- Point the `<skill-dir>` definitions in `skills/skills-maker/SKILL.md` and `skills/skills-maker/workflows/check.md` at `skills/skills-maker/workflows/new.md`.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` to `3.13.0`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

These gates cannot tell whether the new wording in `skills/skills-maker/workflows/new.md` reads clearly to a skill author. They also cannot tell whether a placeholder was the right choice at a given site. Both are for the review round.

## Open questions

None.
