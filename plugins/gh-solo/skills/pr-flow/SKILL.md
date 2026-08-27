---
name: pr-flow
description: "Manage branches, stacked pull requests and PR review on a GitHub repository the user owns, through the `gh` CLI and the `gh stack` extension. Use when asked to write a branch's plan file, open its pull request, or mark a draft PR ready; to stack a branch, add a branch to a stack, submit, sync, restack or view a stack; when asked what a branch is stacked on; when asked to review open PRs, review a numbered PR, or check what needs review; when asked to merge or land a pull request or a stack; or when the user says they replied to review comments on GitHub and wants those answered; when the user says the review is done, that you can merge, or asks to push changes for review; or when asked to watch a PR for new comments, poll for replies, or stop watching one. Also use when the user says a branch is done or ready for review, or types `/gh-solo:pr-flow`. Assumes one committer; for the issue tracker itself use `tracker` skill."
argument-hint: "[open | plan | auto <issue-number> | go <pr-number> | ready [review] | review [pr-number] | watch [pr-number] | unwatch | discuss [pr-number] | reply [pr-number] | chat [pr-number] | merge [pr-number] | view | init | add | submit | sync | restack | help]"
allowed-tools: Bash(gh:*), Bash(git:*), Bash(python3:*), Read, Write, Edit, Grep, Glob, Monitor, TaskStop, Agent, EnterWorktree
---

> **Tools used:** `Bash(gh:*)` for the extension, PR queries and review posting, `Bash(git:*)` for branch and worktree state, `Read` / `Grep` / `Glob` for repository context, `Write` / `Edit` for plan files and PR-body scratch files, `Bash(python3:*)` for `scripts/docs-check.py` and `scripts/post-review.py`, `Monitor` / `TaskStop` for the watch in `workflows/discuss.md`, `Agent` for the `reviewer` subagent that `workflows/review.md` spawns and the `implementer` subagent that `workflows/auto.md` spawns, `EnterWorktree` for moving the session into a sibling worktree in `workflows/merge.md` and `workflows/stack.md`.

The user invoked this skill with the argument: **`$ARGUMENTS`**

This is a **routing skill**. Read `$ARGUMENTS` and the conversation context, pick exactly one workflow, read that workflow file, and follow its instructions inline.

All paths below are **relative to this skill's own directory**. Resolve them against wherever this skill is installed rather than assuming a location.

**Issue, ticket and task all mean the same thing: a GitHub issue.** The tracker itself belongs to the `tracker` skill; this one starts where a branch does.

**Every file here is written to the agent, so `you` is the agent reading it.** The human is **the owner**, always in the third person. The distinction is load-bearing wherever authority is: a rule about who may approve a merge inverts if the referent slips. The exceptions are `workflows/help.md`, whose contents are printed to the owner, and `README.md`, which the owner reads rendered; both address them directly.

## Who this is for

**The owner owns the repository and is its only committer.** Others may look — a mentor who comments, the `/code-review` capability the owner invokes — but **the owner is the only reviewer with authority**: nobody else's approval gates a merge and nobody else is accountable for what ships. That is what makes `workflows/review.md` a pass that prepares the owner's review rather than a substitute for it, and why `REQUEST_CHANGES` on their own PR is a note to themselves. If a second person commits to the repository, stop and say so: the confirmation gates and the assumption that a PR's author and its reviewer are the same person both stop making sense.

## Standing conventions

**Placeholders name what they hold.** `{issue-number}` and `<pr-number>` are different values and a PR almost never shares a number with the issue it closes, so swapping them fails quietly rather than erroring: `gh issue view <pr-number>` returns a real issue, just the wrong one. Braces mark a field inside a format string, angle brackets mark a command argument, and `<stack-number>` is a third value again — the stack's own id, not a PR's. `{owner}` and `{repo}` are the one pair that only looks like the first kind: type them verbatim and `gh` substitutes them itself — in endpoints and `-F` values only, never inside `-f` strings, per the placeholder note in `workflows/discuss.md`.

