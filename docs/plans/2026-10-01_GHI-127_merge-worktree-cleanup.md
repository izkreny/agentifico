> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Merge removes the finished worktree, and moves the trunk

Issue [#127](https://github.com/izkreny/agentifico/issues/127), comments included. It is not part of an epic, so the branch is cut from `main` and not stacked. It has no blockers.

## What changes

**Step 4 of `plugins/gh-solo/skills/pr-flow/workflows/merge.md` is rewritten around one order: remove the worktree, then delete the branch.** The two cases keyed on who holds `main` stay. What each case does changes.

**Another worktree holds `main`.** The session stands in that trunk worktree. It removes the branch's worktree with a plain `git worktree remove <path>`, which frees the branch. Then `git branch -D` and `git remote prune` run as they do now. Last, `git merge --ff-only <remote>/main` moves the trunk onto the squash commit. The detach bullet goes, since nothing needs moving off the branch once its worktree is gone.

**Nobody holds `main`.** The branch was worked in the trunk worktree itself, or the repository is a plain checkout. Nothing changes here except one sentence: no worktree is removed, because the only one holding the branch is the trunk's. That sentence is what tells a repository with no worktree layout the step leaves it alone.

**Getting the session out of the branch's worktree.** `git worktree remove` refuses the directory the session stands in. Where the session entered that worktree by `path` this session, `ExitWorktree` with `action: "keep"` returns it to the directory it launched in, without removing anything. `git worktree list` then has to show that directory holds `main` before anything runs there, since the launch directory is an assumption. Where the session was launched inside the branch's worktree, `ExitWorktree` is a no-op, and `EnterWorktree` cannot switch to a trunk outside `.claude/worktrees/`. The step then stops and prints the removal and the branch deletion for the owner to run.

**Each refusal is reported and stops, never forced.** `git worktree remove` exits 128 on a modified or untracked file. The step names the path and leaves `--force` alone, because a forced removal discards work never committed. `git merge --ff-only` refuses on divergence or on local changes it would overwrite. The step names the commit it declined to move to.

**The tools lines name what Step 4 calls.** `ExitWorktree` joins the frontmatter `allowed-tools` in `plugins/gh-solo/skills/pr-flow/SKILL.md` and its tools line. The tools line of `plugins/gh-solo/skills/pr-flow/workflows/merge.md` names `EnterWorktree` and `ExitWorktree`, which it omits today.

## Decisions

**Remove before delete, not the reverse.** Both orders worked on `izkreny/groupifico`. The tiebreak is the refusal case: removing first leaves the branch and its worktree both standing when removal refuses, so nothing is half done. Deleting first would strand a detached worktree whose branch is already gone. It also drops the detach, so the order is stated once and no bullet is left carrying a step that no longer runs.

**`ExitWorktree` gets the same authorisation sentence `EnterWorktree` has.** The tool's own description says to call it only when asked. Where the owner's global instructions authorise it, that covers this; where they do not, the harness prompts.

**The fast-forward refuses less than "any dirty tree".** Uncommitted changes the update does not touch ride along, since `--ff-only` refuses only on divergence or an overwrite. Step 4 says so, so the refusal it reports is the one that happens.

**`.agents/gh-solo.md` here is untouched.** The fourth criterion is about a served repository's config. Whether `izkreny/groupifico` drops its sentence is that repository's call.

**The plugin moves 4.10.0 to 4.11.0.** The issue is a bug, but merge now removes a worktree and moves the trunk, which is new behaviour for every installer. Per `AGENTS.md`, that is a minor.

## Steps

- Rewrite Step 4 of `plugins/gh-solo/skills/pr-flow/workflows/merge.md`: the order, both cases, leaving the branch worktree, and both refusals.
- Update Step 6 of the same file so the confirm line names the removed worktree and where the trunk landed.
- Name `EnterWorktree` and `ExitWorktree` in the tools line of that file.
- Add `ExitWorktree` to `allowed-tools` and the tools line in `plugins/gh-solo/skills/pr-flow/SKILL.md`.
- Bump `plugins/gh-solo/.claude-plugin/plugin.json` to 4.11.0.
- In a throwaway repository under the scratchpad, run the new sequence and watch each refusal fire.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-10-01_GHI-127_merge-worktree-cleanup.md`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `python3 scripts/manifest-check.py`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`

None of these gates reads the git sequence Step 4 prescribes. The throwaway-repository run is what does: removal exits 128 on an untracked file and 0 on ignored files alone, removal frees the branch for `git branch -D`, and `--ff-only` refuses on a local trunk commit. `ExitWorktree` returning to the launch directory was tested on `izkreny/groupifico`, per the issue's first comment, and is not re-run here.

## Open questions

**Does "once the branch is deleted" in the first criterion fix the order?** Read literally it asks for delete, then remove. The Technical notes leave the order open. I recommend remove first, per *Remove before delete* above, and read the criterion as "by the end of the step".
