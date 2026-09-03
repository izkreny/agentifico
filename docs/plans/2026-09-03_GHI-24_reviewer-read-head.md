> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Record the head the reviewer read

Closes #24. The orchestrator reads the head before it spawns the reviewer and hands that sha over as the scope to review; the reviewer reads exactly that sha and reports it back; `build` refuses the payload when the reviewer's report disagrees with the pin, and again when the pin disagrees with the head the ref holds at build time.

This is the *Pin the read* design of the two the issue records, with the reviewer's report kept as a cross-check rather than as the source. It is the bottom branch of the #26 stack.

## Why Pin, and what the issue's own costing got wrong in both directions

**The issue credits Pin with a precedent it does not have.** Its body argues that `Reviewer model:` established that a spawn carries parameters beside a prompt still holding the number alone, so the sha would reuse a channel that shipped. It would not: the model travels on the spawn's own `model` parameter, and there is no parameter for an arbitrary value, so the sha has exactly one route into a subagent and that route is the prompt.

**But the sentence that widening breaks is narrower than it reads.** What "the PR number and nothing else" protects is contamination - the author's account of the diff reaching the reviewer - and `plugins/gh-solo/agents/reviewer.md` already sanctions the `rescope` prompt carrying a commit range, a findings list and an id-to-commit map, on the grounds that "each is an address rather than an account". A head sha is an address by that same test: where to look, carrying no claim about what is there. So the prompt gains an argument of a shape the plugin has already ruled admissible, rather than losing the protection the sentence exists to give.

**Pin's real cost is the read, not the prompt.** `gh pr diff` accepts a number, a URL or a branch per its own `--help`, and never a sha, so a pinned pass cannot ask GitHub for the object under review: it fetches the sha and computes the diff itself.

**What Pin buys is that the acceptance criterion holds by construction.** Under *Report* the compared value is whatever the reviewer says it read, which is a claim; under Pin the reviewer reads the value it was given, so the round knows rather than trusts. That is the difference the issue names when it calls pinning stronger, and it is why the fallback question that *Report* forces - what to compare when the reviewer reports nothing - does not arise here.

## The three values, and which of them is authoritative

- **The pin**, read by the orchestrator before the spawn and handed to the reviewer. **Authoritative.** It is what the reviewer was told to read, so it is what the round's anchors belong to.
- **The reviewer's report**, the `head` it writes into its findings file. **A cross-check, never a source.** It answers "did you read what you were told to", and a disagreement means the reviewer read something else, which invalidates the pass rather than correcting the pin.
- **The head at build time**, read from the ref immediately before the payload is built. **The moving part.** A pin that no longer equals it means the pull request moved during the round, so GitHub would resolve the anchors against content the pass never saw.

**A reviewer that reports no head is not refused, and the uncorroborated path is still sound.** An appointed reviewer may ignore the new argument and read the current head with `gh pr diff` instead - but the only way that read can differ from the pin is if the head moved between the pin and its read, and the pin-against-build-time check refuses exactly that case independently. So the round loses the corroboration and keeps the guarantee; what it owes in exchange is saying so, which the round report and the record Review both do.

## How each value is read, and why not through `gh`

**The pin and the build-time head are read as `git fetch <remote> <branch>` followed by `git rev-parse FETCH_HEAD`.**

`gh pr view <pr-number> --json headRefOid` was seen returning a pre-push sha seconds after a push while `git` on the remote ref already had the new one, which is the second half of the defect the issue records: a lagging read matches the value it is compared against while the head has in fact moved, so the check passes and the post fails with the `422` it exists to prevent. The ref is queried directly instead, and `git ls-remote` is not the way to do it - it prints `sha<TAB>ref`, and every way of reducing that to a value (`cut`, `awk`, a command substitution) breaks the rule in `plugins/gh-solo/skills/pr-flow/SKILL.md` that every command in an unattended block starts with `gh`, `git` or `python3`. Two bare `git` commands comply and need no new file argument.

**The reviewer's read is `git fetch <remote> <sha>` followed by `git diff <remote>/<base>...<sha>`.** Three-dot, so the base side is the merge point rather than the base's tip, which is the pull request's own diff rather than a diff against wherever the trunk has since moved to. Two commands rather than a `merge-base` substitution, for the reason above. The base ref name comes from the `gh pr view` read that pass already makes.

## What the refusal says

`build` refuses with both values and the name of each, so the two refusals cannot be confused: a reviewer that read the wrong thing, and a pull request that moved. That is the issue's fourth acceptance criterion, and it lands as a benched string rather than as wording an orchestrator composes.

## Steps

