> **Tools used:** the same set as `workflows/implement.md` - fixes are implementation.

Land review fixes after `/code-review` has run and the owner has judged the findings. This is the second entrance to implementation: same branch, same contract, but the work list comes from the review threads instead of the plan, and the judgement about what stands was already made - by the owner, never here.

## Step 1 - Scope: which findings stand

The owner's words are the scope - "fix all", "fix RF1 and RF3, skip RF2" - relayed in the argument or the prompt. The findings themselves live as inline threads on the diff:

```bash
gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/comments" --jq '.[] | {id, path, line: (.line // .original_line), body}'
```

The Pass 2 record Review on the PR gives the count and effort level to check the list against. Two stops:

- **Ambiguity about which findings stand is the owner's to resolve** - "fix the important ones" names no scope; ask, never rank them yourself.
- **Never fix a finding the owner rejected or has not judged.** A fix nobody asked for is scope creep wearing a review's clothes.

## Step 2 - Check out and reconcile

Check out the branch, pull, and read `git status` before touching anything - the same dirty-worktree rule as `workflows/implement.md` Step 2. Note which `## Verification` gates the planned fixes could invalidate; that list is Step 4's work.

## Step 3 - Fix, grouped by coherent change

- **Fixes group by coherent change, never amended or squashed into the original work.** Two findings that are one defect seen twice belong in one commit; two unrelated fixes do not - the same grouping rule as `workflows/implement.md` Step 3, and "what changed because of the review" stays separable from the original work while the PR is open. Where a finding is one the owner may still reject, give it its own commit so backing it out stays a `git revert`. Headers and bodies per the contract in `SKILL.md`; the `{type}` describes the change itself, which for a review fix is usually `fix`. **Name every `RF{n}` the commit closes in its body** - the ids, not the commit boundary, are what keep the map from finding to fix answerable. While the PR is open that is `git log --grep=RF5` on the branch; after the squash nothing RF-related reaches `main` - its commit body is the PR body - and the branch commits survive only as the PR's own record, `gh pr view <pr-number> --json commits` or its Commits tab, alongside the thread replies naming each id.
- **Fix the cause the finding points at, not the line it points at.** When the defect originates elsewhere, the fix lands there, stays scoped to that defect, and the thread reply says where and why. When the finding names a reproducible failure, reproduce it before fixing and watch it pass after - a fix verified only by re-reading the code is "it compiles".
- **After each commit, reply in each finding's thread it closes**: disclaimer and `via` line first (via `implement` fix, closing reply), then the commit subject and that thread's `RF{n}`, and that it is committed locally and not yet pushed. A commit closing two findings gets a reply in both threads, naming the same subject. Never a sha - the owner does not use them, and a stacked branch's later rebase rewrites them. The reply goes on the finding's own comment id, from Step 1, with the body in a scratchpad file so the markdown survives the shell:

    ```bash
    gh api "repos/{owner}/{repo}/pulls/<pr-number>/comments/<comment-id>/replies" -F body=@<body-file> --jq .id
    ```

- **A reply that fails with `user_id can only have one pending review per pull request` is blocked by the owner, and the round stops there.** GitHub allows one `PENDING` review per account per PR, and a review the owner started in the UI and has not submitted holds that slot; every reply this step posts fails until they submit or discard it. Read `state` and nothing else - `gh api "repos/{owner}/{repo}/pulls/<pr-number>/reviews" --jq '.[] | select(.state == "PENDING") | .id'` - then hand over: the review id, that their own unsubmitted review is holding the slot, which commits are landed and which replies are still owed. Keep the body files; they post unchanged once the slot is free. **Never read that review's comments.** `reviews/<id>/comments` returns the bodies of an unsubmitted review to its own author, so it hands you wording the owner has not published and may still delete - and an agent that has read them can no longer tell a draft it saw from an order it was given. Diagnosing a blocked write is not this step's work: report the block, never investigate it.
- **Never resolve the threads.** Pushing a fix marks its thread outdated, and unresolved-and-outdated is the owner's live list of "changed, not yet re-read by me" - resolving it would erase their reading list. Resolution is the owner's verdict, delivered in the GitHub UI.
- A finding that turns out wrong while fixing it - the code is correct, the finding misread it - is not fixed and not silently skipped: report it in the handoff, and leave the argument in the thread to the owner, through the discuss workflow of the `pr-flow` skill.

## Step 4 - Re-run what the fixes invalidated, and re-tick

Any gate in `## Verification` whose result the fixes could have changed is re-run and its box re-ticked by you, because you are now the one who watched it exit. **When in doubt about whether a fix reaches a gate, re-run the gate** - the doubt is the evidence that it might. `[owner]` boxes stay empty as always, and if a fix invalidated one, say so in the handoff: the owner's earlier judgement needs remaking.

## Step 5 - Hold the push

**Do not push.** The owner may still be mid-read, and a push moves the diff and marks their threads outdated beneath them - the incident that produced the review-protocol reference in the `pr-flow` skill happened with every other rule obeyed. The commits wait locally until the owner says, in the session, "we are done" or "push for review"; the push, the CI read and what follows each are that protocol's step 5, owned by `pr-flow`.

## Step 6 - Hand off

Open with the verdict line - `✅ ALL PASS` when every standing finding is fixed and re-verified locally; `⚠️ PASSED WITH FINDINGS - {what}` when something needs the owner: a finding reported as wrong in Step 3, an `[owner]` box invalidated in Step 4. CI has no place in this verdict - nothing is pushed, so it has not seen the fixes; that read belongs to the protocol's step 5, with the push.

Then the map the owner re-reads by: each finding (`RF{n}`, `file:line`) to the commit that answered it, which gates were re-run and re-ticked, and that every commit is **local and unpushed** - so the threads stay anchored to the exact diff the owner is still reading, which is the point of holding the push. **Post that map as a PR comment first** (`gh pr comment <pr-number> --body-file <scratch>`, disclaimer and `via` line first, the latter reading: via `implement` fix, the fix map): the owner walks the threads on GitHub, and the map is most useful on the page being walked, where it also outlives the session.

End by naming the owner's two step-5 words, per the review-protocol reference in the `pr-flow` skill: say **"we are done"** to push, verify CI and continue into the merge, or **"push for review"** to push and get follow-up threads on the changed lines for another round. Until one of those is said, nothing leaves the machine.
