> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Record the head the reviewer read

Closes #24. The reviewer reports the head it read in its findings file, and `build` refuses a payload whose reported head disagrees with the head the remote holds when the payload is built. So the value the comparison uses is the reviewer's own observation rather than a sha recorded before it was spawned, and the comparison is a gate in the script rather than a step in prose.

This is the *Report the read* design of the two the issue records, and the bottom branch of the #26 stack.

## Why Report rather than Pin

**The precedent the issue credits to Pin does not exist.** Its body argues that `Reviewer model:` established that a spawn carries parameters beside a prompt still holding the number alone, so passing the recorded sha would reuse a channel that shipped. It would not: the model travels on the spawn's own `model` parameter, and there is no parameter for an arbitrary value. A sha has exactly one route into a subagent, which is the prompt. So Pin does not soften the plugin's most-repeated sentence, it breaks it, at `plugins/gh-solo/skills/pr-flow/README.md`, `plugins/gh-solo/skills/pr-flow/SKILL.md`, `plugins/gh-solo/skills/pr-flow/references/review-protocol.md`, `plugins/gh-solo/skills/pr-flow/workflows/review.md` in three places and `plugins/gh-solo/agents/reviewer.md`.

**Pin also changes how the reviewer reads, not only what it is told.** `plugins/gh-solo/skills/reviewer/workflows/full.md` reads the diff with `gh pr diff <pr-number>`, which takes no sha, so a pinned pass would have to fetch the commit and reconstruct the pull request's diff against its base with `git` - a different read of a different object, on the pass whose independence the whole round rests on.

**And Pin does not remove the comparison it was meant to make unnecessary.** GitHub resolves an anchor against the head the pull request holds when the post lands, so a pinned pass whose head has since moved still has to be refused. Pinning would buy a deterministic reading window and leave the gate exactly where it is.

Report costs one field in the findings file, its validation, and the comparison moving into that validation. The spawn contract is untouched, which is what the issue says it is worth.

## Where the reviewer reads the head, and why before the diff

The reviewer reads `gh pr view <pr-number> --json headRefOid` **immediately before** `gh pr diff <pr-number>`, and reports that value.

**What the reported head names is the whole pull request's diff, not a range.** A full pass reads `gh pr diff <pr-number>`, which is every change the pull request carries against its base, so the head and the object reviewed are one fact stated two ways: that sha is the version of the whole diff the pass read. There is no pinned range and no narrower default to fall back to - the plugin's only other read is the `rescope` pass, which reads a commit range with `git` and reports no head at all. That is worth stating rather than leaving implied, because a reader who assumes the head addresses some subset of the diff would expect a missing head to degrade into reviewing everything, when a missing head refuses the round instead.

The order is the whole safety argument. If a push lands between the two reads, a head read *before* the diff is the older sha, the build-time comparison sees it disagree with the remote and refuses a round that may well have read the new diff - a false refusal, which costs one reviewer pass. A head read *after* the diff is the newer sha, the comparison agrees with the remote, and the round posts anchors counted against a diff that no longer exists - which fails atomically and takes every finding down with it. One order is wrong in the cheap direction and the other in the expensive one.

**The lag the issue observed is harmless on this side and fatal on the other.** `gh pr view --json headRefOid` was seen returning a pre-push sha seconds after a push, while `git` on the remote ref already had the new one. On the reviewer's side that lag is an honest answer, on the assumption - observed of `headRefOid` and not of `gh pr diff`, so assumed rather than established - that the diff it read came from the same lagging view. The ordering argument above holds either way, since it turns on which of the two failures is cheap rather than on the two reads agreeing. On the comparison's side the same lag makes the check pass while the head has moved, which is the second half of the defect the issue records. So the comparison never reads the head through `gh`: it reads the ref itself, which cannot answer from a cache of the pull request.

**It reads it as `git fetch <remote> <branch>` followed by `git rev-parse FETCH_HEAD`, and not as `git ls-remote`.** Both query the ref, but `ls-remote` prints `sha<TAB>ref`, and every way of reducing that to the value `--head-now` wants - `cut`, `awk`, a command substitution - breaks the rule in `plugins/gh-solo/skills/pr-flow/SKILL.md` that every command in an unattended block starts with `gh`, `git` or `python3`. Two bare `git` commands comply and need no new file argument, where an `ls-remote` written to a file would need `build` to parse a line it has no other reason to know about.

## What the refusal says

