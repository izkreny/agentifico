> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Add AGENTS.md and record the package label axis

No issue backs this branch, per *This repository does not run its own issue doctrine* in `.agents/gh-solo.md`, so this plan carries the *what* as well as the *how*.

## Why now

The owner asked for labels, "at least for packages we have in this repo, e.g. `gh-solo` label". Acting on that exposed two gaps:

- The repository has no root instruction file. Every fact an agent needs about it - that `plugins/` and `skills/` ship as independent packages, that each carries its own `<name>_<version>` tag, that prose here is never hard-wrapped - is either inferred from the tree or buried in a plugin-specific config file.
- `.agents/gh-solo.md` now states two things that are false. It says the repository "does not run its own issue doctrine" and that no label taxonomy is deliberately absent. Issues #2 and #3 are open, both carry labels, and a package axis now exists.

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

**Recording the set is not creating the labels.** A label is created in the same breath as the first issue that carries it, never in advance, so the picker only ever holds labels something uses. Right now that means `gh-solo` exists and the other six do not.

## Steps

- Write `AGENTS.md` at the repository root.
- Rewrite the two false sections of `.agents/gh-solo.md`: *This repository does not run its own issue doctrine* becomes an accurate account of what the repository does run, and *What is deliberately not here* loses its no-label-taxonomy claim.
- Add a labels section to `.agents/gh-solo.md` recording the package axis, its rules, and the create-on-demand rule.
- Cross-link the two files, each pointing at what the other owns.

## Verification

Gates, each with an exit code:

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans` with the ignore set from `.agents/gh-solo.md`, read by exit code and never through a pipe.
- Every package-axis value except `repo` names a directory that exists: one `test -d` per value. `repo` is the repository itself and has no directory.
- `gh label list` holds no *package-axis* label that no open issue carries. The stock GitHub labels are out of scope for this branch; pruning them is a deletion and the owner's call.

What these cannot see: whether the split between the two files is the right one, and whether `AGENTS.md` says anything an agent actually needs. Both are the owner's read of the diff.

## Open questions

- **Should `CLAUDE.md` be a symlink to `AGENTS.md`?** Claude Code reads `CLAUDE.md`; `AGENTS.md` is the cross-agent name. A symlink in the repository would make the file load without duplicating it. Left out of this branch pending the answer.
- **Do the `gh-solo` labels on #2 and #3 mean the repository has adopted the full issue doctrine?** If it has, branches gain `GHI-` keys and PR bodies gain `Closes` lines, and the section that says those fail by construction needs rewriting rather than correcting. This branch assumes not: issues exist for plugin defects, branches stay unkeyed.

## Settled

- **The package axis replaces the Layer axis rather than joining it.** The two would ask the same question here, and `plugins/gh-solo/skills/tracker/references/standards.md` forbids two values on one axis.
- **Per-package labels, not `plugin`/`skill`/`repo` by kind.** Each package has its own release tag, so a label maps one-to-one onto a releasable unit; a `plugin` label would be a synonym for `gh-solo` while only one plugin exists.
