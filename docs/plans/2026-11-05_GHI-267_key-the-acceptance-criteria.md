> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Key the acceptance criteria

Issue #267 holds the acceptance criteria. This plan says how.

## Approach

The key rule is written once, as a new paragraph under *Writing good acceptance criteria* in `plugins/gh-solo/skills/tracker/references/issue-shape.md`. It mirrors *Ids* in `plugins/gh-solo/skills/pr-flow/references/review-protocol.md`: a criterion's key is issued as `::AC{n}::` and named in prose as `AC{n}`. Keys start at 1 and follow the list's order. A criterion added later takes the next free number, even when the list then reads out of order. No key is ever renumbered or reused.

The issue body template shows each criterion as `- [ ] ::AC{n}:: …`. The epic template stays unkeyed: the first criterion names the issue template, and nothing ticks, audits or reviews an epic's criteria by key.

Each tracker, implement and merge file that writes, checks, ticks or audits a criterion gets one sentence pointing at that paragraph, so none of them restates it:

- `plugins/gh-solo/skills/tracker/workflows/create.md` issues the keys at Step 6, and again under *Finishing a draft*, where a draft's criteria are first written.
- `plugins/gh-solo/skills/tracker/workflows/validate.md` gains two fail rows for issues: every criterion carries a key, and no key appears twice. They are mechanical, like *Criteria are checkboxes*, so they are fails rather than Notes. The issue's own note accepts that issues opened before this fail them.
- `plugins/gh-solo/skills/implement/workflows/implement.md` ticks a criterion by finding its key, not by matching its wording.
- `plugins/gh-solo/skills/pr-flow/workflows/merge.md` names an unticked criterion by its key when it reports one.

The reviewer's files are the exception, because the reviewer is forbidden to read the tracker's or pr-flow's files. So `plugins/gh-solo/skills/reviewer/workflows/full.md` states its own sentence in the spec brief: a spec finding about a criterion names it by the `AC{n}` key the issue body carries. The findings-file example in `plugins/gh-solo/skills/reviewer/SKILL.md` names "the issue's third acceptance criterion". That ordinal paraphrase is what the key replaces, and left standing it would contradict the brief, so it becomes `AC3`.

`plugins/gh-solo/skills/tracker/workflows/status.md` and `plugins/gh-solo/skills/tracker/workflows/state.md` mention criteria too, but no criterion of this issue names them. They stay out of this diff.

The plugin gains new behaviour without breaking an installer, so the version moves a minor: `plugins/gh-solo/.claude-plugin/plugin.json` goes from 4.13.3 to 4.14.0.

## Steps

- Add the key rule under *Writing good acceptance criteria* in `plugins/gh-solo/skills/tracker/references/issue-shape.md`, and key the criteria in its issue body template
- Issue the keys in `plugins/gh-solo/skills/tracker/workflows/create.md`, at Step 6 and under *Finishing a draft*
- Add the missing-key and duplicate-key fail rows to `plugins/gh-solo/skills/tracker/workflows/validate.md`
- Tick a criterion by its key in `plugins/gh-solo/skills/implement/workflows/implement.md`
- Name an unticked criterion by its key in `plugins/gh-solo/skills/pr-flow/workflows/merge.md`
- Name the criterion by its key in the spec brief of `plugins/gh-solo/skills/reviewer/workflows/full.md`, and in the findings-file example in `plugins/gh-solo/skills/reviewer/SKILL.md`
- Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` to 4.14.0

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `python3 scripts/manifest-check.py`
- `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- `git grep -qF -- '- [ ] ::AC1::' plugins/gh-solo/skills/tracker/references/issue-shape.md`
- `! git grep -n 'third acceptance criterion' -- plugins/gh-solo/skills/reviewer`

Both greps were watched failing on the tree as it stands. The second is scoped to the reviewer skill, because a bench fixture in `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` carries the same words as test data rather than as a rule. Because this branch is stacked on #369, the version check's range takes in #369's bump too, so it cannot catch a missed bump here. That bump is held by this plan's last step alone. No gate can see whether each pointer sentence reads clearly where it sits. That is the owner's call on the diff.

## Open questions

None.
