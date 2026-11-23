> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Clear the check on the repository files

Issue #475 holds the acceptance criteria. This plan says how.

## Approach

The check runs on `AGENTS.md`, `.agents/gh-solo.md` and `.agents/dependencies.md`. On `main` at `186b571` it reports 37 issues and 4 warnings, two more than the issue's N1 lists. The extra two are `.agents/gh-solo.md:243`, a `History` and a `Position` hit on the sweep's version paragraph, which landed after the issue was written.

Every issue is fixed in the prose. None is excepted. A directive inside the file is refused by `skill-vale-directive`, and an exception in a rule is an `agents-guru` edit, which N2 sends to an issue of its own.

The issues fall into these groups:

- The prose rules: each `Counts`, `Position` and `History` hit is rewritten so the sentence names what it means. A count of a pair the sentence already names becomes the names themselves.
- `MD060`: the three table delimiter rows become compact, `| --- | --- |`.
- `skill-bolded-paragraphs`: each run of more than five bolded-lead paragraphs splits into subsections under headings of their own, the move *At most five paragraphs in a row open with a bolded lead* in `skills/agents-guru/workflows/new.md` gives. A bolded lead is never reworded, since other files cite many of them by name.

The warnings stay, since none fails the run and none is a criterion.

The gate, AC2, is a paragraph in *The agents-guru check* in `.agents/gh-solo.md`. It names the three files and says a branch editing any of them owes the run.

## Epic #78's stack

The stack under epic #78 edits `.agents/gh-solo.md` on the branches of #336, #79 and #80. It does not wait for this branch, and this branch does not wait for it. Its next `gh stack sync` rebases over this change and resolves the conflicts there. The new gate then binds those branches too, so each clears the findings its own edits add. At the stack's tip today that is one more issue than on `main`.

## Steps

- ::S1:: Add the gate paragraph and its command to *The agents-guru check* in `.agents/gh-solo.md`
- ::S2:: Rewrite every prose-rule hit in `AGENTS.md`, `.agents/gh-solo.md` and `.agents/dependencies.md`
- ::S3:: Make the table delimiter rows compact in `AGENTS.md` and `.agents/gh-solo.md`
- ::S4:: Split each bolded-lead run past five into subsections in `AGENTS.md` and `.agents/gh-solo.md`

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-22_GHI-475_clear-the-repo-files-check.md`
- ::V2:: `node skills/agents-guru/scripts/check.js AGENTS.md .agents/gh-solo.md .agents/dependencies.md` exits zero, after it was seen exiting 1 on the branch's base `186b571`
- ::V3:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V4:: `python3 scripts/version-check.py`

V4 passes without exercising anything, since this branch touches no package. No gate can see whether a rewritten sentence still says what it said, or whether a new heading names its subsection well.

## Open questions

None.

## Settled

None yet.
