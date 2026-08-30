> **Tools used:** `Bash(gh:*)` for `gh issue close` / `reopen` / `edit` / `develop`, `Bash(git:*)` for branch context.

Move an issue's state: close it, reopen it, record that it is blocked, or start work on it.

Deliberately absent rather than emulated: **there is no time logging**, and **no story-point gate on any transition**. Each serves an audience this repository does not have. If the owner asks to log hours, say plainly that GitHub has no worklog and ask whether they want a comment on the issue instead.

**No state change ever closes a milestone**, and closing an issue never moves one. Milestones are scope boundaries, not transitions; the standards' *Milestones, and why not Projects* section owns the judgement, and the *Milestone* heading below has the operations.

## Step 1 - Resolve the issue number

**A milestone operation has no issue number.** Where the request is to create a milestone, move its date or close one, skip to the *Milestone* heading in Step 3; Steps 1 and 2 govern an issue's own state and nothing else. Without this, the routed request stalls asking for a number it has no answer to, or invents one from the current branch and fetches an unrelated issue.

Otherwise, same as `status.md`: the argument, else the current branch, else ask.

## Step 2 - Establish what state it is in

```bash
gh issue view <issue-number> --json state,stateReason,labels,blockedBy,closedByPullRequestsReferences
```

Do not skip this. Closing a closed issue and reopening an open one both succeed silently, and reporting "done" for a no-op is worse than an error.

## Step 3 - Do the one thing asked

### Start work

**Refuse a `draft` issue.** Step 2 already fetched the labels; if `draft` is among them, the description is unfinished, and per *Drafts* in `references/standards.md` a draft is finished, not started. Say what the body is still missing, offer the *Finishing a draft* section of `workflows/create.md`, and assign nothing.

```bash
gh issue edit <issue-number> --add-assignee @me
gh issue develop <issue-number> --name <type>/GHI-<issue-number>_<slug> --checkout
```

**Assign first, and treat that as the in-progress signal.** An issue has only open and closed, so `@me` carries the middle. Assign before branching, because not all work reaches a branch: a spike or an investigation still has to appear in `assignee:@me is:open`.

The branch link corroborates it in the UI and is worth creating, but it is not the record. Do **not** add a `status_in-progress` label on top of either: a third copy of one fact is one more thing to forget.

Match `{type}` to the work, per the type set under *Branch and commit type* in `references/standards.md`. Do not default to `feat` for everything.

### Pause work

```bash
gh issue edit <issue-number> --remove-assignee @me
```

Unassign whenever an issue is set aside unfinished. The in-progress list is only worth having if it is true, and a stale `@me` is what makes it a lie. Closing does not need this step, since `is:open` already excludes it.

### Close

```bash
gh issue close <issue-number> --reason completed
gh issue close <issue-number> --reason "not planned"
gh issue close <issue-number> --duplicate-of <surviving-issue-number>
```

**Ask which reason, and never assume `completed`.** `--reason` accepts `completed`, `not planned` and `duplicate` and rejects anything else; `--duplicate-of` is its own flag, and the better duplicate close. The reasons are not interchangeable: `not planned` is what keeps a closed tracker readable later, because it is the only thing separating what shipped from what was abandoned. For a duplicate, `--duplicate-of` records the surviving issue natively - no `--reason` needed and no follow-up comment; add `-c` only for what a link cannot say.

Before closing manually, check `closedByPullRequestsReferences` and any open PR that mentions the issue. If a PR is about to close it, say so and stop: adding `Closes #{issue-number}` to that PR body is better than closing by hand, because it records the link permanently and closes the issue exactly when the code lands, not before.

### Reopen

```bash
gh issue reopen <issue-number>
```

Reopening clears the close reason. If the issue is being reopened because it was closed wrongly, say what the previous reason was in the confirmation, since it is now gone.

**Check the assignee after reopening.** A closed issue keeps whoever was assigned when it closed, and `gh issue reopen` has no flag to clear it, so the issue comes back already claiming to be in progress. Ask whether work is resuming now. If it is not, clear it:

```bash
gh issue edit <issue-number> --remove-assignee @me
```

### Blocked

```bash
gh issue edit <issue-number> --add-blocked-by <blocker-issue-number>
gh issue edit <issue-number> --add-label blocked
```

Prefer the **relation** when the blocker is another issue in the repository, because it is typed, visible from both sides and readable with `--json blockedBy`. Use the **label** only when the blocker is outside the tracker: waiting on a third-party API, a design, an account, an upstream release. Say which one you used and why.

When the block clears, remove both:

```bash
gh issue edit <issue-number> --remove-blocked-by <blocker-issue-number> --remove-label blocked
```

### Milestone

There is no `gh milestone` command; managing them goes through the REST API, while attaching issues is first-class:

```bash
gh api repos/{owner}/{repo}/milestones -f title="v1.0" -f description="..."                        # create
gh api repos/{owner}/{repo}/milestones/<milestone-number> -X PATCH -f due_on=2026-09-30T00:00:00Z  # move the date
gh api repos/{owner}/{repo}/milestones/<milestone-number> -X PATCH -f state=closed                 # close - on scope only
gh issue edit <issue-number> --milestone "v1.0"                                                    # attach an issue
```

The judgement lives in *Milestones, and why not Projects* in `references/standards.md`: close on scope and never on the calendar, move the date when it arrives with work outstanding, and put the milestone on the leaf issues rather than only on the epic. This section is only the operations.

## Step 4 - Confirm

One line: what changed, from what to what, and the URL. If nothing changed because the issue was already in the requested state, say that instead of reporting success.

---

## Rules

- **One state change per invocation.** If the owner asks for two, do them in sequence and confirm each, rather than batching into a single unclear result.
- Never close an issue whose acceptance criteria have unticked boxes without saying so first. The boxes may simply be stale, and that is the owner's call, but it should be a decision rather than an oversight.
- Never tick the criteria yourself to make a close look tidy.
