> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Rewrite skills-maker's code comments

Issue [#176](https://github.com/izkreny/agentifico/issues/176), a child of epic [#157](https://github.com/izkreny/agentifico/issues/157), cut from the tip of `feat/GHI-129_metric-length-rules` and stacked on it in stack #168. The `blockedBy` on #129 records that order, per *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`, and nothing here needs what #129 changes.

## What lands

The skill states one rule for a comment inside code: a comment exists only where the solution is unconventional, and then it is one short sentence saying why. Every comment in the package's own scripts and in `skills/skills-maker/.vale.ini` is read against that rule and deleted or rewritten. `metadata.version` moves a minor, `3.9.0` to `3.10.0`.

## Where the rule goes

**The rule is a `###` under Step 4 of `skills/skills-maker/workflows/new.md`**, beside the other body rules, with its reason in a sentence as *Give every rule its reason, in a sentence* asks. It reaches code because `skills/skills-maker/workflows/review.md` reads what a skill runs from its scripts as part of the whole target, so a comment there is held to the same file. The heading names the rule the way the neighbouring headings do, so a later mechanical rule's message can open on it.

**The reviewer's half is a field note under *Text that does no work* in `skills/skills-maker/workflows/review.md`**: a comment that narrates what the code does, or that tells the file's history, is text that does no work, and whether a surviving sentence is a reason, and whether the line it sits on is unconventional enough to earn one, is a reading no rule makes. `skills/skills-maker/workflows/check.md` is not touched: it describes the check, and the check gains nothing here.

## The rewrite

**Delete before rewriting.** Most comments in `skills/skills-maker/scripts/` narrate what the code does or record why the code is shaped as it is at essay length. The test for keeping one is whether a reader who knows JavaScript would be surprised by the line without it; where the answer is no, the comment goes, and where it is yes, the reason survives as one sentence.

**What a surviving sentence may not carry.** A count of adjacent content, a position claim or a history word is a defect in a comment as in a paragraph, since #173 runs the prose rules over comments. A sentence that needs a pull request number to make sense is history, and goes.

**Docstrings and test names.** The package's scripts are JavaScript, so there is no docstring; a JSDoc block is a comment like any other and is held to the rule. A test's title string is code, not a comment, and is not read.

**Tool directives stay.** A `biome-ignore` line is an instruction to the linter rather than prose, and stays exactly as the tool needs it.

**A reason the prose promises stays too.** `skills/skills-maker/workflows/check.md` states that every markdownlint rule turned off in `skills/skills-maker/scripts/lint-config.js` is named there with its reason beside it, so each off rule keeps its reason as one sentence rather than losing it as narration.

**`skills/skills-maker/.vale.ini` is in reach; `skills/skills-maker/assets/` is not.** The configuration's comments are held to the rule, and the reason `skills/skills-maker/workflows/check.md` points at it for, why quoted text is not read, survives as one sentence. A rule file's comments quote the phrases the rule catches and name the review that caught each, which is the evidence a token stands on, and #173 keeps that directory out of Vale's reach for the same reason.

**Where a deleted comment held a design decision the prose does not state**, the decision is checked against `skills/skills-maker/workflows/check.md`, which documents what the check does and why, and a gap there is reported on the pull request rather than filled here: that file is #173's to edit, and this branch changes comment lines only.

## Steps

- State the comment rule as a `###` under Step 4 of `skills/skills-maker/workflows/new.md`, with its reason.
- Add the reviewer's half under *Text that does no work* in `skills/skills-maker/workflows/review.md`.
- Read every comment under `skills/skills-maker/scripts/`, the test files included, and delete it or cut it to one sentence saying why; leave `biome-ignore` lines as they are, and keep one sentence of reason beside each rule `skills/skills-maker/scripts/lint-config.js` turns off.
- Read every comment in `skills/skills-maker/.vale.ini` the same way, keeping the reason quoted text is not read.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.9.0` to `3.10.0`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

The suite and the lint prove the scripts still behave and still parse after every comment edit, and the check's own run over the package catches the new rule text in `skills/skills-maker/workflows/new.md` and `skills/skills-maker/workflows/review.md` breaking a prose rule. No gate reads whether a surviving comment is a reason, whether the line it sits on is unconventional, or whether a deleted one held a decision the prose does not state; the round reads those.

## Open questions

None.
