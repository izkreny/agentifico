#!/usr/bin/env python3
"""Write a Vale substitution rule from a project's glossary.

Usage, from the project's root:

    python3 <skill-dir>/scripts/glossary-rule.py

Writes Glossary/Terms.yml from the `_Avoid_:` and `_Except_:` lines under
`## Language`, under the StylesPath in the project's Vale config, or under
.vale/styles where the config names none. A project with no Vale config gets a
.vale.ini that turns the rule on; one that has a config is told what it needs.

Exit 0: the rule was written. A glossary naming no drift word gets a rule that
swaps nothing, since `BasedOnStyles = Glossary` fails a Vale run with no style.
Exit 1: the glossary cannot become a correct rule; each reason is on stderr.
Exit 2: an argument, no single glossary to read, no single Vale config to read,
or nowhere to write the rule.
"""

import json
import re
import sys
from configparser import ConfigParser
from configparser import Error as ConfigParserError
from pathlib import Path
from typing import NoReturn

GLOSSARY_PATHS = (Path("docs/GLOSSARY.md"), Path("GLOSSARY.md"))
# WHY: Vale 3.25.1 finds its config under exactly these names, and a project with one of them must not get a second.
CONFIG_NAMES = (".vale.ini", "vale.ini", "_vale.ini", ".vale", "_vale")
DEFAULT_STYLES = ".vale/styles"
ABOVE_SECTIONS = "glossary-rule: above every section"
# WHY: the name carries `.template` so that a Vale run started in this skill's directory never takes it for a config.
TEMPLATE = Path(__file__).resolve().parent.parent / "assets" / "vale.ini.template"
# WHY: Vale reads a swap key and an exception as a regular expression, so only text with no metacharacter is safe to pass through.
PLAIN_WORDS = re.compile(r"(?:[^\W_]|[ -]|(?<=[^\W_])'(?=[^\W_]| ))+")
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
    here = [Path(name) for name in CONFIG_NAMES if Path(name).is_file()]
    if len(here) > 1:
        stop(f"glossary-rule: {' and '.join(map(str, here))} exist; the owner decides which one stays")
    if here:
        return here[0]
    for directory in Path.cwd().parents:
        for name in CONFIG_NAMES:
            if (directory / name).is_file():
                # WHY: the rule's file name is fixed, so every project beneath a shared config would overwrite the others' rule.
                stop(f"glossary-rule: Vale here reads {directory / name}, which other projects may share; run this from that directory, or add a config here")
    return None


def read_config(path):
    parser = ConfigParser(interpolation=None, strict=False, allow_no_value=True, delimiters=("=", ":"), inline_comment_prefixes=("#", ";"))
    parser.optionxform = str
    try:
        # WHY: Vale keeps StylesPath above every section, and configparser reads nothing outside one.
        parser.read_string(f"[{ABOVE_SECTIONS}]\n" + path.read_text(encoding="utf-8"))
    except ConfigParserError as error:
        stop(f"glossary-rule: cannot read {path}: {error}")
    styles_path = (parser[ABOVE_SECTIONS].get("StylesPath") or "").strip("\"' ") or None
    return styles_path, [(heading, dict(parser[heading])) for heading in parser.sections() if heading != ABOVE_SECTIONS]


# WHY: only the project knows which of its sections should run the check, and a later matching section replaces an earlier one, so computed lines can take its styles away.
def config_advice(config, styles_path):
    template_styles, template_sections = read_config(TEMPLATE)
    lines = [f"glossary-rule: to check a file, {config} needs Glossary in the BasedOnStyles of the section covering it, and these lines, with any StylesPath above every section:"]
    if not styles_path:
        lines.append(f"StylesPath = {template_styles}")
    for heading, settings in template_sections:
        for key, value in settings.items():
            if key != "BasedOnStyles":
                lines += [f"[{heading}]", f"{key} = {value}"]
    return lines


def split_words(text):
    return [word.strip() for word in text.split(",")]


def parse_language(text):
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
                problems.append(f"{term}, line {number}: '{word}' must be letters, digits, spaces, hyphens or an apostrophe after a letter, inside a phrase")
            elif kind == "Except" and " " not in word:
                problems.append(f"{term}, line {number}: '{word}' {NO_SPACE}")
        if kind == "Avoid":
            entries[-1][1].extend(words)
        else:
            exceptions.extend(words)
    return entries, exceptions, problems


def build_swap(entries):
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
    held, problems = [], []
    for term, _ in entries:
        if any(re.search(rf"\b{re.escape(word)}\b", term, re.IGNORECASE) for word in swap):
            if not PLAIN_WORDS.fullmatch(term):
                problems.append(f"{term}: holds a drift word, so the rule must skip it, and it must be letters, digits, spaces, hyphens or an apostrophe after a letter for that")
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
    styles_path = read_config(config)[0] if config else None
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
    try:
        rule.parent.mkdir(parents=True, exist_ok=True)
        rule.write_text(render(swap, exceptions), encoding="utf-8")
    except OSError as error:
        stop(f"glossary-rule: cannot write {rule}: {error}")
    print(f"glossary-rule: wrote {rule} with {len(swap)} word(s) from {glossary}")
    if config is None:
        Path(CONFIG_NAMES[0]).write_text(TEMPLATE.read_text(encoding="utf-8"), encoding="utf-8")
        print(f"glossary-rule: wrote {CONFIG_NAMES[0]}, which turns the rule on")
    else:
        print("\n".join(config_advice(config, styles_path)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
