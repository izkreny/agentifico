# agentifico

AI agent skills, instructions and gotchas, published two ways: a Claude Code plugin marketplace, and skills that install on their own.

This file is for any agent working in this repository, whatever its harness, and it is deliberately minimal: it holds only what no other file already owns. Conventions that come from the `gh-solo` plugin, or from the agent's own instructions, are not restated here.

## Layout

| Path | What it holds |
|---|---|
| `.claude-plugin/marketplace.json` | the marketplace manifest, one entry per plugin |
| `plugins/<name>/` | one plugin, with its own manifest, skills, agents and hooks |
| `skills/<name>/` | a skill that ships on its own, outside any plugin |
| `docs/plans/` | one implementation plan per branch |
| `scripts/` | this repository's own checks, and their benches |
| `.agents/gh-solo.md` | the per-repository facts the `gh-solo` plugin reads |
| `AGENTS.md`, `CLAUDE.md` | this file; the second is a symlink to the first |

## Each plugin, and each skill under `skills/`, is a package

A package is released on its own tag, `<name>_<version>`, and carries its own version inside it - a plugin in its own `plugins/<name>/.claude-plugin/plugin.json`, a skill in its frontmatter under `metadata.version`.

**A change to one package is not a change to another, and no package's version moves for another's change.** That is the rule the tag scheme exists to make true, and it is what makes `skills/` and `plugins/` peers rather than a hierarchy: a skill under `plugins/<name>/skills/` ships when its plugin does, a skill under `skills/` ships when it alone is tagged.

**A change to a package's own files moves that package's version, on the branch that makes the change.** Which part moves follows from what the change does to whoever installs the package: a breaking change moves the major, new behaviour the minor, and everything else the patch, with a `!` or a `BREAKING CHANGE:` trailer on the commit marking the first. The commit type is a hint at that and never the rule, since a `feat` can break an interface and a `chore` can leave one alone. Every path outside a `plugins/<name>/` or `skills/<name>/` directory is repository-level, owns no version and moves none, so a change confined to such paths leaves every version where it was.

The package axis is also the repository's label axis, which `.agents/gh-solo.md` records.

## How a package is released

**A plugin's `version` field is the release, not a label on one.** Claude Code uses a plugin's version as the cache key that decides whether an update is available, and resolves it from the first of these that is set: the `version` in the plugin's own `plugins/<name>/.claude-plugin/plugin.json`; the `version` in its marketplace entry; the commit SHA of its source; an archive digest; `unknown`. The plugins reference is explicit about what an explicit version then means - users "get updates only when you bump this field" - so bumping it *is* publishing to everyone installed, and the `<name>_<version>` tag is this repository's own record rather than anything the update mechanism reads.

**A marketplace entry here therefore carries no `version`, and none should.** An entry's copy is consulted only when the plugin's own manifest has none, and every plugin here sets one, so a version in the entry would be a field that can drift and can never be read. `.agents/gh-solo.md` enumerates what the two manifests share and which fields must be kept in step; `version` is the one whose absence from the entry is the rule.

**`.claude-plugin/marketplace.json` distributes plugins only.** A marketplace entry describes a plugin and where to find it, so the packages under `skills/` are absent from it by nature rather than by omission: they reach a user through a skill manager instead, and putting one in the marketplace would mean wrapping it in a plugin first.

**An epic's work is stacked, and the stack is the release train.** Every branch bumps its package's version exactly as it does anywhere else, so per-branch discipline is unchanged and `scripts/version-check.py` needs nothing new. The top branch of the stack is that package's whole-package sweep, because the top branch contains every branch below it and a review there is a review of what actually ships. `gh stack merge` lands the whole stack atomically, so `main` moves straight from the version installers already have to the swept one: the intermediate versions exist in `main`'s history and were never fetchable by anyone. One tag is cut, on the last squash commit.

**Work outside an epic is not stacked.** A stack is all-or-nothing at the door - one unreviewed pull request in the middle stops the whole merge - so independent issues stacked together would block each other for no reason. The train earns its cost only where the work is already a group, which is what an epic is.

**A package is tagged only after its own whole-package sweep has run.** What a tag asserts is that the package was read whole rather than diff by diff, and no branch's review can supply that: a review reads a diff, so a file no branch has touched since it was written is never read whole by anyone. For a skill package the sweep is `/skills-maker review` over that skill's directory. For a plugin it is the same command over each skill under its own `skills/`, plus a read of the files that belong to no skill - the manifest, the agents, the hooks and the README - which nothing else covers. An open sweep issue asserts nothing; `.agents/gh-solo.md` is where that requirement is enforced.

**A hotfix runs the sweep too.** What it does differently is triage: a finding that touches none of the files the hotfix changed is deferred to the next release rather than fixed on that branch, so the fix stays small without the tag ever standing on a package nobody swept.

**This repository creates no GitHub Releases.** Tags here are per-package, and Releases is a repository-level surface: one list, and one "Latest" badge for the whole repository. Promoting per-package tags into it would interleave unrelated packages in date order and badge whichever was tagged last, so someone looking for the current version of one package could be shown another package's tag as the latest thing here.

**An agent working here may be running an installed copy of a package older than the tree it is editing.** That follows from releasing only at a swept tag rather than being a fault: the trunk is ahead of every install for the whole gap between releases. So when a package's own command fails on something the tree appears to have already fixed, compare the installed copy against the tree before debugging it - the two can differ by many commits, and neither of them is broken.

## Skill files follow the skills-maker rules

**Every skill here is held to the `skills-maker` skill at `skills/skills-maker/`**, under `skills/` and under a plugin's own `skills/` tree alike. It is a package of this repository, so it is readable from any branch and can be cited by path rather than copied here, where a copy would drift from the file it came from.

**A round reviewing a diff under either tree reads `skills/skills-maker/workflows/review.md` first, as a repository standard.** That file is the entry point rather than one rule set among several: it is written for a reviewer, its Step 2 routes to `skills/skills-maker/workflows/check.md` and its Step 3 holds the skill against every rule in `skills/skills-maker/workflows/new.md`. Naming it is not enough: the reviewer's own fetch list ends at this file, so this sentence is what puts that one in scope. A diff breaking a rule any of those files states is an ordinary `standards` finding, cited by path and line.

**The whole-file judgement is not a diff's to make.** Whether the layout still fits the skill's size, whether a premise has quietly stopped being true, whether a section has become an essay: that is the sweep's, per *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md`.

## The GitHub loop

Issues, branches, plans, pull requests, review and merge all run through the `gh-solo` plugin this repository ships, which means the repository dogfoods its own product.

**`.agents/gh-solo.md` records what this repository does differently**, and is the file to read before touching any of it. Everything it does not mention is the plugin's own default. Read it rather than inferring conventions from the tree, and where it and this file disagree about the loop, it wins.
