> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Read a multi-skill path as one document, in one inline pass

Closes #88. `skills/skills-maker/workflows/review.md` Step 1 now says which files a package root puts in scope, and says nothing about how a set of skills is read once it is. The obvious move is a subagent per skill, and it is the defect: it makes a contradiction between two skills invisible, which in a plugin is the class that matters most.

Stacked on #54, whose branch this one is cut from; the trunk has not moved since. Its own change is prose in three files plus a version bump.

## Where the rule lands

**In `skills/skills-maker/workflows/review.md` Step 1, immediately after the package-root paragraph #54 put there.** That paragraph settles which files are in scope; this one settles how they are read, so the two belong adjacent and in that order. Nothing else in the skill has a claim on it: `skills/skills-maker/workflows/check.md` owns the argument shapes and `skills/skills-maker/SKILL.md` owns the routing, and neither is about reading.

## Two paragraphs, one claim each

**The rule**: a path covering more than one skill is read inline, as one document, in one pass.

**The reason, in terms of what a fan-out cannot see**: a contradiction that spans two skills, and a cross-reference from one skill to a rule another skill removed. That is the wording the issue asks for and it is exact, so it is used rather than paraphrased. Step 1 already makes the same argument one level down - a defect in a routing skill is usually a contradiction between two files - so this extends a reason the file already carries rather than introducing one.

## Step 5 is untouched, and the rule says so

`skills/skills-maker/workflows/review.md` Step 5 resumes a subagent to judge fixes, which is a subagent doing exactly what the new rule forbids at Step 1. Left unsaid, the two read as a contradiction inside one file. One clause fixes it: the inline read is Step 1's, and Step 5's resumed reviewer is a different act on a different question.

## Running thin is reported, not hidden

Reading several skills whole is what makes the cross-skill question answerable and it is also what runs a session low, so the objection is real and gets an answer rather than a silence. A reader that cannot hold the whole set names where it ran thin, by skill, rather than finishing on a shallow read of whatever came last. Without that sentence the rule's failure mode is the same silent one it exists to remove.

## The other two sites point rather than restate

`skills/skills-maker/workflows/check.md` advertises the argument shapes and `skills/skills-maker/SKILL.md` routes `review`, so a reader arriving at either could reasonably expect the answer there. Each gets a pointer to `skills/skills-maker/workflows/review.md` and no copy of the rule: a second copy drifts, and the owner has already had one such copy flagged on #54's round.

## The report names the skills

Step 4 already requires the report to say which files were read. Naming every skill by path is a clause on that requirement rather than a new one, and it is what makes a run that covered part of a multi-skill path distinguishable from one that covered all of it.

## Steps

- Add the rule to `skills/skills-maker/workflows/review.md` Step 1 after the package-root paragraph: a path covering more than one skill is read inline as one document, in one pass.
- Give it the reason in the issue's own terms: a fan-out cannot see a contradiction spanning two skills, nor a cross-reference from one skill to a rule another removed.
- State in the same place that a path that is one skill's own directory behaves exactly as it does today, and that Step 5's resumed reviewer is unaffected.
- State that a reader who cannot hold the whole set names where it ran thin, by skill, rather than finishing on a shallow read.
- Extend Step 4's report requirement to name every skill read, by path.
- Point `skills/skills-maker/workflows/check.md` at `skills/skills-maker/workflows/review.md` for how a multi-skill path is read, without restating the rule.
- Point `skills/skills-maker/SKILL.md`'s `review` route at the same place, on the same terms.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from 1.2.0 to 1.3.0: behaviour added, nothing removed.

## Verification

- The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- `python3 scripts/version-check.py`.
- `bash skills/skills-maker/scripts/test-checks.sh`, which the branch owes because it edits the skill's frontmatter.

**What these gates cannot see.** `skills/` is not a docs-check target, so nothing mechanical reads the prose this branch is almost entirely made of. Whether the new rule reads as a rule, whether the reason is stated in the issue's terms rather than paraphrased away, and whether the two pointers stayed pointers are the owner's judgement. `python3 scripts/manifest-check.py` is not owed: no manifest changes.

## Open questions

- None.

## Settled

- **Which file owns the rule, given three sites advertise the argument it applies to?** `skills/skills-maker/workflows/review.md`, because the rule is about reading rather than about which arguments are accepted. `skills/skills-maker/workflows/check.md` and `skills/skills-maker/SKILL.md` carry a pointer and no copy, per the issue's own criterion that one file owns the answer and the others point at it.
