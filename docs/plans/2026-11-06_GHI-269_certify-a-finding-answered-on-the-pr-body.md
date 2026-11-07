> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Certify a finding answered on the PR body

Issue #269 holds the acceptance criteria. This plan says how.

## Approach

A finding can be answered by a record rather than code: a gate re-run, or a `## Verification` item edited to name a red run. That answer is a body edit, so it has no commit to put a `Closes:` line on. The claim gets a home where the round already records each answer: the closing reply in the finding's thread and the fix map, both in `plugins/gh-solo/skills/implement/workflows/fix.md`. Each names the `S{n}` or `V{n}` key that answers `RF{n}`, beside a commit or instead of one. The `Closes:` line stays commit-only.

The rescope prompt gains one address: which key claims which id. It carries the key and never the item's text, in `plugins/gh-solo/skills/pr-flow/workflows/review.md` Step 5 and in step 5 of `plugins/gh-solo/skills/pr-flow/references/review-protocol.md`. The reviewer agent in `plugins/gh-solo/agents/reviewer.md` lists it as a sanctioned address, so the reviewer does not report it as contamination. The rescope entrance in `plugins/gh-solo/skills/reviewer/SKILL.md` names it too.

`plugins/gh-solo/skills/reviewer/workflows/rescope.md` admits exactly one read of the pull request: the line that carries the named key. The command is in the file, and its `--jq` filter is what keeps the rest of the body out of the reviewer's context. It exits non-zero when no line or two lines carry the key, and that verdict is `closed: false`. A key-answered finding gets a verdict only, since a body item has no file and line to anchor a new finding on.

The other end of the defect goes in Step 2 of `plugins/gh-solo/skills/pr-flow/workflows/open.md`. A new test's `## Verification` item names its seen-red run inside the item. Where the test passes on the pre-fix code, the item names the mutation that turns it red. Inside the item, because the re-review reads that one line and nothing else.

A new claim form and a new re-review read are new behaviour for an installer, and nothing written before breaks. So the version moves a minor: `plugins/gh-solo/.claude-plugin/plugin.json` goes from 4.15.0 to 4.16.0.

## Steps

- ::S1:: Let a closing reply and the fix map name an `S{n}` or `V{n}` key as the answer to an `RF{n}`, beside or instead of a commit, in `plugins/gh-solo/skills/implement/workflows/fix.md`
- ::S2:: Carry which key claims which id in the rescope prompt, key only, in `plugins/gh-solo/skills/pr-flow/workflows/review.md` Step 5 and step 5 of `plugins/gh-solo/skills/pr-flow/references/review-protocol.md`
- ::S3:: Add the key to the sanctioned rescope addresses in `plugins/gh-solo/agents/reviewer.md`, its `description`, and the rescope entrance of `plugins/gh-solo/skills/reviewer/SKILL.md`
- ::S4:: Admit the one keyed line, with its extraction command, and the verdict rule for a key-answered finding in `plugins/gh-solo/skills/reviewer/workflows/rescope.md`
- ::S5:: Ask a new test's `## Verification` item to name its seen-red run, and the mutation where the test passes on the pre-fix code, in Step 2 of `plugins/gh-solo/skills/pr-flow/workflows/open.md`
- ::S6:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` to 4.16.0

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-06_GHI-269_certify-a-finding-answered-on-the-pr-body.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `git grep -qF -- 'select(contains(' plugins/gh-solo/skills/reviewer/workflows/rescope.md`, seen red on the tree before this branch
- ::V7:: `git grep -qF -- 'seen-red' plugins/gh-solo/skills/pr-flow/workflows/open.md`, seen red on the tree before this branch
- ::V8:: `git grep -qF -- 'V{n}' plugins/gh-solo/agents/reviewer.md`, seen red on the tree before this branch
- ::V9:: The extraction command from `plugins/gh-solo/skills/reviewer/workflows/rescope.md`, with PR 418 and `V1`, exits 0 and prints one line; with `V99`, a key PR 418 does not carry, it exits 1

V1 names this plan alone, as on #268: the substitution would also hand it the unkeyed plans below this branch. The version check's range takes in the bumps below this branch, so only S6 holds this branch's bump. No gate can see whether a reviewer obeys the read limit; the filter only makes obeying it the easy path.

## Open questions

None.
