> 🤖 Written by AI --- read/modified by izkreny! 🤓

# State watched-failing as a rule

Issue [#148](https://github.com/izkreny/agentifico/issues/148), the bottom child of epic [#157](https://github.com/izkreny/agentifico/issues/157).

## What is missing

The package requires no check to be watched failing before its pass is trusted. The practice is real: every fixture added since `skills/skills-maker/scripts/test/rules.test.js` was written records it in its own header. But `skills/skills-maker/workflows/new.md` is where an authoring rule lives, and it says nothing about this. So the next check added is bound by nothing.

`skills/skills-maker/workflows/check.md` states the practice twice, both times in the past tense. Line 39 says the description rules' traps "was watched failing in a real YAML parser before it earned its place". Line 98 says "Every assertion in it was watched failing against the behaviour it exists to catch before it was trusted", then states the rule proper: "A check that has never been seen to fail is not evidence." A claim about work already done is history, which *Never write the file's own history* in `skills/skills-maker/workflows/new.md` forbids, and the rule sentence riding along with it makes `workflows/check.md` a home for a rule `workflows/new.md` should own.

## Where the rule goes

Under `## Step 4 - Write the body` in `skills/skills-maker/workflows/new.md`, as a `###` heading beside the other authoring rules. That is the section `skills/skills-maker/workflows/review.md` Step 3 reaches: it holds a skill against every rule in that file, and says a rule added there is picked up without `workflows/review.md` changing. So the third acceptance criterion is met by putting the rule in the right file and `workflows/review.md` is not edited.

The rule's reason is the one worth stating. A check that passes on everything and a check that passes on nothing look identical from the outside. Only a watched failure separates them.

## The mechanical half, and the half that is a judgement

`describe("coverage")` in `skills/skills-maker/scripts/test/vale.test.js` fails the suite when a Vale rule or token no fixture reaches is added. That is mechanical, and it is the closest thing the package has to enforcement. What it proves is that a fixture exists. It never proves the fixture was ever red, and no exit code can, because a test that was watched failing and one that was written green are the same file afterwards. The rule says both halves plainly, so a reader is not left thinking the suite covers it.

## What is read and left alone

The headers of `skills/skills-maker/scripts/test/vale.test.js` and `skills/skills-maker/scripts/test/check.test.js` record what was done to their own fixtures. That is evidence, not a rule, and it stays. The last sentence of the header of `skills/skills-maker/scripts/test/rules.test.js` is different: it states the rule itself, word for word as `workflows/check.md` line 98 does, so it is a third home and it goes with the second. This is wider than the issue's second criterion, which names `workflows/check.md` only, and it serves that criterion's goal of one home rather than three.

## Steps

- Add the rule to `skills/skills-maker/workflows/new.md` under `## Step 4 - Write the body`, as a `###` heading with its reason in a sentence, naming the coverage test in `skills/skills-maker/scripts/test/vale.test.js` as the mechanical half and saying which half no exit code supplies.
- Cut the past-tense clause from line 39 of `skills/skills-maker/workflows/check.md`, keeping the present-tense tail that says the suite re-runs the evidence on demand.
- Replace the paragraph at line 98 of `skills/skills-maker/workflows/check.md` with a pointer at the rule's new heading in `skills/skills-maker/workflows/new.md`.
- Drop the rule sentence from the header comment of `skills/skills-maker/scripts/test/rules.test.js`, leaving its record of what was done to its own fixtures.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.3.0` to `3.4.0`. A minor: an author following this skill now owes something they did not owe before, and nothing that worked stops working.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

Vale 3.20.0 is on PATH and `skills/skills-maker/node_modules` is installed, so the suite and the check have what they need. The check run over the package is what holds this branch's own new prose to the package's rules, which is the one place a prose change gets a gate at all. What no gate here can see is whether the rule as written actually binds the next author: that is a reading, and the epic's later children are where it gets exercised, since each adds a check the rule now governs.

## Open questions

None.
