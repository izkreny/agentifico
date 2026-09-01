---
name: pr-flow
description: |
  Manage branches, stacked pull requests and PR review on a GitHub repository the user owns, through the `gh` CLI and the `gh stack` extension. Use when asked to write a branch's plan file, open its pull request, or mark a draft PR ready; to stack a branch, add a branch to a stack, submit, sync, restack or view a stack; when asked what a branch is stacked on; when asked to review open PRs, review a numbered PR, or check what needs review; when asked to merge or land a pull request or a stack; or when the user says they replied to review comments on GitHub and wants those answered; when the user says "resolve all and push" or types `rnp`, says the review is done, says that you can merge, or asks to resolve the review threads and push the fixes; or when asked to watch a PR for new comments, poll for replies, or stop watching one. Also use when the user says a branch is done or ready for review, or types `/gh-solo:pr-flow`. Assumes one committer; for the issue tracker itself use `tracker` skill.
argument-hint: "[open | plan | auto <issue-number> | go <pr-number> | ready [review] | review [pr-number] | watch [pr-number] | unwatch | discuss [pr-number] | reply [pr-number] | chat [pr-number] | resolve [pr-number] | rnp [pr-number] | merge [pr-number] | view | init | add | submit | sync | restack | help]"
allowed-tools: Bash(gh:*), Bash(git:*), Bash(python3:*), Read, Write, Edit, Grep, Glob, Monitor, TaskStop, Agent, Skill, EnterWorktree
---

> **Tools used:** `Bash(gh:*)` for the extension, PR queries and review posting, `Bash(git:*)` for branch and worktree state, `Read` / `Grep` / `Glob` for repository context, `Write` / `Edit` for plan files and PR-body scratch files, `Bash(python3:*)` for `scripts/docs-check.py` and `scripts/post-review.py`, `Monitor` / `TaskStop` for the watch in `workflows/watch.md`, `Agent` for the `reviewer` subagent that `workflows/review.md` spawns, `Skill` for entering the `implement` skill, which `workflows/auto.md`, `workflows/review.md` and `workflows/discuss.md` each do so the repository's own commands run under that skill's tool grant, `EnterWorktree` for moving the session into a sibling worktree in `workflows/merge.md` and `workflows/stack.md`.

The user invoked this skill with the argument: **`$ARGUMENTS`**

This is a **routing skill**. Read `$ARGUMENTS` and the conversation context, pick exactly one workflow, read that workflow file, and follow its instructions inline.

All paths below are **relative to this skill's own directory**. Resolve them against wherever this skill is installed rather than assuming a location.

**Issue, ticket and task all mean the same thing: a GitHub issue.** The tracker itself belongs to the `tracker` skill; this one starts where a branch does.

**Every file here is written to the agent, so `you` is the agent reading it.** The human is **the owner**, always in the third person. The distinction is load-bearing wherever authority is: a rule about who may approve a merge inverts if the referent slips. The exceptions are `workflows/help.md`, whose contents are printed to the owner, and `README.md`, which the owner reads rendered; both address them directly.

## Who this is for

**The owner owns the repository and is its only committer.** Others may look — a mentor who comments, the `reviewer` agent a round spawns — but **the owner is the only reviewer with authority**: nobody else's approval gates a merge and nobody else is accountable for what ships. That is what makes `workflows/review.md` a round that prepares the owner's judgement rather than a substitute for it, and why `REQUEST_CHANGES` on their own PR is a note to themselves. If a second person commits to the repository, stop and say so: the confirmation gates and the assumption that a PR's author and its reviewer are the same person both stop making sense.

## Standing conventions

**Placeholders name what they hold**, and swapping two of them fails quietly rather than erroring: `gh issue view <pr-number>` returns a real issue, just the wrong one. `{issue-number}` and `<pr-number>` are different values and a PR almost never shares a number with the issue it closes; `<stack-number>` is the stack's own id; `<skill-dir>` is where this skill is installed, which a script invocation needs because the shell's working directory is the repository. Braces mark a field inside a format string and angle brackets a command argument. `{owner}` and `{repo}` are the exception: type them verbatim and `gh` substitutes them, in endpoints and `-F` values only, never inside `-f` strings.

