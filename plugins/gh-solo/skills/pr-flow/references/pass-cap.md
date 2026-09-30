# The pass cap and the push gate

**`references/review-protocol.md` owns the round, and this file owns the budget of full reviewer passes and what a push costs while one is being spent.** Read it at step 1 of a round, before anything is spawned, and whenever a push is asked for while a reviewer is reading.

## The pass cap

**A pull request gets one full reviewer pass, and reaching that is a stop at the owner.** A full pass is one reading of the whole branch: the spawn at step 1, and any re-spawn that replaces a pass whose findings never reached the pull request. The scoped passes at step 5 are not full passes - each reads a commit range rather than the branch, and charging them would spend the budget three times over for one reading of the branch.

**At one full pass, a re-spawn is never available unattended, and the sites that name one say so.** Every path that loses a pass - a findings file with no path, a head that moved, a malformed file, an anchor that will not resolve, a pass the owner discarded to free a push under *The push gate, while a reviewer is reading* - is at the cap the moment it charges what it spent, so the re-spawn those sites describe is a thing the owner's word buys rather than a resumption the round can take.

That is the intended shape rather than a corner of it: a second reading of the branch with nobody watching is the cost this cap exists to refuse.

**A discarded pass counts.** It consumed the spawn, which is what is being counted, and the runaway this cap exists to bound was made almost entirely of discarded passes: a post refused, the findings thrown away, a fresh pass spawned against a diff that had moved under the last one. Counting only the passes that succeeded would leave the cheap ones charged and the expensive ones free.

**The count's source is the pull request, never the session.** Every pass leaves a marker on the reviews surface - a full pass in its record Review, a discarded one in a discard record posted in its place - and `scripts/post-review.py passes` counts them off the read the round already makes for `highest-id`. A session's own tally would die with the session, which is the failure mode: the sessions that spend passes fastest are the ones that lose them.

**The test is `{n}` at or past the cap, never equal to it, and the wording is fixed here rather than composed per round:**

```text
⛔ REFUSED - {n} reviewer passes have run on this pull request, at or past the cap of {cap}; {what} is unresolved; type authorise to charge a further pass
```

An owner-spent pass leaves the count past the cap, per *The owner's word can spend a further pass* in this section, so a test for equality would let every pass after that one through - and a string asserting `{n}` *is* the cap would be false on exactly the path the protocol grants.

`{what}` names what the pull request is left holding: the findings still open, and any the last pass could not certify closed. A stop that says only that the cap was reached hands the owner a budget and no state.

**The owner's word can spend a further pass, and the word is `authorise`, typed at that standing refusal.** It buys exactly one: **the refusal lifts for the single spawn that follows the word**, and step 1 resumes at that spawn rather than at the budget read that refused - a re-entry from the top would read the same count, refuse again, and leave the owner typing the word at a stop that never moves. That pass leaves its own marker like any other, and the next stop arrives one pass later.

**Only the literal word buys it**, never a sentence that reads as agreement - the same rule, and the same reason, as *Arming it, on the `watch` command and nothing else* in `workflows/watch.md`: what this cap exists to refuse is a reading of the branch nobody asked for, and prose is how one gets taken anyway.

The cap bounds the block nobody is watching, not the pull request: work that genuinely earns a further reading gets one when they ask for it, and a cap they could not pass would block such a branch, the cheap way out of which is to stop counting.

## The push gate, while a reviewer is reading

**A push asked for while a reviewer is reading is refused, and the refusal names the ways out: wait for the round report, or discard the pass.** The window is the gap between the spawn at step 1 and the post at step 2, and again at each scoped spawn at step 5. A push landing in it moves the head under a subagent that has already spent minutes reading; `scripts/post-review.py build` then refuses the post, because the pin and the head differ, and everything that pass read is thrown away.

**The refusal is about whose call it is, not only about what happens to the anchors.** The owner's own reading window is theirs to spend as they like, which is why step 7 answers a push there with "no words ask for an earlier one" and leaves the cost of outdated threads with them. This window is not theirs in the same way: what a push spends here belongs to a process whose state they cannot see, and under *The pass cap* it may be the only reading of the branch this pull request ever gets. The refusal therefore does not overrule them - it makes the spend go through a door that records what it cost.

**Warn-and-proceed is why a warning is not the answer.** A pass killed by a push it was warned about leaves no discard record, so `scripts/post-review.py passes` reads as though it never ran and the cap silently gains a pass. Each exit under *The exits* leaves the count true instead.

### The exits

**Each exit does something different to the round, and the verdict line says which:**

- **Wait** changes nothing. The reviewer finishes, the round posts at step 2, and the push is the owner's to ask for at step 7, which is where it was going.
- **Discard**, the word they type while the refusal stands, posts the discard record for that pass, charges it under *The pass cap*, and then frees the push. At a cap of one that charge puts the pull request at the cap, so the round ends there: a further reading of the branch is the owner's to buy with `authorise` rather than the round's to resume. `workflows/review.md` owns the invocation and the verdict's wording.

**`discard` is a word typed at a standing refusal, never a routing argument.** Nothing in `SKILL.md` routes it and nothing should: it means something only while this session is holding a reviewer, and a route would make it typeable when there is no pass to charge.

**`authorise` is the same kind of word, and it needs one thing said out loud that `discard` does not.** `SKILL.md`'s resolve entrance takes the owner's authorisation of the resolve and the push *in any words*, deliberately, so a bare `authorise` is a sentence that entrance would otherwise match - and matching it there pushes the round's unpushed fixes instead of buying a pass, which is the one irreversible act in the flow and the exact thing the push hold exists to prevent. So the word buys a pass and routes nowhere, and `SKILL.md` states the exclusion at the entrance that would have swallowed it.

### "In flight" is session-local

**A reviewer is a subagent and dies with the session that spawned it**, so the question is only ever whether *this* session holds a pass between its spawn and its post. A durable marker on the pull request would be worse than none: it would go on claiming a reviewer is reading after the session holding it is gone, and refuse every later push in the name of a round nobody can finish.

**What that cannot reach, stated where the limit lives:** a push from another session, from the owner's own terminal, or from any tool outside this flow. Those are caught after the fact rather than prevented, by the pin comparison `scripts/post-review.py build` makes at step 2 and refuses on. This gate is the cheap half; that comparison is the backstop.

**The trunk-push hook is not the mechanism.** `../../hooks/ask-before-trunk-push.py` guards the trunk only, and a `PreToolUse` hook cannot see whether a subagent is mid-read, so it can neither know the window nor name the exits.
