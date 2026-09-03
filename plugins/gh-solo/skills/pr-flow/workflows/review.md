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

| What is already there                                                           | What it means                                                                                                       |
|---------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| Convention findings from an earlier run, via `pr-flow` review, convention check | Already reported. Do not post them again, even where the check still fails                                          |
| A record Review from an earlier round                                           | A round already ran. On a named-PR run this is a further round, which the protocol allows; the ids continue from it |
| A comment in the owner's own voice, no disclaimer                               | A note they wrote themselves. Never restate it as a finding                                                         |
| A mentor or other reviewer                                                      | Advice the owner may have weighed and declined. Never re-raise it, and name it in the round report as unanswered    |

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

- **The appointed agent inherits the whole contract, not only the spawn.** It gets the PR number and the pin, and nothing else, and it must return the absolute path of a findings file in the format the `reviewer` skill's *The findings file* defines, plus its report text. Everything downstream reads that file and nothing else, so an agent that answers in prose cannot be posted.
- **Refuse if the appointed agent is not registered.** `⛔ REFUSED - {name} is not a registered agent`. Never fall back to the bundled one: the owner would believe they are reading the findings of the agent they appointed and would be reading ours, which is the exact confusion an appointment exists to prevent, and it would silently invalidate any comparison between reviewers.
- **Read `Reviewer model:` and pass it on the spawn.** Where `.agents/gh-solo.md` carries that line, it names the model this round asks the spawn for; absent it, the spawn asks for nothing and the agent's own frontmatter decides. **Validate the value against the names the spawn parameter accepts, and against the effort the agent's frontmatter pins** - the spawn parameter is the authority on the set of names and the model is the authority on which effort levels it offers, so read both there rather than matching a list written here, which would date the moment model ids move. A named model that does not offer the pinned level is a pair the harness will not honour, and spawning it produces a review whose depth silently differs from the one declared. **Either failure refuses the round**, in the same wording an unregistered agent gets: `⛔ REFUSED - {value} is not a model the spawn accepts`, or `⛔ REFUSED - {value} does not offer the effort the reviewer pins`. Never fall back to the session's model, for the same reason an unregistered agent is never silently replaced by the bundled one: the owner would believe they are comparing rounds run on the model they named.
- **The model is a spawn parameter, not context.** It travels beside the PR number rather than in the prompt, so it takes nothing away from the reviewer fetching its own context.
- **Name which reviewer ran in the round report, and the model the round asked for**, always, including when both are the default. A round's findings mean something different depending on what produced them, and a report that leaves either out cannot be compared with another round's. **The request is not the outcome**: an environment variable may replace the model a spawn asks for, so the report says what was *asked for* and says so, rather than claiming what ran. Whether `CLAUDE_CODE_SUBAGENT_MODEL` in particular outranks a spawn-time request is not documented, so the report does not assert that it does.

**Read the head before the spawn and hand it over as the scope**, because every anchor the reviewer produces belongs to the version it read, and the only way to know that version rather than trust a claim about it is to name it yourself:

```bash
git fetch <remote> <branch> --quiet
git rev-parse FETCH_HEAD
```

**Not `gh pr view --json headRefOid`.** That read was seen answering with a pre-push sha seconds after a push while `git` on the remote ref already had the new one, so it can hand you a head the branch has already left - and a stale value here pins the reviewer to a version nobody is reviewing. Two `git` commands rather than `git ls-remote`, whose `sha<TAB>ref` output cannot be reduced to a value by anything the unattended-command bullet in `SKILL.md` admits.

Keep the value. It is the pin: Step 2 passes it to the script, which compares it both against what the reviewer reports reading and against the head the ref holds by then. It lives in this session only, which is honest rather than a gap: before the round, and the protocol's steps 1 to 5, are one turn, so a session that dies between the spawn and the post has lost the round regardless.

Spawn it with the PR number and the pin, and nothing else, beside the model parameter where `Reviewer model:` set one.

