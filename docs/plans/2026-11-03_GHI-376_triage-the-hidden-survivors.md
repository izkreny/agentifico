> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Triage the survivors the timeouts hid

Issue [#376](https://github.com/izkreny/agentifico/issues/376), a child of epic #329.

## Where this branch sits

**It is cut from the tip of `fix/GHI-375_stop-test-timeout-counting-as-kill`, and its pull request targets that branch.** #376 is blocked by #375, and the relation is not cleared. This is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names. The trunk sitting ahead of the stack is normal and is not recovered here.

## The runs

**The survivor list comes from a forced full run on this branch, before any triage.** #375 made a test timeout stop counting as a kill, so a run made before it reports mutants as Killed that now survive. The run that ended on #375's branch carried such kills over in its incremental file, so it cannot stand in. The run mutates only `skills/agents-guru/scripts/`, and this branch has changed nothing there when it starts.

**Each run goes through `capped` with nine runners and writes its own incremental file under `skills/agents-guru/reports/`**, which `skills/agents-guru/.gitignore` already ignores. A run's figures go on the pull request: score, mutant count, timeouts, survivors and wall time.

## The triage

**Every survivor gets one of the issue's three outcomes**, as #231 did. A test that tells the mutant apart from the shipped code kills it. A mutant no input can tell apart is equivalent, and gets a `Stryker disable next-line <mutator>` comment that states, in the present tense, why no input can. A survivor that needs more than a test, such as a change to the rule itself, is named for a follow-up issue.

**Opening a follow-up issue is the owner's call.** The handoff names each such mutant with its file, line and mutator, and the owner opens the issue. The triage aims to leave none.

**The work is grouped by file and by class of survivor, with one commit per class**, as #231 did. A class is a set of mutants one kind of test answers, such as the literals a finding prints or a branch no case reaches.

**A test is seen to fail on its mutant by a scoped mutation run.** After a class's tests land, a run scoped to that class's lines reruns its mutants. A mutant that moves from Survived to Killed is the new test failing on the mutated code. A mutant still alive gets another look.

**A final forced full run measures the result.** A survivor that run shows and the first did not is triaged too, and the run is made again. Its figures go on the pull request beside #362's recorded run.

## Steps

- Make a forced full mutation run on this branch and list its survivors.
- Triage each class of survivor with a test or a disable comment, and confirm the kills with a scoped run.
- Make a final forced full run, and triage anything it shows that the first run did not.
- Record both runs' figures on the pull request beside #362's.
- Move agents-guru's version a patch, to 8.6.2.

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

The mutation runs are evidence for the issue's criteria rather than boxes, per *The agents-guru package's checks* in `.agents/gh-solo.md`, and their figures go on the pull request. No gate decides whether a disable comment's reason is true; that is the review round's to judge.

## Open questions

None.
