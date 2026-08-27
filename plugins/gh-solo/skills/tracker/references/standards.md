# GitHub issue standards, solo developer

The rulebook this skill validates against and writes to. Per-repo overrides, where a repository wants a different label taxonomy or branch format, live in `.agents/gh-solo.md` in that repository.

Everything here assumes **one person owns the repo and does the work**. Where a team process would add a gate that somebody else clears, this one records a fact and moves on. The one place that changes the rule outright rather than relaxing it is the priority axis under *Never label the default*, where triage is absent and so the middle value is too.

---

## 1. Hierarchy

The levels of containment, each item nested inside the one above it:

1. **Repository** - the tracker itself; everything below lives inside it.
2. **Epic** - a normal issue, labelled `epic`, holding sub-issues.
3. **Issue** - the unit of work; one branch, one PR.
4. **Task-list checkboxes** - `- [ ]` items in an issue's body, for steps too small to track.

**Milestones are deliberately not on this list.** A milestone groups issues by *when they ship*, which cuts across the containment above: one issue can sit in an epic and a milestone at once, and neither implies the other. *Milestones, and why not Projects* covers them; they re-enter the hierarchy only through the limit below, where an epic that outgrows its shape becomes one.

GitHub has no separate epic or subtask type. An epic is an ordinary issue that other issues name as their **parent**, which `gh` supports natively:

```bash
gh issue create --title "authentication" --label epic --body-file epic.md
gh issue create --title "issue login links" --label backend --parent 51 --body-file issue.md
gh issue edit 50 --parent 51          # attach later
gh issue edit 51 --add-sub-issue 50   # or from the epic's side
gh issue edit 50 --remove-parent
```

**Do not use task-list checkboxes to fake an epic.** Sub-issues are a real relation that `gh issue view --json parent,subIssues,subIssuesSummary` can read back and that the web UI shows a progress bar for; a checkbox referencing `#52` is text. Checkboxes are for steps inside one issue, nothing more.

**Three levels is the limit.** If an epic's children need children, the epic is a milestone. Use `--milestone`.

### How big is one issue

**An issue is one branch and one pull request.** That is the whole test, and it is a shape rather than a number: work you would not put on a single branch is not one issue, however it was described in conversation.

Split it into an epic with children when any of these is true. Each is observable while writing the issue, before any work starts:

- **It would take more than about a week.** Not an estimate to record anywhere, just the question you ask once. Nothing is labelled and no number is stored.
- **Its acceptance criteria split cleanly into groups** that could be accepted on different days. Two groups that never reference each other are two issues.
- **It spans layers and each side stands alone.** A `backend` half and a `frontend` half that could each merge and be useful separately are two issues, not one `fullstack` issue.
- **The title needs "and" to be honest.** "Add the endpoint and the form that calls it" is an epic with two children wearing one title.
- **You cannot write its criteria without guessing.** That is a spike first, per *Spikes*, then a real issue once the answer is in.

**When in doubt, split.** Two issues that turn out to be one merge into a single branch at no cost. One issue that turns out to be two is discovered halfway through, with a branch already open and criteria that cannot all be ticked.

**There is no size label and no scale.** This check runs once, while the issue is being written, and nothing records its result. See *Never label the default* on why a label that lands on nearly everything is worse than no label.

---

## 2. Titles

**Format:** `imperative action`. Nothing else. The whole title is the deliverable.

**No prefix, no bracketed tag, no layer marker.** The layer is a label, per *Labels*, and a title that repeats it is noise in a list of eighty where every character competes. There is exactly one place each fact lives: the layer is a label, the kind is a label, the parent is a relation, and the title says what gets built.

Rules:

- Imperative verb: `add`, `build`, `fix`, `refactor`, `remove`.
- Name the deliverable, not the activity. "add user lookup endpoint", never "work on backend".
- Under ~40 characters. The title becomes the squash commit's subject on `main`, as `{type}({scope}): {issue title} (#{pr-number})`, and git's own guidance makes 50 columns the subject target with 72 the ceiling - the DISCUSSION section of `git commit --help`, and git's `Documentation/SubmittingPatches`, which calls 50 the soft limit. The prefix and suffix cost 10 to 30 columns depending on the type, the scope and the PR number's width, so ~40 is what keeps even the worst-case subject under the ceiling, and a short prefix pair lands it near the target - the ceiling, not the target, is the hard line here.
- All letters are lowercase.
- Do not encode the layer, the kind or the epic in the title. Every one of those is a label or a relation, and duplicating it means two places to update and one of them will go stale.

