> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Require a file for multi-line payloads

Closes #75. `skills/skills-maker` says nothing about how a skill hands a multi-line payload to a command, so a skill can instruct an agent to build markdown inside a shell string and both the authoring pass and the review pass let it through. The instance is in `plugins/gh-solo`, on two surfaces; the rule that would have caught it belongs here, where every skill is held.

Stacked on #77, whose branch this one is cut from, which is itself stacked on #88 and then #54. Its own change is one authoring rule, one field note, and a version bump.

## Where the rule lands

**In `skills/skills-maker/workflows/new.md` Step 4, as one more `###` beside *Code blocks are Bash*.** That is the neighbour the issue names, and the two are one family: both are about what a shell tool does to a skill's command at execution time, on the machine of whoever installed it. `skills/skills-maker/workflows/review.md` Step 3 already holds a skill against every rule in `skills/skills-maker/workflows/new.md`, so the rule reaches review by a route that exists.

## The test, and why it is the payload's shape

**A quoted payload that spans a line break, or carries a backtick or a `#`, is written to a file and passed by path, never interpolated into a shell string.** Those three are what shell quoting mangles: a newline inside single quotes survives but a `'` in the prose ends the string, a backtick inside double quotes executes, and a `#` opens a comment wherever the quoting slips. A rule covering everything sent to a remote destination would also cover a one-line title, a label and a date, where a file buys nothing and a reviewer has no test to apply. The shape is readable off the skill's own text, so a reviewer falsifies it from a quoted span without judging where the payload is going.

## The one field note review earns

**A placeholder hides the shape the test reads.** `-f body='...'` is one line and passes the span test, and it is exactly how both `plugins/gh-solo` instances read: the ellipsis stands in for a body the skill's prose describes as multi-paragraph markdown with a disclaimer blockquote. So `skills/skills-maker/workflows/review.md` Step 3 gets a field note saying how the violation manifests in a file, which is the condition the issue sets for a note there, and the note says to read what the placeholder stands for rather than restating the rule.

## No script

The check is a reading of text a reviewer already has open, and the shape it tests for is stated in one sentence. A script would be built for a case that has one instance, which is the speculative generality the skill's own rules forbid.

## Steps

- Add a `###` to `skills/skills-maker/workflows/new.md` Step 4, beside *Code blocks are Bash*, stating the rule: a payload that spans a line break or carries a backtick or a `#` is written to a file and passed by path, never interpolated into a shell string.
- Give it its reason in the same sentence or the next: those are the characters shell quoting mangles, and a mangled payload lands as posted, under the owner's name.
- State the test so a reviewer applies it to the skill's own text: whether the quoted payload spans lines or carries either character, not where the payload is going.
- Add a field note to `skills/skills-maker/workflows/review.md` Step 3: a placeholder such as `'...'` passes the span test, so read what the skill's prose says it stands for.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from 1.4.0 to 1.5.0: behaviour added, nothing removed.

## Verification

- The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- `python3 scripts/version-check.py`.
- `bash skills/skills-maker/scripts/test-checks.sh`, owed because the branch edits the skill's frontmatter.
- `node skills/skills-maker/scripts/check-descriptions.js skills/skills-maker` and `node skills/skills-maker/scripts/check-names.js skills/skills-maker`.
- `node skills/skills-maker/scripts/check-continuations.js skills/skills-maker`, which must be clean: the new `###` is paragraphs under a heading, not continuations under an item.

**What these gates cannot see.** `skills/` is not a docs-check target, so nothing mechanical reads the new rule. The version check compares `origin/main...HEAD`, which on this stack spans the bumps of #54, #88 and #77, so it passes whether or not this branch moves the version; the bump is held by writing it, and the gate cannot tell. The rule itself has no exit code, so it is seen firing by hand: applied to `plugins/gh-solo/skills/pr-flow/workflows/review.md` and `plugins/gh-solo/skills/pr-flow/workflows/discuss.md`, the field note has to flag both `-f body='...'` spans, and the bare span test has to miss them, which is what earns the note.

## Open questions

- None.

## Settled

- **Does `skills/skills-maker/workflows/review.md` get an edit, given #77's plan settled that a rule in `skills/skills-maker/workflows/new.md` reaches review without one?** Yes, and for the reason that plan gave for no: the rule's test reads a quoted span, and the real instances are one-line placeholders that the span test passes. That is a manifestation the rule does not make evident, which is the one condition the issue sets for a note in `skills/skills-maker/workflows/review.md`. The note says how it shows up, not what the rule is.
- **Is a rule a `feat` or a `docs` change?** `feat`, as #77 was: the skill's body is what it does, so a rule it did not have is behaviour it did not have, and the minor bump says the same thing.
