> **Tools used:** `Bash(gh:*)` for the thread reads the poll makes, `Monitor` to run the poll block, `TaskStop` to end it.

Poll a pull request for the owner's replies and reactions while they read a round at their own pace, and answer each as it lands. Armed by the literal `watch` command, or by `auto` and `go` when they reach the round's step 6. Answering itself is `workflows/discuss.md`; this file is the loop and what ends it.

## Arming it, on the `watch` command and nothing else

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
- **`persistent: true`, with the cost stated.** A watch that outlives the reading session is a watch nobody remembers arming, and that cost is real and accepted: a timeout short enough to prevent it - an hour, say - cannot span a review round, so it would expire mid-read and be worse than useless. The owner chose immediacy, per *The watch survives the round* in `references/review-protocol.md`, whose loop is `workflows/watch.md`. Mitigate rather than rely on a timeout: every round report prints the armed state, step 7 stops the watch explicitly, and a monitor dies with the session regardless.

## Stopping it

Only these end a watch, and the owner needs to know `unwatch` at minimum. A `discuss` round does **not** stop it - per *The watch survives the round* in `references/review-protocol.md`, whose loop is `workflows/watch.md` it keeps running so comments posted mid-round still wake answers:

|                                                |                                                                                                                                                                |
|------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `unwatch`                                      | The explicit stop. Call `TaskStop` on the monitor and confirm it is gone                                                                                       |
| The owner authorising the resolve and the push | The review is over. Stop it before pushing anything. There is no other way out of the round, so this is the only stop besides `unwatch` and the session ending |
| The session ending                             | Monitors do not outlive it                                                                                                                                     |

**Say how to stop it in the same breath as arming it.** A background process the owner cannot confidently stop is worse than no background process, and they will not have this file open.

**A fired event is a notification, not the data.** The REST line has no thread grouping and no resolution state, so on any event go to Step 1 and read every surface properly. Do not answer from the notification text.

**Watching is optional and adds nothing except immediacy.** The owner saying "I replied on the PR" reaches the same place. If a watch was never armed, nothing is lost.
