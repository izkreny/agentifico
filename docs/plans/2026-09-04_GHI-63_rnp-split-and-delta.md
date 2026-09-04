> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Split rnp from merge, and report the delta it pushes

Closes #63. `rnp` stops at the push. Merging takes a word of its own, which `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` Step 8 already prints and which nothing else will state. The same push posts one Conversation comment indexing what it carried: one row per changed hunk, each naming the `RF{n}` its commit closed, and no id where the commit closed none.

It is the fourth branch of the #26 stack, cut from #34's tip and stacked on PR #73.

## The disagreement is settled by deleting the chain, not the print

`plugins/gh-solo/skills/pr-flow/SKILL.md` says `rnp` reads the resolve workflow and then continues into the merge one, in its routing table and again in its routing bullet. `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` Step 8 ends by printing the merge command for the owner to type. Both are live and they contradict each other; the issue asks that one of them state what follows the push.

**The print survives and the chain goes.** A chained merge means the checks Step 7 reads are read after the branch has already landed, and `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` step 7 says a red check there "stops the merge until it is diagnosed" - which it cannot do to a merge the same word already made. Keeping the chain and deleting the print would leave that sentence asserting a gate that does not exist.

## "you can merge" stops being an `rnp` synonym

`plugins/gh-solo/skills/pr-flow/SKILL.md`'s routing bullet and `plugins/gh-solo/skills/pr-flow/workflows/resolve.md`'s entrance both list "you can merge" beside `rnp` and "resolve all and push". After the split that sentence would authorise a push and then not merge, which is worse than a refusal: the owner said the word and watched something else happen.

**It routes to `plugins/gh-solo/skills/pr-flow/workflows/merge.md` instead, where Step 1 already refuses on unpushed commits and already names `rnp` as the remedy.** The sentence then lands on a gate that tells the owner the word they actually need. `plugins/gh-solo/skills/pr-flow/SKILL.md`'s merge row loses the clause routing "merge it" through the resolve workflow first, for the same reason. "We are done" and "resolve all and push" stay, because neither names the merge.

## The delta index, and where its two heads come from

**The span is the pushed head before `git push` and the local head that was pushed.** The before-value is read the way `plugins/gh-solo/skills/pr-flow/workflows/review.md` Step 1 reads a head - `git fetch <remote> <branch>` then `git rev-parse FETCH_HEAD` - and never with `gh pr view --json headRefOid`, which that file records answering with a pre-push sha seconds after a push. **This is a deviation from #63's own technical note**, which names `headRefOid` for both reads; the note was written before #24 landed that rule in the tree below this branch. The after-value is local `HEAD`, which is what the push just sent, so it needs no read of the remote at all.

**The rows are built per commit, never from one aggregate diff.** `git log -p <before>..<after>` walks each commit with its own hunks; a single `git diff` over the range merges two commits touching one region into a hunk no row could attribute. The id comes from the commit's body, where `plugins/gh-solo/skills/implement/workflows/fix.md` already requires every `RF{n}` the commit closes to be named.

**Attribution is commit-level, and that is the point rather than a rounding error.** A rename made while fixing `RF3` carries `RF3`, so the index shows what that fix actually cost. The rows with no id are the commits whose bodies name none - a `docs:` relocation commit, a divergence commit - which is the other kind the issue asks to see.

## What the comment is, and what it must not become

**One Conversation comment, disclaimer and `via` line first.** Not inline comments: an inline comment opens a thread, `plugins/gh-solo/skills/pr-flow/workflows/merge.md` refuses on any unresolved thread, and a thread created after the authorisation can never be named by it - `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` forbids naming an id the batch does not resolve. #36 was closed for needing a second push path and an id namespace whose only job was to make the merge gate accept threads it had itself created.

**The row is `path:start-end`, then the `RF{n}` its commit closed or `-` where it closed none.** One markdown table, columns padded so they line up, and nothing else per row - a subject column would say what the fix map already says and roughly double the width.

