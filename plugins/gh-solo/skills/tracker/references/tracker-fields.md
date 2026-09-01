# The fields GitHub carries

Labels, dependencies, milestones, state and issue types. What an issue *says* is `references/issue-shape.md`; the names that encode an issue number are `references/formats.md`.

## Labels

GitHub labels are created per repository and do not exist until somebody makes them. Check with `gh label list` before relying on one; `gh issue create` **fails** on a label that does not exist rather than creating it.

```bash
gh label create backend --color 1D76DB --description "Backend / API"
```

**Each label answers one question, and the axes are independent.** An issue carries at most one value from each, and they never contradict: an epic is not an alternative to a bug, because the two axes are not asking the same thing.

Every axis but Layer has a **default**, and the default is expressed by carrying **no label at all**. The right-hand column is the value that never appears in the picker, because creating it is the mistake the next section is about.

| Axis          | Question it answers                             | Labels that exist                               | The default, never labelled                                                                       |
|---------------|-------------------------------------------------|-------------------------------------------------|---------------------------------------------------------------------------------------------------|
| **Layer**     | Where does the deliverable land?                | `backend` `frontend` `fullstack` `infra` `docs` | none - mandatory, exactly one, on everything except an epic                                       |
| **Nature**    | Fixing, answering, or building?                 | `bug`, `spike`                                  | **task** - building a thing                                                                       |
| **Structure** | Does it contain other work?                     | `epic`                                          | **leaf** - no sub-issues                                                                          |
| **Priority**  | When?                                           | `urgent` `someday`                              | **normal** - in backlog order                                                                     |
| **Readiness** | Is it specified enough to start?                | `draft`                                         | **ready** - startable as written                                                                  |
| **Blocked**   | Is something outside the tracker holding it up? | `blocked`                                       | **unblocked** - or blocked by another issue, which is a relation, not a label; see *Dependencies* |

**There is no Size axis.** How big an issue is gets decided once, while it is being written, and the answer is either "this is one issue" or "this is an epic with children" — see *How big is one issue*. A number recorded on the issue afterwards serves a planning session and a velocity chart, and this repository has neither.

Read the Nature row carefully, because it is the one people try to complete. `bug`, `spike` and task are mutually exclusive answers to one question, so a `task` label would be the third value of a three-value set — and it would land on almost every issue in the repository. That is why it does not exist, and the same reasoning kills `feature`, which is only another name for it.

### The Layer axis

Layer is the one mandatory axis, and since titles carry no prefix it is the **only** place the layer is recorded. Set it at creation.

**Exactly one layer label, on every issue that is not an epic.** An epic is exempt because it is a container: its children carry the layers, and it usually spans them, so a layer on the epic itself would either lie or read `fullstack` every time. On everything else: not zero, and never two. This is the axis rule from the table in *Labels*, and it is worth restating here because the layer is the one place two labels look defensible: an issue that touches the API and the UI seems to deserve both. It does not. `fullstack` exists precisely so that pair is never needed, and applying `backend` and `frontend` together is the mistake it was created to prevent.

| Label       | The deliverable is                                                  |
|-------------|---------------------------------------------------------------------|
| `backend`   | An API, a service, a background job, a schema or a migration        |
| `frontend`  | A view, a component, a route, styling                               |
| `fullstack` | One thing that cannot be accepted from either side alone            |
| `infra`     | A pipeline, a deployment, a container, tooling or repository config |
| `docs`      | Prose that is the point in itself: a README, a guide, an ADR        |

**The layer is where the deliverable lands, not every file the branch touches.** This is what keeps the set from collapsing. Adding an endpoint and updating the README to describe it is `backend`: the endpoint is the deliverable and the README follows from it. Bumping a dependency to fix a UI bug is `frontend`, not `infra`, because the fix is the point and the lockfile is a means. Ask what the issue would be closed *for*, and label that.

Labels that would otherwise creep across the whole tracker depend on this rule:

- **`docs` only when the prose is the deliverable.** Nearly every issue updates docs — the epic template puts "Documentation updated" in `Done when` — so a label for touching them would land almost everywhere and say nothing. It is for a contributing guide, an ADR, a README rewrite: work with no code change behind it.
- **`infra` only when the pipeline or the deployment is the deliverable.** Editing a config file in passing does not make an issue infrastructural, or every issue that adjusts an env var would qualify.

