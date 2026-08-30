> **Tools used:** everything in `SKILL.md`'s header - this is the workflow the bare `Bash` exists for.

Turn the plan on a draft PR into commits on its branch. Runs after `open` in the `pr-flow` skill has created the draft, and ends by handing the branch to that skill's `ready review`. It may run across many sessions; Step 2 is what makes session three indistinguishable from session one.

## Step 1 - Locate, settle the plan record, load

Resolve the PR: the argument's number, or the PR of the checked-out branch (`gh pr view --json number,headRefName,isDraft,body`). **If no PR exists for the branch, stop with `⛔ REFUSED`** - the plan-first rule means there is nothing to implement yet; `open` in the `pr-flow` skill is what creates the plan and the draft.

Check out the branch and pull - and where the owner keeps a worktree per branch, and their instructions authorise entering one without asking, move into it with `EnterWorktree` instead of switching this one.

### Settle the plan record before trusting it

**A hard stop, and the first thing this workflow does to the plan.** There is nowhere earlier to put it: the session that implements the plan is the session that settles its record, so the check lands before the first line of code rather than before a handover. **Never soften it into a warning, and never carry on having named it.** What it guards against is this session talking itself past an unsettled question in the plan it is about to implement, and a warning is precisely what that sounds like from the inside.

1. **Read the plan-discussion threads whole**, with the GraphQL `reviewThreads` query from Step 1 of the `pr-flow` skill's discuss workflow - the REST comments endpoint has no resolution state - and drop the resolved ones. **An unsettled thread that affects the work stops everything:** `⛔ REFUSED - {which thread}`, and no code is written. The `discuss` workflow of the `pr-flow` skill is what ends that state.
2. **Apply any settled decision the plan or body does not yet reflect**: a new `docs:` commit - never `git commit --amend` on the plan commit, which would force-push away the threads that record why the plan changed - and the PR body updated **whole**: each answered `## Open questions` entry moved to `## Settled` with its decision, question included - moved, never deleted, per the body template in the `pr-flow` skill's open workflow - and `## Open questions` left reading "None." once nothing remains open.
3. **Push the plan commits**, then read `gh pr checks <pr-number>`, per the contract. The discuss rounds held them for the owner's word, and the owner's command to implement is that word.

**Then read what is still unpushed** (`git log <remote>/<branch>..<branch> --oneline`). With the plan commits pushed above, whatever is left is implementation commits, which is the ordinary resume rather than a fault: a session that died between its last commit and Step 6's backup push leaves exactly this state, and refusing on it would make the commonest resume unresumable. Say what is unpushed and carry on into Step 2, which reconciles those commits against the record; the work travels in Step 6's push as it always does. **Do not push them here** - whether they are finished work is Step 2's reconciliation to make, not this step's.

Then read, in this order:

1. **The plan file** - the branch's first commit; it lives in `docs/plans/` unless the repository keeps plans elsewhere. This is the what and the how.
2. **The issue's acceptance criteria** - `gh issue view <issue-number> --json title,body,labels`, the number parsed from the branch name. This is the why, and the definition of done. **If the labels include `draft`, stop with `⛔ REFUSED`** - the description is unfinished by its own declaration, so there is no definition of done to implement against; the `finish` workflow in `tracker` ends that state. Only a PR opened before `open` gained the same gate can reach here, but the refusal is cheaper than the guess.
3. **The repository's own guidance** - its agent instructions file and `.agents/gh-solo.md`, per the contract in `SKILL.md`. Where either is missing or silent on how this repo is tested, note it now as a finding for Step 7.

If the PR body has no `## Steps` or no `## Verification` section, stop with `⛔ REFUSED` and say which: the body is the state carrier for this whole workflow, and a missing section means `open` did not finish its job. That is fixed there, not improvised here.

