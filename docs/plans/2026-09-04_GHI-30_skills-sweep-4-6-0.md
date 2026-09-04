> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Review the gh-solo skills once the epic closes (#30)

## Context

**This branch is the top of stack #72, so it already contains every open child of #26 except this one.** `fix/GHI-24_reviewer-read-head`, `fix/GHI-16_cap-review-passes`, `feat/GHI-34_overview-vs-record`, `feat/GHI-63_rnp-split-and-delta` and `fix/GHI-19_gate-inflight-push` are all beneath it, and #65 has left the epic because it verifies a released build rather than changing one. So the package this branch reads is the package the epic produces.

**#30's first criterion says "merged" and the truth here is "contained in this branch".** They differ in record and not in content: `gh stack merge` lands the stack atomically, so `main` moves straight from the version installers have to the swept one and the intermediate states are never fetchable by anyone. Reading the criterion as *contained* is what makes the sweep possible before the tag rather than after it, which is the order `.agents/gh-solo.md` requires.

**The sweep is a read, not a diff.** Every child of #26 edited `plugins/gh-solo/skills/pr-flow/workflows/review.md` and most edited `plugins/gh-solo/skills/pr-flow/references/review-protocol.md`, each on a branch that never saw the others. No per-branch round can see what that did, because a round judges a diff and the question here is whether the files still read as one document.

## Approach

**The package is read whole, in one session, inline.** No subagent per skill: a contradiction between `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` and `plugins/gh-solo/skills/pr-flow/workflows/review.md` is invisible to any reader that sees only one of them, and splitting the read by skill is exactly the split that hides it.

**It runs in the two acts `AGENTS.md` defines for a plugin**, because `/skills-maker review` takes a skill path rather than a package root and #54 has not landed. Act one is that command over each skill under `plugins/gh-solo/skills/`; act two is a read of the files belonging to no skill, which act one cannot reach: the manifest, the agents, the hooks and the README.

**The findings and their triage are written into this file**, in a later `docs:` commit, the way #55's sweep recorded its own. They are produced in a session working directory outside this repository, so the plan is their only public record and the triage is the decision trail #30's second criterion asks for.

**The session that sweeps is not the session that wrote this code**, and it will be running an installed `gh-solo` several versions behind the tree it is reading. So it reads `skills/skills-maker/` and `AGENTS.md` from the tree rather than from memory or from its own installed copy.

## Steps

- Run act one, `/skills-maker review` over each skill under `plugins/gh-solo/skills/`, against the package at this branch's tip.
- Run act two, a read of the manifest, the agents, the hooks and the README, which belong to no skill.
- Record every finding in this file with its id, what it claims and where, whether or not it will be fixed.
- Confirm that `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` and `plugins/gh-solo/skills/pr-flow/workflows/review.md` do not contradict each other, which is #26's own criterion and has nowhere else that checks it.
- Confirm that no cross-reference in the package points at a rule a child of #26 removed.
- Fix what is fixed, grouped by defect class rather than by file, so a class fixed in one pass stays consistent.
- Record on #30 what is declined and why.
- Move `plugins/gh-solo/.claude-plugin/plugin.json` if a fix earns it, and leave it where it is if none does.

## Verification

- The docs-check command in `.agents/gh-solo.md`, whose exit code is read rather than its output.
- `python3 scripts/version-check.py`.
- `python3 scripts/manifest-check.py`, owed if any fix touches a manifest.

**None of them sees whether the package was read whole**, which is the only thing this branch is for. They see that paths resolve, that a version moved where one was owed and that the two manifests agree. What a clean run here cannot tell anyone is whether a rule one child added still agrees with one another child removed, and no gate with an exit code can: that judgement is the sweep, and the record of it is the triage in this file.

**A sweep that lands fixes moves the version those fixes earn.** A read on its own changes nothing and would leave every version where it was, which is the clean case; this sweep found defects and fixed thirteen of them, two of which change what an agent does, so the package moves to 4.7.0 and `scripts/version-check.py` is exercised rather than merely passed.

## Findings

Fourteen, from one inline read of all fifty files. Thirteen are fixed on this branch, one commit per defect class; the fourteenth is deferred to #89.

**It ran as one pass rather than the two acts above.** `/skills-maker review` was pointed at the plugin root and the whole package was read in one session, files belonging to no skill included, which is the shape #88 asks the command to support. The two-act split was the workaround for that gap and it turned out not to be needed; the finding at row 1 is one no split by skill could have produced.

| # | What it claims, and where | Triage |
|---|---|---|
| 1 | `plugins/gh-solo/skills/reviewer/workflows/rescope.md` told the re-review to keep an unpushed-line defect out of the findings file, while `plugins/gh-solo/skills/pr-flow/workflows/review.md` says to leave it in. `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` can only hold a finding the file carries, so the hold-and-release route was dead for the case it was built for | fixed |
| 2 | *The pass cap* grants the owner a further reviewer pass and no workflow could reach it: five sites called it theirs to authorise, none said what authorises it | fixed |
| 3 | "three times at most for the life of a pull request" is the per-round figure, false the moment the grant at row 2 is used | fixed |
| 4 | "a PR number in, one findings file out" survives at three sites, a premise the head pin made false | fixed |
| 5 | Three citations name `plugins/gh-solo/skills/tracker/references/standards.md` for rules that live in `plugins/gh-solo/skills/tracker/references/tracker-fields.md`, or that the cited file explicitly disclaims holding | fixed |
| 6 | The post cap and the PR body cap each cite the other as the authority for their shared number, so neither is one | fixed |
| 7 | Three inventories have not caught up with the watch workflow, its script and the post caps reference | fixed |
| 8 | `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` cites the discuss workflow for the only-the-literal-command rule, which `plugins/gh-solo/skills/pr-flow/workflows/watch.md` owns and the discuss workflow disclaims | fixed |
| 9 | `plugins/gh-solo/skills/pr-flow/workflows/watch.md` refers three times to steps it does not have; they belong to `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` | fixed |
| 10 | `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` has lost a clause boundary in the sentence about the watch | fixed |
| 11 | Three sites call the tracker standards "the three below", a count of adjacent content and a position claim | fixed |
| 12 | Three instruction files justify a live rule with history the reader cannot locate | fixed |
| 13 | `plugins/gh-solo/skills/pr-flow/SKILL.md` is 3,754 words against a cap of roughly 3,500 | deferred to #89 |
| 14 | The package's only shouted line, and one missing article | fixed |

**What the sweep confirmed rather than found.** `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` and `plugins/gh-solo/skills/pr-flow/workflows/review.md` do not contradict each other on the round's sequence, the pin, the caps or the gates, which was #26's own criterion. The contradictions are between the reviewer skill and `pr-flow`, and inside `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` itself. No section had become an essay.

**Row 13 is deferred because it is a restructure.** Every other fix leaves the file layout alone; this one moves a section out of a skill body and changes what loads when the skill fires. The thirteen fixes trim that file rather than growing it and it is still over, so nothing about the deferral is provisional.

## Open questions

- None.

## Settled

- **Where the tag lands.** On the last squash commit of the train, per *An epic's work is stacked, and the stack is the release train* in `AGENTS.md`, which already answers it: `gh stack merge` lands the stack atomically and one tag is cut. The question was which of two defensible readings applied; that file states one.
- **The tag is `gh-solo_4.7.0`.** The sweep landed fixes rather than coming back clean, and two of them change what an agent does, so the package's version moved and the tag moved with it.
- **Branch commits carrying a scope.** #84 owns it, opened for exactly this and scoped to `.agents/gh-solo.md`. It is not this branch's to fix: the practice runs through every branch in the stack, and the record it needs is a repository-level one that moves no package version.