**`fullstack` is required, not optional, when an issue genuinely spans both.** It is also rarer than it looks. An issue that merely *calls* an endpoint owned by another issue is `frontend`. If each side could merge and be useful on its own, that is not one `fullstack` issue at all, it is a `backend` issue and a `frontend` issue, per the split test in *How big is one issue*.

The layer set is a **default, not a law**. A repository that is one Rust binary has no backend/frontend split and should record its own set in `.agents/gh-solo.md`. What matters is that the set is small, closed, and mandatory.

**Because this axis is mandatory, its absence is a defect rather than a default**, which is what separates it from the other axes in *Labels*. Nothing in a title reveals a missing layer label, so audit for it directly rather than expecting to notice:

```bash
gh issue list --state open --limit 100 \
  --search "-label:epic -label:backend -label:frontend -label:fullstack -label:infra -label:docs"
```

**That exclusion list is the default layer set, so a repository that replaced the set must rebuild it before running this.** The query works by excluding every legal value and reporting what is left; run unchanged against a repository whose axis is named otherwise, it excludes only the epics and reports every other open issue as unlabelled, which reads as a wall of defects and gets the audit ignored. The same trap in the other direction is silent: a set that gains a value the query does not name makes every issue carrying it invisible to the audit. **A new value in the repository's set is a new exclusion here.**

Structure is a **separate** axis, not a fourth value of Nature. An epic with three sub-issues has not stopped being a task or a bug; it is simply also a container. The two questions are orthogonal, and an issue answering "no" to both — no `bug`, no `spike`, no `epic` — is the most common issue in any tracker and carries no label on either axis. That is the design working, not a gap.

**Set labels at creation time**, not afterwards. An issue created without its layer label is invisible to every search in `workflows/search.md` that filters on one.

**Labels and milestones go on issues only, never on PRs.** GitHub accepts both on a PR, which is why the rule needs stating. The issue already carries them and the PR is one hop away through its `Closes #{issue-number}` line, so a labelled PR is a second copy that can drift, and every audit query in this file searches issues and would miss or double-count it. Milestones are worse than redundant there: the milestone's progress count mixes issues and PRs, so milestoned PRs double the count and make "3 open" stop meaning three issues of work.

### Drafts

`draft` marks an issue whose description is not finished: the owner wanted it in the backlog before there was time or information to write it out. It is not to be confused with a draft *pull request*, which is the normal state of every PR while its work is in progress and belongs to `pr-flow`; here, draft is a label on an issue. It answers the Readiness question in the axis table in *Labels*, and the default - unlabelled - means startable as written. That is *Never label the default* working: most issues are created fully specified, so completeness needs no label and `draft` marks the departure.

A draft may skip the body template. Overview, acceptance criteria, technical notes: any or all may be missing or stubs, and the split test in *How big is one issue* is deferred, because it needs criteria to run on. What a draft never skips:

- **The title rules.** An imperative, lowercase title naming the deliverable is the minimum a backlog entry is; without one there is nothing to put in the backlog.
- **The layer label.** Naming where the deliverable lands takes no more information than the title already needed. An issue whose scope is genuinely unknown is missing an answer, not a description, and that makes it a spike, per *Spikes* - which carries a layer of its own either way.

`draft` is not `someday`. Priority says when, readiness says whether the spec exists, and the axes are independent as always: a draft can be `urgent`, and a fully specified issue can wait forever.

Remove the label the moment the description is finished, and run the split test then, so a finished draft can leave as an epic with children rather than as one oversized issue. Until the label comes off, the issue is invisible to "next task" in `workflows/search.md`, which is the point: a draft cannot be started, only finished.

### Never label the default

This is the rule the whole taxonomy is built on, and it is worth more than the axis table in *Labels*.

**A label that lands on the overwhelming majority carries no information, and destroys the information in the ones without it.** If most issues are labelled `feature`, the label says nothing; and an unlabelled issue becomes ambiguous between "this is a bug" and "nobody got round to labelling it". The absence has to mean something specific, or the presence means nothing.

So the default state is **unlabelled**, and every label marks a departure from it:

