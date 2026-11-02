---
name: glossary-guru
metadata:
  version: "2.0.0"
description: |
  Load this as soon as a project turns out to hold a docs/GLOSSARY.json or a GLOSSARY.json, before writing code names, docs, commit messages or issue text in its domain, because it says what to do when a word disagrees with the file, which the file alone does not. Owns a project's glossary: its format, challenging a word that sits on an avoid list or contradicts a definition, adding, changing, folding or removing a term on the owner's decision, and generating a Vale rule and a readable GLOSSARY.md from it. Use when asked to define a term, settle what a word means, start a glossary or rename a domain concept; when two words compete for one concept; and when asked to catch a drifted word with Vale. Not for a skill's own terms, which stay inside that skill, not for ADRs, and not for general programming vocabulary.
---

# Glossary

A project's glossary gives each domain concept one name, because an agent otherwise copies whichever word it last saw and one concept ends up with several. The file holds the vocabulary and nothing else: it is neither a spec nor a place for implementation decisions.

A path in the project being worked on opens with `<repo-root>`. A bare path, such as `scripts/glossary-rule.py`, is inside this skill's own directory.

## Where it lives

Look for `<repo-root>/docs/GLOSSARY.json`, then `<repo-root>/GLOSSARY.json`. A file already at either path stays there, because moving it breaks every link to it. Where both exist, read both and ask the owner which one stays.

A new glossary goes at `<repo-root>/docs/GLOSSARY.json` where the project already has `<repo-root>/docs/`, and at `<repo-root>/GLOSSARY.json` where it does not. Never create `<repo-root>/docs/` for it, because one file is no reason to give a project a directory it chose not to have.

Create the file only when the first term is settled, and never as an empty file, because an empty glossary tells a reader a vocabulary was agreed when none was.

## Read it before writing

Where the project has a glossary, read the JSON file before writing names or prose in the project's domain: code identifiers, comments, docs, commit messages, issue and pull request text. Use the entry's term in everything you write, because every word written is one the next agent copies.

Call out a word that sits on an entry's `avoid` list or contradicts a definition, whoever wrote it, and ask rather than correct it silently, because the word may name a concept the glossary does not hold yet:

> The glossary defines **Member** as a user's membership in one group, but this says "user" for someone in a group. Which do you mean?

Where the word is in code or prose the current work does not touch, mention it and leave it, because renaming it is a change nobody asked for.

## The format

```json
{
  "project": "Shop",
  "summary": "What this project's domain is, in one or two sentences.",
  "terms": [
    {
      "term": "Order",
      "definition": "A customer's request to buy something, from the moment it is placed.",
      "avoid": ["purchase", "transaction"]
    },
    {
      "term": "Customer",
      "definition": "A person or organization that places orders.",
      "avoid": ["client", "buyer", "account"],
      "except": ["take into account", "on account of"]
    }
  ],
  "flagged_ambiguities": ["\"account\" had been used for both Customer and User; these are distinct."]
}
```

`project`, `summary` and `terms` are required. `flagged_ambiguities` is present only when it has entries.

An entry holds the term, a definition of one or two sentences saying what the term is rather than what it does, and an `avoid` list naming the words not to use for it. A term no other word competes with has no `avoid` list, because an invented word would send the next reader looking for drift that never happened.

An `except` list is optional, and names a phrase of two or more words where a word on an `avoid` list is correct, such as "take into account" for `account`. A check matches words without reading them, so without this list it would flag that phrase every time. An agent reading the glossary treats it the same way: the phrase is not drift. A term that holds a drift word, such as `Shopping Cart` holding `cart`, needs no such list, because the rule generated from the glossary skips the term by itself. A term with no space that holds one, such as `Pre-Order` holding `order`, is refused when the rule is generated, because Vale can only skip a phrase holding a space.

A term, and each word or phrase on an `avoid` or `except` list, is plain words only: letters, digits, spaces, hyphens, and `'` only as an apostrophe. The project name, the summary, a definition and a flagged ambiguity are one line each. `scripts/glossary-rule.py` refuses a file that breaks any of this, or that holds a key the format does not allow, because a misspelled key would otherwise lose its words silently. The rule matches a listed word whole, so `client` does not catch `clients`, and a plural the project uses needs listing too.

An entry stands on its own: it names no file path, class, method, table, config value, date, owner or issue link, so it stays true when the code it describes is renamed. It may lean on another entry, and a project-specific word it leans on needs an entry of its own, unless the word is a property some entry's definition explains.

Refuse an entry for a general programming term, such as a timeout, a queue or a session, however heavily the project uses it, and say why, because a reader already knows the word and an entry would only bury the ones that are specific to this project.

## Changing it

Add, change, fold or remove an entry only on the owner's decision: propose the wording, ask, and edit the JSON file as soon as they answer. An entry an agent settled alone is a guess that every later agent then enforces.

Edit only the JSON file. After every edit, rerun the script and commit what it writes, because a generated file that lags the JSON shows its reader a vocabulary the project has moved on from.

| Move | When | What happens |
| --- | --- | --- |
| Add | A term is settled that the file does not hold | A new entry under `terms` |
| Change | The meaning moved, or a new drift word appeared | The entry is rewritten, and any new drift word joins its `avoid` list |
| Fold | The term is a synonym or a property of another entry | Its meaning moves into the surviving entry and entries pointing at it repoint. A synonym joins that entry's `avoid` list, and a property's word stays in use, named in that entry's definition |
| Remove | The concept has left the project, and no entry can carry it | The entry is deleted, because version history keeps what it said |

Record a settled confusion as one line under `flagged_ambiguities`, because it is what stops the same argument happening twice.

Propose folding or removing only on evidence of where the concept went. A deleted class or path is not that evidence, because an entry is meant to outlive the code that implemented it.

## What the script writes

`scripts/glossary-rule.py` reads the JSON file and writes a Markdown file of the same name beside it, for a person to read, and one Vale `substitution` rule, so a drifted word is caught by a check as well as by a reader. Run it from the project's root, because it writes Vale files into the project:

```bash
python3 <skill-dir>/scripts/glossary-rule.py
```

That checks nothing. The check is a separate Vale run from inside the project, because Vale 3.25.1 looks for its config from the directory it runs in, and a project's CI can run it too:

```bash
vale <repo-root>
```

The rule lands at `<repo-root>/.vale/styles/Glossary/Terms.yml`, or in the same `Glossary` folder under the `StylesPath` in the project's Vale config where it names one.

A project with no config gets `assets/vale.ini.template` copied to `<repo-root>/.vale.ini`, and a project with one is told what it needs, because only the project knows which of its sections should run the check. A project under a config in a parent directory is refused, because every project beneath that config would share one rule file. A `StylesPath` pointing outside the project is the project's own choice, and two projects sharing one get the rule of whichever ran last.

With those files committed, a Vale run needs neither this skill nor Python and a person can read the glossary rendered. The next run replaces both, and refuses a file at either path that the script did not write.

`assets/vale.ini.template` holds the lines that turn the rule on, and explains in its comments what Vale checks and how to make a drifted word fail the run.

The check supports Latin script only. Vale 3.25.1 does not flag a word with no space or punctuation around it, as in Chinese, Japanese, Korean or Thai running text, and the script refuses a word holding a combining mark, as many Thai and Hindi words do.

## What it does not cover

A skill's own terms stay inside that skill: an installed skill carries its own directory and nothing from the repository root, so a term it relies on at run time has to be defined there. This skill governs a project's glossary and never a glossary file per skill or plugin.
