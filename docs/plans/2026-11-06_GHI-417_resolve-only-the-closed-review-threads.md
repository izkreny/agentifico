> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Resolve only the closed review threads

Issue #417 holds the acceptance criteria. This plan says how.

## Approach

The new entrance is a section of its own in `plugins/gh-solo/skills/pr-flow/workflows/resolve.md`, named from *The entrance*. The owner types `resolve closed` or `:rc`. The section runs Steps 2, 3 and 4 and then stops. It skips Step 1, so a running watch keeps running: the threads left open still wait on the owner. It skips Steps 5 to 8, so nothing is pushed, released or indexed.

Step 2's sort changes in one way. A thread joins the closed pile when its last comment is an agent post, opening with `> 🤖`, that carries `::RF{n}::CLOSED::` for the thread's own `RF{n}`. The verdict must also name the thread's own id, so a verdict posted in the wrong thread closes nothing. The thread must still be covered under Step 2. *The authorisation comment* in `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` already says no authorisation covers a thread whose last owner signal is unanswered, so an owner's 👀 on the verdict keeps it open. A reply below the verdict makes it no longer the last comment, so that thread stays open too.

Step 3 posts the authorisation comment as written, naming exactly the closed pile's ids. Step 4 resolves them. Then the section's own report: the verdict line, one table of resolved threads and one of threads left open, each row by `RF{n}`, path and line. Per Q1 it also lists the unpushed commits, from `git log --oneline @{u}..HEAD`, and names `:rp` as what pushes them.

`plugins/gh-solo/skills/pr-flow/SKILL.md` routes `resolve closed` and `:rc` to that section, in its description, argument hint, routing table and routing bullet. `plugins/gh-solo/skills/pr-flow/workflows/help.md` gets a row. Step 6 of the review protocol gains one sentence pointing at the section, since it is the step this runs in.

The `rnp` alias becomes `:rp` in every package file that names it, the three READMEs' Mermaid labels and the string in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` included. Merged plans under `docs/plans/` keep the old word, since a plan stays as written.

Renaming a command the owner types breaks installers, per N5 on the issue. So `version` in `plugins/gh-solo/.claude-plugin/plugin.json` moves from 4.17.0 to 5.0.0.

## Steps

- ::S1:: Add the closed-only section to `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` and name it from *The entrance*: the words, Step 1 skipped, the closed pile, Steps 3 and 4 as written, nothing pushed, released or indexed, and the report with its tables, its unpushed commits and `:rp`
- ::S2:: Route `resolve closed` and `:rc` in `plugins/gh-solo/skills/pr-flow/SKILL.md`: the description, the argument hint, the routing table and the routing bullet
- ::S3:: Add the `resolve closed` row to `plugins/gh-solo/skills/pr-flow/workflows/help.md`
- ::S4:: Point step 6 of `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` at the new section
- ::S5:: Rename `rnp` to `:rp` in every file under `plugins/gh-solo/` that names it
- ::S6:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` to 5.0.0

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-06_GHI-417_resolve-only-the-closed-review-threads.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`
- ::V7:: `git grep -nw rnp -- plugins/gh-solo` exits 1, seen exiting 0 on the tree before this branch
- ::V8:: `git grep -qF -- ':rc' plugins/gh-solo/skills/pr-flow/workflows/resolve.md`, seen red on the tree before this branch
- ::V9:: `mmdc` renders the flowcharts of `plugins/gh-solo/skills/pr-flow/README.md`, `plugins/gh-solo/skills/implement/README.md` and `plugins/gh-solo/skills/tracker/README.md` without a parse error, the renderer first seen exiting 1 on a broken diagram

V1 names this plan alone, as on #287, since the substitution would also hand it the plans below this branch. The version check's range takes in the bumps below this branch, so only S6 holds this branch's bump. No gate runs the new entrance against a live pull request; whether its pile matches the threads a CLOSED verdict ended is the review's to read.

## Open questions

- ::Q1:: **May a thread be resolved before its fix is pushed?** A CLOSED verdict reads fix commits that are still local, so the PR then shows the thread answered while the remote lacks the fix. Recommendation: allow it, and have the report name the unpushed commits. `:rp` pushes them next, and `merge` already refuses while fixes are unpushed.

## Settled

None yet.
