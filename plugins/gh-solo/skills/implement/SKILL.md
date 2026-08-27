---
name: implement
description: "Implement the plan on a branch whose draft PR already exists, or apply review fixes to it, on a GitHub repository the user owns. Use when asked to implement a plan, start or continue the implementation, work on or pick up a numbered PR or its branch, resume work after a break, or when the owner says which review findings to fix - fix all, fix specific ones. Not for opening the PR, marking it ready, reviewing or merging - that is the `pr-flow` skill - nor for the issue tracker, which is `tracker`."
argument-hint: "[<pr-number> | fix <pr-number> [which findings]]"
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, TodoWrite, EnterWorktree
---

> **Tools used:** bare `Bash` rather than a narrowed list, because this is the one skill in the flow that runs the repository's own commands - tests, linters, builds - and those cannot be enumerated here; `gh` and `git` carry the PR and branch work inside it. `Read` / `Write` / `Edit` / `Grep` / `Glob` carry the code itself; `TodoWrite` mirrors the plan's `## Steps` into the session todo list during implementation; `EnterWorktree` moves the session into the branch's worktree where the owner keeps one.

The user invoked this skill with the argument: **`$ARGUMENTS`**

This is a **routing skill**. Read `$ARGUMENTS`, pick exactly one workflow per *Routing* below, and follow it **inline, in this session**.

**Implementation runs in the session that holds the context for it.** That session has read the plan, or has heard which findings the owner said stand, and it knows why the code is shaped as it is. It will not undo something deliberate the way a cold agent does, and it does not have to be told in a prompt what it already knows. **Never hand this work to a subagent**, and never summarise a workflow's handoff: the handoff is the record, and it is printed as the workflow wrote it.

Settling the plan record is the first act of `workflows/implement.md` Step 1 rather than something done before starting, because there is no before. A `fix` never does it: the review protocol in the `pr-flow` skill owns that state, unpushed.

All paths below are **relative to this skill's own directory**. Resolve them against wherever this skill is installed rather than assuming a location.

**Every file here is written to the agent, so `you` is the agent reading it.** The human is **the owner**, always in the third person - the same voice rule as `pr-flow`, and for the same reason. The exception is `README.md`, which the owner reads rendered and which addresses them directly.

## Where this sits

This skill is step 3 of a branch's life, the one the `pr-flow` lifecycle lists as *implementation - not this skill*. Everything around it stays there: `open` created the draft PR this skill requires, `ready` audits what this skill leaves behind, `review` and `merge` come later. **You never do their work from here** - never lift the draft, never post a review, never merge.

It is also written to be **resumable across sessions**: all state lives on the PR and the branch - ticked boxes, commits - and none in the session. A fresh session picks up mid-implementation by reading that state, which is what `workflows/implement.md` Step 2 does.

## The contract

Both workflows share these; each is stated once here.

