> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Prove each criterion by a keyed test

Issue #287 holds the acceptance criteria. This plan says how.

## Approach

The convention goes under *Writing good acceptance criteria* in `plugins/gh-solo/skills/tracker/references/issue-shape.md`. A test proves criterion `AC{n}` of issue `#{issue-number}` when one line of a file under the repository's test glob carries `GHI-{issue-number}` and `AC{n}` as whole tokens. A whole token has no letter, digit or underscore next to it, which is what `git grep -w` matches. Any line counts, a comment included: the search reads text and cannot tell a test's name from a comment beside it. The same paragraph states the owner-read marker, `::AC{n}::READ::`, for a criterion the owner proves by reading rather than by a test. The Keys table in `plugins/gh-solo/skills/tracker/references/formats.md` gets a row for the marker, as it has one for `::RF{n}::CLOSED::`.

The gate is a new step in `plugins/gh-solo/skills/pr-flow/workflows/ready.md`, after the gate audit. That step owns the config key, a `Test files: <glob>` line in the repository's config file. Without the line the gate is off, and the verdict says so. With it, the step reads the criterion keys off the issue the `Closes` line names. It takes ticked and unticked `::AC{n}::` lines, and skips removed lines and `READ` ones. For each key it runs one search at the PR's head commit:

```bash
git grep -n -w -F -e GHI-<issue-number> --and -e AC<n> <head-sha> -- ':(glob)<glob>'
```

`--and` keeps both tokens on one line. Tried on a fixture, it matched `GHI-287 AC1` and missed `AC10`, `GHI-2870`, `GHI-28`, `GHI-287_AC1` and the two tokens on separate lines. A key with no match refuses the flip, and the refusal lists those keys. A pass prints each key beside the `file:line` that names it. An issue with no keyed criteria passes, and the verdict says that too. The step runs only `gh` and `git`, and reads rather than runs, so the file's read-only posture holds.

`plugins/gh-solo/skills/pr-flow/workflows/merge.md` Step 2 repeats the check by pointing at that step, so a test deleted after `ready` is caught at the door. The per-repo config bullet in `plugins/gh-solo/skills/pr-flow/SKILL.md` names the new key beside the reviewer keys and points at the same step.

This repository's own `.agents/gh-solo.md` gains no `Test files:` line, per Q1, so the gate is off here.

A new gate is new behaviour for an installer, and a repository without the key sees no change. So the version moves a minor: `plugins/gh-solo/.claude-plugin/plugin.json` goes from 4.16.0 to 4.17.0.

## Steps

- ::S1:: State the convention, that any line counts, and the `::AC{n}::READ::` marker under *Writing good acceptance criteria* in `plugins/gh-solo/skills/tracker/references/issue-shape.md`
- ::S2:: Add the marker's row to the Keys table in `plugins/gh-solo/skills/tracker/references/formats.md`, pointing at that paragraph
- ::S3:: Add the criteria-test step to `plugins/gh-solo/skills/pr-flow/workflows/ready.md`: the `Test files:` key, the gate off without it, the key extraction, the search, the refusal listing keys, the pass mapping each key to its `file:line`, and the no-keys pass stated in the verdict
- ::S4:: Repeat the check at the door in `plugins/gh-solo/skills/pr-flow/workflows/merge.md` Step 2, pointing at that step
- ::S5:: Name the `Test files:` key in the per-repo config bullet of `plugins/gh-solo/skills/pr-flow/SKILL.md`, pointing at that step
- ::S6:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` to 4.17.0

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-06_GHI-287_prove-each-criterion-by-a-keyed-test.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `git grep -qF -- 'Test files:' plugins/gh-solo/skills/pr-flow/workflows/ready.md`, seen red on the tree before this branch
- ::V7:: `git grep -qF -- '::READ::' plugins/gh-solo/skills/tracker/references/issue-shape.md`, seen red on the tree before this branch
- ::V8:: The refusal seen firing: the step's key extraction on issue 268 prints its keyed criteria, and the step's search for each, with the glob `plugins/gh-solo/**/test-*.sh` at this branch's head, exits 1, since no bench names a key
- ::V9:: The pass seen: the step's search for the example key the S1 paragraph gives, with the glob `plugins/gh-solo/skills/tracker/references/*.md`, exits 0 and prints that paragraph's `file:line`

V1 names this plan alone, as on #269, since the substitution would also hand it the unkeyed plans below this branch. The version check's range takes in the bumps below this branch, so only S6 holds this branch's bump. No issue here carries a `READ` marker, so the extraction's skip is read in the diff rather than run. Whether a matching line is a real test, rather than a comment claiming one, is a reviewer's call that no gate makes.

## Open questions

None.

## Settled

- ::Q1:: **Does this repository's `.agents/gh-solo.md` gain the `Test files:` line on this branch?** No. Its benches name no keys, so the gate would refuse every keyed issue, this epic's included; the owner settled it in the session.
- ::Q2:: **Does a comment naming the keys count as proof?** Yes, any line in a test file counts, and S1 says so plainly; the owner settled it in the session.
