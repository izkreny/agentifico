> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Prefer number words to digits in prose

Issue [#228](https://github.com/izkreny/agentifico/issues/228), a child of epic #226. It is blocked by #264, which is its stack parent rather than a wait, per *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`. The branch is cut from the tip of `feat/GHI-264_unwrap-yaml-comments`, and the pull request's base is that branch. Its other need, #227's canonical number list, sits lower in the same stack. The trunk sitting ahead of the stack is normal, so nothing is fast-forwarded here.

## What changes

**`skills/skills-guru/workflows/new.md` gains a heading of its own, beside *Write sentences that survive change*.** It states the rule: a count from two to twenty is written as a word, so the count rules can read it. It lands in its own commit, before the rule file, per *Which rule a phrase belongs to* in `skills/skills-guru/references/maintaining.md`.

**The rule is `skills/skills-guru/assets/Agentifico/Digits.yml` (new), a Vale `substitution` rule.** An `existence` rule's message can only echo the match, and the message has to name the word to write. A `substitution` rule maps each digit to its word, and its message carries both, as in "write 'three' rather than '3'". A scratch rule on Vale 3.23.0 confirmed that lookarounds work in its keys and that the message gets both values.

**Its keys are shapes, not mined phrasings.** Every other phrase rule names the finding behind each token. The source of this rule's keys is #228 itself, which the header comment of `skills/skills-guru/assets/Agentifico/Digits.yml` (new) says, as `Banner` says where its tokens come from.

**The suite in `skills/skills-guru/scripts/test/vale.test.js` learns `swap` rules.** Its per-token loop skips any rule without `tokens`, so it gains a branch that runs each `swap` entry alone over the trip case. A new test holds the swap values to the `numbers` list in `skills/skills-guru/assets/word-classes.yml`, digit by digit, so the message and the list cannot drift.

**`skills/skills-guru/workflows/check.md` gives `Digits` a row in its table of prose rules**, and *Which rule a phrase belongs to* in `skills/skills-guru/references/maintaining.md` routes a digit count to it.

**`metadata.version` in `skills/skills-guru/SKILL.md` moves from 5.6.0 to 5.7.0.** The check reports prose it passed before, which is new behaviour. The version check cannot see per-branch bumping on a stack, so this plan is the record of it.

## Count or name

A survey of the listed packages' markdown found about 300 digits from 2 to 20 in prose. Nearly all name a step. The rule relies on these shapes.

**Reported: a digit standing alone, followed by a space and a lowercase word**, as in "3 files". That is the count shape, a number before its noun.

**Left alone, each a line in the guards case:**

- A digit touching a letter, a digit, `.`, `-`, `/`, `:` or `#`, or followed by a comma and a digit. That covers a finding id like RF2, an issue like #228, a version like 5.6.0, a date, a time and 2,000.
- A digit after a naming word: step, section, line, chapter, row, item, layer, exit, issue, version or Python, any case, plural too. The issue names the first ones; the survey found the rest.
- A digit continuing such a name through a comma, "and", "or" or "to", as in "Steps 3 and 4".
- A digit inside a code span or a fence, which Vale masks.

A digit inside double quotes is skipped by the shipped `TokenIgnores`, so that guard line goes in `skills/skills-guru/scripts/test/vale.test.yml`.

**Out of reach, and the `skills/skills-guru/workflows/check.md` row says so:** a digit before punctuation, as in "costs 3.", and one before markup or a capital, as in "3 **files**". A digit above 20 is out of scope, per the issue.

## Decisions

**Code comments are in scope.** `skills/skills-guru/.vale.ini` runs the style on `*.js` and `*.py` comments, which are prose per `skills/skills-guru/workflows/check.md`, so a hit there is fixed like any other.

**A hit in another package is posted on that package's issue, and fixed there.** Fixing it here would move a second package's version, per *Each plugin, and each skill under `skills/`, is a package* in `AGENTS.md`. The survey expects one, "10 to 30 columns" in `plugins/gh-solo/skills/tracker/references/issue-shape.md`.

**Each check is watched failing before it is trusted.** The trip case fails with one swap entry removed. The per-entry loop fails with one trip line removed. The drift test fails with one swap value changed.

## Steps

- Add the heading and its rule to `skills/skills-guru/workflows/new.md`, and commit it alone.
- Add `skills/skills-guru/assets/Agentifico/Digits.yml` (new), with a trip case of one line per digit and a guards case of the shapes above.
- Add the quoted-digit guard to `skills/skills-guru/scripts/test/vale.test.yml`.
- Teach the per-token loop in `skills/skills-guru/scripts/test/vale.test.js` to run each `swap` entry, and add the drift test against `numbers`.
- Watch the trip case, the per-entry loop and the drift test each fail on the case it exists to catch, then revert each.
- Add the `Digits` row to `skills/skills-guru/workflows/check.md`, and the routing sentence to `skills/skills-guru/references/maintaining.md`.
- Move `metadata.version` in `skills/skills-guru/SKILL.md` to 5.7.0.
- Run the check over every listed package. Fix or except each hit in `skills/skills-guru`, and post each hit elsewhere on that package's issue.

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

The suite proves each digit fires on its trip line and that the guards stay quiet. It cannot judge whether a digit the guards pass is truly a name, or whether a reported one is truly a count. The every-package run is where that reading happens.
