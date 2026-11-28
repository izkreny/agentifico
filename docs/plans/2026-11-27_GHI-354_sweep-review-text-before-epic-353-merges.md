> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Sweep review-text before epic #353 merges

Issue [#354](https://github.com/izkreny/agentifico/issues/354), the last child of epic [#353](https://github.com/izkreny/agentifico/issues/353) and so far its only one. The branch is cut from `main` at 57714e8 and sits at the bottom of the epic's stack as well as the top. It lives in the epic's worktree, `.claude/worktrees/GHI-353-sweep-and-tag-review-text`.

## The sweep

A reviewer subagent ran `skills/agents-guru/workflows/review.md` over `skills/review-text` at 57714e8, inline and whole, and is kept resumable for its Step 5. The findings are on the issue as AGF1 to AGF6, and each is fixed here:

- **AGF1.** `## Arguments` in `skills/review-text/SKILL.md` (delete) gains one sentence: `fix` applies every `error` in scope, and every `suggestion` too when `style` is the stated scope; a `warning` is listed with its suggested wording and never applied, because its deliberate reading is the author's to choose. The `fix` row in `skills/review-text/README.md` (delete) says the same.
- **AGF2.** The README's credit link to agents-guru's review workflow becomes a GitHub URL pinned to `57714e8408fc31630773bc4f6a356a5b7e7ee39d`.
- **AGF3.** The description opens in the third person, "Reviews prose".
- **AGF4.** `## When to Use` goes. Every phrase in it is already in the description.
- **AGF5.** The sentence before the argument table goes, and line 22 leads into the table.
- **AGF6.** `## Boundaries` says a name that looks misspelt is a `warning` with the likely spelling, and `fix` never changes it. That follows from AGF1's rule for a `warning`.

`metadata.version` moves from `1.1.0` to `1.1.1`. Every fix makes the skill say what it already meant: the levels already called a `suggestion` optional and a `warning` possibly deliberate, and the boundaries already kept every name. An installer gains no capability and loses none, and the stack holds no `feat` or breaking branch, so the release is a patch.

## Steps

- ::S1:: Fix AGF1 to AGF6, citing each id in its commit.
- ::S2:: Move `metadata.version` in `skills/review-text/SKILL.md` (delete) to `1.1.1`.
- ::S3:: Resume the sweep reviewer on the fix commits for a verdict per finding and per set-aside item, per `skills/agents-guru/workflows/review.md` Step 5.
- ::S4:: Record the verdicts on the issue.

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-27_GHI-354_sweep-review-text-before-epic-353-merges.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md docs/plans/2026-11-27_GHI-354_sweep-review-text-before-epic-353-merges.md --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `node skills/agents-guru/scripts/check.js skills/text-guru`

The check cannot say whether a sentence in `skills/review-text/SKILL.md` (delete) is true or whether a fix closes its finding, which the resumed reviewer's verdicts judge. Whether an agent running `fix` actually holds back a `warning` is behaviour, and no gate here measures it.

## After the review round

The Vale re-mine is this pull request's last task, run after the round's fixes are pushed and before the merge, so it can read the round's own threads. It reads everything merged since `review-text_1.0.0`, per *How a phrase list grows* in `skills/agents-guru/references/maintaining.md`, along with this issue's findings, this pull request's threads and this branch's commits. AGF5's "the one action" is the first candidate, for `Counts`. New tokens go on an `agents-guru` issue and none land on this branch, per *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md`. The issue records what was read.

## Open questions

None.

## Settled

- ::Q1:: **What does #501's rename change on this branch?** The owner said in the terminal to merge #501's branch in, below this one in the stack. The package now lives at `skills/text-guru/`, so V4 checks that path, and the release is `2.0.0`, a major, because #501's commit carries `!`.
