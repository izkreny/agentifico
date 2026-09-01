> **Tools used:** `Bash(gh:*)` for the GraphQL thread read, the reply mutation and the `## Settled` body edit, `Bash(git:*)` / `Read` / `Write` / `Edit` / `Grep` / `Glob` for the code a thread points at, the fixes an order authorises and the body's scratch file, `Skill` to enter the `implement` skill for a fix an order authorises, `Monitor` / `TaskStop` for the watch.

Answer the owner's replies wherever they land on a pull request - inline comment threads, review summary bodies, Conversation comments - and land the fixes those replies order: committed, never pushed. The sequence this serves is `references/review-protocol.md`; this file is how its step 6 is answered.

**Nothing tells the agent a reply happened.** There is no webhook, no polling and no notification reaching the session: a comment posted in the GitHub UI is invisible here until someone asks. So this workflow runs only when the owner says they have been through the review — "I replied on the PR", "answer my comments", `discuss 60` — or when a `watch` they explicitly started fires. If they seem to be waiting for the agent to notice on its own, say plainly that it cannot.

**Never call this `sync`.** That word routes to `workflows/stack.md`, where `gh stack sync` cascade-rebases every branch in a stack and then force-pushes all of them. Reading comments and rewriting history must not share a name, and the history in question is pushed.

It is the return half of `workflows/review.md`: that workflow puts findings on the PR, this one carries the conversation that follows. A finding the owner questioned is not resolved and not declined — it is a thread waiting on an answer, and the answer belongs in the thread rather than in the terminal, where the next session will not find it.

## One round, in order

Each `discuss` run is one round of the conversation, and it goes:

1. Leave any watch running - per *The watch survives the round* in `references/review-protocol.md` it outlives a round, and stops only when the owner authorises the resolve and the push, or on `unwatch` (*Stopping it*).
2. Fetch every inline thread in one GraphQL read and drop the resolved ones, and in the same pass fetch the PR's review summary bodies and its Conversation comments (Step 1).
3. Classify each remaining thread by the owner's last comment in it, per the table in Step 1, which owns the classes.
4. Give each class what Step 1's table says it is owed, from that table rather than from a copy of it here. A review summary body or Conversation comment is classified by the same table; when it is owed an answer, the answer goes as one Conversation comment (Step 2), since there is no thread to reply into.
5. Resolve nothing (Step 3), and push nothing - an order authorises the fix and the commit, never the push (Step 4).
6. Report in the terminal: `file:line`, what was asked and what was answered per thread touched, the count left alone with why, any `## Open questions` entries moved to `## Settled`, **how many fix commits sit unpushed waiting for the owner's word**, and whether a watch is armed (Step 5).

Then the ball is the owner's again: read the replies on GitHub, respond or resolve, and run `discuss` once more - or `watch`, for live answers. When every thread is walked, the round ends on the owner authorising the resolve and the push in the session - `rnp`, or "resolve all and push" - which is `workflows/resolve.md`, the protocol's step 7. There is no push-without-resolving option to offer them.

There is no step after that, because this whole workflow is a fork, not a stage: it hangs off the protocol's step 6 and exits where it entered. The owner is still judging throughout, and what follows is their word at step 7, which is `workflows/resolve.md`.

**The fork is available whenever the PR exists, not only mid-review.** The plan discussion `workflows/open.md` stops for is the same mechanics: after `open`, the plan file is the PR's whole diff, so the owner can comment inline on its lines in the **Files changed** tab, `watch` sees those comments, and this workflow answers them in-thread - which puts the plan debate and its decisions on the PR permanently instead of in a chat transcript.

A plan change the exchange settles is Step 4 as usual: an order in the thread gets the change committed, unpushed, with the naming reply. Those plan commits wait like any others; their release is the owner starting implementation, which pushes them before any code lands.

