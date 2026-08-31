> **Tools used:** `Bash(gh:*)` for the thread read, the authorisation comment, the resolve mutation and the checks read, `Bash(git:*)` for the push, `Write` for the comment body file, `TaskStop` to end a running watch.

End a review round on the owner's word: record the authorisation, resolve the threads it covers, push the fixes that have been waiting, and read the checks.

**This is the protocol's step 7, and `references/review-protocol.md` owns what it means.** That file states the order and why, which threads a batch covers and which it never covers, and why a red check afterwards reopens nothing. What this file owns is the mechanics: the marker line's wording, the mutation, and the order of the calls.

**It is the round's only push.** Every fix commit from the round has been sitting local since it was made, so that the threads stayed anchored to the exact diff the owner was reading. This is where that ends.

## The entrance

The owner says it, in the session: "resolve all and push", or types `rnp`. Also "we are done" or "you can merge" said while a round has left fix commits unpushed, which means this workflow first and `workflows/merge.md` afterwards.

**Their word is the authorisation and nothing else is.** Not a reaction, not a reply in a thread, not a mentor saying the work looks done, and not this workflow's own reading of how settled the threads look. If no such word has been given, there is nothing to do here: say what is still waiting and stop.

## Step 1 - Stop the watch

If a watch is running on this PR, stop it with `TaskStop` before anything else, per *Stopping it* in `workflows/discuss.md`. It exists to carry the owner's signals into the session during step 6, and step 6 is over.

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

## Step 5 - Push, then read the checks

```bash
git push <remote> <branch>
```

Then `gh pr checks <pr-number>`, per the standing convention in `SKILL.md`, before reporting the push as done. Resolve `<remote>` by the recipe in that file's remote-name convention.

**Where a relocation commit is on the remote with its entry still in `## Open questions`, this step lands the PR body edit it owes**, per *Body caps* in `workflows/open.md`, which owns the route and states the invariant this discharges. Read the condition off the remote and the body rather than off what this round holds: an earlier push may already have carried the commit up, and this step owes the edit either way. Where nothing meets it, this step does nothing.

**A red check here reopens nothing**, per the protocol: each finding was closed on its own evidence, and a CI failure contradicts none of it. It is the two-environments finding, so report both sides and diagnose the difference - and it stops the merge until it is answered, which a new commit does rather than a reopened thread.

## Step 6 - Confirm

Open with the verdict line: `✅ ALL PASS` when every unresolved thread was covered and resolved and the checks are green, `⚠️ PASSED WITH FINDINGS - {what}` when a thread was left uncovered or a check is red.

Then the record: how many threads were resolved and which ids, which were left and why, the commits that went up, and the check result. Then the next command, flush left:

```
/gh-solo:pr-flow merge <pr-number>
```

## Rules

- **Only the owner's sentence in the session starts this.** Never a reaction, never a mentor, never this workflow's own reading of the threads.
- **The authorisation comment goes up before the first resolve**, always, because the resolve is what it is evidence for.
- **Never resolve a thread the batch does not cover.** Name it and leave it; `workflows/merge.md` is what refuses on it.
- **Never name an id in the authorisation that this batch does not resolve**, and never resolve one it does not name.
- **The marker line is a literal.** `workflows/merge.md` greps it.
- **Read each mutation's answer.** A resolve posts nothing, so an unchecked failure is invisible.
- **This is the round's only push**, and the checks are read before it is reported done.
