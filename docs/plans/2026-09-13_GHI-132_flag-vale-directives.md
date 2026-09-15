> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Flag Vale directives in a target's markdown

Issue [#132](https://github.com/izkreny/agentifico/issues/132), a child of epic [#157](https://github.com/izkreny/agentifico/issues/157), cut from the tip of `feat/GHI-120_by-hand-checks-to-rules` and stacked on it. The `blockedBy` on #120 is the stack-parent shape `.agents/gh-solo.md` exempts under *An epic child's blocker is its stack parent, not a wait*: #120's branch exists, is the branch this one was cut from, and is this pull request's base.

## What lands

One markdownlint rule beside the ones in `skills/skills-maker/scripts/rules/`, registered as a contract rule, with its own heading in `skills/skills-maker/workflows/check.md` and its fixtures in `skills/skills-maker/scripts/test/rules.test.js`.

The hole it closes is stated in `skills/skills-maker/workflows/check.md`: nothing under the target is read as configuration, so a tree cannot switch off the rules that judge it. A Vale directive inside a target's own markdown breaks that from inside a file, and the run then reads as a clean sweep.

## What Vale actually honours, measured rather than assumed

Vale 3.20.0 was run against this package's own style over five fixtures, so the rule matches what silences a run rather than what the documentation lists.

| Fixture | Silenced |
|---|---|
| no directive | no, the alert fires |
| `<!-- vale off -->` | yes |
| `<!-- VALE OFF -->` | no, the alert still fires |
| `<!-- vale Agentifico.Position = NO -->` | yes |
| the same directive indented inside a list item | yes |

**So the match is lowercase `vale` and nothing else.** A case-insensitive rule would report a comment Vale ignores, which is a finding against a file that was never silenced.

## The rule reads the token's own text, never the line

markdownlint masks the content of every HTML comment in `params.lines`, replacing each character with a dot, so a rule reading the raw line sees `<!-- .... ... -->` and can decide nothing. The micromark token carries the unmasked source in its `text` property, which is what the rule reads and what its `context` reports. A rule written against `params.lines` would pass its own fixtures only by matching the mask.

## Which token types the directive reaches, and the one shape it does not

Dumping the token tree over the forms above puts a directive on its own line, one indented inside a list item, and one inside a blockquote at `htmlFlow`, and a directive inside a paragraph at `htmlText`. A directive inside a code span or a fenced block yields no HTML token at all, so the guards those need are satisfied by the parser rather than by the rule, and the fixtures pin that it stays so.

**A directive indented four spaces at the top level is `codeIndented` and is invisible to the rule.** That is the correct answer rather than a gap: CommonMark reads it as an indented code block, and so does Vale's own markdown parser, so it silences nothing. The indented form the issue asks for is the one inside a list item, which the table above measures and which reaches `htmlFlow`.

## markdownlint's own comments are ignored, not reported

The first review found the premise broken a second way, by markdownlint rather than Vale. `<!-- markdownlint-disable -->` above a Vale directive made the whole run print `0 issues` and exit zero, because markdownlint's inline comments switch off every rule the check runs, this one included.

A rule cannot report such a comment, since the comment suppresses the finding the rule would raise. Measured against the check's own rule set, `-disable`, its per-rule form, `-disable-file`, `-disable-next-line` and `-configure-file` each did. markdownlint's `noInlineConfig` option ignores them all, and with it set every form above leaves the directive reported. An ignored comment silences nothing, so the rule does not report one either.

## Why the rule is a contract rule

`skills/skills-maker/scripts/lint-config.js` files a rule by whether its failure is silent. A silenced prose run prints a clean last line, which is the definition that array states, so the rule joins `contractRules` rather than the prose-shape array.

## One acceptance criterion is already satisfied by absence

The issue asks that `skills/skills-maker/workflows/check.md` drop the sentence saying the review reads for the directive. No such sentence is in that file, and `git log --all -S` over `skills/skills-maker/workflows` for both `<!-- vale` and `directive` returns nothing, so it never existed there. The nearest text is about a defect written inside double quotes, which is a different escape and stays. Nothing is dropped, and the other half of that criterion, naming the rule beside the others, is what this branch does.

## Steps

- Add 'skills/skills-maker/scripts/rules/skill-vale-directive.js' over the micromark token tree, reporting any `htmlFlow` or `htmlText` whose `text` opens with `<!--` and then lowercase `vale` at a word boundary, at the token's own start line, with the token's text as context.
- Write the message so it names where an exception belongs: the `exceptions` key of the Vale rule that would otherwise misfire, under `skills/skills-maker/assets/Agentifico/`, with its reason beside it as `skills/skills-maker/assets/Agentifico/Position.yml` already does.
- Register it in `skills/skills-maker/scripts/lint-config.js` among the contract rules.
- Add its fixtures to `skills/skills-maker/scripts/test/rules.test.js` and the rule to that file's `RULES`: the plain form, the assignment form, the list-item indented form, and a guards set of an ordinary HTML comment, a directive inside a code span and a directive inside a fenced block.
- Give the rule its own heading in `skills/skills-maker/workflows/check.md`, before the prose rules it guards, saying what it matches, that the match is case-sensitive because Vale's is, and where an exception belongs.
- Pass `noInlineConfig: true` to the markdownlint call in `skills/skills-maker/scripts/check.js`, and add a wrapper test in `skills/skills-maker/scripts/test/check.test.js` of a target whose `<!-- markdownlint-disable -->` and `<!-- markdownlint-configure-file -->` comments sit above a Vale directive, watched failing with the option removed.
- Add a guards fixture to `skills/skills-maker/scripts/test/rules.test.js` of a markdownlint comment the rule leaves alone.
- Say in `skills/skills-maker/workflows/check.md`, beside the rule that is off for a reason, that a comment in the target cannot turn a rule off.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.5.0` to `3.6.0`. A minor: one new rule is new behaviour, and no file that passed before starts failing unless it carries a directive.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

Vale 3.20.0 is on `PATH` and `skills/skills-maker/node_modules` is installed, so every gate above can run on this machine. Each fixture is watched failing before its pass is trusted, per *A check that has never been seen to fail is not evidence* in `skills/skills-maker/workflows/new.md`: the tripping fixtures are run against the rule with its match clause removed, and the guards fixtures against a rule widened to match any HTML comment, since a guards fixture that never saw a rule fire proves nothing. The check's own run over this package is the one gate that would catch the new heading in `skills/skills-maker/workflows/check.md` breaking a prose rule, and no gate here reads whether the message's wording actually helps someone write an exception.

## Open questions

None.

## Settled

- Whether markdownlint's own disable comments are closed on this branch or by a separate issue. Settled on the pull request, in RF1's thread: on this branch, with the issue, this plan and the pull request rewritten to match.
