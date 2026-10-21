> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Grow the phrase lists from the gh-solo 4.13.0 sweep's re-mine

Issue [#238](https://github.com/izkreny/agentifico/issues/238). It is the first child of epic #226, so the branch is cut from `main` and sits at the bottom of the epic's stack. The stack is initialised when the next child, #227, is cut from this branch's tip. It has no blockers.

## What changes

**Some Position shapes land outright.** `everything after this` joins the `everything (?:above|below)` token as another alternative, under its own source. The `further down` token widens to `further (?:down|on)`, which catches "one section further on" from b149279. Each gets a trip line only it trips, and the guards lines the issue names.

**Some candidates are judged against their guards before they land.** The ordinal token gains `case` only if the guards line "the last edge case" stays clean. The ordinal token allows up to two words before the noun, so `case` in that alternation trips "the last edge case". A narrower token of its own, `the <ordinal> case` with nothing between, is tried first. The first token gains `both` among its determiners only if no recorded line then alerts from both Position and Counts. Each one that cannot meet its guards is refused, with the reason posted as a comment on #238.

**Counts gains `which half of`**, from "report which half of the cleanup is still owed" in e5df8b3. Its guards line is "`-` inside either half" from `plugins/gh-solo/skills/tracker/references/tracker-fields.md`. It is refused on the issue if that line cannot stay clean.

**"beneath it" is recorded in `skills/skills-guru/assets/Agentifico/Position.yml` as a comment, with no token.** A later re-mine reads the rule file, so that is where the judgement saves it work. The comment names #236 SW6 and 694a588, and "the floor beneath it" as the legitimate use every general form trips.

**`skills/skills-guru/references/maintaining.md` catches up with what #239 settled.** *The sources* names the sweep's own issue findings, its own pull request's review threads and its branch's fix commits beside the merged range. It says why no merged range ever holds them. *How a phrase list grows* places the re-mine as the sweep's last act, after its review round's fixes are pushed and just before merge. The words follow *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md`.

**`metadata.version` in `skills/skills-guru/SKILL.md` moves from 5.3.0 to 5.4.0.** New tokens flag prose the check passed before, which is new behaviour, so the minor moves. Earlier token additions landed as `feat` without a `!`.

## Decisions

**A new token's hit in another package is fixed in that package, and that package's version moves on this branch.** A scan of the tree for each candidate found no hits, so this is not expected. The rule comes from *Each plugin, and each skill under `skills/`, is a package* in `AGENTS.md`.

**Each trip line is watched failing before it is trusted.** The token is removed, the suite is run and seen to fail on that line, and the token is restored.

## Steps

- Add `everything after this` to Position, with its trip line and the guards line for "Everything after it is discarded".
- Widen Position's `further down` token to `further (?:down|on)`, with its trip line and guards lines for "in the same file" and "buys a further one".
- Try `case` as an ordinal Position token against the guards line "the last edge case"; land it or refuse it on the issue.
- Try `both` among Position's first-token determiners against Counts' recorded "under both refusals above"; land it or refuse it on the issue.
- Add `which half of` to Counts, with its trip line and the guards line for "inside either half"; or refuse it on the issue.
- Record "beneath it" as Position's, with no token, in a comment in `skills/skills-guru/assets/Agentifico/Position.yml`.
- Watch each new trip line fail with its token removed.
- Name the sweep's own sources and the re-mine's timing in `skills/skills-guru/references/maintaining.md`.
- Run the skills-guru check over every listed package, and fix or except every place a new token fires.
- Move `metadata.version` in `skills/skills-guru/SKILL.md` to 5.4.0.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `node skills/skills-guru/scripts/check.js skills/review-text`
- `node skills/skills-guru/scripts/check.js skills/skills-guru`
- `node skills/skills-guru/scripts/check.js skills/socratic-tutor`
- `npm --prefix skills/skills-guru test`
- `npm --prefix skills/skills-guru run lint`
- `python3 scripts/version-check.py`

The suite proves each token fires on its own trip line and leaves its guards alone. It cannot tell whether a guards line is the right legitimate use to protect, or whether a refusal's reason is sound. The review judges those.

## Open questions

None.

## Settled

None yet.
