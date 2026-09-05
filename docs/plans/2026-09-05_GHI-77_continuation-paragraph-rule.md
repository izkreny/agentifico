> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Rule on continuation paragraphs under a list item

Closes #77. `skills/skills-maker` rules on how a skill's prose is written and on what a review enforces, and says nothing about a paragraph indented under a list item. The failure is silent: markdown requires the indent, so the file renders correctly and reads as deliberate, while what it is recording is a section that was written as a bullet and never promoted.

Stacked on #88, whose branch this one is cut from, which is itself stacked on #54. Its own change is one authoring rule, one greppable check, and a version bump.

## Where the rule lands

**In `skills/skills-maker/workflows/new.md` Step 4, as one more `###` beside the other body-writing rules.** Step 4 is where every rule about how a skill's prose is shaped already sits - no hard wrapping, one fact one place, cut every paragraph to its one new claim - and this is a rule of exactly that kind. `skills/skills-maker/workflows/review.md` Step 3 already opens by holding the skill against every rule in `skills/skills-maker/workflows/new.md`, so a rule added there is enforced by review without `skills/skills-maker/workflows/review.md` changing. That is the existing route the issue asks the rule to reach review by, and honouring it means this branch does not edit that file at all.

## The threshold, and where it comes from

**A list item carries at most one continuation paragraph, and that paragraph is the item's reason.** The cap is not invented for this rule: `skills/skills-maker/workflows/new.md` already requires every rule to give its reason in a sentence, which is the one thing a bullet legitimately has more to say. A second paragraph is a second claim, and a claim that is not the bullet's reason has stopped continuing the bullet.

**A continuation that opens with a bolded lead-in is over the cap whatever its count.** A bolded lead is what the file's own sections use to announce a claim, so a bolded continuation is a heading wearing an indent: it is not the bullet's reason, it is the next thing the writer had to say. That makes the rule catchable by two independent routes - how many paragraphs, and whether one of them announces itself - and the second is the one a grep can see.

## What to do when there is no heading level to land on

**Unindent, and let the bullet become the bolded lead paragraph it already is.** A continuation inside an already-`###` numbered item has no deeper heading to be promoted to, which is why the issue calls this a judgement rather than a check that can refuse on its own. The move that always exists is to drop the indent: the item's bolded lead becomes a top-level bolded paragraph and its continuations become the paragraphs beneath it, which is the shape the surrounding prose already uses for a rule that owns more than a sentence. Promotion to a heading is the better move where a level is free; unindenting is the one that is always available.

## The mechanical half

**One bullet in `skills/skills-maker/workflows/check.md`'s per-skill list, which is where the sweepable faces of Step 4's rules already live.** The greps are `^  \*\*` for a bolded continuation under a bullet, `^   \*\*` for one under a numbered item, and their unbolded equivalents for counting how many paragraphs an item carries.

**What the grep cannot decide** is the whole reason the entry is a prefilter rather than a verdict: whether the parent item has a heading level free is a judgement, and the same indent belongs to a frontmatter block scalar and to a fenced code block sitting under a list item, neither of which is a continuation paragraph. The bullet says so, so a reader does not take a match for a finding.

## The check is watched failing before it is trusted

`plugins/gh-solo/skills/pr-flow/workflows/review.md` carries seven bolded continuations at `1560811`, this branch's own base, and that sha is what the verification pins rather than the file's current state, so #76 landing cannot flip the evidence. Paired with `skills/skills-maker` carrying none, the two halves are what make it a check rather than a grep that passes on everything.

## Steps

- Add a `###` to `skills/skills-maker/workflows/new.md` Step 4 stating the cap: a list item carries at most one continuation paragraph, and that paragraph is the item's reason.
- Give it its reason in the same place: markdown requires the indent, so the render is correct either way and nothing else signals that a section was written as a bullet.
- State that a continuation opening with a bolded lead-in is over the cap whatever its count, because a bolded lead announces a claim rather than continuing one.
- State the move for an item with no heading level free: unindent, so the bullet's bolded lead becomes a top-level paragraph and its continuations become the paragraphs beneath it.
- Add one bullet to `skills/skills-maker/workflows/check.md`'s per-skill list carrying the grep forms and what the grep cannot decide.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from 1.3.0 to 1.4.0: behaviour added, nothing removed.

## Verification

- The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- `python3 scripts/version-check.py`.
- `bash skills/skills-maker/scripts/test-checks.sh`, which the branch owes because it edits the skill's frontmatter.
- `node skills/skills-maker/scripts/check-descriptions.js skills/skills-maker` and `node skills/skills-maker/scripts/check-names.js skills/skills-maker`, for the same reason.
- The new grep, watched against a known instance and against this skill: `test "$(git show 1560811:plugins/gh-solo/skills/pr-flow/workflows/review.md | grep -c '^  \*\*')" = 7 && ! grep -rq '^  \*\*' skills/skills-maker`

**What these gates cannot see.** `skills/` is not a docs-check target, so nothing mechanical reads the prose this branch is almost entirely made of. Whether one continuation paragraph is the right cap, whether the bolded-lead clause is a rule or a restatement of the cap, and whether the unindent answer is usable by a writer mid-sentence are the owner's judgement. `python3 scripts/manifest-check.py` is not owed: no manifest changes.

## Open questions

- None.

## Settled

- **Does `skills/skills-maker/workflows/review.md` need an edit, given the issue names it?** No. Its Step 3 already holds a skill against every rule in `skills/skills-maker/workflows/new.md` and its Step 2 already runs `skills/skills-maker/workflows/check.md`, so both halves reach review by a route that exists. Editing it would create the second home for the wording the issue's own criterion forbids.
