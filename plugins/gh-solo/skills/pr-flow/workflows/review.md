> **Tools used:** `Bash(gh:*)` to fetch PR and issue context and to post comments, threads and Reviews, `Agent` to spawn the `reviewer` subagent, `Skill` to enter the `implement` skill for the fixes, `Bash(python3:*)` for `scripts/post-review.py`, `Write` for the payload and body files, `Read` / `Grep` / `Glob` for repository context.

Run a review round on a pull request: check what the tracker needs, spawn the reviewer, post what it found, plan and land the fixes, have the fixes checked, and stop at the owner.

**The round's rules are `references/review-protocol.md`, and where this file disagrees with it, this file is wrong.** That file owns the cast, the finding key, what each step means and why, the owner's vocabulary and the conclusions the gates enforce. What this file owns is the mechanics: the commands, the script, the spawn, and the id arithmetic. Nothing about the round's rules is restated here, because a second copy drifts.

**This workflow never reads the diff, and never reviews.** The analysis belongs to the reviewer subagent, which is a separate agent with its own context precisely so that the session which wrote the code is not the session that judges it. The emptiness test is `changedFiles`, never `gh pr diff`. What happens here is everything around the analysis: the tracker checks nothing else enforces, the spawn, the posting, the fixes, and the stop.

## How this runs

1. **`open`** - plan committed alone, draft PR, stop. Another workflow.
2. *implementation* - the `implement` skill.
3. **`ready`** - the gates audited, draft lifted. Another workflow.
4. **Before the round** - scope, the confirmation gate, the convention checks.
5. **The protocol's steps 1 to 5** - review, post, plan, fix, re-review. Unattended, one block.
6. **Stop.** The protocol's step 6 is the owner's, and nothing here can do it, hurry it or simulate it.
7. **The protocol's steps 7 and 8** - the resolve and push on the owner's word, then `workflows/merge.md`.

**Before the round, and the protocol's steps 1 to 5, are this file - and they are one turn**, not two: nothing between the spawn and the round report waits for a human, which is what makes the caps in the protocol's steps 3 and 5 load-bearing.

## Before the round

### Scope

If a PR number was given, go straight to the preliminaries with that number.

Otherwise list what is open and unreviewed:

```bash
gh pr list --limit 100 --json number,title,headRefName,reviewDecision,isDraft,reviews,changedFiles
```

`--limit` is explicit because the default is 30 and silently truncates - the same trap the `tracker` search workflow names, and the same one `--paginate` answers on every REST list read below.

Skip these kinds of PR, and decide every skip *here*, before the confirmation, so the scope the owner confirms is the scope the loop acts on:

- **`isDraft` is `true`** - unfinished. Draft is the *normal* state here rather than an exception, per the standing convention in `SKILL.md`, so every branch looks like this until `workflows/ready.md` ends it.
- **A round already ran** - its `reviews` array holds a record Review, recognisable by the `via` line reading `round record` or `re-review record`. That is why `reviews` is in the `--json` list. **Not by the disclaimer line**, which every agent post opens with, the convention-check Review of the preliminaries included: a round that stopped after the preliminaries would then look complete forever, and the PR would be skipped by every later run with no round on it. **Do not test `reviewDecision` for "already reviewed".** It reports whether the repository's review *requirement* is satisfied, not whether anyone looked: with no branch protection demanding a review it stays empty forever, and `gh` returns `""` rather than `null`, so a `!= null` test skips every unreviewed PR - the exact inverse of what it reads like. It stays in the `--json` list because it is worth *displaying*, not for filtering.
- **`changedFiles` is `0`** - an empty PR has nothing to review. Skip it and record it as "skipped - empty PR".

List exactly what survived, then **wait for confirmation**. Name the scope in the question, because "all" is only meaningful next to the list it refers to:

```
2 open PRs with no review round yet:
  #61 feat(backend): add user lookup endpoint
  #60 feat(frontend): add a login form

Run a full review round on both? (yes/no)
This spawns the reviewer, posts its findings, lands the fixes locally, and stops for you.
Nothing is pushed.
```

