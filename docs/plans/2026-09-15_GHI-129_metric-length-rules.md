> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Scope the length rules with metric

Issue [#129](https://github.com/izkreny/agentifico/issues/129), a child of epic [#157](https://github.com/izkreny/agentifico/issues/157), cut from the tip of `docs/GHI-130_vale-list-growth` and stacked on it in stack #168. The `blockedBy` on #130 records that order, per *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`, and nothing here needs what #130 documents.

## What lands

The Vale floor of the `skills-maker` package rises to 3.21, the paragraph cap is rewritten as a scoped `metric` so it counts the words its message claims to count, the decision not to add a per-section cap is recorded in `skills/skills-maker/workflows/check.md` with its reason, and every feature #115 skipped for its age is re-evaluated against the 3.21.0 release, with the decisions recorded in the owner's knowledge-base note on Vale prior art for skill prose. `metadata.version` moves a minor, `3.8.1` to `3.9.0`.

## What was measured before planning

Vale 3.21.0 is on `PATH`, and a scratch style run through it settled the shape of the work:

- `extends: metric` with `scope: paragraph` and `formula: words` measures each paragraph on its own and reports on that paragraph's line. A list item, a blockquote and a fenced block are not paragraphs to it, which is what the guards fixture already asserts. The fixture of 121 distinct words counts as 121.
- A metric's message takes `%s` and prints the count with two decimals, so the alert reads `121.00 words`; `%d` prints a Go format error. The file-length rules already print `%s` the same way.
- `scope: 'doc(section:has(> h2))'` measures an h2 section with every h3 section nested inside it. Over this package that gives a median of 115 words a section and a 90th percentile near 490, and the sections past 300 are the ones already split into subsections: the largest, *Write the body* in `skills/skills-maker/workflows/new.md`, runs to about 1,200 words as the rule list it is.
- No alternative of the `Banner` rule's regex fires on any markdown file in this repository at the current tree, and no review finding since #115 landed names the rule.

## The section cap: not added, and why

A cap on `doc(section:has(> h2))` fires on the cure. The selector nests, so a section that has already been split into subsections measures as its whole subtree, and on this package the finding would name the sections whose shape *Let size decide whether to split* asks for. No rule in `skills/skills-maker/workflows/new.md` states a section cap for such a rule to be the mechanical half of, and *The prose rules* in `skills/skills-maker/workflows/check.md` makes that pairing the condition for a rule file to exist. The decision goes into that file as a short paragraph after the rule table, with the nesting as its reason.

## The paragraph rule

`skills/skills-maker/assets/Agentifico/ParagraphLength.yml` becomes `extends: metric`, `scope: paragraph`, `formula: words`, `condition: "> 120"`, keeping its level, link and message heading. The message is reworded around `%s`. The header comment loses the sentence explaining `occurrence` over `metric`, which is the file's own history the moment the rule is a metric, and its calibration figures are re-measured with `formula: words` over this package so the comment describes the count the rule makes. The suite's message assertion changes from `121 words` to the decimal form, and the rule is watched failing by loosening the condition and reading the over-cap test fail.

## The floor

Vale 3.21 or later replaces 3.20 in `compatibility:` in `skills/skills-maker/SKILL.md`, in the setup line of `skills/skills-maker/workflows/check.md`, and in the message `skills/skills-maker/scripts/check.js` prints when Vale is missing. The strings naming 3.20 in `skills/skills-maker/scripts/test/vale.test.js` and `skills/skills-maker/scripts/test/rules.test.js` are fixtures, a banner to trip and a comment-mutation case, and not claims about the package, so they stay.

## The features skipped as too new

Each item under *Skipped as too new* on #129 is read against the release and the decision recorded in the knowledge-base note, in a section dated to the day of the read. The facts come from the current sources, read rather than recalled: the `vale test` command's registration and its tracking issue, the docs for `doc(...)` and for a scoped `metric`, the current state of `jdkato/Prompts` and `vale-cli/Std`, and the current tokens of 'Prompts/TimeSensitive.yml' and 'Google/Timeless.yml'.

**The `Banner` tokens.** Read literally, dropping every token that fired on nothing empties the rule, since none fires on this repository. A token is dropped when its source has stopped carrying it and it has fired on nothing here; a token a published source still carries keeps that source, as the rule's own comment already grounds them. A dropped token takes its fixture line with it, and the rule comment and the `Banner` row of the rule table say what changed.

**The knowledge-base note is outside this repository.** The acceptance criterion is the owner's ask to write to it, and the `auto` command is the authorisation; the note is edited under the `knowledge-base` skill's conventions rather than by hand.

## Steps

- Raise the Vale floor to 3.21 in `skills/skills-maker/SKILL.md`, `skills/skills-maker/workflows/check.md` and `skills/skills-maker/scripts/check.js`.
- Rewrite `skills/skills-maker/assets/Agentifico/ParagraphLength.yml` as a scoped `metric`, re-measure its calibration with `formula: words`, and update the message assertion in `skills/skills-maker/scripts/test/vale.test.js`, watching the over-cap test fail with the condition loosened.
- Record the decision not to add a section cap, and its reason, after the rule table in `skills/skills-maker/workflows/check.md`.
- Re-evaluate every item under *Skipped as too new* on #129 against the 3.21.0 release, record each decision in the owner's knowledge-base note on Vale prior art for skill prose, and apply the `Banner` decision to the rule, its fixtures and its table row.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.8.1` to `3.9.0`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

The suite proves the rewritten rule fires on the long paragraph and stays quiet on the guards, and the check's own run over the package catches the new paragraph in `skills/skills-maker/workflows/check.md` breaking a prose rule. No gate reads whether the section-cap decision is right, whether a `Banner` token's source was read correctly, or whether the knowledge-base note says what the sources say; the round reads those.

## Open questions

None.
