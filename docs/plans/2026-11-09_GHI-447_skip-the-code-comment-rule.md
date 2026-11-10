> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Let a run skip the code-comment rule

Issue [#447](https://github.com/izkreny/agentifico/issues/447), a child of epic #444. It is blocked by #432, which is open. This is the stacked exception in *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`. The branch is cut from `feat/GHI-432_record-sweep-findings`, and that branch is the pull request's base. The block is serialisation on the shared `metadata.version` line, not a need for #432's work. The trunk sitting ahead of this branch is normal for a stack, so nothing fast-forwards.

## What changes

**`skills/agents-guru/assets/Agentifico/CommentSentences.yml` moves from `level: error` to `level: warning`.** Its header gains the reason: a language's own tooling can require a descriptive comment, so a skill may decline the rule. The `tests:` cases carry no severity, so they stay.

**The skip name is `Agentifico.CommentSentences`, the name Vale reports.** `skills/agents-guru/scripts/check.js` already withholds a Vale alert by its `Check` field, so this name needs no mapping code. It joins `skippableRuleNames` in `skills/agents-guru/scripts/lint-config.js` as a string, like `yaml-comment-wrap`, and the comment above it says why.

**The Stryker directive above that withhold in `skills/agents-guru/scripts/check.js` goes.** Its reason is that no skippable name holds a dot, which stops being true. The new skip test kills the mutants it hid.

**The prose follows the code.** *The check* in `skills/agents-guru/workflows/check.md` names every rule `--skip` takes. The rule's section in `skills/agents-guru/workflows/new.md` says a skill may decline it, as *No hard wrapping* does. The note in `skills/agents-guru/workflows/review.md` says a review of a run that skipped it raises no finding on it, per the issue's N2.

`skills/agents-guru/assets/Agentifico/CommentLength.yml` already warns and the issue names only `CommentSentences`, so it is left alone. **`metadata.version` in `skills/agents-guru/SKILL.md` moves from 9.2.0 to 9.3.0**, since a new `--skip` name is new behaviour and loosening a rule breaks no caller.

## Steps

- ::S1:: In `skills/agents-guru/scripts/test/check.test.js`, change the code-fixture test to expect exit 0 and `(warning)`, add a test that `--skip Agentifico.CommentSentences` withholds that finding, and add the name to the refusal message the bad-name test expects
- ::S2:: Move `skills/agents-guru/assets/Agentifico/CommentSentences.yml` to `level: warning` and give its header the reason
- ::S3:: Add `Agentifico.CommentSentences` to `skippableRuleNames` in `skills/agents-guru/scripts/lint-config.js`, with its comment, and drop the Stryker directive in `skills/agents-guru/scripts/check.js`
- ::S4:: Name the skippable rules in *The check* in `skills/agents-guru/workflows/check.md`, add the decline sentence to the rule's section in `skills/agents-guru/workflows/new.md`, and the skipped-run sentence to `skills/agents-guru/workflows/review.md`
- ::S5:: Move `metadata.version` in `skills/agents-guru/SKILL.md` to 9.3.0

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-09_GHI-447_skip-the-code-comment-rule.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `npm --prefix skills/agents-guru test`, with S1's tests watched failing first on the unchanged rule file and `skills/agents-guru/scripts/lint-config.js`
- ::V5:: `npm --prefix skills/agents-guru run lint`
- ::V6:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V7:: `node skills/agents-guru/scripts/check.js plugins/typescript-native-lsp`
- ::V8:: `node skills/agents-guru/scripts/check.js skills/review-text`
- ::V9:: `node skills/agents-guru/scripts/check.js skills/agents-guru`
- ::V10:: `node skills/agents-guru/scripts/check.js skills/socratic-tutor`
- ::V11:: `node skills/agents-guru/scripts/check.js skills/action-policy-guru`

V6 to V11 are the listed packages an edit under `skills/agents-guru/` owes, per `.agents/gh-solo.md`. No gate confirms that dropping the Stryker directive leaves no surviving mutant, since the mutation run belongs to the sweep, #445. Whether the new sentences read clearly to an agent is the review's to judge.

## Open questions

None.

## Settled

None yet.
