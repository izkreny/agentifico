#!/usr/bin/env python3
"""Write a Vale substitution rule from a project's glossary.

Usage, from the project's root:

    python3 <skill-dir>/scripts/glossary-rule.py <styles-path>

Writes <styles-path>/Glossary/Terms.yml from the `_Avoid_:` and `_Except_:`
lines under `## Language`.

Exit 0: the rule was written. A glossary naming no drift word gets a rule that
swaps nothing, since `BasedOnStyles = Glossary` fails a Vale run with no style.
Exit 1: the glossary cannot become a correct rule; each reason is on stderr.
Exit 2: wrong arguments, or no single glossary to read.
"""

import json
import os
import re
import sys
from pathlib import Path
from typing import NoReturn

GLOSSARY_PATHS = (Path("docs/GLOSSARY.md"), Path("GLOSSARY.md"))
# WHY: Vale reads a swap key and an exception as a regular expression, so only text with no metacharacter is safe to pass through.
PLAIN_WORDS = re.compile(r"(?:[^\W_]|[ '-])+")
LIST_LINE = re.compile(r"_(Avoid|Except)_:(.*)")
# WHY: Vale 3.25.1 honours an exception only when it holds a space, so `Pre-Order` in `exceptions` silences nothing.
NO_SPACE = "holds no space, and Vale skips only a phrase that holds one"


def stop(message) -> NoReturn:
    print(message, file=sys.stderr)
    sys.exit(2)


def find_glossary():
    found = [path for path in GLOSSARY_PATHS if path.is_file()]
    if len(found) == 1:
        return found[0]
    if found:
        stop(f"glossary-rule: both {found[0]} and {found[1]} exist; the owner decides which one stays")
    stop("glossary-rule: no docs/GLOSSARY.md or GLOSSARY.md here; run this from the project's root")


def split_words(text):
    return [word.strip() for word in text.split(",")]


def parse_language(text):
    """Return each entry's term and its drift words, the skipped phrases, and any problems."""
    entries, exceptions, problems = [], [], []
    in_language = False
    for number, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if line.startswith("## "):
            in_language = line == "## Language"
        if not in_language:
            continue
        if line.startswith("### "):
            entries.append((line[4:].strip(), []))
            continue
        listed = LIST_LINE.fullmatch(line)
        if not listed:
            continue
        kind, words = listed[1], split_words(listed[2])
        if not entries:
            problems.append(f"line {number}: an _{kind}_: line belongs under an entry's ### heading")
            continue
        term = entries[-1][0]
        for word in words:
            if not PLAIN_WORDS.fullmatch(word):
                problems.append(f"{term}, line {number}: '{word}' must be letters, digits, spaces, hyphens or apostrophes")
            elif kind == "Except" and " " not in word:
                problems.append(f"{term}, line {number}: '{word}' {NO_SPACE}")
        if kind == "Avoid":
            entries[-1][1].extend(words)
        else:
            exceptions.extend(words)
    return entries, exceptions, problems


def build_swap(entries):
    """Map each drift word to its entry's term, naming every word no single replacement can serve."""
    terms = {term.casefold() for term, _ in entries}
    swap, owners, problems = {}, {}, []
    for term, words in entries:
        for word in words:
            key = word.casefold()
            if key in terms:
                problems.append(f"{term}: '{word}' is also an entry's term, so the rule would flag it where it is correct")
            elif owners.setdefault(key, term) != term:
                problems.append(f"{term}: '{word}' is also on {owners[key]}'s _Avoid_: line, so it has no single replacement")
            else:
                swap[word] = term
    return swap, problems


def terms_holding_drift(entries, swap):
    """Return each longer term a drift word sits inside, which the rule has to skip, and any it cannot skip."""
    held, problems = [], []
    for term, _ in entries:
        if any(re.search(rf"\b{re.escape(word)}\b", term, re.IGNORECASE) for word in swap):
            if not PLAIN_WORDS.fullmatch(term):
                problems.append(f"{term}: holds a drift word, so the rule must skip it, and it must be letters, digits, spaces, hyphens or apostrophes for that")
            elif " " not in term:
                problems.append(f"{term}: holds a drift word, so the rule must skip it, and it {NO_SPACE}")
            else:
                held.append(term)
    return held, problems


def render(swap, exceptions, styles_arg):
    lines = [
        "# Generated from the project's glossary by the glossary-guru skill. Edit the glossary, not this file.",
        f"# Regenerate from the project's root: python3 <skill-dir>/scripts/glossary-rule.py {styles_arg}",
        "extends: substitution",
        'message: "Use \'%s\' instead of \'%s\'."',
        "level: warning",
        "ignorecase: true",
    ]
    if exceptions:
        lines.append("exceptions:")
        # WHY: Vale matches an exception case-sensitively even under ignorecase, so each one carries its own flag.
        unique = {}
        for phrase in sorted(exceptions):
            unique.setdefault(phrase.casefold(), phrase)
        lines.extend(f"  - {json.dumps('(?i)' + unique[key], ensure_ascii=False)}" for key in sorted(unique))
    lines.append("swap:" if swap else "swap: {}")
    for word in sorted(swap, key=str.casefold):
        lines.append(f"  {json.dumps(word, ensure_ascii=False)}: {json.dumps(swap[word], ensure_ascii=False)}")
    return "\n".join(lines) + "\n"


def main():
    if len(sys.argv) != 2 or sys.argv[1].startswith("-"):
        stop(__doc__)
    # WHY: the path lands in a committed file's comment, so it stays relative however it was typed.
    styles_arg = os.path.relpath(sys.argv[1])
    glossary = find_glossary()
    entries, exceptions, problems = parse_language(glossary.read_text(encoding="utf-8"))
    swap, swap_problems = build_swap(entries)
    held_terms, held_problems = terms_holding_drift(entries, swap)
    problems += swap_problems + held_problems
    exceptions += held_terms
    if problems:
        print(f"glossary-rule: {glossary} cannot become a correct rule:", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        return 1
    rule = Path(styles_arg) / "Glossary" / "Terms.yml"
    rule.parent.mkdir(parents=True, exist_ok=True)
    rule.write_text(render(swap, exceptions, styles_arg), encoding="utf-8")
    print(f"glossary-rule: wrote {rule} with {len(swap)} word(s) from {glossary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