**A `## Verification` section that is present but names no gate is the same refusal.** An empty list is not a branch with nothing to prove; it is a branch whose gates nobody wrote down, and it fails silently rather than loudly: Step 5 runs "every gate" over nothing, ticks nothing because there is nothing to tick, and reaches `✅ ALL PASS` on unverified code, which `ready` then cannot catch because it refuses only on an *empty box* and there are no boxes. Refuse with `⛔ REFUSED - no gates in ## Verification`. Where `.agents/gh-solo.md` records the repository's check commands, name them so the owner can paste them into the body; where it does not, say that too, since a repository with no recorded gates is the finding underneath this one.

## Step 2 - Establish where it stands

The PR body's `## Steps` boxes are the progress record; the commits are the evidence. Read both and reconcile:

```bash
git log --oneline <remote>/main..HEAD
git status
```

- **Resume at the first unticked step whose work is not already in the commits.** That is the whole resume mechanism, and it only works because Step 3 ticks boxes at the moment work lands rather than in a batch at the end.
- **A ticked box with no commit behind it, or landed work with no tick**, is reported to the owner before continuing - the first is a record that lies, the second a bookkeeping miss, and silently repairing either hides that something upstream went wrong.
- **A dirty worktree means a session died mid-step.** Read the changes before touching them; report what they appear to be and either finish that step or ask, never `git checkout --` them away.

## Step 3 - Implement, one step at a time

Take the plan's steps in order unless a dependency forces otherwise - and when it does, say so in the Step 7 report. Mirror the steps into the session todo list (`TodoWrite`) before starting: it is the working view of progress, while the PR body's checkboxes stay the durable record.

- **Commits group by coherent change, not by plan step.** Where the repository squash-merges, which the `pr-flow` skill's merge workflow establishes per repository rather than assuming, these commits never reach `main`; their readers are the owner's review diff and a mid-branch `git bisect`, and they are sized for those two: each commit builds and makes sense alone, and its header describes one thing. A big step may take several commits, several small steps may share one, and both extremes serve nobody - a commit per keystroke, or one monolith carrying the whole branch. Headers and bodies per the contract in `SKILL.md`; the repo's own conventions govern the code itself, and the floor in `SKILL.md` governs where the repo is silent.
- **After a step's work lands, tick its box** in the PR body's `## Steps` - read, modify, write, per the contract. The box is per step however the commits are grouped: ticked when its work is committed locally, pushed or not. Ticking as you go is not bookkeeping polish: it is what makes the branch resumable and what `ready` later audits.
- **Tick any issue acceptance criterion that verifiably landed** with the step, the same way, on the issue body. "Verifiably" is literal - the criterion's own condition observed true, not inferred from the step being done.

## Step 4 - Divergence from the plan

Where reality contradicts the plan - an approach that does not work, a step that turns out unnecessary, a gap the plan missed - **say so in a PR comment - disclaimer and `via` line first, the latter reading: via `implement` implement, divergence note, its length set by *Post caps* in the `pr-flow` skill's `SKILL.md` - and never edit the plan file.** Small divergences are one comment and carry on. **A divergence that changes scope - new user-visible behavior, a different interface, work the issue never asked for - stops with `⛔ REFUSED - {what changed}` and asks the owner**, because that is a decision about what ships, not about how.

## Step 5 - Verify, as the last act

When the last step is ticked, run **every** gate in the PR body's `## Verification`, exactly as written there.

- **Tick only the boxes whose command you watched pass, by the gate's own stated pass criterion.** For almost every gate that criterion is exit zero. Where a tool defines success differently - a differ whose exit 1 means "differences found, as expected" - that reading must already be in writing, on the gate's line in the plan or in the repository's own docs, never decided at the keyboard: a non-zero exit nothing documents as passing is a failing gate. A failing gate is fixed and re-run, or reported - never ticked, never reasoned into "would have passed".
- **A gate you cannot run is a finding, not a box to leave empty.** `ready` refuses on any empty box, so it goes in the Step 7 handoff by name, with why it could not run, and the verdict there is `⚠️` rather than `✅`. Same shape as a plan step that needs an install: leave it unticked, name it, carry on with the rest.
- Running the gates is the last act of implementation and not a substitute for `ready`: you produce the record here, `ready` audits it, and the two must not be the same hands doing both jobs twice.

