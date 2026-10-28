> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Let the check skip a convention rule

Issue [#360](https://github.com/izkreny/agentifico/issues/360), a child of epic #329.

## Where this branch sits

**It is cut from the tip of `chore/GHI-355_update-outdated-dependencies`, and it sits on stack #359 above that branch.** #360 is blocked by #355, and the issue's own `## Dependencies` says that is serialisation on `skills/agents-guru/scripts/check.js`. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names, so the blocker does not stop the branch.

## The flag

`--skip <rule>` is parsed out of the arguments before any of them is resolved as a path. Whatever is left is the target list, so `--skip` with no path still checks the current directory. The flag may repeat, and a rule named twice is skipped once.

**The skippable set is `skill-hard-wrap` and `yaml-comment-wrap`.** `skills/agents-guru/scripts/lint-config.js` exports it as `skippableRuleNames`, drawn from the prose-shape warning group plus the YAML comment rule's name. Every other rule is a contract rule or a convention this package does not let a caller decline.

**A bad `--skip` refuses the run before anything is read.** That covers a name outside the set, a name no rule has, and a `--skip` with no name after it. The refusal names the skippable rules and exits 1 through the existing `nothing was checked` path.

**One filter decides every stream.** A markdownlint finding is withheld when any of its `ruleNames` is skipped, a YAML finding by its rule name, and a Vale alert by its `Check`. A withheld finding counts toward no issue or warning total. No Vale rule is in the set yet, so its branch of the filter has no test until one is.

## The output

A run that skipped anything prints one more group just before its last line, in the form the other groups use:

```text
skipped rules: 1
  skill-hard-wrap: 3 findings withheld
```

The last line gains `, 1 rule(s) skipped`, matching the `skill(s) found` form the check already prints. That holds on the `prose rules not run` line too, since every skippable finding is known before Vale starts. A run without `--skip` prints neither, so its output is unchanged.

## Steps

- Write the failing tests in `skills/agents-guru/scripts/test/check.test.js`, and watch each fail on the current `skills/agents-guru/scripts/check.js`: a skipped hard wrap, a skipped YAML comment wrap, both at once, a contract issue that still fails a run skipping a convention rule, `--skip` with no path, the skipped count on the `prose rules not run` line, and refusals for a contract rule, an unknown name and a missing name.
- Export `skippableRuleNames` from `skills/agents-guru/scripts/lint-config.js`, and update the comment on the warning groups.
- Parse `--skip` in that script, filter the three streams, and print the skipped group and the count, until the new tests pass and the old ones still do.
- Add the flag to *The check* in `skills/agents-guru/workflows/check.md`, and reword the sentence saying a tree cannot switch off the rules that judge it, so the caller's switch and the target's are told apart.
- Pass `--skip` through the `check` route in `skills/agents-guru/SKILL.md`, and name it in the `argument-hint`.
- Move agents-guru's `metadata.version` from 8.0.0 to 8.1.0, since the flag is new behaviour that changes no existing run.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `npm --prefix skills/agents-guru test`
- `npm --prefix skills/agents-guru run lint`
- `node skills/agents-guru/scripts/check.js <package-dir>` exits zero on each of `plugins/gh-solo`, `skills/review-text`, `skills/agents-guru` and `skills/socratic-tutor`

The suite cannot show that an unchanged run prints exactly what it printed before. That rests on no existing assertion changing, which the diff of the test file shows. The Vale branch of the filter is reached by no test until a Vale rule joins the set.

## Open questions

**Should `skill-hard-wrap` and `yaml-comment-wrap` go back to errors now that `--skip` exists?** Recommendation: not on this branch. The issue's criterion that a run without `--skip` prints exactly what it prints today rules it out here. As errors they would fail every caller who has not passed `--skip`, which is a breaking change with a major bump of its own, so it belongs in a follow-up issue if the owner wants it.

## Settled

None yet.
