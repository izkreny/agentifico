> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Teach skills-guru `context: fork`

Issue [#280](https://github.com/izkreny/agentifico/issues/280), a child of epic #226. It ports the agnix rules #223 assigned to it: CC-SK-013 as prose and CC-SK-004 as a check rule.

## Where this branch sits

**It is cut from the tip of `feat/GHI-279_check-hooks-and-manifest`, and its pull request targets that branch.** #280 is blocked by #279, and the issue's own `## Dependencies` says that is stack order rather than a need. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names. The trunk sitting ahead of this branch is normal for a stack and is not recovered here.

## What the page says

The [skills](https://code.claude.com/docs/en/skills) page was re-read in raw text for this plan.

- Its field table: `context` is "Set to `fork` to run in a forked subagent context", and `agent` is "Which subagent type to use when `context: fork` is set".
- *Run skills in a subagent*: Claude Code starts a new subagent of the `agent` type and gives it the skill content as its prompt. The subagent does not see the conversation, so the instructions have to stand on their own. With no `agent`, the type is `general-purpose`.
- The same section: "`context: fork` only makes sense for skills with explicit instructions." A skill holding only guidelines gives the subagent no task, and it returns nothing useful.
- The same section: despite the name, `context: fork` is not a fork of the current conversation.
- *Using skill frontmatter outside Claude Code*: both fields are Claude Code extensions, outside the spec's six.

## The prose

**`skills/skills-guru/workflows/new.md` gains a row for each field in its frontmatter table.** The `context` row says the body becomes a fresh subagent's whole prompt, so it must carry a task with explicit steps. The `agent` row says which subagent type runs it, that `general-purpose` is the default, and that it does nothing without `context: fork`.

**The paragraph beneath the table that names the Claude Code extensions names these two as well.** It would otherwise list fewer extensions than the table holds.

## The rule

**One new contract rule, `skill-fork`, in `skills/skills-guru/scripts/rules/skill-fork.js` (new).** It is a contract rule because the defect is silent: Claude Code runs the skill inline and never says the field was ignored. It reads a skill file only and reports on the frontmatter line, as the other skill rules do.

**It reports `agent` set while `context` is not `fork`.** It reads both keys with the `keyLines` and `scalar` helpers `skills/skills-guru/scripts/rules/skill-invocation.js` uses, so a trailing comment, a quoted value and a duplicate key are read the same way in both rules.

**What stays out.** A `context` value other than `fork` on its own, because #223 skipped CC-SK-002: the page names `fork` and says nothing about any other value. The `background` field, which the issue does not name. Whether the body holds a task, which is the prose's job, since it is a judgement and not a pattern.

**The reading is a pure `defects(fm)` over the frontmatter lines**, so `skills/skills-guru/scripts/test/rules.test.js` tests it on strings, as it tests `skill-invocation`.

## Steps

- Add `skill-fork` cases to `skills/skills-guru/scripts/test/rules.test.js`: a trip case with `agent` and no `context`, a trip case with `agent` and another `context` value, and clean cases for `agent` with `context: fork`, `context: fork` alone, neither field, and `context: fork` with a trailing comment.
- Run the suite before the rule exists and record which new cases fail.
- Write `skills/skills-guru/scripts/rules/skill-fork.js` (new), register it among the contract rules in `skills/skills-guru/scripts/lint-config.js`, and add it to the suite's rule list.
- Run the suite until it is green, then remove the rule's check and record the case that fails.
- Add the `context` and `agent` rows to the frontmatter table in `skills/skills-guru/workflows/new.md`, and name both in the paragraph that lists the Claude Code extensions.
- Give the rule its section in `skills/skills-guru/workflows/check.md`, beside the invocation rule, pointing at `skills/skills-guru/workflows/new.md` for what the fields do.
- Move skills-guru's version a minor, to 6.5.0.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `npm --prefix skills/skills-guru test`
- `npm --prefix skills/skills-guru run lint`
- `node skills/skills-guru/scripts/check.js skills/skills-guru`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `node skills/skills-guru/scripts/check.js skills/review-text`
- `node skills/skills-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

The suite cannot see whether Claude Code still ignores `agent` without `context: fork`. The rule copies the page on the day it is written, and a page that changes later makes it wrong without failing anything. No listed package sets either field, so the runs over the packages prove only that the rule flags nothing correct.

## Open questions

None.
