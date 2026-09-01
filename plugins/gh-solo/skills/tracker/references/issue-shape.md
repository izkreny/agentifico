# What an issue looks like

How work is divided into issues, and how each one is titled and bodied. The other halves of the standards are `references/tracker-fields.md`, for the fields GitHub carries, and `references/formats.md`, for the names that encode an issue number.

## Hierarchy

The levels of containment, each item nested inside the one above it:

1. **Repository** - the tracker itself; everything below lives inside it.
2. **Epic** - a normal issue, labelled `epic`, holding sub-issues.
3. **Issue** - the unit of work; one branch, one PR.
4. **Task-list checkboxes** - `- [ ]` items in an issue's body, for steps too small to track.

**Milestones are deliberately not on this list.** A milestone groups issues by *when they ship*, which cuts across the containment above: one issue can sit in an epic and a milestone at once, and neither implies the other. *Milestones, and why not Projects* covers them; they re-enter the hierarchy only through *Three levels is the limit*, where an epic that outgrows its shape becomes one.

GitHub has no separate epic or subtask type. An epic is an ordinary issue that other issues name as their **parent**, which `gh` supports natively:

```bash
gh issue create --title "authentication" --label epic --body-file epic.md
gh issue create --title "issue login links" --label backend --parent 51 --body-file issue.md
gh issue edit 50 --parent 51          # attach later
gh issue edit 51 --add-sub-issue 50   # or from the epic's side
gh issue edit 50 --remove-parent
```

**Do not use task-list checkboxes to fake an epic.** Sub-issues are a real relation that `gh issue view --json parent,subIssues,subIssuesSummary` can read back and that the web UI shows a progress bar for; a checkbox referencing `#52` is text. Checkboxes are for steps inside one issue, nothing more.

### Three levels is the limit

If an epic's children need children, the epic is a milestone. Use `--milestone`.

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

## Titles

**Format:** `imperative action`. Nothing else. The whole title is the deliverable.

**No prefix, no bracketed tag, no layer marker.** The layer is a label, per *Labels*, and a title that repeats it is noise in a list of eighty where every character competes. There is exactly one place each fact lives: the layer is a label, the kind is a label, the parent is a relation, and the title says what gets built.

Rules:

- Imperative verb: `add`, `build`, `fix`, `refactor`, `remove`.
- Name the deliverable, not the activity. "add user lookup endpoint", never "work on backend".
- Under ~40 characters. The title becomes the squash commit's subject on `main`, as `{type}({scope}): {issue title} (#{pr-number})`, and git's own guidance makes 50 columns the subject target with 72 the ceiling - the DISCUSSION section of `git commit --help`, and git's `Documentation/SubmittingPatches`, which calls 50 the soft limit. The prefix and suffix cost 10 to 30 columns depending on the type, the scope and the PR number's width, so ~40 is what keeps even the worst-case subject under the ceiling, and a short prefix pair lands it near the target - the ceiling, not the target, is the hard line here.
- All letters are lowercase.
- Do not encode the layer, the kind or the epic in the title. Every one of those is a label or a relation, and duplicating it means two places to update and one of them will go stale.

---

## Bodies

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

This is the part that survives every tracker, and it is worth more than the whole of *Labels*.

- Each criterion is **observable and testable**. A reader can objectively say pass or fail.
- Describe the **outcome, not the implementation**. "User sees a validation error when email is blank", never "Add an if-check in the controller".
- Cover the happy path **and** the important edge and error cases.
- One idea per bullet.

**Who ticks them: the agent implementing the issue**, criterion by criterion as each becomes verifiably true, with the gates that prove it green. A tick is the claim "implemented and verified", never acceptance - the owner accepts by merging the PR, after reading the diff. It follows that a read workflow never ticks one in passing, and nobody ticks one to make an issue look closable; `workflows/state.md` refuses that outright.

---

## Spikes

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
