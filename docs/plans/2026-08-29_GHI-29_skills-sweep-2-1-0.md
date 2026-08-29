> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Review the gh-solo skills before the 2.1.0 tag

Implements #29, the second child of epic #26. `plugins/gh-solo/.claude-plugin/plugin.json` already reads `2.1.0` after #25 merged, and the `gh-solo_2.1.0` tag is not pushed. This branch is what stands between the two: the package's whole-skill sweep, its triage, and the fixes the triage keeps.

## Why the sweep is a branch at all

`.agents/gh-solo.md` says a whole-skill review is its own issue, one per package, opened before that package's `<name>_<version>` tag, and never a `## Verification` box on a branch. So the sweep has nowhere else to run: a branch that changes one skill file cannot carry it, because a whole-file review returns findings that branch never touched, and a gate that reports something unrelated every time gets waved through. The release is the trigger that fires where the habit does not.

The tag is also not bookkeeping. A review round spawns the reviewer from the *installed* plugin, so the `effort: high` pin #25 wrote does nothing on this machine until `gh-solo_2.1.0` is tagged and the plugin updated. Every round run before then still spawns at `xhigh` and still reads the unconditional fetch list, which is the cost #26 exists to cut.

## The sweep runs in a fresh-context subagent, and the agent id is kept

`skills/skills-maker/SKILL.md` and `skills/skills-maker/workflows/review.md` both want a reader who has not already reasoned its way to why every line looks the way it does. This session wrote this plan and will write the fixes, so it is the wrong reader twice over.

Keeping the spawned agent's id is not tidiness either. `skills/skills-maker/workflows/review.md` Step 5 re-verifies the fixes by resuming that same agent rather than starting a second audit, so it judges each fix against what the finding originally meant. Losing the id costs a full second read and a weaker verdict, and it is lost by default.

The path cited is `skills/skills-maker/`, this repository's own copy, which `AGENTS.md` sanctions under *Skill files follow the skills-maker rules* precisely so it can be cited rather than duplicated.

## What the sweep reads, and what it is not

The target is the package `plugins/gh-solo/` and every file in it: the skills under `plugins/gh-solo/skills/`, the reviewer agent under `plugins/gh-solo/agents/`, the hook under `plugins/gh-solo/hooks/`, and each README written for a human reader. `skills/skills-maker/workflows/review.md` Step 1 asks for every file whatever the layout, because a routing skill's defects are usually contradictions between two files and are invisible when only one is read.

Out of scope, and worth naming so the diff does not grow into them: every other package. `skills/skills-maker/` is a package with its own label, its own version and its own sweep issue when its own tag comes; so are the other entries under `skills/`. A finding about the reviewing skill itself is recorded and handed to that package, never fixed here.

## Triage is a decision per finding, and a declined finding still gets written down

Every finding ends in one of two places: fixed on this branch, or declined with the reason recorded on #29. A third outcome, quietly dropping one, is what makes the next sweep re-derive it.

Declined is a legitimate outcome and needs its reason kept where the next sweep will find it, which is the issue rather than this plan or a commit message. Two shapes are expected: a finding that is style rather than defect, which `skills/skills-maker/workflows/review.md` Step 4 asks to be separated explicitly; and a finding whose fix is a design change large enough to deserve its own issue, which is a decline here plus a new issue rather than a silent expansion of this branch.

## The version does not move again

`2.1.0` is already in `plugins/gh-solo/.claude-plugin/plugin.json` and unreleased, so fixes this branch lands ship under it. A second bump would mean tagging a version nobody could have installed, and the tag this issue exists to unblock is the one already named.

## The tag and the observation after it are not this branch's to close

Two of #29's acceptance criteria live past the merge. The tag has to point at the squash commit on `main`, which does not exist while this branch is open, and the confirmation that a round spawns the reviewer at `effort: high` needs the installed plugin updated to that tag. Neither is a gate this branch owes, and neither appears in `## Verification` below, where every box has to close before merge. `## Open questions` is where the handling is proposed.

## Steps