**Say what is actually about to happen.** A round posts threads and a Review publicly and writes commits to the branch, and the prompt has to name both, or the owner is approving something smaller than what runs. Naming the push-hold in the prompt is not reassurance, it is the one fact that makes the rest acceptable to approve unattended.

Stop cleanly on no. **The gate only exists on the no-number path**: when the owner named a PR they have already chosen the scope, and asking them to confirm their own argument is noise.

### The preliminaries, per PR

1. **Fetch the PR.**

   ```bash
   gh pr view <pr-number> --json title,body,headRefName,assignees,isDraft,changedFiles,commits
   ```

   If `changedFiles` is `0` there is nothing to review: skip, and record it as "skipped - empty PR". On a list run the scope step already dropped these, so this catches only a PR the owner named directly. This is the emptiness test, and it is why nothing here needs `gh pr diff`.
2. **Recover the issue.** Derive the number from the branch name by the parse stated once in `SKILL.md`'s branch-format bullet: `feat/GHI-50_login-form` yields `50`. What the branch yields is the `{issue-number}`, never the `<pr-number>`. Read it with `gh issue view <issue-number> --json title,body,labels,parent,blockedBy`. A branch predating the convention may carry a legacy key whose number is **not** an issue number in this tracker: resolve those by title search, `gh issue list --state all --search "<legacy-prefix>-<legacy-number>"`, rather than by assuming. **The reviewer recovers the issue itself and does not get yours** - this copy is for the round report and for the convention checks.
3. **Read what is already posted on the PR**, its comments and its Reviews, before posting anything of your own:

   ```bash
   gh pr view <pr-number> --json comments,reviews --jq '(.comments + .reviews)[] | [.author.login, .body] | @tsv'
   ```

   Who wrote a thing decides what to do with it, and the login cannot tell you: every agent post is made with the owner's credentials and carries the owner's login. The disclaimer says an agent wrote it and the `via` line says which one.

   | What is already there | What it means |
   |---|---|
   | Convention findings from an earlier run, via `pr-flow` review, convention check | Already reported. Do not post them again, even where the check still fails |
   | A record Review from an earlier round | A round already ran. On a named-PR run this is a further round, which the protocol allows; the ids continue from it |
   | A comment in the owner's own voice, no disclaimer | A note they wrote themselves. Never restate it as a finding |
   | A mentor or other reviewer | Advice the owner may have weighed and declined. Never re-raise it, and name it in the round report as unanswered |

   **The reviewer gets none of this.** It is spawned with a number and fetches its own context, and handing it an earlier round's findings is the one thing that would make its read dependent on the last one. What this read is for is your own posting: not repeating a convention finding, and having something to say about a mentor in the report.
4. **Check the conventions**, per *Convention checks* at the end of this file, and post the failures as one Review:

   ```bash
   gh api "repos/{owner}/{repo}/pulls/<pr-number>/reviews" -f event=COMMENT -f body='...'
   ```

   `COMMENT`, not `REQUEST_CHANGES`: a missing assignee is a one-command fix, not a reason to mark a PR as blocked. **Not the `pulls/<pr-number>/comments` endpoint**, which anchors to a file and line: every convention finding is a fact about the PR as a whole and has nowhere in the code to anchor to. Disclaimer and `via` line first per `SKILL.md`, the latter reading: via `pr-flow` review, convention check; its length is set by *Post caps* in the same file, and the failure list is a record row rather than prose, so a long list of failures is not a breach.

   **These are not review findings and get no `RF{n}` id.** They are tracker integrity, they are the orchestrator's own observation rather than the reviewer's, and giving them ids would put them in the same sequence the fix plans and re-review verdicts answer.
5. **Refuse early on a thread the merge gate will refuse on.** The convention table's last row is the cheap, early check for *Resolution rests on recorded authority*; a violation stops this workflow here rather than after a round's worth of work.

## The protocol's steps 1 to 5

### Step 1 - Review

**Which reviewer runs is a per-repo fact.** The default is the `reviewer` agent this plugin ships. Where `.agents/gh-solo.md` carries a `Reviewer agent:` line naming an agent type, per the per-repo config convention in `SKILL.md`, spawn that one instead.

