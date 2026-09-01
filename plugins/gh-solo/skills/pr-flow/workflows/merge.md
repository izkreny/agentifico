> **Tools used:** `Bash(gh:*)` for `gh pr merge`, `gh stack merge` and the state queries, `Bash(git:*)` for local cleanup.

Land a reviewed PR on `main` and clean up after it. This is the last step of a branch's life: `workflows/open.md` opened it, `workflows/ready.md` admitted it to review, `workflows/review.md` prepared and recorded the review, and this ends it.

## Step 1 - Confirm it was actually reviewed

**First, confirm nothing is still sitting local.** Every other gate in this step reads the *remote* PR, so this is the one check that can catch a review round whose fix commits were never pushed - the protocol in `references/review-protocol.md` deliberately holds them local until the owner authorises the push at its step 7, and "merge it" said mid-round would otherwise pass every remote gate green and land the branch without its fixes. Where the branch exists locally:

```bash
git fetch <remote> && git log <remote>/<branch>..<branch> --oneline
```

Any output is a refusal: `⛔ REFUSED - {n} unpushed commit(s) on {branch}`, naming `rnp`, or "resolve all and push" - the protocol's step 7 - as what releases them. Where the branch is not in any local tree, compare `gh pr view <pr-number> --json headRefOid` against `git rev-parse <branch>` if the ref exists at all, and otherwise say plainly that local state could not be checked rather than implying it was.

```bash
gh pr view <pr-number> --json isDraft,reviews,reviewDecision,mergeable,statusCheckRollup
```

**A round record Review is the gate, not merely a non-empty `reviews` array.** `workflows/review.md` posts one per analysis - including when the reviewer found nothing, precisely so this check can exist. GitHub creates a review object to hold every inline comment and every thread reply, each with an empty body, so a PR that had any inline plan discussion has a non-empty array before any review has run. Read the bodies:

```bash
gh pr view <pr-number> --json reviews --jq '.reviews[] | .body'
```

**Recognise the record by its `via` line, reading `round record` or `re-review record`, never by the disclaimer alone.** Every agent post opens with the disclaimer, the convention-check Review that `workflows/review.md` posts before a round included, so the disclaimer test passes on a PR whose conventions were checked and whose diff was never read. That is the exact state this gate exists to catch. No record means no round ran: say so and stop rather than merging.

**Do not gate on `reviewDecision`.** It reports whether a branch-protection review *requirement* is satisfied, and a solo repository has no such requirement, so it stays empty however many reviews were posted. Reading it as "not reviewed" would block every merge. That holds even under the branch protection this file recommends below: `required_approving_review_count: 0` means there is no decision to report, so `reviewDecision` is still `""` - verified live on a protected repository, so do not re-litigate it when protection is on.

The owner's own review is a separate record, submitted under their name through the PR's Files changed tab: a Review with a non-empty body, whose author's login **is** the owner's and whose body does **not** open with the disclaimer - both conditions, per the owner test below, because a mentor's Review body carries no disclaimer either and would otherwise read as the owner's. That test is still not airtight: the owner cannot approve their own PR, so their review is a `COMMENTED` object too, and one submitted with an empty summary body looks exactly like a reply container. If no review reads as the owner's, the code has been annotated but not necessarily read: ask before merging rather than assuming.

**The thread gate, per *Resolution rests on recorded authority* in `references/review-protocol.md`: every thread resolved, and every resolution resting on recorded owner authority.** Read them with the same GraphQL query `workflows/discuss.md` Step 1 uses - `isResolved`, each thread's comments, and each comment's `reactions`, which arrive in that same query at no extra request.

**Refuse on an unresolved thread**: the owner's walk is not finished.

**Refuse on a resolved thread carrying none of the evidence forms below.** Any one of them is enough, and the list is closed:

1. **A reply of the owner's in the thread.**
2. **A reaction of the owner's on any comment in it.** Approval may be a reaction rather than a word, so a gate reading only comments would refuse threads the owner did in fact approve.
3. **An authorisation comment naming that thread's `RF{n}` id.** `workflows/resolve.md` posts it before a batch resolve and **owns the literal marker line to grep for**; read the wording there rather than guessing at it, because a gate looking for the wrong string finds nothing and refuses a PR that was properly authorised.

**Recognising the owner takes both conditions below** - for the two forms that are the owner's own posts; the authorisation comment is an agent post and opens with the disclaimer by construction, which is why it is found by its marker line and its `RF{n}` id instead. The conditions: the author's login **is** the repository owner's, and the body does **not** open with the AI disclaimer. The first excludes a mentor, the second excludes this plugin's own posts, which carry the owner's login because they are made with their credentials. The disclaimer test alone is not enough - a mentor's comment opens with no disclaimer either, so on its own it would let a third party's 👍 authorise a merge. For a reaction there is no body to test, so the login is the whole test.

