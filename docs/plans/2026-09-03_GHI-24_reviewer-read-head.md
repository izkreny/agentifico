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

The order is the whole safety argument. If a push lands between the two reads, a head read *before* the diff is the older sha, the build-time comparison sees it disagree with the remote and refuses a round that may well have read the new diff - a false refusal, which costs one reviewer pass. A head read *after* the diff is the newer sha, the comparison agrees with the remote, and the round posts anchors counted against a diff that no longer exists - which fails atomically and takes every finding down with it. One order is wrong in the cheap direction and the other in the expensive one.

**The lag the issue observed is harmless on this side and fatal on the other.** `gh pr view --json headRefOid` was seen returning a pre-push sha seconds after a push, while `git` on the remote ref already had the new one. On the reviewer's side that lag is an honest answer, on the assumption - observed of `headRefOid` and not of `gh pr diff`, so assumed rather than established - that the diff it read came from the same lagging view. The ordering argument above holds either way, since it turns on which of the two failures is cheap rather than on the two reads agreeing. On the comparison's side the same lag makes the check pass while the head has moved, which is the second half of the defect the issue records. So the comparison never reads the head through `gh`: it reads the ref itself, which cannot answer from a cache of the pull request.

**It reads it as `git fetch <remote> <branch>` followed by `git rev-parse FETCH_HEAD`, and not as `git ls-remote`.** Both query the ref, but `ls-remote` prints `sha<TAB>ref`, and every way of reducing that to the value `--head-now` wants - `cut`, `awk`, a command substitution - breaks the rule in `plugins/gh-solo/skills/pr-flow/SKILL.md` that every command in an unattended block starts with `gh`, `git` or `python3`. Two bare `git` commands comply and need no new file argument, where an `ls-remote` written to a file would need `build` to parse a line it has no other reason to know about.

## What the refusal says

`build` refuses with both values and both their sources named - the head the reviewer reported reading, and the head the ref itself returned at build time - so a refusal can never be read as the reviewer's window having moved when what moved was something else. That is the issue's fourth acceptance criterion, and it lands as a benched string rather than as wording an orchestrator composes.

## Steps

