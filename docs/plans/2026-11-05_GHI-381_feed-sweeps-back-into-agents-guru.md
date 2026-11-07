> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Feed the action-policy-guru and glossary-guru sweeps back into agents-guru

Issue [#381](https://github.com/izkreny/agentifico/issues/381), a child of epic #329. It is blocked by #376, which is open. This is the stacked exception in *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`: the branch is cut from `chore/GHI-376_triage-the-hidden-survivors`, and that branch is the pull request's base.

## What changes

**Each candidate token lands in its rule file under a comment naming its source.** Each gets a trip line only it trips, and the guards lines the issue names. A scan of the tree found none of the phrases, so no package outside `skills/agents-guru` is expected to need a fix.

- Counts gains `printed from two places`, sourced to #163 RF7. It stays literal, since a bare `two places` is a live idiom.
- Counts gains `both observed`, sourced to 7b4352d on #380. That commit closed SW3 on #379, and the removed line sits in the SW3 fix, so the comment cites SW3 as well.
- Position's uniqueness token gains `heading` in its noun alternation, sourced to #163 RF8 and 9508f7c.
- History gains `once used`, sourced to #374 RF3 and d6d08ec. The rule ignores case, so a comma lookahead keeps the guards line "Once used, the token expires" quiet.
- History gains `which is what the walk did`, sourced to ae0fd10 on #135. It stays literal.
- Position gains `every path here`, sourced to #389 RF5 and e06cb78, with guards lines for "Every file here", "Every command here" and "Every path this file names".
- Counts gains `replaces both` before a comma, full stop or semicolon, sourced to #404 RF10. Its guards line is "The next run replaces both the rule and the file."

**A candidate that cannot meet its guards is refused**, with the reason posted on #381, as the criteria allow.

**`skills/agents-guru/workflows/review.md` gains a field note under *The defects that actually occur*.** It holds a format a skill prescribes to the rules its own text is held to. It asks whether that format makes a project store history, or copy a fact another file owns. It cites `## Relationships` and `## Retired` on #298. It is written against the file as #367, below this branch in the stack, left it.

**`metadata.version` in `skills/agents-guru/SKILL.md` moves from 8.6.2 to 8.7.0.** New tokens flag prose the check passed before, which is new behaviour.

## Steps

- Add `printed from two places` to Counts, with its trip line.
- Add `both observed` to Counts, with its trip line.
- Add `heading` to Position's uniqueness token, with a trip line only that noun trips.
- Add `once used` to History, with its trip line and the guards line "Once used, the token expires".
- Add `which is what the walk did` to History, with its trip line.
- Add `every path here` to Position, with its trip line and its guards lines.
- Add `replaces both` to Counts, with its trip line and its guards line.
- Watch each new trip line fail with its token removed, then restore the token.
- Add the field note on prescribed formats to `skills/agents-guru/workflows/review.md`.
- Run the agents-guru check over every listed package, and fix or except every place a new token fires.
- Move `metadata.version` in `skills/agents-guru/SKILL.md` to 8.7.0.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `npm --prefix skills/agents-guru test`
- `npm --prefix skills/agents-guru run lint`
- `node skills/agents-guru/scripts/check.js skills/agents-guru`
- `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- `node skills/agents-guru/scripts/check.js skills/review-text`
- `node skills/agents-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

The suite proves each token fires on its own trip line and leaves its guards alone. It cannot tell whether a guards line is the right use to protect, or whether a refusal's reason is sound. The review judges those.

## Open questions

None.

## Settled

**Does `replaces both` land, though no acceptance criterion names it?** Yes. The issue says the sweeps file their tokens here, and the comment filing it arrived after the criteria were written, with its trip and guards already tried in a scratch copy.
