> **Tools used:** `Bash(gh:*)` for `gh pr merge`, `gh stack merge` and the state queries, `Bash(git:*)` for local cleanup, `Bash(python3:*)` for `scripts/post-review.py unthreaded` in Step 1, `ExitWorktree` for leaving the branch's worktree in Step 4.

Land a reviewed PR on `main` and clean up after it. This is the last step of a branch's life: `workflows/open.md` opened it, `workflows/ready.md` admitted it to review, `workflows/review.md` prepared and recorded the review, and this ends it. The repository settings and branch protection it assumes are per-repository, in `references/repo-settings.md`: read it when a repository first takes this flow, and again when a merge lands with a squash subject or body other than the PR's, or when an ordinary squash merge leaves the remote branch standing, since each is the symptom of a setting it names; a stack merge leaves the branch standing by its own mechanism, which Step 3 states, and no setting changes that.

## Step 1 - Confirm it was actually reviewed

**First, confirm nothing is still sitting local.** Every other gate in this step reads the *remote* PR, so this is the check that can catch a review round whose fix commits were never pushed - the protocol in `references/review-protocol.md` deliberately holds them local until the owner authorises the push at its step 7, and "merge it" said mid-round would otherwise pass every remote gate green and land the branch without its fixes. Where the branch exists locally:

```bash
git fetch <remote> && git log <remote>/<branch>..<branch> --oneline
```

Any output is a refusal: `⛔ REFUSED - {n} unpushed commit(s) on {branch}`, naming `rnp`, or "resolve all and push" - the protocol's step 7 - as what releases them. Where the branch is not in any local tree, compare `gh pr view <pr-number> --json headRefOid` against `git rev-parse <branch>` if the ref exists at all, and otherwise say plainly that local state could not be checked rather than implying it was.

```bash
gh pr view <pr-number> --json isDraft,reviews,reviewDecision,mergeable,statusCheckRollup,commits
```

**`commits` is here for Step 2's overview comparison rather than for anything in this step**, so do not prune it as unused. It carries `messageHeadline` and `messageBody` per commit, and the body is what that comparison needs; taking it here costs nothing, since this call is made either way.

**A round record Review is the gate, not merely a non-empty `reviews` array.** `workflows/review.md` posts one per analysis - including when the reviewer found nothing, precisely so this check can exist. GitHub creates a review object to hold every inline comment and every thread reply, each with an empty body, so a PR that had any inline plan discussion has a non-empty array before any review has run. Read the bodies:

```bash
gh pr view <pr-number> --json reviews --jq '.reviews[] | .body'
```

**Recognise the record by its `via` line, reading `round record` or `re-review record`, never by the disclaimer alone.** Every agent post opens with the disclaimer, the convention-check Review that `workflows/review.md` posts before a round included, so the disclaimer test passes on a PR whose conventions were checked and whose diff was never read. That is the exact state this gate exists to catch. No record means no round ran: say so and stop rather than merging.

**Do not gate on `reviewDecision`.** It reports whether a branch-protection review *requirement* is satisfied, and a solo repository has no such requirement, so it stays empty however many reviews were posted. Reading it as "not reviewed" would block every merge. That holds even under the branch protection *Branch protection on `main`* in `references/repo-settings.md` recommends: `required_approving_review_count: 0` means there is no decision to report, so `reviewDecision` is still `""` - verified live on a protected repository, so do not re-litigate it when protection is on.

The owner's own review is a separate record, submitted under their name through the PR's Files changed tab: a Review with a non-empty body, whose author's login **is** the owner's and whose body does **not** open with the disclaimer - the conditions *Recognising the owner* in `references/review-protocol.md` states, because a mentor's Review body carries no disclaimer either and would otherwise read as the owner's. That test is still not airtight: the owner cannot approve their own PR, so their review is a `COMMENTED` object too, and one submitted with an empty summary body looks exactly like a reply container. If no review reads as the owner's, the code has been annotated but not necessarily read: ask before merging rather than assuming.

**The thread gate, per *Resolution rests on recorded authority* in `references/review-protocol.md`: every thread resolved, and every resolution resting on recorded owner authority.** Read them with the same GraphQL query `workflows/discuss.md` Step 1 uses - `isResolved`, each thread's comments, and each comment's `reactions`, which arrive in that same query at no extra request.

**Refuse on an unresolved thread**: the owner's walk is not finished.

**Refuse on a resolved thread carrying none of these evidence forms.** Any one of them is enough, and the list is closed:

1. **A reply of the owner's in the thread.**
2. **A reaction of the owner's on any comment in it.** Approval may be a reaction rather than a word, so a gate reading only comments would refuse threads the owner did in fact approve.
3. **An authorisation comment naming that thread's `RF{n}` id.** `workflows/resolve.md` posts it before a batch resolve and **owns the literal marker line to grep for**; read the wording there rather than guessing at it, because a gate looking for the wrong string finds nothing and refuses a PR that was properly authorised.