Nothing can stop a thread being resolved in the browser with no evidence at all; this door is the one place that mistake can be caught, so name the thread's `file:line` in the refusal.

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
- **The `## Plan overview` still describes the branch.** Read it against `## Steps` and against the fix commits the review rounds landed, whose subjects `git log` on the branch names; the diff stays out of bounds here. Where the repository sets `squash_merge_commit_message` to `PR_BODY` this text becomes the squash commit message on `main`, so an overview describing an earlier shape of the change is reported and the owner asked, exactly as a leftover `## Open questions` entry is, rather than merged over. Keeping it current belongs to step 4.2.1 of `references/review-protocol.md`; this is the door where the miss is catchable.
- **The issue's acceptance criteria are audited the same way.** Fetch the issue the body's `Closes #{issue-number}` line names, `gh issue view <issue-number> --json body`. The implementing agent ticks each criterion as it verifiably lands, per the `tracker` standards, so an unticked one at the door means the implementation never claimed it: report it and ask. The judgement that the whole outcome is accepted stays the owner's, and they make it by merging.

This is the last look before the branch stops existing. A gap found now costs one question; the same gap found after the squash costs a reopened issue.

## Step 3 - Squash, and say so explicitly

```bash
gh pr merge <pr-number> --squash
```

**`--squash` is never omitted.** One branch is one issue, so squash makes `main` a readable list of completed issues — one commit each. The alternative strategies both cost that: a merge commit adds a `Merge pull request #NN` commit nobody reads, and rebase-and-merge replays every branch commit onto `main`, which permanently installs the `docs: add plan for …` commit that only ever mattered inside the PR.

**Read the squash subject before confirming.** GitHub composes it from the PR title and appends `(#{pr-number})`, so it should already read `feat(frontend): add a login form (#60)` — that is what `workflows/open.md` sets the title for, the scope being the issue's layer label and omitted when it repeats the type. If it does not carry a `type:` prefix, fix the PR title first with `gh pr edit <pr-number> --title "..."` and merge after - GitHub then still appends `(#{pr-number})` itself. `gh pr merge` does take `-t`/`--subject` and `-b`/`--body` overrides, but an overridden subject is used verbatim and has to carry the `(#{pr-number})` by hand, so the title edit is the better lever. The commit that lands is the one that stays.

**The number in that subject is the PR's, not the issue's.** That is correct and not worth "fixing": the chain is `main` commit → `(#60)` → the PR → `Closes #50` → the issue, one hop, and every link autolinks. Branch commits reference the issue directly; `main` references the PR. Both hold.

**`--delete-branch` is not passed, and the local branch is Step 4's work.** The flag deletes the local and remote branch, and its local half cannot succeed under a worktree layout that keeps the trunk permanently checked out: `gh` checks the trunk out in order to delete the merged branch and gets `fatal: 'main' is already used by worktree at ...`, while from the trunk worktree instead it is the branch that is held elsewhere and `git branch -D` is refused the same way. The remote half needs no flag - `delete_branch_on_merge` deletes it server-side, and that setting also covers a PR merged from the GitHub UI, which the flag never could. So passing it would buy nothing and cost a failure *after* the merge has landed, whose non-zero exit invites the one retry that must never happen.

### For a stacked PR

```bash
gh stack checkout <stack-number|pr-number|pr-url>   # adopt tracking first, always
gh stack merge <pr-number> --yes --squash
```

`gh pr merge` does not work on a stacked PR at all — see `workflows/stack.md`. What differs here:

- **There is no message lever at merge time.** `gh stack merge` takes no `--subject` or `--body`; each PR's squash commit is composed by GitHub from that PR's title plus `(#{pr-number})` and from `squash_merge_commit_message`, exactly as in Step 3. Any title or body that needs fixing is fixed with `gh pr edit`, per PR, before this command runs - it lands the whole stack atomically, and afterwards there is no second chance for any of them.
- **Adopt tracking before merging.** `merge` is a write, and every write is subject to the mandatory-adoption rule in `workflows/stack.md`. Running it when tracking already exists is harmless; skipping it is how a command half-works against a stack the tool cannot see. Check the worktree trap in the same file before any merge that cascades.
- **Pass `--squash` every time.** Without an explicit method `gh stack` reuses the last-used one, so the strategy would depend on session history rather than on policy.
- **It does not delete the remote branch.** There is no `--delete-branch` equivalent, so clean up with `git push <remote> --delete <branch>` afterwards - `<remote>` resolved per the remote-name convention in `SKILL.md`, never assumed to be `origin` - and prune locally with `gh stack sync --prune`. The repository's `delete_branch_on_merge` does not cover this path. Step 4 then deletes each merged local branch as it does on the single-PR path, once per branch in the stack.

