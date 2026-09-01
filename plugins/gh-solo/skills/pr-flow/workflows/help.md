**`pr-flow`** - branches, stacked pull requests, review and merge on a repository you own, through `gh`.

Picks a branch up where the issue tracker leaves off and carries it to `main`. One committer: you review your own code, and nobody else's approval gates a merge. For the tracker itself use `tracker`.

**Commands**

| Command                                 | What it does                                                                                                                                                                        |
|-----------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `open` (or `plan`)                      | Check the issue is startable and the trunk current, write the plan file, commit it first and alone, open the PR as a draft, stop                                                    |
| `ready`                                 | Audit that every stated gate ran and was ticked and that CI agrees - it runs nothing itself - then lift the PR out of draft                                                         |
| `ready review`                          | The same audit, then straight into `review` when it passes - one wait instead of two. A refusal stops the chain                                                                     |
| `auto 50`                               | One command from issue number to prepared review: plan, draft PR, implementation, `ready`, `review`. Skips your plan-reading stop, so keep it for small work you would wave through |
| `go 60`                                 | The same chain entered after you read the plan on draft PR 60: implementation, `ready`, `review`, one stop at the end                                                               |
| `review`                                | Run a full review round on every open PR: findings posted, fixes committed locally, then it stops for you                                                                           |
| `review 60`                             | The same for one PR                                                                                                                                                                 |
| `discuss 60` (or `reply 60`, `chat 60`) | Read your replies on the review threads and answer them, in the thread                                                                                                              |
| `watch 60`                              | Poll every 30s for your replies while you read, and answer as they arrive                                                                                                           |
| `unwatch`                               | Stop that polling. `rnp`, or "resolve all and push", stops it too; `discuss` leaves it running, and it dies with the session                                                        |
| `resolve 60` (or `rnp 60`)              | Record your authorisation, resolve the threads it covers, and push the fixes. Saying "resolve all and push" does the same                                                           |
| `merge`                                 | Audit the checklists, gate on the review record, squash-merge, delete the branch, confirm the issue closed                                                                          |
| `view`                                  | Show the stack from trunk outward                                                                                                                                                   |
| `init`                                  | Start a new stack from branches not stacked yet                                                                                                                                     |
| `add`                                   | Add a dependent branch to the stack                                                                                                                                                 |
| `submit`                                | Push the stack and open or update its PRs                                                                                                                                           |
| `sync`                                  | Fetch, cascade-rebase the stack onto the trunk, and force-push every branch                                                                                                         |
| `restack`                               | The cascade rebase alone (`gh stack rebase`), leaving the remote untouched                                                                                                          |
| `help`                                  | This page                                                                                                                                                                           |

**A branch's life, in order**

1. **issue** - the branch is cut from it; that side is `tracker`
2. **`open`** - the plan, committed alone, and a draft PR holding nothing else
3. *implementation* - the work itself, on the branch: the `implement` skill, which settles the plan record first and then does the work - resumable across sessions because the PR body carries the state
4. **`ready`** - the record audited, the PR out of draft
5. **`review`** - tracker checks posted, then the round: a fresh-context reviewer reads the diff, its findings land as inline threads, each gets a fix plan, the fixes are committed **locally**, and a scoped re-review checks each one closed the finding it claims
6. **you judge it** - the first thing in the whole run that waits for you: react or reply per thread
7. **`rnp`, or "resolve all and push"** - you type or say it; the authorisation is recorded, the covered threads resolve, and the fixes finally go up
8. **`merge`** - checklists audited, squash to `main`, branch deleted, the issue closes itself

`open` stops at the draft PR on purpose: the plan is reviewed as a diff before any code is written. Plan approval never authorises the first implementation commit.

**Two accelerators.** `auto` and `go` run that same life with the waits removed and nothing else: every audit still runs, and any refusal stops the chain where it stands. `auto 50` goes from the issue all the way to step 6 without your plan stop - the trade is that a planning call you would have argued with comes back later as a review finding, so use it for work you trust. `go 60` is for after you have read the plan. Both end at the same place, because it is the only step in the span that is yours: the findings judged. They arm the watch when they get there, so you can react as you read rather than coming back to say you did. Nothing is pushed. Both are literal commands only: no sentence starts a chain, however clearly it implies one.

**The review is yours**

The diff is read by a reviewer with its own fresh context, spawned by `review` - never by the session that wrote the code, which has already reasoned its way to why every line looks the way it does and would confirm itself. It does not suggest fixes: it names the defect, the consequence, and a failure scenario you can check. **The judgement is still entirely yours**, and it is the only step in the round nothing else can do.

Every round is recorded as one Review on the PR, even when the reviewer found nothing. That is what makes "has this been reviewed" answerable later, and it is the gate `merge` checks.

By the time it stops for you, each finding's thread already carries three things: the finding, the plan for fixing it, and what actually changed with any departure from that plan named. The fixes are **committed locally and not pushed**, so the threads stay anchored to the exact diff in front of you.

**Answering a thread takes a reaction or a word.** 👍 or ❤️ accepts a finding. 👀 or 😕, or writing "explain", gets one plain-language explanation in the thread. A written reply opens a discussion. Anything else is no signal, and no signal is fine - the batch at the end covers it. **A refusal has to be written**, though: there is no reaction that means "no".

Two kinds of thread wait for you specifically, and the round will have said which: one the reviewer flagged as needing your judgement, and one whose fix would have changed scope. Neither is fixed without you, and both block the merge until you settle them.

**Then type `rnp`, or say "resolve all and push".** Either records the authorisation as a comment naming every finding it covers, resolves those threads, and pushes. It is the round's only push, and the reason it waited is that a push re-anchors every thread and marks them outdated under a reader part-way through.

**Or come back and say so** - "I replied on the PR", or `discuss 60`. Or run `watch 60` first and it will poll while you work, answering as they land - that has to be the command, not a sentence, so nothing starts polling because it guessed. `auto` and `go` arm it for you when they reach this step. The watch runs through the whole round, so comment at your own pace; it stops on `rnp` or "resolve all and push", on `unwatch`, or with the session. Nothing notifies the session that you commented in the GitHub UI, so a reply nobody is told about is a reply nobody reads. `sync` does *not* mean this: that word cascade-rebases a stack.

`discuss` and `watch` work from the moment the PR exists, not only mid-review - the plan discussion after `open` is the same loop, since the plan file is the whole diff. **Inline on the file's lines in the Files changed tab is the best place to comment**, because a thread anchored to a line is what the round's ids, fix plans and resolves attach to. It is a recommendation rather than a requirement: review summary bodies and Conversation comments are read too, on their own endpoints, so nothing you write goes unread wherever you put it.

**Prerequisites**

- `gh`, authenticated. Check with `gh auth status`.
- For stacks only: the `gh stack` extension and the `gh-stack` skill, both per developer and neither carried by a clone. See `workflows/stack.md`.
- Optional: `.agents/gh-solo.md` in the repository (or `.claude/gh-solo.md`), recording its check commands and any convention that differs from the defaults here.

**Hard rules**

Never commit or push directly to `main`, and never omit a merge method - `--squash` on `gh pr merge`, `--squash` on `gh stack merge`. Both fall back to something other than policy when it is left off.

**Stacking is for one case only**

A branch that depends on another **unmerged** branch. Work that starts from `main` and merges to `main` is an ordinary branch with an ordinary PR, and making it a one-branch stack buys nothing.

**Formats live in the other skill:** branch names, commit headers and PR titles are all defined under *Quick reference* in `../tracker/references/formats.md`, because each one encodes an issue key.