- **No `task` label, and no `feature`, which is the same label under another name.** `bug` present means a defect; `bug` absent means building something, which is the Nature default the axis table in *Labels* calls task. Adding either for symmetry would put a label on almost every issue in the tracker.
- **No middle priority.** `urgent` and `someday` are two labels giving three states, because the middle one is "unlabelled". Making it explicit means labelling everything, and then you cannot tell "considered, and it is normal" from "never considered".
- **No size label at all**, not even an optional one. It would land on nearly every issue, which by *Never label the default* means it carries no information; and the one decision it might inform — split or not — is made before the issue exists. *How big is one issue* has that test.

The team practice this replaces is triage, where an explicit "medium" separates *triaged* from *untriaged* and somebody is accountable for the difference. Solo there is no triage step.

### Before adding a label

A label exists to partition issues that exist. Create `spike` the day you open one, not in advance. GitHub's stock labels (`good first issue`, `wontfix`, `question`) are the cautionary case: every repository starts with them, almost none uses them, and they sit in every label picker forever.

**Name it so it stands alone in a row of chips.** `backend` and `urgent` do; bare `high` does not, since it could be priority, severity, complexity or risk. If the value cannot be named that way because it is a number or a bare adjective, prefix it with its axis, separated by `_` — `severity_2`, not `2`.

`_` between the axis and the value, `-` inside either half: `status_in-progress`, never `status-in-progress`. That is the same rule the branch and plan-file formats use in *Quick reference*, where `_` separates fields and `-` separates words within one, so a prefixed label parses the same way a branch name does.

---

## Dependencies

GitHub has native, typed issue dependencies, and `gh` exposes them. Use them rather than prose.

```bash
gh issue create --title "login form" --label frontend --blocked-by 51
gh issue edit 50 --add-blocked-by 51
gh issue edit 50 --remove-blocked-by 51
gh issue view 50 --json blockedBy,blocking
```

Direction is the thing people get wrong. `--blocked-by 51` on issue 50 means **51 must land first**. Read it as a sentence: "50 is blocked by 51".

Mention the dependency in the body too, as `Blocked by #51`. The relation is the machine-readable truth; the prose is what a reader sees without expanding a panel, and GitHub renders `#51` as a live link with the issue's title and state on hover.

For anything weaker than a hard dependency, write prose. There is no "relates to" relation and inventing a label for one produces a taxonomy nobody maintains.

---

## Milestones, and why not Projects

A milestone groups issues that ship together and answers "is this done yet". It carries a title, a description, a `due_on` date and a live open/closed count, so it can model a release, a launch, a scope boundary, or an iteration if the owner wants one. Use them freely; this is the organising tool a solo backlog actually benefits from.

**Close on scope, never on the calendar.** That is the whole rule, and everything below follows from it. A milestone closed when its contents ship stays honest: the count means what it says, and the due date was a forecast. A milestone closed because the date arrived reports done for work that is not, and from then on the tracker lies about completion.

**So when the date arrives and the scope has not landed, move the date.** One call, and the milestone stays true:

```bash
gh api repos/{owner}/{repo}/milestones/1 -X PATCH -f due_on=2026-09-30T00:00:00Z
```

The team practice this departs from is the sprint boundary, which is fixed precisely so that slipping scope is visible and velocity stays measurable across iterations. Both of those serve an audience deciding whether to trust a team's forecast. Solo there is no such audience: the owner already knows the work slipped, being the one who did not finish it.

**Closing a milestone does nothing to its open issues.** They stay attached to it, they stay open, and `gh issue list --milestone "v1.0"` still returns them. GitHub has no sprint rollover — nothing moves them to the next milestone and nothing warns anyone. So closing a milestone over unfinished work leaves the owner reassigning every straggler by hand, which is the practical reason to move the date instead of closing early.

`gh` support is lopsided, which is worth knowing before relying on it. Assigning and filtering are first-class:

```bash
gh issue create --milestone "v1.0" ...
gh issue edit 50 --milestone "v1.0"
gh issue edit 50 --remove-milestone
gh issue list --milestone "v1.0"
```

**Managing the milestones themselves is not.** There is no `gh milestone` command at all, so creating, closing and listing go through the REST API:

```bash
gh api repos/{owner}/{repo}/milestones \
  --jq '.[] | [.number, .title, .open_issues, .closed_issues] | @tsv'
gh api repos/{owner}/{repo}/milestones -f title="v1.0" -f description="..."
gh api repos/{owner}/{repo}/milestones/1 -X PATCH -f state=closed
```

