> **Tools used:** `Bash(gh:*)` to fetch PR lists and issue context and to post comments and Reviews, `Read` / `Grep` / `Glob` for repository context.

> **Output format:** console output is plain text. No markdown syntax, no `**bold**`, no `##` headers, no `---` rules, no backtick fences. Use plain ASCII and box-drawing characters (`─`, `│`) for structure, plus the verdict emoji from `SKILL.md`'s verdict-line convention. Markdown belongs only inside the `body` strings sent to the GitHub API. Any command printed for the owner sits alone on its own line at column one, per the same convention - a leading space breaks the paste.

Do the work on either side of a code review: check what the tracker needs, hand the diff analysis to `/code-review`, and record its outcome on the PR when it comes back.

**This workflow never reads the diff.** Not once, in either pass, and not even to test whether it is empty: Pass 1 asks GitHub for the change count instead. The analysis belongs to `/code-review` and the judgement belongs to the owner; what happens here is everything around them - the tracker checks nothing else enforces, the context and the exact command handed over, and the outcome written down afterwards so it can be relied on later. Saying "prepared" rather than "reviewed" is precise, not modest: at the end of Pass 1 nothing has examined a line of code.

## What this workflow does not do

**It does not analyse the diff itself, and it must not.** `/code-review` does that - the code-review capability named in `SKILL.md`'s standing conventions, whose name substitutes per harness - and this flow reserves starting it to the owner: the analysis is a cost and a judgement only they authorise, and its worth as a merge gate depends on it never being run or imitated as a side effect. So never invoke it from here and never replicate its workflow by other means, whether or not the harness would allow the call - Pass 1 ends in a handoff instead.

What this workflow does own is what `/code-review` has no opinion about:

1. **Which PRs are eligible** - open, not draft, not already checked by an earlier run.
2. **The confirmation gate** before anything is posted publicly.
3. **The issue context** recovered from the branch name, so findings can be weighed against acceptance criteria.
4. **The convention checks** that are specific to this repository's tracker and nothing else enforces.

## How this runs: two passes, with the owner between them

1. **`open`** - plan committed alone, draft PR, stop
2. *implementation* - not this skill
3. **`ready`** - the gates audited, draft lifted
4. **`review` Pass 1** - tracker checks posted, handoff line printed, **stop**
5. **the owner** - types the `/code-review` command Pass 1 printed
6. **`review` Pass 2** - record the outcome as one Review, even at zero findings
7. **the owner** - reads the diff, then submits their review
8. **`merge`** - `workflows/merge.md`

This list is the source of truth for order, and the sections below follow it. Steps 1 to 3 are other workflows' business. Steps 4 and 6 are this file's two passes. Steps 5 and 7 are the owner's alone, and nothing here can do them, hurry them, or simulate them. When a section below points back into this list it says *step N of the list*; a bare *Step N* is a heading inside the current pass, and a step referenced across passes names its pass, as in *Pass 1's Step 2*.

**Pass 1 and Pass 2 are separate turns.** Pass 1 ends by printing a command and stopping; nothing else happens until the owner runs it. Pass 2 handles the result, later in the same session, and repeats once per PR as each analysis comes back.

## Pass 1 · on the `review` command

### Step 1 - Determine scope

If a PR number was given, go straight to Step 2 with that number.

Otherwise list what is open and unreviewed:

```bash
gh pr list --limit 100 --json number,title,headRefName,reviewDecision,isDraft,reviews,changedFiles
```

`--limit` is explicit because the default is 30 and silently truncates - the same trap the `tracker` search workflow names.

Skip these kinds of PR, and decide every skip *here*, before the confirmation, so the scope the owner confirms is the scope the loop acts on:

- **`isDraft` is `true`** - unfinished. Draft is the *normal* state here rather than an exception, per the standing convention in `SKILL.md`, so every branch looks like this until `workflows/ready.md` ends it - step 3 of the list above.
- **This workflow already checked it** - its `reviews` array holds a Pass 2 record Review, recognisable by the AI disclaimer line opening the body. That is why `reviews` is in the `--json` list; Step 2's item 3 still re-reads each survivor in full, this filter only needs the records. **Do not test `reviewDecision` for "already reviewed".** It reports whether the repository's review *requirement* is satisfied, not whether anyone looked: with no branch protection demanding a review it stays empty forever, and `gh` returns `""` rather than `null`, so a `!= null` test skips every unreviewed PR - the exact inverse of what it reads like. It stays in the `--json` list because it is worth *displaying*, not for filtering.
- **`changedFiles` is `0`** - an empty PR has nothing to review. Skip it and record it in the summary as "skipped - empty PR"; Step 2's own emptiness test then only ever fires on the named-PR path, which never sees this list.