**The pin is admissible in the prompt where an account of the diff is not**, and the distinction is already this plugin's: `../../agents/reviewer.md` sanctions the `rescope` prompt carrying a commit range because "each is an address rather than an account". A sha is an address by the same test - it says where to look and claims nothing about what is there - so it takes nothing away from the reviewer fetching its own context, which is what "nothing else" exists to protect.

#### Where the appointed reviewer is a command

`.agents/gh-solo.md` may instead carry a `Reviewer command:` line, for a capability that is invoked rather than spawned. Run it as written, substituting the PR number for `{pr}`.

**The pin still travels, and this form cannot corroborate it.** Substitute it wherever the command takes a revision, and where it takes none, invoke it as written and accept that it reads whatever the pull request holds. Either way you pass the pin to `build` as `--pinned-head` and the findings file you write by hand carries no `head`, because a capability invoked with a PR number cannot report what it read and a value you supplied is not a report. **Say in the round report that the pin was not corroborated**, so a round on this path cannot be read afterwards as one where the reviewer confirmed what it read; the record Review says the same, since `record_body` reads the absence of `head` rather than being told.

**`Reviewer model:` does not apply to this form.** A capability is invoked rather than spawned, so there is no spawn parameter for the key to travel on, and honouring it would mean inventing a mechanism the capability does not have. Where a repository carries both lines, say in the round report that the model key was not applied and why, so it cannot become a silent no-op that the owner reads as a model they chose.

**Never with a flag that makes it post its own findings.** On the bundled `/code-review` that flag is `--comment`, and the whole point of this form is that its findings come back to you and go up through the posting script like every other round's. A capability that posts for itself lands threads with no `RF{n}` id, no disclaimer and no `via` line, which `workflows/merge.md` then reads as the owner's own comments vouching for their own resolution. One writer, one convention: that is what this form preserves.

Build the findings file yourself from what it returned. **Every field *The findings file* in the `reviewer` skill defines is required**, and `scripts/post-review.py` refuses the whole round on a missing one, so the entries below are the ones this path has to decide rather than the whole list. The rest carry over unchanged: `index` runs from 1 upward in the order the capability restated its findings, with no gaps, because the script refuses a non-contiguous sequence; `finding` and `failure_scenario` come from the capability's own text, and where it gave no scenario, say so in that field rather than inventing one; `needs_owner` is `false`, because a capability that cannot report the flag has not claimed a person is needed, and setting it would be the same fiction the severity rules below forbid. The file's own `pass` is `review` and its `axes_run` is `["unrated"]`, which `scripts/test-post-review.sh` already benches as this case. **`head` is absent**, per the pin paragraph above.

- **`path` and `line`** from its restated findings. The bundled capability is instructed to restate them in its final reply as `file:line  summary` lines, precisely so they survive a session that does not render tool output.
- **`side` is `RIGHT`.** Prose does not say whether a line was added or deleted, and `RIGHT` is right for either an added or a changed line. A wrong anchor makes the atomic call fail, which refuses the round rather than landing it crooked, so that is the failure to accept rather than guess around.
- **`axis` is `unrated`.** Its findings are not classified on the two axes and must not be sorted onto them by you.
- **`severity` is read out of each finding's own account of what goes wrong**, with `severity_source` set to `derived` and `severity_basis` stating the rule you applied. The script refuses a derived round with no basis, and refuses a basis on a round whose reviewer assigned its own levels. Where a finding's text supports no judgement, its severity is `unrated`.
- **Never claim a level came from the capability.** Its own prompt asks its agent for a severity that its reporting tool has no field for, so a ranking looks like it exists and does not. A level you derived and published as the reviewer's is the one dishonesty this whole path is arranged to prevent.

Everything after this is unchanged: the same script, the same call, the same ids.

**Nothing else means nothing else.** No summary of the diff, no account of what the branch was trying to do, no list of what you think is risky, no reassurance that a hunk is deliberate. The pin is not an exception to this, because it is not in this class at all: every item here is a claim about what the diff contains, and a sha is a claim about nothing. It fetches its own context, and evidence chosen by the author of the code is not independent evidence. Handing it your reading of the diff is the one way to spend a subagent and get your own opinion back.

