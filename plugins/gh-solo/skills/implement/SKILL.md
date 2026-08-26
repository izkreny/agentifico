---
name: implement
description: "Implement the plan on a branch whose draft PR already exists, or apply review fixes to it, on a GitHub repository the user owns. Use when asked to implement a plan, start or continue the implementation, work on or pick up a numbered PR or its branch, resume work after a break, or when the owner says which review findings to fix - fix all, fix specific ones. Not for opening the PR, marking it ready, reviewing or merging - that is the `pr-flow` skill - nor for the issue tracker, which is `tracker`."
argument-hint: "[<pr-number> | fix <pr-number> [which findings]]"
allowed-tools: Agent, Bash, Read, Write, Edit, Grep, Glob, TodoWrite, EnterWorktree
---

> **Tools used:** `Agent` to spawn the `implementer` subagent, which is how every ordinary invocation runs. The rest is the subagent's: bare `Bash` rather than a narrowed list, because this is the one skill in the flow that runs the repository's own commands - tests, linters, builds - and those cannot be enumerated here. `Bash(gh:*)` and `Bash(git:*)` carry the PR and branch work; `Read` / `Write` / `Edit` / `Grep` / `Glob` carry the code itself; `TodoWrite` mirrors the plan's `## Steps` into the session todo list during implementation; `EnterWorktree` moves the session into the branch's worktree where the owner keeps one.

The user invoked this skill with the argument: **`$ARGUMENTS`**

This is a **routing skill**. Read `$ARGUMENTS`, pick exactly one workflow per *Routing* below - then who executes it depends on who you are:

- **You are the `implementer` subagent** - your system prompt opens by naming you that. Preflight, then follow the matched workflow inline. This is the recursion stop; never spawn another implementer.
- **You are not the implementer** - an ordinary session where the owner typed the command, or an `auto`/`go` chain. Spawn the `gh-solo:implementer` agent with `$ARGUMENTS` passed through verbatim - plus, for a `fix`, the owner's exact words about which findings stand - and relay its report to the owner word for word: the verdict line, the record, the next command alone on its line. Never do the workflows' own work inline, and never summarise the handoff. If no `gh-solo:implementer` agent is registered, stop and say so. Before an `implement` spawn - never a `fix`, whose state the review protocol owns unpushed - sync the record the implementer will trust:
  1. Check out the branch and pull, then read the plan-discussion threads whole, with the GraphQL `reviewThreads` query from Step 1 of the `pr-flow` skill's discuss workflow - the REST comments endpoint has no resolution state - and drop the resolved ones. An unsettled thread that affects the work: `⛔ REFUSED - {which thread}`, spawn nothing.
  2. Apply any settled decision the plan or body does not yet reflect: a new `docs:` commit - never `git commit --amend` on the plan commit, which would force-push away the threads that record why the plan changed - and the PR body updated **whole**: each answered `## Open questions` entry moved to `## Settled` with its decision, question included - moved, never deleted, per the body template in the `pr-flow` skill's open workflow - and `## Open questions` left reading "None." once nothing remains open.
  3. Push the unpushed plan commits - the discuss rounds held them for the owner's word, and the owner's command is that word - then read `gh pr checks <pr-number>`, per the contract. Unpushed commits that are **not** plan commits mean a session died before its backup push: name them to the owner and spawn anyway. That is the ordinary resume, and `workflows/implement.md` Step 1 takes it as one - do not push them here, because whether they are finished work is Step 2's reconciliation to make, not this step's.

The split is deliberate twice over: implementation runs on the subagent's cheaper pinned model while the orchestrating session keeps its context for what follows, and `ready`'s audit in `pr-flow` means something only because the auditor is not the author.

All paths below are **relative to this skill's own directory**. Resolve them against wherever this skill is installed rather than assuming a location.

**Every file here is written to the agent, so `you` is the agent reading it.** The human is **the owner**, always in the third person - the same voice rule as `pr-flow`, and for the same reason. The exception is `README.md`, which the owner reads rendered and which addresses them directly.

## Where this sits

This skill is step 3 of a branch's life, the one the `pr-flow` lifecycle lists as *implementation - not this skill*. Everything around it stays there: `open` created the draft PR this skill requires, `ready` audits what this skill leaves behind, `review` and `merge` come later. **You never do their work from here** - never lift the draft, never post a review, never merge.

It is also written to be **resumable across sessions**: all state lives on the PR and the branch - ticked boxes, commits - and none in the session. A fresh session, or a fresh spawned agent, picks up mid-implementation by reading that state, which is what `workflows/implement.md` Step 2 does.

