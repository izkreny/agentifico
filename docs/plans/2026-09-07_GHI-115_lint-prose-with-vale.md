> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Lint prose with Vale

Closes #115. `skills/skills-maker/workflows/new.md` states prose rules that nothing runs, and each has been missed in a review round. This branch adds Vale to the package's mechanical check: a committed configuration, a style directory inside the package with one rule file per mechanical half of a stated rule, phrase lists mined from this repository's own review history, and fixtures in the existing `node:test` suite. The version moves a minor, from 2.0.0 to 2.1.0.

Stacked on #101, whose branch this one is cut from and whose PR #116 is this one's base. That is the exception `.agents/gh-solo.md` states for an epic child's `blockedBy`: #101 is the blocker and its branch is the base. The sweep #96 has no branch yet, so this branch becomes the top below it and nothing above it needs rebasing. The trunk-staleness step of the `open` workflow does not apply on a stacked branch.

## What was verified before planning

Everything below about Vale was read from docs.vale.sh or the `vale-cli/vale` source at tag v3.20.0 on 2026-09-07, the latest release, published 2026-09-02. The facts that shape the design:

- **Only `error`-level alerts set a non-zero exit code.** Warnings and suggestions leave it at zero. So the rules whose finding is a defect are `level: error`, and the wrapper reports the rest without failing on them.
- **YAML frontmatter is linted, not skipped.** Each string field gets a scope such as `text.frontmatter.description`, so a `text`-scoped rule reads a skill's description too. That is wanted for the phrase rules and irrelevant to the length rules, which measure the body.
- **Scoping a `metric` rule and the `doc(...)` selector need v3.21.0, which is unreleased.** So the paragraph cap is an `occurrence` rule with `scope: paragraph`, `token: \b(\w+)\b` and a `max`, the shape Vale's own testdata uses, and the file cap is an unscoped `metric` on `words`, limited to SKILL.md by a path section in the configuration.

Further facts bound the harness. A relative `StylesPath` resolves against the .vale.ini that sets it, so the check can point at the package's configuration from any working directory with `--config`. And Vale reads the user-level configuration and the default styles directory underneath a project's, where a style of the same name shadows the project's; `--no-global` drops both, and every invocation here passes it.

Prior art was searched the same day and is recorded in the owner's knowledge base. One Vale style for instruction files exists, `jdkato/Prompts`, three days old and outside the Vale hub; none of the concerns this branch covers has a published rule, so nothing is adopted as a package. What is borrowed, with attribution in the file that borrows it: the harness design of that style's test script, and the token calibration of its `TimeSensitive` rule and of Google's `Timeless` rule for the version-banner rule.

## The shape

**Vale runs inside the one command the workflows already describe.** `skills/skills-maker/scripts/check.js` spawns `vale --output=JSON --no-global --config <package>/.vale.ini` over the same file list it hands markdownlint, merges the alerts into its own output, and keeps the one exit code: non-zero on any markdownlint finding or Vale `error`, zero otherwise, with Vale warnings printed and counted on their own. One target argument, one summary line, and no new tool grant, since `Bash(node:*)` already covers it; a `vale` binary missing from `PATH`, or Vale's own exit code 2 for a configuration or rule that failed to load, is reported as a setup failure naming what to fix, and exits non-zero, because a check that silently skips half its rules reads as a clean sweep. The choice against a second command is an open question below, since two acceptance criteria read as if one were expected.

**The configuration is a .vale.ini at the package root, with `StylesPath = styles` and the style named `SkillsMaker`.** `MinAlertLevel = suggestion` so nothing is hidden; a `[*.md]` section carries `BasedOnStyles = SkillsMaker`; a path section on SKILL.md adds the file-length rules to skill files alone, and restates `BasedOnStyles`, because a later matching section's value replaces an earlier one's rather than adding to it; that the phrase rules still reach a SKILL.md is verified on the installed binary before the first fixture is trusted. No `Packages` key and no `vale sync`: the rules ship with the skill they enforce, per the issue's note that Vale's published styles are house styles for other houses.

**One rule file per mechanical half, under styles/SkillsMaker/ in the package, each `message` opening with the `skills/skills-maker/workflows/new.md` heading it enforces** and each carrying a `link` to that file. The rules, with their level and the rule they serve:

