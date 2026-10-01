> 🤖 Written by AI --- read/modified by izkreny! 🤓

# A structural gate for plan files

Issue [#49](https://github.com/izkreny/agentifico/issues/49). It is not part of an epic, so the branch is cut from `main` and not stacked. It has no blockers.

## What changes

**The wording is fixed first.** `plugins/gh-solo/skills/pr-flow/workflows/open.md` states the plain-bullets rule once, for every required plan section. Its `## Verification` bullet stops calling plan entries boxes: an entry is a bullet in the plan and becomes a box only in the PR body.

**A script is the net.** `plugins/gh-solo/skills/pr-flow/scripts/plan-check.py` (new) takes plan file paths. It checks each filename itself, then runs Vale over the files with the plugin's own style. It prints one line per failure, with the file, the line where one applies, and what is wrong.

**The plugin gets its first Vale style.** `plugins/gh-solo/.vale.ini` (new) sets `StylesPath` to `plugins/gh-solo/assets/` (new). The style is `GhSolo`, in `plugins/gh-solo/assets/GhSolo/` (new), with one rule per file:

| Rule | Extends | What it fails |
| --- | --- | --- |
| `plugins/gh-solo/assets/GhSolo/PlanSteps.yml` (new) | `occurrence`, `min: 1` | no `## Steps` heading |
| `plugins/gh-solo/assets/GhSolo/PlanVerification.yml` (new) | `occurrence`, `min: 1` | no `## Verification` heading |
| `plugins/gh-solo/assets/GhSolo/PlanVerificationList.yml` (new) | `script` | a `## Verification` with no list item before the next heading |
| `plugins/gh-solo/assets/GhSolo/PlanCheckbox.yml` (new) | `existence` | a task-list marker anywhere |

**The workflow runs the script before the commit.** Step 3 of that workflow runs it on the plan file by path, before `git commit`. Its PR body template gains a `## Verification` entry for it, so `ready` and `merge` audit it.

**The plugin moves 4.9.1 to 4.10.0.** The new gate is new behaviour for every installer, and Vale becomes a requirement beside Python 3.

## Decisions

**Every rule but the filename rule is Vale's.** The issue's criterion puts only the filename rule in the script, because Vale reads no filenames. The list rule needs to skip fenced code, since a `# comment` inside a fence reads as a heading. A regex cannot do that, so it is a Vale `script` rule, in Tengo. It was prototyped on Vale 3.23.0 and reports the right line after a line holding emoji.

**The heading rules read the `raw` scope.** On `heading.h2`, `occurrence` counts per heading, so every other `##` heading fails it. On `raw` it counts once per file. The cost is that a `## Steps` line inside a fenced block satisfies the rule. No plan has one, and a plan with only a fenced copy of the heading is not a realistic slip.

**The checkbox rule reads `raw` too, per the issue.** It therefore also fails a checkbox inside a fenced block. A plan has no reason to carry one, so that stays a failure.

**A missing heading is reported without a line.** Vale reports an `occurrence` miss on line 1, which points at nothing. The script prints the file and the message alone for those two rules.

**Exit codes match the docs check's scheme:** 0 clean, 1 a plan failed, 2 a usage error. No file argument is a usage error, never a scan of the tree, so an empty `$(git diff …)` substitution cannot pass silently. A missing Vale, a Vale older than 3.23, or one that cannot run also exits 2. Each says what to install.

**The minimum is Vale 3.23**, the version the rules were tested on. It matches what `skills/skills-guru/scripts/check.js` requires.

**The script finds its config from its own location**, as `plugins/gh-solo/.vale.ini` (new) relative to the script, with `--no-global`. A served repository's own Vale config is never read.

## Steps

- Add `plugins/gh-solo/.vale.ini` (new) and the four rules under `plugins/gh-solo/assets/GhSolo/` (new).
- Write `plugins/gh-solo/skills/pr-flow/scripts/plan-check.py` (new): the filename rule, the Vale version check, the Vale run and the report.
- Write `plugins/gh-solo/skills/pr-flow/scripts/test-plan-check.sh` (new): one case per failure, a clean case, a Vale-absent case with Vale off `PATH`, and a Vale-old case with a stub on `PATH`. Fixtures carry real-shaped filenames.
- Watch the bench fail: break each rule and the version check in turn, see its case go red, and restore.
- In `plugins/gh-solo/skills/pr-flow/workflows/open.md`: state the plain-bullets rule for every required section, run the script in Step 3 before `git commit`, add the template's `## Verification` entry, and name the script in the tools line.
- In `plugins/gh-solo/skills/pr-flow/SKILL.md`: add the script to the tools line and the supporting-files table.
- In `plugins/gh-solo/README.md`: add the plan check to the Python 3 bullet and add a Vale 3.23 bullet beside it.
- In `.agents/gh-solo.md`: name the plan-check command under *Check commands*, and its bench under *The benches*.
- Bump `plugins/gh-solo/.claude-plugin/plugin.json` to 4.10.0.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `python3 scripts/manifest-check.py`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-plan-check.sh`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-09-02_GHI-8_anchorless-findings.md` exits 1, and so does the same command on `docs/plans/2026-09-04_GHI-63_rnp-split-and-delta.md`.
- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py` over every other plan under `docs/plans/` exits 0. The two are excluded by `_GHI-8_` and `_GHI-63_`, underscores included, so `GHI-84` and `GHI-88` stay in.
- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py` with no argument exits 2.

The gates cannot see whether the reworded workflow would have stopped the three offending plans from being written. That is the review's to judge. Nothing runs the script in a served repository but the workflow step and the PR body entry.

## Settled

- **May this `gh-solo` branch edit `.agents/gh-solo.md`, a repository-level file?** Yes. The owner allowed the edit on this branch, in the session that wrote this plan.

## Open questions

None.