List exactly what survived those skips, then **wait for confirmation**. Name the scope in the question, because "all" is only meaningful next to the list it refers to:

```
2 open PRs not yet checked by this workflow:
  #61 feat(backend): add user lookup endpoint
  #60 feat(frontend): add a login form

Check tracker conventions on both and post findings where any fail? (yes/no)
This does not read the diff. /code-review does that, and only you can start it.
```

**Say what is actually about to happen, which is less than "review".** The only thing posted here is a convention finding - a missing `Closes`, an unset assignee - and only on a PR where one failed. A prompt reading "post reviews" invites the owner to approve a code review that is not on offer, and then wonder why nothing examined the code.

Stop cleanly on no. Posting to a PR is public and hard to retract quietly, so the gate is not optional even when the answer seems obvious.

**`/code-review` posts to the PR too, and is deliberately not behind this gate.** What it posts is public in exactly the same way; the difference is who initiates. The owner types that command themselves, and typing it *is* the authorisation - a second confirmation would be asking them to approve their own instruction. This gate covers only what the workflow posts on its own initiative, which is the convention findings and nothing else.

**And the gate only exists on the no-number path.** When the owner named a PR they have already chosen the scope, so asking them to confirm their own argument is noise.

### Step 2 - The loop, per PR

1. **Fetch the PR.**

   ```bash
   gh pr view <pr-number> --json title,body,headRefName,assignees,isDraft,changedFiles,commits
   ```

   If `changedFiles` is `0` there is nothing to hand over: skip, and record it in the summary as "skipped - empty PR". On a list run Step 1 already dropped these before the confirmation, so this catches only a PR the owner named directly. This is the emptiness test, and it is why nothing here needs `gh pr diff`. The other fields feed item 4.
2. **Recover the issue.** Derive the number from the branch name `{type}/GHI-{issue-number}_{slug}`, by the parse stated once in `SKILL.md`'s branch-format bullet: `feat/GHI-50_login-form` yields `50`. What the branch yields is the `{issue-number}`, never the `<pr-number>` you are reviewing. Read the issue with `gh issue view <issue-number> --json title,body,labels,parent,blockedBy` for its acceptance criteria. A branch predating the convention may carry a legacy key whose number is **not** an issue number in this tracker: resolve those by title search, `gh issue list --state all --search "<legacy-prefix>-<legacy-number>"`, rather than by assuming. Skip silently when neither yields an issue.
3. **Read what is already posted on the PR**: its comments and its Reviews.

   ```bash
   gh pr view <pr-number> --json comments,reviews \
     --jq '(.comments + .reviews)[] | [.author.login, .body] | @tsv'
   ```

   Who wrote a thing decides what to do with it, and the login alone cannot tell you: every agent post is made with the owner's credentials and carries the owner's login. The AI disclaimer line is the real marker - an agent wrote whatever opens with it, the owner wrote whatever does not.

   | What is already there | What it means |
   |---|---|
   | Convention findings from an earlier run of this workflow | Already reported. Do not post them again. |
   | A Pass 2 record Review from an earlier round | The analysis already ran, at the effort level the record names. Do not re-run it to check; that is the owner's command to give. |
   | A comment in the owner's own voice, no disclaimer | A note they wrote themselves. Do not restate it as a finding. |
   | A mentor or other reviewer | Advice the owner may have weighed and declined. Never re-raise it as a fresh finding; at most note that it is unanswered. |

   Content alone is not enough to decide. A point the owner has already answered and a point nobody has read look identical if you ignore who wrote what.

   **One combination reroutes instead of skipping: inline findings on the diff but no Pass 2 record Review.** That means the analysis ran and the session ended between steps 5 and 6 of the list, so the record is still owed. Stop Pass 1 for this PR and run Pass 2 on it now - do not reprint the handoff, which would ask the owner to pay for the same analysis twice.

   **Comment threads down on the code are none of Pass 1's business.** On a first round none exist yet, and on a later round they belong to the owner's reading - step 7 of the list - and to `workflows/discuss.md`. Nothing Pass 1 posts refers to a file or a line, so nothing here needs to read them.

