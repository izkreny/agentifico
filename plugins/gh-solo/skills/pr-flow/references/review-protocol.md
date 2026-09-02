# Review round protocol

**This file is the authority on the round: where a workflow disagrees with it, the workflow is wrong.** It owns the sequence; each workflow keeps only its own mechanics and points here. It exists because a round on a real PR went wrong with every rule obeyed - fixes were pushed while the owner was mid-read, and the threads went outdated under them - so the sequence has to live in one place or it drifts.

## The cast

A **round** is one pass of review-then-judgement; there may be several.

Each cell below states its own rule, prohibitions included, so a row read out of its column still says what it means.

| Who                  | Does                                                                                                      | Never                                                                                                  |
|----------------------|-----------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| **The owner**        | Judges the findings, authorises the resolve and the push, reads the code last                             | Is never required to act before step 6                                                                 |
| **The orchestrator** | Plans, implements, posts every comment, plans the fixes, fixes, replies, resolves, pushes                 | Never reviews its own diff, never alters a finding's text, never pushes before the owner authorises it |
| **The reviewer**     | Reads what its entrance gives it - the reviewer skill's own fetch list says which - and produces findings | **Never suggests a fix**, never writes anything to the PR, never touches the working tree              |
| **A mentor**         | Comments as a third party                                                                                 | Never holds authority, is never answered, never counts toward any gate                                 |

**Only the owner is answered, and only the owner's input authorises anything.** A mentor's comment, reaction or review is read and named in the round report, and then left alone: never answered in the thread, never treated as an order, never counted as the reply or the reaction a resolve rests on. This is not about whose advice is worth more. It is that authority here belongs to one person, and an agent that answers everyone turns a third party's opinion into work the owner never asked for, in their own repository, under their own login. Where a mentor's point deserves an answer, the owner gives it.

**The orchestrator implements and also fixes.** That is deliberate: it already knows why each line is shaped as it is, so it will not undo something intentional the way a cold agent does. What it must never do is review its own work, which is why the reviewer is a separate agent with its own context.

**The reviewer is a pure function: a PR number in, one findings file out.** It is forbidden to write to the PR - a rule rather than a wall, because its `gh` grant cannot express read-only - and it has no knowledge of the conventions below - not the disclaimer, not the `via` line, not `RF` ids. It fetches its own context rather than being handed a summary, because evidence chosen by the author of the code is not independent evidence. **What it fetches depends on which entrance it came in by**, and the reviewer skill has one workflow file per entrance owning that list; a second copy here would drift from it.

**A repository may appoint its own reviewer, and one form of appointment is invoked rather than spawned.** What holds across every form is the shape of the seam: the findings reach the orchestrator and the orchestrator posts them, so there is one writer and one set of conventions however the reading was done. `workflows/review.md` owns each form and the file's shape.

## The finding key

- **`RF{n}` ids are assigned by the orchestrator**, not the reviewer, which emits its own local index and nothing else. Continuing an id sequence needs the PR's existing threads, and that is state the reviewer needs for nothing else.
- **Ids never restart for the life of the PR.** Before numbering, read the existing threads for the highest `RF{n}` already posted and continue from it. `RF3` must mean one thing on this PR forever, including in the fix-plan and fix-result replies that reuse it.
- **Severity is `high`, `medium` or `low`, assigned by the reviewer**, and rendered with its emoji when posted: 🔴 high, 🟡 medium, 🔵 low. It is assigned rather than mapped: the reviewer's brief states the scale, so nothing has to translate one vocabulary into another.
- **A reviewer that supplies no level is a real case, and it has exactly one honest answer.** Where a repository appoints a reviewer that cannot assign one, the orchestrator reads a level out of each finding's own account of what goes wrong, and **the record Review states the basis it used**. The value `unrated` carries a finding whose text supports no judgement at all. What is forbidden is a level whose source is not stated: a derived level published as though the reviewer gave it is the one failure this rule exists to prevent, and the posting script refuses a round that claims a derivation it did not make, or makes one it does not state.
- **Every finding carries a failure scenario**: concrete inputs or state, then the wrong output. This is what makes a finding falsifiable, and it is what the orchestrator checks before it changes any code.
- **No finding says how to fix itself.** The reviewer is forbidden from suggesting a fix, because a suggested fix anchors the fixer, who knows the code better than the reviewer does. What closes a finding is decided at step 3 and stated there.
- **Every agent post opens with the AI disclaimer and its `via` line**, per the standing conventions in `SKILL.md`. The header is the orchestrator's to apply, always - it is one convention with one owner, and a second copy of it inside the reviewer would drift.
- **Owner-posted findings carry none of this.** When the owner or a mentor raises something themselves, it enters at step 6 as an ordinary comment; ids and severities are mandatory for agent posts only.