## Step 6 - Push and reconcile with CI

**The implementation's work travels in one push, here, after Step 5 has gone green - never a push per step or per commit.** Every push to a PR branch triggers CI, so pushing incrementally buys nothing but red runs against half-done work; one push means the first CI answer is about the finished record. The exception is a session ending before the work does: push then too, as a backup - commits that exist on one disk only are the one state this workflow promises not to keep - and say in the report that the branch is mid-work, so a red or missing check reads as expected rather than as the two-environments finding. A branch worked in a fresh clone needs `git push -u <remote> <branch>`. Then the standing rule from `SKILL.md`:

```bash
gh pr checks <pr-number>
```

Wait out pending checks with `--watch`. A red check against locally green gates is the two-environments finding - report both sides, diagnose the difference, never re-run locally until it looks fine. Zero checks on a repository that has CI is itself a finding.

## Step 7 - Hand off

Open with the verdict line:

- `✅ ALL PASS` - every step ticked, every gate you could run ticked green, CI green, nothing flagged.
- `⚠️ PASSED WITH FINDINGS - {what}` - the work is done but something needs the owner's eyes: a gate you could not run, a divergence comment posted, missing repo guidance from Step 1, a CI disagreement under diagnosis. **An unrunnable gate is never `✅`**: `ready` refuses on the empty box it leaves, so a green verdict here only defers that refusal by one step, and on the `auto` chain it defers it into a stage nobody is watching.
- `⛔ REFUSED - {reason}` - printed at the stop itself, per the stops in Steps 1 and 4.

Then the record: what landed (commits), the box states on PR and issue, CI state, and any gate you could not run, by name, with why. This entire handoff is your final report - the orchestrator relays it, so nothing may live only in the transcript.

**Post that record as a PR comment before printing it, carrying the same content** (`gh pr comment <pr-number> --body-file <scratch>`, disclaimer and `via` line first, the latter reading: via `implement` implement, the implementation record). The session's copy dies with the session; the PR is where this flow keeps state, and the comment is the implementation's own account for whoever reads the PR later - a resuming session, `ready`'s audit, the owner in a week. **Same content is a requirement rather than a convenience**: the `auto` chain relays this comment verbatim in place of the printed handoff, so a comment that says less than the print leaves the chain relaying a different account from the one this workflow produced. **So *Post caps* in the `pr-flow` skill's `SKILL.md` binds the print as well as the comment**, and the two shrink together rather than diverging - capping only the comment would break the requirement this paragraph exists to state. What the cap leaves untouched is the record itself: the commits, the box states and any unrunnable gate are a record row by that section's own exclusion, so their length follows how many there are. Keep both the record rather than a second copy of the PR, with a pointer at the divergence comments and never a restatement of them. It lands in the Conversation tab, which is right: it expects no answer, and it opens with the disclaimer, so a later `discuss` round's read excludes it rather than treating it as the owner speaking. That round does answer Conversation comments, so "nobody reads that tab" was never the reason.

End with the owner's next move, alone on its line, flush left:

```
/gh-solo:pr-flow ready review <pr-number>
```

## Rules

- **Never mark the PR ready.** The handoff names the next command; running it is the owner's act.
- **Never edit the plan file to record divergence.** Divergence is a PR comment; the plan is the record of intent. The one legitimate plan edit is Step 1's `docs:` commit applying a decision the owner settled in a plan-discussion thread, which is the opposite act: the intent itself changed, and the file is being brought up to it.
- **Tick at the moment work lands, never in a batch at the end.** A batch-ticked body cannot be resumed from and cannot be audited.
- **On any gap between the record and the branch, report before continuing.** A lying record found now costs a sentence; found at `ready` it costs the audit its meaning.