- **The appointed agent inherits the whole contract, not only the spawn.** It gets the PR number and nothing else, and it must return the absolute path of a findings file in the format the `reviewer` skill's *The findings file* defines, plus its report text. Everything downstream reads that file and nothing else, so an agent that answers in prose cannot be posted.
- **Refuse if the appointed agent is not registered.** `⛔ REFUSED - {name} is not a registered agent`. Never fall back to the bundled one: the owner would believe they are reading the findings of the agent they appointed and would be reading ours, which is the exact confusion an appointment exists to prevent, and it would silently invalidate any comparison between reviewers.
- **Read `Reviewer model:` and pass it on the spawn.** Where `.agents/gh-solo.md` carries that line, it names the model this round asks the spawn for; absent it, the spawn asks for nothing and the agent's own frontmatter decides. **Validate the value against the names the spawn parameter accepts, and against the effort the agent's frontmatter pins** - the spawn parameter is the authority on the set of names and the model is the authority on which effort levels it offers, so read both there rather than matching a list written here, which would date the moment model ids move. A named model that does not offer the pinned level is a pair the harness will not honour, and spawning it produces a review whose depth silently differs from the one declared. **Either failure refuses the round**, in the same wording an unregistered agent gets: `⛔ REFUSED - {value} is not a model the spawn accepts`, or `⛔ REFUSED - {value} does not offer the effort the reviewer pins`. Never fall back to the session's model, for the same reason an unregistered agent is never silently replaced by the bundled one: the owner would believe they are comparing rounds run on the model they named.
- **The model is a spawn parameter, not context.** It travels beside the PR number rather than in the prompt, so it takes nothing away from the reviewer fetching its own context.
- **Name which reviewer ran in the round report, and the model the round asked for**, always, including when both are the default. A round's findings mean something different depending on what produced them, and a report that leaves either out cannot be compared with another round's. **The request is not the outcome**: an environment variable may replace the model a spawn asks for, so the report says what was *asked for* and says so, rather than claiming what ran. Whether `CLAUDE_CODE_SUBAGENT_MODEL` in particular outranks a spawn-time request is not documented, so the report does not assert that it does.

**Record the head before the spawn**, because every anchor the reviewer produces belongs to whatever the head is while it reads:

```bash
gh pr view <pr-number> --json headRefOid --jq .headRefOid
```

Keep the value. Step 2 compares it before it builds anything, and that comparison is what tells a stale anchor from a malformed finding. It lives in this session only, which is honest rather than a gap: before the round, and the protocol's steps 1 to 5, are one turn, so a session that dies between the spawn and the post has lost the round regardless.

Spawn it with the PR number and nothing else, beside the model parameter where `Reviewer model:` set one.

#### Where the appointed reviewer is a command

`.agents/gh-solo.md` may instead carry a `Reviewer command:` line, for a capability that is invoked rather than spawned. Run it as written, substituting the PR number for `{pr}`.

**`Reviewer model:` does not apply to this form.** A capability is invoked rather than spawned, so there is no spawn parameter for the key to travel on, and honouring it would mean inventing a mechanism the capability does not have. Where a repository carries both lines, say in the round report that the model key was not applied and why, so it cannot become a silent no-op that the owner reads as a model they chose.

**Never with a flag that makes it post its own findings.** On the bundled `/code-review` that flag is `--comment`, and the whole point of this form is that its findings come back to you and go up through the posting script like every other round's. A capability that posts for itself lands threads with no `RF{n}` id, no disclaimer and no `via` line, which `workflows/merge.md` then reads as the owner's own comments vouching for their own resolution. One writer, one convention: that is what this form preserves.

Build the findings file yourself from what it returned. **Every field *The findings file* in the `reviewer` skill defines is required**, and `scripts/post-review.py` refuses the whole round on a missing one, so the entries below are the ones this path has to decide rather than the whole list. The rest carry over unchanged: `index` runs from 1 upward in the order the capability restated its findings, with no gaps, because the script refuses a non-contiguous sequence; `finding` and `failure_scenario` come from the capability's own text, and where it gave no scenario, say so in that field rather than inventing one; `needs_owner` is `false`, because a capability that cannot report the flag has not claimed a person is needed, and setting it would be the same fiction the severity rules below forbid. The file's own `pass` is `review` and its `axes_run` is `["unrated"]`, which `scripts/test-post-review.sh` already benches as this case.

