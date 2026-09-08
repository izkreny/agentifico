> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Review and version skills-maker (#96)

The epic's whole-package sweep, and the top branch of its stack. Cut from `feat/GHI-115_lint-prose-with-vale` at `1b3b4a4`, it stands 79 commits ahead of `main` with every child of #95 in its ancestry - #54, #57, #75, #77, #88, #101 and #115 - which is what makes a review here a review of what actually ships.

## The run is the owner's, not this branch's

`skills/skills-maker/SKILL.md` carries `disable-model-invocation: true`, the frontmatter as #57 left it. So the issue's conditional resolves to its first branch: the sweep is started by the owner typing `/skills-maker review skills/skills-maker`, and the findings land in that session, where the inline read #88 mandates puts them beside the files they are about. Nothing here invokes the skill, and its `skills/skills-maker/workflows/review.md` is not hand-read as a substitute - the flag exists to stop exactly that.

That makes this branch the sweep's **triage**, the shape #58 took for `gh-solo`: the review produces a reading, the branch produces the fixes.

## Baseline, measured on 2026-09-08 before any change

| Gate | Result |
|---|---|
| `node skills/skills-maker/scripts/check.js skills/skills-maker` | 7 files, 0 issues, 0 warnings |
| `npm --prefix skills/skills-maker test` | 120 pass, 0 fail |
| the docs-check command `.agents/gh-solo.md` states | 72 files, clean |
| `python3 scripts/version-check.py` | 1 package touched, no problems |

So every mechanical gate is already green, and the sweep's yield will be judgement rather than lint: what the whole-file read sees and a diff cannot.

Two figures the issue carries are a pre-#101 baseline rather than a target. `metadata.version` is `2.1.0`, not the `1.1.0` the Overview names, because the children below moved it twice. The comment measurement of 168 lines to 610 was taken before #101 replaced the scripts with markdownlint custom rules, so it describes a file set that no longer exists; re-measured today the package's committed JavaScript is 230 comment lines to 1211 total across twelve files.

## Steps

- Take the owner's sweep findings from `/skills-maker review skills/skills-maker` and write them down with an id each, so the triage and the fixes have something stable to reference.
- Triage every finding: fixed here, or declined with the reason recorded on #96. A finding touching none of the files this epic changed is deferred to the next release, unless it is a defect this epic introduced.
- Land the fixes grouped by defect class rather than by file, so a class fixed in one pass stays consistent across the package.
- Trim the comments under `skills/skills-maker/scripts/`: the file headers that restate the runner, the config and the target shapes shrink to one sentence pointing at `skills/skills-maker/workflows/check.md`, and every surviving comment says why rather than what.
- Read the package for a rule this epic states twice, and for a cross-reference pointing at a rule one of the children moved.
- Read `skills/skills-maker/README.md` against what the skill now does, the widened argument shapes included.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `2.1.0` to `2.1.1`.
- Run every gate in `## Verification` and tick each as it passes.

## Verification

- [ ] `node skills/skills-maker/scripts/check.js skills/skills-maker`, from the repository root, exits zero.
- [ ] `npm --prefix skills/skills-maker test`.
- [ ] `npm --prefix skills/skills-maker run lint`.
- [ ] The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- [ ] `python3 scripts/version-check.py`.

**What none of these gates see.** Whether a deferral was the right call, since a deferral is a decision and the only check on it is a reader weighing the reason. Whether a trimmed comment still carries the why it existed for, rather than merely being shorter. Whether the sweep read the skill whole, which is the assertion the tag rests on and which no exit code can supply. The version check is the one whose pass proves least here: `.agents/gh-solo.md` records that its `origin/main...HEAD` range resolves through a merge base predating the whole stack, so a lower branch's bump satisfies it and this branch's `2.1.1` holds by discipline rather than by gate. There is no CI in this repository, so the checks on the pull request will report nothing, and that is the expected answer rather than a missing one.

## Open questions

- **Does the tag criterion belong on this issue at all?** It cannot close before the merge that closes #96: `AGENTS.md` cuts the tag by hand, after the sweep issue is closed, on the package's own last squash commit, and the epic's *Done when* already carries the same line. #58, the `gh-solo` sweep, carried no such criterion. Recommend dropping it from #96 and leaving it to #95. Not edited here, because it is a tracker edit on an issue this branch does not own.
- **Where is the sweep run recorded?** The issue's first criterion is the run, ticked by whoever runs it. Every box in `## Verification` is a gate with an exit code, so the run appears in the prose beneath them instead of as a box that only the owner could close.
- **Is `2.1.1` the right move?** Assumed, since the comment trim alone guarantees a change under the package. A triage finding that changes what an installed copy does would make it a minor instead.
- **Does the first criterion's "every other child of the epic merged" mean "below it in the stack"?** Read that way, per the issue's own Overview and the release train in `AGENTS.md`; all seven are in this branch's ancestry, and none of them can merge before it.
