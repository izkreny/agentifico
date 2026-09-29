---
name: review-text
description: |
  Review prose for spelling, grammar, punctuation, style, clarity, tone and readability, reporting the issues or applying minimal edits when asked. Use for proofreading, or tightening the phrasing of, selected text, markdown, documentation, prompts, AGENTS.md, README files, code comments, UI copy, emails and commit messages. Invoked explicitly only, by the user typing `/review-text`: an agent never loads it on its own. Not for reviewing code logic or a pull request, translating, or rewriting text in a new voice.
argument-hint: '[text | file] [issues | style] [fix]'
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

The arguments are a target, then an optional scope, then an optional action. A last word of `fix` is the action, a last remaining word of `issues` or `style` is the scope, and everything before them is the target; to review text that ends in one of those words, quote the text. The target is the text to review, or the path of a file holding it. With no target, review the active selection or the active file where the harness exposes them, and otherwise ask, because a review of a guessed target wastes the whole pass.

`issues` and `style` set the scope, and `fix` is the one action; without it the skill reports, which is the default:

| Argument | What it does |
| --- | --- |
| `issues` | Reports spelling, grammar and punctuation errors. |
| `style` | Reports wording, structure, ambiguity, tone and readability suggestions. |
| `fix` | Applies the corrections for the stated scope: `issues`, `style`, or both when no scope is stated. |
| none | Reports what `issues` and `style` find, and fixes nothing. |

Only `fix` edits the text, because an edit the user did not ask for is one they have to find and undo.

## Instructions

- Read the exact current text before making any claim about it, because a claim about text you have not read is a guess.
- Before judging style, look for the project's own style guide, such as a STYLE.md file, a Vale configuration or the style rules in its AGENTS.md. The user's instructions for this request win over it, and it wins over this skill's `## Style Heuristics`, because the project's conventions are the author's and the heuristics are only defaults.
- Give every finding one level, because the level tells the user how much weight it carries: `error` for text that is wrong in any register, such as a misspelling or a broken agreement; `warning` for text that is very likely wrong but has a deliberate reading; `suggestion` for a preference, which is always optional. A choice you would not make is a `suggestion` at most, because different is not wrong.
- Report a weak pattern, such as one passive sentence, only where it recurs or clearly costs the reader, because a finding on every instance buries the ones that matter.
- Say `no issues found` when there are none, because an invented finding costs the user a check and teaches them to distrust the rest.
- Preserve the author's tone, an informal tone included, unless the user asks for another, because the text is theirs and the review serves it.
- Treat a deliberate rule-break that carries the author's voice, such as a fragment for emphasis, as their choice rather than an error, because smoothing it out erases the voice the rule-break was there for.
- Make the smallest edit that fixes each issue and change nothing else in the text, because every extra change is one more line the user has to check.
- Leave code, identifiers and quoted literals alone unless the user asks, because a changed identifier breaks whatever refers to it.
- Keep the formatting and markdown structure unless the user asks for another or the structure itself is the problem, because readers and tools may depend on it.

## Response Pattern

- For a report, say whether anything was found, then list the findings `error` first, `warning` next and `suggestion` last, and by consequence within each level, so the one that matters most is read first. Give each the quoted original, a short explanation and the suggested wording. Add a cleaned-up snippet only where the list alone is hard to apply, because otherwise it repeats the list.
- For an edit, make the edits, then show a numbered table of them with the columns `#`, `Original`, `Revised` and `Why`, so the user can check each change without diffing the file and undo one by its number ("revert 3"). For inline text, return the corrected text in full before the table, because there is no file for the user to open.

## Style Heuristics

- In agent and configuration files, prefer direct instructions over biography, because an agent acts on an instruction and can do nothing with a backstory.
- In instruction files, prefer operational verbs such as `apply`, `use`, `follow`, `load` and `check`, because each names an action the reader can take.
- Remove filler phrases, duplicated words and unnecessary commas, because each costs the reader attention and carries nothing.
- Keep parallel list items grammatically parallel, because a list that changes shape midway reads as two lists.
- Keep plain words plain: `use` stays `use` rather than `utilize`, and `people` stays `people` rather than `individuals`, because a formal swap changes the voice and adds nothing.
- Judge a style rule by the text's audience, because the right choice can flip with it: `extensible` beats `extendable` in software writing and loses to it elsewhere.
- In instruction files, suggest stating the behaviour wanted rather than only the behaviour banned, because a prohibition puts the banned behaviour in front of the agent that reads it.

## Boundaries

- Ask before any change that would alter the meaning, because only the author knows which meaning was intended.
- Keep every fact, name, number, date, quote and citation as the source gives it, and each claim at the scope and certainty it was written with, because a proofread that changes what the text claims has edited its content.
- Flag domain terminology you would change instead of replacing it, because a term that looks wrong to a general reader is often right for the intended one.
