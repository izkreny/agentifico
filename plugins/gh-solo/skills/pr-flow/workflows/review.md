> **Tools used:** `Bash(gh:*)` to fetch PR and issue context and to post comments, threads and Reviews, `Agent` to spawn the `reviewer` subagent, `Skill` to enter the `implement` skill for the fixes, `Bash(python3:*)` for `scripts/post-review.py`, `Write` for the payload and body files, `Read` / `Grep` / `Glob` for repository context.

Run a review round on a pull request: check what the tracker needs, spawn the reviewer, post what it found, plan and land the fixes, have the fixes checked, and stop at the owner.

**The round's rules are `references/review-protocol.md`, and where this file disagrees with it, this file is wrong.** That file owns what each step means and why; this file owns the mechanics: the commands, the script, the spawn and the id arithmetic.

**This workflow never reads the diff, and never reviews.** The analysis belongs to the reviewer subagent, which is a separate agent with its own context precisely so that the session which wrote the code is not the session that judges it. The emptiness test is `changedFiles`, never `gh pr diff`.

## How this runs

`workflows/open.md`, the `implement` skill and `workflows/ready.md` come before this file. The protocol's step 6 is the owner's, and nothing here can do it, hurry it or simulate it; steps 7 and 8 are `workflows/resolve.md` and `workflows/merge.md`, on the owner's word.

**Before the round, and the protocol's steps 1 to 5, are this file - and they are one turn**, not two: nothing between the spawn and the round report waits for a human, which is what makes the caps in the protocol's steps 3 and 5 load-bearing.

## Before the round

### Scope

If a PR number was given, go straight to the preliminaries with that number.

Otherwise list what is open and unreviewed:

```bash
gh pr list --limit 100 --json number,title,headRefName,reviewDecision,isDraft,reviews,changedFiles
```

`--limit` is explicit because the default is 30 and silently truncates.

Skip these kinds of PR, and decide every skip *here*, before the confirmation, so the scope the owner confirms is the scope the loop acts on:

- **`isDraft` is `true`** - unfinished, per the standing convention in `SKILL.md`, until `workflows/ready.md` ends it.
- **A round already ran** - its `reviews` array holds a record Review, recognisable by the `via` line reading `round record` or `re-review record`. **Not by the disclaimer line**, which every agent post opens with, the convention-check Review included: a round that stopped after the preliminaries would then look complete forever. **Do not test `reviewDecision` for "already reviewed".** It reports whether the repository's review *requirement* is satisfied, not whether anyone looked, and with no branch protection demanding a review it stays `""` forever, so a `!= null` test skips every unreviewed PR. It stays in the `--json` list for display.
- **`changedFiles` is `0`** - an empty PR has nothing to review. Skip it and record it as "skipped - empty PR".

List exactly what survived, then **wait for confirmation**. Name the scope in the question, because "all" is only meaningful next to the list it refers to:

```text
2 open PRs with no review round yet:
  #61 feat(backend): add user lookup endpoint
  #60 feat(frontend): add a login form

Run a full review round on both? (yes/no)
This spawns the reviewer, posts its findings, lands the fixes locally, and stops for you.
Nothing is pushed.
```

**Say what is actually about to happen.** A round posts threads and a Review publicly and writes commits to the branch, and the prompt has to name both, or the owner is approving something smaller than what runs.

Stop cleanly on no. **The gate only exists on the no-number path**: when the owner named a PR they have already chosen the scope.

### The preliminaries, per PR

1. **Fetch the PR.**

   ```bash
   gh pr view <pr-number> --json title,body,headRefName,assignees,isDraft,changedFiles,commits
   ```

   If `changedFiles` is `0`, skip and record it as *Scope* does; on a list run that step already dropped these.
2. **Recover the issue.** Derive the number from the branch name by the parse stated once in `SKILL.md`'s branch-format bullet: `feat/GHI-50_login-form` yields `50`. What the branch yields is the `{issue-number}`, never the `<pr-number>`. Read it with `gh issue view <issue-number> --json title,body,labels,parent,blockedBy`. A branch predating the convention may carry a legacy key whose number is **not** an issue number in this tracker: resolve those by title search, `gh issue list --state all --search "<legacy-prefix>-<legacy-number>"`, rather than by assuming. **The reviewer recovers the issue itself and does not get yours** - this copy is for the round report and for the convention checks.
3. **Read what is already posted on the PR**, its comments and its Reviews, before posting anything of your own:

   ```bash
   gh pr view <pr-number> --json comments,reviews --jq '(.comments + .reviews)[] | [.author.login, .body] | @tsv'
   ```

   The login cannot tell you who wrote a thing, per *Recognising the owner* in `references/review-protocol.md`; the disclaimer says an agent wrote it and the `via` line says which one.

