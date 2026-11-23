> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Key the plan's steps and gates

Issue #268 holds the acceptance criteria. This plan says how.

## Approach

*Keys* in `plugins/gh-solo/skills/tracker/references/formats.md` gains rows for `S`, `V` and `Q`. Its numbering rule already covers a pull request. The table gets one new sentence: a single `Q` sequence covers `## Open questions` and `## Settled`, and a moved question keeps its key. The `::RF{n}::CLOSED::` marker gets its own row. It issues no number, because it names an `RF` id that is already issued.

`plugins/gh-solo/skills/pr-flow/workflows/open.md` shows the keys in two places: the Step 2 guidance, as `- ::S1:: …` in the plan, and the PR body template, as `- [ ] ::S1:: …`. Questions are `- ::Q1:: …` in both. Each workflow that ticks, audits or moves an item gets one clause that points at *Keys*, and none of them restates the rule.

The plan check gains two Vale rules in the plugin's own style. `PlanKeys` refuses any top-level list item under `## Steps`, `## Verification` or `## Open questions` that does not open with its own section's key. `PlanKeyRepeat` refuses a key that opens two list items anywhere in the plan. A fenced block is skipped, as in the existing rules. A section reading `None.` holds no item, so it passes.

`plugins/gh-solo/skills/pr-flow/scripts/post-review.py` reads `::RF(\d+)::` anywhere in a body. A lookahead stops it from matching `::RF{n}::CLOSED::`, and the bare-id report leaves the marker out too. The bench gets a `verify` case: a verdict reply stands in for a thread that was never posted. That case passes today and should fail.

The reviewer may not read the tracker's files. So `plugins/gh-solo/skills/reviewer/workflows/full.md` gets its own sentence, next to the one that names a criterion by `AC{n}`.

A plan without keys is refused from now on, but nothing an installer has already written breaks, so the version moves a minor: `plugins/gh-solo/.claude-plugin/plugin.json` goes from 4.14.0 to 4.15.0.

## Steps

- ::S1:: Add the `S`, `V` and `Q` rows, the one-`Q`-sequence sentence and the `::RF{n}::CLOSED::` row to *Keys* in `plugins/gh-solo/skills/tracker/references/formats.md`
- ::S2:: Key the steps, gates and questions in Step 2 and in the PR body template of `plugins/gh-solo/skills/pr-flow/workflows/open.md`, and name the key rules in its Step 3 account of the plan check
- ::S3:: Add `plugins/gh-solo/assets/GhSolo/PlanKeys.yml` (new) and `plugins/gh-solo/assets/GhSolo/PlanKeyRepeat.yml` (new), and name them in the docstring of `plugins/gh-solo/skills/pr-flow/scripts/plan-check.py`
- ::S4:: Key the fixture in `plugins/gh-solo/skills/pr-flow/scripts/test-plan-check.sh`, and add the refusal and `None.` cases, watching each refusal fail on a mutant first
- ::S5:: Tick a step or a gate by its key in `plugins/gh-solo/skills/implement/workflows/implement.md` and `plugins/gh-solo/skills/implement/workflows/fix.md`, and have implement's plan-record settle move a question under its own `Q{n}`
- ::S6:: Name an unticked step or gate, and a leftover question, by its key in `plugins/gh-solo/skills/pr-flow/workflows/ready.md` and `plugins/gh-solo/skills/pr-flow/workflows/merge.md`
- ::S7:: Move a settled question under its own `Q{n}` in `plugins/gh-solo/skills/pr-flow/workflows/discuss.md`
- ::S8:: Open a verdict that closes a finding with `::RF{n}::CLOSED::` in `plugins/gh-solo/skills/pr-flow/workflows/review.md`
- ::S9:: Stop `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` from reading the marker as an issued id, with a case in `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` watched failing first
- ::S10:: Name a plan step, gate or question by its key in the spec brief of `plugins/gh-solo/skills/reviewer/workflows/full.md`
- ::S11:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` to 4.15.0

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-06_GHI-268_key-the-plans-steps-and-gates.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-plan-check.sh`
- ::V7:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`
- ::V8:: `git grep -qF -- '- [ ] ::S1::' plugins/gh-solo/skills/pr-flow/workflows/open.md`
- ::V9:: `git grep -qF -- '::RF{n}::CLOSED::' plugins/gh-solo/skills/pr-flow/workflows/review.md`

V1 names this plan alone. The repository's substitution would also hand it the plans of #369 and #267, which sit below this branch and carry no keys. Per N3 of the issue, that gap is accepted rather than handled. Both greps were watched failing on the tree before this branch. The version check's range takes in the bumps below this branch, so only S11 holds this branch's bump. No gate can see whether each pointer clause reads clearly where it sits.

## Open questions

None.
