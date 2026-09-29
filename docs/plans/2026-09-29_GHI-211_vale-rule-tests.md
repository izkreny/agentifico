> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Move the rule fixtures into Vale tests

Issue [#211](https://github.com/izkreny/agentifico/issues/211). It is not part of an epic, so the branch is cut from `main` and not stacked.

## What changes

**Each rule carries its own cases.** Every file under `skills/skills-guru/assets/Agentifico/` gains a `tests:` list with at least one case that fires and one that stays quiet. The cases are the fixtures `skills/skills-guru/scripts/test/vale.test.js` holds today, moved rather than rewritten. A case in a rule file is isolated: Vale loads that rule alone, with every severity, and not `skills/skills-guru/.vale.ini`. A trial run on a copy of the style showed the named scope `CommentProse` and `view: Python` both resolve in that mode.

**The trip lists become `want` cases.** `Counts`, `Position` and `History` each get one case whose input is the old `TRIP` list, one recorded shape per line, and whose `want` is the exact output. Under `want`, removing a token drops its line from the output and fails the case, which is the once-per-line promise `skills/skills-guru/workflows/check.md` makes. Messages that carry a figure are pinned with `contains`: `121.00 words`, `46.00 words`, `2 sentence ends`.

**Cases that need the project configuration go in `skills/skills-guru/scripts/test/vale.test.yml` (new).** An isolated case does not load `skills/skills-guru/.vale.ini`, so `TokenIgnores` does not apply. The guard lines that hold double-quoted text move there, and so does the case showing an opening "currently" raises one `History` alert and no `Banner` alert. Every rule's firing case stays in its own rule file, because `--coverage` counts alerts from this file too and a rule firing only here would pass it.

**What stays in `skills/skills-guru/scripts/test/vale.test.js`.** First, the per-token loop: it reads each phrase rule's trip case out of the rule file by its name, instead of from a `TRIP` copy, and runs each token alone over that input. Its generated configuration drops `TokenIgnores`, so it runs under the same conditions as the isolated case. Second, the test of the configuration's file globs: a file named SKILL.md is measured and one named reference.md is not. A case input has no file path, so this cannot become a case. Third, one test that runs `vale --no-global --config <.vale.ini> test --coverage` over the style and the project file and asserts exit zero. That is how `npm test` runs it. The `fired` set and the every-rule-fired test go.

**The docs that describe the suite.** `skills/skills-guru/workflows/check.md` names the `TRIP` list, the guards fixture, the temporary directory and the coverage check. `skills/skills-guru/workflows/new.md` names `describe("coverage")`. Both point at the rule's `tests:` and `vale test --coverage` instead.

**The package moves 5.0.0 to 5.0.1.** What an installer runs is unchanged: `skills/skills-guru/scripts/check.js` loads a rule that carries `tests:` the same way.

## Steps

- Add `tests:` to `Counts`, `Position` and `History`: the trip case with `want`, and a quiet case from the unquoted guard lines.
- Add `tests:` to `Banner`, `ParagraphLength`, `SkillSplit` and `SkillLength`.
- Add `tests:` to `CommentSentences` and `CommentLength`, with `format: js`, `format: py` and `view: Python` where the old fixture used them.
- Write `skills/skills-guru/scripts/test/vale.test.yml` (new) for the quoted guard lines and the Banner-and-History case.
- Cut `skills/skills-guru/scripts/test/vale.test.js` down to the per-token loop, the glob test and the `vale test --coverage` run.
- Update `skills/skills-guru/workflows/check.md` and `skills/skills-guru/workflows/new.md`, and bump `metadata.version` in `skills/skills-guru/SKILL.md` to 5.0.1.

## Verification

Every command that runs Vale runs under `mise exec --`, because this session's `PATH` still resolves Vale 3.21.0.

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `mise exec -- npm --prefix skills/skills-guru test`
- `npm --prefix skills/skills-guru run lint`
- `node skills/skills-guru/scripts/check.js <package-dir>` exits zero under `mise exec --` for `plugins/gh-solo`, `skills/review-text`, `skills/skills-guru` and `skills/socratic-tutor`.
- With one rule's `tests:` removed, `mise exec -- vale --no-global --config skills/skills-guru/.vale.ini test --coverage skills/skills-guru/assets/Agentifico` exits non-zero, and `mise exec -- npm --prefix skills/skills-guru test` does too.
- With a token added to `Counts` that no trip line matches, `mise exec -- npm --prefix skills/skills-guru test` exits non-zero and names the token.
- With one token removed from `Position`, `mise exec -- npm --prefix skills/skills-guru test` exits non-zero on the trip case.

The gates cannot tell whether a moved case still means what the old fixture meant. That is the review's.

## Open questions

- **Severity is no longer asserted.** `vale test` prints `line:col:check:message`, with no severity, so the old checks that `Counts` is an error and `ParagraphLength` a warning have no home. The plan drops them: the `level:` line in the rule is the pin, and the check only proved Vale reads it.
- **The file-cap cases are long.** `SkillSplit` and `SkillLength` each pin their boundary with a case at the cap and one word over, so the rule files carry about 22 KB of `a a a …` input. The other choice is a firing case alone in the rule and the boundary left in `skills/skills-guru/scripts/test/vale.test.js`, which generates its input.

## Settled

- **Does this branch wait for `plugins/gh-solo` to pass the skills-guru check?** No, the owner settled. Its three errors predate this branch and #212 owns them, so the check gates this branch on `skills/review-text`, `skills/skills-guru` and `skills/socratic-tutor`.
