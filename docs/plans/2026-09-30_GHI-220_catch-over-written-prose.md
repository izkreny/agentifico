> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Teach review to catch over-written prose

Issue [#220](https://github.com/izkreny/agentifico/issues/220). It is not part of an epic, so the branch is cut from `main` and not stacked. Its blocker, #218, is merged.

## What changes

**`skills/skills-guru/workflows/review.md` Step 3 gets a note for each kind the issue names.** Each note says how the kind shows in a file and what the fix is. Each cites the heading in `skills/skills-guru/workflows/new.md` that owns its rule, so no rule is stated twice.

| Kind | Where the note goes | The rule's owner in `skills/skills-guru/workflows/new.md` |
|---|---|---|
| Two files of one skill stating the same rule | *Claims that go false*, after the note on a global instructions file | *One fact, one place* |
| A closing recap | *Text that does no work* | *Cut every paragraph to its one new claim* |
| A defence of the design after an instruction | *Text that does no work* | *Give every rule its reason, in a sentence* |
| One-time reference inside a workflow | a new subsection of Step 3 | the new heading named below |

**The one-time-reference note gets its own subsection because of the bolded-paragraph cap.** *Text that does no work* holds three bolded notes and takes two more. A sixth would fail `skill-bolded-paragraphs`.

**The recap note says what to check before deleting.** Each bullet is read for a rule stated nowhere else. Such a rule moves into the step it belongs to, and the rest goes. Whether a closing list of hard prohibitions helps an agent hold them is behaviour. The note says so and points at *A triggering doubt reading cannot settle* for the eval, without repeating that note's text.

**The closing recap earns a rule, `ClosingRecap`, as a Vale warning.** The issue leaves this to the plan. A review note alone is what already failed: a sweep preceded `gh-solo_4.8.0` and 11 files still end on a recap. The rule lives at `skills/skills-guru/assets/Agentifico/ClosingRecap.yml` (new). It fires when the last `##` section of a file is headed Rules, Summary or Recap and another `##` section comes before it. It is a warning and never an error, because the heading only prompts the read. Whether a bullet repeats a step is the reading, and a warning cannot fail the check.

**The rule is tested on the tree.** A trial pattern on Vale 3.23.0 fired on exactly the 11 gh-solo files the issue counts, and on nothing under `skills/`. It reads the raw source, so a `##` line inside a fenced block counts as a heading. The rule's row in `skills/skills-guru/workflows/check.md` names that limit.

**`skills/skills-guru/.vale.ini` turns the rule off for a README.md and for code files.** No route loads a README when the skill runs, which is the reason `FileLength` leaves it alone. The raw scope also reaches a Python comment, where `## Rules` is a section comment and not a heading.

**`skills/skills-guru/workflows/new.md` changes under these headings.**

- *Give every rule its reason, in a sentence* says which reason earns the sentence: what an agent needs to apply the rule where the rule did not anticipate the case. It says a defence of the design is not one.
- A new heading under Step 3 says material a workflow does not need on every run goes to `references/<topic>.md`, whatever the size of the SKILL.md. The workflow keeps one line saying when to read it.
- *Cut every paragraph to its one new claim* gets one sentence naming the closing recap, since the new rule's message cites that heading.

**`skills/skills-guru/workflows/check.md` changes in its prose-rules table and its by-hand list.** The prose-rules table gets a row for `ClosingRecap`. The by-hand list names what no rule decides among the kinds: the two-file duplicate, the defence of the design, the one-time reference, and the recap's bullets. They fold into the existing item *A section grown past its claim*, because that list already holds five bolded items and a sixth would fail `skill-bolded-runs`.

**The package moves from 5.1.0 to 5.2.0.** Every skill the check reads can now get a new warning, which is new behaviour.

## Steps

- Write `skills/skills-guru/assets/Agentifico/ClosingRecap.yml` (new), with `tests:` cases: it fires on each of the three headings closing a file, and it leaves alone a Rules section that is not last, a longer heading, and a file whose only section is Rules.
- Turn it off in `skills/skills-guru/.vale.ini` for a README.md and for code files, and add a `describe` block to `skills/skills-guru/scripts/test/vale.test.js`: a workflow file ending on Rules is warned, and a README.md and a Python file are not.
- Edit `skills/skills-guru/workflows/new.md`: sharpen *Give every rule its reason, in a sentence*, add the heading that sends run-independent material to a reference file, and name the closing recap under *Cut every paragraph to its one new claim*.
- Add the notes to Step 3 of `skills/skills-guru/workflows/review.md`.
- Edit `skills/skills-guru/workflows/check.md`: the `ClosingRecap` row in the prose-rules table, and the by-hand item naming what no rule decides.
- Bump `metadata.version` in `skills/skills-guru/SKILL.md` to 5.2.0.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-guru test`
- `npm --prefix skills/skills-guru run lint`
- `node skills/skills-guru/scripts/check.js <package-dir>` exits zero for `skills/review-text`, `skills/skills-guru` and `skills/socratic-tutor`.
- With `Rules` taken out of the rule's heading list, `vale --no-global --config skills/skills-guru/.vale.ini test skills/skills-guru/assets/Agentifico/ClosingRecap.yml` exits non-zero on the Rules case.
- With the `ClosingRecap` lines taken out of `skills/skills-guru/.vale.ini`, `npm --prefix skills/skills-guru test` exits non-zero on the new `describe` block.

`plugins/gh-solo` stays off the check gate, as #218's plan settled. Its three errors predate this branch and #212 owns them. Its warning count rises by 11, one per file ending on `## Rules`, which is the rule working. No gate reads whether the notes lead a reviewer to the defects: #212 and #213 are where they are first used.

## Open questions

None.

## Settled

None yet.
