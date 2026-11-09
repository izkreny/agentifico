> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Swap the symlink install line on export

Issue [#433](https://github.com/izkreny/agentifico/issues/433), a child of epic #444. It is blocked by #436, which is open. This is the stacked exception in *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`. The branch is cut from `feat/GHI-436_add-the-sweep-re-mine-tokens`, and that branch is the pull request's base. The block is serialisation on the shared `metadata.version` line, not a need for #436's work. The trunk sitting ahead of this branch is normal for a stack, so nothing fast-forwards.

## What changes

**Step 3 of `skills/agents-guru/workflows/export.md` gains one bullet, on the install line.** The exported copy's `README.md` installs from the destination repository, with that repository's own install command. It never keeps the canonical path and the symlink, whichever copy Step 1 made canonical. The bullet points at *How it is installed* in `skills/agents-guru/references/readme.md` rather than restating it.

That file's symlink line, at line 19, stays as it is: it is right for a skill that never leaves its machine. Step 5's grep exception already excepts the repository name in the install command, so it needs no edit. No check rule is added, per the issue's N2.

**`metadata.version` in `skills/agents-guru/SKILL.md` moves from 9.1.0 to 9.1.1.** The change fixes what an export ships and adds no capability, so it is a patch.

## Steps

- ::S1:: Add the install-line bullet to Step 3 of `skills/agents-guru/workflows/export.md`
- ::S2:: Move `metadata.version` in `skills/agents-guru/SKILL.md` to 9.1.1

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-09_GHI-433_swap-the-symlink-install-line-on-export.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `npm --prefix skills/agents-guru test`
- ::V5:: `npm --prefix skills/agents-guru run lint`
- ::V6:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V7:: `node skills/agents-guru/scripts/check.js plugins/typescript-native-lsp`
- ::V8:: `node skills/agents-guru/scripts/check.js skills/review-text`
- ::V9:: `node skills/agents-guru/scripts/check.js skills/agents-guru`
- ::V10:: `node skills/agents-guru/scripts/check.js skills/socratic-tutor`
- ::V11:: `node skills/agents-guru/scripts/check.js skills/action-policy-guru`

V6 to V11 are the listed packages an edit under `skills/agents-guru/` owes, per `.agents/gh-solo.md`. This worktree has no `node_modules` yet, so `npm --prefix skills/agents-guru ci` runs before V4. No gate can tell whether the bullet reads clearly to an agent mid-export. The review judges that.

## Open questions

None.

## Settled

None yet.
