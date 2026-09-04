> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Gate a push while a round is in flight

Closes #19. A push asked for while the reviewer is reading is refused, and the refusal names two ways forward: wait for the round report, or discard the pass, which posts the discard record and then frees the push. The owner's word still decides; it decides through a door that records what it spent.

It is the fifth branch of the #26 stack, cut from #63's tip and stacked on PR #82.

## The round has two reading windows, and only one of them is open

**The owner's reading window is already answered, and this branch leaves it alone.** `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` step 7 says "This is the round's only push, and no words ask for an earlier one", so a push asked for between the post and `rnp` has an answer: no phrasing brings one forward. Threads outdating under the owner is a cost to their own reading, and it is theirs to bear.

**The reviewer's reading window has no answer at all.** That is the gap between the spawn at step 1 and the post at step 2, and again at each step 5 rescope spawn. A push there moves the head under a subagent that has already spent minutes reading, `scripts/post-review.py build` refuses the post because the pin no longer equals the head, and the pass is gone. At a cap of one full pass that is the pull request's only pass, which is what `izkreny/groupifico#190` spent.

**Nothing in the package warns and proceeds today.** The issue's evidence describes an agent that warned and was overridden, but no file says to do that: `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` and the `implement` skill's `fix` workflow both say never to push during a round, and neither covers the owner *asking*. So this branch writes a rule where there was none rather than changing one.

## "In flight" is session-local, and that is the true answer rather than a compromise

**A reviewer is a subagent and dies with the session that spawned it**, so no fresh session can have one reading. The issue asks for a durable marker or an honestly session-local check, and for this window the choice is false: a durable marker would claim a reviewer is reading when the session holding it is gone, which is worse than no marker.

**What that cannot reach, stated where the limit lives:** a push from another session, from the owner's own terminal, or from any tool outside this flow. Those are caught after the fact rather than prevented, by the pin comparison `scripts/post-review.py build` already makes - verified at `plugins/gh-solo/skills/pr-flow/scripts/post-review.py:644`, which refuses when `--pinned-head` and `--head-now` disagree. The gate this branch adds is the cheap half; that comparison is the backstop, and #15 and #24 built it.

**The trunk-push hook is not the mechanism, and the plan says so** to stop a later reader reaching for it. `plugins/gh-solo/hooks/ask-before-trunk-push.py` guards the trunk only, and a `PreToolUse` hook cannot see whether a subagent is mid-read, so it can neither know the window nor name the exits.

## The refusal, and the two exits

**Discarding the pass needs no new mechanism.** `scripts/post-review.py discard` takes a disclaimer, the head the pass was told to read, a reason and an output path, and no findings file - so a pass with nothing returned yet can still be charged. That is what makes the second exit honest: the count on the pull request reflects a pass that was spent, and the next session can tell a spent pass from an unspent one.

**Warn-and-proceed was the alternative and it loses the count.** A pass killed by a push it was warned about leaves no discard record, so `scripts/post-review.py passes` reads as though it never ran and the cap that exists to bound a runaway round silently gains a pass. The refusal is not about doubting the owner; it is about the round being able to say what it cost.

**#18 will want this shape and should not rebuild it.** Its third criterion asks that ending a round early be a named outcome with a stated shape, and the discard exit is one. This branch does not do #18's work: it names the exit for the in-flight push and nothing else.

## Every path that can push, and which one needs the check

| Path | During the reviewer's read? |
|---|---|
| The owner asking in the session | Yes. This is the case the issue is about |
| `gh stack sync` and `gh stack push`, per `plugins/gh-solo/skills/pr-flow/workflows/stack.md` | Yes, and uncovered. Its existing refusal at that file's `sync` section is keyed on a round holding *unpushed fix commits*, which is the owner's window; during the reviewer's read no fix commits exist yet, so the refusal does not fire |
| `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` Step 5 | No. It is the round's sanctioned push, and the reviewer's read is over by then |
| The `implement` skill's `implement` workflow, its one push and its session-ending backup | No. It runs before `ready`, so before any round exists |
| The `implement` skill's `fix` workflow | No. It already says never to push, and this branch does not touch that |
| `plugins/gh-solo/skills/pr-flow/workflows/open.md` | No. The plan push predates every round |

**The stack check is per stack, not per branch.** A force-push across the stack moves every branch in it, so a reviewer reading a *lower* branch's pull request is hit by a `sync` run from an upper one.

## Steps

- Add the answer to `plugins/gh-solo/skills/pr-flow/references/review-protocol.md`: a push asked for while a reviewer is reading is refused, the refusal names the two exits, and the reason is stated as whose call it is rather than only as what happens to the anchors.
- Define "in flight" in that file as session-local, and state what it cannot reach and what catches those cases instead.
- Give `plugins/gh-solo/skills/pr-flow/workflows/review.md` the refusal at the point it holds a spawned reviewer, with the verdict wording and the `scripts/post-review.py discard` invocation the discard exit takes.
- Extend the `sync` refusal in `plugins/gh-solo/skills/pr-flow/workflows/stack.md` to the reviewer's window, and say the check is per stack because a force-push moves every branch in it.
- Say in `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` that its own push is outside this gate, so nobody reads the new refusal as reaching step 7.
- Move `plugins/gh-solo/.claude-plugin/plugin.json` to `4.6.0`.

## Verification

- [ ] The docs-check command in `.agents/gh-solo.md`, whose exit code is read rather than its output.
- [ ] `python3 scripts/version-check.py`.

**Neither sees whether the refusal fires.** They see that paths resolve and that a version moved. The gate is prose an orchestrator follows, and the only thing that exercises it is a real push asked for while a real reviewer is reading - which is not to be manufactured, for the same reason #63's index was not: a gate seen passing on a case built to make it pass is a gate seen doing nothing.

**`scripts/version-check.py` cannot see this branch's own bump**, because `origin/main...HEAD` on an upper branch of a stack already contains every bump below it. The bump holds because this plan makes it a step.

**`mmdc` is not a gate here**, since no README flowchart changes. If one does, it joins this list.

## Open questions

- None.

## Settled

- What the refusal's verdict line calls the second exit, given the plan recommended a sentence rather than a word. It is the word `discard`, which the package already uses for this act - `scripts/post-review.py discard` and the discard record it posts - so the exit and its record wear one name instead of two.
- What the flow does about an in-flight push. It refuses the bare push and names two exits, wait or discard, rather than warning and proceeding: a pass killed after a warning leaves no discard record, so the pass count reads as though it never ran and the cap silently gains a pass.
