> **Tools used:** `Bash(git:*)` for the branch and the commit, `Bash(gh:*)` for `gh pr create`, `Read` / `Write` for the plan file.

Open the pull request for a branch that has just been cut. The sequence is branch, plan file, commit, draft PR, **stop**. It runs once at the start of the work, not at the end.

The branch itself is not created here. `gh issue develop` belongs to the issue that owns it, in `tracker` skill, and it is what links the branch to the issue - and only that. **It assigns nobody**: assignment is a separate command, run before branching per the *Start work* section of that skill's `state` workflow, so check that the issue carries `@me` rather than assuming the branch brought it.

## Step 1 - Confirm the branch and recover the issue

```bash
git branch --show-current
```

The format is `{type}/GHI-{issue-number}_{slug}`, and the issue number falls out of it by the parse stated once in `SKILL.md`'s branch-format bullet: `feat/GHI-50_login-form` gives `50`.

Stop if the branch is `main`. Committing to `main` is forbidden outright per `SKILL.md`.

Read the issue for what the plan has to satisfy:

```bash
gh issue view <issue-number> --json title,body,labels,parent,blockedBy
```

Two of those fields are gates, not context, and both matter most on the `auto` chain, where no owner reads the plan before implementation starts:

- **Stop if the labels include `draft`.** The description is unfinished by its own declaration - per *Drafts* in the `tracker` standards, a draft is finished, not started - so there are no criteria for the plan to satisfy. Name what the body is missing and point at that skill's `finish` workflow.
- **Stop on an open `blockedBy`.** Name the blocker and its state and ask; a plan written against a blocked issue gets rewritten when the blocker lands, and the branch it opens cannot merge first anyway.

**The tree is a gate of the same kind.** The plan is written from the code, so before reading any of it, establish that the code being read is the code that exists:

```bash
git fetch <remote> --quiet && git log --oneline HEAD..<remote>/main
```

At this point in the branch's life that list should be empty - the branch was just cut. Commits in it mean the branch sits on a stale trunk, usually because it was cut locally from a `main` nobody fetched, and a plan written here would describe a codebase that no longer exists - then be committed, pushed, and reviewed as if it did. Recover it with `git merge --ff-only <remote>/main`, which is its own guard: it fast-forwards a branch that carries nothing of its own - say what was done and which commits it picked up - and refuses outright on local commits, on divergence, or on uncommitted work the update would overwrite, with no gap between the check and the move. A refusal is the owner's call: say so and name the commits rather than continuing silently. `<remote>` per the remote-name convention in `SKILL.md`.

On a *stacked* branch none of this applies: the trunk sitting ahead of a `--base <parent>` child is normal for the stack's whole life, moving the stack is `gh stack sync`'s job per `workflows/stack.md`, and nothing here fast-forwards or resets anything. Say which case it is before reporting staleness.

## Step 2 - Write the implementation plan

**Filename:** `YYYY-MM-DD_GHI-{issue-number}_{slug}.md`, the date being the day the plan is written and never changed afterwards. The `{slug}` matches the branch's. Example: `2026-08-16_GHI-50_login-form.md`.

**Location:** `docs/plans/` unless the repository already keeps them elsewhere, in which case follow what is there. Check before writing; a second plan directory is worse than an unfamiliar one.

**There is no plan template, deliberately.** A plan is written in planning mode by an agent that has just read the issue and the code, and the sections worth having are the ones that ticket raises. Write the plan the problem needs.

**The sections below are required and must carry these exact names**, because other things read them:

