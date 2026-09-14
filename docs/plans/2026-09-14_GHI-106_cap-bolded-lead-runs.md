> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Cap a run of bolded-lead list items

Issue [#106](https://github.com/izkreny/agentifico/issues/106), a child of epic [#157](https://github.com/izkreny/agentifico/issues/157), cut from the tip of `feat/GHI-132_flag-vale-directives` and stacked on it. The `blockedBy` on #132 is the stack-parent shape `.agents/gh-solo.md` exempts under *An epic child's blocker is its stack parent, not a wait*: #132's branch exists, is the branch this one was cut from, and is this pull request's base.

## What lands

A cap in `skills/skills-maker/workflows/new.md` Step 4 on how many list items in a row may open with a bolded lead, and one markdownlint rule that reports a run past it. The rule's heading in `skills/skills-maker/workflows/check.md` says what it cannot decide.

## The measurement, taken before any rule

Taken at `3531f9e` over every tracked markdown file under `AGENTS.md`, `.agents/`, `plugins/` and `skills/`, with `docs/plans/` left out because a plan is a record rather than prose a reader loads. A run is a sequence of consecutive items within one list whose lead paragraph opens with a `strong` token, read off micromark's tree through markdownlint, the parser `skills/skills-maker/scripts/rules/skill-continuations.js` already reads. The issue's 383 is a count of raw `^- \*\*` lines, which misses ordered lists, `*` markers and nested lists, and cannot tell where a run ends.

| Run length | Runs |
|---|---|
| 1 | 7 |
| 2 | 31 |
| 3 | 27 |
| 4 | 18 |
| 5 | 12 |
| 6 | 10 |
| 7 | 2 |
| 9 | 3 |
| 11 | 3 |
| 14 | 1 |
| 15 | 1 |

That is 115 runs holding 445 items. The median is 3, the 75th percentile 5, the 90th 6, the 95th 9 and the longest 15. In 92 of the runs, every item in the list has a bolded lead.

**The cap is six.** The distribution breaks just past it: 6 is the 90th percentile, nothing in the tree runs to 8, and everything from 9 up is the tail the issue describes. The longest runs in `skills/skills-maker` itself are exactly six, in the prose-rules list of `skills/skills-maker/workflows/check.md` and the supporting-files list of `skills/skills-maker/SKILL.md`, and both are parallel members of one set. So the package's own gate stays green without any edit to them. The ten runs past the cap all sit in other packages, in `plugins/gh-solo/` and `skills/rails-style/SKILL.md`. Each package changes only on its own branch, so those runs are reports for each package's next sweep rather than work for this one.

## Why the rule fails the run rather than warning

In this package a markdownlint finding is always an issue: `skills/skills-maker/scripts/check.js` gives only Vale's alerts a warning class. Vale cannot count across list items either, since it reads rendered text in which the bolding and the item boundaries are gone. A warning class for markdownlint would reshape the output #141 separated, which is not this issue's work.

A hard rule stays honest because every breach has a fix the writer can apply without deciding anything the rule could not. A run of successive claims is unindented into paragraphs, each keeping its bolded lead. That is the move `skills/skills-maker/workflows/new.md` already gives an item that has outgrown its continuation. A run of parallel members becomes a table, whose first column carries what the bold was doing. The rule reports the run and the writer chooses the fix, in the same relation `skill-continuations` has to its promote-or-unindent choice.

## What counts as a run

Every item whose first block is a paragraph opening with `strong` counts, whether or not it carries a continuation, since a bolded lead with a paragraph under it is more section-like, not less. An item that opens any other way ends the run. Each list is counted on its own, so a nested list neither extends nor breaks its parent's run. The finding is reported at the run's first item, with the run length and the cap in its detail.

## Steps

- Extend `items()` in `skills/skills-maker/scripts/rules/skill-continuations.js` to record whether each item's lead block is a paragraph opening with `strong`, so how an item is found stays in one place.
- Add 'skills/skills-maker/scripts/rules/skill-bolded-runs.js', which imports `items()` and reports each run of more than six such items at its first item's line.
- Register it in `skills/skills-maker/scripts/lint-config.js` among `proseShapeRules`, since a reader sees the defect and no agent is misled by it.
- Add its fixtures to `skills/skills-maker/scripts/test/rules.test.js` and the rule to that file's `RULES`. The fixtures cover a run of seven, a run of six, a run of seven broken by a plain item, an ordered run, a nested list whose items do not extend the parent's run, and a run in a workflow file rather than a 'SKILL.md'.
- State the cap in `skills/skills-maker/workflows/new.md` Step 4 under its own heading beside the continuation rule, as a cap with its reason in a sentence, and name both fixes.
- Give the rule its own heading in `skills/skills-maker/workflows/check.md` after the continuation rule, saying what it reports and that it cannot tell parallel members of one set from a section wearing bullets, so the writer chooses between a table and unindenting.
- Watch the rule fail against a real instance: `node skills/skills-maker/scripts/check.js plugins/gh-solo/skills/pr-flow` must report the 15-item run at `plugins/gh-solo/skills/pr-flow/SKILL.md` line 107, a file this branch does not touch, so it reads as it stands at `3531f9e`. Record it in the commit body.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.6.0` to `3.7.0`. It is a minor: one new rule is new behaviour, and no file in this package that passed before starts failing.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

Each fixture is watched failing before its pass is trusted, per *A check that has never been seen to fail is not evidence* in `skills/skills-maker/workflows/new.md`. The tripping fixtures run against the rule with its cap raised past their length, and the guards fixtures against the cap lowered to one. The check's own run over this package is the gate that catches the new wording in `skills/skills-maker/workflows/new.md` and `skills/skills-maker/workflows/check.md` breaking a prose rule. No gate reads whether a run under the cap is a section wearing bullets. The rule leaves that to a reader, and so does this branch.

## Open questions

None.

## Settled

- Whether the rule fails the run or only warns. It fails the run, as a `proseShapeRules` entry: markdownlint has no warning class here, and each breach has a fix the writer can apply, as *Why the rule fails the run rather than warning* states.
- Where the cap sits. Six, from the distribution above, the lowest cap that leaves this package's own sets green, and it still catches the tail.