**Recognising the owner takes the conditions *Recognising the owner* in `references/review-protocol.md` states** - for the forms that are the owner's own posts; the authorisation comment is an agent post and opens with the disclaimer by construction, which is why it is found by its marker line and its `RF{n}` id instead. The conditions: the author's login **is** the repository owner's, and the body does **not** open with the AI disclaimer. The first excludes a mentor, the second excludes this plugin's own posts, which carry the owner's login because they are made with their credentials.

The disclaimer test alone is not enough - a mentor's comment opens with no disclaimer either, so on its own it would let a third party's 👍 authorise a merge. For a reaction there is no body to test, so the login is the whole test.

Nothing can stop a thread being resolved in the browser with no evidence at all; this door is where that mistake can be caught, so name the thread's `file:line` in the refusal.

**Refuse while a reserved `RF{n}` has no thread.** A held finding lives in a review body until `release` threads it, and the thread gate reads threads alone, so it passes a finding that never got one:

```bash
gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/reviews" > <reviews-file>
gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/comments" > <listing-file>
python3 <skill-dir>/scripts/post-review.py unthreaded --reviews <reviews-file> --comments <listing-file>
```

Exit 2 is the refusal, `⛔ REFUSED - RF{n} is reserved and has no thread`, naming every id it printed. Step 6 of `workflows/resolve.md` is the retry. Where `release` named an id as one it cannot thread, the owner decides where that thread goes, and its body opens a line with `::RF{n}::` and a space as the first comment of a new thread, which is what the check counts: a reply in another thread never counts, whatever line it opens with.

**Other fields in that query are gates too, each cheaper to check than to recover from:**

- **`isDraft` is `true`** — the work is not finished. `workflows/ready.md` is what ends that state.
- **`statusCheckRollup` is not passing** — merging a red PR puts a known-broken commit on `main`. Zero check-suites is not the same as green, and on a stacked branch it usually means drift rather than a slow CI; `workflows/stack.md` has that diagnosis.
- **`mergeable` is `CONFLICTING`** — resolve first. On a stacked branch, `UNKNOWN` alongside zero checks is the drift signature, not a transient.

## Step 2 - Audit the checklists, one last time

The branch has moved since `workflows/ready.md` audited it: fix commits answering the review landed later, and a gate a fix invalidated may or may not have been re-run and re-ticked. So repeat the audit at the door, with the same posture - read, never run, never tick. `workflows/ready.md` has the causes of an empty box and why running the gate here is not the fix.

```bash
gh pr view <pr-number> --json body --jq .body
```

- **Every `## Verification` box is ticked** - an empty one stops this workflow, exactly as it stops `ready`. An unticked `## Steps` box whose work is plainly done is reported and asked about rather than refused - the same split `workflows/ready.md` makes.
- **`## Open questions` is finished business**: it reads "None.", with every answered entry sitting in `## Settled` - here, or in the plan file's own `## Settled` heading where *Body caps* in `workflows/open.md` sent it - question and decision together, per the body template there. This body becomes the squash commit on `main` - the repository's `squash_merge_commit_message: PR_BODY` setting, configured below - so anything stale here lands in `git log` permanently. A leftover entry, answered or not, is reported and asked about rather than merged over.
- **Every capped section is within its cap**, per *Body caps* in `workflows/open.md`, which the round's *Convention checks* already read once. It is read again here because the squash is the moment the body stops being editable: a breach caught at the door costs one body edit, and the same breach caught afterwards is a permanently over-long commit message. Report it and ask, rather than merging over it or trimming the owner's record yourself.
- **The issue's acceptance criteria are audited the same way.** Fetch the issue the body's `Closes #{issue-number}` line names, `gh issue view <issue-number> --json body`. The implementing agent ticks each criterion as it verifiably lands, per the `tracker` standards, so an unticked one at the door means the implementation never claimed it: report it and ask. The judgement that the whole outcome is accepted stays the owner's, and they make it by merging.

### The `## Plan overview` against the branch's own record

Read the overview against `## Steps`, against **every commit on the branch, body as well as subject**, and against the acceptance criteria of the issue the `Closes` line names, read with the `gh issue view <issue-number> --json body` this step's criteria audit already runs, so the fetch is shared rather than added; the diff stays out of bounds here. Where the repository sets `squash_merge_commit_message` to `PR_BODY` this text becomes the squash commit message on `main`, so an overview describing a shape the change has moved past is reported and the owner asked, exactly as a leftover `## Open questions` entry is, rather than merged over. Keeping it current belongs to the rule in `references/review-protocol.md` opening "A fix that changes what the `## Plan overview` describes"; this is the door where the miss is catchable.