**Merging a stack lands several PRs and closes several issues.** So the gates multiply too: Steps 1 and 2 run once per PR in the merge's scope *before* the command - the merge is atomic, and one unreviewed PR in the middle must stop the whole thing, not ride in on its siblings' record. Step 4 then runs once per branch and Step 5 once per issue afterwards.

## Step 4 - Delete the local branch, in the worktree that holds it

Where `delete_branch_on_merge` is set, the remote branch is already gone - which is why Step 3 passes no `--delete-branch`. That setting is per-repository and not a default, so confirm it from the values this workflow already read rather than assuming, and delete the remote branch too where it is unset. What remains is the local branch, and deleting it is a write against a worktree the session is not sitting in.

Enter that worktree with the `EnterWorktree` tool, passing its `path`: a `git -C` sequence run from wherever the session happens to sit would delete the wrong tree's refs. Where the owner's global instructions authorise entering a worktree without asking, that rule covers this; where they do not, let the harness prompt and wait for it. Then:

```bash
git worktree list
git fetch <remote>
```

**Move off the branch by whichever step leaves this tree in the state its layout wants**, which `git worktree list` decides by saying who holds the trunk:

- **Another worktree holds `main`** - the usual case, a permanent trunk worktree beside one per line of work: `git switch --detach <remote>/main`. Attached is not on offer, since two worktrees cannot hold one branch, and `git switch main` fails with `fatal: 'main' is already used by worktree at ...`.
- **Nobody holds `main`** - the branch was worked in the trunk worktree itself, or the repository is a single plain checkout: `git switch main` followed by `git merge --ff-only <remote>/main`. Attached and fast-forwarded onto the squash commit is the state that tree is meant to sit in; detaching it here would strand the trunk on a detached HEAD, which the first case tolerates only because it has no alternative.

```bash
git branch -D <branch>
git remote prune <remote>
```

- **Moving off the branch comes first.** `git branch -D` refuses a branch checked out anywhere - `error: cannot delete branch '<branch>' used by worktree at ...` - so the switch above is what frees it.
- **`-D`, not `-d`.** A squash-merge lands the work on `main` as a different commit, so the branch is unmerged in git's ancestry and `-d` refuses it.
- **Confirm the remote side where the setting was never checked for this repository.** `gh api repos/{owner}/{repo}/branches/<branch>` returning 404 is the check, `git push <remote> --delete <branch>` the fix. `<remote>` per the remote-name convention in `SKILL.md`.

**Nothing in this step can undo the merge, and no failure here is a reason to re-run it.** By the time it runs, the squash, the remote branch deletion and the issue close have all happened. On any error, verify with `gh pr view <pr-number> --json state,mergedAt,mergeCommit`, report which half of the cleanup is still owed, and leave `gh pr merge` alone.

## Step 5 - Confirm the issue closed

```bash
gh issue view <issue-number> --json state,closedAt
```

`Closes #{issue-number}` in the PR body is what closes it, and a PR merged without that line leaves the issue open with its code already shipped — the failure the *Convention checks* in `workflows/review.md` exist to catch before it happens. If the issue is still open, close it by hand and say that the body was missing the line.

For an issue with a parent epic, check whether the epic's remaining sub-issues are all closed; if they are, the epic is finishable. Milestones close on scope, per the `tracker` standards.

## Step 6 - Confirm

Open with the verdict line per the standing convention in `SKILL.md` - `✅ ALL PASS` on a landed merge; a stop anywhere upstream already printed `⛔ REFUSED - {reason}` as its first line. Then one line: the PR number, the squash commit's subject as it landed, the branch deleted with remote and local named separately - they go by different mechanisms now, the setting and Step 4 - and the issue number with its new state.

---

## Repository settings this assumes

These are per-repository and none is the default. Check them once per repository rather than every merge:

```bash
gh api repos/{owner}/{repo} --jq '{allow_squash_merge, allow_merge_commit, allow_rebase_merge, delete_branch_on_merge, squash_merge_commit_title, squash_merge_commit_message}'
```

