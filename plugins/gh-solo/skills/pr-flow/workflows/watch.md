> **Tools used:** `Bash(python3:*)` to run `scripts/watch.py`, which makes the thread reads itself, `Monitor` to run it, `TaskStop` to end it.

Poll a pull request for the owner's replies and reactions while they read a round at their own pace, and answer each as it lands. Armed by the literal `watch` command, or by `auto` and `go` when they reach the round's step 6. Answering itself is `workflows/discuss.md`; this file is the loop and what ends it.

## Arming it, on the `watch` command and nothing else

**Only the literal `watch <pr-number>` command, or its shortcut `:wt <pr-number>`, arms this.** Not a sentence, not "I am going to read the comments now", not an inference from context however obvious. `auto` and `go` also arm one at their last step, because the owner typed them. A watch is a background process that keeps polling and keeps interrupting; starting one because a sentence sounded like a request is how the owner ends up with something running that they never asked for and may not know about.

If they describe being about to read the review, that is not the command. Mention that `watch <pr-number>` exists and wait to be asked.

Arm it with the `Monitor` tool: `persistent: true`, and a `description` naming the PR, since that text appears on every notification.

```bash
python3 <skill-dir>/scripts/watch.py <pr-number>
```

`<skill-dir>` is this skill's installed directory, per the placeholder note in `SKILL.md`; the shell's working directory is the repository, so the path cannot be relative.

What it prints is one line per new comment, review body, Conversation comment or reaction, each once. It leaves out every post that opens with the disclaimer prefix: the round posts under the owner's login, so without that test the watch would re-emit the round's own replies and the loop would answer itself. A failed request skips one poll rather than ending the watch. `scripts/watch.py` owns the endpoints, the time window, the deduplication and the one-line flattening, and `scripts/test-watch.sh` benches them.

Nothing about this is a preference:

- **Poll every 30 seconds, not faster.** Reading a diff takes minutes, so a shorter interval multiplies polls without shortening the wait. The rate limits are not the reason — a `reviewThreads` query costs 1 point of 5000 an hour, and a conditional REST request that returns `304 Not Modified` costs nothing at all.
- **Emit only new human comments - the owner's or the mentor's.** No heartbeat, no "still waiting", and never the workflow's own posts. Every emitted line becomes a message in the conversation, and a monitor that talks too much is stopped automatically - so the budget that actually binds is the context window, not GitHub. Filtering on "not the agent" instead of "the owner" is what lets a mentor's comment wake a round; the emitted login says who wrote it.
- **A reaction that is removed again is invisible to it**, since the emit already happened. That is one more reason a fired event is only a notification, and the full read in `workflows/discuss.md` Step 1 is the authority.
- **`persistent: true`, with the cost stated.** A watch that outlives the reading session is a watch nobody remembers arming, and that cost is real and accepted: a timeout short enough to prevent it - an hour, say - cannot span a review round, so it would expire mid-read and be worse than useless. The owner chose immediacy, per *The watch survives the round* in `references/review-protocol.md`. Mitigate rather than rely on a timeout: every round report prints the armed state, step 7 stops the watch explicitly, and a monitor dies with the session regardless.

## Stopping it

Only these end a watch, and the owner needs to know `unwatch` at minimum. A `reply` round does **not** stop it - per *The watch survives the round* in `references/review-protocol.md`, it keeps running so comments posted mid-round still wake answers:

|                                                |                                                                                                                                                                |
|------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `unwatch`, or `:uwt`                           | The explicit stop. Call `TaskStop` on the monitor and confirm it is gone                                                                                       |
| The owner authorising the resolve and the push | The review is over. Stop it before pushing anything. There is no other way out of the round, so this is the only stop besides `unwatch` and the session ending |
| The session ending                             | Monitors do not outlive it                                                                                                                                     |

**Say how to stop it in the same breath as arming it.** A background process the owner cannot confidently stop is worse than no background process, and they will not have this file open.

**A fired event is a notification, not the data.** The REST line has no thread grouping and no resolution state, so on any event go to `workflows/discuss.md` Step 1 and read every surface properly. Do not answer from the notification text.

**Watching is optional and adds nothing except immediacy.** The owner saying "I replied on the PR" reaches the same place. If a watch was never armed, nothing is lost.
