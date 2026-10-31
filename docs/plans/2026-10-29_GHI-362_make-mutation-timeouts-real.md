> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Make the mutation run's timeouts real

Issue [#362](https://github.com/izkreny/agentifico/issues/362), a child of epic #329.

## Where this branch sits

**It is cut from the tip of `fix/GHI-361_check-crash-on-unreadable-md`, and its pull request targets that branch.** #362 is blocked by #361, and the relation is not cleared. This is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names: #361's branch exists, this branch is cut from it, and its pull request is the base. The block is serialisation only, per the issue's own `## Dependencies`. The trunk sitting ahead of this branch is normal for a stack and is not recovered here.

## What sets a mutant's limit

**Stryker gives each mutant `timeoutFactor × netTime + timeoutMS + overhead`.** That is the formula in the installed 10.1.1, in `skills/agents-guru/node_modules/@stryker-mutator/core/dist/src/mutants/mutant-test-planner.js`. `netTime` is the sum of the covering tests' times in the dry run. The dry run uses one runner on an idle machine. The mutant runs use nine runners at once, and every `skills/agents-guru/scripts/test/check.test.js` case spawns `skills/agents-guru/scripts/check.js` and Vale. So a mutant's tests run slower than the dry run measured them.

**That slowdown scales with the tests' own length, so it is a factor problem first.** `timeoutMS` adds the same seconds to every mutant. `timeoutFactor` multiplies the measured time, which is what load does. Stryker's own option text points at `timeoutMS` for a busy machine, so the measurement decides which of the two, or both, the setting moves.

**#231's final run already hints at the answer.** Its incremental file records how long each mutant ran. Among the mutants covered by 81 tests, kills reach 22.6 seconds and timeouts start at 21.0 seconds. Honest kills piling up just under the limit means the limit cuts some of them off.

## How the setting is chosen

**A measurement run comes first.** It is a full forced run with `--timeoutMS 60000`, so nearly every mutant has time to finish. Each mutant's recorded duration is then how long it really needs under nine runners. A mutant still timed out at 60 seconds is a hang candidate.

**The setting must give every finished mutant its measured duration, with a margin.** Each mutant's `netTime` comes from the dry-run test times, summed over the tests that cover it. With that, each candidate setting gives every mutant a computed limit. The chosen one is the smallest that clears every measured duration by the margin. The comment beside it in `skills/agents-guru/stryker.config.mjs` names the measurement.

**A recorded run follows under that setting.** It is forced too, so no status comes from an older run. Its score, mutant count, timeout count and wall time go on the pull request beside #231's numbers.

## Re-running a sample

**At least 30 of the recorded run's timeouts are picked at random and run again with `--timeoutMS 60000`.** Stryker's `mutate` option takes a line range after a file name, per its schema, so the rerun names each sampled mutant's lines. Results are matched back by file, location, mutator and replacement, because mutant ids change between runs. If the recorded run leaves fewer than 30 timeouts, every one of them is rerun, and the pull request says so.

**Every mutant the sample shows surviving is triaged on the pull request.** It is killed by a test, marked equivalent with a `Stryker disable` comment naming why, or named in a follow-up issue.

## A kill can be a timeout too

**Vitest fails any test that runs longer than five seconds, and Stryker reads that failure as a kill.** Neither `skills/agents-guru/vitest.stryker.config.js` nor the Stryker runner sets `testTimeout`. A slow honest test under load then counts as a killed mutant, which inflates the score the same way a false timeout does. Each run's kill reasons are read for Vitest's timeout message. Any found are recorded on the pull request and named in a follow-up issue, since fixing them is a different change from this one.

## Steps

- Move #231's incremental file aside, so every run here starts from nothing.
- Run the measurement: a full forced mutation run with `--timeoutMS 60000`, and Vitest's dry-run test times for the same suite.
- Compute each mutant's limit under candidate settings, and pick the smallest that clears every measured duration by the margin.
- Set that timeout in `skills/agents-guru/stryker.config.mjs`, with the reason beside it.
- Run the recorded full forced mutation run under that setting, and record its score, mutant count, timeout count and wall time on the pull request beside #231's.
- Rerun at least 30 of its timeouts, picked at random, with `--timeoutMS 60000`, and record the result on the pull request.
- Triage every survivor the sample shows, on the pull request.
- Read every run's kill reasons for Vitest's own test timeout, and record what that finds.
- Move agents-guru's version a patch, to 8.1.2.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `npm --prefix skills/agents-guru test`
- `npm --prefix skills/agents-guru run lint`
- `node skills/agents-guru/scripts/check.js skills/agents-guru`
- `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- `node skills/agents-guru/scripts/check.js skills/review-text`
- `node skills/agents-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

The mutation runs and the sample are not boxes. Per *The agents-guru package's checks* in `.agents/gh-solo.md`, a mutation run is never a branch's gate, so their numbers go on the pull request instead. No gate sees whether the margin is wide enough on another machine.

## Open questions

None.