- Add `head` to *The findings file* in `plugins/gh-solo/skills/reviewer/SKILL.md`: the sha of the head the pass read, required on a `review` pass and absent on a `re-review`, which carries `verdicts` and reads unpushed commits with `git` instead. State the before-the-diff order and the reason, since a reviewer that reads it afterwards satisfies the field and defeats the gate.
- Add the head read to `plugins/gh-solo/skills/reviewer/workflows/full.md`, ahead of the diff read it already lists, so the order is instruction rather than commentary.
- Add `head` validation to `build` in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`: required and shaped `[0-9a-f]{7,40}` on a `review` pass, refused on a `re-review`, in the same shape the `--anchored-at` and `--unpushed-diff` pair already uses for the opposite pass.
- Add `--head-now <sha>` to `build`, required on a `review` pass and refused on a `re-review`, and refuse the payload when it disagrees with the findings file's `head`, naming both values and both sources.
- Delete the pre-spawn head record from Step 1 of `plugins/gh-solo/skills/pr-flow/workflows/review.md`, including the sentence describing the recorded value as whatever the head is while the reviewer reads, which is the issue's third acceptance criterion.
- Rewrite the first item of Step 2 of `plugins/gh-solo/skills/pr-flow/workflows/review.md`: read the ref with `git fetch <remote> <branch>` then `git rev-parse FETCH_HEAD`, and pass that as `build --head-now`, and say that the refusal comes from the script rather than from a comparison made here. Name the cost of the move - two paginated reads are now spent before a moved head is caught - so a later reader does not restore the cheap pre-check and end up with two homes for one comparison.
- Change the appointed-command path in Step 1 of `plugins/gh-solo/skills/pr-flow/workflows/review.md` to read the head with `git fetch` then `git rev-parse FETCH_HEAD` immediately before invoking the capability and write it into the findings file it builds by hand, and to say in the round report that the head was recorded rather than reported. A capability invoked with a PR number cannot report what it read, so this is the same honesty rule `severity_source` already carries on that path - and the comparison is still live there, because the build-time read happens after the capability has run.
- State in step 1 of `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` that the reviewer returns the head it read alongside its findings file and its report.
- Change step 5 of `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` from "the fix diff" to the commit range every other site names, per the issue's second acceptance criterion and the sweep it asks for.
- Give the re-review's own comparison in Step 5 of `plugins/gh-solo/skills/pr-flow/workflows/review.md` an explicit reference value, since deleting Step 1's record takes away the one it currently names. It compares against the `head` the full pass reported, which the round holds in-session and which the pushed head still equals unless someone pushed - the round holds its own fix commits, so nothing it did can have moved it. Its read moves to `git fetch` plus `git rev-parse FETCH_HEAD` for the lag reason above, and gating a foreign push mid-round is #19 rather than this branch.
- Rewrite the Rules bullet at the end of `plugins/gh-solo/skills/pr-flow/workflows/review.md` that says Step 1 records the head and Step 2's first item compares it. It is the third site asserting the contract this branch replaces, alongside Step 1's record and Step 5's re-read, and the issue's second acceptance criterion asks for every such site to move in the same change.
- Extend `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` with a case per refusal and one for the pass: `head` missing on a `review`, `head` present on a `re-review`, a `head` that is not a sha, a `head` disagreeing with `--head-now` with both values in the message, `--head-now` missing on a `review`, `--head-now` present on a `re-review`, and a build that succeeds when the two agree.
- Move `plugins/gh-solo/.claude-plugin/plugin.json` to `5.0.0`, with `BREAKING CHANGE:` on the commit that does it, per the version argument below.

**`plugins/gh-solo/agents/reviewer.md` is deliberately not in that list.** It points at the `reviewer` skill for the format rather than restating it, so the field arrives there by reference, and an edit would give the contract a second home.

## Why the version moves the major

A required field in the findings file breaks a reviewer a repository appointed in place of the bundled one. Step 1 of `plugins/gh-solo/skills/pr-flow/workflows/review.md` states that such an agent inherits the whole contract and must return a file in the format the `reviewer` skill defines, so a round that worked at `4.1.0` refuses at this version until that agent is updated. That is a documented extension point, and `AGENTS.md` puts the decision on what the change does to whoever installs the package rather than on the commit type.

The cheaper reading is available and is the open question below: make `head` optional, fall back to a head recorded before the spawn when it is absent, and say in the round report which was used. It keeps every existing appointed agent working and moves the minor instead. It also leaves the defect alive on the fallback path, which is the kind of quiet degradation this package refuses elsewhere.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, run from the repository root with its exit code read directly and never through a pipe.
- `python3 scripts/version-check.py`
- `python3 scripts/manifest-check.py`, owed because the version bump touches `plugins/gh-solo/.claude-plugin/plugin.json`, which is one of the two manifests that file's agreement is checked across.
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`

Every new bench case is watched failing against the current `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` before the fix lands: today `build` accepts a `review` findings file with no `head` at all and has no `--head-now` to disagree with, so each of the seven cases has a pre-fix run that proves it can fail.

**What none of these gates can see:** whether the reported head is in fact the head the reviewer read. The bench proves the field is required, shaped and compared; only a real round, spawned from an installed copy carrying this change, shows that a reviewer reads the sha before the diff rather than after and that the comparison refuses a genuinely moved head while passing an unmoved one. A round on this branch cannot show it either, because a round spawns its reviewer and runs its script from the *installed* plugin, which stays at the last tagged version until the #26 stack merges. That is the owner's judgement after the tag, not a box here.

## Open questions

- **Does `head` become required, moving the major, or optional with a recorded fallback, moving the minor?** The plan implements required, because an optional field with a fallback leaves the defect live on the path that omits it, and the whole issue is that a value recorded before the spawn is the wrong value. The counter is real: the stack tags once, so this choice sets the major for every branch above it.
- **Should the record Review publish the head the round read?** It would make a round auditable from the pull request, which is #26's theme, but the surface it would land on is the delta report #63 designs. Left alone here rather than built twice.

## Settled

None yet.
