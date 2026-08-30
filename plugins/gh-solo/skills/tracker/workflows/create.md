> **Tools used:** `Bash(gh:*)` for `gh issue create` / `gh issue edit` / `gh label list`, `Bash(git:*)` for the Step 1 freshness check, `Read` for the standards and per-repo config, `Write` for the body files.

Break work into GitHub issues and create them. You are writing the issues that will then be implemented, so write them for an implementer that never saw this conversation.

## Step 1 - Name the target repository

Preflight already resolved it. **State it in one line before doing anything else**, so a wrong working directory is caught now rather than after eight issues land in the wrong tracker. Do not re-run the preflight commands.

**Then, when any of the breakdown's source material was read from a file in the working tree**, establish that the tree is current before writing a single row:

```bash
git fetch <remote> --quiet && git log --oneline HEAD..<remote>/main
```

`<remote>` per the remote-name convention in the `pr-flow` skill's `SKILL.md`; `main` reads as the repository's default branch where `.agents/gh-solo.md` names another - and that name is needed *now*, so when the file exists, read it here rather than waiting for Step 2. Commits listed mean the file you read may not be the file that exists. Say so, name the commits, then bring the tree up to date or read around it - never silently continue on stale content:

- **On the default branch, fast-forward it yourself**: `git merge --ff-only <remote>/main`. `--ff-only` is the guard, not a nicety: local `main` never carries local commits per the suite's hard rule, so a fast-forward is the only legal movement, and a refusal means the trunk has diverged locally - stop and report that loudly instead of resolving it, because something has already broken the never-commit-to-`main` rule. If uncommitted changes make the merge refuse, fall back to the next bullet rather than stashing anything.
- **On any other branch, do not pull and do not rebase.** Moving a feature branch is the owner's call, and a stacked branch belongs to `gh stack sync`. Instead, ask per file whether *this branch* owns the version you read: `git log --oneline <remote>/main..HEAD -- <path>` non-empty, or `git status --porcelain -- <path>` non-empty, means the working-tree file is itself the current source - the branch changed it after the trunk's copy - so say so and use it. Only for a path the branch has not touched does the trunk hold the newer copy: there, `git show <remote>/main:<path>` reads it without touching the tree. An untracked path has no trunk copy at all, so the freshness question does not apply to it - name it as unversioned in the plan's Notes.

Either way, account for every line that differs from what you first read: an addition becomes a row, a removal means a row must *not* be created, and an amendment changes a row. An issue written from a stale spec outlives the session and is indistinguishable from one written from a current one.

Even when nothing is behind, **re-read any source file that was read before this skill loaded**. The read that informed the conversation happened at an unknown moment; the read that feeds the tracker happens now.

## Step 2 - Load standards and config

Read `references/standards.md`. If `.agents/gh-solo.md` exists in the repository, read it too and let it override the default layer set, label taxonomy and branch format.

## Step 3 - Check the label taxonomy

Run `gh label list`. Every label the plan intends to use must already exist, because `gh issue create` fails on an unknown label rather than creating it.

If labels are missing, list them and ask whether to create them, with the exact commands you would run. Do not create labels silently: a label set is a taxonomy the repository lives with, and inventing one mid-plan is how a tracker ends up with `BE`, `backend` and `Backend` all in use at once, splitting every filter three ways.

**Where the repository has no `.agents/gh-solo.md` and the owner has just confirmed a taxonomy, offer to write one.** This is the moment the offer belongs to: the labels are settled and in front of them, so the axis the file records is a decision they have already made rather than one they are being asked to make for a file's sake. Offer, never write unprompted, and say what else the file carries beyond the labels - the check commands `implement` refuses to improvise without, above all.

## Step 4 - Look for an existing epic

Before proposing a new epic, search for one that already covers the scope:

```bash
gh issue list --state all --label epic --limit 50 --json number,title,state
```

