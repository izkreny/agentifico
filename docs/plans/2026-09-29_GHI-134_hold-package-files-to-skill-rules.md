> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Hold every package file to the skill rules

Issue [#134](https://github.com/izkreny/agentifico/issues/134). It is not part of an epic, so the branch is cut from `main` and not stacked.

The issue was written when the package was `skills-maker`. It is `skills-guru` now, at `skills/skills-guru/`, and this plan reads every `skills-maker` in the issue as that.

## What changes

Two repository-level files, `AGENTS.md` and `.agents/gh-solo.md`. The issue asks for two mechanisms, and each file carries one.

**The standard, in `AGENTS.md`.** *Skill files follow the skills-guru rules* keeps its heading, since `.agents/gh-solo.md` cites it by name. Its opening paragraph widens from the skills trees to every path under `plugins/` and `skills/`, plus `AGENTS.md` and `.agents/gh-solo.md`. A new paragraph names `docs/plans/` as outside the standard: a plan is a record of intent and keeps its history by design. The review paragraph widens to a diff under any of those paths. The reviewer reads this file by its own precedence, so no reviewer configuration changes.

**The gate, in `.agents/gh-solo.md`.** *Check commands* gains one paragraph and one command: `node skills/skills-guru/scripts/check.js <package-dir>`, owed after any edit under a listed package. The list names its members: `plugins/gh-solo`, `skills/review-text`, `skills/skills-guru` and `skills/socratic-tutor`. The paragraph says three things:

- A package joins the list the day the check exits zero on it, so no branch clears another package's backlog to pass its own gate.
- `skills/skills-guru/workflows/check.md` calls a package-root run a survey, because it may reach a skill someone else maintains. Every skill under a package here is this repository's own, so here the survey is the gate.
- It is a `## Verification` entry, unlike `/skills-guru review`, which *The skill review is its own issue, not a branch's gate* keeps out of one. The check has an exit code; the review is a whole-skill judgement.

The skills-guru block keeps its suite, its lint and the `npm ci` and Vale prerequisites, which the new paragraph points at rather than restates. Its own check run over itself goes, since the new paragraph now covers it.

## Why `skills/rails-style` is not on the list

The check exits 1 on it, with 25 issues. Some are real: position and history wording, and a README with no install form. Others are paths into a Rails application, such as its routes file, which the skill names on purpose and which exist in no tree here. Settling that is its own issue, and the list rule is what lets it join later.

## Out of this diff

No package directory is touched, so no version moves. Merged plans stay as written.

## Steps

- Widen *Skill files follow the skills-guru rules* in `AGENTS.md` to every path under `plugins/` and `skills/`, `AGENTS.md` and `.agents/gh-solo.md`, and name `docs/plans/` as outside it.
- Add the skills-guru check paragraph and command to *Check commands* in `.agents/gh-solo.md`, listing the packages it runs clean on.
- Drop the self-check from the skills-guru block in `.agents/gh-solo.md`, and point the block at the new paragraph.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `node skills/skills-guru/scripts/check.js skills/review-text`
- `node skills/skills-guru/scripts/check.js skills/skills-guru`
- `node skills/skills-guru/scripts/check.js skills/socratic-tutor`

The version check passes by touching no package, which is the right answer for this branch. The four check runs prove the list is true today, and `skills/rails-style` exiting 1 is what shows the check can fail. None of the gates can tell whether the widened standard reads clearly. That is the review round's.

## Open questions

None.

## Settled

None yet.
