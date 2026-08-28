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
| `.agents/gh-solo.md` | the per-repository facts the `gh-solo` plugin reads |
| `AGENTS.md`, `CLAUDE.md` | this file; the second is a symlink to the first |

## Each plugin, and each skill under `skills/`, is a package

A package is released on its own tag, `<name>_<version>`, and carries its own version inside it - a plugin in `plugins/gh-solo/.claude-plugin/plugin.json` and its marketplace entry, a skill in its frontmatter under `metadata.version`.

**A change to one package is not a change to another, and no package's version moves for another's change.** That is the rule the tag scheme exists to make true, and it is what makes `skills/` and `plugins/` peers rather than a hierarchy: a skill under `plugins/gh-solo/skills/` ships when the plugin does, a skill under `skills/` ships when it alone is tagged.

The package axis is also the repository's label axis, which `.agents/gh-solo.md` records.

## Skill files follow the skills-maker rules

**Every skill here is held to the authoring rules in `skills/skills-maker/workflows/new.md`**, under `skills/` and under a plugin's own `skills/` tree alike. That file is a package of this repository, so it is readable from any branch and can be cited by path rather than copied here, where a copy would drift from the file it came from.

**A round reviewing a diff under either tree reads that file first, as a repository standard.** Naming it is not enough: the reviewer's own fetch list ends at this file, so this sentence is what puts that one in scope. A diff breaking one of its rules is an ordinary `standards` finding, cited to it by path and line.

**The whole-file judgement is not a diff's to make.** Whether the layout still fits the skill's size, whether a premise has quietly stopped being true, whether a section has become an essay: that is the sweep's, per *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md`.

## The GitHub loop

Issues, branches, plans, pull requests, review and merge all run through the `gh-solo` plugin this repository ships, which means the repository dogfoods its own product.

**`.agents/gh-solo.md` records what this repository does differently**, and is the file to read before touching any of it. Everything it does not mention is the plugin's own default. Read it rather than inferring conventions from the tree, and where it and this file disagree about the loop, it wins.
