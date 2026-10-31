> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Add Stryker to the agents-guru bench

Issue [#231](https://github.com/izkreny/agentifico/issues/231), a child of epic #226.

## Where this branch sits

**It is cut from the tip of `feat/GHI-255_check-named-paths`, and its pull request targets that branch.** #231 is blocked by #255 and by #232, and neither relation is cleared.

#255 is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names: this branch is cut from its tip, and its pull request is the base. #232 is a real need, since Stryker's runner needs the Vitest suite #232 brings. Its branch, `chore/GHI-232_move-suite-to-vitest`, sits two below this one in stack #265, so the tree this plan is written against already has the suite on Vitest. The trunk sitting ahead of this branch is normal for a stack and is not recovered here.

## The spawned check never sees a mutant

**`skills/agents-guru/scripts/test/check.test.js` runs `skills/agents-guru/scripts/check.js` as a child `node` process, and Stryker's Vitest runner activates a mutant only inside the test process.** Read in the installed 10.0.0 source: the runner sets `__stryker__.activeMutant` through Vitest's `inject`, and only the command runner sets the `__STRYKER_ACTIVE_MUTANT__` environment variable that instrumented code also reads. A spawned check therefore runs unmutated, and every mutant only the spawn reaches would survive.

**The suite's spawn helper forwards the active mutant into the child's environment.** The two direct `spawnSync` calls in `skills/agents-guru/scripts/test/check.test.js` go through the `run` helper, so the forwarding sits in one place.

**Coverage analysis is `off`, and Vitest's related mode is disabled.** A child process reports no coverage back, and the suite imports nothing from the check. Under the default `perTest`, or with `related` on, every mutant in the check would be marked uncovered and never run. The cost is the whole suite per mutant rather than the covering tests the issue's technical notes expect. The dry run measured 284 tests in 11 seconds and 1316 mutants.

## Leaving out the Vale tests

**`skills/agents-guru/vitest.stryker.config.js` (new) is a Vitest config only Stryker reads.** The package has no Vitest config, and the runner's `vitest.configFile` option is its only way to narrow the suite. It excludes `skills/agents-guru/scripts/test/vale.test.js` and leaves `npm test` unchanged.

**The config is named `stryker.config.mjs` (new), as the issue's criterion states.** Under `"type": "module"` a plain .js name works too, and the owner has preferred that elsewhere; a rename is a one-line review finding.

## Steps

- Declare `@stryker-mutator/core` and `@stryker-mutator/vitest-runner` at 10.0.0 as devDependencies in `skills/agents-guru/package.json`, with a `mutate` script running `stryker run --incremental`, and install them into the package.
- Ignore Stryker's sandbox folder and its reports folder, the incremental file included, in `skills/agents-guru/.gitignore`.
- Write `skills/agents-guru/stryker.config.mjs` (new) and `skills/agents-guru/vitest.stryker.config.js` (new) as above.
- Forward the active mutant from the spawn helper in `skills/agents-guru/scripts/test/check.test.js`, and route its two direct `spawnSync` calls through that helper.
- Run `npm --prefix skills/agents-guru run mutate` and record the mutation score, the mutant count and the wall-clock time on the pull request.
- Triage every survived mutant on the pull request: kill it with a test, mark it equivalent with a `Stryker disable` comment naming why, or name the class of gap for a follow-up issue.
- Record the command under *The agents-guru package's checks* in `.agents/gh-solo.md` as a step of that package's sweep. The issue's technical notes record the owner's grant for this repository-level edit.
- Move agents-guru's version a patch, to 7.2.1.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `npm --prefix skills/agents-guru test`
- `npm --prefix skills/agents-guru run lint`
- `node skills/agents-guru/scripts/check.js skills/agents-guru`
- `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- `node skills/agents-guru/scripts/check.js skills/review-text`
- `node skills/agents-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

The mutation run is not a box: per criterion 5 it is a sweep step, never a branch's gate. Its completion and its numbers are recorded on the pull request instead. No break threshold is set, so no score fails it.

## Open questions

None.
