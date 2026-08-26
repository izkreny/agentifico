---
name: tracker
description: "Manage the GitHub issue tracker of a repository the user owns, as a solo developer, through the `gh` CLI. Use when asked to break a feature into issues, create an epic with sub-issues, open a spike, park an unfinished issue in the backlog as a draft or finish a draft's description, record blocked-by dependencies, pick the next task to work on or say what is in progress, summarise what is left on the issue for the current branch, search the tracker, validate an issue against the repo's standards, move an issue's state, set an issue aside or pause work on it, or create a milestone, move its date, or close one on scope. Also use when the user types `/gh-solo:tracker`, or names an issue number and asks what is on it. Not for branches, plans, pull requests, review or merging - that is the `pr-flow` skill - nor for implementing a plan, which is `implement`."
argument-hint: "[create issues for X | next | status [<number>] | search [query] | validate [<number>] | state [<number>] | start [<number>] | finish [<number>] | close [<number>] | reopen [<number>] | block [<number>] | milestone | help]"
allowed-tools: Read, Write, Bash(git:*), Bash(gh:*)
---

> **Tools used:** `Bash(gh:*)` for every tracker read and write, `Bash(git:*)` for branch context, `Read` for the standards and the per-repo config, `Write` for issue body files passed to `--body-file`.

The user invoked this skill with the argument: **`$ARGUMENTS`**

This is a **routing skill**. Read `$ARGUMENTS` and the conversation context, pick exactly one workflow, read that workflow file, and follow its instructions inline. Do nothing else.

All paths below are **relative to this skill's own directory**. Resolve them against wherever this skill is installed rather than assuming a location, because it is a personal skill used across several repositories.

**Issue, ticket and task all mean the same thing here: a GitHub issue.** The owner uses the three interchangeably and expects you to. "Write tickets for X", "break this into issues" and "give me the next task" are requests about the same object, and none of them implies a different tool, a different tracker or a different level of granularity.

**Every file here is written to the agent, so `you` is the agent reading it.** The human is **the owner**, always in the third person. The exceptions are `workflows/help.md`, whose contents are printed to the owner, and `README.md`, which the owner reads rendered; both address them directly.

## Who this is for

**One person owns the repository, writes the issues and does the work.** That assumption is load-bearing and it is why this skill is shorter than a team equivalent. What is absent is coordination between developers: no estimate to defend to peers, no ticket handed over for someone else to pick up, no sprint boundary another developer is waiting on. Where a team process adds a gate to keep two people in sync, this one records a fact and moves on. Who else may be around it, and what still counts as solo, is the eligibility rule below.

The one team habit it keeps is **assignment**, repurposed: `@me` means *I am working on this right now or plan to work on it in imminent future*. A GitHub issue has only open and closed, and assignment supplies the missing middle. Assign when work starts, unassign when it is set aside unfinished. Closing needs no unassign: the issue keeps `@me` and drops out of the list anyway, because every view that matters filters on open. The one place that bites is reopening, which brings the old assignee back with it. `assignee:@me is:open` is then a live answer to "what am I in the middle of", across every repository at once.

Ownership is not what it records. Every issue in the owner's own repository is implicitly theirs, so assigning on creation would say nothing and cost the signal its meaning.

**Pull requests follow the same rule: whoever opens one is assigned to it.** It needs saying because GitHub will not do it, recording the author but leaving the assignee empty, so it takes an explicit `--assignee @me` at creation. The scheme is consistent, not two rules: assigned means in flight. An issue is only in flight while the owner is working on it, so it is assigned and later cleared; a PR is in flight for its whole life, so it is assigned once at creation and needs no clearing. This skill does not open pull requests itself — `pr-flow` does, and it sets the assignee at creation — but the rule holds wherever one is opened.

**The test is write access, not headcount: the owner owns the repository and is the only person who writes to it.** Other people may be involved, and it changes nothing as long as the tracker and the code have one author.

- **A client** who sets scope, priorities and deadlines: fine. They decide what matters, the owner still writes every issue.
- **A mentor or reviewer** who reads issues, comments on them and reviews pull requests: fine. Comments are not writes, and nothing in these standards waits on their approval.
- **A second committer**, a QA sign-off that gates a merge, or anyone else who creates or edits issues: **out of scope.** Stop and raise it rather than adapting these standards to fit, because they will quietly under-serve it.

