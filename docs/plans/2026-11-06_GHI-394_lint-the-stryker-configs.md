> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Lint the Stryker configs with Biome

Issue [#394](https://github.com/izkreny/agentifico/issues/394), a child of epic #329. It is blocked by #383, which is open. This is the stacked exception in *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`: the branch is cut from `fix/GHI-383_fix-frontmatter-crash-and-triage-gaps` at `ec6abf7`, and that branch is the pull request's base.

## What was found

The `lint` script passes `scripts/` to Biome, so Biome walks only that directory. Widening `files.includes` alone changes nothing; the script has to walk the package root too.

Biome's default scope is too wide. With no `files.includes`, Biome 2.6.5 also formats the package's Markdown and YAML, `<skill-dir>/SKILL.md` and `<skill-dir>/assets/` included.

`["**/*.js", "**/*.mjs"]` is too narrow. It drops `<skill-dir>/scripts/test/vale.test.yml`, which `scripts/**` lints today.

`["scripts/**", "*.js", "*.mjs"]` reads what the lint reads today, plus `<skill-dir>/biome.json` and the two configs. Biome's `*` does not cross a `/`, so the root globs reach no subdirectory.

The version-control setting is needed once the walk starts at the package root. A Stryker sandbox under `<skill-dir>/.stryker-tmp/` is a copy of the whole package, its Biome config included. With the setting off, `biome check .` stops on "Found a nested root configuration" and exits non-zero. With `vcs.enabled`, `vcs.clientKind: "git"` and `vcs.useIgnoreFile`, it reads the package's own `.gitignore`, which lists `<skill-dir>/.stryker-tmp/`, `<skill-dir>/reports/` and `<skill-dir>/node_modules/`, and passes. Those are the names in the pinned 2.6.5 schema, and `vcs.root` defaults to the directory holding `<skill-dir>/biome.json`.

## What changes

**`skills/agents-guru/biome.json` turns the version-control setting on and widens `files.includes` to `["scripts/**", "*.js", "*.mjs"]`.**

**The `lint` script in `skills/agents-guru/package.json` becomes `biome check .`**, so `skills/agents-guru/biome.json` alone sets the scope.

**`metadata.version` in `skills/agents-guru/SKILL.md` moves from 8.7.1 to 8.7.2.** Only the package's lint tooling changes, so it is a patch.

## Steps

- Plant a lint break in `skills/agents-guru/stryker.config.mjs`, run the lint and watch it pass. Do the same for `skills/agents-guru/vitest.stryker.config.js`.
- Plant a sandbox copy under `<skill-dir>/.stryker-tmp/` and a broken JavaScript file under `<skill-dir>/reports/`, then run `biome check .` with the version-control setting off and watch it fail.
- Change `skills/agents-guru/biome.json` and the `lint` script.
- Rerun each planted break and watch the lint fail on it. Rerun the planted leftovers and watch the lint pass. Remove every plant.
- Move `metadata.version` to 8.7.2.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `npm --prefix skills/agents-guru run lint`
- `npm --prefix skills/agents-guru test`
- `node skills/agents-guru/scripts/check.js skills/agents-guru`
- `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- `node skills/agents-guru/scripts/check.js skills/review-text`
- `node skills/agents-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

No gate keeps the configs in the lint. A later edit to `files.includes` could drop them again, and only a reader would notice.

## Open questions

- **May this branch update the quote of the `lint` command in `.agents/gh-solo.md`?** That file says `skills/agents-guru/package.json` declares `biome check scripts/`, which is false once this lands. It is a repository-level file, so this package branch asks first. Recommendation: yes, here, as one line, so the quote never disagrees with the manifest.

## Settled

- **May this branch update the quote of the `lint` command in `.agents/gh-solo.md`?** Yes, the owner said in the session on 2026-11-06, after the review round. The quote moves to `biome check .` on this branch.