- **Counts**: `existence`, `level: error`, for a count of adjacent content. Serves *Write sentences that survive change*.
- **Position**: `existence`, `level: error`, for a claim of uniqueness, recency or position. The other mechanical half of the same rule, in its own file so the message can say which half fired.
- **History**: `existence`, `level: error`, for a phrase that writes the file's own history. Serves *Never write the file's own history*.
- **Banner**: `existence`, `scope: raw`, `level: error`, for a version or date claim in a file's opening region, which is the first paragraph after the frontmatter, since a skill file runs several paragraphs before its first heading. Serves *Put a version next to the claim it qualifies, never as a banner at the top*. Its tokens start from the `TimeSensitive` and `Timeless` calibrations named above, cut to what a banner says.
- **ParagraphLength**: `occurrence`, `scope: paragraph`, `level: warning`, `max` words per paragraph. Serves *Cut every paragraph to its one new claim* as a helper: the message says the paragraph is long enough to read for a second claim, not that it is wrong. Measured against the package on 2026-09-07, 84 body paragraphs run to a median of 41 words and a maximum of 135, and a cap of 120 points a reviewer at the three longest.
- **SkillSplit** and **SkillLength**: two `metric` rules on `formula: words`, `level: warning`, on SKILL.md alone, one per figure *Let size decide whether to split* states, since a `metric` rule carries one `condition` and one `message`: past 2,000 words the first says to consider splitting, past 3,500 the second says the file is over the cap. Both figures are "roughly" in the rule they serve, so neither fails the check.

**The phrase lists are mined, not invented.** Before any rule file is written, a subagent reads the sources the issue names and returns each phrase with where it was caught: the `RF` findings on merged pull requests whose files are prose, read through the `gh api` comment listings; the fix commits on prose files in this repository, whose diffs show the phrase and its replacement; and the examples `skills/skills-maker/workflows/new.md` gives in its own text. Each token in a rule file carries a YAML comment naming the finding or commit it came from. A token with no source is not added, and a phrase the mining returns that no rule covers is reported in the handoff rather than given a rule with no `skills/skills-maker/workflows/new.md` heading behind it.

**A finding on the package today is fixed or excepted in the rule.** The first run over `skills/skills-maker` is triaged token by token: a true finding is fixed in the prose, a phrase that is right where it stands goes into that rule's `exceptions` with the reason as a comment beside it. No inline `<!-- vale -->` directive is written into a skill file, since a directive is context loaded on every invocation, and the exception belongs with the rule that would otherwise misfire.

**The bench drives Vale over fixture files in a temporary directory, in the existing suite.** A third test file under the package's test directory copies the style directory and one fixture into a directory that setup creates and teardown removes, writes a minimal .vale.ini beside them, and spawns Vale with `--output=JSON --no-global`. Each rule gets one fixture that must trip it, and every phrase rule gets a guards fixture of lines it must leave alone, code spans and fenced blocks included. The fixtures are named for their rule and never SKILL.md: the suite's own .vale.ini scopes the length rules to the fixture's name, and the production path section is exercised by one long SKILL.md that `skills/skills-maker/scripts/test/check.test.js` adds to the temporary tree it already builds for the wrapper. A coverage test lists the rule files and asserts every rule name appears in some fixture's alerts, which is the "watched failing" rule made mechanical: a Vale rule that matches nothing fails silently. Vale's own in-source `tests:` key and `vale test` subcommand exist at v3.20.0 but are registered hidden with a schema the source says is unsettled, so the suite does not build on them.

## What the prose says afterwards

`skills/skills-maker/workflows/check.md` gains the setup step for Vale beside the `npm ci` one, a section on what the prose rules cover with one entry per rule and what each cannot decide, and moves the phrase-shaped items out of *What a sweep still looks for by hand* while adding the judgement halves the tools cannot take: whether a paragraph's second claim is new, whether a sentence is history in substance. `skills/skills-maker/SKILL.md` names Vale 3.20 or later on `PATH` in `compatibility:`, with the Vale documentation's installation page as the install step and no machine-specific route; its tools line names the style directory. `skills/skills-maker/README.md` adds Vale to the sentence naming what the skill assumes. `metadata.version` moves from 2.0.0 to 2.1.0.

