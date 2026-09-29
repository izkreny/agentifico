> 🤖 Written by AI --- read/modified by izkreny! 🤓

# agentifico

AI agent skills, instructions and gotchas. Everything here is published two ways: as plugins in a Claude Code plugin marketplace, and as skills that install on their own into any agent that reads the [Agent Skills](https://agentskills.io) format.

## What is here

| Package                                           | Route       | What it is for                                                                                                    |
| ------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| [gh-solo](plugins/gh-solo/README.md)              | marketplace | The solo maintainer's GitHub loop: issues, plan-first pull requests, fresh-context review rounds and gated merges |
| [rails-style](skills/rails-style/README.md)       | skill       | A house Rails style from 37signals practice, applied to Rails coding, refactoring and code review                 |
| [review-text](skills/review-text/README.md)       | skill       | A proofreader for prose that reports errors apart from style suggestions and edits only when asked                |
| [skills-maker](skills/skills-maker/README.md)     | skill       | Writing, reviewing, maintaining and exporting agent skills, with checks for the traps a YAML parser cannot see    |
| [socratic-tutor](skills/socratic-tutor/README.md) | skill       | A tutor that asks one question at a time until you reach the answer yourself                                      |

Each package's own README has its requirements and the full picture.

## Install

The plugin goes through the marketplace:

```bash
claude plugin marketplace add izkreny/agentifico
claude plugin install gh-solo@agentifico
```

A skill goes through the [skills CLI](https://skills.sh), with the skill's name after `-s`:

```bash
skills add izkreny/agentifico -g -y -s review-text
```

## Versions

Each package is released on its own tag, `<name>_<version>`, and the [tags](https://github.com/izkreny/agentifico/tags) list them all. `AGENTS.md` says what a tag guarantees.

## Working on this repository

`AGENTS.md` holds the layout and how a package is versioned and released. `.agents/gh-solo.md` holds the check commands and the issue and pull request conventions.

## License

MIT, per `LICENSE`.
