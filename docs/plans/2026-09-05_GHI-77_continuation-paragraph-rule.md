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

## The mechanical half is a script, not a grep in prose

**`skills/skills-maker/scripts/check-continuations.js`, beside `skills/skills-maker/scripts/check-descriptions.js` and `skills/skills-maker/scripts/check-names.js`, with its own `##` section in `skills/skills-maker/workflows/check.md`.** It parses rather than matches: frontmatter and fenced code never become blocks at all, a list item's content column follows its own marker, and a continuation is any block below that column - so the indent width, the leading character, the frontmatter sequence and the fenced body are branches of a program instead of caveats in a sentence.

**Every branch has a fixture in `skills/skills-maker/scripts/test-checks.sh`, and every fixture was watched failing.** The bench is driven by mutating the script - dropping the fence skip, fixing the content column at two, anchoring on `[A-Za-z]`, letting a marker be swallowed, raising the cap - and each mutation must turn a named fixture red. A fixture no mutation can break is not evidence and is rewritten until one can.

**What the script cannot decide stays in `skills/skills-maker/workflows/check.md` as prose**, because it is a judgement rather than a pattern: whether the item has a heading level free to be promoted to.

## The check is watched failing before it is trusted

The bench is the evidence, and it is reproducible on any machine rather than pinned to a sha in this repository. The script is also run against `plugins/gh-solo`, where it finds the real instances - including two under numbered items that ran straight on from the paragraph above them, which the earlier grep-shaped version could not have distinguished from clean.

## Steps

- Add a `###` to `skills/skills-maker/workflows/new.md` Step 4 stating the cap: a list item carries at most one continuation paragraph, and that paragraph is the item's reason.
- Give it its reason in the same place: markdown requires the indent, so the render is correct either way and nothing else signals that a section was written as a bullet.
- State that a continuation opening with a bolded lead-in is over the cap whatever its count, because a bolded lead announces a claim rather than continuing one.
- State the move for an item with no heading level free: unindent, so the bullet's bolded lead becomes a top-level paragraph and its continuations become the paragraphs beneath it.
- Write `skills/skills-maker/scripts/check-continuations.js`, which parses blocks rather than matching lines, so frontmatter, fenced code, the content column and the leading character are decided in code.
- Give every branch of it a fixture in `skills/skills-maker/scripts/test-checks.sh`, and watch each one fail under a mutation of the branch it covers.
- Give `skills/skills-maker/workflows/check.md` a `## The continuation check` section naming the script, why it is a script, and the one judgement it cannot make.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from 1.3.0 to 1.4.0: behaviour added, nothing removed.

## Verification

- The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- `python3 scripts/version-check.py`.
- `bash skills/skills-maker/scripts/test-checks.sh`, which the branch owes twice over: it edits the skill's frontmatter and it adds a check.
- `node skills/skills-maker/scripts/check-descriptions.js skills/skills-maker` and `node skills/skills-maker/scripts/check-names.js skills/skills-maker`.
- `node skills/skills-maker/scripts/check-continuations.js skills/skills-maker`, which must be clean: the skill states the rule, so it keeps it.
- `node skills/skills-maker/scripts/check-continuations.js plugins/gh-solo`, which must report the real instances rather than nothing - the check has to be seen firing on a tree that breaches the rule, not only passing on one that does not.

**What these gates cannot see.** `skills/` is not a docs-check target, so nothing mechanical reads the rule in `skills/skills-maker/workflows/new.md`, which is the part of this branch that is still prose. Whether one continuation paragraph is the right cap, and whether the unindent answer is usable by a writer mid-sentence, are the owner's judgement. `python3 scripts/manifest-check.py` is not owed: no manifest changes.

## Open questions

- None.

## Settled

- **Does `skills/skills-maker/workflows/review.md` need an edit, given the issue names it?** No. Its Step 3 already holds a skill against every rule in `skills/skills-maker/workflows/new.md` and its Step 2 already runs `skills/skills-maker/workflows/check.md`, so both halves reach review by a route that exists. Editing it would create the second home for the wording the issue's own criterion forbids.
- **Should the mechanical half be a grep written into `skills/skills-maker/workflows/check.md`, or a script?** A script. The first shape was a prose bullet naming four patterns with their indent widths, their leading-character anchor, their false positives and a measured count, and a review round raised six findings against it - every one of them a symptom of the same cause, which is that a pattern written as prose is a claim nothing runs and nothing tests. `skills/skills-maker/workflows/check.md` already states that rule for the name check, so the prose version broke it in the file containing it. Settled by the owner in the session, who also authorised the further reviewer pass the rewrite needs.
- **Does the stdlib-only sentence in `skills/skills-maker/workflows/check.md` stay, given no criterion of #77 touches it?** No, and this branch strikes it. The owner settled in the session that the package may take dependencies, so the sentence had become a rule the file stated and nobody held, and an instruction file's false rule is obeyed rather than read past; leaving it until #101 lands would have had agents honouring a mandate already reversed. Its citation was also overstated - `skills/skills-maker/references/managing.md` warns about installing a skill, not about depending on a library. The work is outside #77's criteria and lands here on the owner's word, recorded so the strike is traceable to a decision rather than to drift.
