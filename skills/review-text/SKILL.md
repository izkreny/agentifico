---
name: review-text
description: |
  Review prose for spelling, grammar, punctuation, style, clarity, tone and readability, reporting the issues or applying minimal edits when asked. Use for proofreading selected text, markdown, documentation, prompts, AGENTS.md, README files, code comments, UI copy, emails and commit messages. Invoked explicitly only, by the user typing `/review-text`: an agent never loads it on its own. Not for reviewing code logic or a pull request, translating, or rewriting text in a new voice.
argument-hint: '[text | file] [issues | style | fix | all]'
user-invocable: true
disable-model-invocation: true
metadata:
  version: "1.0.0"
---

# Review text

## When to Use

- Proofread selected text or a whole file for spelling, grammar, punctuation, style or clarity.
- Review markdown, documentation, prompts, AGENTS.md files, code comments, UI copy, emails or commit messages.
- Tighten phrasing without changing meaning.

## Arguments

The first argument is the text to review, or the path of a file holding it. Without one, review the active selection or the active file where the harness exposes them, and otherwise ask, because a review of a guessed target wastes the whole pass.

The second argument picks the action:

| Argument | What it does |
| --- | --- |
| `issues` | Reports spelling, grammar and punctuation errors. |
| `style` | Reports wording, structure, ambiguity, tone and readability suggestions. |
| `fix` | Applies the corrections `issues` would report, and lists the `style` suggestions without applying them. |
| `all` | Reports what `issues` and `style` find, then applies both. |
| none | Reports what `issues` and `style` find, and edits nothing. |

Only `fix` and `all` edit the text, because an edit the user did not ask for is one they have to find and undo.

## Instructions

- Read the exact current text before making any claim about it, because a claim about text you have not read is a guess.
- Keep objective corrections apart from style suggestions, and mark every style suggestion optional, because the user accepts the first and weighs the second.
- Say `no issues found` when there are none, because an invented finding costs the user a check and teaches them to distrust the rest.
- Preserve the author's tone and formatting, an informal tone included, unless the user asks for another, because the text is theirs and the review serves it.
- Make the smallest edit that fixes each issue and change nothing else in the file, because every extra change is one more line the user has to check.
- Leave code, identifiers and quoted literals alone unless the user asks, because a changed identifier breaks whatever refers to it.
- Keep the markdown structure unless the structure is the problem, because readers and tools may depend on it.

## Response Pattern

- For a report, say whether anything was found, then list each finding with a short explanation and the suggested wording. Add a cleaned-up snippet only where the list alone is hard to apply, because otherwise it repeats the list.
- For an edit, make the edits, then summarise what changed, so the user can check them without diffing the file.

## Style Heuristics

- In agent and configuration files, prefer direct instructions over biography, because an agent acts on an instruction and can do nothing with a backstory.
- In instruction files, prefer operational verbs such as `apply`, `use`, `follow`, `load` and `check`, because each names an action the reader can take.
- Remove filler phrases, duplicated words and unnecessary commas, because each costs the reader attention and carries nothing.
- Keep parallel list items grammatically parallel, because a list that changes shape midway reads as two lists.

## Boundaries

- Ask before any change that would alter the meaning, because only the author knows which meaning was intended.
- Never replace domain terminology silently, because a term that looks wrong to a general reader is often right for the intended one.