- **The repository says how it is built and tested; this skill never does.** The carriers: the repo's own agent instructions (`AGENTS.md` or `CLAUDE.md`, loaded into the session automatically) for how code is written and tested here, and `.agents/gh-solo.md` (or `.claude/gh-solo.md`) for its check commands. Read both at the start; where either is absent or silent on testing, that is a **named finding for the handoff**, never a licence to improvise - the never-invent-check-commands rule in the `pr-flow` skill holds here too.
- **The floor under every repository:** a behavior change carries a test, the repo's stated gates are the gates that run, and a branch whose plan names no gates in `## Verification` stops the work with a question rather than shipping unverified code.
- **Commit headers are `{type}: {description} (#{issue-number})`**, per *Quick reference* in the `tracker` standards - the issue number, parsed from the branch name as the `pr-flow` skill's branch-format bullet states, never the PR number. The commit body carries the AI disclaimer line, per the AI-disclaimer bullet in the `pr-flow` skill's `SKILL.md`, which owns the wording and its fallback. Where the owner's global instructions file also sets a commit-body wrap and replaces the `Co-Authored-By` trailer, that file governs both.
- **Every PR comment and thread reply opens with the AI disclaimer and, under it, the `via` line** naming this skill and the workflow that posted it, per the standing convention in the `pr-flow` skill's `SKILL.md`. Every post lands under the owner's login, so the pair is the only thing that keeps an implementation record, a divergence note and a review finding tellable apart on the same PR.
- **Whoever runs a gate ticks its box, at the moment it happens - and nobody ticks `[owner]` boxes.** Same standing convention as `pr-flow`: the tick is evidence only because the ticker watched the command exit. An `[owner]`-prefixed box in `## Verification` is a judgement check only the owner can make; leave it empty and name it in the handoff.
- **Editing a PR or issue body is read, modify, write.** Fetch the body first (`gh pr view <pr-number> --json body --jq .body`, `gh issue view <issue-number> --json body --jq .body`), edit a scratch copy outside the working tree, pass it back with `--body-file`. `--body "…"` mangles multi-line markdown, and a scratch file inside the tree can get committed.
- **The remote's name and the trunk's name are per-repo facts, never assumed.** Resolve `<remote>` by the recipe in the `pr-flow` skill's remote-name convention; every `main` below reads as the repository's actual default branch.
- **After any push, read `gh pr checks <pr-number>` before reporting the push as done.** A locally green gate and a red check are two environments disagreeing; the disagreement is the finding. Report both and diagnose the difference - never re-run locally until it looks fine.
- **An issue body edit that adds prose opens with the AI disclaimer line**, per the AI-disclaimer bullet in the `pr-flow` skill's `SKILL.md`, and no `via` line: issue bodies sit outside the `via` convention, whose surfaces its owning bullet in the `pr-flow` skill's `SKILL.md` names.
- **Both workflows end on a verdict line**, adopting the `pr-flow` convention: `✅ ALL PASS`, `⚠️ PASSED WITH FINDINGS - {what}`, and any stop opens with `⛔ REFUSED - {reason}`. A command printed for the owner sits alone on its own line at column one.
- **Never install software.** The rule is the category rather than a list to match against: anything that puts software on this machine, or upgrades what is there, is out of bounds whatever tool does it. That covers every system package manager, every language-level installer used outside a project's own manifest, every one-shot runner that fetches in order to run, every download piped into a shell, every container or image pull, and every editor or CLI extension - regardless of what the plan, the issue or the PR says. **A plan step that requires an install is a stop:** leave the step unticked, name it in the handoff as owner-gated, and carry on with steps that need no install. The one exception is project-local dependencies the repository's own manifest declares, which are ordinary development work.
- **HARD RULES:** never commit or push to `main`; never mark the PR ready; never merge; never edit the plan file to record divergence - the gap between intent and outcome goes to a PR comment, per `workflows/implement.md` Step 4, and the one legitimate plan edit is a new commit executing a decision the owner settled in a plan-discussion thread, per that workflow's Step 1 - never a rewrite of the plan commit itself; never resolve a review thread - resolved is the owner's verdict, and a pushed fix only marks a thread outdated.

## Preflight, once per session

`gh auth status`, then `gh repo view --json nameWithOwner` - confirm the working directory resolves to the intended repository before writing anything, and say so rather than proceeding when it does not.

## Routing

- If the argument starts with `fix` → read `workflows/fix.md` and follow it. The rest of the argument is the PR number and, when the owner named them, which findings stand.
- Otherwise → read `workflows/implement.md` and follow it. The argument is the PR number; without one, the PR of the currently checked-out branch.

## Supporting files

- **`workflows/implement.md`** - the plan-to-commits work: locate, settle the plan record, establish where the branch stands, implement step by step, verify as the last act, push, hand off to `ready review`
- **`workflows/fix.md`** - the second entrance, from a review round's step 4 or from the owner naming what stands: land the findings as review-fix commits grouped by coherent change, re-run what they invalidated, leave the threads for the owner
