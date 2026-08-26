The review round protocol. This file owns the sequence; each workflow keeps only its own mechanics and points here. It exists because a round on a real PR went wrong with every rule obeyed - fixes were pushed while the owner was mid-read, and the threads went outdated under them - so the sequence has to live in one place or it drifts.

## The cast

A **round** is one pass of review-then-discussion; there may be several. The **Reviewer** is one of the following, and only how the round starts and who gets notified differs:

- **(a)** the `/code-review` subagent, invoked by the owner
- **(b)** the owner, reading the diff themselves
- **(c)** the owner's mentor

## The finding key

- Every **agent-posted** finding carries, after the AI disclaimer line and the `via` line under it (per the standing convention in `SKILL.md`): an id `RF{number}` - `RF1`, `RF2`, no hyphen - and a severity in words with its emoji: 🔴 high, 🟡 medium, 🔵 low.
- **Ids never restart for the life of the PR.** A new round's fresh findings continue from the highest id already on the PR, found by reading the existing threads. A follow-up thread posted after a step 5.2 push **reuses the id of the finding it answers** - the shared id is what joins the trail; the original thread gets no back-reference reply.
- **Severity is mapped, never invented.** `/code-review` ranks in its own vocabulary; the mapping applied is stated in the round's record Review, which is also where each PR's observed vocabulary is recorded - read a real record rather than mapping from memory.
- **Every agent-posted finding ends by saying what change would close it.** Most findings already do in their own words; one that only names the defect gets a final `Suggested fix:` paragraph when it is stamped or posted. The detection, the sourcing and the wording all belong to `workflows/review.md` Pass 2 - this key only makes the paragraph part of the finding format.
- **Owner-posted findings carry none of this.** When the owner is the Reviewer their bare comments enter step 4 exactly the same way; ids and severities are mandatory for agent posts only.

## The steps

**0-1.** The Reviewer reviews the implemented code and produces findings, ranked by severity.

**2.** The findings are posted as inline comments on the changed lines. When the Reviewer is the `/code-review` subagent, the orchestrating agent posts them only when `--comment` has degraded to printing - the repair form in `workflows/review.md`, since the flag degrades silently (anthropics/claude-code issue 88190).

**3.** The Reviewer notifies the implementor: the mentor tags the owner in a submitted review; the owner says so in the session ("review is done"); for the subagent, the orchestrating agent tells the owner the findings are posted.

**4.** The owner walks every finding and **replies in every thread before resolving it**. The reply's shape decides the agent's obligation - the full classification table is in `workflows/discuss.md` Step 1:

- **4.1 A discussion** - back and forth in the thread until it reaches approve or refuse.
- **4.2 An order** ("OK", "fix it", "drop it", "rewrite it") - the agent fixes, **commits, and replies in the thread** - disclaimer and `via` line first, like every agent post: the commit subject, the RF id, and that it is committed locally and not yet pushed. Never a sha - the owner does not use them, and a stacked branch's later `gh stack sync` rewrites them. **The agent does not push.**
- **4.2.1 The `## Plan overview` is brought up to date in the same round when a fix changes what it describes.** The overview summarises what the branch does, so a fix that adds or removes a behaviour makes it wrong. Wherever the repository sets `squash_merge_commit_message` to `PR_BODY`, per *Repository settings this assumes* in `workflows/merge.md`, that text becomes the squash commit message on `main` and can never be corrected afterwards, so this is not a stale document, it is a permanently wrong commit message. The edit is a body edit, read-modify-write per the body-edit convention in `SKILL.md`, never a commit, and it stays within the overview's cap, per *Convention checks* in `workflows/review.md`. Name it in the round report next to the fix commits.
- **4.3 A refusal** ("no", "nay", "skip it") - a short acknowledgement unless there is a strong counter-argument, then nothing. No fix is made.

**5.** The round's fix commits sit local until the owner says, in the session:

- **5.1 "we are done" / "you can merge"** - first read the threads and check conclusion A *before* pushing: an unresolved thread, or one resolved without an owner reply, stops here with its `file:line` named - catching it after the push would mark the missed thread outdated before the owner walked it, and waste a CI cycle on a merge the gate would refuse anyway. All clear: push, wait for the checks to go green, then continue into `workflows/merge.md`, whose own gate re-checks at the door.
- **5.2 "push for review" / "push changes for review"** - push, read the checks, then post **new inline threads on the lines the fixes changed**, one per fix, each reusing its finding's RF id and saying what changed. The posting form is the same one-call reviews-endpoint pattern as the repair form in `workflows/review.md`: a `comments` array anchored to the new head with `path`, `line`, `side`, each body opening with the disclaimer, its `via` line, and then the reused `RF{n}` and what changed, the review `body` a short index of the push. The originals are left alone; GitHub marks them outdated, which is correct and unavoidable after a push. This returns to step 4.

**Why the push waits:** a push moves the diff, and GitHub recomputes every thread anchor the moment it lands - a push during a round marks threads outdated beneath a review that is part-way through. That is what went wrong on the incident PR, with every then-existing rule obeyed.

## The conclusions

**A. Every thread ends resolved, and no thread is resolved without an owner reply in it.** Resolution stays the owner's act alone, in the GitHub UI. Enforcement: `workflows/review.md` Pass 1 checks it early and cheap; `workflows/merge.md` refuses at the door on an unresolved thread or a thread resolved with no owner comment - the merge gate is the only place a browser-side resolve can be caught.

**B. The watch survives the round.** It runs `persistent: true` and stops only at step 5.1 or on `unwatch`, so the owner can comment and receive answers concurrently instead of serialising the round. A 5.2 push starts another round, so the watch keeps running through it. The cost is real and stays stated in `workflows/discuss.md`: a persistent watch is one nobody remembers arming, which is why every round report prints the armed state, the 5.1 path stops it explicitly, and monitors die with the session regardless.
