> **Tools used:** `Bash(git:*)` for Step 1's branch check and Step 3's sync commits and pushes, `Bash(gh:*)` for Step 2's preflight and Step 3's thread and checks reads, `Write` / `Edit` for the plan amendment and the body's scratch copy, `Skill` to enter the `implement` skill at Step 3. Everything else belongs to the workflows this file chains, which run unchanged under their own tool lists.

The entrances here run the lifecycle's workflows back to back, removing the waits between them - never the checks inside them. `auto` starts at the issue; `go` starts after the owner has read the plan. Each ends at the same stop: `review` Pass 1's handoff line, because the step after it belongs to the owner alone.

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

**`⚠️ PASSED WITH FINDINGS` whose only findings are unticked `[owner]` boxes** - the normal case for a plan with judgement checks, and the verdict `implement`'s implement workflow assigns it - stop. `workflows/ready.md` refuses on any empty box, and these are boxes only the owner can close, so running Step 4 anyway would end in that refusal. Name each box, then print the command that resumes once the owner has done and ticked them:

```
/gh-solo:pr-flow ready review <pr-number>
```

**Anything else - a `⚠️` carrying more than those boxes, or a `⛔`** - stop and relay it. Findings are the owner's to read, never the chain's to carry past.

## Step 4 - `ready`, then `review` Pass 1

The `ready review` chain already defined in `SKILL.md`'s routing, exactly as written there: read `workflows/ready.md` and follow it, and when it ends green with the draft lifted, continue straight into `workflows/review.md` Pass 1 on the same PR. A refusal in `ready` stops this chain as it stops that one.

## Step 5 - The stop, and one consolidated block

Pass 1's ending is this chain's ending - the same handoff, reached without the waits. What this step adds is consolidation, because the owner was away for all of it: one line per stage with its verdict, so the whole run reads as one block, then the handoff command flush left, exactly as Pass 1 prints it. The numbers below are a sample - print the run's real issue and PR numbers, so the command is typeable as it stands:

```
auto: issue #50 → PR #60
  open       ✅ plan committed alone, draft PR opened
  implement  ✅ handoff posted on the PR
  ready      ✅ every gate ticked, CI green, draft lifted
  review     ✅ conventions clean
Next, the one step reserved for you:
/code-review high 60 --comment
```

The chain must not take that last step for the owner, under any circumstances: starting `/code-review` is reserved to the owner, per *What this workflow does not do* in `workflows/review.md`, and a chain that ran it would spend their analysis budget on their behalf and erase the one stop this chain keeps. Once the owner has run it and Pass 2 has recorded the outcome, the two things this chain produced sit on the PR together - the implementation's handoff comment and the inline findings - which is the point of entering it: one sitting to read both.

---

## Rules

- **Only the literal `auto` or `go` command enters a chain.** No sentence does, however clearly it implies one.
- **The chain removes waits, never checks.** Every composed workflow runs unchanged, every internal gate intact - a chain that skipped a gate would be indistinguishable from the gate having passed.
- **Any refusal ends the chain**, with that workflow's own verdict line first and the single resuming command below it. Nothing non-green carries forward.
- **The implementation is always the spawned subagent's**, never done inline by the agent running the chain: `ready`'s audit depends on the auditor not being the author.
- **Never invoke `/code-review`, and never replicate its analysis.** The rule is `workflows/review.md`'s and holds here unchanged; the chain ends by printing the command.
- **The chain never merges.** It ends before the owner has read anything. Everything from the code review onward - the threads, the fixes, the step-5 words of `references/review-protocol.md`, `workflows/merge.md` - is untouched by it.
