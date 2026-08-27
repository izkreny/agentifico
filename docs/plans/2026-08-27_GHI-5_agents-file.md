> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Add AGENTS.md and record the package label axis

Implements #5. The plan predates the issue: the owner asked for package labels, acting on it exposed the gaps, and the issue was written afterwards to hold the criteria.

## Why now

- The repository has no root instruction file. Every fact an agent needs about it - that `plugins/` and `skills/` ship as independent packages, that each carries its own `<name>_<version>` tag, that prose here is never hard-wrapped - is either inferred from the tree or buried in a plugin-specific config file.
- `.agents/gh-solo.md` states two things that are false. It says the repository "does not run its own issue doctrine" and that no label taxonomy is deliberately absent. Issues #2, #3 and #5 are open, all three carry labels, and the owner has settled that branches here carry a `GHI-` key.

## What each file owns

Two files, and the split is the decision worth reviewing:

- **`AGENTS.md`** owns repository-wide facts, for any agent and any task: what the repository is, its layout, the per-package versioning, the prose conventions, and what must not land in a public repository. It points at `.agents/gh-solo.md` for the GitHub loop rather than restating any of it.
- **`.agents/gh-solo.md`** keeps owning everything the `gh-solo` plugin reads, and gains the label axis. The axis goes here rather than in `AGENTS.md` because this is the file the plugin's *Per-repo config* step actually reads, and because `plugins/gh-solo/skills/tracker/references/standards.md` names it as the home for a repository's own label set.

One fact, one home. Where the second file needs a fact the first owns, it points.

## The label axis

`plugins/gh-solo/skills/tracker/references/standards.md` makes the Layer axis mandatory and its `backend`/`frontend`/`fullstack`/`infra`/`docs` set "a default, not a law". This repository has no such split: it has packages, each independently released. So the Layer axis is replaced by a **package axis**, with the same rules - mandatory, exactly one, epics exempt.

The values are the packages that exist, plus one for the repository itself:

`gh-solo` `daisyui-designer` `rails-style` `review-text` `skills-maker` `socratic-tutor` `repo`

`repo` covers work whose deliverable is the repository rather than a package: `README.md`, `.claude-plugin/marketplace.json`, `LICENSE`, `AGENTS.md` itself.

**Recording the set is not creating the labels.** A label is created in the same breath as the first issue that carries it, never in advance, so the picker only ever holds labels something uses. Right now that means `gh-solo` and `repo` exist and the other five do not.

## The issue doctrine this repository does run

The owner has settled that branches carry a `GHI-` key, which turns the whole *This repository does not run its own issue doctrine* section into a rewrite rather than a correction. What replaces it:

- Work is backed by an issue, and a branch is `{type}/GHI-{issue-number}_{slug}`. The parse that recovers a number from a branch name will find one.
- A PR body carries `Closes #{issue-number}`. The convention checks that gate on it and on the branch format now pass rather than failing by construction, so the note telling a reader to report them and carry on goes.
- The `tracker` skill operates here. It may create issues, and the label taxonomy it would have offered to write is the package axis recorded above.
- The package axis is the layer set, and the plugin's mandatory-exactly-one rule applies to it unchanged.

## The skill review, and why it is manual

A change to a skill has a second axis no diff review covers: whether the skill still works *as a skill*. `skills/skills-maker/workflows/review.md` is that pass and `skills/skills-maker/workflows/check.md` is its mechanical half.

No agent can start it. `skills/skills-maker/SKILL.md` sets `disable-model-invocation: true` and its description says "Explicit invocation only", confirmed by its absence from an agent session's skill listing. Nor can the round's reviewer be handed over mid-flight: what the round spawns is a sidechain of the orchestrating session rather than a session of its own, so there is no id to resume and nothing for the owner to type into.

None of that costs anything, because the skill takes a **path** rather than inherited context - its first step is to read every file in the skill's directory. A session that has just reviewed the diff gives it nothing it does not re-read, so the owner typing the command in any session is not a degraded version of some better route. It is the route.

So the fact is recorded in `.agents/gh-solo.md`, where the review round reads it, rather than in `AGENTS.md`: it is a per-repository fact about how a round runs here. It says a change under `skills/` or `plugins/*/skills/` also owes a `skills-maker` review, that the owner starts it by hand, and why no agent can. Nothing is filed against `skills-maker` itself - the flag is not a defect once the gate is understood as manual.

## Steps

- Write `AGENTS.md` at the repository root.
- Replace `.agents/gh-solo.md`'s *This repository does not run its own issue doctrine* section with an account of the doctrine it does run.
- Add a labels section to `.agents/gh-solo.md` recording the package axis, its rules, and the create-on-demand rule.
- Drop the no-label-taxonomy claim from *What is deliberately not here*, and the branch-format and `Closes` exemptions wherever else that file states them.
- Cross-link the two files, each pointing at what the other owns.
- Note in `.agents/gh-solo.md` that a change to a skill also owes a `skills-maker` review, that the owner starts it by hand, and why, per *The skill review, and why it is manual* above.
- Symlink `CLAUDE.md` to `AGENTS.md`, so Claude Code loads the file without a second copy of it existing.

## Verification

Gates, each with an exit code:

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans` with the ignore set from `.agents/gh-solo.md`, read by exit code and never through a pipe.
- Every package-axis value except `repo` names a directory that exists: one `test -d` per value. `repo` is the repository itself and has no directory.
- `gh label list` holds no *package-axis* label that no open issue carries. The stock GitHub labels are out of scope for this branch; pruning them is a deletion and the owner's call.
- `grep` finds no surviving claim in `.agents/gh-solo.md` that the repository runs no issue doctrine, that no label taxonomy exists, or that the `Closes` and branch-format checks fail by construction.
- `readlink CLAUDE.md` resolves to `AGENTS.md`, and `git ls-files -s CLAUDE.md` reports mode `120000`, so what is committed is the link and not a copy of the file.

What these cannot see: whether the split between the two files is the right one, and whether `AGENTS.md` says anything an agent actually needs. Both are the owner's read of the diff.

## Open questions

None.

## Settled

- **`CLAUDE.md` is a symlink to `AGENTS.md`.** Settled by the owner. Claude Code reads `CLAUDE.md` and `AGENTS.md` is the cross-agent name, so a link gives both without a second copy to drift.
- **The skill review is a manual step, recorded in `.agents/gh-solo.md` rather than `AGENTS.md`.** Settled by the owner. Two routes were considered and dropped: an agent following the skill's workflow files by hand, which needs a file enumeration that goes stale, and taking over the round's reviewer session, which does not exist as a session. Nothing is filed against `skills-maker`; the flag is not a defect here.

- **The package axis replaces the Layer axis rather than joining it.** The two would ask the same question here, and `plugins/gh-solo/skills/tracker/references/standards.md` forbids two values on one axis.
- **Per-package labels, not `plugin`/`skill`/`repo` by kind.** Each package has its own release tag, so a label maps one-to-one onto a releasable unit; a `plugin` label would be a synonym for `gh-solo` while only one plugin exists.
- **Labels are never pre-created.** The full axis plus the doctrine's nature, priority and readiness labels were created early in the session and deleted; `repo` came back when #5 needed it.
- **The repository runs the full issue doctrine, `GHI-` key included.** Settled by the owner. It is why the section above is a rewrite, and why this branch has an issue behind it at all.