- Add the pin to the spawn in Step 1 of `plugins/gh-solo/skills/pr-flow/workflows/review.md`: read it with `git fetch` then `git rev-parse FETCH_HEAD`, pass it in the prompt beside the PR number, and say why an address is admissible there where an account is not.
- Rewrite the sentence in that step describing the recorded value as whatever the head is while the reviewer reads. It is the head the reviewer is *told* to read, which is the issue's third acceptance criterion and the whole defect.
- Update every site asserting that the reviewer is spawned with the PR number and nothing else, per the issue's second acceptance criterion: `plugins/gh-solo/skills/pr-flow/README.md`, `plugins/gh-solo/skills/pr-flow/SKILL.md`, `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` step 1, `plugins/gh-solo/skills/pr-flow/workflows/review.md` at its appointed-agent bullet, its Step 1 spawn and its Rules bullet, `plugins/gh-solo/agents/reviewer.md` in its description and its full-entrance paragraph, and the *Two entrances* section of `plugins/gh-solo/skills/reviewer/SKILL.md`.
- Change the reviewer's read in `plugins/gh-solo/skills/reviewer/workflows/full.md` from `gh pr diff <pr-number>` to the fetch and three-dot `git diff` above, and say that the pinned sha is the object under review rather than whatever the pull request holds now.
- Add `head` to *The findings file* in `plugins/gh-solo/skills/reviewer/SKILL.md`: the sha the pass read, which on a pinned pass is the sha it was given, written on every `review` pass and absent on a `re-review`, which carries `verdicts` instead. Say what it names - the whole pull request diff at that sha - and that it is a cross-check the orchestrator compares against its own pin.
- Add `head` validation to `build` in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`: optional on a `review` pass, shaped `[0-9a-f]{7,40}` when present, refused on a `re-review`, in the same shape the `--anchored-at` and `--unpushed-diff` pair already uses for the opposite pass.
- Add `--pinned-head <sha>` and `--head-now <sha>` to `build`, both required on a `review` pass and both refused on a `re-review`, and refuse the payload on either disagreement - the reported `head` against the pin, and the pin against the build-time head - naming which comparison failed.
- Rewrite the first item of Step 2 of `plugins/gh-solo/skills/pr-flow/workflows/review.md` to read the build-time head off the ref and pass both shas to `build`, and to say that the refusal comes from the script rather than from a comparison made here. Name the cost of the move: two paginated reads are now spent before a moved head is caught, so a later reader does not restore the cheap pre-check and leave two homes for one comparison.
- Change the appointed-command path in Step 1 of `plugins/gh-solo/skills/pr-flow/workflows/review.md` to pass the pin as `--pinned-head` and to say in the round report that the pin was not corroborated. A capability invoked with a PR number cannot report what it read, so it lands on the uncorroborated path by construction, and the report is what stops that reading as a corroborated round.
- Have `record_body` in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` print the head the round reviewed as a record row, and whether the reviewer corroborated it, so the version reviewed outlives the session that read it and `plugins/gh-solo/skills/pr-flow/workflows/merge.md` has something to audit. It is a record row, so *Never counted* in `plugins/gh-solo/skills/pr-flow/references/post-caps.md` keeps it outside the record Review's length cap.
- Name the re-review's reference value explicitly in Step 5 of `plugins/gh-solo/skills/pr-flow/workflows/review.md`: the pin the full pass used, which the round is already holding. Its read moves off `gh pr view` for the lag reason above; the pushed head still equals the pin unless someone pushed, since the round holds its own fix commits, and gating a foreign push mid-round is #19 rather than this branch.
- Change step 5 of `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` from "the fix diff" to the commit range every other site names, per the issue's second acceptance criterion and the sweep it asks for.
- Extend `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` with a case per refusal and one per accepted path: a reported `head` disagreeing with `--pinned-head`, a `--pinned-head` disagreeing with `--head-now`, each naming which comparison failed; `head` present on a `re-review`; a `head` that is not a sha; `--pinned-head` or `--head-now` missing on a `review`; either present on a `re-review`; a build that succeeds when all three agree; and one that succeeds on a findings file carrying no `head` at all. Two further assertions on the accepted pair: the record body carries the head as a row, and it says whether the reviewer corroborated it.
- Move `plugins/gh-solo/.claude-plugin/plugin.json` to `4.2.0`, per the version argument below.

## Why the version moves the minor and not the major

An appointed reviewer keeps working untouched. It receives one extra argument in its prompt, which it may ignore; it returns the file it always returned, with no `head`; the round proceeds on the pin and says the pin was not corroborated. Nothing that worked at `4.1.0` stops working, so this is new behaviour rather than a break, and `AGENTS.md` puts that at the minor.

**The first acceptance criterion is not narrowed by that path**, which is the difference from the design this plan first carried. There the uncorroborated round compared a value recorded before the spawn, leaving the defect alive for whoever landed on it; here it compares the value the reviewer was told to read, and any divergence between that and what an ignoring reviewer actually read requires the head to have moved, which is refused independently.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, run from the repository root with its exit code read directly and never through a pipe.
- `python3 scripts/version-check.py`
- `python3 scripts/manifest-check.py`, owed because the version bump touches `plugins/gh-solo/.claude-plugin/plugin.json`, which is one of the two manifests that file's agreement is checked across.
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`

Every new bench case is watched failing against the current `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` before the fix lands: today `build` has no `--pinned-head` and no `--head-now` to disagree with, and accepts a `review` findings file with no `head` at all, so each case has a pre-fix run that proves it can fail.

**What none of these gates can see:** whether the three-dot `git diff` the reviewer now runs produces the same object `gh pr diff` produced. The bench proves the shas are compared and the refusals fire; only a real round shows that the pinned read is the pull request's diff rather than something adjacent to it, and that a reviewer handed a sha in its prompt does not treat it as an account of the diff. A round on this branch cannot show either, because a round spawns its reviewer and runs its script from the *installed* plugin, which stays at the last tagged version until the #26 stack merges. That is the owner's judgement after the tag, not a box here.

## Open questions

None.

## Settled

- **Does the orchestrator hand the reviewer its scope, or does the reviewer discover and report it?** It hands it over, and the reviewer reports the same value back as a double check. Decided on this plan's own thread after the plan first carried the reporting design; pinning makes the acceptance criterion hold by construction rather than on the reviewer's word, and it removes the fallback question that reporting forces.
- **Should the record Review publish the head the round read?** Yes, and on this branch. The value is in `build`'s hand as it writes that summary and lands as a record row outside the length cap, so a head recorded only in session memory is the weaker reading of this issue's own title; the overlap with #63 is thinner than this plan first claimed, since that one reports what a round's fixes changed.
