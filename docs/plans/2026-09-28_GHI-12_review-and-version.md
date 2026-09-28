> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Review and version socratic-tutor

Issue [#12](https://github.com/izkreny/agentifico/issues/12). Not part of an epic, so the branch is cut from `main` and not stacked.

## What the review found

The owner ran `/skills-maker review skills/socratic-tutor` on 2026-09-28. Its findings, and what this branch does with each:

- The description set a persona and named an "ASK agent mode" no Claude Code session has, and said nothing about what the skill is not for. The owner decided the skill is invoked by the user only, so the frontmatter sets `disable-model-invocation: true`, and the description says so and gains a boundary sentence.
- The description was a single-quoted value. It becomes a `|` block scalar.
- No `README.md`, which fails `skill-readme`. The README lands, with the sources the rewrite borrows from as a list of links.
- STEP 4 allowed the final answer only once every question was answered, while STEP 3 let the owner skip there early. STEP 4 names both ways in.
- STEPs 1 and 2 banned hints outright, while STEP 3 allowed them. The ban now covers the question itself, and STEP 3 says where hints go.
- No rule gave its reason. Each gets one, in a sentence.
- STEP 4 asked for a framing that could change "the recommendation", which a factual answer does not have. It asks for one only where the answer is a recommendation.

## The design the owner settled

The tutor works out the correct answer up front and plans a short path of checkpoints to it, but words each question from the owner's last answer. It skips, adds or reroutes checkpoints when the answer calls for it. That keeps the prepared destination the owner's own experience asked for, and it follows the owner's reasoning, which a question list written before any answer cannot.

The rewrite borrows from the research the review started with: graded hints, asking why a correct answer is correct, answering a wrong one with its consequences, stepping back after a run of short replies, and no empty praise. Each source is linked from the README.

## Steps

- Rewrite `skills/socratic-tutor/SKILL.md`: the frontmatter, the checkpoint design, the contradictions fixed, a reason on every rule.
- Write 'skills/socratic-tutor/README.md'.
- Set `metadata.version` to `1.0.0`, the package's first version.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `node skills/skills-maker/scripts/check.js skills/socratic-tutor`

The check proves the frontmatter parses, the invocation field is matched by the description, the README exists with an install form, and the prose breaks no recorded rule. No gate reads whether the tutor actually teaches well; that is the owner's judgement from using it.
