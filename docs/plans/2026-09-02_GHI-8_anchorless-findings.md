> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Let a scoped re-review post new findings

Closes #8. The route is the fifth option recorded on that issue rather than any of the four in its body: the findings file carries the unanchorable finding flagged as such, `build` assigns its `RF{n}` and indexes it in the record Review while leaving it out of the `comments` array, and the highest-id read widens to review bodies so the reserved id is visible to the next round.

## Why this shape

The four options in the issue body each give up a gate. Re-anchoring loses the finding's subject, an unanchored Conversation comment loses the thread the merge gate audits, running the re-review after the push loses the anchoring the held commits exist to preserve, and deferring loses the id. The fifth gives up none: no bad anchor is ever sent, so the atomic call still succeeds; the id is reserved and greppable; and the thread lands on the next pass with no special handling.

The four blocks #31 hit are all in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`, and this plan removes each: `record_body` composes from the findings list only, every list entry becomes an inline comment, a `re-review` file needs verdicts, and `build` derives ids from `--continue-from` plus index. Only the second and the fourth actually have to change - the flagged finding stays in the list, keeps its index, and takes its id from the same sequence; what changes is which findings reach `payload["comments"]`.

**Not every re-review finding is unanchorable, which is what makes the flag a question rather than a formality.** A fix commit that edits a line the pushed diff already contains leaves an anchor GitHub can resolve - at the pre-fix content, which is the first option's lossiness rather than a failure - so a blanket `comments: []` on every `re-review` pass is not equivalent to a per-finding flag. What no design here settles is who can tell the two apart: the reviewer writes the findings file and, on the `rescope` entrance, has read the fix range and nothing about what is pushed.

`highest-id` reads `pulls/{pr}/comments` alone, which is why *Ids never restart* currently forbids issuing the id at all. `record_body` already prints one `- RF{n} ...` row per finding into a Review body that is posted and greppable on `pulls/{pr}/reviews`, so widening the read to that surface is what makes the reservation safe.

## Steps

- Add an optional per-finding boolean to `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` marking a finding that has no resolvable anchor yet, defaulting to false, validated as a boolean when present, and refused outright when `pass` is `review` - a full pass reads the pushed diff, so anchorless there is the reviewer failing to anchor, which the `reviewer` skill already says to drop.
- Keep `path`, `line` and `side` required on a flagged finding: the record row needs the `file:line`, and the anchor is what the next pass will use once the fixes are pushed.
- Change `build` so ids are assigned over every finding in index order, unchanged, while `payload["comments"]` is built from the unflagged findings only - the flagged ones travel in the record Review alone.
- Change `record_body` so a flagged finding's row says it has no thread yet, and the pass sentence counts threaded and reserved findings separately, which is this issue's second acceptance criterion.
- Widen `verify` to read the reviews listing too and confirm each reserved `RF{n}` landed in a review body: it already iterates the payload's `comments` array alone, so a finding `build` omits is invisible to it today, and a reserved id that never posted would go undetected until the next round reissued it.
- Change `highest-id` to read review bodies as well as inline comments, taking the `pulls/{pr}/reviews` listing as a second required input, and refusing the same wrong `--slurp` shape it already refuses for comments.
- Extend `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` with cases for each of those: a `build` whose payload omits the flagged finding from `comments` while its `RF{n}` appears in the record body, a `build` refused for flagging on a `review` pass, a `highest-id` whose answer comes only from a review body, and a `verify` that passes with a reserved id absent from the comments listing.
- Rewrite step 5 of `plugins/gh-solo/skills/pr-flow/workflows/review.md` and step 5 of `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` to state the new route, and delete the paragraphs naming this as a known limitation tracked by an issue.
- Add the extra `gh api --paginate "repos/{owner}/{repo}/pulls/<pr-number>/reviews"` read to step 2 of `plugins/gh-solo/skills/pr-flow/workflows/review.md`, beside the comments read it already makes, and pass both to `highest-id`.
- Add the flag to the findings-file section of `plugins/gh-solo/skills/reviewer/SKILL.md`, on the `rescope` entrance only, and state that a finding it cannot anchor on a full pass is still dropped.
- Move `plugins/gh-solo/.claude-plugin/plugin.json` to `4.1.0`: new behaviour for whoever installs the package, and nothing an existing round did stops working.

## Verification

- [ ] `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`
- [ ] `python3 scripts/version-check.py`
- [ ] `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`

Every new bench case is watched failing against the current `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` before the fix lands, which is what makes it evidence: today's `build` puts the flagged finding in `comments`, which is the payload GitHub answered `422` to on #6 and on `izkreny/groupifico#210`, and today's `highest-id` answers `0` on a pull request whose only id is in a review body.

What none of these gates can see is whether the route works against GitHub. The bench proves no bad anchor is sent; only a real scoped re-review raising a new finding proves the id reserves, the record reads correctly and the thread lands on the next pass. That is this issue's first acceptance criterion and it is the owner's judgement, not a box.

## Open questions

- Who decides that a finding has no anchor yet? The reviewer cannot: on the `rescope` entrance it has read the fix range and knows nothing about the pushed head. So either `build` is handed the pushed diff and decides, or the round treats every `re-review` finding as unanchorable and sends `comments: []`, which is simpler and gives up the threads that do currently resolve.
- Should `--reviews` be required on `highest-id`, as planned, or optional? Required means a caller cannot under-read the id space by omitting it, which is the exact failure this issue is about; optional keeps every existing invocation of the script working.
- Does the first acceptance criterion close on this branch's own re-review round if one raises a new finding, or does it wait for a later pull request?