## The contract

Both workflows share these; each is stated once here.

- **The repository says how it is built and tested; this skill never does.** The carriers: the repo's own agent instructions (`AGENTS.md` or `CLAUDE.md`, loaded into the session automatically) for how code is written and tested here, and `.agents/github.md` (or `.claude/github.md`) for its check commands. Read both at the start; where either is absent or silent on testing, that is a **named finding for the handoff**, never a licence to improvise - the never-invent-check-commands rule in the `pr-flow` skill holds here too.
- **The floor under every repository:** a behavior change carries a test, the repo's stated gates are the gates that run, and a branch whose plan names no gates in `## Verification` stops the work with a question rather than shipping unverified code.
- **Commit headers are `{type}: {description} (#{issue-number})`**, per *Quick reference* in the `tracker` standards - the issue number, parsed from the branch name as the `pr-flow` skill's branch-format bullet states, never the PR number. The commit body carries the AI disclaimer line, per the AI-disclaimer bullet in the `pr-flow` skill's `SKILL.md`, which owns the wording and its fallback. Where the owner's global instructions file also sets a commit-body wrap and replaces the `Co-Authored-By` trailer, that file governs both.
- **Every PR comment and thread reply opens with the AI disclaimer and, under it, the `via` line** naming this skill and the workflow that posted it, per the standing convention in the `pr-flow` skill's `SKILL.md`. Every post lands under the owner's login, so the pair is the only thing that keeps an implementation record, a divergence note and a review finding tellable apart on the same PR.
- **Whoever runs a gate ticks its box, at the moment it happens - and nobody ticks `[owner]` boxes.** Same standing convention as `pr-flow`: the tick is evidence only because the ticker watched the command exit. An `[owner]`-prefixed box in `## Verification` is a judgement check only the owner can make; leave it empty and name it in the handoff.
- **Editing a PR or issue body is read, modify, write.** Fetch the body first (`gh pr view <pr-number> --json body --jq .body`, `gh issue view <issue-number> --json body --jq .body`), edit a scratch copy outside the working tree, pass it back with `--body-file`. `--body "…"` mangles multi-line markdown, and a scratch file inside the tree can get committed.
- **The remote's name and the trunk's name are per-repo facts, never assumed.** Resolve `<remote>` by the recipe in the `pr-flow` skill's remote-name convention; every `main` below reads as the repository's actual default branch.
- **After any push, read `gh pr checks <pr-number>` before reporting the push as done.** A locally green gate and a red check are two environments disagreeing; the disagreement is the finding. Report both and diagnose the difference - never re-run locally until it looks fine.
- **An issue body edit that adds prose opens with the AI disclaimer line**, per the AI-disclaimer bullet in the `pr-flow` skill's `SKILL.md`, and no `via` line: issue bodies sit outside the `via` convention, whose surfaces its owning bullet in the `pr-flow` skill's `SKILL.md` names.
- **Both workflows end on a verdict line**, adopting the `pr-flow` convention: `✅ ALL PASS`, `⚠️ PASSED WITH FINDINGS - {what}`, and any stop opens with `⛔ REFUSED - {reason}`. A command printed for the owner sits alone on its own line at column one.
- **HARD RULES:** never commit or push to `main`; never mark the PR ready; never merge; never edit the plan file to record divergence - the gap between intent and outcome goes to a PR comment, per `workflows/implement.md` Step 4, and the one legitimate plan edit is a new commit executing a decision the owner settled in a plan-discussion thread, made by the spawning session per the spawn steps above and never by the implementer - never a rewrite of the plan commit itself; never resolve a review thread - resolved is the owner's verdict, and a pushed fix only marks a thread outdated.

## Preflight, once per session

`gh auth status`, then `gh repo view --json nameWithOwner` - confirm the working directory resolves to the intended repository before writing anything, and say so rather than proceeding when it does not.

## Routing

- If the argument starts with `fix` → read `workflows/fix.md` and follow it. The rest of the argument is the PR number and, when the owner named them, which findings stand.
- Otherwise → read `workflows/implement.md` and follow it. The argument is the PR number; without one, the PR of the currently checked-out branch.

## Supporting files

- **`workflows/implement.md`** - the plan-to-commits work: locate and load, establish where the branch stands, implement step by step, verify as the last act, push, hand off to `ready review`
- **`workflows/fix.md`** - the second entrance, after `/code-review`: land the findings the owner said stand as review-fix commits grouped by coherent change, re-run what they invalidated, leave the threads for the owner's re-read
