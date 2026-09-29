> 🤖 Written by AI --- read/modified by izkreny! 🤓

# review-text

A proofreader for prose: markdown, documentation, prompts, agent instruction files, code comments, UI copy, emails and commit messages. It reports spelling, grammar and punctuation errors apart from optional style suggestions, and edits the text only when you ask it to. Findings come ranked as `error`, `warning` or `suggestion`, and edits come back as a numbered table you can revert by number. It is not for reviewing code logic or a pull request, translating, or rewriting text in a new voice.

## Why it exists

An agent asked to check some text tends to rewrite it: it shifts the tone, restructures the markdown, and mixes real errors with its own preferences. This skill holds it to the smallest edit that fixes each issue, keeps corrections apart from suggestions, and edits nothing unless the action you typed asks for edits.

## Install

```bash
npx skills add izkreny/agentifico -g -y -s review-text
```

That is the [skills CLI](https://skills.sh).

## Invocation

Type `/review-text`, optionally followed by the text or a file path, then optionally a scope, `issues` or `style`, then optionally `fix`. Without `fix` it only reports, and without a scope it covers both. A last word of `issues`, `style` or `fix` is always read as an argument, so quote text that ends in one of those words. With no target it reviews your editor selection or active file where the harness exposes them, and otherwise asks for one. The skill never fires on its own: its frontmatter sets `disable-model-invocation: true`, and its description says so for agents that ignore that field.

| Argument | What it does |
| --- | --- |
| `issues` | Reports spelling, grammar and punctuation errors. |
| `style` | Reports wording, structure, ambiguity, tone and readability suggestions. |
| `fix` | Applies the corrections for the stated scope: `issues`, `style`, or both when no scope is stated. |
| none | Reports what `issues` and `style` find, and fixes nothing. |

## Inspiration

- [Vale's severity levels, as Elastic's docs define them](https://www.elastic.co/docs/contribute-docs/vale-linter): `error`, `warning` and `suggestion`.
- [skills-guru's review workflow](../skills-guru/workflows/review.md): ranking findings by consequence, and different is not wrong.
- [EveryInc/compound-writing, `cw-line-edit`](https://github.com/EveryInc/compound-writing/blob/main/skills/cw-line-edit/SKILL.md): numbered changes you revert by number, and claims kept at their scope, certainty and citation.
- [agkozak/llm-prompts](https://github.com/agkozak/llm-prompts): the original, revised and why table, and naming the formal word swaps to avoid.
- [blader/humanizer](https://github.com/blader/humanizer/blob/main/SKILL.md): adding no fact the source does not give, and reporting a weak pattern only when it recurs.
- [EveryInc/compound-writing, `cw-voice-check`](https://github.com/EveryInc/compound-writing/blob/main/skills/cw-voice-check/SKILL.md): the project's style guide ahead of built-in defaults, and a deliberate rule-break kept as the author's choice.
- [The proselint paper](https://suchow.io/assets/docs/pacer2016proselint.pdf): a style rule's right answer can flip with the audience.
- [mattpocock/skills, `writing-for-agents`](https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-for-agents/SKILL.md): stating the behaviour wanted rather than only the behaviour banned.
