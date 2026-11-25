> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Name the rule bench in glossary-guru

Issue #448 holds the acceptance criteria. This plan says how.

## Approach

On `main` at `739111f`, `node skills/agents-guru/scripts/check.js skills/glossary-guru` exits 1 on one `skill-bundled-files` issue: no file of the skill names `skills/glossary-guru/scripts/test-glossary-rule.sh`.

The bench is named in `skills/glossary-guru/README.md`, in a section for whoever edits the script. An agent using the skill in a project never runs the bench, so `skills/glossary-guru/SKILL.md` stays as it is. `skills/action-policy-guru/README.md` names its own bench the same way. If the rule does not count a README mention, the line moves to `skills/glossary-guru/SKILL.md` instead.

The check's `--skip` and `--exclude` options do not help here. `--skip skill-bundled-files` is refused, since that rule is not one a skill may decline. `--exclude scripts/test-glossary-rule.sh` still exits 1 on the same issue. Neither would meet AC1, which wants a file to name the bench, and the gate command in `.agents/gh-solo.md` takes no flag.

The package goes back on the agents-guru check's list in `.agents/gh-solo.md`, per AC3 and N3. Its bullet under *Packages off the list* goes. That section keeps its heading and paragraph, which state the rule for the next package that comes off.

The four comment warnings on `skills/glossary-guru/scripts/glossary-rule.py` stay, since none fails the run and none is a criterion.

## Steps

- ::S1:: Name `skills/glossary-guru/scripts/test-glossary-rule.sh` in `skills/glossary-guru/README.md`, saying what it checks and when to run it
- ::S2:: Move `metadata.version` in `skills/glossary-guru/SKILL.md` from `2.1.0` to `2.1.1`
- ::S3:: Add `skills/glossary-guru` to the agents-guru check's list in `.agents/gh-solo.md`, and drop its bullet under *Packages off the list*

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-25_GHI-448_name-the-rule-bench.md`
- ::V2:: `node skills/agents-guru/scripts/check.js skills/glossary-guru` exits 0, after it was seen exiting 1 on the branch's base `739111f`
- ::V3:: `node skills/agents-guru/scripts/check.js AGENTS.md .agents/gh-solo.md .agents/dependencies.md`
- ::V4:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V5:: `python3 scripts/version-check.py`

No gate can see whether the README's sentence says truly what the bench is for.

## Open questions

None.

## Settled

None yet.