---

## 3. Bodies

GitHub renders **GitHub Flavored Markdown** everywhere. Write bodies to a file and pass `--body-file`, or pipe with `--body-file -`; do not build long bodies as a shell string, where newlines and backticks will not survive quoting intact.

**Issue body template:**

```markdown
## Overview

[What needs to be built and why. Five sentences or bullets at most]

## Acceptance criteria

- [ ] Criterion 1 (observable, testable)
- [ ] Criterion 2

## Technical notes

[Approach, endpoints, component names, data shapes]

## Dependencies

Blocked by #51. Needs: [API access, credentials, a design]
```

Every body written by an agent opens with the AI disclaimer line, above everything the templates show; its wording and rules, including the default used when the owner's global instructions file defines no line, live in the AI-disclaimer bullet of the `pr-flow` skill's `SKILL.md`. A template is the wrong place to duplicate a convention that applies everywhere.

**Epic body template:**

```markdown
## What this delivers

[The outcome. Five sentences or bullets at most]

## Why it matters

[The reason it is worth doing now]

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Done when

- [ ] Every sub-issue closed
- [ ] Tests passing
- [ ] Documentation updated
```

**The opening section is the summary, and it is capped at five sentences or bullets.** `## Overview` on an issue, `## What this delivers` on an epic, `## Question` on a spike: whichever it is, it answers "what is this" for someone who has forgotten the conversation, and it is the only section that has to be read. Five is a ceiling and not a target; two sentences that say it are better than five that circle it.

Anything past the cap belongs in `## Technical notes`, or a comment on the issue where the template has no notes section. Move it rather than trimming a fact out: the cap exists to keep the summary scannable, not to lose the detail.

**There is no separate TL;DR section**, on any of the templates. The title already says what the issue is, and the opening section already says it in prose, so a third rendering would appear on every issue in the tracker and carry no information — the same mistake as a `feature` label, which *Never label the default* rejects for the same reason.

**There is no `## Done when` on an issue**, though team templates always carry one. Every box it usually holds is a copy of a fact that lives elsewhere or a box nothing can tick: "criteria met" restates the checklist directly above it, "tests pass" is the plan's `## Verification` and the PR's copy of it, "code reviewed" is the review record the `pr-flow` merge gate refuses to land without, and "merged to main" is made true by the very event that closes the issue - the box would sit empty for the issue's whole open life and the progress counter would never reach full. Done, for an issue, is the close reason GitHub records anyway. The epic and spike templates keep their `## Done when` because those close by hand, and a close checklist is real work at a real moment.

And acceptance criteria are written as **checkboxes**, not bullets, because on GitHub they render as a progress counter on the issue and in every list that shows it, which is free tracking a solo dev actually benefits from.

### Writing good acceptance criteria

This is the part that survives every tracker and is worth more than all the label taxonomy below.

- Each criterion is **observable and testable**. A reader can objectively say pass or fail.
- Describe the **outcome, not the implementation**. "User sees a validation error when email is blank", never "Add an if-check in the controller".
- Cover the happy path **and** the important edge and error cases.
- One idea per bullet.

**Who ticks them: the agent implementing the issue**, criterion by criterion as each becomes verifiably true, with the gates that prove it green. A tick is the claim "implemented and verified", never acceptance - the owner accepts by merging the PR, after reading the diff. It follows that a read workflow never ticks one in passing, and nobody ticks one to make an issue look closable; `workflows/state.md` refuses that outright.

---

## 4. Labels

GitHub labels are created per repository and do not exist until somebody makes them. Check with `gh label list` before relying on one; `gh issue create` **fails** on a label that does not exist rather than creating it.

```bash
gh label create backend --color 1D76DB --description "Backend / API"
```