**No new id namespace, and no id of any kind assigned.** A hunk no finding asked about is not a finding. A second namespace beside `RF{n}` would be read by `plugins/gh-solo/skills/pr-flow/workflows/merge.md`'s thread audit and by #16's pass count as though it were one.

**The index is a record row and says so.** *Never counted* in `plugins/gh-solo/skills/pr-flow/references/post-caps.md` excludes "a record row - one line per item, where the length is set by how many items there are rather than by how much was written", so the row count is deliberately uncapped and the cap bounds only the prose around it. The file states that about itself, so a later reader does not shorten it to fit.

## Steps

- Cut the chain in `plugins/gh-solo/skills/pr-flow/SKILL.md`: the `rnp` routing row and the routing bullet both end at the push, and neither names `plugins/gh-solo/skills/pr-flow/workflows/merge.md` as what follows.
- Drop "you can merge" from the `rnp` triggers in that file's routing table, its routing bullet and its frontmatter description, and drop the clause routing "merge it" through the resolve workflow first from its merge row. Drop the same phrase from `plugins/gh-solo/skills/pr-flow/workflows/resolve.md`'s entrance.
- Add the delta index to `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` as its own step: read the before-head with `git fetch` and `git rev-parse FETCH_HEAD` ahead of Step 5's push, walk `git log -p <before>..<after>` after it, and post one Conversation comment whose `via` line reads `via` `pr-flow` resolve, the delta index.
- State in that step the row's shape - `path:start-end` and the `RF{n}` or `-` - that the row count is uncapped as a record row, that it opens no thread and resolves nothing, and that it assigns no id.
- Make `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` Step 8 the one statement of what follows the push, and say in its verdict that merging is a separate word.
- Update `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` step 7: it ends at the push and posts the index, step 8 is reached by the owner's own word, and the red-check sentence names what it is now able to stop.
- Update `plugins/gh-solo/skills/pr-flow/workflows/help.md` rows 19, 37 and 56 so `rnp` ends at the push and `merge <pr-number>` is named as the next word.
- Update `plugins/gh-solo/skills/pr-flow/README.md`: the mermaid flowchart gains a rounded node for the owner typing `merge` between `rnp` and the merge step, and the two table rows say what each word does.
- Move `plugins/gh-solo/.claude-plugin/plugin.json` to `4.5.0`.

## Verification

- [ ] The docs-check command in `.agents/gh-solo.md`, whose exit code is read rather than its output.
- [ ] `python3 scripts/version-check.py`.
- [ ] `mmdc` renders `plugins/gh-solo/skills/pr-flow/README.md`'s flowchart without a parse error.

**None of these sees whether the index is right.** They see that paths resolve, that a version moved somewhere in the stack's range, and that the diagram parses. Whether the comment carries a row of each kind is seen only on a real push, which is this branch's own round: the `rnp` on it is run by reading this tree's `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` rather than the installed `4.0.0`, which has no such step, and the index is built and posted from those steps by hand.

**`scripts/version-check.py` cannot see this branch's own bump.** It compares `origin/main...HEAD`, and on an upper branch of a stack that range already contains #24's, #16's and #34's bumps, so it passes whether or not `4.5.0` lands. The bump holds because this plan makes it a step, not because a gate refuses without it - which is what `.agents/gh-solo.md` says about every branch in a stack.

**If the round's fix commits happen to produce rows of only one kind, the criterion stays unticked.** It is verified on the next branch's round instead - #19 also edits `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` - rather than on a fixture or on an incidental change manufactured to make a row appear.

## Open questions

- Dropping "you can merge" from the `rnp` triggers removes a phrase already in use. The alternative is to keep it routing to `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` and have the report say the merge did not happen, which reads as the command ignoring half of what was said. Recommend dropping it.

## Settled

- Whether an index row should carry the commit subject as well as `path:start-end` and the id. It should not: the fix map posted at step 4 already names each commit, and the column would roughly double a row's width for a fact one hop away.
