> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Rename skills-maker to skills-guru

Issue [#189](https://github.com/izkreny/agentifico/issues/189), the first child of epic [#188](https://github.com/izkreny/agentifico/issues/188). It is the bottom of the epic's stack, so the branch is cut from `main`. The stack starts when #190 is cut from this branch's tip.

## What lands

`skills/skills-maker/` (delete) moves to `skills/skills-guru/` (new) with `git mv`, so history follows the files. Every file in the package that names the skill then names `skills-guru`. `metadata.version` moves from `3.13.0` to `4.0.0`: anyone who installed the skill loses the `/skills-maker` command, so the change breaks them. The commit and the PR title carry `!` for that, as #135 and #116 did before.

Nothing else changes. The README and the description still say the skill runs only when the owner types its command. That stays true until #191.

## Every file that names the skill

Found with a grep over the package, `node_modules` excluded:

- `<skill-dir>/SKILL.md`: the frontmatter `name`, and the `/skills-maker` command in the description.
- `<skill-dir>/README.md`: the heading, the command on line 5, the Mermaid node, the prose on line 51 and the `skills add` install command.
- `<skill-dir>/package.json` and `<skill-dir>/package-lock.json`: the package `name`, `skills-maker-checks`, which becomes `skills-guru-checks`, and the description.
- The markdownlint rules under `<skill-dir>/scripts/rules/`: each rule's `tags` entry. Nothing filters on the tag, so the edit is a rename and nothing else.
- The two suites under `<skill-dir>/scripts/test/`: the prefix of their temporary directories.
- The Vale rules under `<skill-dir>/assets/Agentifico/`: each rule's `link:` URL, which points at `<skill-dir>/workflows/new.md` on GitHub.

Plans under `docs/plans/` keep the old name, since a plan records intent. `AGENTS.md` and `.agents/gh-solo.md` belong to #190.

## The docs check on this branch

The repository's docs-check command reads `AGENTS.md` and `.agents/gh-solo.md`. Both backtick paths under `skills/skills-maker/` (delete), and the move leaves those paths dangling until #190 fixes them. So this branch runs the command with one extra ignore, `--ignore 'skills/skills-maker/*'`. It skips those spans and nothing else. The targets stay as they are, so every other cross-link between the two files is still checked. #190's criteria require the command without the extra ignore, and #190 lands in the same stack merge.

The ignore is proved rather than assumed. The command runs green before the move, then red after it, listing only spans under `skills/skills-maker/` (delete). Only then does the ignore go in. Any other span in that red run is a real finding and gets fixed, not ignored.

## Steps

- Run the repository's docs-check command before the move, and read it exit 0.
- Move the directory with `git mv`.
- Rename every reference listed under *Every file that names the skill*.
- Move `metadata.version` to `4.0.0`.
- Run the docs-check command again, and read it fail on spans under `skills/skills-maker/` (delete) only.
- Run `npm --prefix skills/skills-guru ci`, which also proves `<skill-dir>/package.json` and `<skill-dir>/package-lock.json` agree.
- Render the README's Mermaid diagram with `mmdc`, using a puppeteer config in the scratchpad that names `/usr/bin/chromium`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans --ignore 'skills/skills-maker/*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-guru test`
- `node skills/skills-guru/scripts/check.js skills/skills-guru`
- `npm --prefix skills/skills-guru run lint`
- `mmdc` renders the README's diagram and exits 0

The version check sees `skills/skills-guru/` (new) as a new package and compares its version against nothing. It passes on any version, so `4.0.0` is checked by reading the frontmatter. The Vale rules' `link:` URLs point at `main`, so they return 404 until the stack merges. No gate here opens them.

## Open questions

None.