4. **Check the conventions yourself**, per *Convention checks* at the end of this file. These are the checks `/code-review` does not know about, because they are about this repository's tracker rather than its code.
5. **Post the convention findings as one review**, if any failed:

   ```bash
   gh api "repos/{owner}/{repo}/pulls/<pr-number>/reviews" -f event=COMMENT -f body='...'
   ```

   `COMMENT`, not `REQUEST_CHANGES`: a missing assignee is a one-command fix, not a reason to mark a PR as blocked.

   **Not the `pulls/<pr-number>/comments` endpoint.** That endpoint anchors a comment to a file and line in the diff and demands `commit_id`, `path` and `line` to do it. Every convention finding is a fact about the PR as a whole - a missing `Closes #`, an unset assignee - with no place in the code to anchor to, so that endpoint cannot express one.

   **Every posted comment opens with the AI disclaimer line** per the AI-disclaimer bullet in `SKILL.md`, the `via` line under it per the standing convention there: via `pr-flow` review, pass 1 convention check. A PR comment is prose landing under the owner's name, and a mentor reading the PR has no other way to tell who wrote it. Item 3 above depends on the disclaimer line to recognise this workflow's own posts on the next round.
6. On a failed POST (rate limit, network), record "failed - [reason]" in the summary and continue to the next PR.
7. **Hand the diff analysis off.** The line the owner will type:

   ```
   /code-review high <pr-number> --comment
   ```

   **Where it gets printed depends on scope.** When the owner named the PR, print it here and stop: the loop ran once, this is the whole ending, and Step 3 would only repeat it. Open the ending with the verdict line - `✅ ALL PASS` when the conventions were clean, `⚠️ PASSED WITH FINDINGS - {count} posted` when not - and put the command alone on the next line, flush left, so the owner can paste it whole. On a list run, hold it for Step 3 instead, so every command lands in one block rather than scattered through the loop's output.

   **Name the effort level.** Omitted, the skill reuses whichever level the owner typed last, so the depth of the review would depend on session history rather than on this PR. The levels are `low`, `medium`, `high`, `xhigh` and `max`.

   **`--comment` is what makes the analysis leave its findings on the PR** instead of only in the terminal. What arrives, and how it gets recorded, is Pass 2's subject; nothing more about it belongs before step 6 of the list.

   Hand over the acceptance criteria recovered in item 2, and anything item 3 found already settled, so the owner can weigh the findings without re-reading. Then leave the findings alone: do not pre-empt them, do not re-derive them, and do not second-guess them. If `/code-review`'s criteria are wrong for this repository, that is a change to make in that skill, where it applies everywhere, rather than a set of parallel rules here.

### Step 3 - Summary, then stop

**List runs only.** When the owner named the PR, item 7 already ended the pass, and a one-row table under it would say everything twice. On a list run this is where the record collects: the outcome per PR, whatever Step 1 skipped and item 6 failed, and the handoff commands as one block.

Report the convention checks, which this workflow did, separately from the analysis, which it did not:

```
PRs Prepared For Review
─────────────────────────────────────────────────────
#61  feat(backend): add user lookup endpoint    2 convention findings posted
#60  feat(frontend): add a login form           clean
─────────────────────────────────────────────────────
⚠️ PASSED WITH FINDINGS - 2 convention findings on #61. Then run, one per PR:
/code-review high 61 --comment
/code-review high 60 --comment
```

The verdict line is `✅ ALL PASS` when every PR came through clean. The commands start at column one, one per line, nothing else on the line - the owner pastes them whole.

**Do not call this "reviewed".** Nothing has read the diff yet - neither the analysis nor the owner. This is the **stop** at the end of step 4 of the list: the next move is its step 5, and it is the owner's.

## Pass 2 · when the analysis comes back

**This runs after the owner has typed the handoff command.** A separate turn, later in the same session, repeating once per PR as each analysis comes back. Never a continuation of Pass 1.

**It has a second entrance, because sessions end.** There is no `pass 2` command: when a fresh session runs `review <pr-number>` against a PR that already carries inline findings but no record Review, Pass 1's Step 2 item 3 reroutes here - the analysis already happened, only the record is owed. Without that route the PR would be stuck: `workflows/merge.md` gates on the record Review, and re-running Pass 1 would only reprint a handoff for an analysis that already ran.

### Step 1 - Establish what landed

