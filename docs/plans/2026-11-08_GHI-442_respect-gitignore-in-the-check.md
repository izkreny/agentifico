> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Respect .gitignore and take path globs in the agents-guru check

Issue #442 holds the acceptance criteria. This plan says how.

## Approach

One exclusion test replaces the hard-coded `**/node_modules/**` at both glob sites in `skills/agents-guru/scripts/check.js`: the file walk and the `.claude-plugin` search. It is a function passed as the glob's `exclude`, with `withFileTypes: true`, so it sees each entry's full path and prunes a whole folder at once. It leaves out a path git ignores, and a path matching any `--exclude` glob.

The git-ignored set comes from `git -C <target> ls-files -z --others --ignored --exclude-standard --directory`, run once per folder target. A listed folder covers every path under it. A non-zero exit, or no git on the machine, gives an empty set. That one rule covers a target outside any repository and a target that git itself ignores, so a named folder is always read. A file target never consults it, since it is read as named.

`--exclude <glob>` is repeatable, and `**/node_modules/**` is its value when none is given. A given `--exclude` replaces that default, as a default does. Each glob is matched with `path.matchesGlob` against the path relative to its folder target, both as written and with a trailing `/`, because `**/node_modules/**` does not match the bare folder name and pruning needs it to.

`--include <glob>` is repeatable and runs as a second walk of its own globs, with no exclusion, joined to the first. A file under a pruned folder cannot be reached from inside the exclusion test, so the second walk is what lets an include beat both git and `--exclude`. Either option with no value refuses the run, as `--skip` does.

A target's root becomes the nearest folder at or above it holding a skill file. Without one it stays as today: a folder is its own root and a file's root is the working directory. So `<skill-dir>/SKILL.md`, `<skill-dir>/README.md` and `<skill-dir>/references/` named as targets all resolve their pointers against their skill. No listed package sits under a skill file, so their runs are unchanged.

A folder target is refused only when the walk finds no file any reader takes, where today it needs markdown. An empty folder still refuses, and a `<skill-dir>/assets/` holding YAML is checked. One holding only images still refuses, since nothing would read it and its silence would look clean.

Two new options and a new default are new behaviour, and nothing breaks, because `--include` restores any path the default now skips. So the version moves a minor: `metadata.version` in `skills/agents-guru/SKILL.md` goes from 8.8.0 to 8.9.0.

## Steps

- ::S1:: Add tests to `skills/agents-guru/scripts/test/check.test.js` for each criterion: a git-ignored `vendor/bundle` adds no file and no issue, an unignored path is read under a skill, a plugin and a directory of skills, `--exclude` and its `node_modules` default outside a repository, `--include` beating both, in-skill path targets resolving against their skill, an assets folder of YAML checked, and an option with no value refused
- ::S2:: Parse `--exclude` and `--include` beside `--skip` in `skills/agents-guru/scripts/check.js`
- ::S3:: Build the git-ignored set per folder target and the exclusion test, and pass it to the file walk and the `.claude-plugin` search
- ::S4:: Add the include walk and join it to the file walk
- ::S5:: Resolve each target's root to its enclosing skill, and refuse a folder target only when the walk finds no file any reader takes
- ::S6:: Document `--exclude`, `--include`, the git-ignore default and path targets in *The check* in `skills/agents-guru/workflows/check.md`, with the limit that a walk crossing a symlink into another tree still uses the target's repository to decide what git ignores
- ::S7:: Name git as optional for the check in the compatibility line of `skills/agents-guru/SKILL.md`, and move its `metadata.version` to 8.9.0

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-08_GHI-442_respect-gitignore-in-the-check.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `npm --prefix skills/agents-guru test`, the S1 tests watched failing on the unchanged `skills/agents-guru/scripts/check.js`, and the `node_modules` test watched failing with the trailing-`/` match removed from the exclusion test
- ::V5:: `npm --prefix skills/agents-guru run lint`
- ::V6:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V7:: `node skills/agents-guru/scripts/check.js plugins/typescript-native-lsp`
- ::V8:: `node skills/agents-guru/scripts/check.js skills/review-text`
- ::V9:: `node skills/agents-guru/scripts/check.js skills/agents-guru`
- ::V10:: `node skills/agents-guru/scripts/check.js skills/socratic-tutor`
- ::V11:: `node skills/agents-guru/scripts/check.js skills/action-policy-guru`
- ::V12:: `node skills/agents-guru/scripts/check.js skills/glossary-guru`

V6 to V12 are the listed packages an edit under `skills/agents-guru/` owes, per `.agents/gh-solo.md`. The criteria gate is off here, since that file carries no `Test files:` line. No gate here runs the check on `skills/ruby-sensei`, which lives on another open branch, so the case that raised the issue is reproduced by the S1 fixture rather than by that skill. No gate can see whether the new paragraphs in `skills/agents-guru/workflows/check.md` read clearly.

## Open questions

None.

## Settled

None yet.