It returns the absolute path of a findings file and its report text. **If the path is missing from its report, the round stops**: re-spawning is cheaper than guessing at a path, and a findings file you cannot read is not a review.

### Step 2 - Post

One call lands every thread and the record Review together, so a half-posted PR cannot happen.

1. **Read the head the ref holds now**, the same way Step 1 read the pin and never through `gh pr view`, for the lag reason stated there:

   ```bash
   git fetch <remote> <branch> --quiet
   git rev-parse FETCH_HEAD
   ```

   **You do not compare it here.** It travels to `build` as `--head-now` beside the pin as `--pinned-head`, and the script makes both comparisons and owns both refusals - the reviewer's reported head against the pin, meaning the pass judged something other than what it was told to, and the pin against this value, meaning the branch moved and GitHub would resolve these anchors against content the pass never read. Either way the post is never attempted: it fails atomically, so one stale anchor destroys the whole round rather than the affected finding, and a re-spawn against the new head is what resumes.

   **One home for the comparison, deliberately, and it costs two requests.** The reads below now happen before a moved head is caught, where the old check refused first and spent nothing. That is the price of the refusal being benched rather than composed at the keyboard, and a cheap pre-check restored here would be a second place for one rule to live and drift.
2. **Find the highest `RF{n}` already on the PR**, since ids never restart:

   ```bash
   gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/comments" > <listing-file>
   gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/reviews" > <reviews-file>
   python3 <skill-dir>/scripts/post-review.py highest-id --comments <listing-file> --reviews <reviews-file>
   ```

   **An id can live on either of two surfaces, so both are read and neither argument is optional.** A finding whose line only the unpushed fixes carry is held rather than dropped, per Step 5, and its id is reserved in the record Review's body until the push releases it - a surface the comments endpoint does not reach. A read of the threads alone would answer as though that id had never been issued and hand it to a different finding, which is why the script requires `--reviews` instead of defaulting to skipping it.

   **The number comes from the script rather than from a `--jq` filter on the `gh` call**, for the reason the unattended-command bullet in `SKILL.md` states about an aggregate over a paginated result. Getting it wrong here reissues an id that already exists, which breaks *Ids never restart* in `references/review-protocol.md` permanently. `highest-id` prints `0` when no round has posted yet. The listing is the same read step 6 makes, and **`--slurp` must not be added to it** - the script refuses that shape rather than finding no ids in it and answering `0`, which is indistinguishable from a first round.
3. **Write the disclaimer line to a file**, its wording per the AI-disclaimer bullet in `SKILL.md`. The script refuses a line that does not open with `> 🤖`.
4. **Build and validate the payload:**

   ```bash
   python3 <skill-dir>/scripts/post-review.py build --findings <findings-file> \
     --disclaimer-file <disclaimer-file> --continue-from <highest-id> \
     --pinned-head <the pin from Step 1> --head-now <the value item 1 just read> \
     --out <payload-file>
   ```

   **Both head arguments are required here**, exactly as `--unpushed-diff` and `--anchored-at` are required on the re-review's own block in Step 5, and the script refuses a full pass missing either. This block and that required set are read together whenever either moves: `scripts/test-post-review.sh` builds its own argument list rather than reading this file, so nothing else can catch a block that has drifted from the script it invokes.

   It assigns the ids, applies every header, and refuses the whole round on any invalid finding rather than emitting a partial payload. **A refusal here is not something to work around by posting by hand.** It means the findings file is malformed, and the answer is to re-spawn the reviewer or to say what is wrong and stop.