What step 5 of the list left behind, and the first thing in this flow that touches the code itself: `/code-review --comment` posts each finding as an **inline comment**, a thread anchored to a file and line in the diff. That is where the findings live from now on. When posting fails it prints the findings to the terminal instead, and its terminal narrative is not a record of anything: it posts no summary prose to the PR at all.

So verify rather than assume, with one read that is still not the diff:

```bash
gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/comments" \
  --jq '.[] | "\(.id)  \(.path):\(.line // .original_line)  \(.created_at)"'
```

The analysis just ran in this session, so its effort level and finding count are already in the conversation; this read confirms the findings actually sit on the PR and yields the comment ids and `file:line` pointers Step 2 needs. On a repeat round, tell this round's comments from the last one's by `created_at`. **`--paginate` is not optional**: the endpoint pages at 30 and a plan discussion's threads alone can pass that, so an unpaginated read returns a slice - which looks exactly like the transport failure below and would send the repair form to duplicate threads that already landed. The `--limit` warning on `gh pr list` in Pass 1 is this same trap; it reaches every REST list read.

**If the PR is missing findings the terminal reported, the transport failed - post them yourself, in Step 2's call.** The flag degrades silently when the forked analysis agent is missing the tool that posts inline comments, and the terminal output then holds everything posting needs: each finding's text and its `file:line`. Carrying that output to the PR is transport, not analysis, so the never-replicate rule does not apply, and the owner already authorised the posting by typing `--comment`. Say the fallback happened, then do Step 2 in its repair form below - never post the findings one at a time through `pulls/<pr-number>/comments`, which is one write per finding plus a separate record Review, any of which can fail and leave the PR half-posted.

### Step 2 - Record it as one Review

```bash
gh api "repos/{owner}/{repo}/pulls/<pr-number>/reviews" -f event=COMMENT -f body='...'
```

**The repair form, when Step 1 found the inline posting fell back:** the same endpoint takes a `comments` array, so one request lands every finding as an inline thread *and* the record Review, atomically - either all of it posts or none does. `-f` cannot express an array, so the JSON travels by file: write it to the harness scratchpad with `Write` - outside the working tree, same reason as the body-edit convention in `SKILL.md` - and pass it with `--input`. An `echo '{...}' | gh api` pipe sends the same bytes, but it does not prefix-match this skill's granted `Bash(gh:*)` pattern, so it prompts where the file form runs clean.

```json
{"event":"COMMENT","body":"<the index, disclaimer and via line first, keyed by RF id>","comments":[{"path":"src/foo.py","line":42,"side":"RIGHT","body":"<disclaimer>\n>\n> via `pr-flow` review, RF finding\n\nRF3 🔴 high - <the finding>"}]}
```

```bash
gh api "repos/{owner}/{repo}/pulls/<pr-number>/reviews" --input <scratch-file>
```

`side` is `RIGHT` for a line the diff added or changed, `LEFT` only for a finding about a deleted line; `line` is the line number in that version of the file. Each finding's `body` is the finding's text as the analysis wrote it, opened with the AI disclaimer, the `via` line per the standing convention in `SKILL.md`, and its `RF{n}` severity line, and closed with the `Suggested fix:` paragraph where one is owed - the stamping below owns that rule - born with the same marks the stamping retrofits onto threads `/code-review` posted itself, so both paths end in identically marked threads. The review `body` stays the index it always is. On this path the do-not-restate rule below is not being broken by the `comments` array: these are the living copies being created, not a second copy of existing threads.

The finding format's rules, all owned by `references/review-protocol.md`:

- **After the disclaimer, each finding opens `RF{n}` plus its severity in words with the emoji** - 🔴 high, 🟡 medium, 🔵 low. The severity is mapped from `/code-review`'s own ranking, and the mapping applied is stated in the record Review - never invent a level for a finding that arrived without one.
- **Ids never restart for the life of the PR.** Before numbering, read the existing threads for the highest `RF{n}` already posted and continue from it. `RF3` must mean one thing on this PR forever - including in the follow-up threads the protocol's step 5.2 posts, which reuse the id of the finding they answer.
- **The record Review's index is keyed by `RF{n}`**, one line per finding with its `file:line`, so a reader maps id to place without opening threads.