**Each label answers one question, and the axes are independent.** An issue carries at most one value from each, and they never contradict: an epic is not an alternative to a bug, because the two axes are not asking the same thing.

Every axis but Layer has a **default**, and the default is expressed by carrying **no label at all**. The right-hand column is the value that never appears in the picker, because creating it is the mistake the next section is about.

| Axis | Question it answers | Labels that exist | The default, never labelled |
|---|---|---|---|
| **Layer** | Where does the deliverable land? | `backend` `frontend` `fullstack` `infra` `docs` | none - mandatory, exactly one, on everything except an epic |
| **Nature** | Fixing, answering, or building? | `bug`, `spike` | **task** - building a thing |
| **Structure** | Does it contain other work? | `epic` | **leaf** - no sub-issues |
| **Priority** | When? | `urgent` `someday` | **normal** - in backlog order |
| **Readiness** | Is it specified enough to start? | `draft` | **ready** - startable as written |
| **Blocked** | Is something outside the tracker holding it up? | `blocked` | **unblocked** - or blocked by another issue, which is a relation, not a label; see *Dependencies* |

**There is no Size axis.** How big an issue is gets decided once, while it is being written, and the answer is either "this is one issue" or "this is an epic with children" — see *How big is one issue*. A number recorded on the issue afterwards serves a planning session and a velocity chart, and this repository has neither.

Read the Nature row carefully, because it is the one people try to complete. `bug`, `spike` and task are mutually exclusive answers to one question, so a `task` label would be the third value of a three-value set — and it would land on almost every issue in the repository. That is why it does not exist, and the same reasoning kills `feature`, which is only another name for it.

### The Layer axis

Layer is the one mandatory axis, and since titles carry no prefix it is the **only** place the layer is recorded. Set it at creation.

**Exactly one layer label, on every issue that is not an epic.** An epic is exempt because it is a container: its children carry the layers, and it usually spans them, so a layer on the epic itself would either lie or read `fullstack` every time. On everything else: not zero, and never two. This is the axis rule from the table above, and it is worth restating here because the layer is the one place two labels look defensible: an issue that touches the API and the UI seems to deserve both. It does not. `fullstack` exists precisely so that pair is never needed, and applying `backend` and `frontend` together is the mistake it was created to prevent.

| Label | The deliverable is |
|---|---|
| `backend` | An API, a service, a background job, a schema or a migration |
| `frontend` | A view, a component, a route, styling |
| `fullstack` | One thing that cannot be accepted from either side alone |
| `infra` | A pipeline, a deployment, a container, tooling or repository config |
| `docs` | Prose that is the point in itself: a README, a guide, an ADR |

**The layer is where the deliverable lands, not every file the branch touches.** This is what keeps the set from collapsing. Adding an endpoint and updating the README to describe it is `backend`: the endpoint is the deliverable and the README follows from it. Bumping a dependency to fix a UI bug is `frontend`, not `infra`, because the fix is the point and the lockfile is a means. Ask what the issue would be closed *for*, and label that.

Labels that would otherwise creep across the whole tracker depend on this rule:

- **`docs` only when the prose is the deliverable.** Nearly every issue updates docs — the epic template puts "Documentation updated" in `Done when` — so a label for touching them would land almost everywhere and say nothing. It is for a contributing guide, an ADR, a README rewrite: work with no code change behind it.
- **`infra` only when the pipeline or the deployment is the deliverable.** Editing a config file in passing does not make an issue infrastructural, or every issue that adjusts an env var would qualify.

**`fullstack` is required, not optional, when an issue genuinely spans both.** It is also rarer than it looks. An issue that merely *calls* an endpoint owned by another issue is `frontend`. If each side could merge and be useful on its own, that is not one `fullstack` issue at all, it is a `backend` issue and a `frontend` issue, per the split test in *How big is one issue*.

The layer set is a **default, not a law**. A repository that is one Rust binary has no backend/frontend split and should record its own set in `.agents/gh-solo.md`. What matters is that the set is small, closed, and mandatory.

**Because this axis is mandatory, its absence is a defect rather than a default**, unlike every other axis in the table above. Nothing in a title now reveals a missing layer label, so audit for it directly rather than expecting to notice:

```bash
gh issue list --state open --limit 100 \
  --search "-label:epic -label:backend -label:frontend -label:fullstack -label:infra -label:docs"
```

Structure is a **separate** axis, not a fourth value of Nature. An epic with three sub-issues has not stopped being a task or a bug; it is simply also a container. The two questions are orthogonal, and an issue answering "no" to both — no `bug`, no `spike`, no `epic` — is the most common issue in any tracker and carries no label on either axis. That is the design working, not a gap.

**Set labels at creation time**, not afterwards. An issue created without its layer label is invisible to every search in `workflows/search.md` that filters on one.

**Labels and milestones go on issues only, never on PRs.** GitHub accepts both on a PR, which is why the rule needs stating. The issue already carries them and the PR is one hop away through its `Closes #{issue-number}` line, so a labelled PR is a second copy that can drift, and every audit query in this file searches issues and would miss or double-count it. Milestones are worse than redundant there: the milestone's progress count mixes issues and PRs, so milestoned PRs double the count and make "3 open" stop meaning three issues of work.

### Drafts

`draft` marks an issue whose description is not finished: the owner wanted it in the backlog before there was time or information to write it out. It is not to be confused with a draft *pull request*, which is the normal state of every PR while its work is in progress and belongs to `pr-flow`; here, draft is a label on an issue. It answers the Readiness question in the table above, and the default - unlabelled - means startable as written. That is *Never label the default* working: most issues are created fully specified, so completeness needs no label and `draft` marks the departure.

A draft may skip the body template. Overview, acceptance criteria, technical notes: any or all may be missing or stubs, and the split test in *How big is one issue* is deferred, because it needs criteria to run on. What a draft never skips:

- **The title rules.** An imperative, lowercase title naming the deliverable is the minimum a backlog entry is; without one there is nothing to put in the backlog.
- **The layer label.** Naming where the deliverable lands takes no more information than the title already needed. An issue whose scope is genuinely unknown is missing an answer, not a description, and that makes it a spike, per *Spikes* - which carries a layer of its own either way.

`draft` is not `someday`. Priority says when, readiness says whether the spec exists, and the axes are independent as always: a draft can be `urgent`, and a fully specified issue can wait forever.

Remove the label the moment the description is finished, and run the split test then, so a finished draft can leave as an epic with children rather than as one oversized issue. Until the label comes off, the issue is invisible to "next task" in `workflows/search.md`, which is the point: a draft cannot be started, only finished.

### Never label the default

This is the rule the whole taxonomy is built on, and it is worth more than the table above.

**A label that lands on the overwhelming majority carries no information, and destroys the information in the ones without it.** If most issues are labelled `feature`, the label says nothing; and an unlabelled issue becomes ambiguous between "this is a bug" and "nobody got round to labelling it". The absence has to mean something specific, or the presence means nothing.

So the default state is **unlabelled**, and every label marks a departure from it:

- **No `task` label, and no `feature`, which is the same label under another name.** `bug` present means a defect; `bug` absent means building something, which is the Nature default the table above calls task. Adding either for symmetry would put a label on almost every issue in the tracker.
- **No middle priority.** `urgent` and `someday` are two labels giving three states, because the middle one is "unlabelled". Making it explicit means labelling everything, and then you cannot tell "considered, and it is normal" from "never considered".
- **No size label at all**, not even an optional one. It would land on nearly every issue, which by the rule above means it carries no information; and the one decision it might inform — split or not — is made before the issue exists. *How big is one issue* has that test.

The team practice this replaces is triage, where an explicit "medium" separates *triaged* from *untriaged* and somebody is accountable for the difference. Solo there is no triage step.

### Before adding a label

A label exists to partition issues that exist. Create `spike` the day you open one, not in advance. GitHub's stock labels (`good first issue`, `wontfix`, `question`) are the cautionary case: every repository starts with them, almost none uses them, and they sit in every label picker forever.

**Name it so it stands alone in a row of chips.** `backend` and `urgent` do; bare `high` does not, since it could be priority, severity, complexity or risk. If the value cannot be named that way because it is a number or a bare adjective, prefix it with its axis, separated by `_` — `severity_2`, not `2`.