| What is already there                                                           | What it means                                                                                                       |
|---------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| Convention findings from an earlier run, via `pr-flow` review, convention check | Already reported. Do not post them again, even where the check still fails                                          |
| A record Review from an earlier round                                           | A round already ran. On a named-PR run this is a further round, which the protocol allows; the ids continue from it |
| A comment in the owner's own voice, no disclaimer                               | A note they wrote themselves. Never restate it as a finding                                                         |
| A mentor or other reviewer                                                      | Advice the owner may have weighed and declined. Never re-raise it, and name it in the round report as unanswered    |

   **The reviewer gets none of this.** Handing it an earlier round's findings would make its read dependent on the last one.
4. **Check the conventions**, per *Convention checks* in this file, and post the failures as one Review:

   ```bash
   gh api "repos/{owner}/{repo}/pulls/<pr-number>/reviews" -f event=COMMENT -F body=@<body-file>
   ```

   `COMMENT`, not `REQUEST_CHANGES`: a missing assignee is a one-command fix, not a reason to mark a PR as blocked. **Not the `pulls/<pr-number>/comments` endpoint**, which anchors to a file and line, where a convention finding has nowhere to anchor. Disclaimer and `via` line first per `SKILL.md`, the latter reading: via `pr-flow` review, convention check; the failure list is a record row, which *Never counted* in `references/post-caps.md` excludes.

   **These are not review findings and get no `RF{n}` id**: giving them ids would put them in the sequence the fix plans and re-review verdicts answer.
5. **Refuse early on a thread the merge gate will refuse on.** The convention table's last row is the cheap, early check for *Resolution rests on recorded authority*; a violation stops this workflow here rather than after a round's worth of work.

## The protocol's steps 1 to 5

### Step 1 - Review

**Read the pass budget before anything is spawned**, per *The pass cap* in `references/pass-cap.md`, which owns the number and the stop's wording:

```bash
gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/reviews" > <reviews-file>
python3 <skill-dir>/scripts/post-review.py passes --reviews <reviews-file>
```

**Step 2 reads that same listing again for `highest-id`, and the reads stay separate.** Reusing it there would make the id arithmetic depend on a stale listing.

#### At the cap

**At or past the cap, refuse in the protocol's wording**, and under the verdict line list the passes that ran - each by the head it read and whether it posted or was discarded, all of which the reviews listing already in hand carries.

**Then print the one exit, `authorise`, in the owner's terms**, per *The pass cap* in `references/pass-cap.md`, which owns the word and what it costs.

**Go to *Which reviewer runs, and the spawn* in this step, and continue from there** - never back to the budget, which would read the same count and refuse the pass just bought, and never forward to the head read, which would skip resolving the appointed reviewer.

**Then what the pull request is left holding, read rather than recalled.** The open findings are the unresolved nodes of the GraphQL `reviewThreads` read the convention checks already make before this step, for *Every resolved thread has recorded owner authority*; take each thread's `body` in the same query and an uncertified verdict is legible in the thread that carries it. **Never fill this from an earlier round's report**, written before every resolve since, nor from a re-review record, which counts verdicts without naming their findings.

Never spawn first and check after: the spawn is the thing being counted, so a check made afterwards has already spent what it was protecting.

**A count of `0` on a pull request that visibly had rounds is the marker's own age**, which the script says on stderr rather than leaving you to infer: rounds posted before the marker existed carry none. Say so in the round report rather than treating the number as wrong or adding a matcher for the old records.

#### Which reviewer runs, and the spawn

**Which reviewer runs, and which model, is a per-repo fact.** The default is the `reviewer` agent this plugin ships, spawned with no model parameter so its own frontmatter decides. Where `<repo-root>/.agents/gh-solo.md`, or `<repo-root>/.claude/gh-solo.md` where that is what the repository uses, carries a `Reviewer agent:`, `Reviewer model:` or `Reviewer command:` line, `references/reviewer-appointment.md` owns what it changes: read it before the spawn, and refuse as it says rather than falling back to the default.

**Read the head before the spawn and hand it over as the scope**, because every anchor the reviewer produces belongs to the version it read:

```bash
git fetch <remote> <branch> --quiet
git rev-parse FETCH_HEAD
```

**Not `gh pr view --json headRefOid`**, which was seen answering with a pre-push sha seconds after a push, so it can hand you a head the branch has already left. Two `git` commands rather than `git ls-remote`, because `git rev-parse FETCH_HEAD` prints the value alone.

Keep the value. It is the pin: Step 2 passes it to the script, which compares it both against what the reviewer reports reading and against the head the ref holds by then.

Spawn it with the PR number and the pin, and nothing else, beside the model parameter where `Reviewer model:` set one.

**The pin is admissible in the prompt where an account of the diff is not**: a sha is an address rather than an account, which is the test `../../agents/reviewer.md` applies to the `rescope` prompt's commit range, so it takes nothing away from the reviewer fetching its own context.

**Nothing else means nothing else.** No summary of the diff, no account of what the branch was trying to do, no list of what you think is risky, no reassurance that a hunk is deliberate. It fetches its own context, and evidence chosen by the author of the code is not independent evidence.

It returns the absolute path of a findings file and its report text. **If the path is missing from its report, the round stops**: a findings file you cannot read is not a review. **The re-spawn is a pass, and the cap is its limit**: post the discard record, re-read the budget, and refuse rather than re-spawn when that pass would be beyond it, naming `authorise` as what buys it.

**A pass whose findings never reach the pull request posts a record, whether anything is re-spawned or not.** The charge follows the pass being spent, per *The pass cap* in `references/pass-cap.md`, whether the round ends or tries again. **Where a re-spawn does follow, the record goes up first** - a session that dies in between has then already charged the pass it lost.

```bash
python3 <skill-dir>/scripts/post-review.py discard --disclaimer-file <disclaimer-file> \
  --head <the pin that pass was given> --why "<what went wrong>" --out <payload-file>
gh api "repos/{owner}/{repo}/pulls/<pr-number>/reviews" --input <payload-file>
```

**It is what charges the pass**: a discard without it leaves the count reading as though the pass never ran. It carries no `comments` array, so it cannot fail on an anchor.

**Every stop that throws a pass away owes this record**, and each of them says so where it stops: the missing findings-file path in this step, the head disagreement and the malformed findings file in Step 2, and the unanchorable finding in Step 2's item 5.

#### While it reads, a push is refused

**From the spawn until Step 2 has posted, a push asked for in the session is refused**, per *The push gate, while a reviewer is reading* in `references/pass-cap.md`, which owns the rule and the reason. It binds the scoped spawns in Step 5 the same way, and it binds however the push was phrased: `git push`, `gh stack sync`, "just push it".

```text
⛔ REFUSED - a reviewer is reading this pull request at {sha}; wait for the round report, or type discard to charge the pass and free the push
```

**Print the exits under it in the owner's terms**, per *The exits* in `references/pass-cap.md`: waiting costs nothing, and `discard` posts the discard record for this pass, charges it, and frees the push - at a cap of one, a further pass is then the owner's to buy with `authorise`.

### Step 2 - Post

One call lands every thread and the record Review together, so a half-posted PR cannot happen.

#### 1. Read the head the ref holds now

Read it the same way Step 1 read the pin and never through `gh pr view`, for the lag reason stated there:

```bash
git fetch <remote> <branch> --quiet
git rev-parse FETCH_HEAD
```

**You do not compare it here.** It travels to `build` as `--head-now` beside the pin as `--pinned-head`, and the script makes each comparison and owns each refusal: the reviewer's reported head against the pin, and the pin against this value.

Either way the post is never attempted, and a re-spawn against the new head resumes **only on the owner's word**, since the discard record you post first puts the pull request at the cap.

#### 2. Find the highest `RF{n}` already on the PR

Ids never restart, so the number comes from what the pull request already carries:

```bash
gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/comments" > <listing-file>
gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/reviews" > <reviews-file>
python3 <skill-dir>/scripts/post-review.py highest-id --comments <listing-file> --reviews <reviews-file>
```

**An id can live on either surface, so each is read and neither argument is optional.** A held finding's id, per Step 5, is reserved in the record Review's body until the push releases it, which the comments endpoint does not reach, so a read of the threads alone would hand that id to a different finding.

**The number comes from the script rather than from a `--jq` filter on the `gh` call**, for the reason the unattended-command bullet in `SKILL.md` states about an aggregate over a paginated result. `highest-id` prints `0` when no round has posted yet, and **`--slurp` must not be added to the listing**: the script refuses that shape.