- **`path` and `line`** from its restated findings. The bundled capability is instructed to restate them in its final reply as `file:line  summary` lines, precisely so they survive a session that does not render tool output.
- **`side` is `RIGHT`.** Prose does not say whether a line was added or deleted, and `RIGHT` is right for either an added or a changed line. A wrong anchor makes the atomic call fail, which refuses the round rather than landing it crooked, so that is the failure to accept rather than guess around.
- **`axis` is `unrated`.** Its findings are not classified on the two axes and must not be sorted onto them by you.
- **`severity` is read out of each finding's own account of what goes wrong**, with `severity_source` set to `derived` and `severity_basis` stating the rule you applied. The script refuses a derived round with no basis, and refuses a basis on a round whose reviewer assigned its own levels. Where a finding's text supports no judgement, its severity is `unrated`.
- **Never claim a level came from the capability.** Its own prompt asks its agent for a severity that its reporting tool has no field for, so a ranking looks like it exists and does not. A level you derived and published as the reviewer's is the one dishonesty this whole path is arranged to prevent.

Everything after this is unchanged: the same script, the same call, the same ids.

**Nothing else means nothing else.** No summary of the diff, no account of what the branch was trying to do, no list of what you think is risky, no reassurance that a hunk is deliberate. It fetches its own context, and evidence chosen by the author of the code is not independent evidence. Handing it your reading of the diff is the one way to spend a subagent and get your own opinion back.

It returns the absolute path of a findings file and its report text. **If the path is missing from its report, the round stops**: re-spawning is cheaper than guessing at a path, and a findings file you cannot read is not a review.

### Step 2 - Post

One call lands every thread and the record Review together, so a half-posted PR cannot happen.

1. **Compare the head against what the reviewer read**, before anything else in this step:

   ```bash
   gh pr view <pr-number> --json headRefOid --jq .headRefOid
   ```

   A value different from the one Step 1 recorded means the diff moved while the reviewer was reading, so its `path`, `line` and `side` may name lines that no longer exist. **Refuse, and never attempt the post:** `⛔ REFUSED - the head moved from {old} to {new} while the reviewer was reading`, naming a re-spawn against the new head as what resumes. The post cannot succeed for any finding anchored to a changed region, and it fails atomically, so attempting it destroys the whole round rather than the affected finding. It goes first because every request below it is wasted on a head that has moved.
2. **Find the highest `RF{n}` already on the PR**, since ids never restart:

   ```bash
   gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/comments" > <listing-file>
   python3 <skill-dir>/scripts/post-review.py highest-id --comments <listing-file>
   ```

   **Every id this flow issues is on a thread, which is why the comments endpoint is the whole answer.** A finding that could not be anchored is never given an id, per Step 5, precisely so that no id exists anywhere this read cannot see it.

   **The number comes from the script rather than from a `--jq` filter on the `gh` call**, for the reason the unattended-command bullet in `SKILL.md` states about an aggregate over a paginated result. Getting it wrong here reissues an id that already exists, which breaks *Ids never restart* in `references/review-protocol.md` permanently; it prints `0` when no round has posted yet. The listing is the same read step 6 makes, and **`--slurp` must not be added to it** - the script refuses that shape rather than finding no ids in it and answering `0`, which is indistinguishable from a first round.
3. **Write the disclaimer line to a file**, its wording per the AI-disclaimer bullet in `SKILL.md`. The script refuses a line that does not open with `> 🤖`.
4. **Build and validate the payload:**

   ```bash
   python3 <skill-dir>/scripts/post-review.py build --findings <findings-file> --disclaimer-file <disclaimer-file> --continue-from <highest-id> --out <payload-file>
   ```

   It assigns the ids, applies every header, and refuses the whole round on any invalid finding rather than emitting a partial payload. **A refusal here is not something to work around by posting by hand.** It means the findings file is malformed, and the answer is to re-spawn the reviewer or to say what is wrong and stop.
