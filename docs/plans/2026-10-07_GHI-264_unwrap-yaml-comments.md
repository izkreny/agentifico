> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Unwrap the comments in skills-guru's YAML files

Issue [#264](https://github.com/izkreny/agentifico/issues/264), a child of epic #226. It is blocked by #227, which is its stack parent rather than a wait, per *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`. The branch is cut from the tip of `feat/GHI-227_hold-vale-word-classes-to-one-list`, and the pull request's base is that branch. The trunk sitting ahead of the stack is normal, so nothing is fast-forwarded here.

## The unwrap

**A comment line joins the line above when that line does not end a sentence.** A sentence ends in `.`, `!` or `?`, with any closing quote, bracket or backtick after it. A colon does not end one: `skills/skills-guru/assets/Agentifico/Position.yml`, `skills/skills-guru/assets/Agentifico/SkillLength.yml` and `skills/skills-guru/assets/Agentifico/SkillSplit.yml` each break after `workflows/new.md:` mid-sentence.

**A break after a sentence stays, except at four lines that blame shows are one paragraph.** At `skills/skills-guru/assets/Agentifico/Counts.yml` 84, `skills/skills-guru/assets/Agentifico/ParagraphLength.yml` 9 and `skills/skills-guru/assets/Agentifico/Position.yml` 62, a later commit appended a sentence to the paragraph above. At `skills/skills-guru/assets/Agentifico/History.yml` 87, the wrap landed on a sentence end. Those four join. Every other break after a sentence is a separate note, such as each `Widened to numbers, PR 263.` line #227 added, and stays.

**The diff is whitespace alone.** `git diff --word-diff` over `skills/skills-guru/assets/` shows no word added or removed.

## The check

**`skills/skills-guru/scripts/check.js` reads every `*.yml` and `*.yaml` file under the target**, under the same exclusions as the markdown. They form a list of their own: markdownlint never reads them, and Vale still leaves them out, for the reason `skills/skills-guru/workflows/check.md` gives.

**It fails a file on three things, each naming the file and the line.** A file `YAML.parseDocument` cannot parse, a duplicate key, which the same call reports as `DUPLICATE_KEY`, and a comment line continuing a sentence from the line before. The `yaml` package is already a dependency, so nothing new is installed.

**Comments are read off the parser's CST, never off raw lines.** `skills/skills-guru/scripts/test/vale.test.yml` holds `# Title` inside block scalars, and a raw `#` scan would read those as comments. A continuation is two whole-line comments on consecutive lines, the first not ending a sentence. Separate one-line comments in a row each end a sentence, so they pass.

**The findings print under `yaml files`, a group of their own**, after the markdownlint groups and before Vale runs. They are no contract rule, and printing them before Vale means a Vale that cannot start never withholds them. A YAML file counts in the closing line's file count, and in the count printed when Vale did not run, since the check itself read it.

## Steps

- Add four fixtures to `skills/skills-guru/scripts/test/check.test.js`: a file that does not parse, a duplicate key, a wrapped comment, and separate one-line comments in a row. Run the suite and watch the first three fail and the fourth pass.
- Make `skills/skills-guru/scripts/check.js` read the YAML files and report the three findings. Run the suite to green.
- Run the check on `skills/skills-guru` and watch it fail on the wrapped comments under `skills/skills-guru/assets/`.
- Unwrap the comments in every YAML file under `skills/skills-guru/assets/`, and confirm with `git diff --word-diff` that no word moved.
- Name YAML files among what the check reads in `skills/skills-guru/workflows/check.md`, keeping the sentence on why Vale leaves them out.
- Scan the package's markdown, scripts and `skills/skills-guru/.vale.ini` for hard-wrapped prose, and unwrap any found. A scan at plan time found none.
- Move `metadata.version` in `skills/skills-guru/SKILL.md` from 5.5.0 to 5.6.0, since the check gains behaviour.
- Run the check over every listed package, and fix each new hit in its own package or post it on that package's issue.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `node skills/skills-guru/scripts/check.js skills/review-text`
- `node skills/skills-guru/scripts/check.js skills/skills-guru`
- `node skills/skills-guru/scripts/check.js skills/socratic-tutor`
- `npm --prefix skills/skills-guru test`
- `npm --prefix skills/skills-guru run lint`
- `python3 scripts/version-check.py`

The check proves no comment line continues a sentence. It cannot tell a separate note from a paragraph that a wrap split at a sentence end, so which breaks stay is the judgement above. The word-diff has no exit code, so it is a step rather than a gate.