- **`## Steps`** — the ordered work, as plain bullets. Other things read it, which is why the name is fixed rather than left to the planner: the PR body, where it becomes checkboxes, and the session's own todo list during implementation. Each box is ticked by whoever lands its step, at the moment it lands, per the standing convention in `SKILL.md`; the draft state only means the counter has no reader until `workflows/ready.md` audits it. Note that this file's own `## Step N` headings are the workflow's steps, not the plan's; only the backticked `## Steps` means the plan section.
- **`## Verification`** — how you will know it worked. Which gate, which command, and what that gate *cannot* see. This is the section most likely to be skipped and most likely to be wanted later. **Separate the entries that have an exit code from the ones that do not**: a `npm test` is a gate an agent can run and tick, while "restart the machine and read the row back" is a procedure the owner has to judge. Ordering them gates-first, judgement-after costs a line and tells the implementing agent which boxes are its own to close.

Everything else is the planner's call. Planning mode already knows how to write a plan, and those names exist only because this workflow and the implementation todo list have to find those lists without guessing — not because the rest matters less. Any future required section gets named here explicitly, or it is not required.

**The steps are plain bullets in the plan, never checkboxes.** That list is the plan's *intent*, frozen at plan time and reviewed as a diff — it is what the draft PR exists for the owner to argue with. The same list appears in the PR body as `- [ ]`, where it carries *progress*. Two jobs, not two copies of one fact: a checkbox inside a committed file can only be ticked by another commit, and the intent should not change every time a box does.

If the PR's list later diverges from the plan's, that is information rather than drift — scope moved, and the diff between intent and outcome is worth being able to see.

**No acceptance criteria.** They live on the issue, where GitHub counts them. Reference the issue and let it hold them.

If the plan is only restating the issue in different words, the issue was specific enough and the plan adds nothing. The plan answers *how*; the issue answers *what*.

## Step 3 - Commit it, alone, as the branch's first commit

**Alone is the rule, not a preference.** Everywhere else the guidance is to use the fewest commits that make sense; the plan is the one standing exception, because the draft PR has to exist before any code does, and it can only do that if the plan is the first thing on the branch.

**Verify the branch in the same breath as the commit.** The branch you checked out earlier in the session is a snapshot, not a guarantee — HEAD can move during a planning session, and a commit meant for a feature branch can land on `main` straight through the hard rule:

```bash
git branch --show-current        # read it again, immediately before committing
git add <the plan file>
git commit -m "docs: add plan for {short description} (#{issue-number})"
```

Then read back the `[branch sha]` line the commit prints. If it names the wrong branch, recover with `git branch -f <feature> <sha>` and `git reset --hard <remote>/main` on `main` - noting the reset discards any uncommitted changes in the tree and trusts the remote-tracking ref as last fetched, so fetch first and stash anything loose.

The commit header follows *Branch and commit type* in the `tracker` standards. A plan file is `docs`.

**Run the repository's documentation checks before pushing.** A plan file is a documentation change, and a repo that validates its docs usually does so in CI without a local hook, so nothing catches a broken path or an unclosed fence until the PR is already red. `scripts/docs-check.py` in this skill checks that every backticked path resolves and every code fence closes; pass `--ignore <glob>` (repeatable) for backticked paths that belong to another tree than the one being checked, and the repository may have more checks of its own. **The bare command reads as a failure on most repositories**, because a plan legitimately names paths that do not exist here - the repo's own agent config, a file the plan will create - so read the script's own usage note for the ignore set it expects before treating its output as findings.

```bash
git push -u <remote> "$(git branch --show-current)"
```

The first push of a branch takes `-u`. Without it the branch has no upstream, which costs `git status`, `git pull` and every later bare `git push` their reference point. `<remote>` is resolved by the recipe in `SKILL.md`'s remote-name convention, never assumed to be `origin` - a repository whose one remote is named otherwise fails this push right after the plan commit lands, leaving the branch half-opened.

## Step 4 - Open the PR as a draft

```bash
gh pr create --draft --assignee @me --title "{type}({scope}): {issue title}" --body-file <file>
```

