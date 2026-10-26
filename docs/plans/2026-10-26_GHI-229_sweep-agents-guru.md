> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Sweep agents-guru before its next tag

Issue [#229](https://github.com/izkreny/agentifico/issues/229), the last child of epic #226. It is blocked by #303, and this branch is cut from #303's tip, `feat/GHI-303_argument-hint-and-bash-rules`, which is also this pull request's base. That is the stacked exception in *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`, so the open blocker does not stop it.

## The sweep

A reviewer subagent ran `skills/agents-guru/workflows/review.md` over `skills/agents-guru` at ffaf15e, inline and whole, and is kept resumable for its Step 5. No `agents-guru` skill is installed, and the installed `skills-guru` predates the rename, so the tree's workflow was followed by path. The check, the suite and the lint all exit 0. The findings are recorded on the issue as SW1 to SW15, and each is fixed here:

- **SW1.** The description in `<skill-dir>/SKILL.md` names agent files, a plugin's hooks file and its manifest beside skills, and the scope line in `<skill-dir>/README.md` matches.
- **SW2.** `<skill-dir>/scripts/rules/skill-bash-blocks.js` recognises `<<\EOF`, and ends a heredoc only on an exact terminator line, stripping leading tabs for `<<-` alone. Fixtures cover the backslash form, an indented terminator under `<<EOF`, and a tab-indented one under `<<-`.
- **SW3.** Steps 4 and 5 of `<skill-dir>/workflows/export.md` point at what *The argument-hint rule* and *The Bash rule* in `<skill-dir>/workflows/check.md` leave to a reader.
- **SW4.** Those rule sections, and the plugin-file one, keep what each rule is for and what it leaves to a reader, and drop the lists the code owns.
- **SW5.** `<skill-dir>/references/maintaining.md` says a markdownlint rule registers in `<skill-dir>/scripts/lint-config.js`, and a reader of a file markdownlint does not read goes in `<skill-dir>/scripts/check.js`.
- **SW6 and SW15.** *How a phrase list grows* in `<skill-dir>/references/maintaining.md` reads JavaScript and Python comments beside markdown, and reads a stacked epic's other pull requests beside the merged range.
- **SW7.** The setup section of `<skill-dir>/workflows/check.md` moves to `<skill-dir>/references/setup.md` (new), and the refusal messages in `<skill-dir>/scripts/check.js` and the setup line in `<skill-dir>/README.md` point there.
- **SW8.** `<skill-dir>/workflows/new.md` and `<skill-dir>/assets/Agentifico/SkillLength.yml` state the word figure the token cap actually gives.
- **SW9 to SW13.** `<skill-dir>/workflows/check.md` points at `engines` for Node, and says which readers its one command runs. `<skill-dir>/SKILL.md` drops "below" and "one file each". `<skill-dir>/README.md` names the workflows that run a tier lower.
- **SW14.** Each trip case named for one alert per line fires once per line, with shared lines split.

`metadata.version` moves from `7.1.0` to `7.2.0`, since SW1 widens when the skill fires and SW2 passes Bash that fails today.

## Steps

- Fix SW1 to SW15, citing each id in its commit.
- Watch each new test fail before trusting it: SW2's fixtures on the rule as it stands, SW14's split lines with their token removed.
- Move `metadata.version` to `7.2.0`.
- Resume the sweep reviewer on the fix commits for a verdict per finding, per `<skill-dir>/workflows/review.md` Step 5.
- Record the verdicts on the issue.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans --ignore 'skills/skills-guru/*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/agents-guru test`
- `npm --prefix skills/agents-guru run lint`
- `node skills/agents-guru/scripts/check.js skills/agents-guru`
- `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- `node skills/agents-guru/scripts/check.js skills/review-text`
- `node skills/agents-guru/scripts/check.js skills/socratic-tutor`

Most fixes are prose, which no gate reads for meaning. The resumed reviewer's verdicts judge those.

## After the review round

The Vale re-mine is this pull request's last task, run after the round's fixes are pushed and before the merge, so it can read the round's own threads. It reads #253, #274 and #276, every other pull request in the stack, this issue's findings, this pull request's threads and this branch's fix commits. #236's two re-mine records already cover everything merged before them. New tokens land on this branch, and the issue records what was read.

## Open questions

**May this branch cut the re-mine range rule `.agents/gh-solo.md` restates, leaving a pointer at *How a phrase list grows*?** I recommend a separate `repo` issue instead, since the package branch would otherwise carry a repository-level edit.

## Settled

None yet.
