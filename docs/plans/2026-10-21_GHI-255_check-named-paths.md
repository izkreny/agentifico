> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Check named files and folders, dot-paths included

Issue [#255](https://github.com/izkreny/agentifico/issues/255), a child of epic #226.

## Where this branch sits

**It is cut from the tip of `chore/GHI-259_drop-globby-for-node-glob`, and its pull request targets that branch.** #255 is blocked by #259, and the issue's own `## Dependencies` says that records the stack's order rather than a need. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names. The trunk sitting ahead of this branch is normal for a stack and is not recovered here.

## Targets

**`skills/skills-guru/scripts/check.js` takes every argument as a target, and the working directory when there is none.** A folder target is walked as today: dot-folders and `node_modules` under it stay skipped. A file target is read as it is, whatever folders its path passes through, so `.agents/gh-solo.md` is read. A file goes to the reader its extension has: markdown to markdownlint and Vale, JavaScript and Python to Vale, YAML to the check's own YAML rules.

**A target that adds nothing fails the run, naming that target.** That covers a path that does not exist, a folder with no markdown under it, and a file no reader takes. With several targets, a wrong one must not hide behind a right one.

**A file reached by two targets is checked once, under the first target that reached it.** Otherwise `check.js plugins/gh-solo plugins/gh-solo/skills/pr-flow` would report each finding twice.

## The root each target gets

**Each target gets its own markdownlint call, with its own `root` for `skill-layout` and `skill-referenced-paths`.** The rules already read `root` from their config, so no rule file changes. The findings from every call land in the same headings.

**A folder target is its own root, and a file target's root is the working directory.** A file names no tree of its own, and its path was written against the folder the command runs in. Measured on this repository from its root: with the file's own folder as root, `.agents/gh-solo.md` gets 51 `skill-referenced-paths` findings, one per repository-relative path it names, and no prose edit could clear them. With the working directory as root it gets none. `AGENTS.md` gets the same findings either way.

## Printed paths

**Every printed path is relative to the targets' common folder, where a file target counts as its own folder.** One folder target therefore prints exactly what it prints today, which is what the suite pins. `check.js AGENTS.md .agents/gh-solo.md`, run from the repository root, prints `AGENTS.md` and `.agents/gh-solo.md`. The opening line names that common folder as the place skills were found under.

## The skill-only rules

**A file not named SKILL.md already gets none of the skill-only rules.** `skill-description`, `skill-frontmatter-parsed`, `skill-name`, `skill-invocation`, `skill-layout` and `skill-readme` each return early on any other file. The path rules, the directive rule and the prose-shape rules run on every markdown file, which is what #258 expects when it counts bolded-run findings in `.agents/gh-solo.md`. The single-file test shows this rather than adds it.

## Steps

- Add cases to `skills/skills-guru/scripts/test/check.test.js`: several folder targets in one run, a single file, a named file inside a dot-folder, a file not named SKILL.md that gets no skill-only finding, a duplicate target, a missing path, and a file no reader takes.
- Run the suite against the unchanged `skills/skills-guru/scripts/check.js` and record which new cases fail.
- Change `skills/skills-guru/scripts/check.js` to take several targets, a file or a folder each, with the roots, the printed paths and the failures above.
- Run the suite until it is green.
- Update `argument-hint` in `skills/skills-guru/SKILL.md` and the matching row in `skills/skills-guru/README.md` to `check [<path>...]`, and describe the new forms under *The check* in `skills/skills-guru/workflows/check.md`.
- Run `node skills/skills-guru/scripts/check.js AGENTS.md .agents/gh-solo.md` and confirm it ends on a report.
- Move skills-guru's version a minor, to 6.1.0.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `npm --prefix skills/skills-guru test`
- `npm --prefix skills/skills-guru run lint`
- `node skills/skills-guru/scripts/check.js skills/skills-guru`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `node skills/skills-guru/scripts/check.js skills/review-text`
- `node skills/skills-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

The run over `AGENTS.md` and `.agents/gh-solo.md` is not a box: it exits non-zero until #258 clears its findings, so only its ending on a report is checked, by hand. A file target's root is the working directory, so a run from anywhere but the repository root reports paths that resolve from the root; no gate here runs from elsewhere.

## Open questions

None.
