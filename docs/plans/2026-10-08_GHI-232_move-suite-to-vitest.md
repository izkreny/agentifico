> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Move the skills-guru suite to Vitest

Issue [#232](https://github.com/izkreny/agentifico/issues/232), a child of epic #226.

## Where this branch sits

**It is cut from the tip of `docs/GHI-223_agnix-rules-for-the-check`, and its pull request targets that branch.** #232 is blocked by #223, and the issue's own `## Dependencies` says that records the stack's order rather than a need for #223's work. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names, so the blocker does not stop the branch. For the same reason the trunk sitting ahead of this branch is normal for a stack and is not recovered here.

## The move

**Only `vitest` is declared, pinned exact with `npm install --save-dev --save-exact` in the package.** Vite is a required peer of Vitest, and npm resolves it on that install; `skills/skills-guru/package-lock.json` then pins it exactly, which is the known size the issue asks for. The package's `engines` stays at `>=22`: Vitest asks for 22.12 or later, but it is a devDependency of the suite, and the check itself does not load it.

**The `test` script becomes `vitest run scripts/test/`.** The `run` is not optional: bare `vitest` enters watch mode in a terminal and never exits. No config file is added. Vitest's per-test and per-hook timeouts are its one default that could turn a green case red, and the slowest single case in the baseline takes about 1.4 seconds, well inside them. A timeout that fires anyway is fixed with a CLI flag in the script, carrying the measured number.

**The edit to each test file is its import line and its hook names.** `skills/skills-guru/scripts/test/check.test.js` and `skills/skills-guru/scripts/test/vale.test.js` take `beforeAll` and `afterAll` in place of `before` and `after`, and `skills/skills-guru/scripts/test/rules.test.js` only swaps its import. Every assertion stays on `node:assert/strict`. `skills/skills-guru/scripts/test/vale.test.yml` is a fixture rather than a test file, so it takes no edit.

**The baseline is `tests 290`, all passing, under `node --test`.** Vitest reports tests and test files rather than suites, so the test count is the number compared.

**The workers are proved by watching a spawn case fail under them.** With Vale hidden from `PATH`, the cases that spawn Vale, and the `skills/skills-guru/scripts/check.js` cases that reach it, must fail under Vitest, then pass again once it is back. A suite that stayed green with Vale gone would show those cases never ran.

## Steps

- Install `vitest` as a pinned devDependency in `skills/skills-guru/` and point the `test` script at `vitest run scripts/test/`.
- Swap each test file's runner import to `vitest`, with `before` and `after` becoming `beforeAll` and `afterAll`.
- Run the suite and compare its test count with the baseline of 290.
- Run the suite once with Vale hidden from `PATH`, record which cases failed, and restore it.
- Move skills-guru's version a patch, to 5.7.1.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `npm --prefix skills/skills-guru ci`
- `npm --prefix skills/skills-guru test`
- `npm --prefix skills/skills-guru run lint`
- `node skills/skills-guru/scripts/check.js skills/skills-guru`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `node skills/skills-guru/scripts/check.js skills/review-text`
- `node skills/skills-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

The version check reads the whole stack's range, so a lower branch's bump already satisfies it, and this branch's own patch bump is held by its step rather than by the gate. The `npm ci` run fails on a lockfile out of step with the manifest, but it cannot tell whether the Vite version npm resolved is one the owner would have chosen.

## Open questions

None.
