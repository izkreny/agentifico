> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Name the docs-check bench, and re-mine the sweep's own pull request

Issue [#239](https://github.com/izkreny/agentifico/issues/239). It is not part of an epic, so the branch is cut from `main` and not stacked. It has no blockers.

## What changes

***The benches* gains the docs check's bench.** The entry names `bash plugins/gh-solo/skills/pr-flow/scripts/test-docs-check.sh`, owed after any edit to `plugins/gh-solo/skills/pr-flow/scripts/docs-check.py`. It takes the form the other entries use: a bold lead naming the bench and its trigger, then the command in a fence. It goes just before the plan check's bench, since both scripts live in the same directory.

**The re-mine paragraph in *The skill review is its own issue, not a branch's gate* is rewritten.** The re-mine becomes the sweep's last act, after its own findings are fixed. Beside the merged range it reads three more sources: the sweep issue's own findings, its pull request's review threads, and its branch's fix commits. The paragraph says why those three fall outside every merged range. The sweep's pull request is unmerged while the sweep runs, and the tag on its squash commit starts the next range after it.

**The criterion paragraph in the same section says the same.** It is the text a sweep issue's acceptance criterion is written from. No separate sweep issue template exists in the tree. The criterion becomes the issue's last, and it names the three own sources beside the merged range.

**Nothing else moves.** `AGENTS.md` and every package are unchanged, so no version moves.

## Decisions

**This branch settles the wording, and #238 copies it.** #238 sits in epic #226's stack and lands later, so `skills/skills-guru/references/maintaining.md` is not edited here. Both issue bodies were updated to say so before this branch was cut.

**The procedure stays in `skills/skills-guru/references/maintaining.md`.** This file names the timing and the sources, and points there for how a token lands. It does not copy the commands.

## Steps

- Add the docs check's bench to *The benches* in `.agents/gh-solo.md`.
- Rewrite the re-mine paragraph in *The skill review is its own issue, not a branch's gate*: last act, after the sweep's own findings are fixed, and the three own sources beside the merged range.
- Rewrite the criterion paragraph in the same section to match.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-docs-check.sh`
- `python3 scripts/version-check.py`
- `git diff --quiet origin/main -- AGENTS.md plugins skills` exits zero.

The bench run shows that the newly named command exists and passes. `scripts/version-check.py` passes without testing anything, which is correct for a branch that touches no package. The gates can't tell whether the new wording reads clearly, or whether #238 can copy it unchanged. The review judges that.

## Open questions

None.

## Settled

None yet.