- Branch format `{type}/GHI-{issue-number}_{slug}`, one issue per branch. **Defined under *Quick reference* in the `tracker` standards**, which owns it because the format encodes an issue key, alongside the commit header and the PR title; the `{type}` vocabulary itself is one section further on, under *Branch and commit type*. Nothing here chooses a type; this skill only ever parses the number out of a branch that already exists, and the parse is stated here once so it cannot drift: drop everything up to and including the first `/`, take everything before the first `_`, strip the `GHI-` prefix - `feat/GHI-50_login-form` gives `50`. Follow the repository's existing names where they differ.
- **A branch's PR is opened as a draft at the start of the work, not the end**, carrying the plan file. `workflows/open.md` has the sequence; `gh pr ready` is what later admits it to the review loop.
- **HARD RULE: never commit or push directly to `main`.** `gh stack merge` lands PRs; pushing `main` yourself stays forbidden even when it would be faster.
- New dependent work is cut from the parent branch's tip, then `gh stack add` when tracked, or `gh pr create --base <parent>` when not.
- **The remote's name is a per-repo fact, never assumed.** `origin` is only `git clone`'s default, and a repository whose one remote is named `upstream` fails every hardcoded `origin` command outright. Where a workflow writes `<remote>`, resolve it by the recipe stated here once: `git remote` printing exactly one name means that name; with several, use the one `main` tracks (`git config branch.main.remote`), and ask the owner if that is unset. Pushing outside the tool, the first push of a branch is `git push -u <remote> <branch>`. The trunk's name is the same kind of fact: these files write `main` because every repository this skill serves uses it, and where a repository's default branch is named otherwise, that name is a per-repo fact for `.agents/github.md` and every `main` in these files reads as it.
- **After any push to a branch with an open PR, read `gh pr checks <pr-number>` before reporting the push as done.** The ticked boxes are local evidence and CI is a different environment; a locally green gate and a red check are not a contradiction to resolve by preferring one - the disagreement is itself the finding. Report both and diagnose the difference; never re-run locally until it looks fine.
- **Every gate workflow ends on a verdict line, and every refusal opens with one.** The gate workflows are `ready`, both passes of `review`, and `merge`. Their Confirm step's first line is `✅ ALL PASS` when nothing failed, `⚠️ PASSED WITH FINDINGS - {what}` when the workflow completed but left something for the owner to read, and a stop anywhere prints `⛔ REFUSED - {reason}` as its first line. It is the line the owner reads first; the detail above it is the record, not the message.
- **A command printed for the owner to run sits alone on its own line, starting at column one.** Never indented, never sharing a line with prose, never prefixed - the owner pastes the whole line into a shell, and a single leading space or trailing word breaks the paste. When a verdict line names a next command, the command goes on the line below it, flush left.
- **Every PR gets `--assignee @me` at creation and `Closes #{issue-number}` in its body.** GitHub sets neither for you. The first feeds the in-progress view described in `tracker`; the second closes the issue on merge and records the link permanently.
- **Whoever runs a gate ticks its box; nobody else ever does.** The PR body's `## Steps` and `## Verification` checkboxes are ticked by the agent that did the work or watched the command exit, at the moment it happened. A tick applied by anyone else is indistinguishable from evidence and is not evidence. `workflows/ready.md` audits that record and deliberately cannot write to it. The same rule reaches the issue's acceptance criteria: the implementing agent ticks each as it verifiably lands, per *Writing good acceptance criteria* in the `tracker` standards, and `workflows/merge.md` audits those at the door too.
- **Editing a PR body is read, modify, write.** `gh pr edit --body` replaces the whole body, so fetch it first (`gh pr view <pr-number> --json body --jq .body`), edit that file, and pass it back with `--body-file` — never `--body "…"`, which mangles multi-line markdown. Keep the scratch file outside the working tree - the harness scratchpad is the place - so a copy of the body cannot get committed.
- **Never invent a repository's check commands.** They belong to the repo, named in the plan's `## Verification` and otherwise in its per-repo agent config or its `CONTRIBUTING`. Whether a branch's gates all actually ran is audited by `workflows/ready.md`.
- **The diff analysis is done by a code-review capability this plugin does not ship, and `/code-review` is only its commonest name.** These files write `/code-review` throughout because that is what Claude Code calls the one it bundles; on a harness that names it otherwise, substitute that name wherever these files print or discuss the command, and everything around it is unchanged. What the flow actually requires is a capability the **owner** invokes: `workflows/review.md` Pass 1 prints its command and stops, Pass 2 records what came back, and `workflows/merge.md` gates on that record. Where the harness has no such capability at all, the owner's own read of the diff is the analysis - they post the findings themselves as inline threads, Pass 2 records that round exactly as it records a machine one, and the merge gate is satisfied by the same record. What is never substitutable is who starts it, per *Who this is for* above and the never-invoke rule in `workflows/review.md`.
- **The AI disclaimer opens everything posted under the owner's name** - PR bodies, comments, Reviews, thread replies. Where the user's global instructions file defines a disclaimer line, that line owns the wording and the rules; absent one, this plugin's default is `> 🤖 Written by AI --- read/modified by human! 🤓`. **Whatever the wording, it opens with `> 🤖`.** That prefix is the whole of what the gates test - the watch filter's `--jq` in `workflows/discuss.md` tests it literally - so the tail after it is the owner's to change and the prefix is not.
- **A `via` line follows the disclaimer on every comment, Review and thread reply**, naming the process that posted it. Every post is made with the owner's credentials, so the disclaimer alone says only that *an* agent wrote it - an implementer's record, a divergence note and a review finding on the same PR are otherwise indistinguishable, to the owner included. It is the second paragraph of the disclaimer's own blockquote, so every `startswith` test on the disclaimer - the watch filter in `workflows/discuss.md`, the gates in `workflows/merge.md`, `workflows/review.md`'s recognition of its own records - keeps working untouched:

  ```markdown
  > 🤖 Written by AI --- read/modified by human! 🤓
  >
  > via `<skill>` <workflow>, <which post>
  ```

  So: via `implement` implement, the implementation record; via `pr-flow` review, pass 1 convention check; via `pr-flow` discuss, thread reply. The one exception is the PR body, which carries the disclaimer alone: it is unmistakably itself, and per `workflows/merge.md` it lands in the squash commit on `main`, where a workflow tag would be noise.