Match on the domain, not the exact wording. Attaching to an existing epic is nearly always better than opening a second one beside it.

## Step 5 - Present the plan and stop

Output the whole breakdown and **create nothing yet**:

```
## Proposed breakdown

Repository: owner/name
Epic: [name] - [existing #51 | new]

| Row | Title | Kind | Layer | Milestone | Readiness | Blocked by |
|---|---|---|---|---|---|---|
| 1 | add user lookup endpoint | task | backend | v1.0 | ready | - |
| 2 | build the login form | task | frontend | - | draft - no criteria yet | row 1 |

Labels to be applied: ...
Labels that must be created first: ...

Notes:
- [assumptions, open questions, anything deliberately left out]
```

Then ask: **"Does this look right? Anything to change before I create them?"**

**Create nothing until the owner confirms.** If they ask for changes, revise and ask again.

**There is no size column and no estimate.** If a row looks too big for one branch, that is not a number to record: split it into an epic with children, per the test under *How big is one issue* in `references/standards.md`, and show the split in this table instead.

**The milestone column is `-` when there is none, so an absent milestone is a decision the owner saw rather than something nobody asked about.** Ask which milestone, if any, before presenting the table. `workflows/search.md` orders startable work by milestone first, and a sub-issue does not inherit its epic's, so an issue created without one is invisible to the tool meant to surface it, per *Milestones, and why not Projects* in `references/standards.md`.

**A row the owner cannot fully specify yet lands as a draft.** Show its Kind as normal - Readiness and Nature are independent axes, and a draft bug whose Kind read `draft` would lose its `bug` label at creation - and mark it in the Readiness column with what is missing, as the template's row 2 shows. The confirm gate below is the only gate, so the owner must be able to see per row which ones they are approving as drafts and that those rows skipped the split test. The `draft` label then joins that row's labels at creation. A draft skips the split test - there are no criteria to run it on - and its body may be a stub, but it still needs a real title and a layer label, per *Drafts* in `references/standards.md`. Offer the form only when the owner says they want something on the backlog without the time or information to finish it; never downgrade a row to draft yourself to avoid writing criteria you could write.

## Step 6 - Create, in dependency order

Once confirmed, create bottom-up so that every `--parent` and `--blocked-by` target already exists:

1. The epic, if new: `gh issue create --title "..." --label epic --body-file <file>`
2. Spikes
3. Issues nothing depends on
4. Issues blocked by the above, passing `--blocked-by <issue-number>`

Attach each to the epic at creation with `--parent <epic-issue-number>`, not afterwards. Write every body to a file and pass `--body-file`; do not build multi-line bodies as inline shell strings, where newlines, backticks and `#` will not survive quoting. The body files are throwaway: write them to the harness scratchpad, never `/tmp` and never the repository tree. **Every body opens with the AI disclaimer line** - an issue is prose under the owner's name, and the wording lives in the AI-disclaimer bullet of the `pr-flow` skill's `SKILL.md`, which also carries the default used when the owner's global instructions file defines no line.

A draft's body is the disclaimer line plus the full template with its sections left empty, and whatever the owner actually gave you - a sentence, a link, a pasted note - placed under the right heading. The `draft` label is what says the body is unfinished, so empty headings cannot read as a finished description; what they buy is a skeleton the owner can fill in by hand later without reconstructing the template. The one thing never to stub is a checkbox: an empty `## Acceptance criteria` heading is fine, but placeholder `- [ ]` items render as a `0/N` task counter on the issue and in every list view, and the counter would lie for the draft's whole life.

```bash
gh issue create \
  --title "add user lookup endpoint" \
  --label backend \
  --milestone "v1.0" \
  --parent 51 \
  --body-file <scratchpad>/issue-1.md
```

Pass `--milestone` wherever the confirmed table gave one, and leave it off where the row said `-`. Setting it afterwards is an extra command per issue, and the issue is unfindable by `next` in between.

