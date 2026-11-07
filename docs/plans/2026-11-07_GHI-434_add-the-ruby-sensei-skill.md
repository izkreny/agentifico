> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Add the ruby-sensei skill

Issue [#434](https://github.com/izkreny/agentifico/issues/434). This branch exports a local skill that holds the judgement half of writing Ruby 4.0, makes this repository its canonical copy, and sweeps it whole before its first tag.

## Shape of the change

The skill arrives as it was reviewed, in its own commit, so every export edit after it reads as a diff against that copy rather than disappearing into one large addition. Its layout is the one it already has: `skills/ruby-sensei/SKILL.md` (new) routing to one file per area under `skills/ruby-sensei/references/` (new), the shipped RuboCop configuration and the floor record under `skills/ruby-sensei/assets/` (new), and the floor check at `skills/ruby-sensei/scripts/check_floor.rb` (new).

The export itself changes one section. The README's install section names the local canonical path and a symlink, which suits a skill that never leaves its machine and is wrong for one installed from here, as [#433](https://github.com/izkreny/agentifico/issues/433) reports for agents-guru. It becomes the skills CLI command glossary-guru's README uses. Everything else passes `skills/agents-guru/workflows/export.md` already: no path under the author's home directory, no tool inventory, and the README's credit to the markdownifico project's notes names a public project.

This repository is canonical from the merge on, per Step 1 of `skills/agents-guru/workflows/export.md`. The local copy is replaced by a reinstall through the skills CLI once the branch lands, which the owner runs.

`metadata.version` stays at `"1.0.0"` through the sweep's fixes, because no installer has had any version of this package, so there is no earlier release for a bump to tell apart.

## Steps

- Copy the skill's directory into `skills/ruby-sensei/` (new) unchanged, as its own commit.
- Replace the README's install section with `npx skills add izkreny/agentifico -g -y -s ruby-sensei` and the sentence naming the skills CLI.
- Grep the copy for the author's username and home directory, expecting hits only in the install command and the README's byline.
- Run `npm --prefix skills/agents-guru ci`, then watch the agents-guru check fail on a scratchpad copy whose description is a plain scalar carrying a space and a `#`, and record the red run in the commit body.
- Run the agents-guru check on `skills/ruby-sensei` until it exits zero.
- In `.agents/gh-solo.md`, add the `ruby-sensei` row to the label table, its exclusion to the mandatory-axis audit query, and `skills/ruby-sensei` to the agents-guru check's list. The issue's technical notes record the owner's approval for this edit.
- Add a `ruby-sensei` row to the package table in the root `README.md`, approved by the owner with the issue.
- Run the sweep with the invocation the issue gives, and record its findings on the issue with short ids.
- Fix each finding in a commit citing its id, or refute it per `skills/agents-guru/workflows/review.md` Step 5.
- Resume the sweep reviewer on the fix commits for a verdict per finding, and record the verdicts on the issue.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `node skills/agents-guru/scripts/check.js skills/ruby-sensei`
- `ruby -c skills/ruby-sensei/scripts/check_floor.rb`

The version check sees a new package, so it passes on any version, and `1.0.0` is checked by reading the frontmatter. `ruby -c` proves the floor check parses, not that it passes: running it needs a bundle holding the versions `skills/ruby-sensei/assets/floor.yml` (new) records, which is installed only on the owner's approval and only if a sweep fix touches a rule the floor covers. No gate can say whether a rule is right, which the sweep and the owner's own reading of the pull request judge. The README's install command cannot resolve until the branch merges, because the skills CLI reads the default branch.

## After the review round

The Vale re-mine is this pull request's last task, run after the round's fixes are pushed and before the merge, so it can read the round's own threads. The package has no tag, so it reads the whole trunk history, per *How a phrase list grows* in `skills/agents-guru/references/maintaining.md`, along with this issue's findings, this pull request's threads and this branch's commits. The issue records what was read. New tokens go on the `agents-guru` issue the owner names when the re-mine runs, and none land on this branch, per *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md`.

## After the merge

The owner reinstalls the skill through the skills CLI, with `/agents-guru manage`, which replaces the local copy with this one. Then the agents-guru check runs across the local skills directory, per Step 6 of `skills/agents-guru/workflows/export.md`. The `ruby-sensei_1.0.0` tag is cut by hand once the issue is closed.

## Open questions

None.

## Settled

None yet.
