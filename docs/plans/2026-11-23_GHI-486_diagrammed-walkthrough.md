> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Add a diagrammed walkthrough of the repository

Issue #486 holds the acceptance criteria. This plan says how.

## Approach

The root `README.md` gains one diagram, under *What is here*: how a package reaches a user. A plugin under `plugins/` goes through `.claude-plugin/marketplace.json` to `claude plugin install`. A skill under `skills/` goes through a skill manager into any agent that reads the Agent Skills format. Each package in the table is a node, so AC2 is checked by comparing the two.

`docs/walkthrough.md` (new) carries the rest, each diagram under its own heading with a few sentences of prose:

- The loop: `create`, `start`, `plan`, implementation, `ready`, `review`, `:rp`, `merge`, each node named by the word that starts it.
- The review round: a sequence diagram of the owner, the session, the `reviewer` agent and GitHub, following steps 1 to 8 of `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` at the level of its step headings.
- The epic variant: children stacked as branches, the sweep on the top branch, and `gh stack merge` landing the whole stack at once, per *A stack is the release train* in `AGENTS.md`.
- The release: a version bump that publishes on merge, the sweep, then the annotated tag on the package's last squash commit, per *How a package is released* in `AGENTS.md`.
- How a skill is built: a routing skill file that reads one workflow file per word, which reads its references and runs its scripts, using `plugins/gh-solo/skills/pr-flow/SKILL.md` as the example.

Every diagram is Mermaid in a fenced block, so GitHub renders it and no image needs keeping in step. A label separates its parts with ` · `, never `<br/>`, and never opens with `#`, so no issue number sits at the start of a label. A diagram names a workflow by its word and never draws its internal steps; the walkthrough links each package's own README for those.

The root `README.md` links the walkthrough from *Working on this repository*, and the layout table in `AGENTS.md` gains a row for `docs/walkthrough.md` (new). Nothing under `plugins/` or `skills/` changes, so no version moves.

## Steps

- ::S1:: Add the package-routes diagram to the root `README.md`
- ::S2:: Write `docs/walkthrough.md` (new), with the disclaimer and the five diagrams the approach lists
- ::S3:: Link `docs/walkthrough.md` (new) from the root `README.md`, and add its row to the layout table in `AGENTS.md`
- ::S4:: Check every word, path and command the diagrams name against the tree at the branch head

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-23_GHI-486_diagrammed-walkthrough.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md README.md docs/walkthrough.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`, the repository's command with the two files this branch writes added as targets
- ::V3:: `node skills/agents-guru/scripts/check.js AGENTS.md .agents/gh-solo.md .agents/dependencies.md`, owed because the branch edits `AGENTS.md`
- ::V4:: `python3 scripts/version-check.py`

V4 passes without exercising anything, since this branch touches no package. No gate here renders Mermaid, so whether every diagram draws on GitHub, and whether each one says what the tree does, is the owner's reading of the branch, as AC5 and AC6 say.

## Open questions

None.

## Settled

None yet.