**The title carries the commit convention, because on merge it becomes a commit.** The repository squash-merges, and GitHub builds the squash commit's subject from the PR title plus an appended `(#{pr-number})`. So `feat` + `frontend` + *add a login form* lands on `main` as `feat(frontend): add a login form (#60)` — conventional, lintable, and readable in `git log --oneline` without visiting the issue. Neither part is a fresh choice: the `{type}` is the branch's, and the `{scope}` is the issue's **layer label**, read from the issue fetched in Step 1 and omitted when it would repeat the type (`docs: rewrite the readme`, never `docs(docs): …`) — both rules live under *Branch and commit type* in the `tracker` standards. A bare issue title would land without any of it, and `main` would be the one place the convention does not hold; `workflows/merge.md` owns what happens to this title at merge time.

**`--draft` is not optional.** The PR is the workspace for this branch from here on, so it is open while the work is unfinished, and a draft is how everything else tells the difference. `workflows/review.md` skips drafts for exactly this reason: without the flag, the review loop would offer to review a PR containing nothing but a plan.

**The body is where the state lives.** It is written by hand rather than with `--fill`, because `--fill` takes the body from the commit message and the commit message carries none of what belongs here:

**PR body template:**

```markdown
Closes #{issue-number}

## Plan overview

[YYYY-MM-DD_GHI-{issue-number}_{slug}.md](../blob/main/docs/plans/YYYY-MM-DD_GHI-{issue-number}_{slug}.md) (live after merge; while this PR is open, read it in **Files changed**)

[The approach, so the PR is readable without opening the plan. Five sentences or bullets at most.]

## Steps

- [ ] Step 1
- [ ] Step 2

## Verification

- [ ] The command that proves it works
- [ ] The other one
- [ ] [owner] The check with no exit code, if the plan has one

[What these gates cannot see.]

## Open questions

[Copied from the plan, because this is where the discussion happens. Ends on "None." once every entry is settled - a bare heading reads as unfinished.]

## Settled

["None yet." at creation, so the heading is never bare. Each answered question moves here from Open questions, question and decision together, the first one replacing the placeholder.]
```

The AI disclaimer goes above all of it, as it does on the plan file and in the commit body. The wording and the rule, including the default used when the owner's global instructions file defines no line, live in the AI-disclaimer bullet of `SKILL.md`; it is not repeated here, because a template is the wrong place to define a convention that applies everywhere.

Why each part earns its place:

- **`Closes #{issue-number}`** closes the issue on merge and records the link permanently. Nothing else enforces it.
- **The plan link** is what makes "implement PR 60" a complete instruction: the PR body names the plan, the plan holds the approach, and the issue holds the acceptance criteria. One link per hop, no duplication. It points at `main` rather than the feature branch so it survives the branch being deleted after merge — it 404s until then, which costs nothing while the plan is the first file in the PR's own **Files changed** tab.
- **The step checklist** is the plan's `## Steps` as checkboxes. GitHub renders it as a progress counter, so state is readable on the PR without opening a file, and ticking a box costs an edit rather than a commit.
- **`## Verification` is here for the same reason `## Steps` is**, and carried the same way: the plan's copy is the intended gates, this copy is whether they have actually been run. Every required section of the plan therefore appears in the body as checkboxes, because each has a progress dimension the plan file cannot record. This is the section `workflows/ready.md` audits before the final push — it is the answer to "which checks does this branch owe", written by the agent that had just read the code. Each box is ticked by whoever ran that gate, as it passes; `ready` only reads them, and refuses to lift the draft while one is empty. Carry the plan's gates-first, judgement-after order into the body, and prefix each judgement entry `[owner]` - it is how the implementing agent and `workflows/ready.md` tell which boxes an agent can close without re-deriving it from the wording. The "what these gates cannot see" line stays prose: it is a caveat, not a task.
- **Open questions** are here because a PR body is where a comment thread can answer them. In the plan file alone they are rhetorical. An entry leaves this section the moment it is settled - moved into `## Settled`, never deleted.
- **`## Settled`** is where an answered question lands, question and decision together, because the question is what makes the decision legible to a later reader. Moving rather than deleting matters twice over: `workflows/ready.md` audits `## Open questions` before lifting the draft, and `workflows/merge.md` has the squash merge write the whole PR body into the commit on `main` (`squash_merge_commit_message: PR_BODY`), so a decision recorded here survives in `git log` permanently, where a comment thread never lands. The move happens where the decision does: a discuss round moves an entry the moment the owner's closing decision settles it, per `workflows/discuss.md`, and the pre-spawn sync in the `implement` skill catches anything still unmoved before implementation starts - a body edit either way, like ticking a box, never a commit. A decision settled in the terminal instead of a thread goes into the plan file under the same `## Settled` heading, per `workflows/discuss.md`: one name for the concept everywhere it appears, and the one sanctioned way a plan file changes after plan time.

