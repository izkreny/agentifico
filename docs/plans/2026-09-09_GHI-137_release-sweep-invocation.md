> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Record how a release sweep is invoked

Closes #137.

## The problem

A package's release sweep is `/skills-maker review <package-dir>`, and the invocation alone does not start one. The run has to be told that it is reading a whole package ahead of a tag, and that every finding needs a short id the triage record and the fix commits can cite. Neither is derivable from the tree, so both get retyped from memory each release, and a sweep started without them reports with nothing to reference a finding by. `.agents/gh-solo.md` already carries *The skill review is its own issue, not a branch's gate*, which is where the sweep's facts live.

## The approach

Add a block to that section carrying the paste and the facts around it. The paste is what the owner types; the prose around it is what the paste cannot say.

**The paste is a fenced block, and the invocation and its context travel together in it.** `skills/skills-maker/SKILL.md` sets `disable-model-invocation: true`, so the skill fires only when the owner types `/skills-maker`, and the context has to be in the same message as the invocation or the run never sees it. A fence is what makes it pasteable rather than reconstructed, which is the whole point of recording it.

**The context in the paste is two sentences: read the whole package rather than a diff, this being the sweep that precedes the `<name>_<version>` tag; and give every finding a short id the issue and the fix commits can cite.** Those are the two things the run cannot get from the workflow or from the tree.

**What the run does with a package root is not restated here, it is pointed at.** `skills/skills-maker/workflows/review.md` Step 1 owns how a path covering several skills is read and Step 4 owns what the report carries, so this file names them rather than carrying a second copy that can drift. `<package-dir>` is `plugins/<name>` or `skills/<name>`, which `AGENTS.md` already defines under *How a package is released*.

**Every finding is fixed on the sweep's own branch.** Nothing is deferred and nothing is declined, because the tag asserts the package was read whole, so a defect the reading found and left standing makes that assertion false. The one release that triages is a hotfix, per *A hotfix runs the sweep too* in `AGENTS.md`, which owns that exception; this block points at it rather than restating its terms.

**The run is inline in a session the owner keeps open**, and that session is what `skills/skills-maker/workflows/review.md` Step 5 wants when it later judges the fix commit: it resumes the reviewer that produced the findings instead of starting a fresh review, and a closed session leaves nothing to resume.

**Report-only is deliberately absent.** `skills/skills-maker/workflows/review.md` Step 4 already says to propose the fix and apply it only when asked, so a copy here would be a second home for a rule that has one and would silently override the workflow if that default moved.

**The block says what to read and what to produce, and nowhere says what the run is not.** A sweep is a review, so telling a run it is not a branch review argues against the output being asked for; naming the tag on its own would imply the deliverable is a clean package rather than a reading, which is why the tag appears as the reason for the whole-package read rather than as the goal.

**Nothing about the sweep's own history goes in.** What prompted this is on the issue, and a file read as instructions carries the rule rather than the occasion.

## Steps

- Add the invocation block to *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md`, placed with the sweep material rather than beside the paragraph about a branch's round.
- Grep the addition for a sentence that says what the run is not, and for a restatement of anything `skills/skills-maker/workflows/review.md` already carries.
- Run the verification gates below.

## Verification

- The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- `python3 scripts/version-check.py`, which for a change confined to repository-level paths reports no package version moved.

What those gates cannot see is the wording. Neither script can tell a pointer from a copy, and neither can find a negation that reads as licence, so acceptance criteria five and six are settled by a reader rather than by an exit code, which is the review round on this branch.

`scripts/manifest-check.py` is not a gate here, since the branch touches no manifest, and the skills-maker suite is not either, since it touches nothing under `skills/`.

## Open questions

None.