- Branch format `{type}/GHI-{issue-number}_{slug}`, one issue per branch. **Defined under *Quick reference* in `../tracker/references/formats.md`**, which owns it because the format encodes an issue key, alongside the commit header and the PR title; the `{type}` vocabulary itself is one section further on, under *Branch and commit type*. Nothing here chooses a type; this skill only ever parses the number out of a branch that already exists, and the parse is stated here for this skill: drop everything up to and including the first `/`, take everything before the first `_`, strip the `GHI-` prefix - `feat/GHI-50_login-form` gives `50`. Follow the repository's existing names where they differ.
- **A branch's PR is opened as a draft at the start of the work, not the end**, carrying the plan file. `workflows/open.md` has the sequence; `gh pr ready` is what later admits it to the review loop.
- **HARD RULE: never commit or push directly to `main`.** `gh stack merge` lands PRs; pushing `main` yourself stays forbidden even when it would be faster.
- New dependent work is cut from the parent branch's tip, then `gh stack add` when tracked, or `gh pr create --base <parent>` when not.
- **The remote's name and the trunk's name are per-repo facts, never assumed.** `origin` is only `git clone`'s default, and a repository whose one remote is `upstream` fails every hardcoded command outright. Resolve `<remote>` this way: `git remote` printing one name means that name; with several, use the one the trunk tracks (`git config branch.main.remote`), and ask the owner if that is unset. The first push of a branch takes `git push -u <remote> <branch>`. Every `main` in these files reads as the repository's actual default branch, which `.agents/gh-solo.md` records where it differs.
- **After any push to a branch with an open PR, read `gh pr checks <pr-number>` before reporting the push as done.** Ticked boxes are local evidence and CI is a different environment, so a locally green gate against a red check is not a contradiction to resolve by preferring one: the disagreement is the finding. Report both; never re-run locally until it looks fine.
- **Every gate workflow ends on a verdict line, and every refusal opens with one.** The gate workflows are `ready`, both passes of `review`, and `merge`. Their Confirm step's first line is `✅ ALL PASS` when nothing failed, `⚠️ PASSED WITH FINDINGS - {what}` when the workflow completed but left something for the owner to read, and a stop anywhere prints `⛔ REFUSED - {reason}` as its first line. It is the line the owner reads first; the detail above it is the record, not the message.
- **Console output is markdown, in every workflow here and in the sibling skills.** **A printed table has its cells padded so the columns line up**, header rule included: a terminal that does not render markdown turns an unpadded table into a wall of `|` and `-`, and the alignment is the whole reason a table beats a list there.
- **A command printed for the owner to run sits alone on its own line, starting at column one.** Never indented, never sharing a line with prose, never prefixed - the owner pastes the whole line into a shell, and a single leading space or trailing word breaks the paste. When a verdict line names a next command, the command goes on the line below it, flush left.
- **Every PR gets `--assignee @me` at creation and `Closes #{issue-number}` in its body.** GitHub sets neither for you. The first feeds the in-progress view described in `tracker`; the second closes the issue on merge and records the link permanently.
- **Whoever runs a gate ticks its box, at the moment it happened; nobody else ever does.** A tick applied by anyone else is indistinguishable from evidence and is not evidence. `workflows/ready.md` audits that record and deliberately cannot write to it, and `workflows/merge.md` audits it again at the door - the issue's acceptance criteria included, which the implementing agent ticks per *Writing good acceptance criteria* in `../tracker/references/issue-shape.md`.
- **Editing a PR body is read, modify, write.** `gh pr edit --body` replaces the whole body, so fetch it first (`gh pr view <pr-number> --json body --jq .body`), edit that file, and pass it back with `--body-file` — never `--body "…"`, which mangles multi-line markdown. Keep the scratch file outside the working tree - the harness scratchpad is the place - so a copy of the body cannot get committed.
- **Every command in an unattended block starts with `gh`, `git` or `python3`**, because those are the prefixes this skill's grant matches and anything else prompts. A pipeline counts, since `gh api … | grep …` does not prefix-match - which is why the posting payload travels in a file rather than through `--input -`. Where an extraction looks like it needs `grep`, `sort` or `tail`, `--jq` already does it in the one call. The exception is the watch block, a shell script run under `Monitor`: `workflows/watch.md` states what it costs.
- **Never invent a repository's check commands.** They belong to the repo, named in the plan's `## Verification` and otherwise in its per-repo agent config or its `CONTRIBUTING`. Whether a branch's gates all actually ran is audited by `workflows/ready.md`.
- **The diff analysis is done by something other than the author**, which is the whole reason it is a subagent: the `reviewer` agent this plugin ships, spawned by `workflows/review.md` with a PR number and nothing else. **It needs a harness that can spawn one**, and a repository may appoint a different reviewer in its own config. Whatever runs it, the findings come back to the orchestrator and go up through one script under one convention, so an appointed capability is run *without* whatever flag makes it post for itself. `workflows/review.md` Step 1 owns every form of appointment, what each must produce, and why an unregistered agent is a refusal rather than a fallback.
- **The AI disclaimer opens everything posted under the owner's name** - PR bodies, comments, Reviews, thread replies. Where the user's global instructions file defines a disclaimer line, that line owns the wording and the rules; absent one, this plugin's default is `> 🤖 Written by AI --- read/modified by human! 🤓`. **Whatever the wording, it opens with `> 🤖`.** That prefix is the whole of what the gates test - the watch filter's `--jq` in `workflows/discuss.md` tests it literally - so the tail after it is the owner's to change and the prefix is not.
- **A `via` line follows the disclaimer on every comment, Review and thread reply**, naming the process that posted it, as the second paragraph of the disclaimer's own blockquote so every `startswith` test on the disclaimer keeps working:

  ```markdown
  > 🤖 Written by AI --- read/modified by human! 🤓
  >
  > via `<skill>` <workflow>, <which post>
  ```

  Every post is made with the owner's credentials, so the disclaimer alone says only that *an* agent wrote it - an implementer's record, a divergence note and a review finding on one PR are otherwise indistinguishable. `references/post-caps.md` carries the forms in use and the one exception, the PR body, which takes the disclaimer alone.

