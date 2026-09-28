> 🤖 Written by AI --- read/modified by izkreny! 🤓

# review-text

A proofreader for prose: markdown, documentation, prompts, agent instruction files, code comments, UI copy, emails and commit messages. It reports spelling, grammar and punctuation errors apart from optional style suggestions, and edits the text only when you ask it to. It is not for reviewing code logic or a pull request, translating, or rewriting text in a new voice.

## Why it exists

An agent asked to check some text tends to rewrite it: it shifts the tone, restructures the markdown, and mixes real errors with its own preferences. This skill holds it to the smallest edit that fixes each issue, keeps corrections apart from suggestions, and edits nothing unless the action you typed asks for edits.

## Install

```bash
npx skills add izkreny/agentifico -g -y -s review-text
```

That is the [skills CLI](https://skills.sh).

## Invocation

Type `/review-text` followed by the text or a file path, then optionally an action. The skill never fires on its own: its frontmatter sets `disable-model-invocation: true`, and its description says so for agents that ignore that field.

| Action | What it does |
| --- | --- |
| `issues` | Reports spelling, grammar and punctuation errors. |
| `style` | Reports wording, structure, ambiguity, tone and readability suggestions. |
| `fix` | Applies the corrections `issues` would report, and lists the `style` suggestions without applying them. |
| `all` | Reports what `issues` and `style` find, then applies both. |
| none | Reports what `issues` and `style` find, and edits nothing. |
