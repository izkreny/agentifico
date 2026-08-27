> **Tools used:** `Bash(gh:*)` for `gh pr view`, `gh pr checks` and `gh pr ready`, `Bash(git:*)` for branch state. **Read-only apart from the flag** — no `gh pr edit`, and nothing here runs a project command.

Move a draft PR into the review loop, once the plan is implemented.

This is the far end of `workflows/open.md`, not a continuation of it. That workflow opens the PR as a draft at the *start* of the work and stops; this one runs after the implementation - the `implement` skill's work - has landed on the branch, usually days and several sessions later.

**The audit: every gate in `## Verification` accounted for, CI agreeing with that record, the rest of the body telling the truth, and then the flag - the first of these being most of it.** **This is the workflow that can say no** — its whole value is refusing to flip a draft whose gates did not all run, so nothing here is a formality to be got through.

## Step 1 - Audit the gates. Do not run them.

**This workflow runs nothing and ticks nothing.** The agent that implemented the plan is the agent that verified it: running the suite is the last act of implementation, and that agent ticks each box because it is the one that watched the command exit. By the time this workflow starts, the record is either complete or it is not.

Read the body's `## Verification` and verify every box has a tick.

**Every box ticked** — go to Step 2.

**Any box unticked — stop and ask the owner what to do.** Do not run the missing gate, do not tick the box, and do not reason about whether it probably would have passed. Report which boxes are empty and name what an empty box can mean, because the right response differs and only the owner can pick:

| An empty box can mean | Which needs |
|---|---|
| The gate ran and **failed** | A fix, a commit and a push — then this workflow again |
| The gate was **never run** | Someone to run it; the owner decides who and when |
| It is a **check with no exit code** — a browser walk, "restart the machine and read the row back", adjudicating another tool's findings. The template in `workflows/open.md` prefixes these `[owner]` | The owner. An agent cannot produce this evidence, and must not appear to |

**Why this workflow does not just run the missing one.** An unticked box is information: it says something upstream did not finish, and quietly completing it hides that rather than fixing it. **And running it here would consume the only independent thing this workflow has.** The box-reading is a self-audit in the weak sense, since the session that ticked them may well be the one re-reading them; what still bites is Step 2's reconciliation with CI, which is external and does not care who ticked. A gate run here would be ticked by the same session in the same environment, which is the one combination that makes a record worthless.

**Never tick a box.** Not for a gate you ran in a previous step, not for one that obviously passed, not to tidy the list. A ticked box is indistinguishable from a passed check to everyone who reads the PR afterwards — including `workflows/merge.md`, which treats the body as evidence.

**If the PR body has no `## Verification` section at all**, stop and say so. It is a required section of the plan and of the body that carries it, per `workflows/open.md`, and its absence means the branch was never told how it would be proved. That is not something to fix by inventing gates.

**One thing to check that no box covers:** hooks fire only where the hooks path is actually wired, and worktrees frequently are not, so a whole branch of commits can carry messages no linter ever saw. That surfaces as a failing conventions job on the PR long after the commits are written. Mention it if the branch was worked in a worktree.

## Step 2 - Reconcile that record with CI

```bash
gh pr checks <pr-number>
```

Step 1's boxes are self-reported from local runs, so a ticked box is evidence that a command passed *somewhere* - not that the branch is green. CI is the authority on any gate it also runs, and this is the step that asks it. **A red check refuses the flip even when every box is honestly ticked**, and the refusal names which box the check contradicts. A pending check is waited out with `gh pr checks <pr-number> --watch` rather than assumed; zero checks on a repository that has CI is itself a finding, not a pass.

**A locally green gate and a red CI check are two different environments disagreeing** - a library installed on the developer's machine and absent on the runner will pass every local run and fail every CI run of the same command, and both results are true at once. The standing rule in `SKILL.md` owns the posture: the disagreement is the finding, so report both and diagnose the difference, never re-run locally until it looks fine.

## Step 3 - Audit the rest of the body

Same posture: read, report, do not edit.

- **`## Steps`** — every step that landed should already be ticked by the agent that landed it. An unticked box whose work is plainly done is a bookkeeping miss rather than a blocker; say so and let the owner decide whether to tick it or leave the gap visible.
- **`## Open questions`** — the finished state is "None.", with every answered entry sitting in `## Settled`, question and decision together, per the body template in `workflows/open.md`. Anything still listed is either a decision nobody made - the owner's call, worth raising before reviewers read it as an open thread - or an answered question nobody moved, which is a bookkeeping miss to report like an unticked `## Steps` box, not a blocker.
- **Divergence from the plan** — where the work went somewhere the plan did not, say so. It belongs in a PR comment, never as an edit to the plan file: the plan records intent, and the gap between intent and outcome is the useful part.

**Nothing in this workflow writes to the PR.** The one write it makes is Step 4, and that is a flag rather than content.

## Step 4 - Mark it ready

```bash
gh pr ready <pr-number>
```

**This is the one line that admits the PR to review.** Until it runs, `workflows/review.md` skips the PR as a draft, which is right while work is in progress and wrong the moment it is not. A PR left in draft after the work lands never gets reviewed at all.

## Step 5 - Confirm

Open with the verdict line per the standing convention in `SKILL.md` - always `✅ ALL PASS` here, since a refusal never reaches this step; the refusals in Steps 1-3 print `⛔ REFUSED - {reason}` as their first line instead. Then one line: the PR number and URL, that it is no longer a draft, and that every `## Verification` box was already ticked with CI green on the same head — which is the fact that authorised the flip.

**If the invocation was the `ready review` chain**, per the routing in `SKILL.md`, do not stop here: continue into `workflows/review.md` on this PR, as if the owner had named it. The chain exists only to remove the wait between the two workflows; a refusal above never reaches this point, so the chain never carries a failed audit forward.

---

## Rules

- **Never run a project command here, and never tick a box.** This workflow reads the record and either accepts it or refuses. An agent that both produces and audits the evidence is not auditing anything.
- **Never mark ready with an empty `## Verification` box, and never over a red CI check.** An unticked `## Steps` box whose work is plainly done is a bookkeeping miss to report, per Step 3; the gates and the checks are the hard stops. The draft state is what buys the room to fix a red build privately; spending it on an unproven branch wastes the one advantage the draft had.
- **On any gap, stop and ask.** Each cause needs its own response and the owner picks; guessing which one applies is how a failed gate becomes a ticked box.
- **Do not review it yourself in the same breath** - unless the invocation was the `ready review` chain, which is exactly that request made explicitly. Otherwise marking ready and reviewing are separate requests; `workflows/review.md` has its own confirmation gate for a reason.
- If the branch is stacked, marking one PR ready says nothing about its siblings. Check the stack with `workflows/stack.md` before assuming the whole thing is reviewable.