`build` refuses with both values and both their sources named - the head it compared and where that head came from, against the head the ref itself returned at build time - so a refusal can never be read as the reviewer's window having moved when what moved was something else. Naming the source is what the fallback below makes load-bearing rather than decorative: the two paths refuse for genuinely different reasons, one of them meaning the reviewer's read is stale and the other only that the pull request moved at some point during the round. That is the issue's fourth acceptance criterion, and it lands as a benched string rather than as wording an orchestrator composes.

## The fallback, and why it is the recorded head rather than the current one

**A missing `head` falls back to the head recorded before the spawn, which is what Step 1 of `plugins/gh-solo/skills/pr-flow/workflows/review.md` already reads today.** So a reviewer that reports one gets the fix, and one that does not keeps exactly the check that ships now - `#15`'s comparison, correct for every push landing after the reviewer has read, which is the common case.

**Falling back to the build-time head instead would be worse than shipping nothing.** That value is the one `--head-now` already holds, so the comparison would be a value against itself: it passes always, catches nothing, and would leave the round weaker than the one it replaced while looking like a gate. This is the whole reason the pre-spawn record stays rather than being deleted.

**`build` therefore takes exactly one head from exactly one of two places**, and refuses when it has neither or both: the findings file's own `head`, or `--recorded-head` on the command line. Neither is a default the other silently covers, because a round that supplied both would be asserting two different answers to what the reviewer read.

## Steps

- Add `head` to *The findings file* in `plugins/gh-solo/skills/reviewer/SKILL.md`: the sha of the head the pass read, written by the bundled reviewer on every `review` pass and absent on a `re-review`, which carries `verdicts` and reads unpushed commits with `git` instead. State the before-the-diff order and the reason, since a reviewer that reads it afterwards satisfies the field and defeats the gate. Say that a reviewer omitting it drops the round onto the recorded-head fallback rather than breaking it, and that the fallback is the weaker check.
- Add the head read to `plugins/gh-solo/skills/reviewer/workflows/full.md`, ahead of the diff read it already lists, so the order is instruction rather than commentary.
- Add `head` validation to `build` in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`: optional on a `review` pass, shaped `[0-9a-f]{7,40}` when present, and refused on a `re-review`, in the same shape the `--anchored-at` and `--unpushed-diff` pair already uses for the opposite pass.
- Add `--recorded-head <sha>` to `build` as the fallback source, and refuse a `review` pass carrying neither it nor a findings-file `head`, and one carrying both.
- Add `--head-now <sha>` to `build`, required on a `review` pass and refused on a `re-review`, and refuse the payload when it disagrees with whichever head the pass supplied, naming both values and the source of the compared one.
- Keep the pre-spawn head record in Step 1 of `plugins/gh-solo/skills/pr-flow/workflows/review.md`, since it is now the fallback's source, and rewrite the sentence describing it as whatever the head is while the reviewer reads - it is the head *before* the spawn, which is the issue's third acceptance criterion and the whole defect. Move its read to `git fetch` plus `git rev-parse FETCH_HEAD` for the lag reason above, and say that it is passed as `--recorded-head` only when the reviewer reported no head of its own.
- Rewrite the first item of Step 2 of `plugins/gh-solo/skills/pr-flow/workflows/review.md`: read the ref with `git fetch <remote> <branch>` then `git rev-parse FETCH_HEAD`, and pass that as `build --head-now`, and say that the refusal comes from the script rather than from a comparison made here, along with which of the two heads it compared. Name the cost of the move - two paginated reads are now spent before a moved head is caught - so a later reader does not restore the cheap pre-check and end up with two homes for one comparison.
- Change the appointed-command path in Step 1 of `plugins/gh-solo/skills/pr-flow/workflows/review.md` to read the head with `git fetch` then `git rev-parse FETCH_HEAD` immediately before invoking the capability and pass it as `--recorded-head` rather than writing it into the findings file it builds by hand, and to say in the round report that the head was recorded rather than reported. A capability invoked with a PR number cannot report what it read, so this is the same honesty rule `severity_source` already carries on that path - and the comparison is still live there, because the build-time read happens after the capability has run.
- State in step 1 of `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` that the reviewer returns the head it read alongside its findings file and its report.
- Change step 5 of `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` from "the fix diff" to the commit range every other site names, per the issue's second acceptance criterion and the sweep it asks for.
- Name the re-review's reference value explicitly in Step 5 of `plugins/gh-solo/skills/pr-flow/workflows/review.md`: whichever head the full pass compared, reported or recorded, which is the value the round is already holding. Its read moves to `git fetch` plus `git rev-parse FETCH_HEAD` for the lag reason above; the pushed head still equals it unless someone pushed, since the round holds its own fix commits, and gating a foreign push mid-round is #19 rather than this branch.
- Rewrite the Rules bullet at the end of `plugins/gh-solo/skills/pr-flow/workflows/review.md` that says Step 1 records the head and Step 2's first item compares it, so it names the reviewer's reported head as the value and Step 1's record as the fallback. It is the third site asserting the contract this branch changes, alongside Step 1's record and Step 5's re-read, and the issue's second acceptance criterion asks for every such site to move in the same change.
- Extend `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` with a case per refusal and one per accepted path: `head` present on a `re-review`, a `head` that is not a sha, a `head` disagreeing with `--head-now` with both values and the compared one's source in the message, a `review` pass carrying neither `head` nor `--recorded-head`, one carrying both, `--head-now` missing on a `review`, `--head-now` present on a `re-review`, a build that succeeds on a reported `head` agreeing with `--head-now`, and one that succeeds on `--recorded-head` when the findings file carries no `head`. Two further assertions on the accepted pair: the record body carries the head as a row, and it names which source that head came from.
- Have `record_body` in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` print the head the round read, as a record row, so the version reviewed survives the session that read it and `plugins/gh-solo/skills/pr-flow/workflows/merge.md` has something to audit. It names its source too - the reviewer's report or the round's own record - so a reader can tell a round that checked the head the reviewer read from one that checked the head before it was spawned. It is a record row rather than prose, so *Never counted* in `plugins/gh-solo/skills/pr-flow/references/post-caps.md` keeps it outside the record Review's length cap.
- Say in *The findings file* of `plugins/gh-solo/skills/reviewer/SKILL.md` what the `head` value names - the version of the whole pull request diff the pass read - so the field cannot be read as addressing a range.
- Move `plugins/gh-solo/.claude-plugin/plugin.json` to `4.2.0`, per the version argument below.