**The commits come from `commits` on Step 1's `gh pr view`, never from `git log`.** Step 1's own fallback establishes that the branch may not be in any local tree, so a comparison resting on `git log` cannot run in exactly the case that fallback exists for - and an `--oneline` read shows no body at all. **Subjects alone are not enough**: a subject says what a commit did and a body says what it changed about the branch's story, which is the material an overview contradicts.

**Report a contradiction with each side quoted** - the overview's own sentence, and the commit or the criterion that disagrees with it - so the owner settles it in one glance instead of re-deriving which claim went stale. "The overview may be out of date" is not a report.

**This catches drift between two records, never an error shared by all of them.** The overview, the commit bodies and the issue's criteria are written by the same agent, so a misunderstanding written consistently into every record passes this comparison and always will. **Nothing in the flow closes it**, and the reviewer's `spec` axis least of all: that axis judges the diff against the issue's acceptance criteria, which this paragraph has just conceded are carrying the misunderstanding, so it reads the diff as faithful and reports nothing.

What closes it is the one actor who wrote none of these records - the owner, reading the branch - which is part of why merging is their act rather than a gate's. Said here so a later reader who finds this green on a branch that was wrong throughout does not take the comparison for broken.

This is the last look before the branch stops existing. A gap found now costs one question; the same gap found after the squash costs a reopened issue.

## Step 3 - Squash, and say so explicitly

```bash
gh pr merge <pr-number> --squash
```

**`--squash` is never omitted.** One branch is one issue, so squash makes `main` a readable list of completed issues — one commit each. The alternative strategies both cost that: a merge commit adds a `Merge pull request #NN` commit nobody reads, and rebase-and-merge replays every branch commit onto `main`, which permanently installs the `docs: add plan for …` commit that only ever mattered inside the PR.

**Read the squash subject before confirming.** GitHub composes it from the PR title and appends `(#{pr-number})`, so it should already read `feat(frontend): add a login form (#60)` — that is what `workflows/open.md` sets the title for, the scope being the issue's layer label and omitted when it repeats the type. If it does not carry a `type:` prefix, fix the PR title first with `gh pr edit <pr-number> --title "..."` and merge after - GitHub then still appends `(#{pr-number})` itself. `gh pr merge` does take `-t`/`--subject` and `-b`/`--body` overrides, but an overridden subject is used verbatim and has to carry the `(#{pr-number})` by hand, so the title edit is the better lever. The commit that lands is the one that stays.

**The number in that subject is the PR's, not the issue's.** That is correct and not worth "fixing": the chain is `main` commit → `(#60)` → the PR → `Closes #50` → the issue, one hop, and every link autolinks. Branch commits reference the issue directly; `main` references the PR. Both hold.

**`--delete-branch` is not passed, and the local branch is Step 4's work.** The flag deletes the local and remote branch, and its local half cannot succeed under a worktree layout that keeps the trunk permanently checked out: `gh` checks the trunk out in order to delete the merged branch and gets `fatal: 'main' is already used by worktree at ...`, while from the trunk worktree instead it is the branch that is held elsewhere and `git branch -D` is refused the same way.

The remote half needs no flag - `delete_branch_on_merge` deletes it server-side, and that setting also covers a PR merged from the GitHub UI, which the flag never could. So passing it would buy nothing and cost a failure *after* the merge has landed, whose non-zero exit invites the one retry that must never happen.

### For a stacked PR

```bash
gh stack checkout <stack-number|pr-number|pr-url>   # adopt tracking first, always
gh stack merge <pr-number> --yes --squash
```

`gh pr merge` does not work on a stacked PR at all — see `workflows/stack.md`. What differs here:

- **There is no message lever at merge time.** `gh stack merge` takes no `--subject` or `--body`; each PR's squash commit is composed by GitHub from that PR's title plus `(#{pr-number})` and from `squash_merge_commit_message`, exactly as in Step 3. Any title or body that needs fixing is fixed with `gh pr edit`, per PR, before this command runs - it lands the whole stack atomically, and afterwards there is no second chance for any of them.
- **Adopt tracking before merging.** `merge` is a write, and every write is subject to the mandatory-adoption rule in `workflows/stack.md`. Running it when tracking already exists is harmless; skipping it is how a command half-works against a stack the tool cannot see. Check the worktree trap in the same file before any merge that cascades.
- **Pass `--squash` every time.** Without an explicit method `gh stack` reuses the last-used one, so the strategy would depend on session history rather than on policy.
- **It does not delete the remote branch.** There is no `--delete-branch` equivalent, so clean up with `git push <remote> --delete <branch>` afterwards - `<remote>` resolved per the remote-name convention in `SKILL.md`, never assumed to be `origin` - and prune locally with `gh stack sync --prune` **only once every branch in the stack has merged**, since `sync` also rebases and force-pushes whatever remains. The repository's `delete_branch_on_merge` does not cover this path. Step 4 then deletes each merged local branch as it does on the single-PR path, once per branch in the stack.

