> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Check the plan overview against the branch's own record

Closes #34. `plugins/gh-solo/skills/pr-flow/workflows/merge.md` Step 2 already reads `## Plan overview`, but only against `## Steps` and against the fix commits' *subjects*. It gains the branch's whole record: every commit on the branch, body as well as subject, and the acceptance criteria of the issue the `Closes` line names. A contradiction is reported with both sides quoted, and the gate still reports and asks rather than refusing or rewriting.

It is the third branch of the #26 stack, cut from #16's tip and stacked on PR #68.

## Why the subject alone was never going to catch it

**On #31 the contradiction was entirely in a commit body.** Its overview asserted that `plugins/gh-solo/.claude-plugin/plugin.json` "already reads `2.1.0`" and that "the version does not move again"; commit `e79f98c` on the same branch is `feat!: move the plugin to 3.0.0 (#29)` with a `BREAKING CHANGE:` body. The subject alone carries `3.0.0`, so a sharp reader would have caught that one - but three further claims in the same paragraph had gone stale with nothing in any subject to contradict them, and the whole paragraph was one edit away from `main`, permanently.

**The body is where a branch says what it did and why**, which is exactly the material an overview can contradict. Reading subjects only is reading the table of contents.

## Where the commits come from, and why not `git log`

**`gh pr view <pr-number> --json commits` returns `messageHeadline` and `messageBody` per commit**, and Step 1 of that workflow already makes a `gh pr view` call, so `commits` joins its field list at no extra request.

**`git log` is the wrong source here even though Step 2 currently names it.** Step 1 says in its own words that the branch may not be in any local tree - it has a fallback for exactly that case - so a gate resting on `git log` is a gate that cannot run at the one moment it matters. The local read stays where it is, in Step 1's unpushed-commit check, which is about the local tree by nature.

**The issue's criteria need no new read either.** Step 2 already fetches `gh issue view <issue-number> --json body` for the criteria audit, so comparing the overview against them is a second use of a body already in hand.

## What the gate does with what it finds

**Both sides quoted, always**: the overview's sentence, and the commit subject-and-body or the criterion that disagrees with it. #34's second criterion asks for this so the owner settles it in one glance instead of re-deriving which claim went stale, and it is the difference between a useful report and "the overview may be out of date".

**It reports and asks. It never rewrites the overview and it never refuses on it** - the posture Step 2 already takes with a leftover `## Open questions` entry and an over-long capped section. Rewriting would put the gate's own prose into a permanent commit message on `main`, and refusing would block a branch over a judgement that is the owner's.

**Keeping the overview current still belongs elsewhere**, to the rule in `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` opening "A fix that changes what the `## Plan overview` describes", implemented at Step 5 of `plugins/gh-solo/skills/implement/workflows/fix.md`. This branch is about the door catching the miss, and that sentence stays where it is.

## The limit, written into the workflow rather than discovered later

**This catches drift between two records, never a shared error.** The overview, the commit bodies and the issue's criteria are written by the same agent, so a misunderstanding written consistently into all three passes every comparison here and always will. Closing that needs something that reads the code and did not write it, which is the reviewer's `spec` axis rather than a gate at the door.

**It goes in the workflow because a limit nobody wrote down gets rediscovered as a bug.** A later reader who finds the gate green on a branch that was wrong throughout should find the sentence saying why, rather than concluding the comparison is broken.

## Steps

- Add `commits` to Step 1's `gh pr view --json` field list in `plugins/gh-solo/skills/pr-flow/workflows/merge.md`, and say there that it exists for Step 2's overview comparison so nobody prunes it as unused.
- Rewrite Step 2's `## Plan overview` bullet in that file: the comparison runs against every commit on the branch, subject and body, and against the acceptance criteria of the issue the `Closes` line names.
- Say in that bullet that the commits come from the `gh pr view` read rather than from `git log`, and why: Step 1's own fallback establishes that the branch may not be in any local tree.
- State the report's shape there: both sides quoted, the overview's sentence against the commit or criterion that disagrees, and the gate reporting and asking exactly as it does for a leftover `## Open questions` entry.
- Write the shared-error limit into the same bullet, naming the reviewer's `spec` axis as what would close it and this door as what cannot.
- Move `plugins/gh-solo/.claude-plugin/plugin.json` to `4.4.0`, per the version argument below.

**Out of scope: anything that reads the diff.** Step 2 says the diff stays out of bounds because `merge` runs in the session that wrote the code, and that exclusion is what keeps this a gate rather than a review of its own work.

## Why the version moves the minor

The gate reads more than it did and reports a contradiction it previously could not see, which is new behaviour rather than a broken interface: nothing that passed before fails now except a branch that was already carrying a stale overview, which is the point. `AGENTS.md` puts new behaviour at the minor.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, run as its own command with its exit code read before anything that depends on it.
- `python3 scripts/version-check.py 8408158..HEAD`, given the range explicitly: the default `origin/main...HEAD` spans two prior bumps on the branches below this one in the stack, so it passes whether or not this branch moved its own version.
- `python3 scripts/manifest-check.py`, owed because the version bump touches one of the two manifests it compares.

**`plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` is deliberately absent.** `.agents/gh-solo.md` owes that bench after an edit to `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`, and this branch does not touch it. Listing it anyway would be a box that exercises nothing, which is the shape of a gate that gets waved through.

**What none of these gates can see, and #34's fourth criterion:** this is a judgement gate rather than a script, so no bench can exist for it and none should be written - a script that decided whether two paragraphs of prose contradict each other would be a second, worse reviewer. What is done instead is to run the stated comparison against the #31 fixture: commit `e79f98c` is in this repository's history, and the overview sentences it contradicts are quoted verbatim in #34's own body. If the comparison as written does not report that pair, it discriminates nothing and the wording is wrong. The result is recorded in the implementation handoff on this pull request, not as a checkbox, because it has no exit code.

## Open questions

None.

## Settled

- **Is the #31 fixture acceptable as a reconstruction?** Yes. A pull request's body edits are not in git and GitHub exposes no history for them, so the pre-correction overview cannot be fetched; what exists is #34's own verbatim quotes of it, beside commit `e79f98c`, still in `main`. **Settled by the `go 73` command running rather than by a decision the owner stated**, on the recommendation this section replaced - so it is the weakest of the settlements on this branch and the one to revisit first if the exercise proves thin.
