> **Tools used:** `Bash(git:*)` for the branch and log, `Bash(gh:*)` for `gh issue view`.

Fetch the issue behind the current branch and summarise what is left. This is a quick context check at the start of a work session, not an audit.

## Step 1 - Resolve the issue number

In order:

1. If the argument names a number after `status` (`status 50`, `status #50`), use it.
2. Otherwise take it from the branch: `git branch --show-current`. The format is `{type}/GHI-{issue-number}_{slug}`, defined under *Quick reference* in `references/formats.md`. Drop everything up to and including the first `/`, take everything before the first `_`, then strip the `GHI-` prefix: `feat/GHI-50_login-form` gives `50`. The format is `references/standards.md`'s to own; the other workflows resolve the number by pointing here for the procedure rather than restating it.
3. Otherwise ask the owner. Sweeping `gh issue develop --list` across recent issues to find which one owns this branch costs a call per issue and is not worth it.

A branch that carries no number is normal on a repository that predates the convention. Ask rather than guessing from the slug.

## Step 2 - Fetch

```bash
gh issue view <issue-number> --json number,title,state,stateReason,body,labels,parent,subIssues,subIssuesSummary,blockedBy,blocking,closedByPullRequestsReferences,comments,url
```

If it errors, say so plainly and check the repository resolved as expected. The most common cause is running from the wrong working directory, not a wrong number.

**Read the comments before Step 4, and render `blocking` in the report.** Both are in the fetch above and neither is free: `comments` has to be asked for by name or the thread is invisible rather than empty, per *State* in `references/tracker-fields.md`, and a criterion the owner already settled in a comment is the commonest thing a status pass reports as still outstanding. `blocking` is what the issue holds up, which is the other half of the dependency picture the report shows.

If the labels include `draft`, say so first: the description is unfinished by its own declaration, so an empty criteria list is the label working, not work remaining. Name what the body is missing and offer the *Finishing a draft* section of `workflows/create.md`, rather than rendering a "Probably still needed" from a body that promises nothing.

## Step 3 - Read what has happened since the branch was cut

```bash
git log <remote>/main..HEAD --oneline
```

`main` here is the repository's default branch - a per-repo fact, recorded in `.agents/gh-solo.md` where it differs - and the base is the *remote-tracking* ref rather than local `main`, which can sit behind and would then credit trunk commits to this issue; `<remote>` per the remote-name convention in the `pr-flow` skill's `SKILL.md`. On a stacked branch use the parent branch as the base instead - ask the `pr-flow` skill's `stack` workflow for the parent, or ask the owner, rather than guessing, since guessing wrong falls back to the trunk range and credits the parent's commits to this issue - or the range includes the parent's commits and the matching below will credit them to this issue.

Match commits to acceptance criteria by what they claim to do. Be honest about the strength of the match: a commit message is a claim, not evidence, and this step infers rather than verifies.

## Step 4 - Output

```
## #{issue-number} - {title}
{state}{, reason if closed}   {labels}

### Goal
{one or two sentences from the body}

### Acceptance criteria
{the checkbox list, with GitHub's own checked state preserved}

### Blocked by
{#n - title - state, for each; omit the section if none}

### Blocking
{#n - title - state, for each; omit the section if none}

### Sub-issues
{n of m closed, then the open ones; omit if none}

### Landed so far
{commits since the branch was cut, matched to criteria where they match}

### Probably still needed
{criteria with nothing matching them}
```

Keep it short. If the issue has no unchecked criteria and a PR already references it, say that in one line and stop, rather than producing a full report for work that is done.

## A note on the checkboxes

The criteria checkboxes in the body are the issue's own record of progress, ticked by the implementing agent as each criterion verifiably lands - a tick is the claim "implemented and verified", per *Writing good acceptance criteria* in the standards, never the owner's acceptance, which happens at merge. Report them as they stand. **Do not tick them as part of a status check**: this workflow reads, and a read that quietly writes is the kind of surprise that makes people stop trusting a tool. If criteria are plainly met and unticked, say so and offer.
