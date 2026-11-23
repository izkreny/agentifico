> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Sweep gh-solo before epic #78 merges

Issue #81 holds the acceptance criteria, as the last child of epic #78. This plan says how.

## The stack

Its `blockedBy` names #467, which is open. This is the stacked exception in *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`. The branch is cut from `feat/GHI-467_start-every-workflow-by-its-word` at `11dbba1`, and that branch is the pull request's base. Every other child of #78 sits in its ancestry, checked branch by branch against `origin`. The trunk sitting ahead of this branch is normal for a stack, so nothing fast-forwards.

## The standard

The trunk is one commit ahead of the stack, and it touches neither `skills/agents-guru` nor `plugins/gh-solo`. `skills/agents-guru` is at 9.0.0 both here and on the trunk. So the sweep holds the plugin to the rules in this tree, and the check runs once.

## The sweep

One reviewer subagent reads the whole of `plugins/gh-solo` inline, as one document, following `skills/agents-guru/workflows/review.md` from this tree by path. The run covers the `setup` skill and the files that belong to no skill: the manifest, the agents, the hooks and the README. The prompt is the invocation in the issue's N1. The reviewer reports and edits nothing. Its id is kept, so its Step 5 can judge the fixes.

The record goes on #81 in two comments, per *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md`: the findings comment, one row per `AGF{n}`, then the verdicts comment once Step 5 has run. Each fix commit cites its id. A fix outside the package, in `AGENTS.md` or `.agents/gh-solo.md`, lands here as the sweep's standing exception.

Two checks the reviewer cannot be trusted to make alone get a direct read: the README still describes the plugin as it now is, the `setup` skill and the keys included, and no cross-reference points at a rule the epic removed, the `--squash` fallback above all.

## The version

The stack carries `!` commits, so the release is a major measured from the trunk's 5.2.1. `version` in `plugins/gh-solo/.claude-plugin/plugin.json` moves from 5.2.13 to 6.0.0 in its own commit, once the fixes are in.

## Steps

- ::S1:: Run the reviewer over `plugins/gh-solo`, and keep its id.
- ::S2:: Post the findings comment on #81.
- ::S3:: Read the README and grep the package for references to removed rules, and add what turns up as findings.
- ::S4:: Fix each finding, citing its id in the commit, or have the resumed reviewer refute it per Step 5.
- ::S5:: Watch each new or changed check fail before trusting it.
- ::S6:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` to 6.0.0.
- ::S7:: Resume the reviewer on the fix commits for a verdict per id, and post the verdicts comment on #81.

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-22_GHI-81_sweep-gh-solo-before-epic-78-merges.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-docs-check.sh`
- ::V7:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-plan-check.sh`
- ::V8:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`
- ::V9:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-watch.sh`
- ::V10:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-read-config.sh`
- ::V11:: `bash plugins/gh-solo/skills/setup/scripts/test-setup.sh`
- ::V12:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-settings-check.sh`
- ::V13:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-criteria-check.sh`
- ::V14:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-keys-check.sh`
- ::V15:: `bash plugins/gh-solo/hooks/test-ask-before-trunk-push.sh`
- ::V16:: `node skills/agents-guru/scripts/check.js AGENTS.md .agents/gh-solo.md .agents/dependencies.md`

V1 names this plan alone, since the repository's substitution would also hand it the plans below this branch. The version check's range takes in the bumps below this branch, so only S6 holds this branch's bump. Every plugin bench is listed, since which files the fixes touch is not known yet. V16 is owed only if a fix lands in `AGENTS.md` or `.agents/`, and passes without exercising anything otherwise. Most fixes are prose, which no gate reads for meaning: the resumed reviewer's verdicts judge those.

## After the review round

The Vale re-mine is the last task, run after the round's fixes are pushed and before the merge, per *How a phrase list grows* in `skills/agents-guru/references/maintaining.md`. It reads everything merged since `gh-solo_5.2.1`, skipping what an earlier re-mine record already covers, plus every other pull request in the epic's stack, this issue's findings, this pull request's threads and this branch's commits. Every new token goes on an `agents-guru` issue opened from this one, and none lands on this branch. The issue records what was read and what was skipped.

## Open questions

None.

## Settled

None yet.