Assigning an issue to a milestone that does not exist fails the way an unknown label does, so list before a batch.

**Milestone or epic?** They answer different questions and one issue can carry both. An epic groups by *what this is part of*, is itself an issue, and has a body arguing why it is worth doing. A milestone groups by *when this ships*. Feature work belongs to an epic; a release belongs to a milestone.

**Put the milestone on the issues you filter on, not only on the epic.** Sub-issues do not reliably inherit it: GitHub may copy a parent's milestone onto a sub-issue *created after* the parent already had one, but nothing back-fills children that already existed when you set it. Milestoning only the epic therefore leaves its children unmilestoned, and both `gh issue list --milestone` and the ordering in `workflows/search.md` filter on the issue's own milestone — so the leaf issues the work actually lands on would be invisible to the tool meant to surface them.

Verify the behaviour in the repository at hand rather than trusting either answer, since it has changed at least once:

```bash
gh issue view <child-issue-number> --json milestone,parent
```

Milestone the epic too, for the progress bar.

**Projects are deliberately not used here.** GitHub Projects add board views, custom fields and iteration planning, which is most of what a team tracker does and more than a solo backlog needs. They also need a `project` token scope the default `gh auth login` does not grant, so the first attempt fails with a 403 about scopes. If a repository genuinely needs a board, that is a decision to make explicitly rather than a default this skill reaches for.

---

## State

GitHub issues are **open or closed**. That is the whole model, plus a close reason.

```bash
gh issue close 50 --reason completed        # it shipped
gh issue close 50 --reason "not planned"    # it will not be done
gh issue close 50 --duplicate-of 51         # #51 already covers it
gh issue reopen 50
```

Use one every time; `--reason` accepts `completed`, `not planned` and `duplicate` and rejects anything else, with `--duplicate-of` its own flag rather than a fourth reason. `not planned` is what stops a closed tracker reading as a graveyard of things that were built, and it is the only way a later search can tell "done" from "abandoned". For a duplicate, close with `--duplicate-of <surviving-issue-number>`: it records the target natively, which a bare `--reason duplicate` does not.

**Most closes should not be manual.** A pull request whose body says `Closes #50` closes the issue when it merges, links the two permanently, and records the closing PR in `closedByPullRequestsReferences`. Write that line in every PR body and the tracker maintains itself. Reach for `gh issue close` only for issues no PR resolves: duplicates, abandoned ideas, questions that got answered.

**In-progress is an assignee, not a state.** Assign `@me` when work starts, clear it when the issue is set aside unfinished. `SKILL.md` has the reasoning and the pull-request half of the rule; the operations are in `workflows/state.md`.

`gh issue develop 50 --name feat/GHI-50_login-form --checkout` links a branch and corroborates it in the UI, but the branch is not the record and never replaces the assignee. Add a `blocked` label only when the thing you are waiting on is outside the repository, where no dependency relation can express it.

**Read the description and every comment before reporting a discrepancy.** On any cleanup, audit or status pass, a status field is not the state: the body and the thread carry the decision that moved it, and a discrepancy reported from the fields alone is usually a decision you did not read. Never audit from status fields alone. This costs a deliberate step, because `gh issue view --json` returns exactly the fields named and nothing else, so `comments` has to be asked for by name or the thread is invisible rather than empty.

---

## Issue types are for organizations only

GitHub has an **issue type** field separate from labels, exposed as `gh issue create --type` and readable as `issueType`. It is defined at the **organization** level, in that organization's settings, and applies only to repositories the organization owns.

**A repository owned by a personal account cannot have issue types at all.** There is no setting to turn on and no field in the UI to find. `gh issue view <issue-number> --json issueType` answers `null` for every issue, and `gh api orgs/<user>/issue-types` answers 404, because a user account is not an organization. This is the normal case for a solo repository.

So: **`epic`, `bug` and `spike` are labels here**, per *Labels*, and `--type` is never passed. Do not go looking for the field, and do not treat its absence as something misconfigured.

The exception is a solo developer working in a repository owned by an org they belong to. There, check once with `gh repo view --json isInOrganization` and `gh issue list --limit 1 --json issueType`; if types exist, they replace the kind labels and nothing else, the layer label stays either way, and the answer belongs in `.agents/gh-solo.md` so no later session probes again. Passing an unknown type is an error rather than a no-op.

---