- **`delete_branch_on_merge: true`** — otherwise every merged branch stays on the remote forever, and this is the only thing that deletes it: Step 3 passes no `--delete-branch`, for the reasons given there. It also covers a PR merged from the GitHub UI, which no flag of this workflow ever could. Where it is off, Step 4's remote check is what catches the leftover branch.
- **`squash_merge_commit_title: PR_TITLE`** is what makes the PR title become the commit subject, and it is the **only** value that may accompany `PR_BODY` below - GitHub validates the pair and rejects every other combination with a `422` (`invalid_squash_commit_setting_combo`, whose `field` misleadingly reads `merge_commit_allowed`), so the two settings must be sent together. `PR_TITLE` is also the safer value on its own merits: the alternative, `COMMIT_OR_PR_TITLE`, takes the branch commit's subject on a single-commit PR and discards the PR title - observed live on a pre-flow repository, where a `main` commit carries the branch commit's wording while the PR was titled differently. This flow's plan-commit-first rule makes a single-commit PR impossible anyway, but `PR_TITLE` lands the scoped subject even if that invariant is somehow broken.
- **`squash_merge_commit_message: PR_BODY`**, because the GitHub default, `COMMIT_MESSAGES`, concatenates every branch commit message into the squash body - the plan commit and each fix commit included, which is exactly the transcript squashing exists to drop. `PR_BODY` puts the PR body there instead, and its first line is the AI disclaimer, which the commit-message convention wants in the body anyway. The body lands as GitHub composes it: unwrapped markdown, checkbox lists and all. That is the documented exception to the 72-column commit-body wrap - git's own convention, and the owner's where their instructions restate it - which governs bodies written by hand; never rewrap or trim the PR body to satisfy it.

Set both in one call, never one at a time:

```bash
gh api -X PATCH repos/{owner}/{repo} -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY
```

**`allow_merge_commit` or `allow_rebase_merge` reading true is worth raising with the owner.** While either is enabled, the GitHub UI offers a merge-strategy dropdown, and one absent-minded click puts a merge commit on `main` that no local rule can prevent. Leaving squash as the only enabled method makes the policy structural instead of remembered:

```bash
gh api -X PATCH repos/{owner}/{repo} -F allow_merge_commit=false -F allow_rebase_merge=false
```

### Branch protection on `main`

Part of the standard solo-repo setup, applied once per repository. It is what makes the never-push-to-`main` rule structural and a red CI check a wall rather than a warning. Check first with `gh api repos/{owner}/{repo}/branches/main/protection`; a `404 Branch not protected` means it was never set.

The protection object goes in a harness-scratchpad file, passed with `--input` - the file form matches the granted `Bash(gh:*)` pattern where an echo pipe would prompt:

```json
{"required_status_checks":{"strict":false,"contexts":["<check-run-name>","<another>"]},"enforce_admins":true,"required_pull_request_reviews":{"required_approving_review_count":0,"dismiss_stale_reviews":false,"require_code_owner_reviews":false},"restrictions":null}
```

```bash
gh api -X PUT repos/{owner}/{repo}/branches/main/protection --input <scratch-file>
```

The load-bearing values in that shape, each with a trap:

- **`required_approving_review_count` must be `0`.** GitHub forbids approving your own PR, so any higher value deadlocks every PR on a solo repository permanently. Zero keeps the protection while demanding no approval - which is also why `reviewDecision` stays `""` under it, per Step 1.
- **`dismiss_stale_reviews` stays `false`, and nothing here depends on the value.** The setting dismisses *approving* reviews when a new commit is pushed - per GitHub's REST docs, approvals only - and this flow never needs an approval: the count is 0, and a round record is a COMMENT Review, which dismissal never touches and which stays in the `reviews` array regardless. It is pinned to `false` only so the protection object is fully stated and least surprising, not because `true` would break a gate.
- **`required_status_checks` can only be *introduced* by this `PUT`.** While it is `null`, `PATCH repos/{owner}/{repo}/branches/main/protection/required_status_checks` answers `404 Required status checks not enabled` instead of creating it, so the whole protection object has to be re-sent.
- **The `contexts` entries are check-run names, not workflow filenames.** They default to the workflow's job ids, not to anything written in the YAML, so read them off a real PR with `gh pr checks <pr-number>` rather than off the workflow file.

## Rules

- **Never merge a PR without a round record Review**, recognised by its `via` line per Step 1 and never by the disclaimer, which every agent post carries including the convention check that runs before a round. Array length proves nothing either - inline discussion inflates `reviews` with empty-bodied containers. The gate is the point of the workflow.
- **Never merge over an unresolved thread, or a thread resolved with none of the evidence forms.** *Resolution rests on recorded authority* in `references/review-protocol.md`; this door is the only place it is enforceable.
- **Never `git merge` or `git push` to `main` to land a branch.** The hard rule in `SKILL.md` holds here too; merging is `gh`'s job.
- **Never omit the merge method** — `--squash` on `gh pr merge`, `--squash` on `gh stack merge`. Both fall back to something other than policy when it is left off.
- One PR per invocation. Merging a stack is one operation even though it lands several PRs; merging two unrelated PRs is two.