The line is whether someone's action is a **write you have to coordinate with** or a **read you can act on at your discretion**. A mentor's review comment is advice you weigh; a second committer's issue is a fact you must reconcile. Only the second needs the gates a team process adds.

## Preflight - once per session

Run `gh auth status`. It must report a logged-in account and a token carrying the `repo` scope. If it does not, stop and tell the owner to run `gh auth login`, and do nothing else.

Then run `gh repo view --json nameWithOwner,viewerPermission` to confirm which repository the working directory resolves to and that the owner can write to it. Every `gh issue` command in the workflows infers the repository from the working directory, so an unexpected answer here means every later command would have gone to the wrong tracker.

Do not probe any further than that. Setup, scopes and troubleshooting are in `references/github-access.md`.

## Per-repo config

Optional. If `.agents/github.md` exists in the repository, read it: it records the label taxonomy and layer set, the branch format and its `{type}` vocabulary, whether the repo uses GitHub issue types, the default branch's name where it is not `main`, the remote's name where `git remote` alone cannot settle it, and the repository's check commands. That key set is stated here in full because this is the one workflow that offers to create the file, and `implement` refuses to improvise the check commands it does not find there. Fall back to `.claude/github.md` where that is what the repository uses; `pr-flow` reads the same file in the same order, so the two skills never disagree about a repository's conventions. If neither exists, infer what you need with `gh label list` and `gh repo view`, and **do not create the file unprompted** - offer to write it once the owner has confirmed a taxonomy they intend to keep.

Nothing else is project configuration. `gh` resolves owner and repository from the working directory, so there is no key, no cloud ID, no board and no custom field ID to discover or store.

---

## Auto-triggers

These fire on conversation context. Read the matched workflow and execute it inline.

| Conversation signal | Workflow |
|---|---|
| A `#50` issue number is named, or the owner asks "what's on this issue", "what's left on this one" | `workflows/status.md` |
| "close this issue", "reopen", "mark it in progress", "set it aside", "this is blocked" | `workflows/state.md` |
| "create a milestone", "move the milestone date", "close the milestone" | `workflows/state.md` |
| "find the issue about X", "which issues are still open", "show me the `bug` ones" | `workflows/search.md` |
| "give me the next task", "what should I work on", "what am I working on" | `workflows/search.md` |
| "check this issue against the standards", "is this issue written properly" | `workflows/validate.md` |
| "break this feature into issues", "write issues for X" | `workflows/create.md` |
| "park this as a draft", "finish the draft", "flesh out that draft issue" | `workflows/create.md` - the second and third to its *Finishing a draft* section |

"I'm done" and "ready for review" are deliberately **not** triggers *here*. A pull request that says `Closes #50` closes the issue on merge without anybody transitioning anything, so reaching for a state change on those phrases would fight the platform. **They belong to the `pr-flow` skill**, which takes them as the signal to run its checks and lift a PR out of draft. Hand them over rather than treating them as unroutable: the phrases have an owner, just not this one.

## Explicit routing

Based on the argument above, do exactly one of the following and nothing else:

- If the argument is exactly `help` → read `workflows/help.md`, output its contents, stop.
- If it starts with `status` → read `workflows/status.md` and follow it.
- If it starts with `validate` → read `workflows/validate.md` and follow it.
- If it starts with `search` or `next` → read `workflows/search.md` and follow it.
- If it starts with `state`, `start`, `close`, `reopen`, `block` or `milestone` → read `workflows/state.md` and follow it.
- If it starts with `finish` → read `workflows/create.md` and follow its *Finishing a draft* section.
- Otherwise → read `workflows/create.md` and follow it.

---

## Supporting files

- **`workflows/`** - one file per sub-command: `workflows/create.md`, `workflows/status.md`, `workflows/search.md`, `workflows/validate.md`, `workflows/state.md`, `workflows/help.md`
- **`references/standards.md`** - how an issue is titled, bodied and labelled; when work is too big for one issue; the dependency model
- **`references/github-access.md`** - `gh` authentication, the scopes each workflow needs, and the failures that read as something else
