> **Tools used:** `Bash(git:*)` for the branch, `Bash(gh:*)` for `gh issue view` and `gh label list`, `Read` for the standards.

Check an issue against `references/standards.md` and report what is wrong.

## Step 1 - Resolve the issue number

Same as `status.md`: the argument, else the current branch, else ask.

## Step 2 - Load the standards

Read `references/standards.md`, and `.agents/gh-solo.md` if the repository has one. **The per-repo file wins on every conflict.** A repository that declared its own layer set is not failing validation for using it.

## Step 3 - Fetch

```bash
gh issue view <issue-number> --json number,title,state,body,labels,parent,subIssues,blockedBy,url
```

## Step 4 - Check

Decide first what the issue is: an epic carries the `epic` label, a spike carries `spike`, a bug carries `bug`, otherwise it is a plain issue. Apply only the checks for that kind.

**A `draft` label relaxes the body checks, not the identity.** Title format and the layer label are checked as normal; Body sections, the summary cap, both criteria checks and the scope Note are skipped, because an unfinished body is exactly what the label declares, per *Drafts* in `references/standards.md`. List what the body is still missing under Notes, so finishing the draft has a checklist, and never fail the issue for being what it says it is. The one draft-specific defect to report under Notes: placeholder criteria checkboxes. An empty `## Acceptance criteria` heading is correct on a draft, but stub `- [ ]` items show a lying `0/N` counter on the issue and in every list view, per the stub-body rule in `workflows/create.md`.

### Issues and spikes

| Check                   | Rule                                                                                                                                                                                                                                                               |
|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Title format            | `imperative action`, all lowercase, under the length cap in *Titles* of `references/standards.md`, no bracketed prefix or layer tag                                                                                                                                |
| Layer label             | Exactly one layer label present. It is the only record of the layer, so absent is a fail, and two is a fail. Where `backend` and `frontend` both appear, the fix is `fullstack` if the issue is genuinely one deliverable, or a split into two issues if it is not |
| Parent                  | Attached to an epic, unless the issue is genuinely standalone                                                                                                                                                                                                      |
| Body sections           | Overview and Acceptance criteria - an issue has no Done when, per the standards. A spike has Question, Time box, Deliverable, Done when                                                                                                                            |
| Summary is capped       | The opening section — Overview, or Question on a spike — is five sentences or bullets at most. Count them; this one is mechanical, not a judgement                                                                                                                 |
| Criteria are checkboxes | `- [ ]`, so GitHub counts them                                                                                                                                                                                                                                     |
| Criteria are testable   | Each one observable; a reader can say pass or fail                                                                                                                                                                                                                 |
| Dependencies            | Anything the body calls a blocker exists as a real `blockedBy` relation                                                                                                                                                                                            |

### Epics

| Check             | Rule                                                               |
|-------------------|--------------------------------------------------------------------|
| Title             | A feature-area name, all lowercase, no prefix or tag               |
| `epic` label      | Present                                                            |
| Body sections     | What this delivers, Why it matters, Acceptance criteria, Done when |
| Summary is capped | `What this delivers` is five sentences or bullets at most          |
| Sub-issues        | At least one, unless the epic was opened moments ago               |

### Not checked, deliberately

**`## Technical notes` and `## Dependencies` are optional**, so an absent one is never a failure. A body that names a blocker in prose is still checked for the matching `blockedBy` relation, per the Dependencies row above.

**The issue type is not checked**, and is not even fetched. *Issue types are for organizations only* in the standards settles it: a personal-account repository returns `null` for every issue, so a check would pass on everything.

**Priority is optional**, so its absence is never a failure. Report it as present or absent under Notes and pass the issue either way. There is no size label to check for; *How big is one issue* in the standards explains why.

**Scope is a Note, never a fail.** If the criteria describe more than one branch's worth of work, say so with the split you would make, but pass the issue: it may already be half-built, and retitling an in-flight issue costs more than it returns. The split test belongs in `workflows/create.md`, before the issue exists.

**Assignee is not checked at all.** `@me` records that work is in progress, not that the issue is well written, so unassigned is the normal resting state for anything not being worked on right now. Never offer to add it during validation.

**The AI disclaimer line is a Note, never a fail.** The standards require it on agent-written bodies, but nothing in a body says who wrote it, and failing the owner's own hand-typed issue for lacking an AI disclaimer would be absurd. Report presence or absence under Notes.

**"Criteria are testable" is a judgement, not a rule.** Flag a criterion you believe is untestable as a Note with the reason, never as a hard fail. The check that a machine can make is that criteria exist and are checkboxes; whether they are any good is an opinion, and stating it as a verdict makes the report untrustworthy where it is wrong.

## Step 5 - Report

```
## Validation - #{issue-number}
{title}
{kind}  |  {state}  |  {labels}

| Check        | Result      | Detail         |
|--------------|-------------|----------------|
| Title format | pass / fail | what was found |
| Layer label  | pass / fail | what was found |
| ...          |             |                |

### Verdict
PASS - meets the standards.
  - or -
FAIL - N problems.

### Fixes
1. A specific command or edit, not a restatement of the problem.

### Notes
- Judgement calls and optional fields, which do not affect the verdict.
```

Every fix must be actionable. "Title format is wrong" is the problem; the fix is the corrected title, or the `gh issue edit` that applies it. Offer to apply them, and apply nothing without being asked.
