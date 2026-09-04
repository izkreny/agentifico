> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Cap the review passes one PR can get

Closes #16. A full reviewer pass becomes a counted, capped resource for the life of a pull request: every pass leaves a record on the pull request whether it posted findings or was thrown away, `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` reads that count off a surface the round already fetches, and a round that would spend a pass beyond the cap stops at the owner instead. The retry loops in the protocol's step 5 are pinned to **one** batched pass, and the resulting spawn ceiling is stated as a number rather than left to be derived.

It is stacked on #24, whose branch this one is cut from.

## What the issue's own technical note gets wrong, and why it changes the design

**The count is *not* already on the pull request.** The note says each analysis posts a record Review, so counting them costs no extra request. That is true of a pass that posted - and false of exactly the passes this issue was opened about. On `izkreny/groupifico#190` the first pass's findings were discarded when the post refused with `422`, and a discarded pass posts nothing at all: no record Review, no round report, no thread. A count of record Reviews would have read `1` at the moment the third pass was spawned.

**So a discarded pass has to leave a record of its own**, and that is the one mechanism this branch adds beyond the cap itself. It is not gold-plating: without it the cap binds only the passes that succeeded, which are the cheap ones, and the runaway case stays unbounded.

**The record goes on the reviews surface, so it costs no new read.** `highest-id` already fetches `pulls/<pr-number>/reviews` with `--paginate`, for the held ledger, and a `COMMENT` Review carrying a body and no `comments` array is the same call `build` already emits. A Conversation comment would have been a third paginated surface for one number.

## The count is a literal marker, never the record's prose

`record_body` composes the sentence `Review round on N finding(s)`, and matching that would make the count a hostage of its own wording: a reworded summary silently answers `0` and the cap silently stops binding, which is the shape of a check that cannot be seen to fail. So every full-pass record and every discard record carries a literal `PASS_MARKER` line, and `passes` counts occurrences of that and nothing else - the same reasoning the protocol's step 7 already gives for the authorisation comment's grep-able marker.

**A pull request whose rounds predate the marker counts them as zero.** That is a one-time undercount on pull requests already open when the plugin is upgraded, not a permanent gap, and the `passes` output says so rather than presenting a number it cannot vouch for.

## The number, and what it bounds

- **Two full reviewer passes for the life of a pull request.** The shape the issue says the protocol already implies, and the shape `#190` reached before the owner killed it: one pass discarded, one posted.
- **Three reviewer spawns for one round**: the full pass at step 1, the scoped re-review at step 5, and the one batched pass the retry loops get. So **six for the life of a pull request** at two full passes.
- **A discarded pass counts.** It consumed the spawn, which is what the cap is counting; that it produced nothing postable is the reason to count it rather than an exemption.

**Reaching the cap stops at the owner; it does not make the pull request unreviewable.** The cap bounds the *unattended* block, which is the dimension the issue names, so the owner's explicit word can spend a further pass - and that pass leaves its own marker, so the count keeps rising and the next stop arrives one pass later. A cap the owner cannot pass would block a pull request that genuinely earned a third reading, and the cheap way out of that is to stop counting.

## The retry loops get one pass between them

The protocol's step 5 caps two loops and says nothing about how many passes they cost: "a finding the re-review says is not closed gets one further plan-and-fix attempt" and "a new defect the re-review raises gets a fix plan and a fix, and that fix is re-reviewed once". Read per thread that is one spawn per retry and one per new defect; read per round it is one. Nothing states which, so today it is decided by whichever session runs the round - the issue's sixth acceptance criterion. It becomes one batched pass covering every retry and every new-defect fix together, which is also what makes the ceiling above a number rather than a function of how many findings a pass happened to raise.

## Steps