`gh issue create` prints the new issue's URL. Capture each number as you go; the next command in the sequence needs it.

If any create fails, stop and report which issues exist and which do not. Do not retry blindly: a half-created dependency graph is worse than none, and the usual cause is a missing label, which step 3 should have caught.

## Step 7 - Confirm

```
| # | Title | Labels | Milestone | Parent | Blocked by | URL |
|---|---|---|---|---|---|---|
```

Then offer the next step, which is usually a branch rather than another issue:

```bash
gh issue develop <issue-number> --name <type>/GHI-<issue-number>_<slug> --checkout
```

---

## Finishing a draft

The other end of a draft's life, routed by `finish <number>` or the owner asking to finish or flesh out a draft issue. The deliverable is the description the issue never got, and the moment it exists the `draft` label comes off.

This section is entered directly by `finish`, so it carries Steps 2 to 4 with it: read `references/standards.md` and `.agents/gh-solo.md` before writing anything, and where step 4 below takes the split path, run Step 3's `gh label list` check and Step 4's existing-epic search before creating a single child - `gh issue create` still fails on a label that does not exist, and a failure halfway through a split is the half-created graph Step 6 warns about.

1. **Fetch it**: `gh issue view <issue-number> --json title,body,labels,parent,blockedBy`. If it does not carry `draft`, say so and stop - there is nothing to finish.
2. **Write the missing sections** with the owner, into the empty headings the stub body already carries, read-modify-write with `--body-file` per the standards. This is where the information that was missing at creation gets supplied, so if it is still missing, ask rather than guess. If the stub does not already open with the AI disclaimer line - a draft the owner typed by hand on GitHub will not - add it, because the description below it is now agent prose under the owner's name.
3. **Run the split test now** - *How big is one issue* in `references/standards.md`. This is the moment `workflows/create.md`'s plan gate deferred it to, and nothing downstream runs it again.
4. **If it passes as one issue**: update the body, then `gh issue edit <issue-number> --remove-label draft`. **If it fails**: the draft becomes an epic with children - present that split through the same Step 5 confirm gate above, create the children on confirmation, and relabel the original (`--add-label epic`, `--remove-label draft`, layer label off per the epic exemption).

Removing the label is what makes the issue visible to "next task" in `workflows/search.md` again, so it is the last step, after the body is true.

## Rules

- **Never create without showing the plan first.** This is the one gate worth keeping from the team process, and it exists for a different reason here: solo, nobody else will catch a mis-scoped issue before it becomes a branch.
- **Run the split test on every row before presenting the plan.** *How big is one issue* in `references/standards.md` has it: one branch and one pull request, no more than about a week, criteria that do not fall into independent groups, no "and" in the title. A row that fails becomes an epic with children in the same table. This is the check that stops oversized issues, and the plan gate above is the only place it happens — nothing downstream will catch it, because no workflow measures an issue after it exists. Draft rows are the one exception: their test is deferred to the moment the draft is finished, which is the plan gate for the description they did not yet have.
- **Every issue except an epic gets exactly one layer label, set at creation.** Titles carry no prefix, so the label is the only record of the layer, and an issue created without one is invisible to every layer filter in `workflows/search.md`.
- Titles are the deliverable and nothing else: no `[BE]`, no bracketed tag, no duplicated size or epic name.
- Acceptance criteria are checkboxes, so GitHub counts them.
- **Never `--assignee @me` at creation.** Assignment means work has started, not ownership, and a backlog created pre-assigned makes `assignee:@me is:open` useless on the day it matters. Assignment happens when work starts; see `workflows/state.md`.
- **No issue is created from a file the tree might have rewritten.** Step 1's freshness check is the guard, and it is not skippable for a "small" breakdown: the incident behind it wrote a whole breakdown from a roadmap one commit stale, and every item the missed commit had added, amended or removed had to be found and re-filed in a second pass.
- If something is unclear, ask. An issue written from a guess costs more to discover wrong than to clarify now.
