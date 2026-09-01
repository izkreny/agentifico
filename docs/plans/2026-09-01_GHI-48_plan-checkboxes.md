> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Drop progress checkboxes from plan files (#48)

## Context

`plugins/gh-solo/skills/pr-flow/workflows/open.md` puts progress in the PR body and intent in the plan file: `## Steps` is "plain bullets, never checkboxes" in its Step 2, and its *Rules* say checkboxes live in the PR body only. Five plans under `docs/plans/` broke the rule in `## Verification` rather than in `## Steps`, and fourteen boxes across them sit unticked on `main` because the branch that ran each gate ticked the PR body's copy instead. A reader on `main` cannot tell those from gates nobody ran.

`docs/plans/2026-08-31_GHI-35_rnp-shortcut.md` is already clean: PR #47 fixed it in place, and it merged as `7e2383e`, so this branch is cut after it and the two do not collide.

## Approach

**Only the marker goes.** Each line loses its `[ ] ` and keeps every word after it, so the diff is fourteen lines each shortened by four characters and nothing else. The entries were written as the gates that branch owed and they still read as that; what was wrong was the rendering, never the content.

**The five files are the whole scope.** `grep` over `docs/plans/` finds no `- [x]` anywhere and no checkbox outside `## Verification`, so there is no ticked box to decide about and no `## Steps` section to touch.

**This plan is inside its own scope.** It lands under `docs/plans/`, so the acceptance criterion that no plan contains a checkbox in any section covers this file too: its own `## Steps` and `## Verification` are plain bullets, which is what `plugins/gh-solo/skills/pr-flow/workflows/open.md` asked for all along.

**The grep is the gate this branch actually needs.** `plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` reads paths and fences, and `scripts/version-check.py` reads which packages moved; neither can see a checkbox, so on their own this branch would merge on two gates that cannot fail for the defect it exists to fix. The grep was run against the unfixed tree first and reported all fourteen lines with exit 1, which is what makes its silence afterwards worth reading.

**Nothing outside `docs/plans/` changes.** A permanent mechanical guard would have to live under `scripts/`, and stating the rule more loudly would have to edit `plugins/gh-solo/skills/pr-flow/workflows/open.md` and move that package's version; the issue rules both out, so `scripts/version-check.py` passes this branch reporting no package touched.

## Steps

- Strip the leading `[ ] ` marker from the fourteen `## Verification` lines in `docs/plans/2026-08-30_GHI-14_cap-post-length.md`, `docs/plans/2026-08-31_GHI-38_cap-pr-body-on-main.md`, `docs/plans/2026-08-31_GHI-39_version-moves.md`, `docs/plans/2026-08-31_GHI-41_version-check-misreads.md` and `docs/plans/2026-08-31_GHI-44_highest-rf-read.md`, leaving each entry's text untouched.
- Read the diff back and confirm every changed line is shortened rather than reworded, and that no file outside `docs/plans/` appears in it.
- Run the checkbox grep over the whole of `docs/plans/`, this plan included, and confirm it now reports nothing.
- Run the repository's docs-check and version-check gates, per *Check commands* in `.agents/gh-solo.md`.

## Verification

- `grep -rEn '^ *- \[[ x]\]' docs/plans/; test $? -eq 1` - the gate is grep finding nothing, so `test` turns both a hit and a grep error into a non-zero exit rather than only the hit.
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, run from the repository root with its exit code read directly and never through a pipe.
- `python3 scripts/version-check.py`, which passes reporting no package touched, since `docs/plans/` is repository-level.

**What none of these see:** whether each surviving entry still reads as the gate its own branch owed. The grep proves the marker is gone and the diff proves the words are unchanged, but only a reader can say that a line stripped of its box still belongs in a section about how the work was verified. That is the review round's judgement rather than a gate's.

## Open questions

- Should a follow-up issue add a mechanical guard, so a plan with a checkbox cannot land again? It cannot live on this branch - a check under `scripts/` or a louder rule in `plugins/gh-solo/skills/pr-flow/workflows/open.md` both break the criterion that nothing outside `docs/plans/` changes - so the answer is either a new issue or nothing.
