> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Replace the WIP readme

Issue [#13](https://github.com/izkreny/agentifico/issues/13). It is not part of an epic, so the branch is cut from `main` and not stacked.

## What changes

One file, `README.md`, rewritten whole. It is titled `# agentifico`, after the marketplace, and opens with the AI disclaimer.

It is written for a person deciding whether to install something. It says what the repository publishes and names the two routes: the plugin marketplace, and skills that install on their own.

An install section gives two command blocks. The plugin block is the two `claude plugin` lines from `plugins/gh-solo/README.md`. The skill block is `skills add izkreny/agentifico -g -y -s <name>`, the bare form `skills/skills-maker/README.md` uses, with a link to the skills CLI.

A package list gives each package under `plugins/` and `skills/` one line and a link to its own `README.md`. Requirements and depth stay in those READMEs.

A closing section points a contributor at `AGENTS.md` and `.agents/gh-solo.md` rather than copying anything they own. `LICENSE` is named in one line.

Two premises of the issue have moved since it was written:

- Every skill now carries `metadata.version` and every package has a tag. So the README names no version at all: a version there would be a copy of the manifest, and `AGENTS.md` says the manifest is the release. It points at the `<name>_<version>` tags instead.
- `daisyui-designer` was retired in #201, so it is not listed.

## Out of this diff

`skills/review-text/README.md` and `skills/socratic-tutor/README.md` still install with `npx skills add`, and `skills/rails-style/README.md` has no install section. Each is a package file, and editing it moves that package's version, so this `repo` branch leaves them alone.

`README.md` is repository-level, so no package's version moves.

## Steps

- Rewrite `README.md`: disclaimer, title, what the repository publishes, the two install routes with pasteable commands, the package list with links, and the pointer to `AGENTS.md` and `.agents/gh-solo.md`.
- Break one backticked path in the draft once and watch the docs check exit non-zero, then restore it.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md README.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`

The gates cannot tell whether the README reads well to a stranger or whether the install commands work on a machine that has never seen this repository. That is the review round's and the owner's.

## Open questions

None.

## Settled

None yet.