**`plugins/gh-solo/agents/reviewer.md` is deliberately not in that list.** It points at the `reviewer` skill for the format rather than restating it, so the field arrives there by reference, and an edit would give the contract a second home.

## Why the version moves the minor

The fallback is what keeps this out of the major. A reviewer a repository appointed in place of the bundled one - the extension point Step 1 of `plugins/gh-solo/skills/pr-flow/workflows/review.md` documents - returns the file it always returned, lands on `--recorded-head`, and gets the round it got at `4.1.0`. Nothing that worked stops working, so the change is new behaviour rather than a break, and `AGENTS.md` puts that at the minor.

**What the fallback costs is stated rather than hidden, in two places.** The defect stays alive on that path, which is why the round report and the record Review both name which head was compared: a degradation nobody can see is the kind this package refuses, and one printed on every round is a known limitation. And the issue's first acceptance criterion narrows accordingly - the compared value is the head the reviewer read *when the reviewer reports one* - which is a real weakening of what #24 asked for and is the owner's decision, recorded in the thread on this plan's `## Open questions`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, run from the repository root with its exit code read directly and never through a pipe.
- `python3 scripts/version-check.py`
- `python3 scripts/manifest-check.py`, owed because the version bump touches `plugins/gh-solo/.claude-plugin/plugin.json`, which is one of the two manifests that file's agreement is checked across.
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`

Every new bench case is watched failing against the current `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` before the fix lands: today `build` accepts a `review` findings file with no `head` at all and has no `--head-now` to disagree with, so each of the seven cases has a pre-fix run that proves it can fail.

**What none of these gates can see:** whether the reported head is in fact the head the reviewer read. The bench proves the field is required, shaped and compared; only a real round, spawned from an installed copy carrying this change, shows that a reviewer reads the sha before the diff rather than after and that the comparison refuses a genuinely moved head while passing an unmoved one. A round on this branch cannot show it either, because a round spawns its reviewer and runs its script from the *installed* plugin, which stays at the last tagged version until the #26 stack merges. That is the owner's judgement after the tag, not a box here.

## Open questions

None.

## Settled

- **Does `head` become required, moving the major, or optional with a recorded fallback, moving the minor?** Optional with a real fallback, and `4.2.0`. The fallback value is the head recorded before the spawn rather than the build-time head, because the latter is the value `--head-now` already holds and comparing it with itself would pass always; so an appointed reviewer keeps `#15`'s check and nothing that worked breaks.
- **Should the record Review publish the head the round read?** Yes, and on this branch. The value is in `build`'s hand as it writes that summary and lands as a record row outside the length cap, so a head recorded only in session memory is the weaker reading of this issue's own title; the overlap with #63 is thinner than this plan first claimed, since that one reports what a round's fixes changed.