`_` between the axis and the value, `-` inside either half: `status_in-progress`, never `status-in-progress`. That is the same rule the branch and plan-file formats use in *Quick reference*, where `_` separates fields and `-` separates words within one, so a prefixed label parses the same way a branch name does.

---

## 5. Dependencies

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

## 6. Milestones, and why not Projects

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

## 7. State

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

## 8. Spikes

**A spike is a time-boxed investigation whose deliverable is an answer, not working software.** The term comes from Extreme Programming, by analogy with driving a spike through a problem to see what it is made of: you go straight down, learn what you need, and you are expected to throw the code away afterwards.

It exists because some work cannot be scoped until a question is settled. "add OpenAPI type generation" is not an issue you can write criteria for when nobody knows whether the generator can express the API's discriminated unions. Guessing produces an issue that balloons; a spike buys the knowledge first, and the real issue is written afterwards with its answer in hand.

Its properties separate it from ordinary work, and each is load-bearing:

- **It asks a question**, not "investigate X". The question must be answerable, and the answer must change what you build next. If no plausible answer changes anything, the spike is procrastination with a ticket number.
- **It has a time box**, agreed before starting, and the box is a limit rather than an estimate. This is what stops research being open-ended.
- **Its output is a decision recorded somewhere durable** — a document, an ADR, a comment on the issue it unblocks. A spike that produces only a feeling in the developer's head has not shipped.

The code a spike produces is a means, not the deliverable, and it is normal to delete it. If you find yourself protecting it, the spike ended and an implementation issue started without anyone noticing.

**Title:** `spike - the question`, labels `spike` and its layer.

Example: `spike - evaluate OpenAPI codegen`

The `spike - ` opener is not a layer prefix and stays. It is part of the sentence, not a tag: without it the title reads as a promise to build the thing rather than to investigate whether to.

**Spike body template:**

```markdown
## Question

[What needs to be learned. Five sentences or bullets at most]

## Time box

[Maximum: 4 hours, one day, two days]

## Deliverable

[A document, a proof of concept, a decision recorded]

## Done when

- [ ] Question answered
- [ ] Findings written down somewhere durable
- [ ] Recommendation made
```

The time box is the point. A spike that runs over its box has answered a different question than the one asked, and the honest move is to close it with what was learned and open a new one.

---

## 9. Issue types are for organizations only

GitHub has an **issue type** field separate from labels, exposed as `gh issue create --type` and readable as `issueType`. It is defined at the **organization** level, in that organization's settings, and applies only to repositories the organization owns.

**A repository owned by a personal account cannot have issue types at all.** There is no setting to turn on and no field in the UI to find. `gh issue view <issue-number> --json issueType` answers `null` for every issue, and `gh api orgs/<user>/issue-types` answers 404, because a user account is not an organization. This is the normal case for a solo repository.

So: **`epic`, `bug` and `spike` are labels here**, per *Labels*, and `--type` is never passed. Do not go looking for the field, and do not treat its absence as something misconfigured.

The exception is a solo developer working in a repository owned by an org they belong to. There, check once with `gh repo view --json isInOrganization` and `gh issue list --limit 1 --json issueType`; if types exist, they replace the kind labels and nothing else, the layer label stays either way, and the answer belongs in `.agents/gh-solo.md` so no later session probes again. Passing an unknown type is an error rather than a no-op.

---

## 10. Quick reference

