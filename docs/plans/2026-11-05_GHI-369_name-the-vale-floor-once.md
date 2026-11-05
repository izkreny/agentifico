> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Name the Vale floor once in gh-solo

Issue #369 holds the acceptance criteria. This plan says how.

## Approach

`MIN_VALE` in `plugins/gh-solo/skills/pr-flow/scripts/plan-check.py` stays the one place gh-solo names a Vale version. The Vale line in the Requirements of `plugins/gh-solo/README.md` drops its `3.23` and says the check needs the version that script names as `MIN_VALE`, or later. The refusal already names the version and points back at the README's Requirements, so each file owns one half and neither needs the other's number.

The plan check and its bench stay as they are: the floor does not move, and the bench's stubs follow `MIN_VALE` only when it does.

The change is a patch, since an installer's requirement is unchanged: `plugins/gh-solo/.claude-plugin/plugin.json` moves from 4.13.2 to 4.13.3.

## Steps

- Rewrite the Vale line in the Requirements of `plugins/gh-solo/README.md` to name no version and point at `MIN_VALE` in `plugins/gh-solo/skills/pr-flow/scripts/plan-check.py`
- Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` to 4.13.3

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-plan-check.sh`
- `! git grep -niE 'vale.*\b3\.[0-9]+\b' -- plugins/gh-solo ':!plugins/gh-solo/skills/pr-flow/scripts/plan-check.py' ':!plugins/gh-solo/skills/pr-flow/scripts/test-plan-check.sh'`

The grep was watched failing on the README as it stands, which names 3.23. These gates cannot see whether the README line still reads clearly to an installer, which is the owner's call on the rendered file.

## Open questions

None.
