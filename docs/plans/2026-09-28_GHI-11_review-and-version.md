> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Review and version review-text

Issue [#11](https://github.com/izkreny/agentifico/issues/11). Not part of an epic, so the branch is cut from `main` and not stacked.

## What the review found

The owner ran `/skills-maker review skills/review-text` on 2026-09-28. Its findings, and what this branch does with each:

- RT1: the `argument-hint` tokens map to no action in the body, and nothing sets a default. The body maps each token to its action, and with no action given the skill reports only; it edits only on `fix` or `all`.
- RT2: the description never says the skill is explicit invocation only, which fails `skill-invocation`. The description says it is typed as `/review-text`.
- RT3: "emails" and "commit messages" are triggers in the body only. They move into the description.
- RT4: the description is a single-quoted value with no boundary. It becomes a `|` block scalar and gains a sentence on what the skill is not for.
- RT5: no `README.md`, which fails `skill-readme`. The README lands.
- RT6: "all of the above actions" is a position claim. It names the actions instead.
- RT7: no rule gives its reason. Each gets one, in a sentence.
- RT8: the smallest-edit rule is stated four times, marking suggestions optional three times, and preserving tone twice. Each is stated once.
- RT9: "Be explicit about confidence" leads items that are not about confidence. The items join the rules they restate, and the lead goes.

## Steps

- Rewrite `skills/review-text/SKILL.md` to close RT1 to RT4 and RT6 to RT9.
- Write 'skills/review-text/README.md' to close RT5.
- Set `metadata.version` to `1.0.0`, the package's first version.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `node skills/skills-maker/scripts/check.js skills/review-text`

The check proves the frontmatter parses, the invocation field is matched by the description, the README exists with an install form, and the prose breaks no recorded rule. No gate reads whether the skill reviews text well; that is the owner's judgement from using it.

## Settled

- What does the skill do when no action is given? It reports only. The owner typed `auto 11` after the review recommended this, which this plan takes as agreement.
