> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Add the sweep's re-mine tokens

Issue [#436](https://github.com/izkreny/agentifico/issues/436), a child of epic #444. It is blocked by #442, which is open. This is the stacked exception in *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`. The branch is cut from `fix/GHI-442_respect-gitignore-in-the-check`, and that branch is the pull request's base. The block is serialisation on the shared `metadata.version` line, not a need for #442's work. The trunk sitting ahead of this branch is normal for a stack, so nothing fast-forwards.

## What changes

**Each token in the issue's N3 table lands in its rule under `skills/agents-guru/assets/Agentifico/`.** Each sits under a comment naming its source, as *How a token lands* in `skills/agents-guru/references/maintaining.md` asks:

- Counts gains `draws on both(?=[,.;])`, sourced to #431 RF3 and 56bd15a.
- Position gains `configured below(?! (?:the|a|an)\b)`, sourced to #270 SW10 and ee09d06. It stays literal, per the issue's N1: adding `configured` to the participle group trips the guards line.
- History gains `all along(?! the\b)`, sourced to #270 SW12 and 0cbc21b. Its comment says why the lookahead exists: "all along the path" is a place, not a past.
- History gains `the shell version needed`, sourced to #270 SW5 and fc51b7d. It stays literal.

**Each token gets a trip line only it trips.** Each line mirrors its source's shape and was read against every other token in its rule. The Counts guards line "It draws on both the rule and the file." and the Position guards line "A timeout configured below the default is refused." join their rules' guards cases.

`(?:the|a|an)` holds `an`, which is in no word class, so it owes no `Narrows` marker. A scan of the tree finds none of the four phrases, so no listed package is expected to need a fix.

**`metadata.version` in `skills/agents-guru/SKILL.md` moves from 9.0.0 to 9.1.0.** New tokens flag prose the check passed before, which is new behaviour.

## Steps

- ::S1:: Add `draws on both(?=[,.;])` to `skills/agents-guru/assets/Agentifico/Counts.yml`, with its trip line and its guards line
- ::S2:: Add `configured below(?! (?:the|a|an)\b)` to `skills/agents-guru/assets/Agentifico/Position.yml`, with its trip line and its guards line
- ::S3:: Add `all along(?! the\b)` and `the shell version needed` to `skills/agents-guru/assets/Agentifico/History.yml`, each with its trip line
- ::S4:: Watch each trip case fail with each new token removed in turn, then restore the token
- ::S5:: Run the agents-guru check over every listed package, and fix or except every place a new token fires
- ::S6:: Move `metadata.version` in `skills/agents-guru/SKILL.md` to 9.1.0

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-08_GHI-436_add-the-sweep-re-mine-tokens.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `npm --prefix skills/agents-guru test`, each new trip line watched failing with its token removed from its rule
- ::V5:: `npm --prefix skills/agents-guru run lint`
- ::V6:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V7:: `node skills/agents-guru/scripts/check.js plugins/typescript-native-lsp`
- ::V8:: `node skills/agents-guru/scripts/check.js skills/review-text`
- ::V9:: `node skills/agents-guru/scripts/check.js skills/agents-guru`
- ::V10:: `node skills/agents-guru/scripts/check.js skills/socratic-tutor`
- ::V11:: `node skills/agents-guru/scripts/check.js skills/action-policy-guru`
- ::V12:: `node skills/agents-guru/scripts/check.js skills/glossary-guru`

V6 to V12 are the listed packages an edit under `skills/agents-guru/` owes, per `.agents/gh-solo.md`. The suite proves each token fires on its own trip line and leaves its guards alone. It cannot tell whether a lookahead is too wide or too narrow for prose nobody has written yet. The review judges that.

## Open questions

None.

## Settled

None yet.
