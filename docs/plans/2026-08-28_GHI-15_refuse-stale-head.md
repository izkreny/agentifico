> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Refuse a post when the head has moved

Implements #15. The whole change is in `plugins/gh-solo/skills/pr-flow/workflows/review.md`: record the head before the reviewer is spawned, compare it before the payload is built, and refuse on a difference.

## Why now

A round on `izkreny/groupifico#190` read head `31e33c2`, a push landed while it was reading, and the post refused with `422 Line could not be resolved`. The refusal is atomic and correct - nothing lands half-posted - but it fires after a reviewer has already spent a ten-minute read, and the guidance at that point names the wrong cause. `plugins/gh-solo/skills/pr-flow/workflows/merge.md` already does the analogous check in its Step 1, comparing `gh pr view <pr-number> --json headRefOid` against the local ref, so the pattern exists in this skill and this workflow simply lacks it.

## What changes, and what deliberately does not

**Step 1 gains one read.** Before the reviewer is spawned, `gh pr view <pr-number> --json headRefOid` records the head the reviewer is about to read. It is one field on a call the workflow's shape already makes cheap.

**Step 2 gains a first item, ahead of everything else in the step.** Read the head again and compare. On a difference, refuse with the verdict line and name re-spawning as what resumes, and never attempt the post: it cannot succeed for any finding anchored to a changed region, and its failure destroys the whole round rather than the affected finding. It goes first in the step because the id read below it is a paginated request that a moved head makes pointless.

**The `422` diagnosis is written down at the post, not at the build.** The two refusals in Step 2 have different causes and the issue's evidence quotes them as one. The script's build refusal genuinely does mean a malformed findings file, and that sentence stays exactly as it is; what has no guidance at all today is the `gh api` call in item 4, where a `422` reading `Line could not be resolved` means a moved anchor. The sentence lands there, so each refusal names its own cause.

**`plugins/gh-solo/skills/pr-flow/references/review-protocol.md` is not touched.** It owns the round's sequence, the cast and the conclusions; a head comparison between two commands is mechanics, and mechanics live in the workflow. The protocol already says the workflow may not disagree with it, and nothing here does.

**The uncapped re-spawn is out of scope.** `plugins/gh-solo/skills/pr-flow/workflows/review.md` answers a refused post by re-spawning the reviewer with no limit, and this branch leaves that sentence alone: it is #16, and folding a cap in here would put two decisions behind one review.

## The one thing this check cannot survive

The recorded head lives in the session that spawned the reviewer. Steps 1 to 5 are one turn by that workflow's own statement, so within a round that is sound, but a session that dies between the spawn and the post takes the recorded value with it and the check cannot run at all. The refusal is a pre-check that saves a wasted post, never a durable record, and the plan states that limit rather than inventing a marker file to carry it.

## Steps

- In *Step 1 - Review* of `plugins/gh-solo/skills/pr-flow/workflows/review.md`, record the head before the spawn, with the command and one sentence on why it is kept.
- In *Step 2 - Post*, add the comparison as the step's first item, with the refusal wording and re-spawning named as what resumes.
- In *Step 2 - Post* item 4, add the sentence that a `422` reading `Line could not be resolved` is a moved anchor rather than a malformed findings file.
- Add the head comparison to the *Rules* list at the end of the file, since every other never-do in this workflow appears there.
- Leave the build-refusal sentence, `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` and the re-spawn wording untouched.

## Verification

Gates, each with an exit code:

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, the command `.agents/gh-solo.md` states for this repository, read by exit code and never through a pipe.
- `grep` finds the `headRefOid` read in *Step 1 - Review*, the comparison in *Step 2 - Post*, and both in the *Rules* list.
- `grep` finds the build-refusal sentence unchanged, so the two refusals have not been merged into one diagnosis.
- `git diff --stat` names exactly one file.

Judgement, no exit code:

- `[owner]` `/skills-maker review plugins/gh-solo/skills/pr-flow`, per *The skill review is manual, and stays manual* in `.agents/gh-solo.md`.

What these gates cannot see: whether an agent following the new Step 2 actually refuses. The change is instructions rather than code, so nothing here executes it, and no test in this repository can be made to fail on the pre-fix wording. That is the owner's read of the diff, and it is the reason the `[owner]` box above is not optional.

## Open questions

- **Does this branch bump `gh-solo` to `2.0.1` in `plugins/gh-solo/.claude-plugin/plugin.json`, or does the version move once when a release is tagged?** The package scheme in `AGENTS.md` says each package carries its own version and ships on its own `<name>_<version>` tag, but not whether every fix branch moves it. Five more issues are open against this plugin, so bumping per branch means five more bumps before anything is tagged. The marketplace entry carries no version field, so only one file is affected either way.

## Settled

None yet.
