> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Hold the Vale word classes to one list

Issue [#227](https://github.com/izkreny/agentifico/issues/227), the second child of epic #226. It is blocked by #238, which is its stack parent rather than a wait, per *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`. The branch is cut from the tip of `feat/GHI-238_grow-phrase-lists-from-re-mine`, and the pull request's base is that branch. The trunk sitting ahead of the stack is normal, so nothing is fast-forwarded here.

## What changes

**The canonical lists live in `skills/skills-guru/assets/word-classes.yml` (new).** It is a data file beside the rules, which is what the package's `skills/skills-guru/assets/` holds per *Where the prose rules live* in `skills/skills-guru/references/maintaining.md`. It sits outside `skills/skills-guru/assets/Agentifico/`, because Vale reads every file there as a rule. A file at that root was tried, and Vale and `vale test --coverage` both ignore it.

**The suite gains a test in `skills/skills-guru/scripts/test/vale.test.js`.** For each token of each rule under `skills/skills-guru/assets/Agentifico/`, it reads every innermost `(?:...)` group. A group whose alternatives hold a regex character, such as `remains?`, is skipped. A group belongs to a class when every alternative, trimmed, is a member of that class's list. A group equal to its class passes. A group that is a proper subset passes only when the token's source comment says why. Anything else fails, naming the rule, the token and the class.

**"Says why" is a marker the test can read.** The token's source comment carries `Narrows <class>: <reason>`, naming the class and a non-empty reason. The source comment is the one directly above the token, or above the nearest token before it that has one, since several tokens share a comment. The suite reads it through `YAML.parseDocument`, which keeps comments, where `YAML.parse` does not.

**`skills/skills-guru/references/maintaining.md` gains the rules under *How a token lands*.** It names `skills/skills-guru/assets/word-classes.yml` (new) as the place the lists live, and the marker. It says a token may widen past its recorded phrasing only where the widening is quite obvious, and only with the owner's approval. That approval is recorded in a thread on the pull request that widens the token, and the token's comment cites that pull request.

**`metadata.version` in `skills/skills-guru/SKILL.md` moves from 5.4.0 to 5.5.0.** The suite gains a check, and the approved widenings flag prose the check passed before, which is new behaviour. The version check cannot see per-branch bumping on a stack, so this plan is the record of it.

## The classes

Each list is the union of what the classifying groups hold today, so the list alone forces no widening. The number list is the exception, because the issue fixes it at two through twenty.

| Class | Canonical list |
|---|---|
| `numbers` | two through twenty, every word |
| `determiners` | the, this, that, these, those, its, a, any, every, each, no |
| `ordinals` | first, second, third, fourth, last, next, previous, final |
| `parts` | bullet, paragraph, row, section, table, list, entry, sentence, block, column, span, item |
| `changes` | moved, removed, renamed, replaced, dropped, deleted, lifted, rewritten |
| `auxiliaries` | is, are, was, were, been, has, have, had, does, do |

**A group with one word outside every class escapes the test.** That is a choice, not an oversight. `(?:this|that|it)` in Position and `(?:the |these |those |its |them )` in Counts mix a pronoun into a determiner list. Holding them would mean splitting tokens that match correctly today. The review can judge whether any escaping group should be split.

## Widening candidates

Nothing widens at implementation. Every candidate waits for the owner's answer on the pull request. Until then, each narrower group carries a `Narrows` comment. A widening the owner approves lands as a fix commit, which replaces that group's comment with the citation.

| Rule | Token, by its opening | Class | Recommend |
|---|---|---|---|
| Counts | `(?:all\|both of\|...)` | numbers | Yes. It stops at fifteen plus twenty, and sixteen to nineteen are the gap the list closes. |
| Counts | `(?:two\|...\|five) of them` | numbers | Yes. "Six of them" counts as plainly as "five of them". |
| Counts | `(?:the\|these\|those\|its) (?:two\|...\|ten)` | numbers | Yes. "The eleven files" is the same count. |
| Counts | `(?:the\|these\|those) (?:two\|three)(?=...)` | numbers | No. "Toward the five," names a cap in `plugins/gh-solo`. |
| Counts | `... (?:below\|above)` | numbers | Yes. |
| Counts | both announcement tokens | numbers | Yes. "Eleven causes remain." is the same announcement. |
| Counts | `runs in (?:two\|...\|six)` | numbers | Yes. |
| Counts | `... things` | numbers | Yes. |
| Counts | `only (?:two\|...\|ten)` | numbers | Yes. |
| Counts | `(?:are\|is) (?:two\|...\|ten) (?:files\|rules\|names)` | numbers | Yes. |
| Position | `(?:list\|section\|...) further (?:down\|on)` | parts | Yes. "The sentence further down" is the same pointer. |
| Position | `beside (?:that\|this\|the) (?:bullet\|...)` | parts | Yes. |
| History | `(?:has\|have\|had) been (?:moved\|...)` | changes | Yes, adding "rewritten". |
| History | `is being (?:lifted\|...)` | changes | Yes. "Is being moved" anchors to a moment as "is being lifted" does. |
| History | `(?:was\|were) (?:moved\|...) (?:to\|from\|in\|out)` | changes | No. "Replaced" has its own token, and "lifted to" is not a history claim. |
| any | every determiner, ordinal and auxiliary group | — | No. Each changes what the shape means, as "any two findings" states a rule rather than counting a list. |

## Decisions

**A hit an approved widening finds in another package is posted on that package's issue, and fixed there.** It is never fixed on this branch, which would move a second package's version, per *Each plugin, and each skill under `skills/`, is a package* in `AGENTS.md`. A hit in `skills/skills-guru` is fixed or excepted here.

**The new test is watched failing before it is trusted.** One group is narrowed with no marker, the suite is run and seen to fail naming that token, and the change is reverted.

## Steps

- Add `skills/skills-guru/assets/word-classes.yml` (new) with the six classes.
- Add the word-class test to `skills/skills-guru/scripts/test/vale.test.js`.
- Run the suite and record every group it fails on.
- Add a `Narrows <class>: <reason>` comment to each of those tokens, in the three rule files.
- Watch the test fail on a group narrowed with no marker, then revert that change.
- State the place, the marker and the widening rule under *How a token lands* in `skills/skills-guru/references/maintaining.md`.
- Move `metadata.version` in `skills/skills-guru/SKILL.md` to 5.5.0.
- Run the skills-guru check over every listed package.

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

The suite proves every classifying group equals its class or carries a marker. It cannot judge whether a reason is true, or whether a widening is obvious. Two acceptance criteria wait on the owner: the widenings, and the check over every package with them. The implementation ticks the rest.
