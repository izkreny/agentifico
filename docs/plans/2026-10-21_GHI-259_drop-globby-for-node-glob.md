> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Drop globby for Node's built-in glob, and bump yaml and biome

Issue [#259](https://github.com/izkreny/agentifico/issues/259), a child of epic #226.

## Where this branch sits

**It is cut from the tip of `chore/GHI-232_move-suite-to-vitest`, and its pull request targets that branch.** #259 is blocked by #232, and the issue's own `## Dependencies` says that records the stack's order rather than a need for #232's work. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names. For the same reason the trunk sitting ahead of this branch is normal for a stack and is not recovered here.

## The swap

**`skills/skills-guru/scripts/check.js` finds its files with `glob` from `node:fs/promises`, passing `followSymlinks: true` and excluding `**/node_modules/**`.** The patterns stay the ones `globby` takes today: Markdown, JavaScript, Python and both YAML extensions. The issue's criterion names no YAML because it was written before #264 added it below this branch. Node's `glob` returns paths relative to `cwd`, so each one is joined to the target, where `globby` had `absolute: true`.

**Symlinks are the one difference that matters.** Node's `glob` does not follow a symlinked directory unless `followSymlinks` is set, and `globby` does. Without the option, the suite case *a directory of symlinks into the canonical tree is followed* goes red. The option detects cycles itself, so the check needs no guard of its own. A path reached through a symlink stays under the target rather than becoming its real path, which is what the skill names printed through `path.relative(target, …)` need.

**Dot-folders are skipped by both, which settles the issue's open technical note.** Tried on a scratch tree, `globby` and Node's `glob` returned the same files, with `node_modules`, a dot-folder and a dot-file all left out. The suite already holds the case the criterion asks for: *a dot-directory inside a skill is skipped*, whose file inside the dot-folder breaks a prose-shape rule if it is ever read. It is watched failing by widening the patterns to reach dot-folders for one run, then reverting.

## The Node minimum

**The minimum becomes 26.1, not 26.** `followSymlinks` arrived in Node 26.1.0, and on 26.0 the option is ignored without an error, so symlinked skills would quietly go unread. `engines.node` reads `>=26.1`, and so do the compatibility field in `skills/skills-guru/SKILL.md` and the Node line in `skills/skills-guru/workflows/check.md`. That still reads "26 or later" in the criterion's sense, at the minor the code needs.

**`skills/skills-guru/README.md` takes no edit.** It names no Node version at all, so that part of the criterion has nothing to change. The compatibility field in `skills/skills-guru/SKILL.md` is where the requirement lives, and a second copy in the README would be one more place to drift.

## The audit

**The gate is `npm audit --audit-level=high`.** A bare `npm audit` fails on any low advisory, and the three `katex` lows stay, so it could never go green. The `katex` advisory is recorded on #259 as accepted, with the reason the issue gives.

## Steps

- Replace `globby` with Node's `glob` in `skills/skills-guru/scripts/check.js`, and remove `globby` from the package with `npm uninstall`.
- Run the suite, then watch the symlink case fail with `followSymlinks` removed and the dot-folder case fail with a pattern that reaches dot-folders, restoring each.
- Raise the Node minimum to 26.1 in `skills/skills-guru/package.json`, `skills/skills-guru/SKILL.md` and `skills/skills-guru/workflows/check.md`.
- Pin `yaml` at 2.9.1 and `@biomejs/biome` at 2.5.15, point the `$schema` URL in `skills/skills-guru/biome.json` at 2.5.15, and fix whatever the new biome reports.
- Run the audit, and record the accepted `katex` advisory on #259.
- Move skills-guru's version a patch, to 6.0.1.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `npm --prefix skills/skills-guru ci`
- `npm --prefix skills/skills-guru test`
- `npm --prefix skills/skills-guru run lint`
- `npm --prefix skills/skills-guru audit --audit-level=high`
- `node skills/skills-guru/scripts/check.js skills/skills-guru`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `node skills/skills-guru/scripts/check.js skills/review-text`
- `node skills/skills-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

No gate runs the check on Node 26.0, so nothing here proves the 26.1 minimum is the right one; that rests on Node's own changelog. The version check reads the whole stack's range, so the patch bump is held by its step rather than by that gate.

## Open questions

None.
