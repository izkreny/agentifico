> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Review and version skills-maker (#96)

The epic's whole-package sweep, and the top branch of its stack. Cut from `feat/GHI-115_lint-prose-with-vale` at `1b3b4a4`, it stands 79 commits ahead of `main` with every child of #95 in its ancestry - #54, #57, #75, #77, #88, #101 and #115 - which is what makes a review here a review of what actually ships.

## The run is the owner's, not this branch's

`skills/skills-maker/SKILL.md` carries `disable-model-invocation: true`, the frontmatter as #57 left it. So the issue's conditional resolves to its first branch: the sweep is started by the owner typing `/skills-maker review skills/skills-maker`, and the findings land in that session. Nothing here invokes the skill, and its `skills/skills-maker/workflows/review.md` is not hand-read as a substitute - the flag exists to stop exactly that.

The run is inline, and the flag rather than #88 is why. That issue's inline rule binds a path covering several skills, and this path is one skill's own directory, so the read is the unchanged single-skill shape. What forces inline is that no subagent can load the skill either. That does not cost Step 5 of `skills/skills-maker/workflows/review.md` anything, because what that step wants is the reviewer that produced the findings judging the fixes with its context intact, and the owner's own session is that reviewer for as long as it stays open. The fixes land outside it and the fix commit goes back to it for the verdict, which keeps the reviewer separate from the author without a subagent anywhere. What the flag actually costs is only the option of fanning the sweep out, which a single-skill path never wanted.

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
- Fix every finding the sweep raises, whichever file it lands in and whether or not a child of this epic touched it. Nothing is deferred and nothing is declined: a tag asserts the package was read whole, and leaving a found defect standing is what would make that false. `AGENTS.md` defers only on a hotfix, where keeping the fix small is the point.
- Land the fixes grouped by defect class rather than by file, so a class fixed in one pass stays consistent across the package.
- Trim the comments under `skills/skills-maker/scripts/`: the file headers that restate the runner, the config and the target shapes shrink to one sentence pointing at `skills/skills-maker/workflows/check.md`, and every surviving comment says why rather than what.
- Read the package for a rule this epic states twice, and for a cross-reference pointing at a rule one of the children moved.
- Read `skills/skills-maker/README.md` against what the skill now does, the widened argument shapes included.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `2.1.0` to `3.0.0`.
- Run every gate in `## Verification` and tick each as it passes.

## Verification

- `node skills/skills-maker/scripts/check.js skills/skills-maker`, from the repository root, exits zero.
- `npm --prefix skills/skills-maker test`.
- `npm --prefix skills/skills-maker run lint`.
- The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- `python3 scripts/version-check.py`.

**What none of these gates see.** Whether a trimmed comment still carries the why it existed for, rather than merely being shorter. Whether the sweep read the skill whole, which is the assertion the tag rests on and which no exit code can supply. The version check is the one whose pass proves least here: `.agents/gh-solo.md` records that its `origin/main...HEAD` range resolves through a merge base predating the whole stack, so a lower branch's bump satisfies it and this branch's `3.0.0` holds by discipline rather than by gate. There is no CI in this repository, so the checks on the pull request will report nothing, and that is the expected answer rather than a missing one.

## Open questions

None.

## Settled

- **Where do the Vale rule files belong?** In `skills/skills-maker/assets/`, per the owner on 2026-09-08. The Agent Skills specification names that directory for static resources including configuration and data files, and the rule files are machine-read definitions rather than prose a reader loads or code the check runs, so `skills/skills-maker/references/` and `skills/skills-maker/scripts/` are both wrong, and the styles directory they sat in was a fourth top-level one the specification already had a home for. `StylesPath` points at that directory itself, because Vale requires the path to hold the style's own subdirectory. It is the second breaking change on this branch, which `3.0.0` already covers.
- **Do the tool configs move too?** No. `skills/skills-maker/biome.json` and `skills/skills-maker/.vale.ini` can move, but the assets directory is defined for templates, images and data files, and a linter configuration is none of the three: the rules are data, the configs belong beside the manifest they configure. `skills/skills-maker/SKILL.md`, `skills/skills-maker/package.json` and `skills/skills-maker/package-lock.json` cannot move at all, since npm installs its dependencies beside the manifest and Node resolves imports by walking up from the scripts directory, so the scripts would stop finding them.
- **Does the first criterion's "every other child of the epic merged" mean "below it in the stack"?** It can mean nothing else, per the owner on 2026-09-08. `gh stack merge` lands the stack at once, so no child merges before the top branch, which makes the criterion unsatisfiable as written rather than ambiguous. All seven children sit in this branch's ancestry, which is the checkable form of what it was reaching for. #139 carries the rule for the next epic.
- **Which part of the version moves?** The major: `2.1.0` to `3.0.0`, per the owner on 2026-09-08. It was `2.2.0` while the change read as added behaviour, which SM-02, SM-03 and SM-13 are. RF10 then found that dropping `Bash(npx skills:*)` withdraws a grant an installed copy has, and `AGENTS.md` decides the part by what the change does to whoever installs: taking a grant away is the breaking side of that test. `Bash(ruby:*)` and `Bash(bash:*)` were withdrawn earlier in the stack, inside the 1.x to 2.x span, so they belong to that major rather than to this one.

- **Does the tag criterion belong on this issue at all?** No. Dropped from #96 by the owner on 2026-09-08, leaving it to #95's *Done when*, which already carried the line; #58, the `gh-solo` sweep, had carried no such criterion either.
- **Where is the sweep run recorded?** The owner runs `/skills-maker review skills/skills-maker` and ticks the issue's first criterion. Every box under `## Verification` is a gate with an exit code, so the run appears in the prose beneath them rather than as a box only the owner could close.
- **The issue's pre-#101 figures were corrected on #96 itself** on 2026-09-08, so it now reads `metadata.version` 2.1.0 and 230 comment lines to 1211 total across twelve files. The baseline section above stands as first measured and is not rewritten, because a plan records intent at plan time.
