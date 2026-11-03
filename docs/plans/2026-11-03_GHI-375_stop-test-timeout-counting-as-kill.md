> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Stop a test timeout counting as a kill

Issue [#375](https://github.com/izkreny/agentifico/issues/375), a child of epic #329.

## Where this branch sits

**It is cut from the tip of `docs/GHI-372_move-readme-guidance-to-reference`, and its pull request targets that branch.** #375 is blocked by #372, and the relation is not cleared. This is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names. The trunk sitting ahead of the stack is normal and is not recovered here.

## The change

**Mutation runs read `skills/agents-guru/vitest.stryker.config.js`, and it gets `testTimeout: 0` and `hookTimeout: 0`.** Vitest 5.0.5 skips its timeout wrapper for a limit of zero or less, in `withTimeout` in `skills/agents-guru/node_modules/vitest/dist/chunks/run.BPv-BBRv.js`. The Stryker Vitest runner 10.1.1 sets neither option, so the config file is the only place they come from. `skills/agents-guru/scripts/test/check.test.js` uses hooks, so the hook limit goes too, or a slow hook would fail the same way.

**Stryker's own limit is what remains, and it already reports a runaway mutant as Timeout.** It scales with each mutant's measured test time, per `timeoutFactor` in `skills/agents-guru/stryker.config.mjs`. A comment beside the new options says why they are zero.

**`npm --prefix skills/agents-guru test` reads no config file**, so it keeps Vitest's default 5-second limit without any change.

## How it is shown

**Each limit is shown with a test that sleeps six seconds, written for the check and deleted after it.** Run alone under `skills/agents-guru/vitest.stryker.config.js`, it fails before the change and passes after. Run under the default config, it fails both times.

**A scoped mutation run shows the effect on mutants, before and after the change.** It mutates a probe module of two functions that return `true`, covered by two tests. Each test takes two seconds as written. Under its mutant, one sleeps six seconds and the other never finishes. Before the change both mutants are Killed with Vitest's timeout message. After it the first Survives and the second is a Timeout. The probe and its test are deleted after the run, and the mutation run is not a box, per *The agents-guru package's checks* in `.agents/gh-solo.md`.

## Steps

- Run the six-second test under both configs, and the scoped mutation run on the probe, before the change.
- Set `testTimeout: 0` and `hookTimeout: 0` in `skills/agents-guru/vitest.stryker.config.js`, with the reason beside them.
- Run the six-second test and the scoped mutation run again after the change, then delete the probe and the test.
- Move agents-guru's version a patch, to 8.6.1.

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

The six-second test and the scoped mutation run are evidence for the issue's criteria rather than boxes, and their results go on the pull request. No gate sees whether a full run under load is now free of timeout kills, since that needs a run the sweep makes.

## Open questions

None.
