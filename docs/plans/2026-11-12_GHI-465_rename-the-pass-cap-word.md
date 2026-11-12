> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Rename the pass-cap word to approve

Issue #465 holds the acceptance criteria. This plan says how.

## Approach

Eleven sites name `authorise` as the word that buys a further reviewer pass. Each takes `approve`, with `:ap` beside it where the owner is told what to type. Every other use of the verb stays: "authorises the resolve", the authorisation comment, and its `RESOLVE AUTHORISED:` marker line are a different concept.

Two paragraphs are rewritten rather than substituted, because their argument leans on the word sharing a root with the resolve entrance's "authorises":

- The exclusion paragraph at the end of *The exits* in `plugins/gh-solo/skills/pr-flow/references/pass-cap.md`.
- The exclusion sentence in the resolve entrance bullet of `plugins/gh-solo/skills/pr-flow/SKILL.md`.

The exclusion in `plugins/gh-solo/skills/pr-flow/SKILL.md` becomes a rule about the state rather than a list of words: while a pass-cap refusal stands, a bare word is never the resolve sentence, `resolve` and `:rp` aside. `approve` and `:ap` buy a pass there, and any other bare word buys nothing. That still names both words for AC3, and it keeps an old-habit `authorise` from reaching the entrance that pushes, without naming the word anywhere.

`:ap` routes nowhere, like `discard`: it means something only while a refusal stands. So it stays out of the routing table, the routing bullets, `argument-hint` and the description's shortcut list. `plugins/gh-solo/README.md` says `help` lists every shortcut, so `plugins/gh-solo/skills/pr-flow/workflows/help.md` gains a paragraph naming both words at the pass-cap stop.

The version moves from 8.0.0 to 9.0.0. A word the owner types stops working, which is the breaking case `AGENTS.md` names, and 6.0.0 moved a major for the same kind of removal.

## Steps

- ::S1:: In `plugins/gh-solo/skills/pr-flow/references/pass-cap.md`, make the refusal line read "type approve, or :ap, to charge a further pass", name `approve` and `:ap` in *The owner's word can spend a further pass*, take `approve` in the discard exit, and rewrite the exclusion paragraph for the new words
- ::S2:: In `plugins/gh-solo/skills/pr-flow/SKILL.md`, rewrite the resolve entrance's exclusion as the state rule above, naming `approve` and `:ap`
- ::S3:: In `plugins/gh-solo/skills/pr-flow/workflows/review.md`, take `approve` at the four sites that name the word
- ::S4:: In `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` and `plugins/gh-solo/skills/pr-flow/README.md`, take `approve` at the one site each, with `:ap` in the README
- ::S5:: In `plugins/gh-solo/skills/pr-flow/workflows/help.md`, add a paragraph to *The review is yours* saying the round stops at the pass cap and that `approve`, or `:ap`, typed there buys one more pass
- ::S6:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` from 8.0.0 to 9.0.0

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-12_GHI-465_rename-the-pass-cap-word.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `git grep -n -e '`authorise`' -e 'type authorise' -- plugins/gh-solo` exits 1, watched exiting 0 on the tree before S1
- ::V7:: `git grep -n 'type approve, or :ap, to charge a further pass' -- plugins/gh-solo/skills/pr-flow/references/pass-cap.md` exits 0, watched exiting 1 on the tree before S1
- ::V8:: `git grep -n '`approve` and `:ap`' -- plugins/gh-solo/skills/pr-flow/SKILL.md` exits 0, watched exiting 1 on the tree before S2
- ::V9:: `git diff --quiet -G'RESOLVE AUTHORISED' origin/feat/GHI-336_move-config-keys-into-json -- plugins/gh-solo` exits 0, watched exiting 1 on an uncommitted edit to the marker line in `plugins/gh-solo/skills/pr-flow/workflows/resolve.md`

V6 catches the word only where it is backticked or follows "type", so an unmarked naming of it as the pass word would escape; the review round reads for that. No gate sees whether the rewritten exclusion paragraphs still argue cleanly. The criteria gate is off, since `.agents/gh-solo.md` names no test files.

## Open questions

None.

## Settled

None yet.
