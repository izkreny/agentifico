> 🤖 Written by AI --- read/modified by izkreny! 🤓

# State the supported platforms

Issue [#291](https://github.com/izkreny/agentifico/issues/291), a child of epic #226. The agents-guru check is written and tested on Linux only. This branch says so where a user reads it before installing.

## Where this branch sits

**It is cut from the tip of `docs/GHI-257_point-repo-files-at-agents-guru`, and its pull request targets that branch.** #291 is blocked by #257, and the issue's own `## Dependencies` says that is stack order. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names. It sits below the sweep, #229, which has no branch yet. The trunk sitting ahead of this branch is normal for a stack, so nothing is fast-forwarded.

## What changes

- `skills/agents-guru/SKILL.md`: the `compatibility` field opens with the platforms. Linux is supported, Windows only under WSL, and macOS is untested. The field stays one line inside its block scalar.
- `skills/agents-guru/README.md`: `## Install` opens with the same platforms, before the install command.
- `metadata.version` moves from 7.0.0 to 7.0.1.

`skills/agents-guru/workflows/check.md` states the check's dependencies and is left alone. The issue names the two files a user reads before installing, and that file is read after.

## Steps

- Add the platforms to the `compatibility` field in `skills/agents-guru/SKILL.md`, and move `metadata.version` to 7.0.1.
- Add the platforms to `## Install` in `skills/agents-guru/README.md`, before the install command.
- Run the agents-guru check on every listed package, the package's suite and its lint.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans --ignore 'skills/skills-guru/*'`
- `npm --prefix skills/agents-guru test`
- `npm --prefix skills/agents-guru run lint`
- `node skills/agents-guru/scripts/check.js skills/agents-guru`
- `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- `node skills/agents-guru/scripts/check.js skills/review-text`
- `node skills/agents-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

The check on `skills/agents-guru` is what holds the field under its 500-character ceiling, through `skill-frontmatter-parsed`. The version check sees `skills/agents-guru/` as a new package against `main`, so it passes on any version, and 7.0.1 is checked by reading the frontmatter. The docs check does not target `skills/`, so the README's wording is checked by reading it.

## Open questions

None.

## Settled

- **May the docs check run with `--ignore`?** Yes, `--ignore 'skills/skills-guru/*'` and nothing wider, as #256's plan settled for every branch above it.
