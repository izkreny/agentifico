> **Tools used:** `Bash(gh:*)` for the thread read, the authorisation comment, the resolve mutation and the checks read, `Bash(git:*)` for the push, `Write` for the comment body file, `TaskStop` to end a running watch.

End a review round on the owner's word: record the authorisation, resolve the threads it covers, push the fixes that have been waiting, release any finding that was held for that push, index what the push carried, and read the checks. **It ends there.** Merging is a separate word, which its confirm step prints.

**This is the protocol's step 7, and `references/review-protocol.md` owns what it means.** That file states the order and why, which threads a batch covers and which it never covers, and why a red check afterwards reopens nothing. What this file owns is the mechanics: the marker line's wording, the mutation, and the order of the calls.

**It is the round's only push.** Every fix commit from the round has been sitting local since it was made, so that the threads stayed anchored to the exact diff the owner was reading. This is where that ends.

## The entrance

The owner says it, in the session: "resolve all and push", or types `rnp`. Also "we are done" said while a round has left fix commits unpushed.

**"You can merge" is not one of these, and routes to `workflows/merge.md` instead.** After the split it would authorise a push and then not merge, which is worse than a refusal: the owner said the word and watched something else happen. That workflow's Step 1 already refuses on unpushed commits and names `rnp` as the remedy, so the sentence lands on a gate that tells them the word they actually need.

**Their word is the authorisation and nothing else is.** Not a reaction, not a reply in a thread, not a mentor saying the work looks done, and not this workflow's own reading of how settled the threads look. If no such word has been given, there is nothing to do here: say what is still waiting and stop.

## Step 1 - Stop the watch

If a watch is running on this PR, stop it with `TaskStop` before anything else, per *Stopping it* in `workflows/watch.md`. It exists to carry the owner's signals into the session during step 6, and step 6 is over.

## Step 2 - Read the threads and decide what the batch covers

The same GraphQL query `workflows/discuss.md` Step 1 uses, which already carries everything needed: each thread's `id` for the mutation, `isResolved`, its `path` and `line` for the report, and per comment the `author { login }`, the `body` and the `reactions` with their own `user { login }`.

Sort every unresolved thread into one of two piles, per the protocol's account of what a batch covers:

- **Covered**: no outstanding owner signal.
- **Not covered**: waiting on the owner from step 3, or carrying a signal of theirs that has not been answered - a reply not yet replied to, or a question not yet explained. An **answered** question is no longer outstanding and the thread is covered, which is what stops one question from parking a thread forever.

**Recognising the owner takes both conditions**, per *Recognising the owner takes both conditions* in `references/review-protocol.md`: the author's login **is** the repository owner's, and the body does **not** open with the AI disclaimer. For a reaction there is no body, so the login is the whole test.

**A thread that is not covered does not stop this workflow.** Name it in the report, leave it unresolved, and resolve the rest. What it does stop is `workflows/merge.md`, which refuses at the door on any unresolved thread, and that is where the owner learns the round is not finished.

## Step 3 - The authorisation comment, before any resolve

One Conversation comment, posted first, so that no thread is ever resolved before the evidence for resolving it exists.

```bash
gh pr comment <pr-number> --body-file <scratch-file>
```

Disclaimer and `via` line first per `SKILL.md`, the latter reading: via `pr-flow` resolve, the authorisation. Its length is set by *Post caps* in the same file, which counts neither the marker line below nor the owner's quoted words - *Never counted* excludes both by name, so the cap bounds only what you add around them. Then, on its own line, **the marker line, exactly this literal**:

```
RESOLVE AUTHORISED: RF1, RF3, RF4
```

**This wording is defined here and read by `workflows/merge.md`'s thread gate**, which accepts it as one of the evidence forms it recognises. Change it in one place and the gate stops finding it, so it is a literal rather than a phrasing: `RESOLVE AUTHORISED:` followed by every `RF{n}` id this authorisation covers, comma-separated.

Below the marker, the owner's words as they said them, quoted.