5. **Post it:**

   ```bash
   gh api "repos/{owner}/{repo}/pulls/<pr-number>/reviews" --input <payload-file>
   ```

   The JSON must travel in a **file**: `-f` cannot express an array, and `echo '{...}' | gh api --input -` sends the same bytes but does not prefix-match this skill's granted `Bash(gh:*)` pattern, so it prompts where the file form runs clean. Keep the payload file outside the working tree - the harness scratchpad - so a copy of it cannot get committed.

   **A `422` reading `Line could not be resolved` means an anchor that will not resolve, and item 1 has already excluded a moved head.** Two causes remain. On the appointed-command path `side` is guessed as `RIGHT`, per *Where the appointed reviewer is a command*, and a wrong guess fails the call; a re-spawn repeats the same guess and fails identically. On the re-review, the anchor may name a line that exists only in the unpushed fix commits, which the pull request's diff does not contain - that one is expected rather than a fault, and Step 5 says where such a finding goes instead. Name the finding that could not be anchored, say which of the two it is, and stop.
6. **Reconcile what landed:**

   ```bash
   gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/comments" > <listing-file>
   python3 <skill-dir>/scripts/post-review.py verify --payload <payload-file> --comments <listing-file>
   ```

   **`--paginate` is not optional.** The endpoint pages at 30 and a plan discussion's threads alone can pass that, so an unpaginated read returns a slice that looks exactly like a failed post. A verify failure is reported, never re-posted over: the threads may already be there.
7. **Post the reviewer's report as a Conversation comment**, `gh pr comment <pr-number> --body-file <scratch>`, disclaimer and `via` line first: via `pr-flow` review, round report. The reviewer's report text goes below it unchanged, and is relayed verbatim, which *Never counted* under *Post caps* in `SKILL.md` excludes - what that cap bounds here is whatever you write around it, and its companion rule forbids re-listing findings that are already threads.

### Step 3 - Plan the fix, in the thread

One reply per finding, on the finding's own comment id from the reconciliation read:

```bash
gh api "repos/{owner}/{repo}/pulls/<pr-number>/comments/<comment-id>/replies" -F body=@<body-file>
```

Disclaimer and `via` line first: via `pr-flow` review, fix plan, within the length *Post caps* in `SKILL.md` sets - and per its companion rule the plan is the change and the files it touches, never why the finding is right, which the finding above it already said. Code in a **plain fence**, never a `suggestion` fence, for the reason the protocol gives; `scripts/post-review.py` enforces that on the findings themselves and cannot see these replies, so here it is yours to hold.

Which findings get no plan and wait for the owner instead, and what their reply says, is the protocol's. A finding the reviewer marked `needs_owner` in the findings file is the first of the two kinds; the second you can only see yourself, while planning.

### Step 4 - Fix, commit, report

**Invoke the `gh-solo:implement` skill at its `fix <pr-number>` entrance** and follow it here, in this session. Entering it by name rather than reading its workflow file directly is what puts the fixes under that skill's own tool grant: step 4 re-runs any `## Verification` gate the fixes could have invalidated, those gates are the repository's own commands, and this file's narrowed `Bash` cannot run them. Reading that skill's fix workflow inline instead leaves the agent prompted mid-way through a block that must run without a human, or - worse and likelier - skipping the re-run, which leaves a box ticked from before the fix.

**Still not a subagent.** That skill's own rule holds: you implemented this branch, so you know why each line is shaped as it is and will not undo something deliberate. Entering the skill is about the tool grant, not about handing the work away.

**Nothing is pushed.** The protocol's step 7 is the round's only push and says why.

### Step 5 - Re-review, scoped

