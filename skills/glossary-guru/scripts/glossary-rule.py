#!/usr/bin/env python3
"""Write a Vale substitution rule from a project's glossary.

Usage, from the project's root:

    python3 <skill-dir>/scripts/glossary-rule.py

Writes Glossary/Terms.yml from the `_Avoid_:` and `_Except_:` lines under
`## Language`, under the StylesPath in the project's Vale config, or under
.vale/styles where the config names none. A project with no Vale config gets a
.vale.ini that turns the rule on; one that has a config is told the lines to add.

Exit 0: the rule was written. A glossary naming no drift word gets a rule that
swaps nothing, since `BasedOnStyles = Glossary` fails a Vale run with no style.
Exit 1: the glossary cannot become a correct rule; each reason is on stderr.
Exit 2: an argument, no single glossary to read, or more than one Vale config.
"""

import json
import re
import sys
from pathlib import Path
from typing import NoReturn

GLOSSARY_PATHS = (Path("docs/GLOSSARY.md"), Path("GLOSSARY.md"))
# WHY: Vale 3.25.1 finds its config under exactly these names, and a project with one of them must not get a second.
CONFIG_PATHS = (Path(".vale.ini"), Path("vale.ini"), Path("_vale.ini"), Path(".vale"), Path("_vale"))
DEFAULT_STYLES = ".vale/styles"
STYLES_LINE = f"StylesPath = {DEFAULT_STYLES}"
STYLE_LINES = ["[*.{md,rb}]", "BasedOnStyles = Glossary"]
# WHY: a rule has no key limiting it by file path, and the glossary has to name its drift words, so only the config can keep the rule off it.
GLOSSARY_LINES = ["[**/GLOSSARY.md]", "Glossary.Terms = NO"]
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


def find_config():
    found = [path for path in CONFIG_PATHS if path.is_file()]
    if len(found) > 1:
        stop(f"glossary-rule: {' and '.join(map(str, found))} exist; the owner decides which one stays")
    return found[0] if found else None


def styles_path_in(config_text):
    """Return the config's StylesPath, which Vale reads only above every section."""
    for raw in config_text.splitlines():
        line = raw.strip()
        if line.startswith("["):
            return None
        match = re.fullmatch(r"StylesPath\s*=\s*(.*)", line)
        if match:
            return match[1].strip("\"' ") or None
    return None


def lines_to_add(config_text, styles_path):
    lines = [] if styles_path else [STYLES_LINE]
    if not re.search(r"^\s*BasedOnStyles\s*=.*\bGlossary\b", config_text, re.MULTILINE):
        lines += STYLE_LINES
    if not re.search(r"^\s*Glossary\.Terms\s*=\s*NO\b", config_text, re.MULTILINE):
        lines += GLOSSARY_LINES
    return lines


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


def render(swap, exceptions):
    lines = [
        "# Generated from the project's glossary by the glossary-guru skill. Edit the glossary, not this file.",
        "# Regenerate from the project's root: python3 <skill-dir>/scripts/glossary-rule.py",
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
            # WHY: `casefold` makes `ß` equal `ss` and `(?i)` does not, so a phrase dropped on that key would fire as drift.
            unique.setdefault(phrase.lower(), phrase)
        lines.extend(f"  - {json.dumps('(?i)' + unique[key], ensure_ascii=False)}" for key in sorted(unique))
    lines.append("swap:" if swap else "swap: {}")
    for word in sorted(swap, key=str.casefold):
        lines.append(f"  {json.dumps(word, ensure_ascii=False)}: {json.dumps(swap[word], ensure_ascii=False)}")
    return "\n".join(lines) + "\n"


def main():
    if len(sys.argv) != 1:
        stop(__doc__)
    glossary = find_glossary()
    config = find_config()
    config_text = config.read_text(encoding="utf-8") if config else ""
    styles_path = styles_path_in(config_text)
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
    rule = Path(styles_path or DEFAULT_STYLES) / "Glossary" / "Terms.yml"
    rule.parent.mkdir(parents=True, exist_ok=True)
    rule.write_text(render(swap, exceptions), encoding="utf-8")
    print(f"glossary-rule: wrote {rule} with {len(swap)} word(s) from {glossary}")
    if config is None:
        CONFIG_PATHS[0].write_text("\n\n".join([STYLES_LINE, "\n".join(STYLE_LINES), "\n".join(GLOSSARY_LINES)]) + "\n", encoding="utf-8")
        print(f"glossary-rule: wrote {CONFIG_PATHS[0]}, which turns the rule on")
    elif missing := lines_to_add(config_text, styles_path):
        print(f"glossary-rule: add these lines to {config} to turn the rule on, with any StylesPath above every section:")
        print("\n".join(missing))
    return 0


if __name__ == "__main__":
    sys.exit(main())
