---
name: glossary-guru
metadata:
  version: "1.1.0"
description: |
  Own a project's glossary: the format of its GLOSSARY.md, reading it before writing names or prose in the project's domain, challenging a word that sits on an _Avoid_ line or contradicts a definition, adding, changing, folding or retiring a term on the owner's decision, and generating a Vale rule from it. Use whenever a project holds a GLOSSARY.md and the work writes code names, docs, commit messages or issue text in its domain; when asked to define a term, settle what a word means, start a glossary or rename a domain concept; when two words compete for one concept; and when asked to catch a drifted word with Vale. Not for a skill's own terms, which stay inside that skill, not for ADRs, and not for general programming vocabulary.
---

# Glossary

A project's glossary gives each domain concept one name, because an agent otherwise copies whichever word it last saw and one concept ends up with several. The file holds the vocabulary and nothing else: it is neither a spec nor a place for implementation decisions.

A path in the project being worked on opens with `<repo-root>`. A bare path, such as `scripts/glossary-rule.py`, is inside this skill's own directory.

## Where it lives

Look for `<repo-root>/docs/GLOSSARY.md`, then `<repo-root>/GLOSSARY.md`. A file already at either path stays there, because moving it breaks every link to it. Where both exist, read both and ask the owner which one stays.

A new glossary goes at `<repo-root>/docs/GLOSSARY.md` where the project already has `<repo-root>/docs/`, and at `<repo-root>/GLOSSARY.md` where it does not. Never create `<repo-root>/docs/` for it, because one file is no reason to give a project a directory it chose not to have.

Create the file only when the first term is settled, and never as an empty file, because an empty glossary tells a reader a vocabulary was agreed when none was.

## Read it before writing

Where the project has a glossary, read it before writing names or prose in the project's domain: code identifiers, comments, docs, commit messages, issue and pull request text. Use the entry's term in everything you write, because every word written is one the next agent copies.

Call out a word that sits on an `_Avoid_:` line or contradicts a definition, whoever wrote it, and ask rather than correct it silently, because the word may name a concept the glossary does not hold yet:

> The glossary defines **Member** as a user's membership in one group, but this says "user" for someone in a group. Which do you mean?

Where the word is in code or prose the current work does not touch, mention it and leave it, because renaming it is a change nobody asked for.

## The format

```markdown
# {Project name}

{One or two sentences on what this project's domain is.}

## Language

### Order

A customer's request to buy something, from the moment it is placed.

_Avoid_: purchase, transaction

### Customer

A person or organization that places orders.

_Avoid_: client, buyer, account

_Except_: take into account, on account of

## Relationships

- A **Customer** places many **Orders**.

## Flagged ambiguities

- "account" had been used for both Customer and User; these are distinct.

## Retired

- **Voucher**: a prepaid credit a customer could spend, removed when prepaid credit was dropped.
```

The sections are `## Language`, `## Relationships`, `## Flagged ambiguities` and `## Retired`, in that order. Each is present only when it has entries, and `## Relationships` holds only what a reader needs and the entries cannot say alone, such as ownership or cardinality.

An entry is the term as a `###` heading, a definition of one or two sentences saying what the term is rather than what it does, and an `_Avoid_:` line naming the words not to use for it. The heading gives the entry a link of its own and a place in the page's outline, and the blank lines keep each part on its own line when the file is rendered. A term no other word competes with has no `_Avoid_:` line, because an invented word would send the next reader looking for drift that never happened.

An `_Except_:` line is optional, and names a phrase of two or more words where a word on the `_Avoid_:` line is correct, such as "take into account" for `account`. A check matches words without reading them, so without this line it would flag that phrase every time. An agent reading the glossary treats it the same way: the phrase is not drift. A term that holds a drift word, such as `Shopping Cart` holding `cart`, needs no such line, because the rule generated from the glossary skips the term by itself. A term with no space that holds one, such as `Pre-Order` holding `order`, is refused when the rule is generated, because Vale can only skip a phrase holding a space.

On an `_Avoid_:` or `_Except_:` line, a comma separates one word or phrase from the next, and a phrase takes no quotes, because the script refuses a quote mark.

An entry stands on its own: it names no file path, class, method, table, config value, date, owner or issue link, so it stays true when the code it describes is renamed. It may lean on another entry, and a project-specific word it leans on needs an entry of its own, unless the word is a property some entry's definition explains.

Refuse an entry for a general programming term, such as a timeout, a queue or a session, however heavily the project uses it, and say why, because a reader already knows the word and an entry would only bury the ones that are specific to this project.

## Changing it

Add, change, fold or retire an entry only on the owner's decision: propose the wording, ask, and edit the file as soon as they answer. An entry an agent settled alone is a guess that every later agent then enforces.

| Move | When | What happens |
| --- | --- | --- |
| Add | A term is settled that the file does not hold | A new entry under `## Language` |
| Change | The meaning moved, or a new drift word appeared | The entry is rewritten, and any new drift word joins its `_Avoid_:` line |
| Fold | The term is a synonym or a property of another entry | Its meaning moves into the surviving entry and entries pointing at it repoint. A synonym joins that entry's `_Avoid_:` line, and a property's word stays in use, named in that entry's definition |
| Retire | The concept has left the project, and no entry can carry it | One line under `## Retired` saying what the term meant and what removed it, with the entry itself gone |

Record a settled confusion as one line under `## Flagged ambiguities`, because it is what stops the same argument happening twice.

Propose folding or retiring only on evidence of where the concept went. A deleted class or path is not that evidence, because an entry is meant to outlive the code that implemented it.

## Automatic rule check

`scripts/glossary-rule.py` turns the `_Avoid_:` and `_Except_:` lines into one Vale `substitution` rule, so a drifted word is caught by a check as well as by a reader. Run it from the project's root, and again whenever either kind of line changes, because the rule only knows what the glossary said when it was generated:

```bash
python3 <skill-dir>/scripts/glossary-rule.py
```

The rule lands at `<styles-path>/Glossary/Terms.yml`, where `<styles-path>` is the `StylesPath` in the project's Vale config, or `<repo-root>/.vale/styles` where the config names none. A project with no config gets `assets/vale.ini.template` copied to `<repo-root>/.vale.ini`, and a project with one is told which of that file's lines to add. Commit what it writes, so a Vale run needs neither this skill nor Python, and never edit the rule by hand, because the next run replaces it.

`assets/vale.ini.template` holds the lines that turn the rule on, and explains in its comments what Vale checks and how to make a drifted word fail the run.

## What it does not cover

A skill's own terms stay inside that skill: an installed skill carries its own directory and nothing from the repository root, so a term it relies on at run time has to be defined there. This skill governs a project's glossary and never a glossary file per skill or plugin.