`.agents/gh-solo.md` is repository-level and this is a package branch. What it would say depends on the first open question, and the edit is asked about below rather than assumed.

## Steps

- Install Vale, at the owner's approval of the prompt, and record the version the branch verified against beside the claims that depend on it.
- Mine the phrase lists: a subagent reads the `RF` findings on merged PRs' prose files, the fix commits on prose files, and the examples in `skills/skills-maker/workflows/new.md`, and returns each phrase with its source.
- Write the .vale.ini at the package root and the rule files under styles/SkillsMaker/, each token commented with its source.
- Extend `skills/skills-maker/scripts/check.js` to spawn Vale over the same files, merge its alerts, fail on a missing binary, and keep one exit code.
- Write the Vale test file: a fixture per rule, a guards fixture per phrase rule, the coverage test; add the long SKILL.md to the wrapper test's temporary tree; watch each fail before trusting it.
- Run the check over `skills/skills-maker`, triage every Vale finding, fix or except with the reason beside the exception.
- Rewrite `skills/skills-maker/workflows/check.md`, the `compatibility:` and tools line of `skills/skills-maker/SKILL.md`, and the assumptions sentence in `skills/skills-maker/README.md`.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from 2.0.0 to 2.1.0.
- Edit *Check commands* in `.agents/gh-solo.md` as the owner decides on the open question.

## Verification

- The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- `python3 scripts/version-check.py`.
- `npm --prefix skills/skills-maker test`.
- `npm --prefix skills/skills-maker run lint`.
- `node skills/skills-maker/scripts/check.js skills/skills-maker`, from the repository root, exits zero.

**What these gates cannot see.** `skills/` is not a docs-check target, so nothing mechanical reads the rewritten prose except the package's own check. The version check's range on this stack spans the bumps below, so it passes whether or not this branch moves the version. The suite proves each rule on its fixtures and nothing about a phrasing no fixture states, which is the whole gap Vale leaves to the review. The check is run once by hand over `plugins/gh-solo` to see the rules on a second real package, and a finding there is reported in the handoff rather than fixed here.

## Open questions

- **One command or two?** The plan has `skills/skills-maker/scripts/check.js` spawn Vale, so `skills/skills-maker/workflows/check.md`'s "one command runs everything" stays true, no `Bash(vale:*)` grant is added, and the wrapper owns the exit code. Criteria 6 and 7 of #115 read as if a separate `vale` command were named beside the others. Recommendation: the wrapper, with the criteria read as satisfied by the command that now runs Vale.
- **May this branch edit `.agents/gh-solo.md`?** Under the wrapper route the edit is one sentence in *Check commands* saying the check needs Vale installed; under two commands it is a new command line. Either way it is a repository-level file on a package branch, and the #101 approval covered that branch only.
- **Paragraph cap at 120 words?** Measured on 2026-09-07 it flags the three longest paragraphs in the package and nothing else. A lower figure turns a helper into noise; a higher one flags nothing today and so cannot be watched failing on real prose.

## Settled

- **Adopt `jdkato/Prompts` or `vale-cli/Std` as a package?** No: neither carries a rule for any concern here, both would enforce rules `skills/skills-maker/workflows/new.md` never stated, and one is three days old. Their harness design and token calibration are borrowed with attribution instead.
- **Rules from the owner's global instructions file?** Only rules `skills/skills-maker/workflows/new.md` states get a rule file, since each `message` names the heading it enforces. A rule that exists only in the global file enters `skills/skills-maker/workflows/new.md` first, as its own issue.
- **Length rules fail the check?** No: both caps are "roughly" in the rule they serve, so they are warnings the wrapper prints and counts without failing on.
- **Fixtures through `vale test`?** No: the subcommand is hidden at v3.20.0 with a schema its own source calls unsettled. The suite drives the released binary over fixture files with `--output=JSON`, as the issue's technical notes describe.
- **A SKILL.md fixture?** Not in the Vale test file, whose own .vale.ini scopes the length rules to the fixture's name. The production path section is exercised by a long SKILL.md in the temporary tree `skills/skills-maker/scripts/test/check.test.js` already creates and removes.