5. **Post it:**

   ```bash
   gh api "repos/{owner}/{repo}/pulls/<pr-number>/reviews" --input <payload-file>
   ```

   The JSON must travel in a **file**: `-f` cannot express an array, and `echo '{...}' | gh api --input -` sends the same bytes but does not prefix-match this skill's granted `Bash(gh:*)` pattern, so it prompts where the file form runs clean. Keep the payload file outside the working tree - the harness scratchpad - so a copy of it cannot get committed.

   **A `422` reading `Line could not be resolved` means an anchor that will not resolve, and item 1 has already excluded a moved head.** One cause remains: on the appointed-command path `side` is guessed as `RIGHT`, per *Where the appointed reviewer is a command*, and a wrong guess fails the call; a re-spawn repeats the same guess and fails identically. A line only the unpushed fix commits carry can no longer reach this call at all - `build` holds every finding in a file those commits touch, per Step 5 - so a `422` here is never that. Name the finding that could not be anchored and stop.
6. **Reconcile what landed:**

   ```bash
   gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/comments" > <listing-file>
   gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/reviews" > <reviews-file>
   python3 <skill-dir>/scripts/post-review.py verify --payload <payload-file> --comments <listing-file> --reviews <reviews-file>
   ```

   **`--reviews` is required here for the reason it is required in item 2**: a held finding is in no `comments` array, so reconciling the payload's threads alone cannot see it, and an id reserved nowhere is one the next round reissues.

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
- **Re-read the head before building this payload**, exactly as Step 2's first item does, and compare it against the pin the full pass used - which this session is holding, and which the pushed head still equals unless somebody else pushed, since this round's own fix commits are deliberately unpushed. Steps 3 and 4 can run long, and this call is atomic too: one unresolvable anchor takes the whole re-review record down with it. A difference is the same refusal Step 2 names, made here by you rather than by the script: this entrance passes `--anchored-at` instead of the pin pair, because its findings are counted against the local commits.
- **Its own record Review**, because one record per analysis is the standing rule and a re-review is an analysis. Same script and same call as step 2, with the re-review findings file, plus the arguments that entrance requires:

  ```bash
  git rev-parse HEAD                              # before the spawn above; keep the value
  git diff @{u}..HEAD -U0 > <unpushed-diff-file>
  python3 <skill-dir>/scripts/post-review.py build --findings <findings-file> --disclaimer-file <disclaimer-file> --continue-from <highest-id> --unpushed-diff <unpushed-diff-file> --anchored-at <the local head> --out <payload-file>
  ```

  **`--unpushed-diff` and `--anchored-at` are both required on a re-review and both refused on a full pass**, so the round cannot post a rescope payload without saying which lines only this machine has and which head those line numbers were counted against. The diff is the round's to produce because the round is the thing holding the fix commits: the reviewer read the fix range and knows nothing about the pushed head. The diff travels as a file, written to the harness scratchpad like every other payload file; the head travels as a value.

  **`--anchored-at` is the *local* head, and never the `headRefOid` Step 1 recorded.** This pass reads the fix commits with `git` while they are unpushed, so every line number it returns counts lines in the file as it stands at local `HEAD`, after those commits. Passing the pushed head instead puts the fix commits themselves inside the shift `release` computes, which moves a held line a second time or drops it as rewritten - the same defect the shift exists to remove, arriving by the argument meant to prevent it. Read it before the spawn, since a commit made afterwards would make it a head the reviewer never saw.