- **Repository-specific conventions live in the repository**, in its agent config file (`.agents/github.md`, or `.claude/github.md` where that is what the repo uses). Read it when present and let it override the defaults here. Nothing repo-specific belongs in this skill.

## Preflight, once per session

Run `gh auth status`. If `gh` is missing, or it runs but exits non-zero, stop and say which of the two it was: the fixes differ, `gh auth login` for the second and an install for the first. Every later step depends on it.

Then `gh repo view --json nameWithOwner,viewerPermission`. Every command here infers the repository from the working directory, and this skill's writes include merges, repository settings and branch protection — the wrong directory aims all of them at the wrong repository. Confirm the resolved name is the intended one before any write, and say so rather than proceeding when it is not.

Issue context comes from the same `gh`, so a headless run under `claude --print` or cron gets the same issue context an interactive one does.

---

## Routing

| The owner says | Workflow |
|---|---|
| "stack a branch", "add to the stack", "submit", "sync", "restack", "view the stack", "what is this stacked on" | `workflows/stack.md` |
| "review open PRs", "review PR 60", "what needs review", "review unreviewed PRs" | `workflows/review.md` |
| "write the plan", "open the PR", "start on this branch" | `workflows/open.md` |
| "mark it ready", "it's done", "ready for review", "take it out of draft" | `workflows/ready.md` |
| `auto 50` - the literal command, with an issue number | `workflows/auto.md` from the top: plan and draft PR, the implementer subagent, `ready`, `review` Pass 1, stop at the `/code-review` handoff |
| `go 60` - the literal command, with a PR number | `workflows/auto.md` at its `go` entrance: the same chain minus `open`, for a plan the owner has already read |
| "merge it", "land this", "merge the PR", "merge the stack" | `workflows/merge.md` - but said while a review round has left fix commits unpushed, it means step 5.1 of `references/review-protocol.md` first, which checks the threads and pushes before any merge |
| "I replied on the PR", "answer my comments", "I asked something on the review" | `workflows/discuss.md` |
| "we are done", "you can merge" - said after a review round left fix commits unpushed | step 5.1 of `references/review-protocol.md`: stop any watch, check every thread is resolved with an owner reply *before* pushing, then push, wait for green checks, then `workflows/merge.md` |
| "push for review", "push changes for review" | step 5.2 of `references/review-protocol.md`: push, read the checks, post the follow-up threads, back to the round - a running watch keeps running |
| "stop watching", "you can stop polling now", "unwatch" | stop the monitor; see *Stopping it* in `workflows/discuss.md` |

Based on the argument above, do exactly one of the following:

- If the argument is exactly `help` → read `workflows/help.md`, output its contents, stop.
- If it starts with `review` → read `workflows/review.md` and follow it.
- If it starts with `open` or `plan` → read `workflows/open.md` and follow it.
- If it starts with `auto` followed by a number → read `workflows/auto.md` and follow it from the top. **Only the literal command enters it** - the chain skips the plan-reading stop, so no sentence routes here, however clearly it implies one.
- If it starts with `go` followed by a number → read `workflows/auto.md` at its `go` entrance. The same arming rule: literal command only.
- If it starts with `ready` → read `workflows/ready.md` and follow it. **If the argument also contains `review`** (`ready review`, `ready review 60`) → when `ready` ends green with the draft lifted, continue straight into `workflows/review.md` Pass 1 on the same PR, as if the owner had named it. A refusal in `ready` stops the chain, and the chain changes nothing inside either workflow - it only removes the wait between them.
- If it starts with `discuss`, `reply` or `chat` → read `workflows/discuss.md` and follow it. **`sync` never means this**, however the request is phrased: that word belongs to the cascade rebase in `workflows/stack.md`, and confusing the two rewrites history when someone asked for a conversation.
- If it starts with `watch` → read `workflows/discuss.md` and arm its watch. **Only this literal command arms it** — no sentence does, however clearly it implies one.
- If it starts with `unwatch`, or the owner says to stop watching in any words → stop the monitor with `TaskStop` and confirm it is gone. Arming needs the exact command; stopping deliberately does not, because a stop misread costs nothing and a stop missed leaves something running.
- If it starts with `merge` → read `workflows/merge.md` and follow it, **including when the PR is stacked**. It is the single entry point for landing anything, and it routes to `gh stack merge` itself. Sending a stacked merge to `workflows/stack.md` instead skips the review gate.
- If it starts with `view`, `init`, `add`, `submit`, `sync` or `restack` → read `workflows/stack.md` and follow it.
- If the request is about a branch's relationship to another branch → read `workflows/stack.md`.
- If the request is to implement the plan, continue the implementation, or land review fixes → wrong skill; that work belongs to `implement`. Everything around it - `open` before, `ready`, `review` and `merge` after - stays here. The one path from this skill into that work is `workflows/auto.md`, whose chains spawn the `implementer` subagent rather than doing the work here.
- If it is about an issue rather than a branch or a PR → this is the wrong skill; use `tracker`.
- Otherwise → read `workflows/help.md`, output its contents, and say which argument failed to match anything above.

## Supporting files

- **`workflows/open.md`** - plan file, first commit and draft PR, at the start of a branch's life
- **`workflows/auto.md`** - the `auto` and `go` chains: the lifecycle's workflows run back to back with the waits removed and every gate intact, ending at the `/code-review` handoff. Literal commands only, because each skips a stop that is the owner's
- **`workflows/ready.md`** - the other end: auditing that every stated gate ran and that CI agrees with the record, then taking the PR out of draft. It runs nothing and writes nothing but the flag
- **`scripts/docs-check.py`** - verifies every backticked path resolves and every code fence closes; run it before pushing a docs or plan change, since no hook will. `--ignore <glob>`, repeatable, skips path spans that belong to another tree
- **`workflows/stack.md`** - the `gh stack` prerequisites, when a stack is wanted at all, the layers of stack state, the worktree trap, and the drift playbook. Everything stack-specific lives there rather than here, because it has exactly one reader
- **`workflows/review.md`** - the review round: scoping and gating a PR, the tracker checks, spawning the `reviewer` subagent, posting what it found, landing the fixes locally and stopping at the owner
- **`scripts/post-review.py`** - builds the one API call that lands a round's threads and its record Review together, refusing the whole round on any invalid finding, and afterwards reconciles what the PR carries against what was sent; `scripts/test-post-review.sh` is its bench
- **`workflows/merge.md`** - the end of a branch's life: the reviewed-or-not gate, the last checklist audit, the squash merge, branch cleanup, and confirming the issue actually closed
- **`workflows/discuss.md`** - answering the owner's replies on inline comment threads, in the thread; also the `watch` poll loop and what ends it
- **`workflows/help.md`** - the one file addressed to the owner rather than the agent; output it verbatim on `help` and add nothing to it
- **`references/review-protocol.md`** - the review round protocol, stated once: RF ids and severities, orders get fix-and-commit but never a push, the owner's step-5 words, and the conclusions the `review` and `merge` gates enforce
