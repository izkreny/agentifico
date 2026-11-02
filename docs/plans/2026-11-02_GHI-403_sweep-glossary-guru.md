> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Sweep glossary-guru before its next tag

Issue [#403](https://github.com/izkreny/agentifico/issues/403). Its blocker [#402](https://github.com/izkreny/agentifico/issues/402) has merged, and this branch is cut from `main` at 9739f62. No epic holds either, so nothing is stacked.

## The sweep

A reviewer subagent ran `skills/agents-guru/workflows/review.md` over `skills/glossary-guru` at 9739f62, inline and whole, and is kept resumable for its Step 5. The findings are recorded on the issue as SW1 to SW9, and each is fixed here:

- **SW1.** A swap word holding an exception phrase exits 1 and names both, because Vale masks the exception first and the longer word then never fires. An exception holding a swap word stays legal.
- **SW2.** The rule writes each `'` so that a curly apostrophe in prose matches too, in swap keys and exceptions alike. The glossary itself keeps refusing a curly one.
- **SW3.** `<skill-dir>/SKILL.md` and `<skill-dir>/README.md` say the check needs words set apart by spaces or punctuation. This corrects the words "Latin script only", which the owner chose in #298's plan as a stated limit over a refusal, since the rule fires on Cyrillic, Greek, Arabic and Hebrew. The choice itself stands: the limit is stated and nothing is refused.
- **SW4.** The plain-word message says no combining mark.
- **SW5.** `<skill-dir>/scripts/test-glossary-rule.sh` gains a case for each surviving mutation the finding lists.
- **SW6.** `<skill-dir>/SKILL.md` drops the clause restating the script's own refusal.
- **SW7.** The exit contract in `<skill-dir>/scripts/glossary-rule.py` names the rule and the Markdown file.
- **SW8.** The narrating comment in the bench goes, and the `(?i)` comment moves onto the line it explains.
- **SW9.** The bench message stops naming an interface the script does not have.

`<skill-dir>/SKILL.md` also gains one sentence the owner ordered: a project's local CI runs the script before Vale, so Vale reads a rule that matches the JSON file. That replaces a `--check` mode, which the owner considered and dropped.

`metadata.version` moves from `2.0.0` to `2.0.1`. The fixes make the rule do what the skill already says, and the new refusal replaces a rule that silently lost a word, so an installer gains no capability and loses none.

## The blinded trial

The trial uses headless `claude -p`, as #298's did, because a run's transcript is what decides the result. Each run gets a fresh copy of one of two fixture projects, the same small shop with and without `<repo-root>/docs/GLOSSARY.json`, under a project-shaped directory name. The skill sits at the project's `.claude/skills/glossary-guru`, git-excluded so a file listing does not name it, and no instructions file mentions it. Only project settings load. The request is one ordinary sentence asking for a refunds doc, naming no skill, glossary or test.

| Round | Skill text | Model | With a glossary: loaded | Without one: loaded |
|---|---|---|---|---|
| baseline | 9739f62 | sonnet | 5 of 5 | 0 of 5 |

The round that counts runs again on the fixed tree, and its result goes on the issue.

## Steps

- Write each new bench case, and watch it fail against the current script, before its fix.
- Fix SW1 to SW9, citing each id in its commit.
- Add the sentence on running the script before Vale.
- Move `metadata.version` to `2.0.1`.
- Run the trial on the fixed tree, five runs per fixture, and read each transcript.
- Record the trial on the issue.
- Resume the sweep reviewer on the fix commits for a verdict per finding and per set-aside item, per `skills/agents-guru/workflows/review.md` Step 5.
- Record the verdicts on the issue.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-02_GHI-403_sweep-glossary-guru.md`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md docs/plans/2026-11-02_GHI-403_sweep-glossary-guru.md --plans docs/plans`
- `python3 scripts/version-check.py`
- `node skills/agents-guru/scripts/check.js skills/glossary-guru`
- `bash skills/glossary-guru/scripts/test-glossary-rule.sh`

The bench cannot say whether a sentence in `<skill-dir>/SKILL.md` is true, which the resumed reviewer's verdicts judge. The trial measures one request, one model and project settings, so it shows the description can fire and says nothing about every request or the owner's full skill listing.

## After the review round

The Vale re-mine is this pull request's last task, run after the round's fixes are pushed and before the merge, so it can read the round's own threads. It reads everything merged since `glossary-guru_1.1.1`, per *How a phrase list grows* in `skills/agents-guru/references/maintaining.md`, along with this issue's findings, this pull request's threads and this branch's commits. New tokens go on an `agents-guru` issue and none land on this branch, per *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md`. The issue records what was read.

## Open questions

None.

## Settled

**Should the package add a `--check` mode, so a stale rule fails before Vale?** No. The owner chose to run the script before Vale in local CI, since that always gives Vale a fresh rule and needs no new code.