- **A new defect that `build` holds gets its `RF{n}` and no thread, this round.** Every finding in a file the unpushed commits touch is held: the id is assigned from the same sequence, the finding leaves the `comments` array so no unresolvable anchor is ever sent, and the record Review carries it whole in a fenced ledger. **Leave it in the findings file** - holding is the script's decision from the diff, never yours from the findings.

  **Held per file rather than per hunk, deliberately.** A rescope finding's `line` counts lines in the file at local `HEAD`, while GitHub resolves against the pushed head, so an unpushed commit inserting lines above a finding shifts it even when the finding sits outside every hunk. Holding the file is the superset with no such gap.

  **The line is brought forward at release, never replayed.** A held finding's `line` counts lines as they stood at `--anchored-at`, and the round goes on committing after the hold - the protocol's step 5 gives a new defect a fix and one further attempt - so `release` shifts the number through `git diff <that head>..HEAD` before it anchors anything. A line the fixes rewrote cannot be brought forward at all, and that one is reported and skipped rather than posted at a guess.

  **A held finding's fix plan, fix result and verdict go into a follow-up Review, one entry each.** None of them exists when the record Review that holds the finding is posted, and this flow never rewrites a posted Review, so they cannot go in beside it. At the end of the round, write them as a JSON array of `{rf, kind, text}` - `kind` being `plan`, `result` or `verdict` - and post the Review the script builds from it:

  ```bash
  python3 <skill-dir>/scripts/post-review.py followup --entries <entries-file> --disclaimer-file <disclaimer-file> --out <followup-file>
  gh api "repos/{owner}/{repo}/pulls/<pr-number>/reviews" --input <followup-file>
  ```

  **They stay separate rather than folded into the finding's own text**, so the thread `release` opens collects the reply-per-step shape a threaded finding collects: `release` reads this ledger and emits each entry as its own reply for `workflows/resolve.md` to post. A held finding with no follow-up recorded is not an error - its thread simply opens carrying the finding alone, and `release` says which.

  **`rnp` is the route, not the owner and not a later pass.** The protocol's step 7 pushes the fixes, which makes those lines part of the pull request's diff, and then `release` reads the ledger back and posts each held finding as a thread under the id it already holds - `workflows/resolve.md` owns that call. **The round report says which findings were threaded and which are held**, so a reader cannot take the second for an absence of findings.
- **Re-read the highest `RF{n}` before building this payload** rather than reusing step 2's number, which was read before step 2 posted and is now stale by the size of the round. Read both surfaces, exactly as step 2 does: a held id is in the record Review's body and nowhere else.

The caps on both loops are the protocol's, and they are the only thing that ends this block short of the owner.

## Stop at the owner

Open with the verdict line: `✅ ALL PASS` when the reviewer found nothing and the conventions were clean, `⚠️ PASSED WITH FINDINGS - {count} posted, {count} fixed locally` otherwise.

Then the round report: which reviewer ran, the model the round asked the spawn for, and that an environment variable may have replaced it so the figure is a request rather than an outcome, the finding count by severity and axis, which ids were fixed and by which commit subject, which are waiting on the owner and why, which the re-review held for the push rather than threaded, what it would not certify as closed, which `## Verification` gates were re-run, and that **every commit is local and unpushed**.

Then what the pass cost: its token count, its tool-call count and its wall clock, **as the spawn reported them**. The reviewer cannot measure its own token use, so these are the orchestrator's to read off what the spawn returned and never the reviewer's to supply. Where the spawn reports a figure, print it; where it does not, print that it was not reported rather than an estimate - a number nobody measured is worse here than a gap, because comparing rounds is what these figures exist for.

Then the owner's next move, which is the whole of what they have to do:

```
Read the threads on the PR, then react or reply:
  👍 or ❤️ accepts a finding. To question one, react 👀 or reply in the thread.
When you are through them, type rnp - or say "resolve all and push".
To get each reply answered as you post it instead, before you start run:
/gh-solo:pr-flow watch <pr-number>
```

Print it with the actual PR number substituted. Say it every time: it costs five lines and it is the only thing standing between a thoughtful reply on GitHub and nobody ever reading it. Naming `watch` here is a mention, not an arming - per `workflows/watch.md`, only the owner typing that command starts a poll. The full vocabulary is the protocol's; what gets printed is the part they need at this moment.

---

## Convention checks

The reference table for the preliminaries, kept out of the flow because it is looked up rather than read through. Not code quality - tracker integrity. Run these even when the reviewer finds nothing.

