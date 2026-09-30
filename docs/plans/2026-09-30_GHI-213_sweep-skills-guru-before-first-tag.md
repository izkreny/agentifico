> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Sweep skills-guru before its first tag

Issue [#213](https://github.com/izkreny/agentifico/issues/213). Its blockers #208 and #215 are closed, so this branch is cut from `main`.

## The sweep

A reviewer subagent ran `skills/skills-guru/workflows/review.md` over `skills/skills-guru` on 2026-09-30 and is kept resumable for its Step 5. It read the package at 5.2.0, since #214 to #222 landed after the issue named 5.0.0. It read every file whole except the generated `<skill-dir>/package-lock.json`, whose pins it checked against `<skill-dir>/package.json`. The check, the suite and the lint all exit 0. Its findings are recorded on the issue as SW1 to SW12, and each is fixed here:

- **SW1.** `allowed-tools` in `<skill-dir>/SKILL.md` drops `Bash(skills:*)` and `Bash(npm:*)`, so the `manage` route and the one-time `npm ci` prompt on every command. The tools blockquote under the frontmatter says the same.
- **SW2.** In `<skill-dir>/assets/Agentifico/`, Position's `the above\b` and History's `still holds` are deleted, since a sibling token already matches all they match, and their source comments merge into that sibling. History's `replaced by`, `reverses an earlier` and each `still (...)` alternative, Position's `as|per|see ... above|below` token and Counts' `two|... below|above` token each gain a trip line only they trip in `<skill-dir>/scripts/test/vale.test.yml`.
- **SW3.** `<skill-dir>/scripts/test/vale.test.js` gains cases under the shipped `<skill-dir>/.vale.ini`: a Python file whose comment trips `CommentSentences` while its module docstring does not, and a README that trips a phrase rule.
- **SW4.** `<skill-dir>/workflows/new.md` says an install form the list lacks goes under an install heading and is reported upstream. The sentence telling an author to edit `<skill-dir>/scripts/rules/skill-readme.js` goes, since `<skill-dir>/references/maintaining.md` states it for maintainers.
- **SW5.** `<skill-dir>/workflows/check.md` says `prose rules not run` also means a Vale older than the check requires.
- **SW6.** `<skill-dir>/scripts/check.js` refuses through `proseNotRun` when it cannot read Vale's version, and a stub test covers a version string without numbers.
- **SW7.** The field notes in `<skill-dir>/workflows/review.md` on a missing boundary, version banners and count or position claims keep only what reading adds, and point at the `<skill-dir>/workflows/new.md` heading that owns each rule. `<skill-dir>/workflows/check.md` does the same where it restates one. One of `<skill-dir>/assets/config/scopes/CommentProse.yml`, `<skill-dir>/assets/config/views/Python.yml` and `<skill-dir>/.vale.ini` owns the PEP 257 reason, and the other two point at it.
- **SW8.** `<skill-dir>/workflows/check.md` gives the reason `<skill-dir>/.vale.ini` gives for ignoring quoted text.
- **SW9.** `<skill-dir>/workflows/check.md` says `skill-portable-paths` reports a span carrying a home prefix, not one opening with it.
- **SW10.** The description, the router, `<skill-dir>/README.md` and `<skill-dir>/references/managing.md` name the `manage` route's operations in one set: install, update and remove, with pinning meaning the CLI's version.
- **SW11.** The `claude plugin eval` target is verified against the CLI's own help, and `<skill-dir>/workflows/review.md` and `<skill-dir>/README.md` name it as that help does.
- **SW12.** `argument-hint` advertises `check [<path>]`.

`metadata.version` moves from `5.2.0` to `5.3.0`. SW1 changes what runs without a prompt and SW6 adds a refusal on an input that passes today; the rest correct statements or tests.

## Steps

- Fix SW1 to SW12, citing each id in its commit.
- Watch each new test fail before trusting it: SW2's trip lines with their token removed, SW3's cases with `View = Python` dropped and with Python dropped from the code section, SW6's stub with the new refusal removed.
- Move `metadata.version` to `5.3.0`.
- Resume the sweep reviewer on the fix commits for a verdict per finding, per `<skill-dir>/workflows/review.md` Step 5.
- Record the verdicts on the issue.

## Verification

- `npm --prefix skills/skills-guru test`
- `node skills/skills-guru/scripts/check.js skills/skills-guru`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `node skills/skills-guru/scripts/check.js skills/review-text`
- `node skills/skills-guru/scripts/check.js skills/socratic-tutor`
- `npm --prefix skills/skills-guru run lint`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`

Most fixes are prose, which no gate reads for meaning. The resumed reviewer's verdicts are what judge those.

## Open questions

None.

## Settled

None yet.
