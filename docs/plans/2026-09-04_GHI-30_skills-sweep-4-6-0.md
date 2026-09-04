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

**The sweep itself moves no version.** A read changes nothing, so a branch whose sweep is clean passes `scripts/version-check.py` without exercising it, and that is the correct answer for such a branch rather than a reason to bump.

## Open questions

- Whether the `gh-solo_4.6.0` tag lands on this branch's squash commit or after `gh stack merge` has landed the whole train. The stack merges atomically onto one `main` commit per branch, so both are defensible; the tag's meaning is that the package was read whole, which is true from this branch's tip onward either way.
- What to do about branch commits carrying a scope, which `plugins/gh-solo/skills/tracker/references/formats.md` reserves for the pull request title. It was raised as a convention finding on #86 and left open deliberately: the practice runs through every branch in the stack, so it is package-wide and sweep-shaped rather than one branch's to fix.

## Settled

- None yet.