#### 3. Write the disclaimer line to a file

Its wording is per the AI-disclaimer bullet in `SKILL.md`. The script refuses a line that does not open with `> 🤖`.

#### 4. Build and validate the payload

```bash
python3 <skill-dir>/scripts/post-review.py build --findings <findings-file> \
  --disclaimer-file <disclaimer-file> --continue-from <highest-id> \
  --pinned-head <the pin from Step 1> --head-now <the value item 1 just read> \
  --out <payload-file>
```

**Both head arguments are required here**, exactly as `--unpushed-diff` and `--anchored-at` are required on the re-review's own block in Step 5, and the script refuses a full pass missing either. This block and Step 5's are read together whenever either moves, since `scripts/test-post-review.sh` builds its own argument list rather than reading this file.

It assigns the ids, applies every header, and refuses the whole round on any invalid finding rather than emitting a partial payload. The record Review it builds is posted even at zero findings: it is the evidence `workflows/merge.md` gates on. **A refusal here is not something to work around by posting by hand**: say what is wrong and stop. **A re-spawn here would be a pass too**, so post the discard record, re-read the budget, and name `authorise` as what buys a further pass.

#### 5. Post it

```bash
gh api "repos/{owner}/{repo}/pulls/<pr-number>/reviews" --input <payload-file>
```

The JSON travels in a **file**, per the unattended-command bullet in `SKILL.md`, kept outside the working tree so a copy of it cannot get committed.

**A `422` reading `Line could not be resolved` is an anchor that will not resolve**, which after item 1 leaves one cause: on the appointed-command path `side` is guessed as `RIGHT`, per *Where the appointed reviewer is a command* in `references/reviewer-appointment.md`, and a wrong guess fails the call. Name the finding that could not be anchored and stop - **posting the discard record before you do**.

#### 6. Reconcile what landed

```bash
gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/comments" > <listing-file>
gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/reviews" > <reviews-file>
python3 <skill-dir>/scripts/post-review.py verify --payload <payload-file> --comments <listing-file> --reviews <reviews-file>
```

**`--reviews` is required here for the reason it is required in item 2**: a held finding is in no `comments` array.

**`--paginate` is not optional**: the endpoint pages at 30, and an unpaginated read returns a slice that looks like a failed post. A verify failure is reported, never re-posted over.

#### 7. Post the reviewer's report as a Conversation comment

Post it with `gh pr comment <pr-number> --body-file <body-file>`, disclaimer and `via` line first: via `pr-flow` review, round report. The reviewer's report text goes below it verbatim, which *Never counted* in `references/post-caps.md` excludes; the cap bounds what you write around it, and never re-list findings that are already threads.

### Step 3 - Plan the fix, in the thread

One reply per finding, on the finding's own comment id from the reconciliation read:

```bash
gh api "repos/{owner}/{repo}/pulls/<pr-number>/comments/<comment-id>/replies" -F body=@<body-file>
```

Disclaimer and `via` line first: via `pr-flow` review, fix plan, within the length *Post caps* in `SKILL.md` sets; the plan is the change and the files it touches, never why the finding is right. Code in a **plain fence**, never a `suggestion` fence, for the reason the protocol gives; the script cannot see these replies, so here it is yours to hold.

Which findings get no plan and wait for the owner instead, and what their reply says, is the protocol's. A finding the reviewer marked `needs_owner` in the findings file is one kind; the other you can only see yourself, while planning.

### Step 4 - Fix, commit, report

**Invoke the `gh-solo:implement` skill at its `fix <pr-number>` entrance** and follow it here, in this session. Entering it by name puts the fixes under that skill's own tool grant: re-running any `## Verification` gate the fixes invalidated needs the repository's own commands, which this file's narrowed `Bash` cannot run.

**Still not a subagent**, per that skill's own rule: entering it is about the tool grant, not about handing the work away.

**Nothing is pushed.** The protocol's step 7 is the round's only push and says why.

### Step 5 - Re-review, scoped

Spawn the reviewer again - **the appointed one, resolved exactly as Step 1 resolves it per `references/reviewer-appointment.md`, and refused in the same wording.**

Where the repository appointed a `Reviewer command:` instead, **there is no scoped re-review**: skip this step and report it as `references/reviewer-appointment.md` says.