- **Every covered id is named**, and no id is named that this batch does not resolve. An authorisation covering `RF1` to `RF7` must not silently authorise resolving an `RF9` posted after the owner spoke.
- **It is an agent post, so it opens with the disclaimer** and can never be mistaken for the owner's own comment. That is exactly why the marker line exists: a gate that recognised the owner by the absence of a disclaimer can never recognise this, so it is found by the literal instead.
- **The comment is the record, not the session.** A session dies; `workflows/merge.md` still has to be able to check that a resolve had authority behind it.

## Step 4 - Resolve the covered threads

One mutation per thread, with the `id` from Step 2:

```bash
gh api graphql -f query='mutation($t:ID!){ resolveReviewThread(input:{threadId:$t}) { thread { isResolved } } }' -f t=<thread-id> --jq '.data.resolveReviewThread.thread.isResolved'
```

`true` back means it landed. **Read the answer rather than assuming**: resolving posts nothing, so a silently failed mutation leaves a thread open with a comment claiming it was closed.

The input also accepts an optional `resolutionReason` of `ADDRESSED`, `WONT_FIX` or `INVALID`. **It is deliberately not passed.** Nothing in this plugin reads it, so a value here would be a claim no gate checks, and the reason each thread closed is already in the thread.

## Step 5 - Push

**Read the head the owner could last have seen, before pushing anything:**

```bash
git fetch <remote> <branch> --quiet
git rev-parse FETCH_HEAD                   # the before-head; keep the value for Step 7
git push <remote> <branch>
```

**Not `gh pr view --json headRefOid`**, for the reason `workflows/review.md` Step 1 gives at its own head read: that call was seen answering with a pre-push sha seconds after a push while `git` on the remote ref already had the new one. A before-head that lags is one that puts the round's own earlier commits inside the span Step 7 indexes.

**The after-head needs no read at all.** It is local `HEAD`, which is exactly what this push sent; asking the remote for it buys the same lag back.

Resolve `<remote>` by the recipe in `SKILL.md`'s remote-name convention. The checks are read at Step 8, after Steps 6 and 7 have posted whatever the push released and what it carried, so one read covers the whole of what this workflow put on the branch.

**Where a relocation commit is on the remote with its entry still in `## Open questions`, this step lands the PR body edit it owes**, per *Body caps* in `workflows/open.md`, which owns the route and states the invariant this discharges. Read the condition off the remote and the body rather than off what this round holds: an earlier push may already have carried the commit up, and this step owes the edit either way. Where nothing meets it, this step does nothing.

## Step 6 - Release the held findings

A round that held a finding reserved its `RF{n}` and gave it no thread, because the line it points at was on this machine only. The push above has just made those lines part of the pull request's diff, so the threads can open now:

```bash
gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/reviews" > <reviews-file>
gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/comments" > <listing-file>
python3 <skill-dir>/scripts/post-review.py release --reviews <reviews-file> --comments <listing-file> --disclaimer-file <disclaimer-file> --out <release-file> --replies-out <replies-file>
```

**Exit 0 having written no payload means there was nothing held**, which is the ordinary answer on most rounds; say so in the report and skip the rest of this step. Where it wrote one, post it and reconcile it:

```bash
gh api "repos/{owner}/{repo}/pulls/<pr-number>/reviews" --input <release-file>
gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/comments" > <listing-file>
python3 <skill-dir>/scripts/post-review.py verify --payload <release-file> --comments <listing-file> --reviews <reviews-file>
```

Then the replies each released thread owes, which is why the id read comes after the post: a reply needs the comment id the thread has only once it exists. For every entry in `<replies-file>`, find the comment in `<listing-file>` whose own id is that `::RF{n}::` and post its bodies in the order they are listed - the fix plan, then the fix result, then the verdict:

```bash
gh api "repos/{owner}/{repo}/pulls/<pr-number>/comments/<comment-id>/replies" -F body=@<body-file>
```

