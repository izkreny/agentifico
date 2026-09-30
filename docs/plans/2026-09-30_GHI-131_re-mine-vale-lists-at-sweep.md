> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Re-mine the Vale lists at the sweep

Issue [#131](https://github.com/izkreny/agentifico/issues/131). It is not part of an epic, so the branch is cut from `main` and not stacked. Its blockers, #129 and #130, are closed.

## What changes

**The sweep section gains the step.** *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md` says that before a sweep issue closes, the phrase lists are re-mined over everything merged since that package's last tag. It points at *How a phrase list grows* in `skills/skills-guru/references/maintaining.md` for the procedure and does not copy it.

**The same section says where the output lands, and how the sweep issue carries the step.** The sweep issue has an acceptance criterion for the step, and records which findings and commits were read. A criterion is what `merge` audits, so the step cannot be skipped without it showing.

**It sits beside the invocation block, not inside it.** The re-mine is its own procedure, not context for `/skills-guru review`.

**Nothing else moves.** `AGENTS.md` is unchanged, and no package's version moves, since `.agents/gh-solo.md` is repository-level.

## Decisions

**The issue says `skills-maker` throughout. The package is `skills-guru` now, and this plan reads it as that.** #130's procedure lives in `skills/skills-guru/references/maintaining.md`.

**New tokens land on the sweep's own branch only when the sweep is skills-guru's.** Tokens live under `skills/skills-guru/assets/`, so any other package's sweep branch landing them would change two packages at once. `AGENTS.md` forbids that, and `scripts/version-check.py` would ask for a second bump. Every other sweep opens a `skills-guru` issue for its tokens instead.

**A package with no tag yet reads the whole trunk history.** "Since the last tag" has no start otherwise, and `skills-guru`, sweeping in #213, has never been tagged. The procedure already accepts an open range.

**Criterion 3 owes no edit.** `.agents/gh-solo.md` no longer names a Vale version: *The skills-guru package's checks* defers to whatever `skills/skills-guru/scripts/check.js` requires, which is 3.23. That is above the 3.21 floor the criterion asks for, and naming a number here would be a copy that drifts.

**#213 is not edited here.** Once this lands, that sweep issue owes the new criterion. That is its own edit, named in the handoff.

## Steps

- Add the step to *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md`: when it runs, over what range, where tokens land, and the sweep issue's criterion and record.
- Tick criterion 3 on #131 with a comment saying why no edit was owed.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `git diff --quiet origin/main -- AGENTS.md` exits zero.

`scripts/version-check.py` passes without exercising anything, which is the right answer for a branch that touches no package. The gates cannot tell whether the step reads clearly or whether its range is the right one. That is the review's.

## Open questions

None.

## Settled

None yet.
