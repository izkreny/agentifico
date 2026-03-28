---
name: review-text
description: 'Review prose for spelling, grammar, punctuation, style, clarity, tone, and readability. Use for proofreading selected text, markdown, documentation, prompts, AGENTS.md, README files, code comments, and UI copy. Can either report issues only or apply minimal edits when asked.'
argument-hint: '[text | file] [issues | style | fix | all]'
user-invocable: true
disable-model-invocation: true
---

# Review text

## When to Use

- Check `selected text` or a `whole file` for spelling, grammar, punctuation, style, or clarity.
- Review markdown, documentation, prompts, AGENTS.md files, comments, UI copy, emails, or commit messages.
- Tighten phrasing without changing meaning.
- Apply minimal wording fixes after the user asks to update the text.

## Instructions

- Identify the request scope:
  - `selected text`
  - `whole file`
- Identify the request actions:
  - `spelling and grammar issues`: report only objective language issues.
  - `style and clarity feedback`: report wording, structure, ambiguity, tone, and readability issues.
  - `apply fixes`: update the text directly with the smallest effective edits.
  - `all`: do all of the above actions
- Read the exact current text before making claims. Prefer the active selection or active file when available.
- Separate objective corrections from optional style suggestions.
- Preserve the author's intent, technical meaning, terminology, tone, and formatting.
- Be explicit about confidence.
  - Say `no issues found` when none are present.
  - Mark subjective wording suggestions as optional.
- When rewriting text:
  - Prefer the smallest edit that fixes the issue.
  - Do not rewrite code, identifiers, or quoted literals unless explicitly requested.
  - Keep markdown structure unchanged unless the structure itself is part of the problem.
- When editing workspace files, change only the relevant text and avoid unrelated rewrites.

## Response Pattern

- For review-only requests:
  - State whether any issues were found.
  - List issues with short explanations and suggested wording.
  - Include a cleaned-up snippet only when it adds value.
- For apply requests:
  - Make the minimal edits directly.
  - Summarize what changed.
  - Mention any remaining optional style improvements separately.

## Style Heuristics

- Prefer direct instructions over biography in agent and configuration files.
- Prefer operational verbs such as `apply`, `use`, `follow`, `load`, and `check` in instruction files.
- Remove filler phrases, duplicated words, and unnecessary commas.
- Keep parallel lists grammatically parallel.

## Boundaries

- Do not change meaning without asking.
- Do not silently replace domain terminology that may be deliberate.
- Preserve informal tone unless the user asks for a different tone.