**On the normal path, stamp the threads `/code-review` posted before recording.** They land bare: no disclaimer, no id. That is unmarked agent prose under the owner's name - the one path in the whole flow that produces it - and it breaks two readers: the index has no id to join to the threads, and `workflows/merge.md`'s thread gate reads any non-disclaimer body as an owner comment, so a bare finding thread would vouch for itself. Number the findings per the id rules above, then prefix each thread through `PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}`, the id from Step 1's read. The endpoint replaces the body rather than prepending, so read each thread's current body first and resend it whole with the disclaimer line, the `via` line (via `pr-flow` review, RF finding), and `RF{n} 🔴 high - posted by /code-review at {effort}` above it, the analysis's text untouched below. The prefix is a prefix: rewriting the wording would leave a thread half-authored by each, with no way to tell which half.

**One addition goes below the finding rather than above it: a `Suggested fix:` paragraph, owed only when the finding does not already say what change would close it.** Read the finding's text for the substance rather than grepping for a label - a rewrite in its own words, a "use X instead", a GitHub suggestion block all count, and a finding carrying any of them gets no append. When the finding only names the defect, append one final paragraph after a blank line: `Suggested fix:` and a sentence or two naming the change, a direction rather than a patch. Source it the way Step 1 sources the repair form: the analysis's terminal narrative from this session often states the fix its posted comment dropped, and carrying that to the thread is transport, not analysis; only when the analysis offered none anywhere, formulate it from the finding's own claim - and never from reading the diff, which stays out of bounds here as everywhere in this workflow. The append keeps authorship as legible as the prefix does: the analysis's text sits untouched as one block, the workflow's lines above and below it.

The repair form needs no PATCH - its threads are born stamped, and born with the same appended paragraph where one is owed.

**Post it even when the analysis was clean.** The record Review's body carries the disclaimer and its `via` line like every other post: via `pr-flow` review, pass 2 record. A Review reading "no findings at `high` effort" is the whole point: without it, a PR with no comments means either *reviewed and fine* or *never reviewed*, and nothing distinguishes them. With it, `gh pr view <pr-number> --json reviews` answers "has this been reviewed" reliably through the disclaimer-opening body, never through array length, which inline discussion inflates with empty-bodied containers. `reviewDecision` cannot answer it at all, per Pass 1's Step 1. That record is the gate `workflows/merge.md` checks before landing anything.

**Body: an index, not a second copy.** The effort level it ran at, the count, and the `file:line` each finding sits on - pointers only. Disclaimer first, as on every posted comment. One Review, never one per finding.

**Do not restate the findings themselves**, tempting as it is. The inline threads are the living copy: the owner resolves them, replies to them, and sometimes shows one to be wrong. A Review body that reproduced each finding's text would be frozen at the moment it was written and would go on asserting things the threads have already settled - and it is the copy `workflows/merge.md` reads as evidence, so a stale one is worse than none. An index cannot contradict the threads because it makes no claims about them.

What this Review is *for* is the count and the fact of the run, which is why it is posted even when the count is zero.

### Step 3 - Tell the owner what is theirs

Step 7 of the list is next, the remaining work is the owner's, and the workflow cannot do it - so say this plainly:

**Review through "Start a review → Submit review"**, in the PR's Files changed tab, rather than by resolving threads one at a time. Resolving a thread is a state change that posts nothing, so a review done that way leaves no timeline record. Batching matters for a second reason: each comment posted individually creates its own empty-bodied review object, while comments submitted as one review share a single record, which keeps the `reviews` array legible for the body-reading gate in `workflows/merge.md`. Submitting one creates a Review under the owner's own name, which is the record that they read the code - distinct from the Review posted in Pass 2, which only records that the machine pass ran.

Each inline comment is a resolvable thread. Pushing a fix marks a thread **Outdated** but never resolves it, so unresolved-and-outdated is a live list of "changed, not yet checked by me" - worth leaving open deliberately until each one has been read.

**Reply in a thread to question a finding**, rather than deciding alone whether it stands. This is where step 7 of the list forks: a reply in any thread goes to `workflows/discuss.md`, which answers it in that thread and returns here.

**Ordering the fixes needs no command.** Once the owner has decided which findings stand - in the threads, or here in the terminal - they say so in plain words: "fix all", "fix RF1 and RF3, skip RF2". That is implementation - the `fix` entrance of the `implement` skill - rather than any workflow of this skill. These hold while doing it: the fixes land as review-fix commits grouped by coherent change, each naming the `RF{n}` ids it closes, so "what changed because of the review" stays separable while the PR is open; whoever re-runs a gate a fix invalidated re-ticks its box, which `workflows/merge.md` audits at the door; the threads stay unresolved for the owner to re-read - a pushed fix only marks them outdated; and the commits wait **unpushed** for the owner's step-5 words, per `references/review-protocol.md` - a push mid-round moves the diff under the reviewer. `/code-review` has a `--fix` flag, but it applies every finding in the same run, before the owner has judged them; in this flow the judgement comes first.

