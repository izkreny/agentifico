> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Point at the code instead of restating it in prose

Issue [#305](https://github.com/izkreny/agentifico/issues/305), a child of epic #226. It states the missing third case of *One fact, one place*: prose that repeats code. Then it applies the new rule to `skills/skills-guru/workflows/check.md`.

## Where this branch sits

**It is cut from the tip of `feat/GHI-278_check-agent-frontmatter`, and its pull request targets that branch.** #305 is blocked by #278, and the issue's own `## Dependencies` says the order exists so #279 and #280 write their rules to this one. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names. The trunk sitting ahead of this branch is normal for a stack and is not recovered here.

**No repository-level file is edited.** Every pointer into `skills/skills-guru/workflows/check.md` from `AGENTS.md` and `.agents/gh-solo.md` names a part of it this branch keeps.

## The rule

**A new `###` section in `skills/skills-guru/workflows/new.md`, beside *One fact, one place*: *Point at the code that owns a detail, never restate it*.** It needs a heading of its own, because `skills/skills-guru/workflows/review.md` and a finding cite `skills/skills-guru/workflows/new.md` rules by heading. Its reason: the code is what runs and what the suite tests, so a prose copy of it drifts with nothing to fail, and a reader trusts the copy. It says what a document keeps: what the code is for, what it reads, what it leaves to another tool or to a reader, and the file's name.

**`skills/skills-guru/workflows/review.md` Step 3 names the defect in a `###` subsection of its own.** *Claims that go false* and *Text that does no work* each hold five bolded paragraphs already, so a sixth in either trips `skill-bolded-paragraphs`. The entry says how to find it: a document that repeats a rule file's messages, figures or cases.

**The by-hand list in `skills/skills-guru/workflows/check.md` names the new note too**, under *Over-writing no rule reads*. That list is where a sweep looks for what no rule reads, and this defect is one.

## Trimming the check workflow

**Every rule section keeps what its file cannot say, and names that file.** That is what the rule is for, what it reads, and what it leaves to another tool or to a reader. The sections are each rule's own, *What the general lint covers*, *The YAML rules* and *The prose rules*. The opening and *The check* describe running the check rather than a rule, so they stay as they are.

**Each sentence cut from a section takes the move that fits what it is:**

- A detail the rule's file already states, such as a message, a figure, a guard or a case left alone. It is dropped.
- A reason an agent needs that the file lacks. It moves into the file as a one-sentence comment, so the pointer runs from the prose to the code.
- A defence of a figure or a design, such as "Five is a figure measured against the tree this package ships from". It is dropped, per *Give every rule its reason, in a sentence*.

**The prose table keeps the rule file, as `assets/Agentifico/<Rule>.yml`, and the `skills/skills-guru/workflows/new.md` heading it enforces.** Each header comment already states its reach and its level, and each message states what it reports. The paragraph on what escapes the code reach stays, since it says what Vale leaves to a reader.

## Pointers to retarget

A trim strands these, so each moves to the file that owns the detail:

- `skills/skills-guru/workflows/new.md` says `skills/skills-guru/workflows/check.md` states each frontmatter ceiling. The ceilings live in `skills/skills-guru/scripts/rules/skill-frontmatter-parsed.js`.
- `skills/skills-guru/workflows/new.md` says which spans the path rules read is in `skills/skills-guru/workflows/check.md`. The span predicate lives in `skills/skills-guru/scripts/rules/paths.js`.
- `skills/skills-guru/scripts/rules/skill-bolded-runs.js` and `skills/skills-guru/scripts/rules/skill-bolded-paragraphs.js` each cite "the entry in workflows/check.md" for their reason. Each comment states the reason itself, or cites the `skills/skills-guru/workflows/new.md` heading that does.
- `skills/skills-guru/scripts/check.js` points at `skills/skills-guru/workflows/check.md` for why Vale skips a YAML file. That paragraph stays, so the pointer still resolves; it is read again after the trim.

## Steps

- Add *Point at the code that owns a detail, never restate it* to `skills/skills-guru/workflows/new.md`, beside *One fact, one place*.
- Add the defect to `skills/skills-guru/workflows/review.md` Step 3, in a `###` subsection of its own.
- Trim each rule section of `skills/skills-guru/workflows/check.md`, giving every cut sentence its move under *Trimming the check workflow*, and name the rule's file in each.
- Cut the prose table to the rule file and the heading it enforces.
- Add the new note to the by-hand list in `skills/skills-guru/workflows/check.md`.
- Retarget each pointer listed under *Pointers to retarget*.
- Move skills-guru's version a minor, to 6.3.0, since reviews now raise a new finding.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `npm --prefix skills/skills-guru test`
- `npm --prefix skills/skills-guru run lint`
- `node skills/skills-guru/scripts/check.js skills/skills-guru`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `node skills/skills-guru/scripts/check.js skills/review-text`
- `node skills/skills-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

No gate reads whether a sentence left in a rule section is one its file genuinely cannot say, or whether a cut fact really is in the file. That is the review round's to read. The check over `skills/skills-guru` is what catches a stranded path and a sixth bolded paragraph.

## Open questions

None.
