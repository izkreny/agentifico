> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Check a stacked bump against its parent

Issue #304 holds the acceptance criteria. This plan says how.

## Approach

The gate command reads the pull request's base and hands it to the script as a range, per N1's first form: `python3 scripts/version-check.py "origin/$(gh pr view --json baseRefName -q .baseRefName)...HEAD"`. On a stacked branch the base is the branch below it, so the range holds that branch's own commits only. On a branch based on `main` the range is `origin/main...HEAD`, which is today's default.

`scripts/version-check.py` stays as it is. It already takes a range, and the form keeps it a `git`-only script. `AGENTS.md` stays as it is too, since "a patch satisfies `scripts/version-check.py`" is still true.

The command needs a fetch first. `origin/<base>` is as fresh as the last fetch, and a stale one puts the parent's later commits back in the range. With no pull request the substitution is empty, and the script exits 2, since the range then names no base branch. That is a loud refusal, not a false pass.

A sweep branch keeps the trunk form, `python3 scripts/version-check.py`. Its version is measured from the trunk, per *What the sweep does* in `.agents/gh-solo.md`. In a patch release that version sits below the branch under it: a trunk at 5.2.1 under two patched branches is 5.2.3 below the sweep, and the sweep sets 5.2.2. The parent form would refuse that, and the trunk form checks what the tag needs.

The bench gets a synthetic stack. A lower branch edits a package and moves its version. An upper branch is cut from it and edits the package without moving it. The parent range must refuse, and the trunk range passes, which records the gap this closes.

## Steps

- ::S1:: Add the synthetic stack to `scripts/test-version-check.sh`: `lower...upper` must exit 1 saying the version stayed, and `main...upper` must exit 0
- ::S2:: In *The version check* of `.agents/gh-solo.md`, make the parent form the stated command, say to fetch first, and say what an empty base does
- ::S3:: Replace the paragraph saying nothing catches per-branch bumping with one saying why the base is the range, and that a sweep branch keeps the trunk form
- ::S4:: Point the docs check paragraph's reference at the new paragraph, since it cites the old one by its lead sentence

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-28_GHI-304_check-stacked-bump-against-parent.md`
- ::V2:: `bash scripts/test-version-check.sh` exits 0, after the new `lower...upper` case was watched failing with its range swapped to `main...upper`, the pre-fix form
- ::V3:: `python3 scripts/version-check.py "origin/$(gh pr view --json baseRefName -q .baseRefName)...HEAD"` exits 0 after a `git fetch`, and prints what the bare `python3 scripts/version-check.py` prints on this `main`-based branch
- ::V4:: `node skills/agents-guru/scripts/check.js AGENTS.md .agents/gh-solo.md .agents/dependencies.md`
- ::V5:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`

No gate runs the parent form on a real stacked branch of this repository, since this branch is the bottom of its stack. The bench's synthetic stack stands in for it.

## Open questions

None.

## Settled

None yet.