- **Repository-specific conventions live in the repository**, in its agent config file (`.agents/gh-solo.md`, or `.claude/gh-solo.md` where that is what the repo uses). Read it when present and let it override the defaults here; nothing repo-specific belongs in this skill. Among its keys are the ones that name a reviewer other than the bundled agent and the model a round asks the spawn for - `workflows/review.md` Step 1 owns what each means and what it is validated against.

### Post caps

**Every post carrying a `via` line is five sentences or bullets at most**, the disclaimer and the `via` line excluded, and **the domain is the `via` line itself** rather than a list of surfaces - so it reaches a surface nobody has written yet. Where the detail has to exist it goes in the commit message, which has a reader who wants it.

**`references/post-caps.md` owns the rest** and is the authority on it: what the cap excludes entirely, what sits inside a capped post without counting toward the five, and what happens where the owner's global instructions file sets its own cap. Read it before composing a post, rather than working from this summary.

## Preflight, once per session

Run `gh auth status`. If `gh` is missing, or it runs but exits non-zero, stop and say which of the two it was: the fixes differ, `gh auth login` for the second and an install for the first. Every later step depends on it.

Then `gh repo view --json nameWithOwner,viewerPermission`. Every command here infers the repository from the working directory, and this skill's writes include merges, repository settings and branch protection — the wrong directory aims all of them at the wrong repository. Confirm the resolved name is the intended one before any write, and say so rather than proceeding when it is not. **`viewerPermission` below `ADMIN` is worth saying now rather than discovering at the merge**: `workflows/merge.md` reads and may change repository settings, which `WRITE` cannot do, so a round that would refuse at the door refuses here instead.

Issue context comes from the same `gh`, so a headless run under `claude --print` or cron gets the same issue context an interactive one does.

---

## Routing

| The owner says                                                                                                      | Workflow                                                                                                                                                                        |
|---------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| "stack a branch", "add to the stack", "submit", "sync", "restack", "view the stack", "what is this stacked on"      | `workflows/stack.md`                                                                                                                                                            |
| "review open PRs", "review PR 60", "what needs review", "review unreviewed PRs"                                     | `workflows/review.md`                                                                                                                                                           |
| "write the plan", "open the PR", "start on this branch"                                                             | `workflows/open.md`                                                                                                                                                             |
| "mark it ready", "it's done", "ready for review", "take it out of draft"                                            | `workflows/ready.md`                                                                                                                                                            |
| `auto 50` - the literal command, with an issue number                                                               | `workflows/auto.md` from the top: plan and draft PR, the implementation, `ready`, the review round, stop at the owner with the watch armed                                      |
| `go 60` - the literal command, with a PR number                                                                     | `workflows/auto.md` at its `go` entrance: the same chain minus `open`, for a plan the owner has already read                                                                    |
| "merge it", "land this", "merge the PR", "merge the stack"                                                          | `workflows/merge.md` - but said while a review round has left fix commits unpushed, it means `workflows/resolve.md` first, which records the authorisation, resolves and pushes |
| "I replied on the PR", "answer my comments", "I asked something on the review"                                      | `workflows/discuss.md`                                                                                                                                                          |
| `rnp`, "resolve all and push", "we are done", "you can merge" - said after a review round left fix commits unpushed | `workflows/resolve.md`, the protocol's step 7: stop the watch, post the authorisation, resolve what it covers, push, read the checks, then `workflows/merge.md`                 |
| "stop watching", "you can stop polling now", "unwatch"                                                              | stop the monitor; see *Stopping it* in `workflows/watch.md`                                                                                                                     |

Based on the argument above, do exactly one of the following:

- If the argument is exactly `help` → read `workflows/help.md`, output its contents, stop.
- If it starts with `review` → read `workflows/review.md` and follow it.
- If it starts with `open` or `plan` → read `workflows/open.md` and follow it.
- If it starts with `auto` followed by a number → read `workflows/auto.md` and follow it from the top. **Only the literal command enters it** - the chain skips the plan-reading stop, so no sentence routes here, however clearly it implies one.
- If it starts with `go` followed by a number → read `workflows/auto.md` at its `go` entrance. The same arming rule: literal command only.
- If it starts with `ready` → read `workflows/ready.md` and follow it. **If the argument also contains `review`** (`ready review`, `ready review 60`) → when `ready` ends green with the draft lifted, continue straight into `workflows/review.md` on the same PR, as if the owner had named it. A refusal in `ready` stops the chain, and the chain changes nothing inside either workflow - it only removes the wait between them.
- If it starts with `discuss`, `reply` or `chat` → read `workflows/discuss.md` and follow it. **`sync` never means this**, however the request is phrased: that word belongs to the cascade rebase in `workflows/stack.md`, and confusing the two rewrites history when someone asked for a conversation.
- If it starts with `watch` → read `workflows/watch.md` and arm its poll. **Only this literal command arms it** — no sentence does, however clearly it implies one.
- If it starts with `unwatch`, or the owner says to stop watching in any words → stop the monitor with `TaskStop` and confirm it is gone. Arming needs the exact command; stopping deliberately does not, because a stop misread costs nothing and a stop missed leaves something running.
- If it starts with `resolve` or `rnp`, or the owner authorises the resolve and the push in any words - "resolve all and push", "we are done", "you can merge" - while a review round has left fix commits unpushed → read `workflows/resolve.md` and follow it, then continue into `workflows/merge.md`. **Unlike `auto`, `go` and `watch`, this one is not literal-command-only**: their sentence authorises it just as either typed word does, because what it needs is their decision rather than a precise instruction, and refusing to act on "we are done" would only make them type it twice.
- If it starts with `merge` → read `workflows/merge.md` and follow it, **including when the PR is stacked**. It is the single entry point for landing anything, and it routes to `gh stack merge` itself. Sending a stacked merge to `workflows/stack.md` instead skips the review gate.
- If it starts with `view`, `init`, `add`, `submit`, `sync` or `restack` → read `workflows/stack.md` and follow it.
- If the request is about a branch's relationship to another branch → read `workflows/stack.md`.
- If the request is to implement the plan, continue the implementation, or land review fixes → wrong skill; that work belongs to `implement`. Everything around it - `open` before, `ready`, `review` and `merge` after - stays here. The one path from this skill into that work is `workflows/auto.md`, whose chains enter the `implement` skill by name so it runs under its own tool grant.
- If it is about an issue rather than a branch or a PR → this is the wrong skill; use `tracker`.
- Otherwise → read `workflows/help.md`, output its contents, and say which argument failed to match anything above.

## Supporting files

- **`workflows/open.md`** - plan file, first commit and draft PR, at the start of a branch's life
- **`workflows/auto.md`** - the `auto` and `go` chains: the lifecycle's workflows run back to back with the waits removed and every gate intact, ending at the protocol's step 6 with the watch armed. Literal commands only, because each skips a stop that is the owner's
- **`workflows/ready.md`** - the other end: auditing that every stated gate ran and that CI agrees with the record, then taking the PR out of draft. It runs nothing and writes nothing but the flag
- **`scripts/docs-check.py`** - verifies every backticked path resolves and every code fence closes; run it before pushing a docs or plan change, since no hook will. `--ignore <glob>`, repeatable, skips path spans that belong to another tree
- **`workflows/stack.md`** - the `gh stack` prerequisites, when a stack is wanted at all, the layers of stack state, the worktree trap, and the drift playbook. Everything stack-specific lives there rather than here, because it has exactly one reader
- **`workflows/review.md`** - the review round: scoping and gating a PR, the tracker checks, spawning the `reviewer` subagent, posting what it found, landing the fixes locally and stopping at the owner
- **`scripts/post-review.py`** - builds the one API call that lands a round's threads and its record Review together, refusing the whole round on any invalid finding; afterwards reconciles what the PR carries against what was sent, and reads the highest `RF{n}` already on it, which the round needs before it can assign the next; `scripts/test-post-review.sh` is its bench
- **`workflows/merge.md`** - the end of a branch's life: the reviewed-or-not gate, the last checklist audit, the squash merge, branch cleanup, and confirming the issue actually closed
- **`workflows/discuss.md`** - answering the owner's replies on inline comment threads, in the thread
- **`workflows/watch.md`** - the `watch` poll loop, what arms it and what ends it
- **`workflows/resolve.md`** - the protocol's step 7: the authorisation comment and its marker line, the resolve mutation, and the round's only push
- **`workflows/help.md`** - the one file addressed to the owner rather than the agent; on the `help` argument, output it verbatim and add nothing. The unmatched-argument fallthrough prints the same file plus one line naming what failed to match, which is the only addition ever made to it
- **`references/review-protocol.md`** - the review round protocol, stated once: the cast, RF ids and severities, its steps 1 to 8, the owner's vocabulary, and the conclusions the `review`, `resolve` and `merge` gates enforce
