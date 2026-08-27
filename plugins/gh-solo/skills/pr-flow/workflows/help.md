**`pr-flow`** - branches, stacked pull requests, review and merge on a repository you own, through `gh`.

Picks a branch up where the issue tracker leaves off and carries it to `main`. One committer: you review your own code, and nobody else's approval gates a merge. For the tracker itself use `tracker`.

**Commands**

| Command | What it does |
|---|---|
| `open` (or `plan`) | Check the issue is startable and the trunk current, write the plan file, commit it first and alone, open the PR as a draft, stop |
| `ready` | Audit that every stated gate ran and was ticked and that CI agrees - it runs nothing itself - then lift the PR out of draft |
| `ready review` | The same audit, then straight into `review` when it passes - one wait instead of two. A refusal stops the chain |
| `auto 50` | One command from issue number to prepared review: plan, draft PR, implementation, `ready`, `review`. Skips your plan-reading stop, so keep it for small work you would wave through |
| `go 60` | The same chain entered after you read the plan on draft PR 60: implementation, `ready`, `review`, one stop at the end |
| `review` | Check every open PR's tracker conventions, then hand the diff analysis off |
| `review 60` | The same for one PR |
| `discuss 60` (or `reply 60`, `chat 60`) | Read your replies on the review threads and answer them, in the thread |
| `watch 60` | Poll every 30s for your replies while you read, and answer as they arrive |
| `unwatch` | Stop that polling. Saying "we are done" stops it too; `discuss` and "push for review" leave it running, and it dies with the session |
| `merge` | Audit the checklists, gate on the review record, squash-merge, delete the branch, confirm the issue closed |
| `view` | Show the stack from trunk outward |
| `init` | Start a new stack from branches not stacked yet |
| `add` | Add a dependent branch to the stack |
| `submit` | Push the stack and open or update its PRs |
| `sync` | Cascade-rebase the stack onto the trunk |
| `restack` | The same cascade rebase - `sync` and `restack` are two names for the one `gh stack sync` |
| `help` | This page |

**A branch's life, in order**

1. **issue** - the branch is cut from it; that side is `tracker`
2. **`open`** - the plan, committed alone, and a draft PR holding nothing else
3. *implementation* - the work itself, on the branch: the `implement` skill, which settles the plan record first and then does the work - resumable across sessions because the PR body carries the state
4. **`ready`** - the record audited, the PR out of draft
5. **`review`** - tracker checks posted, then it prints the `/code-review` command
6. **`/code-review high N --comment`** - you type it; findings land as inline comments on the diff, and the outcome is recorded on the PR. If the flag falls back to printing, the recording step posts the threads itself
7. **you read it** - the actual review: every line, every comment, then submit yours
8. **`merge`** - checklists audited, squash to `main`, branch deleted, the issue closes itself

`open` stops at the draft PR on purpose: the plan is reviewed as a diff before any code is written. Plan approval never authorises the first implementation commit.

**Two accelerators.** `auto` and `go` run that same life with the waits removed and nothing else: every audit still runs, and any refusal stops the chain where it stands. `auto 50` goes from the issue to the printed `/code-review` line without your plan stop - the trade is that a planning call you would have argued with comes back later as a review finding, so use it for work you trust. `go 60` is for after you have read the plan: implementation by a subagent, the `ready` audit, the review preparation, one stop. Both end the same way, because they must - the code review itself starts only when you type its command - and once you have run it, the implementation handoff and the findings sit on the PR together, readable in one sitting. Both are literal commands only: no sentence starts a chain, however clearly it implies one.

**The review is yours**

This skill prepares reviews; it does not perform them. The diff analysis belongs to `/code-review` - the name Claude Code gives it; substitute your own harness's if it differs - and **only you can start it** - this flow reserves the analysis for your explicit invocation, so an agent never calls it or stands in for it. `review` prints the exact command with an effort level named.

When the findings come back, the workflow records them as one Review on the PR, even when the analysis was clean. That is what makes "has this been reviewed" answerable later, and it is the gate `merge` checks.

Then read the code. Use **Start a review → Submit review** in the Files changed tab at GitHub UI rather than resolving threads one at a time: resolving posts nothing, so a review done that way leaves no record. Nothing is pushed while you read, so the threads stay anchored to the diff in front of you; after a "push for review" the answered ones go outdated, and their follow-up comments carry the same RF id so the trail stays connected.

Reply in **every** thread before you resolve it - a resolved thread with no reply from you is a hard error the merge refuses on. Each kind of reply gets a different response: a question or challenge opens a discussion in the thread; an order - "OK", "fix it", "drop it", "rewrite it" - gets the fix made and **committed on the spot**, with a reply naming the commit, unpushed; a refusal - "no", "skip it" - gets a brief acknowledgement and no fix. Batch orders in the chat still work too - "fix all", "fix RF1 and RF3" - through the `implement` skill's `fix` entrance, as ordinary commits separate from the original work. Either way the commits wait locally until you say **"we are done"** (push, green CI, merge) or **"push for review"** (push, fresh comments on the changed lines, another round).

**Then come back and say so** - "I replied on the PR", or `discuss 60`. Or run `watch 60` first and it will poll while you work, answering as they land - that has to be the command, not a sentence, so nothing starts polling because it guessed. The watch runs through the whole round, so comment at your own pace; it stops only on "we are done", `unwatch`, or the session ending - "push for review" starts another round, so the watch keeps running through it. Nothing notifies the session that you commented in the GitHub UI, so a reply nobody is told about is a reply nobody reads. `sync` does *not* mean this: that word cascade-rebases a stack.

`discuss` and `watch` work from the moment the PR exists, not only mid-review - the plan discussion after `open` is the same loop, since the plan file is the whole diff. One habit makes it work: **comment inline on the file's lines in the Files changed tab, never in the comment box at the bottom of the Conversation tab** - Conversation-tab comments live on a different API and neither `discuss` nor `watch` can see them.

**Prerequisites**

- `gh`, authenticated. Check with `gh auth status`.
- For stacks only: the `gh stack` extension and the `gh-stack` skill, both per developer and neither carried by a clone. See `workflows/stack.md`.
- Optional: `.agents/github.md` in the repository (or `.claude/github.md`), recording its check commands and any convention that differs from the defaults here.

**Hard rules**

Never commit or push directly to `main`, and never omit a merge method - `--squash` on `gh pr merge`, `--squash` on `gh stack merge`. Both fall back to something other than policy when it is left off.

**Stacking is for one case only**

A branch that depends on another **unmerged** branch. Work that starts from `main` and merges to `main` is an ordinary branch with an ordinary PR, and making it a one-branch stack buys nothing.

**Formats live in the other skill:** branch names, commit headers and PR titles are all defined under *Quick reference* in the `tracker` standards, because each one encodes an issue key.