Spawn the reviewer again - **the appointed one, re-read from `Reviewer agent:` exactly as Step 1 reads it, refusing in Step 1's wording if it is not registered.** Falling back to the bundled agent here would mean the first pass ran the owner's reviewer and the second ran ours, which is the substitution Step 1 exists to refuse, and it would be invisible because nothing in the round names the second pass's reviewer. Where the repository appointed a `Reviewer command:` instead, **there is no scoped re-review**: a capability invoked with a PR number has no rescope shape, so skip this step and say in the round report that it was skipped, that the fixes were therefore verified by nobody but their author, and that the next full pass is where they get judged. Pass `rescope <pr-number>` and exactly three things in the prompt: the commit range the fixes landed in, the findings it is answering about with their `RF{n}` ids, and which commit claims which id. **Where `Reviewer model:` set one, the model travels on this spawn too**, as a parameter beside the prompt rather than in it, exactly as in Step 1 - a round whose two passes ran on different models is a round the report describes with one model and cannot be compared with another. **The commits are unpushed, so it reads them with `git` locally** - it cannot see them through `gh pr diff`, and handing it a diff you generated would put your reading of the fixes between it and the code.

Then post what it returns:

- **Each verdict as a reply in its finding's thread**, the same endpoint as step 3, via `pr-flow` review, re-review verdict, under the same post cap.
- **Re-read the head and compare it before building this payload**, exactly as Step 2's first item does. Steps 3 and 4 can run long, and this call is atomic too: one unresolvable anchor takes the whole re-review record down with it.
- **Its own record Review**, because one record per analysis is the standing rule and a re-review is an analysis. Same script, same call as step 2, with the re-review findings file: new defects become new threads with new ids continuing the sequence, and the record indexes its own pass.
- **A new defect on a line only the fix commits contain cannot be posted this round, and it gets no `RF{n}`.** The fixes are unpushed by design, so that line is not in the pull request's diff, GitHub cannot resolve an anchor to it, and the call is atomic, so attempting it would take the verdicts for every closed finding down with it. **Leave it out of the findings file entirely** and put it in the round report instead, with its `file:line` and what goes wrong, under a heading that says it has no thread.

  **Withholding the id is the point rather than an omission.** An id assigned here could not be posted anywhere: `scripts/post-review.py` composes the record Review from the findings list alone and has no free-text field, every entry in that list becomes an inline comment, and posting by hand is forbidden. So the id would exist only in a report, the next round's highest-id read would not see it, and the id would be reissued to a different finding - which breaks *Ids never restart* in `references/review-protocol.md` permanently, in exchange for nothing.

  **The owner is the route.** They read the finding in the round report at the protocol's step 6, and after the push at step 7 the line is ordinary: the next full pass anchors it without special handling, or they raise it themselves. **This is a known limitation rather than a design**, tracked as issue #8 on this plugin's own repository, whose fix needs the posting script to grow a way to carry a finding that has no anchor yet. Say so in the report rather than implying the finding is handled.
- **Re-read the highest `RF{n}` before building this payload** rather than reusing step 2's number, which was read before step 2 posted and is now stale by the size of the round.

The caps on both loops are the protocol's, and they are the only thing that ends this block short of the owner.

## Stop at the owner

Open with the verdict line: `✅ ALL PASS` when the reviewer found nothing and the conventions were clean, `⚠️ PASSED WITH FINDINGS - {count} posted, {count} fixed locally` otherwise.

Then the round report: which reviewer ran, the model the round asked the spawn for, and that an environment variable may have replaced it so the figure is a request rather than an outcome, the finding count by severity and axis, which ids were fixed and by which commit subject, which are waiting on the owner and why, what the re-review would not certify as closed, which `## Verification` gates were re-run, and that **every commit is local and unpushed**.

Then what the pass cost: its token count, its tool-call count and its wall clock, **as the spawn reported them**. The reviewer cannot measure its own token use, so these are the orchestrator's to read off what the spawn returned and never the reviewer's to supply. Where the spawn reports a figure, print it; where it does not, print that it was not reported rather than an estimate - a number nobody measured is worse here than a gap, because comparing rounds is what these figures exist for.

Then the owner's next move, which is the whole of what they have to do:

```
Read the threads on the PR, then react or reply:
  👍 or ❤️ accepts a finding. To question one, react 👀 or reply in the thread.
When you are through them, say "resolve all and push".
To get each reply answered as you post it instead, before you start run:
/gh-solo:pr-flow watch <pr-number>
```

Print it with the actual PR number substituted. Say it every time: it costs five lines and it is the only thing standing between a thoughtful reply on GitHub and nobody ever reading it. Naming `watch` here is a mention, not an arming - per `workflows/discuss.md`, only the owner typing that command starts a poll. The full vocabulary is the protocol's; what gets printed is the part they need at this moment.

