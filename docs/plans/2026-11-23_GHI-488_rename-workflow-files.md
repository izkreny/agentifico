> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Rename the reply and plan workflows' files

Issue #488 holds the acceptance criteria. This plan says how.

## Approach

Two `git mv` commands rename the files: `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` (delete) becomes `plugins/gh-solo/skills/pr-flow/workflows/reply.md` (new), and `plugins/gh-solo/skills/pr-flow/workflows/open.md` (delete) becomes `plugins/gh-solo/skills/pr-flow/workflows/plan.md` (new). They land in a commit of their own, with no content change, so git follows each as a rename.

On `main` at `f9326b2`, 52 lines in 20 files name an old path. Every one is written `workflows/<old-name>.md`, and none writes the bare filename, so one substitution per name covers them all. Four of the 20 files are the Vale rules under `plugins/gh-solo/assets/GhSolo/` whose names start with Plan, and their `message:` strings name the file. Those are rule edits, so the plan check's bench runs too.

No table in the 20 files lines its columns up, so a cell that grows changes no other row.

`.agents/gh-solo.md` names the file once, under *An epic child's blocker is its stack parent, not a wait*. The owner approved that edit on #482, so it lands here. Since a repository-level file changes, the repository files owe their own agents-guru run.

The version moves from 6.0.0 to 6.0.1: the words the owner types do not change, and nothing outside the plugin reads these paths.

## Steps

- ::S1:: `git mv` the two workflow files to their new names, in a commit of their own
- ::S2:: Rewrite every pointer to either old path under `plugins/gh-solo`, the four Vale rule messages included
- ::S3:: Rewrite the one pointer in `.agents/gh-solo.md`
- ::S4:: Move the version in `plugins/gh-solo/.claude-plugin/plugin.json` to 6.0.1

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-23_GHI-488_rename-workflow-files.md`
- ::V2:: `git grep -nE 'workflows/(discuss|open)\.md' -- plugins .agents` exits 1, after it was seen exiting 0 with 52 lines on the base `f9326b2`
- ::V3:: `node skills/agents-guru/scripts/check.js plugins/gh-solo` exits zero
- ::V4:: `node skills/agents-guru/scripts/check.js AGENTS.md .agents/gh-solo.md .agents/dependencies.md` exits zero
- ::V5:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans` exits zero, after it was seen failing on the tree where only S1 had landed
- ::V6:: `bash plugins/gh-solo/skills/pr-flow/scripts/test-plan-check.sh`
- ::V7:: `python3 scripts/version-check.py`
- ::V8:: `python3 scripts/manifest-check.py`

No gate can see whether a pointer still reads well next to the new name, for example a sentence that names the plan workflow and then its file, and now says "plan" twice.

## Open questions

None.

## Settled

None yet.
