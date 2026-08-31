> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Cap the PR body that lands on main

Closes #38.

## What is uncapped, and what the cap has to leave alone

The body's sections divide cleanly once the question is asked as *whose length is this*.

**Prose whose length the writer chose, and which reaches `main`:** `## Plan overview`, already capped in the template; the "what these gates cannot see" paragraph under `## Verification`; `## Open questions`; `## Settled`. Only the first is bounded today.

**Not prose, and out of scope:** the disclaimer, `Closes #38`, the plan link, and the `## Steps` and `## Verification` checkbox lists, which are record rows by the *Never counted* exclusion under *Post caps* in `plugins/gh-solo/skills/pr-flow/SKILL.md` — their length is set by how many gates and steps a branch has.

**The trap this diff has to disarm.** That same *Never counted* bullet reads "a record row - one line per item, where the length is set by how many items there are rather than by how much was written", and a `## Settled` entry answers to that description word for word: one entry per settled question. If the new cap does not deny it explicitly, the exclusion swallows the one section the issue exists to bound. So the cap says it: a `## Settled` entry is prose whose length its writer chose, and it counts. That is the same line the issue draws under `## Verification`, where the boxes are excluded and the paragraph beneath them is not.

## Where the cap goes

`plugins/gh-solo/skills/pr-flow/workflows/open.md`, as a `### Body caps` section immediately under the PR body template, in the file that owns the template and states the `## Plan overview` cap today. It states the number once, for every section it names, and the existing `## Plan overview` cap folds into it rather than sitting beside it — the issue asks for a cap stated once, and leaving the old sentence in the template would leave two.

Its shape mirrors `### Post caps` in `plugins/gh-solo/skills/pr-flow/SKILL.md` deliberately: same number, same "count them; mechanical, not a judgement", and the exclusions reached by pointer at that section's `#### Never counted` rather than re-listed, with the `## Settled` denial as the one thing said here that is not said there.

## Where an entry goes when it does not fit

**The plan file's own `## Settled` heading.** `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` already sanctions both the heading and the route: a decision settled in the terminal is recorded "into the plan where it can be public, under a `## Settled` heading", and `plugins/gh-solo/skills/implement/workflows/implement.md` already lands plan changes after plan time as a new `docs:` commit rather than an amend. So the overflow path exists; this diff only points the sixth entry down it.

**The commit message is not the destination here, however much *Post caps* prefers it elsewhere.** That escape works for a comment because a comment and a commit are different documents. This body *becomes* the commit message, so "put the overflow in the commit message" is a circle. The plan file is the escape that is genuinely unbounded and genuinely on `main`: it is committed under `docs/plans/`, it is already linked from `## Plan overview`, and it survives the branch's deletion.

**Nothing is deleted.** The move-rather-than-delete rule that put `## Settled` in the body in the first place is the reason the destination has to be a file on `main` rather than a thread, and the plan file satisfies it exactly as the body does.

## The gate sentences that have to admit the new destination

Three files assert that every answered entry sits in the body's `## Settled`. Once a sixth entry legitimately lives in the plan file, each of those sentences is false at the moment it is read as a gate:

- `plugins/gh-solo/skills/pr-flow/workflows/ready.md`, its `## Open questions` audit.
- `plugins/gh-solo/skills/pr-flow/workflows/merge.md`, the same audit at the door.
- `plugins/gh-solo/skills/pr-flow/workflows/discuss.md`, which does the moving, in its Step 2 prose and in its owner-reply table.

Each takes one clause admitting the plan file, and none restates the number.

## The commit body's own bullet

`#### Never capped` under *Post caps* in `plugins/gh-solo/skills/pr-flow/SKILL.md` names the PR body and what `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` composes. The commit message is where that section sends overflow, and nothing anywhere says it is unbounded — a reader following the escape has to infer it. It gets named.

The same edit has to keep the two caps from reading as a contradiction: the PR body's bullet there says the body is outside *Post caps*, which stays true, so it gains a clause naming *Body caps* as the cap it is inside instead.

## How the cap is held, and how it is caught

The same two moments the post caps live with, and no claim of enforcement beyond them. **Held at write time** by whoever composes or edits the body — `open` at creation, `discuss` on every move into `## Settled`. **Caught after the fact** by *Convention checks* in `plugins/gh-solo/skills/pr-flow/workflows/review.md`, whose `## Plan overview` row widens to cover every named section, and by the door audit in `plugins/gh-solo/skills/pr-flow/workflows/merge.md`, which is the last moment a breach is fixable because the squash makes it permanent.

No script counts any of this. Sentence-counting prose mechanically fails on the exclusions that matter here — a table, a quoted line, a checkbox list — and a counter that miscounts a compliant body is worse than a row an agent reads. The `## Plan overview` cap has been an agent counting since it was written, and the issue asks for the same form.

## Steps

- Add `### Body caps` to `plugins/gh-solo/skills/pr-flow/workflows/open.md`: the sections it names, the number, the pointer to `#### Never counted`, the `## Settled` denial, and the plan-file destination. Fold the template's `## Plan overview` sentence into it.
- Name the git commit body in `#### Never capped` under *Post caps* in `plugins/gh-solo/skills/pr-flow/SKILL.md`, and point that section's PR-body bullet at *Body caps*.
- Widen the `## Plan overview capped` row in *Convention checks* in `plugins/gh-solo/skills/pr-flow/workflows/review.md` to every capped section, by pointer and without a number.
- Add the cap to the door audit in `plugins/gh-solo/skills/pr-flow/workflows/merge.md`, beside the `## Open questions` and `## Plan overview` bullets it already reads.
- Admit the plan-file destination in `plugins/gh-solo/skills/pr-flow/workflows/ready.md`, `plugins/gh-solo/skills/pr-flow/workflows/merge.md` and `plugins/gh-solo/skills/pr-flow/workflows/discuss.md`, one clause each.
- Point `plugins/gh-solo/skills/implement/workflows/implement.md` at the cap where it moves entries into `## Settled`.
- Move `plugins/gh-solo/.claude-plugin/plugin.json` to `3.2.0`.
- Watch the cap fail on a real over-long body: count `izkreny/agentifico#37`'s merged body against each new row and record what is rejected and on which section, then count a body that complies and record that it passes. A cap that has rejected nothing has not been seen to fail.
- Tick the issue's acceptance criteria as each lands.

## Verification

- [ ] `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, run from the repository root with its exit code read directly and never through a pipe, per *Check commands* in `.agents/gh-solo.md`
- [ ] `python3 scripts/version-check.py`, per the same section

Those two gates read paths, fences and a version number. Neither can see whether five is the right number for a `## Settled` section, whether the `## Settled` denial actually escapes the record-row exclusion it is written against, or whether the widened *Convention checks* row still reads as one rule rather than four. Nor can either run the fail-watch in the last step, which is a count made by reading two real bodies and is deliberately not a box — every box here has to close before the branch merges, so a box only a reading could close would block its own branch.

## Open questions

**The issue's sixth criterion names `3.1.0`, and `main` already reads it.** That criterion was written when `main` sat at `3.0.0` with `390f9e5` unreleased, and `56899ee` has since moved the plugin to `3.1.0`. `python3 scripts/version-check.py` compares this branch against `origin/main`, so a branch touching `plugins/gh-solo/` that leaves the version at `3.1.0` fails it outright. This plan proceeds at `3.2.0`, which is the same minor step for the same reason the criterion gave; the criterion's number is stale rather than wrong, and amending the issue is the owner's call, not this branch's.

## Settled

None yet.
