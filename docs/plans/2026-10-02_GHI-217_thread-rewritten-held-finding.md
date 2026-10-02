> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Thread a held finding its fix rewrote

Issue [#217](https://github.com/izkreny/agentifico/issues/217), comments included. It is not part of an epic, so the branch is cut from `main` and not stacked. It has no blockers.

## What changes

**`release` anchors a rewritten line to what replaced it.** Today `shift_line` in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` returns `None` when a hunk covers the held line, and `release` skips the finding. The hunk that covered it is already in hand. When its `+` side has lines, the thread goes on the line at the same offset into the replacement, clamped to the hunk's last line. The finding body gains one sentence: where it was held, at which head, and that the fixes rewrote it. The thread opens under its reserved `RF{n}`, and the follow-up replies attach to it as they do now.

**A held finding that still cannot be threaded makes `release` exit 2.** Three cases are left: the replacing hunk is a pure deletion, git cannot diff from the anchor head, or the path is gone at `HEAD`. `release` still writes the payload for every other entry, then names each unthreaded id on stderr and exits 2. Today all three print a skip line on stdout and exit 0.

**`resolve` posts what `release` wrote, whatever the exit.** Step 6 of `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` says so, and Step 9 of the same file adds "a held finding could not be threaded" to its `⚠️` list, naming each id.

**`merge` refuses while a reserved id has no thread.** A new read-only subcommand, `post-review.py unthreaded --reviews --comments`, prints every id held in a ledger that no comment opens with. It exits 2 when there is one. Step 1 of `plugins/gh-solo/skills/pr-flow/workflows/merge.md` runs it beside the thread gate. The refusal names the ids and points at Step 6 of `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` as the retry. Where `release` cannot thread an id at all, the owner decides where its thread goes.

**The docs stop calling the skip intended.** That is the *Running it* bullet in Step 6 of `plugins/gh-solo/skills/pr-flow/workflows/resolve.md`, the *The line is brought forward at release* paragraph in Step 5 of `plugins/gh-solo/skills/pr-flow/workflows/review.md`, and the posting script's row in `plugins/gh-solo/skills/pr-flow/SKILL.md`. The tools line of `plugins/gh-solo/skills/pr-flow/workflows/merge.md` gains `python3`.

## Decisions

**The replacement line, not a file-level comment.** GitHub's create-a-review endpoint takes no `subject_type` in its `comments` array, so a file-level comment needs the single-comment endpoint and a `commit_id`. That would split `release` into several calls and break the one atomic post that `verify` reconciles. The replacement line stays inside the existing payload, and it is where the fix that answered the finding now sits.

**Exit 2 with a payload, not exit 0 with a stderr line.** The exit code is what the bench and the workflow can test without parsing text. Exit 2 already means "a check failed" in the script's docstring. The one new rule is that `resolve` posts `--out` when it exists, which Step 6 states.

**The merge check is a subcommand, not prose.** It is the set difference `release` already computes: ids held in a ledger, minus ids that open a comment. A script exit is a gate a refusal can rest on. A reading of review bodies by eye is not.

**The plugin moves 4.11.0 to 4.12.0.** The issue is a bug, but `merge` gains a refusal every installer will meet. The #127 plan made the same call for the same reason.

## Steps

- In the bench, rewrite the `release-rewritten` case to expect a thread on the replacement line, and the `release-unknown-at` case to expect exit 2 naming the id. Run the bench and watch both fail.
- Add bench cases: a pure-deletion hunk exits 2; one movable entry beside one unthreadable entry writes a payload for the first and exits 2; `unthreaded` exits 2 on a reserved id with no thread, 0 when every id is threaded, and does not count a prose cross-reference.
- Change `shift_line` and `release` in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` to anchor on the replacement line, add the body sentence, and exit 2 on the unthreadable cases.
- Add the `unthreaded` subcommand.
- Update Steps 6 and 9 of `plugins/gh-solo/skills/pr-flow/workflows/resolve.md`, Step 5 of `plugins/gh-solo/skills/pr-flow/workflows/review.md`, Step 1 and the tools line of `plugins/gh-solo/skills/pr-flow/workflows/merge.md`, and the posting script's row in `plugins/gh-solo/skills/pr-flow/SKILL.md`.
- Bump `plugins/gh-solo/.claude-plugin/plugin.json` to 4.12.0.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-10-02_GHI-217_thread-rewritten-held-finding.md`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `python3 scripts/manifest-check.py`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`

The bench runs `release` against real git ranges, but never against GitHub. Whether GitHub accepts an anchor on a replacement line is shown only by the next live round that holds a finding and rewrites it.

## Open questions

None.
