> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Sweep agents-guru before the tag after the rename

Issue [#330](https://github.com/izkreny/agentifico/issues/330), the last child of epic #329. Its `blockedBy` names #395, #383, #381 and #367, all open. This is the stacked exception in *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`. The branch is cut from `chore/GHI-395_tune-biome-rules` at `e2a896c`, and that branch is the pull request's base. #383, #381 and #367 sit in its ancestry. The issue's `## Dependencies` names #383 as the child below, while the stack puts #395 there; the relation is what holds.

## The sweep

One reviewer subagent reads the whole of `skills/agents-guru` inline, following `skills/agents-guru/workflows/review.md` from the tree by path, since the installed copy lags it. Its id is kept, so its Step 5 can judge the fixes. Its findings go on the issue as SW1, SW2 and on, and each fix commit cites its id.

The mutation run goes beside the read, in the background. It is the long step, and the read needs no CPU. Before triaging survivors, read what #376 and #383 already judged equivalent, so a known mutant is cited rather than judged again.

`metadata.version` in `skills/agents-guru/SKILL.md` moves from 8.7.3 by the part the fixes earn, per *Each plugin, and each skill under `skills/`, is a package* in `AGENTS.md`.

## Steps

- Run the reviewer over `skills/agents-guru`, and keep its id.
- Run `npm --prefix skills/agents-guru run mutate` in the background.
- Record the findings on the issue with short ids.
- Fix each finding, citing its id in the commit, or have the resumed reviewer refute it per Step 5.
- Watch each new test fail before trusting it.
- Kill each survived mutant with a test, or record it on the issue as equivalent with the reason.
- Move `metadata.version`.
- Resume the reviewer on the fix commits for a verdict per finding, and record the verdicts on the issue.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `npm --prefix skills/agents-guru test`
- `npm --prefix skills/agents-guru run lint`
- `node skills/agents-guru/scripts/check.js skills/agents-guru`
- `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- `node skills/agents-guru/scripts/check.js skills/review-text`
- `node skills/agents-guru/scripts/check.js skills/socratic-tutor`

Most fixes are prose, which no gate reads for meaning. The resumed reviewer's verdicts judge those. The mutation run is a step rather than a gate, since no score fails it.

## After the review round

The Vale re-mine is the last task, run after the round's fixes are pushed and before the merge, per *How a phrase list grows* in `skills/agents-guru/references/maintaining.md`. It reads everything merged since `agents-guru_7.2.0` at `bd9eac5`, every other pull request in stack #359, this issue's findings, this pull request's threads and this branch's commits. New tokens land on this branch, and the issue records what was read.

## Open questions

None.

## Settled

None yet.