Pass `rescope <pr-number>` and, in the prompt, exactly this: the commit range the fixes landed in, the findings it is answering about with their `RF{n}` ids, and which commit claims which id. **Where `Reviewer model:` set one, the model travels on this spawn too**, as a parameter beside the prompt, exactly as in Step 1.

**The commits are unpushed, so it reads them with `git` locally**; never hand it a diff you generated.

Then post what it returns:

#### Each verdict as a reply in its finding's thread

The same endpoint as step 3, via `pr-flow` review, re-review verdict, under the same post cap.

#### Re-read the head before building this payload

Read it exactly as Step 2's first item does and compare it against the pin the full pass used. A difference is refused here by you rather than by the script, since this entrance passes `--anchored-at` instead of the pin pair, so the wording is yours to emit:

```text
⛔ REFUSED - the pin {pin} is no longer the head {now}, so somebody pushed during the round
```

#### Its own record Review

One record per analysis is the standing rule and a re-review is an analysis. Same script and same call as step 2, with the re-review findings file, plus the arguments that entrance requires:

```bash
git rev-parse HEAD                              # before the spawn above; keep the value
git diff @{u}..HEAD -U0 > <unpushed-diff-file>
python3 <skill-dir>/scripts/post-review.py build --findings <findings-file> --disclaimer-file <disclaimer-file> --continue-from <highest-id> --unpushed-diff <unpushed-diff-file> --anchored-at <the local head> --out <payload-file>
```

**`--unpushed-diff` and `--anchored-at` are both required on a re-review and both refused on a full pass**, so the round cannot post a rescope payload without saying which lines only this machine has and which head those line numbers were counted against.

**`--anchored-at` is the *local* head, and never the pin Step 1 handed the reviewer.** Every line number this pass returns counts lines at local `HEAD`, after the fix commits. Passing the pushed head instead puts the fix commits inside the shift `release` computes, which moves a held line a second time or drops it as rewritten. Read it before the spawn, since a commit made afterwards would make it a head the reviewer never saw.

#### A new defect that `build` holds gets its `RF{n}` and no thread, this round

Every finding in a file the unpushed commits touch is held: the id is assigned from the same sequence, the finding leaves the `comments` array so no unresolvable anchor is ever sent, and the record Review carries it whole in a fenced ledger. **Leave it in the findings file** - holding is the script's decision from the diff, never yours from the findings.

**The line is brought forward at release, never replayed.** A held finding's `line` counts lines as they stood at `--anchored-at`, and the round goes on committing after the hold, so `release` shifts the number through `git diff <that head>..HEAD` before it anchors anything. A line the fixes rewrote is anchored on the line that replaced it. One they deleted outright is named for the owner rather than posted at a guess, per Step 6 of `workflows/resolve.md`.

**A held finding's fix plan, fix result and verdict go into a follow-up Review, one entry each.** None of them exists when the record Review is posted, and this flow never rewrites a posted Review. At the end of the round, write them as a JSON array of `{rf, kind, text}` - `kind` being `plan`, `result` or `verdict` - and post the Review the script builds from it:

```bash
python3 <skill-dir>/scripts/post-review.py followup --entries <entries-file> --disclaimer-file <disclaimer-file> --out <followup-file>
gh api "repos/{owner}/{repo}/pulls/<pr-number>/reviews" --input <followup-file>
```

**They stay separate rather than folded into the finding's own text**: `release` reads this ledger and emits each entry as its own reply for `workflows/resolve.md` to post. A held finding with no follow-up opens its thread carrying the finding alone, and `release` says which.

**`rnp` is the route, not the owner and not a later pass**: the protocol's step 7 pushes the fixes, and then `release` posts each held finding as a thread under the id it holds, per `workflows/resolve.md`. **The round report says which findings were threaded and which are held**, so a reader cannot take the second for an absence of findings.

#### Re-read the highest `RF{n}` before building this payload

Never reuse step 2's number, which was read before step 2 posted and has gone stale by the size of the round. Read each surface, exactly as step 2 does: a held id is in the record Review's body only.

The caps on the loops are *The caps* in `references/review-protocol.md`: land every retry and every new-defect fix first, then spawn once with the whole range, and say in the round report which findings that pass answered about.

## Stop at the owner

Open with the verdict line: `✅ ALL PASS` when the reviewer found nothing and the conventions were clean, `⚠️ PASSED WITH FINDINGS - {count} posted, {count} fixed locally` otherwise.