- Spawn a fresh-context subagent over `plugins/gh-solo/`, following `skills/skills-maker/workflows/review.md` from Step 1, and keep the agent id it returns.
- Record the findings it returns, ranked by consequence, in a comment on #29 so the triage has a fixed reference that survives the branch.
- Decide each finding: fix here, or decline. Record every decline with its reason in the same comment thread on #29, and open a separate issue for any decline whose fix is a design change.
- Land the kept fixes, in as few commits as make sense, each with its own conventional type since a sweep's fixes are not all one kind of change.
- Resume the same subagent per `skills/skills-maker/workflows/review.md` Step 5 with the fix commits, and ask for a per-finding CLOSED / NOT CLOSED / REGRESSED verdict, its judgement on any fix that took a different design than it proposed, and a regression pass over the changed files. Report only, no edits.
- Act on any NOT CLOSED or REGRESSED verdict, then re-verify again by the same route.
- Leave `plugins/gh-solo/.claude-plugin/plugin.json` at `2.1.0`, and touch `.claude-plugin/marketplace.json` only if a finding moves the plugin's description, which is the one field the two manifests share.
- Record a finding about any package other than `plugins/gh-solo/` on that package's own tracker, and do not fix it here.

## Verification

Gates, each with an exit code:

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, the command `.agents/gh-solo.md` states for this repository, read by exit code and never through a pipe.
- `python3 -c "import json,sys; d=json.load(open('plugins/gh-solo/.claude-plugin/plugin.json')); sys.exit(0 if d['version']=='2.1.0' else 1)"`, which fails if a fix moved the version.
- The two manifests still carry the same description string, compared as values rather than read side by side, since `.agents/gh-solo.md` records that they have drifted before.
- `git diff --stat origin/main` names only this plan and files a recorded finding names, and nothing under `skills/`.
- `gh issue view 29 --comments` shows the findings list and a recorded outcome for every entry in it.

**Conditional benches are added to the pull request body when their condition fires, not before.** `.agents/gh-solo.md` names three that depend on what the sweep touches: `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` after any edit to `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`, `bash plugins/gh-solo/hooks/test-ask-before-trunk-push.sh` after any edit to `plugins/gh-solo/hooks/ask-before-trunk-push.py`, and an `mmdc` render of any mermaid diagram in a README that changes. Listing them as boxes at plan time would put boxes in the body that may never have a condition to close them, and `plugins/gh-solo/skills/pr-flow/workflows/ready.md` refuses on an empty box.

**No `[owner]` box.** Every box here has to close before merge, and both `ready` and `merge` refuse on an empty one, so a box the owner alone can close blocks its own branch. The judgement below is prose for that reason.

What these gates cannot see: whether the triage was right. Every gate above proves that a decision was recorded and that the diff stayed inside its package; none of them can distinguish a finding correctly declined as style from one declined because fixing it was inconvenient. That is the owner's read of the #29 comment against the diff, and it is the whole substance of this issue. The gates also cannot see the sweep's coverage: a subagent that read six files of the package and reported cleanly is indistinguishable at the exit code from one that read all of them, which is why the report is asked to name its file set.

## Open questions

- **How do the two post-merge acceptance criteria on #29 close?** They cannot tick on this branch: the tag has to point at the squash commit on `main`, and the `effort: high` observation needs the plugin updated to that tag. `plugins/gh-solo/skills/pr-flow/workflows/merge.md` reports an unticked criterion and asks rather than refusing, so the proposal is that the owner acknowledges both at the door and they tick when the tag is pushed. The alternative is splitting them into a follow-up issue that #29 blocks, which keeps the tracker honest at the cost of an issue whose whole content is two commands.
- **Does a finding whose fix is a design change get declined here, or does it grow this branch?** The plan above declines it and opens an issue, on the grounds that a sweep's job is to find and triage rather than to become the vehicle for whatever it finds. The cost is that the tag ships with a known defect recorded against it. Where the finding is severe enough that tagging over it is wrong, the answer has to be the other one, and the threshold is the owner's.

## Settled

None yet.
