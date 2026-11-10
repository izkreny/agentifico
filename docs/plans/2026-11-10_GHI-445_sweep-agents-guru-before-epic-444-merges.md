> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Sweep agents-guru before epic #444 merges

Issue [#445](https://github.com/izkreny/agentifico/issues/445), the last child of epic #444. It is blocked by #447, which is open. This is the stacked exception in *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`. The branch is cut from `feat/GHI-447_skip-the-code-comment-rule` at `13b7946`, and that branch is the pull request's base. The branches of #442, #436, #433 and #432 sit in its ancestry, so every other child of #444 is in this branch's history. The trunk sitting ahead of this branch is normal for a stack, so nothing fast-forwards.

## The sweep

One reviewer subagent reads the whole of `skills/agents-guru`, following `skills/agents-guru/workflows/review.md` from this tree by path, with the invocation under *The sweep's invocation, with the context a run needs* in `.agents/gh-solo.md`. It reports only and edits nothing. Its id is kept, so its Step 5 can judge the fixes.

The record goes on #445 in two comments, per *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md`: the findings comment, one row per `AGF{n}`, then the verdicts comment once Step 5 has run. Each fix commit cites its id.

The mutation run goes beside the read, in the background. Before triaging survivors, read what earlier sweeps already recorded as equivalent, so a known mutant is cited rather than judged again.

`metadata.version` in `skills/agents-guru/SKILL.md` moves from 9.3.0 by the part the fixes earn, per *Each plugin, and each skill under `skills/`, is a package* in `AGENTS.md`.

## Steps

- ::S1:: Run the reviewer over `skills/agents-guru`, and keep its id.
- ::S2:: Run `npm --prefix skills/agents-guru run mutate` in the background.
- ::S3:: Post the findings comment on #445.
- ::S4:: Fix each finding, citing its id in the commit, or have the resumed reviewer refute it per Step 5.
- ::S5:: Watch each new test fail before trusting it.
- ::S6:: Kill each survived mutant with a test, or record it on #445 as equivalent with the reason.
- ::S7:: Move `metadata.version`.
- ::S8:: Resume the reviewer on the fix commits for a verdict per id, and post the verdicts comment on #445.

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-10_GHI-445_sweep-agents-guru-before-epic-444-merges.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `npm --prefix skills/agents-guru test`
- ::V5:: `npm --prefix skills/agents-guru run lint`
- ::V6:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V7:: `node skills/agents-guru/scripts/check.js plugins/typescript-native-lsp`
- ::V8:: `node skills/agents-guru/scripts/check.js skills/review-text`
- ::V9:: `node skills/agents-guru/scripts/check.js skills/agents-guru`
- ::V10:: `node skills/agents-guru/scripts/check.js skills/socratic-tutor`
- ::V11:: `node skills/agents-guru/scripts/check.js skills/action-policy-guru`

V6 to V11 are the listed packages an edit under `skills/agents-guru/` owes, per `.agents/gh-solo.md`. Most fixes are prose, which no gate reads for meaning; the resumed reviewer's verdicts judge those. The mutation run is a step rather than a gate, since no score fails it.

## After the review round

The Vale re-mine is the last task, run after the round's fixes are pushed and before the merge, per *How a phrase list grows* in `skills/agents-guru/references/maintaining.md`. It reads everything merged since `agents-guru_8.8.0`, every other pull request in stack #456, this issue's findings, this pull request's threads and this branch's commits. New tokens land on this branch, and #445 records what was read.

## Open questions

None.

## Settled

None yet.