**Merging a stack lands several PRs and closes several issues.** So the gates multiply too: Steps 1 and 2 run once per PR in the merge's scope *before* the command - the merge is atomic, and one unreviewed PR in the middle must stop the whole thing, not ride in on its siblings' record. Step 4 then runs once per branch and Step 5 once per issue afterwards.

**One PR per invocation.** Merging a stack is one operation even though it lands several PRs; merging two unrelated PRs is two.

## Step 4 - Remove the worktree, delete the local branch, move the trunk

Where `delete_branch_on_merge` is set, the remote branch is already gone - which is why Step 3 passes no `--delete-branch`. That setting is per-repository and not a default, and nothing this workflow reads carries it, so *Whoever holds `main`* below asks the remote for the branch rather than assuming, and deletes it where it remains.

```bash
git worktree list
git fetch <remote>
```

Who holds `main` in `git worktree list` picks the case.

**Each case names the worktree it runs from, and the session reaches it with `ExitWorktree` alone.** Where the session entered another worktree by `path`, `ExitWorktree` with `action: "keep"` returns it to the launch directory and removes nothing; the owner's global instructions authorise that, or the harness prompts. Then confirm in `git worktree list` that the session stands in the worktree its case names. **Where it does not, stop**, and print that case's whole block for the owner to run there.

### Another worktree holds `main`

The usual case: a permanent trunk worktree beside one per branch. **Run it from the trunk worktree**, since `git worktree remove` refuses the directory the session stands in.

```bash
git worktree remove <branch-worktree-path>
git branch -D <branch>
git remote prune <remote>
git merge --ff-only <remote>/main
```

- **Removing the worktree first frees the branch**, so a refused removal stops the step with nothing half done. Skip it for a branch with no worktree, as most in a stack.
- **A stack's worktree is shared by its branches**, per `workflows/stack.md`, so it is removed only once every branch in it has merged. Until then, `git -C <branch-worktree-path> switch <an unmerged branch of the stack>` replaces the removal, keeping the worktree findable by branch.
- **A refused removal is reported, never forced.** It exits 128 with `fatal: '<path>' contains modified or untracked files, use --force to delete it`, and those files were never committed. Report the path and its `git status --short`; ignored files never block it.
- **`-D`, not `-d`.** A squash-merge lands the work on `main` as a different commit, so the branch is unmerged in git's ancestry and `-d` refuses it.
- **`--ff-only` refuses rather than guesses.** It refuses on a trunk commit the remote lacks or local changes it would overwrite; changes it does not touch ride along. Report the commit it declined to move to, and never reset.

### Nobody holds `main`

The branch was worked in the trunk worktree itself, or the repository is a plain checkout, so no worktree is removed. Run it from that worktree:

```bash
git switch main
git merge --ff-only <remote>/main
git branch -D <branch>
git remote prune <remote>
```

`git branch -D` refuses a branch checked out anywhere, so the switch comes first.

### Whoever holds `main`

- **Confirm the remote side on every merge**, since no run records whether the setting was ever checked: `gh api repos/{owner}/{repo}/branches/<branch>` returning 404 is the check, `git push <remote> --delete <branch>` the fix. `<remote>` per the remote-name convention in `SKILL.md`.
- **Nothing in this step can undo the merge, and no failure here is a reason to re-run it.** By the time it runs, the squash and the issue close have happened, and the remote branch is gone wherever the setting deletes it. On any error, verify with `gh pr view <pr-number> --json state,mergedAt,mergeCommit`, report which part of the cleanup is still owed, and leave `gh pr merge` alone.

## Step 5 - Confirm the issue closed

```bash
gh issue view <issue-number> --json state,closedAt
```

`Closes #{issue-number}` in the PR body is what closes it, and a PR merged without that line leaves the issue open with its code already shipped — the failure the *Convention checks* in `workflows/review.md` exist to catch before it happens. If the issue is still open, close it by hand and say that the body was missing the line.

For an issue with a parent epic, check whether the epic's remaining sub-issues are all closed; if they are, the epic is finishable. Milestones close on scope, per the `tracker` standards.

## Step 6 - Confirm

Open with the verdict line per the standing convention in `SKILL.md` - `✅ ALL PASS` on a landed merge; a stop anywhere upstream already printed `⛔ REFUSED - {reason}` as its first line. Then one line: the PR number, the squash commit's subject as it landed, the branch deleted with remote and local named separately - they go by different mechanisms, the setting and Step 4 - the worktree removed, the commit the trunk sits on, any cleanup Step 4 left owed, and the issue number with its new state.
