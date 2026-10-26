> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Rename skills-guru to agents-guru

Issue [#256](https://github.com/izkreny/agentifico/issues/256), a child of epic #226. The skill already judges more than skills, so it takes a name that covers every file an agent reads. #189 made the last rename, and its plan, `docs/plans/2026-09-28_GHI-189_rename-skills-maker.md`, is the model.

## Where this branch sits

**It is cut from the tip of `feat/GHI-281_point-at-plugin-validate`, and its pull request targets that branch.** #256 is blocked by #281, and the issue's own `## Dependencies` says that is stack order rather than a need. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names. The trunk sitting ahead of this branch is normal for a stack and is not recovered here.

## What lands

`skills/skills-guru/` (delete) moves to `skills/agents-guru/` (new) with `git mv`, so history follows the files. Every file in the package that names the skill then names `agents-guru`.

`metadata.version` moves a major, from 6.6.0 to 7.0.0. Anyone who installed the skill loses the `/skills-guru` command, so the change breaks them. The commit and the PR title carry `!` for that, as #202 did.

## Every file that names the skill

Found with a grep over the package, `node_modules` excluded. `<skill-dir>` is the package's directory:

- `<skill-dir>/SKILL.md`: the frontmatter `name`, and the `/skills-guru manage` command in the description and the router.
- `<skill-dir>/README.md`: the heading, the command in the opening paragraph, the Mermaid node, the prose on the model tiers and the `skills add` install command.
- `<skill-dir>/package.json` and `<skill-dir>/package-lock.json`: the package name `skills-guru-checks`, which becomes `agents-guru-checks` in both, and the description. A mismatch between the two makes `npm ci` refuse.
- The markdownlint rules under `<skill-dir>/scripts/rules/`: each rule's `tags` entry. A grep of `<skill-dir>/scripts/check.js` and `<skill-dir>/scripts/lint-config.js` finds no `skills-guru`, so nothing filters on the tag and the edit is a rename and nothing else.
- The two suites under `<skill-dir>/scripts/test/`: the prefix of their temporary directories.
- The Vale rules under `<skill-dir>/assets/Agentifico/`: each rule's `link:` URL, which points at `<skill-dir>/workflows/new.md` on GitHub.

Plans under `docs/plans/` keep the old name, since a plan records intent.

## The repository-level files

**The paths and the commands `AGENTS.md` and `.agents/gh-solo.md` name move here**, as #189 moved them per its RF1. In `AGENTS.md` that is every mention. In `.agents/gh-solo.md` it is the check commands, the package list, the package's own checks, the sweep invocation, the paths under the package and the path cell of the label table. The `skills-guru` package name in its prose moves too, since the package is what is renamed.

**#257 keeps what belongs to the label and to other files.** That is the label cell of the table, the `-label:skills-guru` term of the audit query, the label rename itself, `README.md`, and the link in `skills/review-text/README.md`. Its criteria for `AGENTS.md` and `.agents/gh-solo.md` shrink to match, and so does its criterion on the docs check, per *The docs check on this branch*.

## The docs check on this branch

**The repository's docs-check command reads every plan in the stack.** On this branch that is 13 lower plans, from #238 up to #281. They name `skills/skills-guru/` (delete) 131 times, and they keep the old name by design. A trial move at plan time turned the command from exit 0 to 146 problems, 15 of them in `AGENTS.md` and `.agents/gh-solo.md` and the rest in those plans.

**So this branch runs the command with one ignore, `--ignore 'skills/skills-guru/*'`.** Fixing the two repository-level files here means the ignore silences no span in them. It skips the lower plans' spans and nothing else, which is why it does not make an output quieter in the sense `.agents/gh-solo.md` forbids. Every branch above this one in the stack owes the same ignore, since those plans stay in its range until the stack merges.

**The ignore is proved rather than assumed.** The command runs green before the move. After the move and the repository-level edits, it runs red without the ignore, listing spans in `docs/plans/` only. Only then does the ignore go in. Any other span in that red run is a real finding and gets fixed, not ignored.

## Steps

- Run the repository's docs-check command before the move, and read it exit 0.
- Move the directory with `git mv`.
- Rename every reference listed under *Every file that names the skill*.
- Move `metadata.version` to 7.0.0.
- Point `AGENTS.md` and `.agents/gh-solo.md` at the new name, per *The repository-level files*.
- Run the docs-check command without the ignore, and read it fail on spans in `docs/plans/` only.
- Run `npm --prefix skills/agents-guru ci`, which also proves `<skill-dir>/package.json` and `<skill-dir>/package-lock.json` agree.
- Render the README's Mermaid diagram with `mmdc`, using a puppeteer config in the scratchpad that names `/usr/bin/chromium`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans --ignore 'skills/skills-guru/*'`
- `npm --prefix skills/agents-guru ci`
- `npm --prefix skills/agents-guru test`
- `npm --prefix skills/agents-guru run lint`
- `node skills/agents-guru/scripts/check.js skills/agents-guru`
- `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- `node skills/agents-guru/scripts/check.js skills/review-text`
- `node skills/agents-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`
- `mmdc` renders the README's diagram and exits 0

The version check sees `skills/skills-guru/` (delete) as a retired package, since the whole directory is gone, and skips it. It sees `skills/agents-guru/` (new) as a new package and compares its version against nothing, so it passes on any version, and 7.0.0 is checked by reading the frontmatter. The Vale rules' `link:` URLs point at `main`, so they return 404 until the stack merges. No gate here opens them.

## Open questions

None.

## Settled

- **Is the new name `agents-guru` or `agent-guru`?** `agents-guru`, as the issue says. The plural reads only as a guru of agents, matches `AGENTS.md` and `.agents/`, and keeps the plural `skills-guru` had.
- **Does this branch edit `AGENTS.md` and `.agents/gh-solo.md`?** Yes, the paths and commands, as #189's RF1 settled for the last rename. #257 keeps the label, `README.md` and review-text's link.
- **May the docs check run with `--ignore`?** Yes, `--ignore 'skills/skills-guru/*'` and nothing wider. The lower plans in the stack keep the old paths, so the command cannot pass without it on this branch or any above it.
