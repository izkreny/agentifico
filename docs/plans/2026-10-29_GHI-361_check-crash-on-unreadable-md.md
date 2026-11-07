> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Fix the check's crash on unreadable .md

Issue [#361](https://github.com/izkreny/agentifico/issues/361), a child of epic #329.

## Where this branch sits

**It is cut from the tip of `feat/GHI-360_skip-a-convention-rule`, and it sits on stack #359 above that branch.** #361 is blocked by #360, and the issue's own `## Dependencies` says that is serialisation on `skills/agents-guru/scripts/check.js`. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names, so the blocker does not stop the branch.

## The fix

**The walk keeps only what `fs.statSync` reports as a file.** The filter runs on the glob's result in the target loop of `skills/agents-guru/scripts/check.js`, before any file is given a root and before the `no markdown file found` test. It uses the `throwIfNoEntry: false` form the script already uses for a target. Each entry gets one of three outcomes:

- A file is kept.
- A folder is dropped without a word, whether it is a folder named `<target>/notes.md` or a link to one. Its files already arrive in the walk on their own.
- A dangling link is held for the report.

**The filter covers every extension the walk takes**, not only markdown. A dangling YAML link would crash the YAML reader the same way, and a dangling code file would hand Vale a file that is not there.

**A skill whose `README.md` is a folder then reaches `skill-readme`'s catch.** The folder no longer goes to markdownlint, so the rule reads it, fails with `EISDIR`, and reports the README as unreadable. No change to `skills/agents-guru/scripts/rules/skill-readme.js` is needed.

## The output

A dangling link prints in a group of its own, ahead of `skill rules`, in the form the other groups use:

```text
dangling links: 1
  agents/gone.md dangling-link points at nothing, so nothing was read from it
```

**Each one counts as an issue and fails the run.** `skills/agents-guru/workflows/check.md` already says a target the check cannot read fails the run, because its silence looks like a clean sweep. A link to nothing in a skill tree is a broken file, so the same reasoning holds. It is not counted in `files checked`, since nothing read it. A count of zero prints too, as every other group's does.

**A target whose only markdown is a dangling link is still refused with `no markdown file found`.** The link is not named in that case. The issue's criteria assume other files sit beside the link, and the refusal already fails the run.

## Steps

- Write the failing tests in `skills/agents-guru/scripts/test/check.test.js`, and watch each fail on the current `skills/agents-guru/scripts/check.js`. They are a target holding a folder named `<target>/notes.md` whose own file is still checked, a skill whose `README.md` is a folder, and a dangling markdown link beside files that are still checked. Each gets a fixture folder of its own, so no existing count moves.
- Restore #231's dangling link in the fixture's `<tmp>/plugins/dangling/agents/` to the name `<tmp>/plugins/dangling/agents/gone.md`, and have its test assert the link is named.
- Filter the walk and print the `dangling links` group, until the new tests pass and the old ones still do.
- Run Stryker scoped to the catch in `skills/agents-guru/scripts/rules/skill-readme.js`, under `capped 0-9` with `--concurrency 9`, and read that every mutant in it is killed.
- Name the group, the folder case and the dangling-link case in *The check* in `skills/agents-guru/workflows/check.md`.
- Move agents-guru's `metadata.version` from 8.1.0 to 8.1.1, since a crash becoming a report changes no working run.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `npm --prefix skills/agents-guru test`
- `npm --prefix skills/agents-guru run lint`
- `node skills/agents-guru/scripts/check.js <package-dir>` exits zero on each of `plugins/gh-solo`, `skills/review-text`, `skills/agents-guru` and `skills/socratic-tutor`

The scoped Stryker run is a step, not a gate, because no score fails it, per *The agents-guru package's mutation run* in `.agents/gh-solo.md`. Its result is read from the report and recorded on the issue's criterion. A symlink loop still stops the run, since `throwIfNoEntry` covers a missing target only, and the issue names the dangling case alone.

## Open questions

None.