For a branch that depends on another unmerged branch this is a stacked PR instead: add `--base <parent>`, and see `workflows/stack.md` for whether a stack is wanted at all.

**Then read what CI made of the push.** Now that the PR exists, `gh pr checks <pr-number> --watch` - or `gh run list --branch <branch>` where the push itself triggers a workflow. This is the cheapest moment the branch will ever have: it holds one plan file, so a red check here means the workflow file or the docs check is broken, not the work, and catching that now costs minutes where catching it at `ready` costs a review cycle. The standing rule in `SKILL.md` - read the checks after any push to a branch with an open PR - starts applying with this push.

## Step 5 - Confirm

One line: the issue number, the branch, the plan file path, and the PR URL with its draft state.

## Step 6 - Stop

**Report and stop. Do not start implementing, and do not offer to.**

The plan is the thing being reviewed, and it is cheaper to argue with as a diff on a PR than as a wall of chat. **Plan approval authorises the plan artifact, never the first implementation commit.** Wait for the discussion the open questions were written to start.

**The one continuation that may pass this stop is the `auto` chain** in `workflows/auto.md`: there the owner's typed command waived this wait in advance, and the chain goes on into implementation. Anything else - including an `open` run on its own, however obvious the next step looks - ends here.

**Say where that discussion happens, because only one tab threads.** The owner comments inline on the plan's lines in the PR's **Files changed** tab - that is the surface that threads and resolves. Review bodies and Conversation comments are read too, per `workflows/discuss.md`, but they cannot be resolved and their answers land as flat Conversation comments, so inline stays the recommendation rather than the requirement. Replies come through `workflows/discuss.md`, in the threads; mention that `watch <pr-number>` exists for answers as they post, and per that file only the owner typing the command arms it.

This workflow ends here. When the discussion settles, the owner has two ways into implementation: `/gh-solo:implement <pr-number>`, which stops at the implementation handoff, or `go <pr-number>` in `workflows/auto.md`, which continues through `ready` and the review round in the same pass. `workflows/ready.md` picks the branch up at the other end, once the work has landed, and marks the PR ready for review.

---

## Rules

- **Stop after the draft PR.** This is the gate, and it is the whole reason the PR opens early. Implementation begins after the plan discussion, not after the plan lands. The `workflows/auto.md` chain is the one authorised continuation, and only the literal `auto` command starts it.
- **Draft at creation.** The other half of the pair — ready when finished — is `workflows/ready.md`. A PR opened ready gets reviewed empty; a PR left in draft after the work lands never gets reviewed at all.
- **The plan commit is alone and first.** Every other commit on the branch should be as few as make sense — a plan's step list is a list of steps, not a list of commits, and six planned steps are free to land as one commit.
- **`Closes #{issue-number}` in the PR body, and `--assignee @me` on the command**, every time. GitHub sets neither, and the two arrive by different routes — there is no `--closes` flag, so a body written without that line cannot be fixed by adding an argument.
- **Checkboxes live in the PR body only.** The plan file lists the same steps as plain bullets, because it records intent rather than progress. The issue holds acceptance criteria, the plan holds the approach and the intended sequence, the PR holds the state.
- Never open a PR from `main`, and never commit to `main` to make one possible.
