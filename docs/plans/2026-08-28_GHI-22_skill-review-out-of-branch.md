> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Move the skill review out of the branch

Implements #22. Two files change, `.agents/gh-solo.md` and `AGENTS.md`. Nothing in `plugins/` does.

## Why now

Run for real on PR #21, `/skills-maker review` returned nine findings and none was in that PR's diff. It reviews a whole skill, so a per-branch `## Verification` entry makes every skill branch carry a gate about something other than itself, and such a gate gets waved through.

## The one refinement to the issue's flow

The issue says `AGENTS.md` should state that skills follow the `skills-maker` authoring rules, so the `reviewer` agent picks them up. **It cannot: `skills-maker` lives outside this repository**, and `plugins/gh-solo/skills/reviewer/SKILL.md` reads only repo-relative standards. A pointer to a file the reviewer cannot open is a standard it cannot cite.

So `AGENTS.md` states the **subset a diff review can actually check**, in the repo, and says the whole-file judgement belongs to the sweep. The subset is the mechanical part of the authoring rules: a block-scalar `description`, no count of adjacent content, no hard-wrapped prose, portable paths, and one fact in one place with pointers rather than copies.

The alternative, restating the whole authoring rulebook here, is rejected: it would duplicate a file this repository does not own, and the copy would drift.

## Steps

- Rewrite `.agents/gh-solo.md`'s *The skill review is manual, and stays manual* section: the sweep is its own issue per package, opened before that package's `<name>_<version>` tag, and it is not a `## Verification` entry.
- Keep the `disable-model-invocation` reason in that section, since it is still why an agent cannot run the sweep itself.
- Add a section to `AGENTS.md` stating the diff-checkable subset as a repository standard, in terms the reviewer's standards axis can cite.
- Remove every wording that gives the skill review an ordinal position.

## Verification

Gates, each with an exit code:

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, read by exit code and never through a pipe.
- `grep` finds no "second manual review" and no `verification entry` claim left in `.agents/gh-solo.md`.
- `grep` finds the release-tag trigger in `.agents/gh-solo.md`, and the subset stated in `AGENTS.md`.
- The same greps run against `origin/main` find the old wording, so they discriminate rather than always passing.
- `git diff --stat` against `origin/main` names exactly `.agents/gh-solo.md`, `AGENTS.md` and this plan file.

**No `[owner]` box.** This branch touches neither `skills/` nor a plugin's own `skills/` tree, so the entry it removes never applied to it. That is stated here because it is the first thing a reader of this plan will check.

What these gates cannot see: whether the subset in `AGENTS.md` is the right subset. That is the owner's read of the diff.

## Open questions

None.

## Settled

- **The sweep hangs off the release tag rather than a habit.** Settled by the owner. A periodic gate with no trigger does not run, and this repository already releases each package on its own `<name>_<version>` tag.
- **The nine findings from the PR #21 run go into the first sweep issue for `gh-solo`, not this branch.** Settled by the owner: this branch changes the process, not the skill.
