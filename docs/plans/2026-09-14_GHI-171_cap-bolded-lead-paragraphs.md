> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Cap a run of bolded-lead paragraphs

Issue [#171](https://github.com/izkreny/agentifico/issues/171), a child of epic [#157](https://github.com/izkreny/agentifico/issues/157), cut from the tip of `feat/GHI-106_cap-bolded-lead-runs` and stacked on it in stack #168. The `blockedBy` on #106 is the stack-parent shape `.agents/gh-solo.md` exempts under *An epic child's blocker is its stack parent, not a wait*: #106's branch exists, is the branch this one was cut from, and is this pull request's base.

## What lands

A cap of five in `skills/skills-maker/workflows/new.md` Step 4 on how many top-level paragraphs in a row may open with a bolded lead. One markdownlint rule reports a run past it, and its heading in `skills/skills-maker/workflows/check.md` states what ends a run and what the rule cannot decide. The three runs in this package past the cap are split.

## What ends a run

**A heading ends a run, and so does a top-level paragraph that does not open bold. Nothing else does.** A list, a fence, a table or a quote between two bolded paragraphs sits inside the run.

The reason is the cap's own. A bolded lead is there to stand out from the paragraphs around it. A fence or a list is not a paragraph it could stand out from, so putting one between two bolded paragraphs leaves the contrast just as lost. It would also let a writer dodge the cap by moving a code block. #106 refused that kind of escape for list items, where unindenting kept the run and dropped only its markers.

A thematic break sits inside the run too. On this tree it changes no count, so it gets no rule of its own.

Only top-level paragraphs count. A paragraph inside a list item is the continuation rule's business, and one inside a quote is not part of the section's prose.

## The measurement, taken before any rule

Taken at `39e5eee`, the tip of #106's branch, over every tracked markdown file under `AGENTS.md`, `.agents/`, `plugins/` and `skills/`. It reads micromark's tree through markdownlint, the parser the rule will read. The issue's first cut, where any block ends a run, is shown beside it.

| Run length | Runs, any block ends | Runs, this definition |
|---|---|---|
| 1 | 192 | 145 |
| 2 | 42 | 42 |
| 3 | 20 | 20 |
| 4 | 14 | 13 |
| 5 | 5 | 8 |
| 6 | 4 | 3 |
| 7 | 4 | 6 |
| 8 | 1 | 4 |
| 10 | 1 | 0 |
| 11 | 1 | 1 |
| 14 | 1 | 2 |

Both hold the same 512 bolded paragraphs. The first cut has 12 runs past five and this definition has 16. The rule will report these 16:

| Run | Starts at |
|---|---|
| 14 | `AGENTS.md` line 33 |
| 14 | `plugins/gh-solo/skills/pr-flow/README.md` line 70 |
| 11 | `skills/skills-maker/workflows/review.md` line 31 |
| 8 | `.agents/gh-solo.md` line 43 |
| 8 | `.agents/gh-solo.md` line 160 |
| 8 | `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` line 141 |
| 8 | `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` line 55 |
| 7 | `.agents/gh-solo.md` line 138 |
| 7 | `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` line 119 |
| 7 | `plugins/gh-solo/skills/pr-flow/workflows/open.md` line 148 |
| 7 | `plugins/gh-solo/skills/tracker/README.md` line 57 |
| 7 | `plugins/gh-solo/skills/tracker/workflows/validate.md` line 50 |
| 7 | `skills/skills-maker/workflows/review.md` line 9 |
| 6 | `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` line 62 |
| 6 | `plugins/gh-solo/skills/pr-flow/workflows/ready.md` line 15 |
| 6 | `skills/skills-maker/workflows/check.md` line 55 |

**Three are this package's, and this branch splits them.** Each package changes only on its own branch, so the `plugins/gh-solo/` runs are reports for that package's next sweep. The `AGENTS.md` and `.agents/gh-solo.md` runs are repository-level files, which a package branch does not touch. The check runs on skill trees, so neither file is ever its target.

## How this package's runs split

The way out is #106's: a run past the cap splits into subsections of five or fewer, under headings of their own.

- `skills/skills-maker/workflows/review.md` Step 1, 7 paragraphs. A `### A package root` subsection takes the package-root paragraph, reading every file under the root, walking the tree, and reporting which files were read. A `### A path covering several skills` subsection takes the inline read, the rule that binds only such a path, and saying where the read ran thin.
- `skills/skills-maker/workflows/review.md` Step 3, 11 paragraphs. A `### Where the skill misfires` subsection takes triggers only in the body, verbs that route nowhere, a missing boundary, and a triggering doubt. A `### Claims that have gone false` subsection takes a false premise, duplication with a global instructions file, version banners, a count or position claim, and a placeholder standing in for a payload. A `### Text that does no work` subsection takes enumerations ending in "and anything else" and rationale that restates the rule.
- `skills/skills-maker/workflows/check.md`, *The README and path rules*, 6 paragraphs. It splits into `## The README rule` and `## The path rules`, matching the file's other one-rule headings. No file names the old heading.

## Steps

- Export `paragraphOf()` and `opensBold()` from `skills/skills-maker/scripts/rules/skill-continuations.js`, and export `CAP` from `skills/skills-maker/scripts/rules/skill-bolded-runs.js`. How a bolded lead is found, and the figure, then each stay in one place.
- Add 'skills/skills-maker/scripts/rules/skill-bolded-paragraphs.js'. It walks only the top-level tokens, so a nested paragraph is never read, and reports each run of more than `CAP` at its first paragraph's line.
- Register it in `skills/skills-maker/scripts/lint-config.js` among `proseShapeRules`, beside `skill-bolded-runs`.
- Add its fixtures to `skills/skills-maker/scripts/test/rules.test.js`, and the rule to that file's `RULES`. The fixtures cover runs of seven, six and five; a run broken by a plain paragraph; a run broken by a heading; a fence, a list and a table inside a run, each still counted; bolded paragraphs inside a quote and bolded list items, neither counted; bold later in a paragraph, not counted; a workflow file; and the line of the run's first paragraph.
- Split the three runs in `skills/skills-maker/workflows/review.md` and `skills/skills-maker/workflows/check.md`, as *How this package's runs split* names.
- State the cap in `skills/skills-maker/workflows/new.md` Step 4, under its own heading after the list-item cap: the reason in a sentence, what ends a run, and the way out by pointing at the list-item heading rather than restating it.
- Give the rule its own heading in `skills/skills-maker/workflows/check.md` after the bolded-run rule. It states what ends a run, and that the rule cannot decide where a run's subsections fall.
- Watch the rule fail against real instances: `node skills/skills-maker/scripts/check.js plugins/gh-solo/skills/pr-flow` must report the 14-paragraph run at `plugins/gh-solo/skills/pr-flow/README.md` line 70, and the 6-paragraph run at `plugins/gh-solo/skills/pr-flow/workflows/ready.md` line 15, which only this definition catches because a table sits inside it. This branch touches neither file, so both read as they stand at `39e5eee`. Record it in the commit body.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.7.0` to `3.8.0`. It is a minor: one new rule is new behaviour, and the package's own files pass once split.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

Each fixture is watched failing before its pass is trusted, per *A check that has never been seen to fail is not evidence* in `skills/skills-maker/workflows/new.md`. The tripping fixtures run with the cap raised past their length, and the guard fixtures with the cap lowered to one. The check's own run over this package catches the new wording breaking a prose rule. No gate reads whether the new subsection headings group what belongs together; that stays a reader's call.

## Open questions

None.

## Settled

None yet.
