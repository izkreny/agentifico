> **Tools used:** the same set as `workflows/implement.md` - fixes are implementation.

Land review fixes on a branch whose review round has posted findings. This is the second entrance to implementation: same branch, same contract, but the work list comes from the review threads instead of the plan.

**The entrances differ in where the work list comes from.**

- **The review round's step 4**, run by the orchestrator inside the round's unattended block. The work list is the fix plans it posted at step 3, which is every finding except the kinds the protocol routes to the owner instead. **Nothing has been judged yet, and that is the design**: the round's own step 5 re-review is what checks each fix closed the finding it claims, because the fixes were made by the author of the code under review with nobody watching.
- **The owner naming what stands**, after they have read the threads at step 6. "fix all", "fix RF1 and RF3, skip RF2". Their words are the scope and nothing else is.
- **An order inside one thread**, from a discuss round, which enters here for the repository's own gates rather than for the whole workflow. The scope is that one order, the thread is its own; Steps 2, 4, 5 and 6 apply unchanged, and the departure clause in Step 3 and the id map in the handoff apply only where a fix plan and an `RF{n}` exist. That round owns its own reply wording.

The round, its steps and its caps are the review round protocol in the `pr-flow` skill.

## Step 1 - Scope: which findings to fix

**On the round's step 4**, the scope is the findings that got a fix plan. A finding the reviewer marked as needing the owner's judgement, and one whose fix would change scope, each got a reply saying so instead of a plan, and neither is fixed here.

**On the owner's entrance**, their words are the scope, relayed in the argument or the prompt.

Either way the findings live as inline threads on the diff:

```bash
gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/comments" \
  --jq '.[] | select(.in_reply_to_id == null) | {id, path, line: (.line // .original_line), body}'
```

**`select(.in_reply_to_id == null)` is what makes that a list of findings.** The endpoint returns every inline comment on the pull request, replies included, and a round puts several replies on each finding - the fix plan, the fix result, the re-review verdict - so without the filter the replies outnumber the findings and neither the count below nor a reply target can be trusted. A closing reply posted onto another reply's id lands in the right thread but under the wrong parent, and the map from finding to fix stops being answerable.

The round record Review on the PR gives the count to check the filtered list against. The stops below are all on the owner's entrance:

- **Ambiguity about which findings stand is the owner's to resolve** - "fix the important ones" names no scope; ask, never rank them yourself.
- **Never fix a finding the owner rejected.** A fix they declined is scope creep wearing a review's clothes. This does not bite on the round's step 4, where by construction the owner has judged nothing yet and the fix plans are the scope.

## Step 2 - Check out and reconcile

Check out the branch, pull, and read `git status` before touching anything - the same dirty-worktree rule as `workflows/implement.md` Step 2. Note which `## Verification` gates the planned fixes could invalidate; that list is Step 4's work.

## Step 3 - Fix, grouped by coherent change

- **Fixes group by coherent change, never amended or squashed into the original work.** Two findings that are one defect seen twice belong in one commit; two unrelated fixes do not - the same grouping rule as `workflows/implement.md` Step 3, and "what changed because of the review" stays separable from the original work while the PR is open. Where a finding is one the owner may still reject, give it its own commit so backing it out stays a `git revert`. Headers and bodies per the contract in `SKILL.md`; the `{type}` describes the change itself, which for a review fix is usually `fix`. **Name every `RF{n}` the commit closes in its body** - the ids, not the commit boundary, are what keep the map from finding to fix answerable. While the PR is open that is `git log --grep=RF5` on the branch; after the squash nothing RF-related reaches `main` - its commit body is the PR body - and the branch commits survive only as the PR's own record, `gh pr view <pr-number> --json commits` or its Commits tab, alongside the thread replies naming each id.
- **Fix the cause the finding points at, not the line it points at.** When the defect originates elsewhere, the fix lands there, stays scoped to that defect, and the thread reply says where and why. When the finding names a reproducible failure, reproduce it before fixing and watch it pass after - a fix verified only by re-reading the code is "it compiles".
- **After each commit, reply in each finding's thread it closes**: disclaimer and `via` line first (via `implement` fix, closing reply), under the length *Post caps* in the `pr-flow` skill's `SKILL.md` sets - and per its companion rule the reply names the commit rather than paraphrasing it - then the commit subject and that thread's `RF{n}`, **whether the fix departed from the plan posted in step 3 and why**, and that it is committed locally and not yet pushed. The divergence line is the reason steps 3 and 4 are two posts rather than one: without it the owner reads a plan and a confirmation and has no way to see that the landed fix is not the planned one, which is exactly the case that needs their judgement. A commit closing two findings gets a reply in both threads, naming the same subject. Never a sha - the owner does not use them, and a stacked branch's later rebase rewrites them. The reply goes on the finding's own comment id, from Step 1, with the body in a scratchpad file so the markdown survives the shell:

    ```bash
    gh api "repos/{owner}/{repo}/pulls/<pr-number>/comments/<comment-id>/replies" -F body=@<body-file> --jq .id
    ```