---

## Convention checks

The reference table for the preliminaries, kept out of the flow because it is looked up rather than read through. Not code quality - tracker integrity. Run these even when the reviewer finds nothing.

| Check | Rule |
|---|---|
| **PR body** | Contains `Closes #{issue-number}` for the issue the branch belongs to |
| **PR title** | `{type}({scope}): {issue title}` - the `{type}` matching the branch's, the `{scope}` being the issue's layer label, omitted when it repeats the type. It becomes the squash commit's subject on `main`, so a title without the prefix or with an invented scope puts a non-conventional commit in the history - see `workflows/merge.md` |
| **Verification present** | The body has a `## Verification` section with at least one checkbox. It is a required plan section and `workflows/ready.md` reads it; a PR without it reached review with no stated gates |
| **Plan overview capped** | `## Plan overview` is five sentences or bullets at most, and links the plan file rather than naming it in backticks. Count them; mechanical, not a judgement |
| **Posts capped** | Every post on the PR carrying a `via` line is within the length *Post caps* in `SKILL.md` sets, applying *Never capped* and *Never counted* beneath it. Count them; mechanical, not a judgement. **This audits the previous round, never this one** - a round cannot check posts it has not made yet, so a breach surfaces one round late |
| **Posts do not restate** | No such post restates what the reader is already looking at, per the companion rule in *Post caps*. **A judgement rather than a count**: a fix plan re-arguing its own finding is inside the sentence cap and still a breach, so counting cannot find it. Same one-round latency |
| **Assignee** | `@me` is set. GitHub does not do this at creation |
| **Branch name** | `{type}/GHI-{issue-number}_{slug}`, per *Quick reference* in the `tracker` standards |
| **Commit headers** | `{type}: {description} (#{issue-number})`, no scope, same source |
| **No labels, no milestone** | The PR carries neither - both live on the issue only, per *Labels* in the `tracker` standards, and the `Closes` line is the join. A milestoned PR also corrupts the milestone's progress count |
| **Not a draft** | If it is still a draft it should not have reached this workflow; say so rather than reviewing it |
| **Every resolved thread has recorded owner authority** | An owner reply in the thread, an owner reaction on it, or an authorisation comment naming its `RF{n}` id. One GraphQL read, the same query `workflows/discuss.md` Step 1 uses. A violation is a hard error per *Resolution rests on recorded authority* in `references/review-protocol.md`, and this is the earliest, cheapest place to catch what `workflows/merge.md` will refuse on at the door |

`Closes #{issue-number}` and the assignee are the two that matter most, because nothing else enforces either and a PR missing one quietly breaks the tracker: the issue stays open after the code lands, or the in-progress view stops being true.

---

## Rules

- **Never read the diff and never review.** The emptiness test is `changedFiles`, the analysis is the reviewer subagent's, and the judgement is the owner's.
- **The reviewer is spawned with a PR number and nothing else**, or on the re-review with a commit range, the findings and the id-to-commit map. Never with your reading of the diff.
- **Never post a round at a head the reviewer did not read.** Step 1 records the head, Step 2's first item compares it, and a difference is a refusal rather than an attempt: the call is atomic, so one stale anchor costs the whole round.
- **Never post a finding by hand.** `scripts/post-review.py` builds every payload, and a refusal from it is a stop rather than an obstacle.
- **Never post threads one at a time.** One call carries every thread and the record Review, so either the whole round is on the PR or none of it is.
- **Never read a REST list without `--paginate`**, which makes a successful round look failed and a failed one look partial.
- **Never push.** Steps 1 to 5 write commits and leave them local; the protocol's step 7 is the round's only push.
- **Never filter on `reviewDecision`.** Whether a round already ran comes from what is posted on the PR, told apart by the `via` line rather than by the disclaimer, which every agent post carries.
- **One record Review per analysis, and it is an index.** Never restate a finding in it, never one Review per finding, and post it even at zero findings - it is the evidence `workflows/merge.md` gates on.
- **Never end without printing the owner's next move.**