**Then close the loop by saying so, because nothing else will.** No notification reaches this session when a comment is posted in the GitHub UI, so end this step by telling the owner the exact words that bring the work back:

```
When you have been through the review, say "I replied on the PR" or run:
/gh-solo:pr-flow discuss <pr-number>
To get each reply answered as you post it instead, before you start run:
/gh-solo:pr-flow watch <pr-number>
```

Print it with the actual PR number substituted, so both lines are typeable as they stand. Say it every time: it costs four lines and it is the only thing standing between a thoughtful reply on GitHub and nobody ever reading it. Naming `watch` here is a mention, not an arming - per `workflows/discuss.md`, only the owner typing that command starts a poll.

### Step 4 - Confirm

Open with the verdict line: `✅ ALL PASS` at zero findings, `⚠️ PASSED WITH FINDINGS - {count} inline, recorded` otherwise. Then one line per PR: the effort level, the finding count, the record Review's URL, and that the closing words above were printed - their commands already sit flush left on their own lines, which is the convention. Step 8 of the list, merging, is `workflows/merge.md`.

---

## Convention checks

The reference table for Pass 1's Step 2, kept out of the flow because it is looked up rather than read through. Not code quality - tracker integrity. Run these even when the diff is clean.

| Check | Rule |
|---|---|
| **PR body** | Contains `Closes #{issue-number}` for the issue the branch belongs to |
| **PR title** | `{type}({scope}): {issue title}` - the `{type}` matching the branch's, the `{scope}` being the issue's layer label, omitted when it repeats the type. It becomes the squash commit's subject on `main`, so a title without the prefix or with an invented scope puts a non-conventional commit in the history - see `workflows/merge.md` |
| **Verification present** | The body has a `## Verification` section with at least one checkbox. It is a required plan section and `workflows/ready.md` reads it; a PR without it reached review with no stated gates |
| **Plan overview capped** | `## Plan overview` is five sentences or bullets at most, and links the plan file rather than naming it in backticks. Count them; mechanical, not a judgement |
| **Assignee** | `@me` is set. GitHub does not do this at creation |
| **Branch name** | `{type}/GHI-{issue-number}_{slug}`, per *Quick reference* in the `tracker` standards |
| **Commit headers** | `{type}: {description} (#{issue-number})`, no scope, same source |
| **No labels, no milestone** | The PR carries neither - both live on the issue only, per *Labels* in the `tracker` standards, and the `Closes` line is the join. A milestoned PR also corrupts the milestone's progress count |
| **Not a draft** | If it is still a draft it should not have reached this workflow; say so rather than reviewing it |
| **No thread resolved without an owner reply** | Every resolved review thread contains at least one owner comment - a body not opening with the AI disclaimer. One GraphQL read, the same query `workflows/discuss.md` Step 1 uses; a violation is a hard error per conclusion A of `references/review-protocol.md`, and this is the earliest, cheapest place to catch what `workflows/merge.md` will refuse on |

`Closes #{issue-number}` and the assignee are the two that matter most, because nothing else enforces either and a PR missing one quietly breaks the tracker: the issue stays open after the code lands, or the in-progress view stops being true.


---

## Rules

- **Never read the diff, in either pass.** The emptiness test is `changedFiles`, the analysis is `/code-review`'s, and the judgement is the owner's.
- **Never invoke `/code-review`, and never replicate its analysis by other means.** Print the command and stop; only the owner starts it, by typing it.
- **Nothing is posted on the workflow's own initiative without Pass 1's confirmation gate** on the list path. A named PR is its own authorisation.
- **Never filter on `reviewDecision`.** Whether a PR was already checked comes from what is posted on it, told apart by the AI disclaimer line.
- **One record Review per analysis, and it is an index.** Never restate a finding, never one Review per finding, and post it even at zero findings - it is the evidence `workflows/merge.md` gates on.
- **Never call Pass 1's output "reviewed", and never end a pass without printing the owner's next move** - the handoff command in Pass 1, the closing words in Pass 2.