- **A reply that fails with `user_id can only have one pending review per pull request` is blocked by the owner, and the round stops there.** GitHub allows one `PENDING` review per account per PR, and a review the owner started in the UI and has not submitted holds that slot; every reply this step posts fails until they submit or discard it. Read `state` and nothing else - `gh api "repos/{owner}/{repo}/pulls/<pr-number>/reviews" --jq '.[] | select(.state == "PENDING") | .id'` - then hand over: the review id, that their own unsubmitted review is holding the slot, which commits are landed and which replies are still owed. Keep the body files; they post unchanged once the slot is free. **Never read that review's comments.** `reviews/<id>/comments` returns the bodies of an unsubmitted review to its own author, so it hands you wording the owner has not published and may still delete - and an agent that has read them can no longer tell a draft it saw from an order it was given. Diagnosing a blocked write is not this step's work: report the block, never investigate it.
- **Never resolve the threads.** Pushing a fix marks its thread outdated, and unresolved-and-outdated is the owner's live list of "changed, not yet re-read by me" - resolving it would erase their reading list. Resolving happens once, at the protocol's step 7, on authority the owner gave in words; the `resolve` workflow of the `pr-flow` skill owns it.
- A finding that turns out wrong while fixing it - the code is correct, the finding misread it - is not fixed and not silently skipped: report it in the handoff, and leave the argument in the thread to the owner, through the discuss workflow of the `pr-flow` skill.

## Step 4 - Re-run what the fixes invalidated, and re-tick

Any gate in `## Verification` whose result the fixes could have changed is re-run and its box re-ticked by you, because you are now the one who watched it exit. **When in doubt about whether a fix reaches a gate, re-run the gate** - the doubt is the evidence that it might. If a fix invalidated a judgement the owner recorded in the prose under that section, say so in the handoff: their earlier judgement needs remaking.

## Step 5 - Update the plan overview where the fixes moved it

**Where the repository squash-merges, the PR body's `## Plan overview` is the one prose that reaches the trunk.** `merge` in the `pr-flow` skill establishes that per repository rather than assuming it, and where it holds, GitHub builds the squash commit's message from the PR body, so a description left describing the pre-fix behaviour lands in `git log` on `main` permanently, and nothing edits a commit message afterwards. A fix that changed what the branch does therefore updates that paragraph, read-modify-write per the contract in `SKILL.md`, in the same pass that posted the replies.

Most rounds change nothing here: a fix that corrects an implementation without changing what the branch delivers leaves the overview true. Say which it was in the handoff either way, because "the overview still describes the branch" is a judgement worth recording rather than a step to skip silently.

## Step 6 - Hold the push

**Do not push.** The owner may still be mid-read, and a push moves the diff and marks their threads outdated beneath them. The commits wait locally until the owner says, in the session, "resolve all and push", or types `rnp`; the resolve, the push and the CI read are that protocol's step 7, owned by `pr-flow`.

## Step 7 - Hand off

Open with the verdict line - `✅ ALL PASS` when every standing finding is fixed and re-verified locally; `⚠️ PASSED WITH FINDINGS - {what}` when something needs the owner: a finding reported as wrong in Step 3, a judgement of the owner's invalidated in Step 4. CI has no place in this verdict - nothing is pushed, so it has not seen the fixes; that read belongs to the protocol's step 7, with the push.

Then the map the owner re-reads by: each finding (`RF{n}`, `file:line`) to the commit that answered it, which gates were re-run and re-ticked, and that every commit is **local and unpushed** - so the threads stay anchored to the exact diff the owner is still reading, which is the point of holding the push. **Post that map as a PR comment first** (`gh pr comment <pr-number> --body-file <scratch>`, disclaimer and `via` line first, the latter reading: via `implement` fix, the fix map): the owner walks the threads on GitHub, and the map is most useful on the page being walked, where it also outlives the session. Its rows are a record row, which *Never counted* under *Post caps* in the `pr-flow` skill's `SKILL.md` excludes, so the cap bounds only the prose around them.

End by naming what releases the commits, per the review-protocol reference in the `pr-flow` skill: the owner typing **`rnp`**, or saying **"resolve all and push"**, once they have been through the threads, which is that protocol's step 7 and the round's only push. Until they say it, nothing leaves the machine. On the round's step 4 this is not the next thing that happens - step 5's re-review is - so say which entrance this was and what follows it.
