> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Sweep glossary-guru before its first tag

Issue [#298](https://github.com/izkreny/agentifico/issues/298), the last child of epic [#295](https://github.com/izkreny/agentifico/issues/295). Its blocker [#297](https://github.com/izkreny/agentifico/issues/297) is the stack parent: this branch is cut from `feat/GHI-297_generate-vale-rule-from-glossary`, and that is the pull request's base, which is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` states.

## The sweep

A reviewer subagent ran `skills/agents-guru/workflows/review.md` over `skills/glossary-guru` at 051c58b, inline and whole, and is kept resumable for its Step 5. The findings are recorded on the issue as SW1 to SW19, and each is fixed here:

- **SW1, SW12.** The advice in `<skill-dir>/scripts/glossary-rule.py` says the last section that sets `BasedOnStyles`, says to add to that list, and names `MinAlertLevel` with the `Glossary.Terms = error` override.
- **SW2.** Run from below the project's root, the script refuses and names the directory to run from, whenever a config above resolves to the same glossary. With no config anywhere, a directory named `docs` holding a glossary and no `.git` is refused, and the message says a config there marks it as the root.
- **SW3.** The section test matches ATX spacing, closing hashes and case, the glossary is read with `utf-8-sig`, and list lines with no `## Language` heading exit 1. A glossary with no list lines still passes.
- **SW4.** A line under `## Language` carrying an emphasised `avoid` or `except`, or opening with either and a colon, that does not fit the list line's form exits 1.
- **SW5.** `<skill-dir>/SKILL.md` names an entry's heading alongside the two kinds of line, and `<skill-dir>/assets/vale.ini.template` says to rerun when the glossary changes.
- **SW6.** `<skill-dir>/SKILL.md` runs the script when asked for the check, and again where the rule already exists.
- **SW7.** `<skill-dir>/SKILL.md` states that the check supports Latin script only.
- **SW8.** The parser tracks fence state and skips what a fence holds.
- **SW9.** `build_swap` keys on `.lower()` at both places.
- **SW10.** An unreadable glossary or config, and a non-file named `<repo-root>/.vale.ini`, stop with a reason at exit 2 before any rule is written.
- **SW11.** Each config line is stripped before parsing and the config is read with `utf-8-sig`, and a `StylesPath` ending in a backslash is refused.
- **SW13.** The bench's entry in `.agents/gh-solo.md` names the template too. This is the sweep's standing exception for a repository-level edit, named here so it is seen at plan time.
- **SW14.** `<skill-dir>/scripts/test-glossary-rule.sh` gains a case for each surviving mutation, each watched failing against the code it guards.
- **SW15.** Both messages say a straight apostrophe.
- **SW16.** An `_Except_:` phrase holding no word from any `_Avoid_:` line exits 1.
- **SW17.** The comment says `<skill-dir>/assets/`.
- **SW18.** `<skill-dir>/SKILL.md` writes `<repo-root>/<styles-path>/Glossary/Terms.yml`.
- **SW19.** The description opens by telling an agent to load the skill as soon as a project turns out to hold a glossary, and says why the file alone is not enough.

`metadata.version` moves from `1.1.0` to `1.1.1`. Every fix makes the skill and its script do what they already say, and the refusals replace a rule that silently did the wrong thing, so an installer gains no new capability and loses none.

## The blinded trial

The issue names `claude plugin eval`, and the trial uses headless `claude -p` instead: that subcommand could not be run in this session, and a run's transcript is what decides the result, which the eval's documentation does not promise to keep. Each run gets a fresh copy of one of two fixture projects, the same small shop with and without `<repo-root>/docs/GLOSSARY.md`, under a project-shaped directory name. The skill sits at the project's `.claude/skills/glossary-guru`, git-excluded so a file listing does not name it, and no instructions file mentions it. The request is one ordinary sentence asking for a refunds doc, naming no skill, glossary or test.

| Round | Skill text | Settings | With a glossary: loaded | Without one: loaded |
|---|---|---|---|---|
| first | 051c58b | user and project | 0 of 3 | 0 of 3 |
| clean | 051c58b | project only | 0 of 3 | 0 of 3 |
| v1 | SW19's description | project only | 3 of 3 | 0 of 3 |

The first round inherited user-level instructions and two of its runs wrote outside their fixture, so the later rounds load project settings only. The round that counts is run again on the fixed tree, and its result goes on the issue.

## Steps

- Write each new bench case, and watch it fail against the current script, before its fix.
- Fix SW1 to SW19, citing each id in its commit.
- Move `metadata.version` to `1.1.1`.
- Run the trial on the fixed tree, five runs per fixture, and read each transcript.
- Record the trial on the issue.
- Resume the sweep reviewer on the fix commits for a verdict per finding and per set-aside item, per `skills/agents-guru/workflows/review.md` Step 5.
- Record the verdicts on the issue.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-01_GHI-296_add-glossary-guru-skill.md docs/plans/2026-11-01_GHI-297_generate-vale-rule-from-glossary.md docs/plans/2026-11-01_GHI-298_sweep-glossary-guru.md`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans/2026-11-01_GHI-296_add-glossary-guru-skill.md docs/plans/2026-11-01_GHI-297_generate-vale-rule-from-glossary.md docs/plans/2026-11-01_GHI-298_sweep-glossary-guru.md --plans docs/plans`
- `python3 scripts/version-check.py`
- `node skills/agents-guru/scripts/check.js skills/glossary-guru`
- `bash skills/glossary-guru/scripts/test-glossary-rule.sh`

The bench has seen every new case fail, but it cannot say whether a sentence in `<skill-dir>/SKILL.md` is true, which the resumed reviewer's verdicts judge. Whether the description fires is behaviour, which the trial measures on one request, one model and project settings, so it shows the description can fire and says nothing about every request or the owner's full skill listing.

## After the review round

The Vale re-mine is this pull request's last task, run after the round's fixes are pushed and before the merge, so it can read the round's own threads. The package has no tag, so it reads the whole trunk history, per *How a phrase list grows* in `skills/agents-guru/references/maintaining.md`, along with this issue's findings, this pull request's and the stack's threads and this branch's commits. New tokens go on an `agents-guru` issue opened from this one and none land on this branch, per *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md`. The issue records what was read.

## Open questions

None.

## Settled

**Should the script refuse a word in a script written without spaces, or should `<skill-dir>/SKILL.md` state the limit?** State the limit: the check supports Latin script only. The owner decided this, since a refusal would block the whole rule over one word and needs a list of scripts for a kind of project nobody here has.

**Should the glossary keep `## Relationships`?** No. The owner dropped it, since a schema and specs already own those facts and nothing checks the copy.

**Should the glossary keep `## Retired`?** No. The owner dropped it, since version history already holds a dead term, the rule never read the section, and Fold covers a word a live entry can carry.

**Should the list lines stay `_Avoid_:` and `_Except_:`?** No. The owner changed them to `**::AVOID::**:` and `**::EXCEPT::**:`, since no sentence of prose can be mistaken for those, which ends the guessing at what looks like a list line.

**Should the script track code fences and accept any term?** No. The owner ruled that a glossary holds no code fence and a term is plain words, with `'` only as an apostrophe, and the script refuses anything else, which ends the fence findings by having nothing to parse.