## The steps

Steps 1 to 5 run unattended, in one block. The owner's first involvement is step 6.

### 1. Review

The reviewer is spawned with the PR number and nothing else in its prompt, and returns its findings file plus the text of the round's report. It posts nothing. Where a repository names a model, that travels as a spawn parameter rather than as prompt content, so the prompt still carries the number alone.

### 2. Post

The orchestrator wraps each finding in the header and lands every thread *and* the record Review in **one** call to the reviews endpoint, then posts the reviewer's report as a Conversation comment - the same surface, and for the same reason, as the implementation record in the `implement` skill: it expects no answer, and it opens with the disclaimer, which is what keeps every later round's read from taking it for the owner speaking. One call, so a half-posted PR cannot happen: either the whole round is on the PR or none of it is. The finding text below the header is verbatim; only the header is generated. `workflows/review.md` owns the call and the script that builds and validates it.

### 3. Plan the fix, in the thread

One reply per finding saying what change would close it, with code in a plain fence.

- **Never a `suggestion` fence.** GitHub renders those with a button that commits straight to the branch, which bypasses the local commit and breaks the push-hold in one click. It is exactly what suggests itself when the instruction is "post the fix with code", which is why the rule is stated at the point of temptation and enforced by the script at step 2.
- **Two kinds of finding get no fix plan and wait for the owner instead:** one the reviewer flagged as needing their judgement, and one whose fix would change scope - new user-visible behaviour, a different interface, work the issue never asked for. The first is a property of the finding and only the reviewer can see it; the second is a property of the fix and only the orchestrator can. Each gets a reply naming which it is and why, and nothing else happens to it.

### 4. Fix, commit, report

The fixes land as commits grouped by coherent change, each naming the `RF{n}` ids it closes, and **nothing is pushed** - step 7 is the round's only push, and says why. Then one reply per thread: the commit subject, the id, and **whether the fix departed from the step 3 plan and why**.

- **Steps 3 and 4 are two posts and are never merged into one**, even though nothing reads them in between. The gap between the plan and the result is the only place a departure from the plan is visible; combined, it has nowhere to show.
- **The fix workflow's carve-out applies to every fix in this block**: a fix the owner might independently reject gets its own commit. There it is the exception; here it is the rule, because nothing in this block has been judged yet.
- Any gate in `## Verification` the fixes could have invalidated is re-run and re-ticked by whoever ran it, per the standing convention in `SKILL.md`.
- **A fix that changes what the `## Plan overview` describes brings the overview up to date in the same round.** The overview summarises what the branch does, so a fix that adds or removes a behaviour makes it wrong - and wherever the repository sets `squash_merge_commit_message` to `PR_BODY`, per *Repository settings this assumes* in `workflows/merge.md`, that text becomes the squash commit message on `main` and can never be corrected afterwards. So this is not a stale document, it is a permanently wrong commit message. The edit is a body edit, read-modify-write per the body-edit convention in `SKILL.md`, never a commit, and it stays inside the overview's cap in *Convention checks*. Name it in the round report next to the fix commits.
- The mechanics are the `implement` skill's fix workflow, run by the orchestrator rather than handed to anyone.

### 5. Re-review, scoped

The reviewer is spawned again with the fix commit *range*, the findings list, and which commit claims which id. A range rather than a diff on purpose: it reads the commits itself, so nothing the author produced sits between it and the code. It answers two questions and no others: for each finding claimed closed, does this diff close it; and did any fix introduce a new defect. It returns verdicts to the orchestrator, which posts them into the threads.