A settled question also moves in the body. When the owner's closing decision settles an entry in `## Open questions`, move it to `## Settled` with the decision, question included, per the template in `workflows/open.md` - a body edit made read-modify-write per the body-edit convention in `SKILL.md`, not a commit, so it disturbs nothing the owner is reading. **Where the move takes `## Settled` past the cap** *Body caps* in `workflows/open.md` sets, that section owns the whole route and this round follows it rather than a copy of it. What is this round's own is the relocation `docs:` commit, made here and held like the others it makes; when the body edit that commit owes lands is stated there. Step 1's plan-record settle in the `implement` skill catches any entry still unmoved before implementation starts.

A decision settled **in the terminal** instead of a thread is recorded the moment it settles - into the plan where it can be public, under a `## Settled` heading, the same name the PR body template gives the section that collects answered questions, so the record wears one heading across every plan and PR instead of a fresh invention each time; or into a private artifact the plan points at (the owner's knowledge base, a local note) where it cannot - never left in the chat transcript.

When the owner says the plan is settled, name the ways forward and let them type one: `go <pr-number>` for the full chain to the review handoff, or `/gh-solo:implement <pr-number>` for implementation alone.

**The owner's words reach a PR on more surfaces than the threads, and a round reads them all.** Inline threads on the diff are the primary surface: they anchor to lines, they thread, and everything above assumes them. But a submitted review carries its own summary body (the `#pullrequestreview-…` anchor), written in the same gesture as its inline comments, and the Conversation tab takes free-standing *issue* comments on an endpoint of its own - and neither is a `reviewThread`, so a round that reads only threads walks past them. That happened on a real PR: two review bodies, one carrying an instruction, sat unread until the owner asked why. Step 1 therefore reads every surface each round, and the watch emits review bodies and Conversation comments too. Inline stays the habit worth telling the owner, because line-anchored comments are the only ones that thread and resolve - but nothing they write on the other surfaces is allowed to go unread.

## Watching, on the `watch` command and nothing else

**Only the literal `watch <pr-number>` command arms this.** Not a sentence, not "I am going to read the comments now", not an inference from context however obvious. The `auto` and `go` chains arm one at their last step, and that is not an exception: each is itself a literal command the owner typed, carrying the authorisation in advance, which is why `workflows/auto.md` may do it and a sentence may not. A watch is a background process that keeps polling and keeps interrupting; starting one because a sentence sounded like a request is how the owner ends up with something running that they never asked for and may not know about.

If they describe being about to read the review, that is not the command. Mention that `watch <pr-number>` exists and wait to be asked.

Arm it with the `Monitor` tool: `persistent: true`, and a `description` naming the PR, since that text appears on every notification.

```bash
seen=$(mktemp)
emit() {
  while read -r key rest; do
    grep -qxF "$key" "$seen" || { printf '%s\n' "$key" >> "$seen"; printf '%s\n' "$rest"; }
  done
}
last=$(date -u +%Y-%m-%dT%H:%M:%SZ)
while true; do
  now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  { gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/comments?since=$last" \
      --jq '.[] | select(.body | startswith("> 🤖") | not) |
            "\(.id)@\(.updated_at) \(.user.login)  \(.path):\(.line // .original_line)  \(.body[0:140] | split("\n") | join(" "))"' || true; } | emit
  { gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/reviews" \
      --jq ".[] | select(.submitted_at > \"$last\") | select(.body != \"\") |
            select(.body | startswith(\"> 🤖\") | not) |
            \"\(.id)@\(.submitted_at) \(.user.login)  review(\(.state))  \(.body[0:140] | split(\"\n\") | join(\" \"))\"" || true; } | emit
  { gh api --paginate "repos/{owner}/{repo}/issues/<pr-number>/comments?since=$last" \
      --jq '.[] | select(.body | startswith("> 🤖") | not) |
            "\(.id)@\(.updated_at) \(.user.login)  conversation  \(.body[0:140] | split("\n") | join(" "))"' || true; } | emit
  { gh api graphql -F owner='{owner}' -F repo='{repo}' -f query='
      query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number:<pr-number>) {
            reviewThreads(first:100) { nodes { path line
              comments(first:20) { nodes { databaseId
                reactions(first:20) { nodes { content createdAt user { login } } } } } } } } } }' \
      --jq ".data.repository.pullRequest.reviewThreads.nodes[] |
            .path as \$p | .line as \$l | .comments.nodes[] | .databaseId as \$id |
            .reactions.nodes[] | select(.createdAt > \"$last\") |
            \"\(\$id)/\(.content)/\(.user.login)@\(.createdAt) \(.user.login)  \(\$p):\(\$l)  reacted \(.content)\"" || true; } | emit
  last=$now
  sleep 30
done
```

**Read `now` before the request and assign it after.** Taking the timestamp afterwards would skip any comment posted while the request was in flight, and a dropped comment here looks exactly like a comment the owner never wrote. The window therefore overlaps on purpose: what that costs is a duplicate, never a miss, and the `$seen` dedupe is what makes the trade free.

Nothing about this is a preference:

- **Poll every 30 seconds, not faster.** Reading a diff takes minutes, so a shorter interval multiplies polls without shortening the wait. The rate limits are not the reason — a `reviewThreads` query costs 1 point of 5000 an hour, and a conditional REST request that returns `304 Not Modified` costs nothing at all.
- **Emit only new human comments - the owner's or the mentor's.** No heartbeat, no "still waiting", and never the workflow's own posts. Every emitted line becomes a message in the conversation, and a monitor that talks too much is stopped automatically - so the budget that actually binds is the context window, not GitHub.
- **The disclaimer exclusion in the `--jq` is the only filter, and it is what keeps that true.** Every reply Step 2 posts is made with the owner's credentials and carries the owner's login, so a login test can never tell agent from human - without the `startswith` exclusion the watch would re-emit the workflow's own replies as fresh comments on the next poll, and the loop would answer itself. Filtering on "not the agent" instead of "the owner" is also what lets a mentor's comment wake a round; the emitted login says who wrote it.
- **The reactions poll is the one GraphQL call in the loop, and it filters client-side too.** There is no `since` on it either, so `createdAt > "$last"` stands in, and its key is the comment's `databaseId` plus the content plus the reactor, which is unique per reaction. No agent ever reacts, so this poll needs no disclaimer exclusion; the emitted login is what says whether it was the owner or a mentor. **A reaction that is removed again is invisible to it** - the emit already happened - which is one more reason the standing rule below holds: an event is a notification, and Step 1's full read is the authority.
- **The reviews poll filters client-side, because that endpoint has no `since` parameter.** The `submitted_at > "$last"` select inside double quotes is what stands in for it, and the double quoting is load-bearing: `$last` has to interpolate. The issue-comments call is the Conversation tab; `pulls/…/comments` and `issues/…/comments` are different endpoints that only sound alike, and dropping either reopens the blind spot this loop exists to close.
- **Every emitted record is deduplicated on its `id` plus its own timestamp.** The window overlaps by a second at every boundary: `last=$now` is stamped to whole seconds, `since` admits a record whose `updated_at` equals it, and `submitted_at > "$last"` treats two strings equal to the second as not-greater. So anything written inside the second that `$last` names is delivered in the cycle that finds it and again in the next one. Observed twice on the same PR, payloads byte-identical 32 seconds apart: a four-comment review at 20:43:21 and 20:43:53, a review body at 08:31:22 and 08:31:54. A strict `>` would trade the duplicate for a silent drop - a comment written after a cycle's request but inside its `$now` second would then never match again - so the overlap stays and `$seen` removes the repeat. The timestamp in the key is what lets a genuinely edited comment through a second time. This is not cosmetic: every emitted line is an order or a question, and `OK, fix it then` delivered twice invites the fix twice.
- **Each record is flattened to one line before it is emitted.** `split("\n") | join(" ")` on the body slice. The dedupe reads one record per line, and a multi-line body would otherwise arrive as records with no key - and the 140-character slice only reads as a summary on one line anyway.
- **`|| true` on the call, inside the braces.** One failed request must not kill the watch, and the braces keep the guard on the call rather than on the pipeline into `emit`, whose own exit status would otherwise mask it.
- **`persistent: true`, with the cost stated.** A watch that outlives the reading session is a watch nobody remembers arming, and that cost is real and accepted: a timeout short enough to prevent it - an hour, say - cannot span a review round, so it would expire mid-read and be worse than useless. The owner chose immediacy, per *The watch survives the round* in `references/review-protocol.md`. Mitigate rather than rely on a timeout: every round report prints the armed state, step 7 stops the watch explicitly, and a monitor dies with the session regardless.

### Stopping it

Only these end a watch, and the owner needs to know `unwatch` at minimum. A `discuss` round does **not** stop it - per *The watch survives the round* in `references/review-protocol.md` it keeps running so comments posted mid-round still wake answers:

|                                                |                                                                                                                                                                |
|------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `unwatch`                                      | The explicit stop. Call `TaskStop` on the monitor and confirm it is gone                                                                                       |
| The owner authorising the resolve and the push | The review is over. Stop it before pushing anything. There is no other way out of the round, so this is the only stop besides `unwatch` and the session ending |
| The session ending                             | Monitors do not outlive it                                                                                                                                     |

**Say how to stop it in the same breath as arming it.** A background process the owner cannot confidently stop is worse than no background process, and they will not have this file open.

**A fired event is a notification, not the data.** The REST line has no thread grouping and no resolution state, so on any event go to Step 1 and read every surface properly. Do not answer from the notification text.

**Watching is optional and adds nothing except immediacy.** The owner saying "I replied on the PR" reaches the same place. If a watch was never armed, nothing is lost.

## Step 1 - Read every thread, whole

```bash
gh api graphql -F owner='{owner}' -F repo='{repo}' -f query='
query($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number:<pr-number>) {
      reviewThreads(first:100) { pageInfo { hasNextPage } nodes {
        id isResolved isOutdated path line
        comments(first:20) { pageInfo { hasNextPage } nodes { databaseId author { login } body
          reactions(first:20) { nodes { content createdAt user { login } } } } } } } } } }'
```

**A truthy `hasNextPage` on either connection means this read is a slice, and a slice is refused rather than acted on** - the same rule as `--paginate` on a REST list, and for a sharper reason. GraphQL returns the *oldest* twenty comments in a thread, while every classification here reads the owner's *last* one, so a long thread hands back the whole conversation except the part that decides what to do with it. A finding's thread carries the finding, the fix plan, the fix result and the re-review verdict before the owner has said anything, and a second round doubles that, so twenty is reachable rather than theoretical. Stop with `⛔ REFUSED - the thread read is truncated` and name which connection overflowed; the gates in `workflows/resolve.md` and `workflows/merge.md` read this same query, and there a missed last comment resolves an unanswered question or refuses a correctly authorised merge with no way to tell why. The `reactions` connection is the one that is safe at `first:20`: a finding thread does not collect twenty reactions.

**Reactions travel in this same query, so they cost no extra request.** The owner answers a finding thread with a reaction as often as with a sentence - the vocabulary is in `references/review-protocol.md`, which owns it - so a round that read only bodies would walk past half of what they said, and they would watch an agent ignore them.

**Read them through `reactions`, not `reactionGroups`.** Both carry who reacted, but `reactions` gives a plain `user` and a `createdAt` on each one, and the watch needs that timestamp to tell a reaction it has already emitted from a new one. `reactionGroups` exposes its reactors as a union, which is more work to read for nothing gained. `databaseId` is on each comment for the same reason: it is what a reaction is keyed against when deduplicating.

**`owner` and `repo` travel as `-F` fields, never inside the query string.** `gh` substitutes the `{owner}`/`{repo}` placeholders only in the endpoint and in `-F` values; inside a `-f` string they go to GitHub as literal braces and the read fails with "could not resolve to a Repository". The reply mutation in Step 2 is the reverse case: `threadId` and `body` are literal strings, so they take `-f`, which never type-converts.

**Read each thread as a unit, in order.** A reply's meaning comes from what it answers, and the same sentence means different things at the top of a thread and at the bottom of one.

**Classify by the owner's last signal in the thread, which may be a reaction rather than a comment.** A reaction is judged by who left it, never by the comment it sits on: every agent post is made with the owner's credentials and carries their login, so no test on a comment's author tells agent from human, and a mentor's reaction is not an authorisation. Which comment carries it decides what it refers to, since a finding thread holds the finding, the fix plan and the fix result. What each reaction means is `references/review-protocol.md`'s to say, and it is not restated here; what this workflow owes each one is below.

| The owner's last signal                              | What to do                                                                                                       |
|------------------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| A reaction the protocol reads as accepted            | Nothing in the thread. It is an approval, not a question, and it authorises the resolve at the protocol's step 7 |
| A reaction the protocol reads as the canned question | Answer it in the thread, in the register the protocol names, exactly as though they had typed it                 |
| A reaction the protocol gives no meaning             | Nothing. It is not a signal and not an unknown to ask about                                                      |

**Sort threads whose last signal is a comment by what that comment does**, because the right response differs completely:

| The owner's last comment                                                                   | What it is                                                                                                                                                                                                           | What to do                                                                                                                                                                                                                                                                                                                                                                                             |
|--------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Asks something                                                                             | An open question addressed to whoever posted the finding                                                                                                                                                             | Answer it in the thread                                                                                                                                                                                                                                                                                                                                                                                |
| Challenges the finding                                                                     | A claim that it is wrong or does not apply                                                                                                                                                                           | Check the code again, then either concede or show the case that triggers it                                                                                                                                                                                                                                                                                                                            |
| Proposes a different fix                                                                   | An invitation to compare approaches                                                                                                                                                                                  | Say which is better and why; if theirs is, say so plainly                                                                                                                                                                                                                                                                                                                                              |
| States a decision that closes the thread                                                   | Settled; only bookkeeping follows                                                                                                                                                                                    | **Nothing in the thread** - no reply, no argument, no restatement. If the decision settles an entry in the PR body's `## Open questions`, move it to `## Settled` with the decision, question included - a body edit per the body-edit convention in `SKILL.md`, not a commit. Past the cap, the route is *Body caps*' in `workflows/open.md` and none of it happens in this round but the held commit |
| **Orders a change** ("OK", "fix it", "drop it", "rewrite it")                              | Settled, and work follows                                                                                                                                                                                            | Fix it, commit it, reply in the thread naming the commit - **do not push** (Step 4)                                                                                                                                                                                                                                                                                                                    |
| **Orders work behind a terminal gate** ("create a ticket for this", "push it", "merge it") | An order this workflow cannot execute from a thread: creation has the confirm-before-create gate of `tracker`, pushing and merging wait on the owner authorising them in the session, which is the protocol's step 7 | Reply naming the gate and the exact command to type in the session - `create issues for ...`, `rnp` or "resolve all and push", `merge <pr-number>` - and execute nothing                                                                                                                                                                                                                               |
| **Refuses a change** ("no", "nay", "skip it")                                              | Settled, no work follows                                                                                                                                                                                             | Acknowledge briefly in the thread - unless there is a strong counter-argument, which is made once - then stop. No fix is made                                                                                                                                                                                                                                                                          |
| **Acknowledges an agent reply** ("OK" after "fixed, committed")                            | Closing the loop                                                                                                                                                                                                     | **Nothing. Never reply to an acknowledgement** - the watch is persistent, so an answered "OK" would fire it and the loop would answer itself forever                                                                                                                                                                                                                                                   |
| Nothing — the owner has not replied                                                        | Not a discussion                                                                                                                                                                                                     | Leave it alone. `workflows/review.md` owns unanswered findings                                                                                                                                                                                                                                                                                                                                         |

**Skip resolved threads entirely**, and treat `isOutdated` as no signal at all: it only means the line moved when a fix was pushed. An outdated thread with a live question is still a live question.

### Review bodies and Conversation comments

Both are fetched in the same pass as the threads:

```bash
gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/reviews" --jq '.[] | select(.body != "") | {id, author: .user.login, state, submitted_at, body}'
gh api --paginate "repos/{owner}/{repo}/issues/<pr-number>/comments" --jq '.[] | {author: .user.login, created_at, body}'
```

Drop every body that opens with the AI disclaimer - those are this workflow's own posts, the same filter the watch applies. What remains is the owner's or the mentor's, and each is classified by the table above exactly as a thread comment would be. The differences from threads: there is no resolution state, so "already handled" is read from the record - a body whose ask is answered by a later agent Conversation comment naming it is done; one with no such answer is live, however old it is. And there is no thread to reply into, so an owed answer goes as a Conversation comment (Step 2). An acknowledgement-only body ("Round two", "LGTM so far") gets what an acknowledgement gets: nothing.

## Step 2 - Answer in the thread

```bash
gh api graphql -f query='
mutation($threadId:ID!, $body:String!) {
  addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$threadId, body:$body}) {
    comment { url } } }' -f threadId='<thread-id>' -f body='...'
```

The `id` from Step 1 is the `threadId`. Both inputs are required.

**A reply that fails with `user_id can only have one pending review per pull request` is blocked by the owner, not broken.** GitHub allows one `PENDING` review per account per PR, and a review the owner started in the UI and has not submitted holds that slot. Observed on the REST replies endpoint the fix workflow of `implement` uses; whether this mutation is affected too is untested, so treat the 422 by its message rather than by which call raised it. When it lands:

```bash
gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/reviews" --jq '.[] | select(.state == "PENDING") | .id'
```

Report to the owner: the review id, that their unsubmitted review is holding the slot, and that submitting or discarding it unblocks the round. Then stop - do not retry, and never post the reply anywhere else to get it out.

**Never read that review's comments.** `pulls/<pr-number>/reviews/<id>/comments` returns the bodies of an unsubmitted review to its own author, and that is wording the owner has not published and may still delete. The block is the review's existence, which `state` already told you; its contents cannot help, and an agent that has read them can no longer tell a draft it saw from an order it was given.

**Re-read the code before answering.** The finding came from a pass over a diff, and the owner is asking about the code as it stands now, which may have moved since. An answer that describes a version that no longer exists is worse than no answer.

**Answer the question that was asked.** Not the adjacent one, not the general principle. If the owner asks whether a null check is reachable, the answer names the caller that reaches it or concedes that none does.

**Concede plainly when they are right.** "You are right, `x` cannot be null here — the guard at line 40 covers it" ends a thread correctly. Hedging to avoid being wrong wastes the exchange and leaves the thread ambiguous.

**One reply per thread per pass.** Threads are read as units, and three replies in a row from the agent make that impossible.

**Every reply opens with the AI disclaimer line** per the AI-disclaimer bullet in `SKILL.md`, the `via` line under it per the standing convention there: via `pr-flow` discuss, thread reply. **Its length is set by *Post caps***, in the same file. A thread the owner may quote or a mentor may read has no other way to tell who wrote what - the login is always the owner's, the disclaimer says an agent wrote it, and the `via` line says which process did.

**A review body or Conversation comment is answered with one Conversation comment.** There is no thread to reply into, so post with `gh pr comment <pr-number> --body-file <file>` - disclaimer and `via` line first, then a link to the review or comment being answered, then the answer, within the length *Post caps* in `SKILL.md` sets. One comment may answer several bodies from the same round, naming each; the body file lives in the harness scratchpad like every other scratch file, never in the working tree.

## Step 3 - Never resolve a thread

**A resolve rests on authority the owner recorded, and a discuss round holds none.** Resolving is the orchestrator's act, not the owner's - `workflows/resolve.md` runs the mutation - but per *Resolution rests on recorded authority* in `references/review-protocol.md` the authority for it is never inferred, and a thread that reached agreement is not the owner's word that the round is done. That word comes in the session, at the protocol's step 7, which is where the resolve happens. Leave every thread open here, however finished the exchange feels.

The same reasoning forbids the softer version: do not ask to resolve them, and do not report a thread as resolved because the conversation reached agreement. Until step 7, unresolved is also the owner's live list of what they have not re-read.

## Step 4 - An order in a thread gets its fix, committed, never pushed

An order inside a thread authorises the fix and the commit. **It does not authorise a push.** The owner is still reading the diff, and a push during a round marks threads outdated beneath a review that is part-way through. Fix, commit, reply in the thread, then stop; pushing happens only at the protocol's step 7, on the owner's words in the chat session.

About the fix and its reply:

- **The reply naming the fix is a post like any other**, so its length is set by *Post caps* in `SKILL.md` and its companion rule holds: name the commit rather than paraphrasing it.

- **How the fixes are grouped and committed is Step 3 of the `implement` skill's `fix` workflow**, which owns it; this round's own part is the order it gives and the scope of that order. Any `## Verification` gate a fix invalidated is re-run and re-ticked, and those are the repository's own commands, which this skill's narrowed `Bash` cannot run, so **invoke the `gh-solo:implement` skill at its `fix <pr-number>` entrance** and follow it here: entering it by name is what puts the work under that skill's tool grant.
- **The reply names the commit subject and the `RF{n}`, and says plainly that it is committed locally and not yet pushed.** Never a sha - the owner does not use them, and on a stacked branch a later `gh stack sync` rewrites them. Disclaimer first, as on every reply.
- **The fix stays scoped to the order.** A defect noticed while fixing goes to the next review pass, per the rule below, not into the commit.

## Step 5 - Confirm

One line per thread touched: the file and line, what the owner asked, and one clause on what was answered or fixed. Then the same for review bodies and Conversation comments: each one answered or acted on this round, and that the rest were read and needed nothing. Then the count of threads left alone, and why - settled, unanswered, or resolved. Then any `## Open questions` entries moved to `## Settled`, since `ready` and `merge` audit that section later and the report is what ties their finding to the round that acted. Then the state the round ended in, explicitly: **how many fix commits sit unpushed, waiting for the owner to authorise the push at step 7**, and whether a watch is armed on this PR - a fresh session must be able to tell "fixed and waiting for the word" from "nothing to do".

---

## Rules

- **Answer on GitHub, never in the terminal.** In the thread when there is one; as a Conversation comment for a review body or Conversation comment, which have none. A terminal answer is lost the moment the session ends, and the owner asked on GitHub because that is where they wanted the record.
- **Never push during a round.** An order authorises the fix and the commit only; the push waits for the owner authorising it in the session at the protocol's step 7, per `references/review-protocol.md`. A push mid-read moves the ground under the reviewer.
- **A question is not a decision.** *Resolution rests on recorded authority* in `references/review-protocol.md` counts a reply of the owner's as authority to resolve, and `workflows/resolve.md` Step 2 sorts the threads on it; that rule holds only for replies that actually settle something. Misreading a question as a verdict leaves it unanswered forever.
- **Never open a new finding here.** A defect noticed while answering goes to the next `review` pass, not into an unrelated thread where nobody is looking for it.
- **An order in a thread never satisfies a terminal gate.** The thread records the order; the terminal is where its gate runs. "Create a ticket" goes through the breakdown-and-confirm gate of `tracker`, whose revise-and-ask loop cannot fit one-reply-per-thread-per-pass; "push it" and "merge it" wait on the owner authorising them in the session, at the protocol's step 7. The reply names the command to type, and nothing is executed from the thread.
- **Never resolve here, and never close the discussion on the owner's behalf.** Resolving is `workflows/resolve.md`'s act at the protocol's step 7, on authority the owner gave in words; a round of conversation is not that authority.
- If no thread has an owner reply awaiting an answer, say so and stop. There is nothing to do and nothing to post.
