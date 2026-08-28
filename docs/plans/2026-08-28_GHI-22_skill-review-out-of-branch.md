> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Move the skill review out of the branch

Implements #22. Two files change, `.agents/gh-solo.md` and `AGENTS.md`. Nothing in `plugins/` does.

## Why now

Run for real on PR #21, `/skills-maker review` returned nine findings and none was in that PR's diff. It reviews a whole skill, so a per-branch `## Verification` entry makes every skill branch carry a gate about something other than itself, and such a gate gets waved through.

## Why AGENTS.md points rather than copies

`skills/skills-maker/` is a package of this repository, so `skills/skills-maker/workflows/new.md` is readable from any branch and can be cited by path. `AGENTS.md` therefore names it and tells a round to read it, rather than restating a subset of it here.

The rejected alternative is the one the issue's Technical notes preferred: restating the diff-checkable rules in `AGENTS.md`. A copy of another file's rules drifts from it silently, and naming the owner beside a copy does not stop that.

Naming the file is not sufficient on its own, which the round on this branch caught: the reviewer's documented fetch list ends at `AGENTS.md`, so `AGENTS.md` has to instruct the extra read rather than merely cite the path.

## Steps

- Rewrite `.agents/gh-solo.md`'s *The skill review is manual, and stays manual* section: the sweep is its own issue per package, opened before that package's `<name>_<version>` tag, and it is not a `## Verification` entry.
- Keep the `disable-model-invocation` reason in that section, since it is still why an agent cannot run the sweep itself.
- Add a section to `AGENTS.md` naming `skills/skills-maker/workflows/new.md` as the standard and requiring a round under either skills tree to read it.
- Remove every wording that gives the skill review an ordinal position.

## Verification

Gates, each with an exit code:

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, read by exit code and never through a pipe.
- `grep` finds no "second manual review" and no `verification entry` claim left in `.agents/gh-solo.md`.
- `grep` finds the release-tag trigger in `.agents/gh-solo.md`, and the `skills/skills-maker/workflows/new.md` pointer in `AGENTS.md`.
- The same greps run against `origin/main` find the old wording, so they discriminate rather than always passing.
- `git diff --stat` against `origin/main` names exactly `.agents/gh-solo.md`, `AGENTS.md` and this plan file.

**No `[owner]` box.** This branch touches neither `skills/` nor a plugin's own `skills/` tree, so the entry it removes never applied to it. That is stated here because it is the first thing a reader of this plan will check.

What these gates cannot see: whether a round actually performs the read `AGENTS.md` requires. Nothing here executes an instructions file, so that is the owner's read of the diff.

## Open questions

None.

## Settled

- **The sweep hangs off the release tag rather than a habit.** Settled by the owner. A periodic gate with no trigger does not run, and this repository already releases each package on its own `<name>_<version>` tag.
- **The nine findings from the PR #21 run go into the first sweep issue for `gh-solo`, not this branch.** Settled by the owner: this branch changes the process, not the skill.