- **Run it inside the branch's repository**, from anywhere in it: the script resolves the top level itself and refuses outright where there is none, because it shifts each held finding's line forward with `git diff <the head it was anchored at>..HEAD` before anchoring anything - the stored number was counted before the round's later commits landed. An entry whose line the fixes rewrote, or whose anchor head this clone does not have, is reported and skipped rather than posted at a guess.
- **The reads come after the push**, never before it, because the whole reason the anchors resolve now is that the push landed. Running this step ahead of Step 5 answers `422` on every held finding.
- **An id that already carries a thread is skipped rather than refused.** Nothing rewrites a posted Review, so an earlier round's ledger is still on the pull request at the next `rnp`; the script reports what it skipped.
- **A failure here loses nothing and refuses nothing.** The push has already happened and the ledger is still in the record Review, so the findings are exactly where they were - report the failure and name this step's commands as the retry, rather than treating it as a failed `rnp`.
- **The replies are the round's words, not new ones.** They were written during the round and recorded in its follow-up Review; this step copies them, so nothing here composes a plan or a verdict. An entry with no reply recorded opens its thread carrying the finding alone, which `release` reports.
- **A released thread lands unresolved, and that is correct.** The authorisation in Step 3 named the ids it covered, and these were not among them: the owner has not read them yet. `workflows/merge.md` refuses on an unresolved thread, so the report has to say how many are waiting, or the owner reads a green `rnp` and then meets a red merge with nothing explaining it.

## Step 7 - Post the delta index

One Conversation comment naming every hunk the push carried, so what the round's fixes did to lines no finding asked about is readable from the pull request rather than from `git log`. Every finding's own change was already reported in its thread at step 4; this is the other half, which has had no home anywhere.

**Walk the span per commit, never as one aggregate diff:**

```bash
git log -p --format='%n::commit %h %s%n%b%n::body-end' <before-head>..HEAD
```

`<before-head>` is the value Step 5 kept. Per commit, take the `RF{n}` ids its body **claims to close** - the `implement` skill's `fix` workflow requires a fix commit to name each id it closes, and its `Closes` list is that claim - and emit one row per hunk in that commit's diff. **An id the body merely mentions is not one of them:** a commit explaining what it corrects about an earlier fix names that fix's id in prose, and crediting it would put a hunk under a finding that never asked for it. The same trap `scripts/post-review.py` avoids by counting `::RF{n}::` rather than any `RF{n}` it can see. A single `git diff` over the whole span would merge two commits touching one region into a hunk no row could attribute, which is the one thing this comment exists to do.

**The row is the hunk's `path:start-end` as a link, then the `RF{n}` its commit named, or `-` where it named none:**

```markdown
| Hunk | Answers |
|---|---|
| [`workflows/merge.md:61-68`](https://github.com/{owner}/{repo}/blob/<that commit>/plugins/gh-solo/skills/pr-flow/workflows/merge.md#L61-L68) | `RF4` |
| [`SKILL.md:39`](https://github.com/{owner}/{repo}/blob/<that commit>/plugins/gh-solo/skills/pr-flow/SKILL.md#L39) | `-` |
```

- **Each link points at the commit that made the hunk, never at the after-head.** The walk is per commit, so a range is counted in that commit's version of the file, and a later commit in the same span changing the line count above it would shift the lines an after-head link resolves to. Per-commit shas make the range and its target the same version by construction, rather than by a shift nothing computes.
- **Which line numbers the range takes, and from which sha**, the first case that applies winning: a commit that **deletes a file outright** is one row naming the path with no link, because the only sha holding that file is one where it still exists, and a link there reads as though the push had not removed it; a hunk that **adds no lines** but leaves the file standing takes the `-` side and links at the commit's first parent, where the removed lines sit inside a file that is still there; every other hunk takes the `+` side of its header and links at that commit. First-match is stated rather than assumed, so two runs over one push cannot index it differently.
- **What the sha costs:** a later `gh stack sync` rewrites every commit on the branch, and these links go stale with them. That is correct for a record of one push, read at that push, and is not a defect to fix by pointing at a branch.
- **Attribution is commit-level, and that is the point.** A rename made while fixing `RF3` carries `RF3`, so the index shows what that fix actually cost rather than only the lines the finding named.
- **The `-` rows are the half with no other home**: a commit whose body names no id. An owner-raised change is always one, because `references/review-protocol.md` makes ids mandatory for agent posts only, and so is the relocation `docs:` commit *Body caps* in `workflows/open.md` sends an over-cap entry to.

