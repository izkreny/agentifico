> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Sweep skills-guru before its next tag

Issue [#192](https://github.com/izkreny/agentifico/issues/192), the last child of epic [#188](https://github.com/izkreny/agentifico/issues/188). #192 is blocked by #191, and that block is the stack's order. This branch is cut from the tip of `feat/GHI-191_agent-invocation`, and its pull request has that branch as its base.

## The sweep

A reviewer subagent ran `skills/skills-guru/workflows/review.md` over `skills/skills-guru` on 2026-09-29 and is kept resumable for its Step 5. It read every file in the package. The check, the suite and the lint all exit 0. Its findings are recorded on the issue as SG1 to SG12, and each is fixed here:

- **SG1.** The owner ruled on #206 that model invocation never reaches the install and update route. The description already says so. The router drops "or in their own words", so `manage` is reached only by the owner typing it. `<skill-dir>/README.md` says the same in its opening, its `manage` row and its sentence on install requests.
- **SG2.** `<skill-dir>/workflows/export.md` Step 5 separates what the check verifies from what `<skill-dir>/workflows/check.md` lists as by-hand, and names both by-hand items. Step 4 says the by-hand pass finds leftover shell signatures, not the check.
- **SG3.** `<skill-dir>/scripts/test/vale.test.js` builds its config from the shipped `<skill-dir>/.vale.ini` instead of a hand-written copy, and its fixtures match the shipped globs.
- **SG4.** A test compares the install forms listed in `<skill-dir>/workflows/new.md` with the forms `<skill-dir>/scripts/rules/skill-readme.js` accepts. `<skill-dir>/workflows/check.md` says the rule mirrors that list and is edited with it.
- **SG5.** The 3,500-word cap moves into *Let size decide whether to split* in `<skill-dir>/workflows/new.md`, where `SkillLength` and the `<skill-dir>/workflows/check.md` row already point.
- **SG6.** `<skill-dir>/workflows/check.md` stops citing `<skill-dir>/workflows/new.md` for a tools-blockquote rule it does not state.
- **SG7.** `<skill-dir>/workflows/check.md` sends a section grown past its claim to the essay note in `<skill-dir>/workflows/review.md` Step 3, which does cover it.
- **SG8.** `compatibility`, the `<skill-dir>/SKILL.md` tools line and `<skill-dir>/workflows/export.md` say `gh` is also used to grow a phrase list. The `<skill-dir>/workflows/check.md` tools line names `gh` and `git`. `allowed-tools` does not grow, so those reads still prompt.
- **SG9.** `<skill-dir>/scripts/rules/paths.js` says it was derived from `<repo-root>/plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` and marks its two departures, instead of deferring to it. `<skill-dir>/workflows/check.md` names that script with a `<repo-root>` placeholder.
- **SG10.** The comment in `<skill-dir>/scripts/rules/skill-frontmatter-parsed.js` keeps its reason and drops the false claim about `compatibility`.
- **SG11.** `<skill-dir>/assets/Agentifico/ParagraphLength.yml` drops the retired `daisyui-designer` from its evidence.
- **SG12.** `<skill-dir>/workflows/review.md` Step 2 says the check runs before any judgement, after the read. `<skill-dir>/workflows/check.md` and the README say the same.

`metadata.version` moves from `4.1.0` to `4.1.1`. Every fix corrects a statement to match behaviour already decided, so none adds behaviour.

## Steps

- Fix SG1 to SG12, citing each id in its commit.
- For SG3 and SG4, watch each new test fail before trusting it. SG3 fails with `View = Python` dropped from `<skill-dir>/.vale.ini`. SG4 fails with a form added to `<skill-dir>/workflows/new.md` alone.
- Move `metadata.version` to `4.1.1`.
- Resume the sweep reviewer on the fix commits for a verdict per finding, per `<skill-dir>/workflows/review.md` Step 5.
- Record the verdicts on the issue.

## Verification

- `npm --prefix skills/skills-guru test`
- `node skills/skills-guru/scripts/check.js skills/skills-guru`
- `npm --prefix skills/skills-guru run lint`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`

Most fixes are prose, which no gate reads for meaning. The resumed reviewer's verdicts are what judge those.

## Open questions

- **Who fixes the Vale version in `.agents/gh-solo.md`?** It says 3.20 or later, and the package needs 3.21. That file is repository-level, so this branch leaves it alone. Recommendation: a `repo` issue.

## Settled

None yet.