- **This closes a real hole:** the fixes were made by the author of the code under review, unsupervised, and nothing else checks that a fix actually closed its finding. A guard added on the wrong branch leaves every gate green and a thread asserting a closure that never happened.
- **Nothing else is in scope**, and what the scope excludes is owned by `plugins/gh-solo/skills/reviewer/workflows/rescope.md`, under *You answer exactly two questions, and no others*. A full second review is where iteration counts explode, because each pass finds fresh nitpicks on code nobody asked about.
- **A new defect gets its own record, and the first index is left alone.** One record Review per analysis is the standing rule and the re-review is an analysis, so it posts its own, indexing its own pass and the new `RF{n}` ids in it. Nothing goes stale, because no index ever claimed to cover a pass that had not happened when it was written, and no submitted record is rewritten to make it true.
- **A new defect in a file the unpushed fixes touch is *held*: it gets its `RF{n}` now and its thread after the push.** The fixes are unpushed at step 5, so GitHub cannot resolve an anchor to a line only they carry, and the posting call is atomic - one bad anchor would take the whole record down, verdicts included. **The unit is the file rather than the line**, because a line number counted at local `HEAD` does not survive the pushed head: an unpushed commit inserting lines anywhere above a finding shifts it even when the finding sits outside every hunk, so the file is the unit with no such gap. So `build` keeps it out of the `comments` array and writes it whole into the record Review's own ledger instead, which reserves the id where the next round's highest-id read can see it and keeps *Ids never restart* intact. Step 7's push makes the line ordinary and `release` then posts the thread under that same id, so every finding of every round ends as a thread the merge gate audits. **The round report must say which findings were threaded and which are held**, or a reader takes the second for an absence of findings.
- **Both loops are capped, because no owner is watching.** A finding the re-review says is not closed gets **one** further plan-and-fix attempt; a second failure sends the thread to the owner instead, since two failures mean the finding is not understood and a third machine attempt costs more than reading it. A new defect the re-review raises gets a fix plan and a fix, and that fix is re-reviewed once, never recursively.

### 6. The owner judges

The first step that waits for anything. They answer per thread, and the vocabulary is below.

### 7. Resolve and push, on the owner's word

The batch is one word or sentence from the owner - `rnp`, or "resolve all and push", whose order is also the order this step runs in:

- **First the authorisation comment**, before any thread is resolved.
- **Then the resolves.** To resolve a thread is to mark it Resolved on GitHub: the state change that collapses it and takes it off the open list.
- **Then the push**, with `gh pr checks` read before it is reported done, per the standing convention in `SKILL.md`.

**Resolving every inline comment thread is a merge requirement, not a push requirement.** Nothing mechanically stops a branch being pushed with threads still open, and step 4's fix commits could have gone up at any point - they are held back to protect the owner's reading, which has nothing to do with resolution. What requires every thread resolved is *Resolution rests on recorded authority*, enforced at `workflows/merge.md`'s door. So the resolve here closes out the round; it does not unlock anything.

**Resolving an inline comment thread posts nothing**, which is why the authorisation comment exists: the resolve leaves no trace of whose decision it was, so without that comment a later reader, `workflows/merge.md` included, sees a closed thread and no evidence behind it.

**A red check after the push reopens nothing.** Each finding is closed on its own evidence - the fix, the re-review's verdict, and the owner's word - none of which a CI failure contradicts. A red check against locally green gates is the two-environments finding per the standing convention in `SKILL.md`: it stops the merge until it is diagnosed, and what answers it is a new commit rather than a reopened thread.

**The authorisation comment** carries a literal marker line a later reader can grep for, the owner's words, and every `RF{n}` id it covers.

- **Grep-able rather than inferred**, because it is an agent post and so opens with the disclaimer: nothing that recognises the owner by the *absence* of a disclaimer can find it, which is every reader that matters here.
- **Id-naming**, because an authorisation covering `RF1` to `RF7` must not silently authorise resolving an `RF9` that was posted afterwards.
- **What the batch covers:** every thread with no outstanding owner signal. That is the whole point of it - a thread the owner already approved was resolvable on its own, so an authorisation covering only those would do nothing.
- **What it never covers:** a thread waiting on the owner from step 3, and a thread whose last signal from them is still unanswered - a reply not yet replied to, or a question not yet explained. An **answered** question is no longer outstanding and the batch does cover it, which is what stops one question from parking a thread forever.