Disclaimer and `via` line first per `SKILL.md`, the latter reading: via `pr-flow` resolve, the delta index.

**The rows are a record row, so the cap does not bound how many there are.** *Never counted* under *Post caps* in `SKILL.md` excludes "a record row - one line per item, where the length is set by how many items there are rather than by how much was written", which is exactly this. The prose around the table is capped as ever; the table is deliberately uncapped and this comment says so, so nobody shortens it to fit.

**It opens no thread, resolves nothing, and assigns no id of any kind.** A Conversation comment rather than inline comments, because an inline comment opens a thread and `workflows/merge.md` refuses on any unresolved one - and a thread created after Step 3 could never be named by an authorisation that was written before it existed. A second id namespace beside `RF{n}` would be read by that thread audit and by the pass count as though it were one, which is what closed the issue that first tried this on a push of its own.

**Nothing gates on it.** Checked rather than assumed: `workflows/merge.md`'s thread gate reads `reviewThreads`, and this is not one; `scripts/post-review.py`'s `highest-id` counts `::RF{n}::` and the legacy line-start form, so a bare id in a row is ignored, and its warning about an ignored bare id fires only for one *above* the answer, which an already-issued id never is; the pass count reads the reviews surface, where this comment never lands.

**A span carrying nothing is a real answer.** Where the round made no commits - every finding declined - say so in the report and post no comment, rather than an empty table.

## Step 8 - Read the checks

**A red check here reopens nothing**, per the protocol: each finding was closed on its own evidence, and a CI failure contradicts none of it. It is the two-environments finding, so report both sides and diagnose the difference - and it stops the merge until it is answered, which a new commit does rather than a reopened thread.

## Step 9 - Confirm

Open with the verdict line: `✅ ALL PASS` when every unresolved thread was covered and resolved, nothing was held, the delta index either posted or was correctly skipped, and the checks are green; `⚠️ PASSED WITH FINDINGS - {what}` when a thread was left uncovered, a held finding was released and now waits on the owner, a release failed, the delta index failed to post, or a check is red. **A span carrying no commits skips the index and stays `✅`**, per Step 7: a skip it was told to make is not a failure.

Then the record: how many threads were resolved and which ids, which were left and why, which ids were released and are now waiting to be read, the commits that went up, how many rows the delta index carried and how many of them answered no finding, and the check result.

**Then say that this workflow is over and merging is a word of its own**, since the owner's `rnp` did not ask for one and nothing here is about to run it. The command, flush left:

```
/gh-solo:pr-flow merge <pr-number>
```

**This file is where that wording is decided.** The split is not an ergonomic: one word that both released the push and landed the branch would read the checks at Step 8 *after* the merge, and the protocol's step 7 says a red check there stops the merge until it is diagnosed - which it cannot do to a merge the same word already made.

## Rules

- **Only the owner's word in the session starts this** - `rnp`, or the sentence. Never a reaction, never a mentor, never this workflow's own reading of the threads.
- **The authorisation comment goes up before the first resolve**, always, because the resolve is what it is evidence for.
- **Never resolve a thread the batch does not cover.** Name it and leave it; `workflows/merge.md` is what refuses on it.
- **Never name an id in the authorisation that this batch does not resolve**, and never resolve one it does not name.
- **The marker line is a literal.** `workflows/merge.md` greps it.
- **Read each mutation's answer.** A resolve posts nothing, so an unchecked failure is invisible.
- **This is the round's only push**, and the checks are read before it is reported done.
- **This workflow ends at the push. It never merges**, and never chains into `workflows/merge.md`. Step 9 prints the command; the owner types it.
- **The delta index is posted after the push and indexes only what that push carried.** Its span is the before-head Step 5 kept and local `HEAD`, per commit, and it opens no thread and issues no id.
- **The release comes after the push and never before it.** Its anchors resolve only because the push landed, and a failure there is a retry rather than a refusal - the ledger is still on the pull request.
- **Never resolve a released thread.** The authorisation named the ids it covered and a released id was not one of them, so it waits on the owner exactly as a fresh finding does.
