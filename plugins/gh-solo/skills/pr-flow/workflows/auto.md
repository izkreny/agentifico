> **Tools used:** `Bash(git:*)` for Step 1's branch check and Step 3's sync commits and pushes, `Bash(gh:*)` for Step 2's preflight and Step 3's thread and checks reads, `Write` / `Edit` for the plan amendment and the body's scratch copy, `Skill` to enter the `implement` skill at Step 3. Everything else belongs to the workflows this file chains, which run unchanged under their own tool lists.

The entrances here run the lifecycle's workflows back to back, removing the waits between them - never the checks inside them. `auto` starts at the issue; `go` starts after the owner has read the plan. Each ends at the same stop: the review protocol's step 6, the owner judging the findings, because that is the only step in the whole span that belongs to them alone.

| Command | Enters at | What it skips |
|---|---|---|
| `auto <issue-number>` | Step 1 | the plan-reading stop at the end of `workflows/open.md` |
| `go <pr-number>` | Step 2 | nothing the owner does - the plan was read; only the waits between workflows go |

**Only the literal command enters a chain.** Like the `watch` arming rule in `workflows/discuss.md`, and for a stronger reason: `auto` skips a stop that exists for the owner's judgement, so no sentence, however clearly it implies one, may start either chain. The owner typing the command is the authorisation for everything the chain does - the plan pushed unread, the implementation, the draft flip, the posts - given in advance, once, for this invocation only.

**Every refusal ends the chain.** The same rule the `ready review` chain states in `SKILL.md`, extended to every stage: a ⛔ anywhere stops with that workflow's own verdict line, carries nothing forward, and names the single command that resumes from where it stopped. A chain is a convenience; a gate is not.

## Step 1 - `auto` only: the branch, the plan, the draft PR

If `git branch --show-current` already parses to the given issue number - the parse stated once in `SKILL.md`'s branch-format bullet - the branch exists and is checked out; continue. If a branch for the issue exists but is not checked out, check it out. Otherwise create it the tracker's way, per the *Start work* section of the `tracker` skill's `state` workflow, assignment included: branch creation belongs to that skill, so read its section and follow it rather than restating it here.

Then run `workflows/open.md` in full, through its Step 5. Its Step 6 stop is the wait this command waived: where that file says to stop and wait for the plan discussion, continue to Step 3 instead. The plan and the draft PR still land exactly as that workflow makes them - the owner can read the plan at any point afterwards, and a planning decision they would have argued with can still come back later, as a review finding. That trade is this entrance's premise, and it was made when the command was typed.

The PR number `open` created carries through the rest of the chain.

## Step 2 - `go` only: confirm the PR is where this chain starts

```bash
gh pr view <pr-number> --json number,state,isDraft,headRefName,title
```

The refusals, each opening `⛔ REFUSED - {reason}` per the standing convention in `SKILL.md`:

- **The number does not resolve to a PR.** Do not silently retry it as an issue number - the placeholder rule in `SKILL.md` exists because that swap fails quietly. Say that `go` takes a PR number, and that `auto` is the entrance that takes an issue.
- **`state` is not `OPEN`.** A merged or closed PR has nothing left for this chain.
- **`isDraft` is `false`.** The implementation phase is over on this PR, and the chain would re-run work that already passed `ready`. Name `review`, `discuss` or `merge` as the likely intended entrance.

Plan-discussion threads need no check here: Step 3 settles the plan record as its first act, applying the decisions the owner settled and refusing on an unsettled thread that affects the work, and that refusal stops this chain like any other.

## Step 3 - Implementation

**Invoke the `gh-solo:implement` skill with the PR number** and follow it here, in this session. Entering it by name rather than reading its workflow file directly is what puts the implementation under that skill's own tool grant: it is the one skill in the flow that runs the repository's commands, tests and linters and builds, and this file's narrowed `Bash` cannot.

Its Step 1 settles the plan record as its first act: after `auto`'s Step 1 that is a read, since `open` just pushed the plan, and after `go`'s Step 2 it is what puts the owner's settled plan on the remote before any code exists. Its refusal on an unsettled thread that affects the work ends this chain like any other.

The handoff it produces is already posted on the PR as a comment. Relay it verbatim, then gate on it:

**`✅ ALL PASS`** - continue to Step 4.

**Anything else - any `⚠️`, or a `⛔`** - stop and relay it. Findings are the owner's to read, never the chain's to carry past.

## Step 4 - `ready`, then the review round

The `ready review` chain already defined in `SKILL.md`'s routing, exactly as written there: read `workflows/ready.md` and follow it, and when it ends green with the draft lifted, continue straight into `workflows/review.md` on the same PR. A refusal in `ready` stops this chain as it stops that one.

That workflow's own steps 1 to 5 need nothing from the owner, so the chain does not stop before them: the reviewer runs, its findings land, each gets a fix plan, the fixes are committed locally, and the re-review checks them. **Its confirmation gate does not fire here**, because the chain was entered by a PR number rather than a list, which is the same rule that workflow already applies to a named PR.

**Nothing is pushed**, exactly as in an ordinary round. The commits sit local for the owner's word, which is the protocol's step 7.

## Step 5 - Arm the watch, then one consolidated block

The chain ends where the round does, at the protocol's step 6. Two things happen here.

**Arm the watch on this PR**, per *The watch survives the round* in `references/review-protocol.md`. The owner was away for everything above and will now read the threads at their own pace, reacting and replying as they go; without a watch each of those signals waits for them to come back and say so. **This is the one place a watch is armed by anything other than the owner typing `watch`**, and it is not an exception to that rule: the literal `auto` or `go` command is itself the authorisation, given in advance, and `workflows/discuss.md` owns the mechanics and the cost.

**Then the consolidated block**, because the owner saw none of it happen: one line per stage with its verdict, so the whole run reads as one block. The numbers below are a sample - print the run's real issue and PR numbers, so every command is typeable as it stands:

```
auto: issue #50 → PR #60
  open       ✅ plan committed alone, draft PR opened
  implement  ✅ handoff posted on the PR
  ready      ✅ every gate ticked, CI green, draft lifted
  review     ⚠️ 4 findings posted, 3 fixed locally, 1 waiting on you
  watch      ✅ armed, answering as you comment
Read the threads on the PR, then react or reply:
  👍 or ❤️ accepts a finding. To question one, react 👀 or reply in the thread.
When you are through them, say "resolve all and push".
```

**RF2 is waiting on you: {why}** and one line like it per owner-gated finding, because a thread the round could not act on is the one thing in that block the owner has to act on before the merge gate will pass.

---

## Rules

- **Only the literal `auto` or `go` command enters a chain.** No sentence does, however clearly it implies one.
- **The chain removes waits, never checks.** Every composed workflow runs unchanged, every internal gate intact - a chain that skipped a gate would be indistinguishable from the gate having passed.
- **Any refusal ends the chain**, with that workflow's own verdict line first and the single resuming command below it. Nothing non-green carries forward.
- **The chain never reviews its own diff.** The reviewer is a subagent with its own context, spawned by `workflows/review.md`, and that holds here unchanged: a chain that read the diff itself would be the author judging the author.
- **The chain never pushes and never merges.** It ends at the protocol's step 6 with every fix commit local. Step 7 and `workflows/merge.md` both need words the owner has not said yet.
- **The chain arms the watch and nothing else does implicitly.** Ending at step 6 without it leaves the owner reacting into silence.