| Check                                                  | Rule                                                                                                                                                                                                                                                                                                                                                                                                  |
|--------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **PR body**                                            | Contains `Closes #{issue-number}` for the issue the branch belongs to                                                                                                                                                                                                                                                                                                                                 |
| **PR title**                                           | `{type}({scope}): {issue title}` - the `{type}` matching the branch's, the `{scope}` being the issue's layer label, omitted when it repeats the type. It becomes the squash commit's subject on `main`, so a title without the prefix or with an invented scope puts a non-conventional commit in the history - see `workflows/merge.md`                                                              |
| **Verification present**                               | The body has a `## Verification` section with at least one checkbox. It is a required plan section and `workflows/ready.md` reads it; a PR without it reached review with no stated gates                                                                                                                                                                                                             |
| **Body capped**                                        | Every section *Body caps* in `workflows/open.md` names is within the cap it sets, applying the exclusions it points at and its `## Settled` denial. Count them; mechanical, not a judgement. `## Plan overview` also links the plan file rather than naming it in backticks. **The body exists before the round starts**, so a breach is caught in the round that reads it rather than one round late |
| **Posts capped**                                       | Every post on the PR carrying a `via` line is within the length *Post caps* in `SKILL.md` sets, applying *Never capped* and *Never counted* beneath it. Count them; mechanical, not a judgement. **This audits the previous round, never this one** - a round cannot check posts it has not made yet, so a breach surfaces one round late                                                             |
| **Posts do not restate**                               | No such post restates what the reader is already looking at, per the companion rule in *Post caps*. **A judgement rather than a count**: a fix plan re-arguing its own finding is inside the sentence cap and still a breach, so counting cannot find it. Same one-round latency                                                                                                                      |
| **Assignee**                                           | `@me` is set. GitHub does not do this at creation                                                                                                                                                                                                                                                                                                                                                     |
| **Branch name**                                        | `{type}/GHI-{issue-number}_{slug}`, per *Quick reference* in `../tracker/references/formats.md`                                                                                                                                                                                                                                                                                                       |
| **Commit headers**                                     | `{type}: {description} (#{issue-number})`, no scope, same source                                                                                                                                                                                                                                                                                                                                      |
| **No labels, no milestone**                            | The PR carries neither - both live on the issue only, per *Labels* in `../tracker/references/tracker-fields.md`, and the `Closes` line is the join. A milestoned PR also corrupts the milestone's progress count                                                                                                                                                                                      |
| **Not a draft**                                        | If it is still a draft it should not have reached this workflow; say so rather than reviewing it                                                                                                                                                                                                                                                                                                      |
| **Every resolved thread has recorded owner authority** | An owner reply in the thread, an owner reaction on it, or an authorisation comment naming its `RF{n}` id. One GraphQL read, the same query `workflows/discuss.md` Step 1 uses. A violation is a hard error per *Resolution rests on recorded authority* in `references/review-protocol.md`, and this is the earliest, cheapest place to catch what `workflows/merge.md` will refuse on at the door    |

`Closes #{issue-number}` and the assignee are the two that matter most, because nothing else enforces either and a PR missing one quietly breaks the tracker: the issue stays open after the code lands, or the in-progress view stops being true.

---

## Rules

- **Never read the diff and never review.** The emptiness test is `changedFiles`, the analysis is the reviewer subagent's, and the judgement is the owner's.
- **The reviewer is spawned with a PR number and the pin, and nothing else**, or on the re-review with a commit range, the findings and the id-to-commit map. Never with your reading of the diff: each of those is an address, and an address is what this rule admits.
- **Never post a round at a head the reviewer did not read.** Step 1 pins the head and hands it over, Step 2 passes the pin and the head-now to the script, and the script refuses on either disagreement rather than attempting the post: the call is atomic, so one stale anchor costs the whole round.
- **Never post a finding by hand.** `scripts/post-review.py` builds every payload, and a refusal from it is a stop rather than an obstacle.
- **Never post threads one at a time.** One call carries every thread and the record Review, so either the whole round is on the PR or none of it is.
- **Never read a REST list without `--paginate`**, which makes a successful round look failed and a failed one look partial.
- **Never push.** Steps 1 to 5 write commits and leave them local; the protocol's step 7 is the round's only push.
- **Never filter on `reviewDecision`.** Whether a round already ran comes from what is posted on the PR, told apart by the `via` line rather than by the disclaimer, which every agent post carries.
- **One record Review per analysis, and it is an index.** Never restate a finding in it, never one Review per finding, and post it even at zero findings - it is the evidence `workflows/merge.md` gates on.
- **Never end without printing the owner's next move.**