- Add the pass cap to `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` as its own section: the number, that a discarded pass counts, that the count's source is the markers on the pull request rather than any session's memory, and that reaching it is a stop at the owner which their word can pass.
- State the stop's wording there once, so it is a fixed string rather than something each round composes: `⛔ REFUSED - {n} reviewer passes have run on this pull request, the cap; {what} is unresolved`.
- Pin the retry loops in that file's step 5 to one batched pass covering every retry and every new-defect fix together, and state the per-round and per-pull-request spawn ceilings as numbers there.
- Name the pass cap in that file's closing *The unattended block is bounded only by its caps*, so the claim covers the loop that had no cap when it was written.
- Add the count read to Step 1 of `plugins/gh-solo/skills/pr-flow/workflows/review.md`, before the spawn, reusing the two `--paginate` reads Step 2 already makes for `highest-id` rather than adding a surface, and refuse in the protocol's wording when the count is at the cap.
- Name the cap as the limit at each sentence in that file that answers a lost pass with a re-spawn: the missing findings-file path at the end of Step 1, the head disagreement in Step 2's first item, and the malformed findings file in Step 2's fourth, per the issue's fourth acceptance criterion.
- Add the discard record to that file: when a pass is thrown away, build and post it before the re-spawn, so the pass that produced nothing is still counted.
- Change that file's Step 5 to spawn one batched pass for the retries and the new-defect fixes together, and to say that this is the round's third and last spawn.
- Have the round report in that file say which pass this was and how many the pull request has left, since a report that names findings without naming the budget they cost is what the issue's second occurrence shows is missing.
- Add `PASS_MARKER` to `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` and emit it from `record_body` on a `review` pass, as a record row - `plugins/gh-solo/skills/pr-flow/references/post-caps.md` keeps anything the script composes outside the record Review's cap.
- Add a `passes` subcommand to that script: `--reviews` required and read with the existing `review_bodies`, printing the count of markers, and printing on stderr that rounds predating the marker are not counted.
- Add a `discard` subcommand to that script, emitting the payload for a discard record: the marker, the head the discarded pass read, and why it was discarded, taken as arguments rather than composed by the caller so the wording is benched.
- Extend `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`: `passes` on a reviews listing with no marker, with one, with several, and on a `--slurp` shape it must refuse; `discard` emitting a payload whose body opens with the disclaimer and carries the marker; and that `build` on a `review` pass now writes the marker while a `re-review` does not.
- Update the `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` row in `plugins/gh-solo/skills/pr-flow/README.md` to name the pass count among the script's jobs, and add a paragraph there on the cap, since it is behaviour the owner meets rather than an internal.
- Move `plugins/gh-solo/.claude-plugin/plugin.json` to `4.3.0`, per the version argument below.
- Add the stacked-epic exception to the `blockedBy` stop to `.agents/gh-solo.md`, per the deviation below.

## The deviation this branch carries, and why

**`.agents/gh-solo.md` gains a section this issue never asked for**, on the owner's explicit instruction in the session that opened this branch. `plugins/gh-solo/skills/pr-flow/workflows/open.md` stops on an open `blockedBy`, and every child of an epic but the bottom one trips it: the child is cut from its blocker's own branch tip, per *An epic's work is stacked, and the stack is the release train* in `AGENTS.md`. This branch tripped it against #24. Both reasons the stop gives are void in that shape, so the repository records the exception where the plugin reads it rather than the owner waving the same stop through on every remaining child of #26.

**It is repository-level and moves no version**, per *Each plugin, and each skill under `skills/`, is a package* in `AGENTS.md`, so it changes nothing about the release this branch makes. The alternative the owner raised and rejected was clearing the relation: `blockedBy` is what records the stack's order, so satisfying the gate that way destroys the only typed record of which branch sits under which.

## Why the version moves the minor and not the major

Nothing that worked stops working. A round under the cap behaves exactly as it does today; `build` gains a line in a body nothing parses for content; `passes` and `discard` are new subcommands no existing invocation calls. What changes is that a round which would have spent a third pass now stops at the owner, which is new behaviour rather than a broken interface, and `AGENTS.md` puts that at the minor.

**The one interface that moves is `record_body`'s output**, and it moves by addition: a record Review's body gains a row. `release` reads that body for the held ledger by its fenced JSON key and `highest-id` reads it for `::RF{n}::` ids, so neither is reachable by a new row above them.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, run from the repository root with its exit code read directly and never through a pipe.
- `python3 scripts/version-check.py`
- `python3 scripts/manifest-check.py`, owed because the version bump touches `plugins/gh-solo/.claude-plugin/plugin.json`, one of the two manifests that file's agreement is checked across.
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`

Every new bench case is watched failing against the current `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` before the fix lands: today there is no `passes` subcommand and no `discard` subcommand to invoke, and a `review` pass's record body carries no marker, so each case has a pre-fix run that proves it can fail.

**What none of these gates can see:** whether the cap fires on a real round. The bench proves `passes` counts what the script writes and that `discard` writes a countable record; only a round that loses a pass shows that the discard record is actually posted on the path where it is owed, and a round on this branch cannot show it, because a round spawns its reviewer and runs its script from the *installed* plugin, which stays at the last tagged version until the #26 stack merges. Nor can any gate here see whether two is the right number - that is the owner's judgement, and the assumption is stated above so it can come back as a review finding.

## Open questions

None. The number the issue left to the owner is taken as the shape the issue itself names - two full passes plus the scoped re-review - and stated as an assumption above rather than asked, because this branch was opened by a literal `auto` command, which waives the plan-reading stop.

## Settled

- **How many full reviewer passes should a pull request get?** One, not the two proposed above, with the two scoped passes unchanged - so the ceiling is three reviewer spawns for a pull request's whole life. Settled by the owner on the review thread against *The pass cap*, which is what the assumption above was stated for. The prose above keeps the number it proposed, because it is the branch's intent at plan time and the gap between that and the outcome is worth being able to see; `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` is the authority on what ships.
