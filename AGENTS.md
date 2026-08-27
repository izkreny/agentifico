# agentifico

AI agent skills, instructions and gotchas, published two ways: a Claude Code plugin marketplace, and skills that install on their own.

This file is for any agent working in this repository, whatever its harness. It holds what is true of the repository as a whole. It does not hold the GitHub loop, which has its own file - see *The GitHub loop* below.

## Layout

| Path | What it holds |
|---|---|
| `.claude-plugin/marketplace.json` | the marketplace manifest, one entry per plugin |
| `plugins/<name>/` | one plugin, with its own manifest, skills, agents and hooks - `plugins/gh-solo/` is the worked example |
| `skills/<name>/` | a skill that ships on its own, outside any plugin |
| `docs/plans/` | one implementation plan per branch |
| `.agents/gh-solo.md` | the per-repository facts the `gh-solo` plugin reads |
| `AGENTS.md`, `CLAUDE.md` | this file; the second is a symlink to the first |

## Every directory under `plugins/` and `skills/` is a package

A package is released on its own tag, `<name>_<version>`, and carries its own version inside it - a plugin in `plugins/gh-solo/.claude-plugin/plugin.json` and its marketplace entry, a skill in its frontmatter under `metadata.version`.

**A change to one package is not a change to another, and no package's version moves for another's change.** That is the rule the tag scheme exists to make true, and it is what makes `skills/` and `plugins/` peers rather than a hierarchy: a skill under `plugins/gh-solo/skills/` ships when the plugin does, a skill under `skills/` ships when it alone is tagged.

The package axis is also the repository's label axis, which `.agents/gh-solo.md` records.

## The GitHub loop

Issues, branches, plans, pull requests, review and merge all run through the `gh-solo` plugin this repository ships, which means the repository dogfoods its own product.

**`.agents/gh-solo.md` owns that loop's specifics** and is the file to read before touching any of it: the check commands, the label axis and its values, the branch and pull request conventions, and which reviews are the owner's to start by hand. Read it rather than inferring the conventions from the tree, and where it and this file disagree about the loop, it wins.