**This is the round's only push, and no words ask for an earlier one.** A push moves the diff, and GitHub recomputes every thread anchor the moment it lands, marking threads outdated beneath a reader part-way through. Holding the push is what keeps the threads anchored to the exact diff the owner is reading.

**The push is also what releases the findings step 5 held.** Their lines become part of the pull request's diff the moment it lands, so `release` posts each as a thread under the id it already reserved. Those threads land unresolved, because this authorisation named the ids it covered and these were not among them - the owner has not read them yet, and step 8 refuses on an unresolved thread, so step 7's report has to say how many are waiting.

Nothing is lost by waiting, because everything the owner judges on is on the PR already: the fix plan carries the intended change as code, the fix result names the commit that landed and any departure from that plan, and the commits themselves are local in the repository they already have. The owner asking for an earlier push changes who is to blame rather than what happens to the threads. Another review round is not a reason for one either: that is step 5, and a defect a fix introduced gets its own thread at step 3.

### 8. Merge

`workflows/merge.md`, whose thread gate is *Resolution rests on recorded authority*.

## The owner's vocabulary

How they answer a thread at step 6. **Approval may be a word or a reaction; refusal must always be written.**

| What they do                                                | What it means                                                                                                                                                                                                                                      |
|-------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Say "OK", "good", "cool" in the session, naming the finding | Accepted. A bare word naming nothing is not a signal on any thread                                                                                                                                                                                 |
| React 👍 `THUMBS_UP` or ❤️ `HEART`                           | Accepted. Exact synonyms of each other and of the words above                                                                                                                                                                                      |
| React 👀 `EYES` or 😕 `CONFUSED`, or write "explain" or "?!?" | One canned question, answered in the thread: *"I do not understand. Explain to me like a non-technical person, but use real code names."* The reaction and the word mean exactly the same thing, so neither gets a different answer from the other |
| Write a reply                                               | A discussion. `workflows/discuss.md` classifies and answers it                                                                                                                                                                                     |
| Nothing, or any other reaction                              | No signal. Step 7's batch covers it                                                                                                                                                                                                                |

- **Every other reaction is no signal, not an unknown to stop and ask about.** 👎 included: it is not a refusal, because a refusal is always written.
- **Which comment carries the reaction decides what it refers to**, since a thread holds the finding, the fix plan and the fix result. A question on the finding asks about the finding; on the fix plan, about the plan; on the fix result, about what changed.
- **Only the owner's reactions count**, so a reaction is judged by who left it, never by the comment it sits on. Every agent post is made with the owner's credentials and so carries their login, which means no test on a *comment's* author can tell agent from human, and a mentor's 👍 is not an authorisation. `workflows/discuss.md` owns how they are read.

## The conclusions

### Resolution rests on recorded authority

Every thread ends resolved, and every resolution rests on recorded owner authority, in one of these forms and no other: a reply of theirs in the thread, a reaction of theirs on it, or an authorisation comment naming its `RF{n}` id. Resolving is the orchestrator's act, but the authority for it is never inferred and never lives only in a session - a session dies and `workflows/merge.md` still has to be able to check. Enforcement: `workflows/review.md` checks it early and cheap; `workflows/merge.md` refuses at the door on an unresolved thread, or on a resolved one carrying none of those forms, naming its `file:line`.

#### Recognising the owner takes both conditions

Both must hold: the author's login **is** the repository owner's, and the body does **not** open with the AI disclaimer. The first excludes everyone else, the second excludes this plugin's own posts, which carry the owner's login because they are made with their credentials.

**The disclaimer alone is not enough:** a mentor's comment carries none either, so the login is what excludes them.

### The watch survives the round

It watches reactions as well as words, because approval can be a reaction and a watch polling only comments would leave the owner reacting into silence. It stops at step 7 or on `unwatch`, and nowhere else, since step 7 is the only path out of step 6 - so the owner can react and be answered as they go rather than serialising the round.

The `auto` and `go` chains arm it themselves on reaching step 6. That is an instance of the only-the-literal-command rule in `workflows/discuss.md` rather than an exception to it: those are literal commands, and their premise is authorisation given in advance. That workflow owns the mechanics and the cost.

### The unattended block is bounded only by its caps

Nothing in steps 1 to 5 waits for a human, so every stop in that block has to be written down: there is nobody there to apply judgement the rules forgot to ask for. That binds anything added to it later.