Then the round report: which reviewer ran, the model the round asked the spawn for, which is the model that ran unless `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` is set, the finding count by severity and axis, which ids were fixed and by which commit subject, which are waiting on the owner and why, which the re-review held for the push rather than threaded, what it would not certify as closed, which `## Verification` gates were re-run, and that **every commit is local and unpushed**.

Then what the round spent from the budget: which pass this was, how many the pull request has left under *The pass cap* in `references/pass-cap.md`, and any pass that was discarded and why.

Then what the pass cost: its token count, its tool-call count and its wall clock, **as the spawn reported them**. These are the orchestrator's to read off what the spawn returned, never the reviewer's to supply. Where the spawn reports a figure, print it; where it does not, print that it was not reported rather than an estimate.

Then the owner's next move, which is the whole of what they have to do:

```text
Read the threads on the PR, then react or reply:
  👍 or ❤️ accepts a finding. To question one, react 👀 or reply in the thread.
When you are through them, type rnp - or say "resolve all and push".
To get each reply answered as you post it instead, before you start run:
/gh-solo:pr-flow watch <pr-number>
```

Print it with the actual PR number substituted, every time. Naming `watch` here is a mention, not an arming: per `workflows/watch.md`, only the owner typing that command starts a poll.

---

## Convention checks

The reference table for the preliminaries, kept out of the flow because it is looked up rather than read through. Not code quality - tracker integrity. Run these even when the reviewer finds nothing.

| Check                                                  | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
|--------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **PR body**                                            | Contains `Closes #{issue-number}` for the issue the branch belongs to                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **PR title**                                           | `{type}({scope}): {issue title}` - the `{type}` matching the branch's, the `{scope}` being the issue's layer label, omitted when it repeats the type. It becomes the squash commit's subject on `main`, so a title without the prefix or with an invented scope puts a non-conventional commit in the history - see `workflows/merge.md`                                                                                                                                                                                                                                      |
| **Verification present**                               | The body has a `## Verification` section with at least one checkbox. It is a required plan section and `workflows/ready.md` reads it; a PR without it reached review with no stated gates                                                                                                                                                                                                                                                                                                                                                                                     |
| **Body capped**                                        | Every section *Body caps* in `workflows/open.md` names is within the cap it sets, applying the exclusions it points at and its `## Settled` denial. Count them; mechanical, not a judgement. `## Plan overview` also links the plan file rather than naming it in backticks. **The body exists before the round starts**, so a breach is caught in the round that reads it rather than one round late                                                                                                                                                                         |
| **Posts capped**                                       | Every post on the PR carrying a `via` line is within the length `references/post-caps.md` sets, applying its *Never capped* and *Never counted*. Count them; mechanical, not a judgement. **This audits the previous round, never this one** - a round cannot check posts it has not made yet, so a breach surfaces one round late                                                                                                                                                                                                                                            |
| **Posts do not restate**                               | No such post restates what the reader is already looking at, per the companion rule in *Post caps*. **A judgement rather than a count**: a fix plan re-arguing its own finding is inside the sentence cap and still a breach, so counting cannot find it. Same one-round latency                                                                                                                                                                                                                                                                                              |
| **Assignee**                                           | `@me` is set. GitHub does not do this at creation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Branch name**                                        | `{type}/GHI-{issue-number}_{slug}`, per *Quick reference* in `../tracker/references/formats.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Commit headers**                                     | `{type}: {description} (#{issue-number})`, no scope, same source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **No labels, no milestone**                            | The PR carries neither - both live on the issue only, per *Labels* in `../tracker/references/tracker-fields.md`, and the `Closes` line is the join. A milestoned PR also corrupts the milestone's progress count                                                                                                                                                                                                                                                                                                                                                              |
| **Not a draft**                                        | If it is still a draft it should not have reached this workflow; say so rather than reviewing it                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Every resolved thread has recorded owner authority** | An owner reply in the thread, an owner reaction on it, or an authorisation comment naming its `RF{n}` id. One GraphQL read, the same query `workflows/discuss.md` Step 1 uses, and it carries each thread's `isResolved` and each comment's `body` - which is also what Step 1's cap refusal names the open findings from, so one read serves each need. A violation is a hard error per *Resolution rests on recorded authority* in `references/review-protocol.md`, and this is the earliest, cheapest place to catch what `workflows/merge.md` will refuse on at the door  |

`Closes #{issue-number}` and the assignee are the ones that matter most, because nothing else enforces either and a PR missing one quietly breaks the tracker: the issue stays open after the code lands, or the in-progress view stops being true.
