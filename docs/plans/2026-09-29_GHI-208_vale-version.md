> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Name the Vale version the skills-guru checks need

Issue [#208](https://github.com/izkreny/agentifico/issues/208). It is not part of an epic, so the branch is cut from `main` and not stacked.

## What changes

The owner folded the Vale 3.23 upgrade into this issue, so the package now requires Vale 3.23 or later rather than 3.21, and uses a feature that needs it.

**Named scopes.** `comment & ~module` is written twice, in `skills/skills-guru/assets/Agentifico/CommentSentences.yml` and `skills/skills-guru/assets/Agentifico/CommentLength.yml`. It moves into `skills/skills-guru/assets/config/scopes/CommentProse.yml` (new) as `CommentProse: comment & ~module`, with the #182 reason, and both rules say `scope: CommentProse`.

**A version gate in `skills/skills-guru/scripts/check.js`.** Vale 3.21 loads a rule naming an unknown scope and matches nothing, exit 0, so a user on an older Vale would get a clean pass with both comment rules off. The check reads `vale --version` first and refuses below 3.23 with the same "prose rules not run" shape as a missing binary. A version it cannot parse falls through to the run, so the existing refused-configuration branch still reaches its stub.

**A fixture for the one behaviour change found.** Vale 3.23 no longer reads a comment addressed to a tool, even through the package's own Python View: `# noqa: E501. Alpha one. Beta two.` fires `CommentSentences` on 3.21 and nothing on 3.23. `skills/skills-guru/scripts/test/vale.test.js` gains a case pinning that.

**The version, everywhere it is named**: the `compatibility` field in `skills/skills-guru/SKILL.md`, `skills/skills-guru/workflows/check.md`, the message in `skills/skills-guru/scripts/check.js`, and `.agents/gh-solo.md`. `skills/skills-guru/assets/config/views/Python.yml` says its queries are Vale's at v3.23.0; the compare from v3.21.0 shows Vale's Python language file gained only the directive and doc hooks, no query change.

**The package moves 4.1.1 to 5.0.0.** An install that passed on Vale 3.21 or 3.22 is now refused, which is the breaking case in `AGENTS.md`.

## Out of this diff

Rule-level `tests:` and `vale test --coverage` could replace part of the hand-written coverage loop in `skills/skills-guru/scripts/test/vale.test.js`. That is a rewrite of the bench, so it belongs to its own skills-guru issue.

## Steps

- Add the `CommentProse` named scope and point both comment rules at it.
- Add the version gate to `skills/skills-guru/scripts/check.js`, with a bench case in `skills/skills-guru/scripts/test/check.test.js` using a stub `vale` that reports 3.21.0.
- Add the directive fixture to `skills/skills-guru/scripts/test/vale.test.js`.
- Name 3.23 in `skills/skills-guru/SKILL.md`, `skills/skills-guru/workflows/check.md`, `skills/skills-guru/scripts/check.js`, `skills/skills-guru/assets/config/views/Python.yml` and `.agents/gh-solo.md`, and bump `metadata.version` to 5.0.0.

## Verification

Every command that runs Vale runs under `mise exec --`, because this session's `PATH` still resolves Vale 3.21.0.

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `mise exec -- npm --prefix skills/skills-guru test`
- `mise exec -- node skills/skills-guru/scripts/check.js skills/skills-guru`
- `npm --prefix skills/skills-guru run lint`
- `mise exec vale@3.21.0 -- node skills/skills-guru/scripts/check.js skills/skills-guru` exits 1 and says the prose rules did not run.
- `node skills/skills-guru/scripts/check.js <package-dir>` exits zero under `mise exec --` for `plugins/gh-solo`, `skills/review-text`, `skills/skills-guru` and `skills/socratic-tutor`, the packages #210 lists.
- `git grep -n 'Vale 3\.2[012]' -- ':!docs/plans' ':!skills/skills-guru/scripts/test'` prints nothing and exits 1.

The gates cannot tell whether a skill someone else wrote relies on a Vale 3.21 behaviour that 3.23 changed. That is the sweep's.

## Open questions

None.

## Settled

- **Do the test fixtures count as naming Vale 3.20?** No. `skills/skills-guru/scripts/test/rules.test.js` and `skills/skills-guru/scripts/test/vale.test.js` hold "Vale 3.20" as input text for the rules, not as a requirement. So the grep gate excludes that directory, and the issue's criterion is read as "no file states an older Vale as a requirement".
- **Does the Vale 3.23 upgrade belong in this issue?** Yes, the owner folded it in. It moves skills-guru to 5.0.0, so the issue's criteria and label change with it, and rule-level `tests:` stays out.
- **Where is the Vale version stated?** Once, in `MIN_VALE` in `skills/skills-guru/scripts/check.js`, which enforces it, the owner settled. `skills/skills-guru/SKILL.md`, `skills/skills-guru/workflows/check.md` and `.agents/gh-solo.md` point at it, so a bump edits one line.
