> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Clear the skills-guru check on gh-solo

Issue [#212](https://github.com/izkreny/agentifico/issues/212). It is not part of an epic, so the branch is cut from `main` and not stacked. Its typed blockers, #218 and #220, are merged. The issue's prose also names every skills-guru issue that follows from #218; the ones still open, #227 and #228, sit under the `someday` epic #226, and this branch does not wait on them.

## What changes

**The check reports 17 errors today, not the three the issue lists.** #220 and #221 landed after the issue was written, and the first acceptance criterion asks for exit zero, so every error the check reports now is in scope. They are in `implement`, `reviewer` and `tracker` as well as `pr-flow`, and each is one sentence reworded to name the section or members it means. No rule file under `skills/skills-guru/` changes.

**`FileLength` warns on four files, and the gap is measured in the check's own count**, which is smaller than `wc -w` because Vale skips code blocks and tables:

| File | Vale words | Over the cap |
|---|---|---|
| `plugins/gh-solo/skills/pr-flow/workflows/review.md` | 6,941 | 3,441 |
| `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` | 5,054 | 1,554 |
| `plugins/gh-solo/skills/pr-flow/workflows/open.md` | 3,624 | 124 |
| `plugins/gh-solo/skills/pr-flow/workflows/merge.md` | 3,542 | 42 |

**`plugins/gh-solo/skills/pr-flow/references/review-protocol.md` loses two sections to `plugins/gh-solo/skills/pr-flow/references/pass-cap.md` (new).** *The pass cap* and *The push gate, while a reviewer is reading* are 1,321 Vale words between them, and they stand alone: one names the budget and the word that buys a further pass, the other names what a push costs while a pass is being spent. They move verbatim, headings included, so every citation changes only its file part. The protocol keeps one line under *The steps* saying when to read the new file. The remaining 233 words come out of the conclusions and step 5, where the file restates what the moved sections own.

**`plugins/gh-solo/skills/pr-flow/workflows/review.md` loses its per-repo reviewer text to `plugins/gh-solo/skills/pr-flow/references/reviewer-appointment.md` (new).** *Which reviewer runs is a per-repo fact* and *Where the appointed reviewer is a command* are read when a repository appoints a reviewer, which is a per-repo fact and not a per-run one, so they fit *Material a workflow does not need on every run goes to a reference file* in `skills/skills-guru/workflows/new.md`. The head read and the pin stay in Step 1, since every spawn does them. Under *At the cap* and *While it reads, a push is refused*, Step 1 keeps the command, the verdict line and where to go next, and points at `plugins/gh-solo/skills/pr-flow/references/pass-cap.md` (new) for the exits and their cost, which it currently restates. What is still over the cap after those moves comes out of *Before the round*, Step 2 and Step 5 as restatement and defence of the design. *Convention checks* stays: it is a table, and Vale counts 72 words in it.

**Every `## Rules` section is read bullet by bullet, in all 11 files that end on one.** A bullet restating a step goes. A bullet stating a rule found nowhere else moves into the step it belongs to; the issue names two, in `plugins/gh-solo/skills/pr-flow/workflows/ready.md` and `plugins/gh-solo/skills/pr-flow/workflows/merge.md`. A bullet that fits no single step stays, and a section that keeps one keeps its `ClosingRecap` warning, which does not fail the check. `plugins/gh-solo/skills/pr-flow/workflows/open.md` and `plugins/gh-solo/skills/pr-flow/workflows/merge.md` come under the cap by this pass alone.

**Every citation of a moved section is re-aimed by hand**, because the docs check reads paths and not headings. The citations are in `plugins/gh-solo/skills/pr-flow/SKILL.md`, `plugins/gh-solo/skills/pr-flow/README.md`, `plugins/gh-solo/skills/pr-flow/workflows/review.md`, `plugins/gh-solo/skills/pr-flow/workflows/resolve.md`, `plugins/gh-solo/skills/pr-flow/workflows/stack.md`, `plugins/gh-solo/skills/pr-flow/workflows/merge.md` and the protocol. Neither `AGENTS.md` nor `.agents/gh-solo.md` cites a section that moves, so no repository-level file changes on this branch.

**The package moves from 4.9.0 to 4.9.1.** Nothing an installer does changes and no interface breaks: the same rules are read from more files.

## Steps

- Reword the 17 sentences the check flags as `Counts` or `Position`, each to name the section, file or members it means, and re-run the check after the batch.
- Write `plugins/gh-solo/skills/pr-flow/references/pass-cap.md` (new) from the protocol's *The pass cap* and *The push gate, while a reviewer is reading*, verbatim; leave one line in the protocol saying when to read it; re-aim every citation.
- Write `plugins/gh-solo/skills/pr-flow/references/reviewer-appointment.md` (new) from Step 1's *Which reviewer runs is a per-repo fact* and *Where the appointed reviewer is a command*, verbatim; leave one line in Step 1 saying when to read it; re-aim every citation.
- Cut Step 1's *At the cap* and *While it reads, a push is refused* to the command, the verdict line and the next move, pointing at the new file for the rest.
- Read every `## Rules` section bullet by bullet across the 11 files, delete what restates a step, move what is stated nowhere else into its step, and keep what fits no step.
- Cut what restates or defends in `plugins/gh-solo/skills/pr-flow/workflows/review.md` and the protocol until both are under the cap, and add rows for the two new files to the *Supporting files* table in `plugins/gh-solo/skills/pr-flow/SKILL.md`.
- Bump `version` in `plugins/gh-solo/.claude-plugin/plugin.json` to 4.9.1.

## Verification

- `node skills/skills-guru/scripts/check.js plugins/gh-solo` exits zero and reports no `FileLength` warning.
- `python3 scripts/version-check.py`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`

No gate reads whether a citation names a section its file still holds, so a scratchpad script extracts every citation of the form *Title* in a backticked path under `plugins/gh-solo`, `AGENTS.md` and `.agents/gh-solo.md`, and checks the target holds that heading; it is watched failing on a made-up title before the moves and run after each one. No gate reads whether a cut removed an instruction: each commit's diff is the record, and the review round reads it.

## Open questions

None.

## Settled

None yet.
