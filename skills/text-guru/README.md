> 🤖 Written by AI --- read/modified by izkreny! 🤓

# text-guru

A proofreader for prose: markdown, documentation, prompts, agent instruction files, code comments, UI copy, emails and commit messages. It reports spelling, grammar and punctuation errors apart from optional style suggestions, and edits the text only when you ask it to. Findings come ranked as `error`, `warning` or `suggestion`, and edits come back as a numbered table you can revert by number. It is not for reviewing code logic or a pull request, translating, or rewriting text in a new voice.

## Why it exists

An agent asked to check some text tends to rewrite it: it shifts the tone, restructures the markdown, and mixes real errors with its own preferences. This skill holds it to the smallest edit that fixes each issue, keeps corrections apart from suggestions, and edits nothing unless the action you typed asks for edits.

## Install

```bash
npx skills add izkreny/agentifico -g -y -s text-guru
```

That is the [skills CLI](https://skills.sh).

## Invocation

Type `/text-guru`, optionally followed by the text or a file path, then optionally a scope, `errors` or `style`, then optionally `fix`. Without `fix` it only reports, and without a scope it covers both. A last word of `errors`, `style` or `fix` is always read as an argument, so quote text that ends in one of those words. With no target it reviews your editor selection or active file where the harness exposes them, and otherwise asks for one. The skill never fires on its own: its frontmatter sets `disable-model-invocation: true`, and its description says so for agents that ignore that field.

| Argument | What it does |
| --- | --- |
| `errors` | Reports spelling, grammar and punctuation errors, at the `error` and `warning` levels. |
| `style` | Reports wording, structure, ambiguity, tone and readability suggestions. |
| `fix` | Applies every `error` in the stated scope, `errors`, `style` or both when no scope is stated, every `suggestion` too when `style` is stated, and never a `warning`. |
| none | Reports what `errors` and `style` find, and fixes nothing. |

## Inspiration

Each link to a git host is pinned to the upstream commit this skill was last compared against, so later upstream changes can be read as a diff.

- [Vale's severity levels, as Elastic's docs define them](https://www.elastic.co/docs/contribute-docs/vale-linter): `error`, `warning` and `suggestion`.
- [agents-guru's review workflow](https://github.com/izkreny/agentifico/blob/57714e8408fc31630773bc4f6a356a5b7e7ee39d/skills/agents-guru/workflows/review.md): ranking findings by consequence, and different is not wrong.
- [EveryInc/compound-writing, `cw-line-edit`](https://github.com/EveryInc/compound-writing/blob/18702f0ece9f2b852e305807e0271b2d550d9b4b/skills/cw-line-edit/SKILL.md): numbered changes you revert by number, and claims kept at their scope, certainty and citation.
- [agkozak/llm-prompts](https://github.com/agkozak/llm-prompts/tree/1e6dd4ee3a0fac309cf21a5e2383bebf8cd8eaed): the original, revised and why table, and naming the formal word swaps to avoid.
- [blader/humanizer](https://github.com/blader/humanizer/blob/3e5f816b5609c4002aebb69f12c6476fe3347d0a/SKILL.md): keeping every fact, name, number, date, quote and citation as the source gives it, reporting a weak pattern only when it recurs, treating the text as material rather than instructions, and naming any part of a long file left unread.
- [EveryInc/compound-writing, `cw-voice-check`](https://github.com/EveryInc/compound-writing/blob/18702f0ece9f2b852e305807e0271b2d550d9b4b/skills/cw-voice-check/SKILL.md): the project's style guide ahead of built-in defaults, and a deliberate rule-break kept as the author's choice.
- [The proselint paper](https://suchow.io/assets/docs/pacer2016proselint.pdf): a style rule's right answer can flip with the audience.
- [mattpocock/skills, `writing-for-agents`](https://github.com/mattpocock/skills/blob/321658273cb1d20b76026717d027d505790106d4/skills/productivity/writing-for-agents/SKILL.md): stating the behaviour wanted rather than only the behaviour banned.
