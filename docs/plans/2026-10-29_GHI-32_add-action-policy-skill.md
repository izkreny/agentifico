> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Add the action-policy skill

Issue [#32](https://github.com/izkreny/agentifico/issues/32). The skill was drafted outside this repository and is complete. This branch lands it as a package under `skills/action-policy/` (new), makes it pass this repository's checks, and registers it where the repository lists its packages. It sits in no epic, so it is not stacked.

## Where the draft stands

The live upstream bundle matches the pinned snapshot, so the prose was written against the documentation as it is today. The vendored licence notice matches the copyright line in the gem's own licence file, and the repository's licence is MIT.

The agents-guru check reports 37 issues on the draft. None is a defect in what the skill teaches. They fall into these groups:

- **The README's Installation section describes one machine's skill layout.** This repository is public, so that sentence goes, and the section takes the install form the other standalone skills use.
- **Paths in the user's project are written bare**, such as the policies directory. Each takes the `<repo-root>/` placeholder. A code span that names a path in the gem's own repository is reworded out of the span, since no placeholder names that tree.
- **Each section's `upstream: <page>` citation is an emphasised paragraph**, which MD036 reads as a heading. The citation keeps its text and loses the emphasis.
- **The prose rules flag counts, a position claim and a history phrase**, each reworded per the rule's own message, along with the remaining Markdown lint.

The check exits zero on the package once these are fixed. Per `.agents/gh-solo.md`, that is the day a package joins the check's list, so this branch adds it.

## Steps

- Copy the draft into `skills/action-policy/` (new) byte for byte, and commit it alone. Every later commit then reads as a diff against the draft.
- Replace the README's Installation section with the install form `skills/review-text/README.md` uses, naming the skills CLI.
- Fix the remaining check findings, and run `node skills/agents-guru/scripts/check.js skills/action-policy` to exit zero.
- Watch the description rules fail on a trapped copy of the skill in the scratchpad: the description rewritten as a plain scalar carrying ` #`. Record the red run in the commit body.
- Write `skills/action-policy/scripts/test-check-upstream.sh` (new), a bench that runs `skills/action-policy/scripts/check-upstream.sh` (new) against a stub `curl` serving crafted bundles. It covers an unchanged bundle, a changed one, a bundle linking a page it does not embed, a bundle with no page links at all, and a bundle with no `url:` markers. Watch it fail against a deliberately broken copy of the script before trusting it green.
- In `.agents/gh-solo.md`, add the `action-policy` row to the label table, its exclusion to the mandatory-axis audit query, the package to the agents-guru check's list, and the bench under *The benches*.
- Add an `action-policy` row to the package table in the root `README.md`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `node skills/agents-guru/scripts/check.js skills/action-policy`
- `bash skills/action-policy/scripts/test-check-upstream.sh`
- `bash skills/action-policy/scripts/check-upstream.sh`

The version check sees `skills/action-policy/` (new) as a new package, so it passes on any version, and 1.0.0 is checked by reading the frontmatter. The skills CLI resolves `izkreny/agentifico` against the default branch and takes no ref, so the README's install command cannot resolve until this branch merges. The live upstream check passes only while upstream stays as snapshotted. Whether the skill's claims about Action Policy are right is the owner's `/agents-guru review`, and no gate reads it. Replacing the hand-built local copy with a manager-installed one is an install, so it is left for the owner after the merge.

## Open questions

None.

## Settled

- **May this branch edit `.agents/gh-solo.md` and the root `README.md`?** Yes, the owner said so in the terminal. The edits are the label row, the audit exclusion, the check-list entry, the bench entry and the README package row, and nothing else in either file.
