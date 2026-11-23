> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Record a sweep's findings and verdicts

Issue [#432](https://github.com/izkreny/agentifico/issues/432), a child of epic #444. It is blocked by #433, which is open. This is the stacked exception in *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`. The branch is cut from `fix/GHI-433_swap-the-symlink-install-line-on-export`, and that branch is the pull request's base. The block is serialisation on the shared `metadata.version` line, not a need for #433's work. The trunk sitting ahead of this branch is normal for a stack, so nothing fast-forwards.

## What changes

**Step 4 of `skills/agents-guru/workflows/review.md` gives every finding an id.** One sentence: each finding is `AGF1`, `AGF2` and on, numbered in the ranked order Step 4 already asks for. Step 5 then asks for its verdict per id rather than per finding. The id is plain text, not gh-solo's `::KEY::` form, per the issue's N5.

**The sweep section of `.agents/gh-solo.md` gives the record its two homes.** One paragraph under *The skill review is its own issue, not a branch's gate*. The sweep issue keeps the summary: one line per `AGF{n}` finding, then one verdict per id. `docs/sweeps/<name>_<version>.md`, named for the tag the sweep precedes, holds every finding and every verdict in full, and is committed on the sweep's branch. Its paths are relative to the repository root. The invocation drops its sentence asking for short ids, since the skill now issues them.

**`AGENTS.md` lists `docs/sweeps/<name>_<version>.md` and puts it outside the standard.** A layout row, and the sentence that exempts `docs/plans/` widened to cover both, each with its own reason. Both name the placeholder path rather than the bare directory, which does not exist until the first sweep writes into it and so would fail the docs check `AGENTS.md` is a target of. The owner approved both repository-level edits on this branch, per the issue's N4.

**`metadata.version` in `skills/agents-guru/SKILL.md` moves from 9.1.1 to 9.2.0.** Step 4 now issues ids, which is new behaviour, so it is a minor.

No sweep record is created here. The first one is #445's.

## Steps

- ::S1:: Add the `AGF{n}` id to Step 4 of `skills/agents-guru/workflows/review.md`, and ask for Step 5's verdicts by id
- ::S2:: Add the record's two homes to the sweep section of `.agents/gh-solo.md`, and drop the short-id sentence from its invocation
- ::S3:: Add the `docs/sweeps/<name>_<version>.md` layout row to `AGENTS.md`, and put it outside the standard beside `docs/plans/`
- ::S4:: Move `metadata.version` in `skills/agents-guru/SKILL.md` to 9.2.0

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-09_GHI-432_record-sweep-findings.md`
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

V6 to V11 are the listed packages an edit under `skills/agents-guru/` owes, per `.agents/gh-solo.md`. No gate reads whether the new rule tells a sweep where each part of its record goes. The review judges that, and #445 is its first real use.

## Open questions

None.

## Settled

None yet.