| Item | Format | Example |
|---|---|---|
| Epic | Feature-area name, label `epic` | `authentication` |
| Issue | `action`, plus a layer label | `add user lookup endpoint` + `backend` |
| Spike | `spike - question`, labels `spike` + layer | `spike - evaluate OpenAPI codegen` + `backend` |
| Bug | `what is wrong`, labels `bug` + layer | `profile card crashes on empty name` + `frontend` |
| Draft | Any of the above, plus the `draft` label; body may be a stub | `add receipt export` + `backend` + `draft` |
| Branch | `{type}/GHI-{issue-number}_{slug}` | `feat/GHI-50_login-form` |
| Commit header | `{type}: {description} (#{issue-number})` | `fix: reject a blank email (#50)` |
| Plan file | `YYYY-MM-DD_GHI-{issue-number}_{slug}.md` | `2026-08-16_GHI-50_login-form.md` |
| PR title | `{type}({scope}): {issue title}` - the scope is the issue's layer label, omitted when it repeats the type | `feat(backend): add user lookup endpoint` |
| PR body | Must contain `Closes #{issue-number}` | `Closes #50` |
| Assignee | Issue: `@me` while in progress or in queue, cleared when set aside. PR: `@me` always, set at creation | `--add-assignee @me` |

### Branch and commit type

`{type}` in a branch name is a **Conventional Commits type**, and it is the same vocabulary as the `type:` on a commit header and on a pull request title. One vocabulary across all of them, so a `fix` branch carries `fix:` commits and opens a `fix:` PR.

| Type | For |
|---|---|
| `feat` | New behaviour |
| `fix` | A defect |
| `refactor` | Restructuring with no behaviour change |
| `docs` | Prose |
| `chore` | Tooling, dependencies, config |

That set is the one this skill assumes; the Conventional Commits ecosystem allows more (`test`, `build`, `ci`, `perf`, `style`). **A repository's existing branch names win over this default** — record the set in `.agents/gh-solo.md` if it differs.

**Type describes the change, labels describe the deliverable.** They are separate axes and neither derives from the other: a `docs` branch usually sits on a `docs`-labelled issue and a `fix` branch on a `bug` issue, but a `refactor` branch can serve a `feat`-shaped issue and a `chore` can close a `bug`. Never infer the label from the branch, or the branch from the label. **The word `docs` now lives on both axes and still asks two different questions**: as a type it says the change is prose, as a label it says the deliverable is prose. They usually coincide, which is exactly why the scope rule below omits the scope when it would repeat the type.

**Commit header:** `{type}: {imperative description} (#50)`. The description is imperative and lowercase, and the issue reference goes at the end. A body is optional, one blank line after the description, and worth writing whenever the *why* is not obvious from the diff.

**That format describes a commit on a branch.** Where the repository squash-merges, the commit that lands on the trunk is built from the *pull request* title instead and carries `(#{pr-number})`, so the trunk references PRs while branch history references issues. Both are correct and neither should be "fixed" to match the other; the `pr-flow` skill owns that transition.

The spec's optional scope, `type(scope):`, is used in exactly one place: the **pull request title**, and from there the squash commit on the trunk. The scope is always the issue's **layer label**, never a fresh choice - decided once, on the issue, it cannot drift - and it is **omitted when it repeats the type**, so a `docs`-labelled issue with a `docs` type opens `docs: rewrite the readme`, never `docs(docs): …`. The trunk is the one place the layer is worth carrying: `git log --oneline` on `main` shows squash subjects two hops away from the issue's labels, and `feat(frontend): add login form (#60)` answers "what did this touch" without a hop. **Branch commits carry no scope.** Every commit on a branch would repeat the same value, and squashing deletes that history anyway; the header there stays `{type}: {description} (#{issue-number})`.

### `#50` in prose, `GHI-50` in names

**Use `#50` everywhere GitHub reads it**: commit messages, PR bodies, issue bodies, comments. It is the platform's own form, it autolinks to the issue with its title and state on hover, and `Closes #50` in a PR body is what closes the issue on merge. Nothing here invents an alternative to it.

**Use `GHI-50` only where `#` cannot go**: branch names and plan filenames. `#` is hostile in a shell and in a path, so the sigil that marks 50 as an issue number is unavailable, and a bare `50` in `git branch -a` or a directory listing says nothing about what it counts. `GHI` stands for GitHub Issue and supplies that missing label. This is a legibility rule, not a linking one — neither a branch name nor a filename autolinks anywhere.

The separator does the parsing, not the prefix. `{type}/GHI-{issue-number}_{slug}` splits on the first `_`, so the number falls out with one regex and no knowledge of the slug, which is what a scheme like `feat/50-login-form` cannot promise once a slug begins with a digit.
