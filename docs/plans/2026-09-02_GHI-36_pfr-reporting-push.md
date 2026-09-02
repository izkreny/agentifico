> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Add pfr, a reporting mid-round push (#36)

## Context

`plugins/gh-solo/skills/pr-flow/references/review-protocol.md` step 7 states "This is the round's only push, and no words ask for an earlier one", and the claim is restated rather than pointed at across `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` twice, `plugins/gh-solo/skills/pr-flow/workflows/review.md` twice, `plugins/gh-solo/skills/pr-flow/workflows/discuss.md`, `plugins/gh-solo/skills/pr-flow/workflows/help.md`, `plugins/gh-solo/skills/pr-flow/workflows/stack.md`, `plugins/gh-solo/skills/pr-flow/README.md` twice, `plugins/gh-solo/skills/pr-flow/SKILL.md` and `plugins/gh-solo/skills/implement/workflows/fix.md`, several of them more than once. Repealing the claim in one place and leaving every copy asserting it is how a package starts contradicting itself, which is the failure `#30`'s sweep exists to catch and this branch should not create.

The behaviour shipped once, as step 5.2 of that protocol in `a9355ab`, and was dropped in `fb26bb7` as a side effect of the 2.0.0 renumbering. That version posted one comment per fix, each reusing the `RF{n}` of the finding it answered, through the same one-call reviews-endpoint pattern the round still uses. `#36` widens the scope to the whole pushed delta and keeps the posting form.

`plugins/gh-solo/skills/pr-flow/scripts/post-review.py` already has the subcommand shape this needs - `build`, `verify`, `highest-id` - and its `RF_PATTERN` is `\bRF(\d+)\b`, which does not match inside `PFR1`, checked rather than assumed.

## Approach

**`pfr` is a branch off step 6, never a new numbered step.** Steps 7 and 8 are cited by number from across the package; renumbering them to insert a step would edit every one of those citations for no gain. The protocol's step 6 is "the owner judges", and `pfr` is something the owner may type while judging, so it belongs inside that step as a named branch that returns to it.

**Step 7's invariant is reworded rather than deleted, and the reason it existed is kept.** It becomes the round's *last* push, with exactly one earlier push available and only on the owner naming it. What made the original rule right - a push re-anchors every thread and marks them outdated beneath a part-way read - is unchanged; what changes is that the owner may now choose that cost in exchange for seeing the delta, rather than having it happen underneath them.

**Every restatement is made to point at step 7 rather than reworded in place.** Each site carries a copy of a rule that now has an exception, and every copy of an exception is another chance to state it wrong. `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` step 7 owns the push rule; each other site says the push waits for the owner's word and names that file, and none of them restates the count.

**A new workflow file holds the mechanics**, push-for-review.md under `plugins/gh-solo/skills/pr-flow/workflows/`, beside `plugins/gh-solo/skills/pr-flow/workflows/resolve.md`, which is the other file whose whole job is a push. Its own name stays out of backticks until it exists, because `plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` resolves every backticked path and a plan cannot cite a file it has not written yet. Folding it into that file would put two entrances with opposite postures in one file: that one resolves and ends the round, this one resolves nothing and returns to it.

**The delta is read from the head the pull request carried, not from the local branch.** `gh pr view <pr-number> --json headRefOid` taken before `git push` names the last head the owner could have read on the PR UI; the same read after the push names the new one. Everything between is what they have not seen, and taking the base from `@{upstream}` instead would be wrong the moment an earlier `pfr` pushed within the same round.

**The payload is built by a script, not by hand.** `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` gains a `build-delta` subcommand, fed a delta file the workflow produces with `git`, and the workflow posts its output through the same atomic reviews-endpoint call the round uses. The attribution of a hunk to a commit and of a commit to its `RF{n}` ids is exactly the mechanical work prose gets wrong every round, and the script already has a bench that can watch it fail.

**`pfr`'s Review is an index of a push and never a record Review, and it says so in its own `via` line.** The preliminaries in `plugins/gh-solo/skills/pr-flow/workflows/review.md` decide whether a round has already run from the Reviews posted on the pull request, told apart by their `via` line, and `#16` two branches up will count record Reviews as passes. So the form is `via` `pr-flow` push-for-review, the delta, the protocol's step 6 states that the has-a-round-run read excludes it, and nothing `pfr` posts enters any pass count.

**A hunk is attributed to the last commit in the range that touched it**, and that commit's own message supplies the `RF{n}` ids the comment carries. A change answering no finding gets a comment with no `RF{n}`, per the issue, rather than no comment.

**Each reporting push gets its own id, `PFR{n}`, and this is the one part of the design the issue did not foresee.** Without it a delta comment carrying no `RF{n}` is an inline thread that `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` will resolve and that the merge gate then refuses, because the authorisation comment can only name a thread by an id and this thread has none - so `pfr` would break the gate in `plugins/gh-solo/skills/pr-flow/workflows/merge.md` for every push that touched a line no finding asked about. `PFR{n}` counts reporting pushes on the pull request, is named in the authorisation's marker line alongside the `RF{n}` ids, and gives the merge gate the evidence form it needs. It is not an `RF{n}`: no finding is raised, no reviewer is spawned, and nothing it produces enters the round's pass count.

**`rnp` after a `pfr` must complete rather than claim a push it did not make.** `git push` on an already-current branch exits zero, so nothing fails today; what is missing is that `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` Step 5 reports a push regardless. It gains the same before-and-after `headRefOid` comparison `pfr` makes, and reports "nothing left to push" where the two are equal - one mechanism with two uses, and not a read of `git push`'s own output, which this skill's grant cannot pipe anywhere.

**The watch keeps running, and the stop table in `plugins/gh-solo/skills/pr-flow/workflows/watch.md` already says so correctly** - its only stops are `unwatch`, the owner authorising the resolve and the push, and the session ending. `pfr` is none of those, so that file needs no edit, which is worth stating because it is the one file a reader would expect in this diff and will not find.

## Steps

- Add the `pfr` branch to step 6 of `plugins/gh-solo/skills/pr-flow/references/review-protocol.md`: what it does, that it reports rather than reviews, that it spawns no reviewer and issues no `RF{n}`, that it returns to step 6, and the `PFR{n}` id it assigns.
- Reword step 7's "only push" invariant in the same file to the round's last push with one owner-named earlier push, keeping the anchor-recomputation reason intact, and extend its authorisation-comment account so the marker line may carry `PFR{n}` ids beside `RF{n}` ones.
- Write push-for-review.md under `plugins/gh-solo/skills/pr-flow/workflows/`: the entrance, the before-and-after `headRefOid` reads, the push, the `gh pr checks` read, the delta computation, the one-call post, and the report that returns the owner to step 6.
- Add `build-delta` to `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`, taking a delta file and the `PFR{n}` index and emitting a reviews-endpoint payload anchored to the new head, refusing the whole payload on a hunk it cannot attribute rather than emitting a partial one.
- Extend `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` with cases for `build-delta`, each watched failing against the input it exists to catch before the code that answers it lands.
- Point `plugins/gh-solo/skills/pr-flow/workflows/resolve.md`, `plugins/gh-solo/skills/pr-flow/workflows/review.md`, `plugins/gh-solo/skills/pr-flow/workflows/discuss.md`, `plugins/gh-solo/skills/pr-flow/workflows/stack.md`, `plugins/gh-solo/skills/pr-flow/README.md` and `plugins/gh-solo/skills/implement/workflows/fix.md` at step 7 instead of restating the push count, changing nothing else in any of them.
- Add the empty-push report to `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` Step 5, and let its marker line carry `PFR{n}`.
- Extend the authorisation evidence form to accept a thread's `PFR{n}` where it carries no `RF{n}`, at every site that states it: the *Resolution rests on recorded authority* conclusion in `plugins/gh-solo/skills/pr-flow/references/review-protocol.md`, which owns the rule; the third form in the thread gate of `plugins/gh-solo/skills/pr-flow/workflows/merge.md`; and the *Every resolved thread has recorded owner authority* row in the convention checks of `plugins/gh-solo/skills/pr-flow/workflows/review.md`, which is made to point at the conclusion rather than restate it.
- State in the same protocol step 6 text that `pfr` posts an index Review carrying its own `via` form, and that the has-a-round-run read in `plugins/gh-solo/skills/pr-flow/workflows/review.md` excludes it, so no reporting push is ever counted as a reviewer pass.
- Name `pfr` in `plugins/gh-solo/skills/pr-flow/SKILL.md`: the frontmatter `description`, the `argument-hint`, the routing table, the routing list, and the supporting-files entry for the new workflow file.
- Add the `pfr` row to `plugins/gh-solo/skills/pr-flow/workflows/help.md` and reword its "round's only push" sentence; add it to the two `README.md` rows that name who says when the fixes push.
- Move `plugins/gh-solo/.claude-plugin/plugin.json` from `4.0.0` to `4.1.0`, new behaviour being a minor.
- Exercise `pfr` on this branch's own pull request during its review round, by following the new workflow text by hand: the installed plugin is `4.0.0` and does not carry the command, so typing `pfr` would reach nothing.

## Verification

- `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`, per *Check commands* in `.agents/gh-solo.md`, after the `build-delta` edit.
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, run from the repository root with its exit code read directly and never through a pipe.
- `python3 scripts/version-check.py`, which must report `plugins/gh-solo` touched and its version moved.
- `python3 scripts/manifest-check.py`, since the plugin manifest is in the diff.

**What none of these see:** whether the eight pointer edits left the package saying one thing about the push rather than eight, and whether `pfr`'s delta comments are legible to someone reading the pull request rather than the diff. The first is the whole-file judgement `#30`'s sweep owns; the second is what exercising `pfr` on this branch's own round is for, and it is the reviewer's and the owner's to read, not a gate's.

**The `build-delta` bench is the one gate here that can fail for the right reason**, so each case is watched failing first: a hunk on a line no commit in the range touched, a commit whose message names no `RF{n}`, and a body carrying `PFR1` read back through `rf_ids` to confirm it yields no `RF1`.

## Open questions

- Is the number of delta comments one `pfr` may post capped? `plugins/gh-solo/skills/pr-flow/references/post-caps.md` bounds each post's length and not the count, so a push touching forty files posts forty short comments. **Recommendation: uncapped, and named as deliberately uncapped in `pfr`'s report**, because the owner asked for this push and a count cap would hide exactly the lines they asked to be shown; `#26`'s criterion that every document the flow writes is capped or named as uncapped is satisfied by the naming.
- Does `PFR{n}` earn its place, or should a delta comment carrying no `RF{n}` be kept off the pull request entirely and reported in the terminal instead? The second is a smaller diff - no new id namespace, no edit to `plugins/gh-solo/skills/pr-flow/workflows/merge.md` - and it loses exactly the changes the owner most needs pointing at, the ones no finding asked for.
