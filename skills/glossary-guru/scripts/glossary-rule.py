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
Exit 2: an argument, no single readable glossary, no single readable Vale
config, a run from below the project's root, or nowhere to write the rule.
"""

import json
import re
import shlex
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
# WHY: the name carries `.template` so that a Vale run started in `assets/` never takes it for a config.
TEMPLATE = Path(__file__).resolve().parent.parent / "assets" / "vale.ini.template"
# WHY: Vale reads a swap key and an exception as a regular expression, so only text with no metacharacter is safe to pass through.
PLAIN_WORDS = re.compile(r"(?:[^\W_]|[ -]|(?<=[^\W_])'(?=[^\W_]| ))+")
LIST_LINE = re.compile(r"_(Avoid|Except)_:(.*)")
NEAR_LIST_LINE = re.compile(r"(?:^|\W)[_*]{1,2}(?:avoid|except)(?:[_*]{1,2}\s*:|\s*:)|^\W*(?:avoid|except)\s*:|^\W*[_*]{1,2}(?:avoid|except)[_*]{1,2}(?![^\W_])", re.IGNORECASE)
SECTION = re.compile(r"##[ \t]+(.+?)(?:[ \t]+#+)?")
TERM = re.compile(r"###[ \t]+(.+?)(?:[ \t]+#+)?")
# WHY: a backtick fence's info string cannot hold a backtick, so a line such as "```order``` is a request." opens no fence.
FENCE = re.compile(r"(`{3,}(?=[^`]*$)|~{3,})(.*)")
# WHY: Vale 3.25.1 honours an exception only when it holds a space, so `Pre-Order` in `exceptions` silences nothing.
NO_SPACE = "holds no space, and Vale skips only a phrase that holds one"
GENERATED = "# Generated from the project's glossary by the glossary-guru skill. Edit the glossary, not this file."
PLAIN_CHARACTERS = "letters, digits, spaces, hyphens or a straight apostrophe after a letter"


def stop(message) -> NoReturn:
    print(message, file=sys.stderr)
    sys.exit(2)


# WHY: `utf-8-sig` drops the BOM an editor may add, which would otherwise stick to a file's first line and hide it.
def read_file(path):
    try:
        return path.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeDecodeError) as error:
        stop(f"glossary-rule: cannot read {path}: {error}")


def find_glossary():
    found = [path for path in GLOSSARY_PATHS if path.is_file()]
    if len(found) == 1:
        return found[0]
    if found:
        stop(f"glossary-rule: both {found[0]} and {found[1]} exist; the owner decides which one stays")
    stop("glossary-rule: no docs/GLOSSARY.md or GLOSSARY.md here; run this from the project's root")


def find_config(glossary):
    here = [Path(name) for name in CONFIG_NAMES if Path(name).is_file()]
    if len(here) > 1:
        stop(f"glossary-rule: {' and '.join(map(str, here))} exist; the owner decides which one stays")
    if here:
        return here[0]
    for directory in Path.cwd().parents:
        for name in CONFIG_NAMES:
            if (directory / name).is_file():
                if any((directory / path).resolve() == glossary.resolve() for path in GLOSSARY_PATHS):
                    stop(f"glossary-rule: run this from {directory}, which holds both this glossary and {name}")
                # WHY: the rule's file name is fixed, so every project beneath a shared config would overwrite the others' rule.
                stop(f"glossary-rule: Vale here reads {directory / name}, which other projects may share; add a config here, which takes over from it for this directory")
    # WHY: the config and the rule land in the working directory, so a run from a project's `docs` would put them there.
    if Path.cwd().name == "docs" and glossary == GLOSSARY_PATHS[1] and not Path(".git").exists():
        stop("glossary-rule: this looks like a project's docs directory; run this from the project's root, or add a config here if this directory is the root")
    return None


def read_config(path):
    parser = ConfigParser(interpolation=None, strict=False, allow_no_value=True, delimiters=("=", ":"), inline_comment_prefixes=("#", ";"))
    parser.optionxform = str
    try:
        # WHY: Vale reads an indented line as a key of its own, where configparser would read it as more of the last value.
        lines = [line.strip() for line in read_file(path).splitlines()]
        # WHY: Vale keeps StylesPath above every section, and configparser reads nothing outside one.
        parser.read_string("\n".join([f"[{ABOVE_SECTIONS}]", *lines]))
    except ConfigParserError as error:
        stop(f"glossary-rule: cannot read {path}: {error}")
    styles_path = (parser[ABOVE_SECTIONS].get("StylesPath") or "").strip("\"' ") or None
    if styles_path and styles_path.endswith("\\"):
        stop(f"glossary-rule: the StylesPath in {path} ends in a backslash, which Vale joins to the next line; write it on one line")
    return styles_path, [(heading, dict(parser[heading])) for heading in parser.sections() if heading != ABOVE_SECTIONS]


# WHY: only the project knows which of its sections should run the check, and a later list of styles replaces an earlier one, so computed lines can take its styles away.
def config_advice(config, styles_path):
    template_styles, template_sections = read_config(TEMPLATE)
    lines = [f"glossary-rule: to check a file, {config} needs Glossary added to the list in the last section covering it that sets BasedOnStyles, because a later list replaces an earlier one, and these lines, with any StylesPath above every section:"]
    if not styles_path:
        lines.append(f"StylesPath = {template_styles}")
    for heading, settings in template_sections:
        for key, value in settings.items():
            if key != "BasedOnStyles":
                lines += [f"[{heading}]", f"{key} = {value}"]
    lines.append("glossary-rule: the rule reports a warning, so a MinAlertLevel of error hides it unless the section that sets BasedOnStyles also sets Glossary.Terms = error")
    return lines


def split_words(text):
    return [word.strip() for word in text.split(",")]


def parse_language(text):
    entries, exceptions, problems = [], [], []
    in_language = saw_language = stray = False
    fence = None
    for number, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        fenced = FENCE.fullmatch(line)
        if fence:
            if fenced and fenced[1].startswith(fence) and not fenced[2].strip():
                fence = None
            continue
        if fenced:
            fence = fenced[1]
            continue
        section = SECTION.fullmatch(line)
        if section:
            in_language = section[1].casefold() == "language"
            saw_language = saw_language or in_language
        if not in_language:
            stray = stray or bool(LIST_LINE.fullmatch(line) or NEAR_LIST_LINE.search(line))
            continue
        heading = TERM.fullmatch(line)
        if heading:
            entries.append((heading[1], []))
            continue
        listed = LIST_LINE.fullmatch(line)
        if not listed:
            if NEAR_LIST_LINE.search(line):
                problems.append(f"line {number}: '{line}' looks like a list line, which is written _Avoid_: or _Except_: on a line of its own")
            continue
        kind, words = listed[1], split_words(listed[2])
        if not entries:
            problems.append(f"line {number}: an _{kind}_: line belongs under an entry's ### heading")
            continue
        term = entries[-1][0]
        for word in words:
            if not PLAIN_WORDS.fullmatch(word):
                problems.append(f"{term}, line {number}: '{word}' must be {PLAIN_CHARACTERS}, with more of the phrase after it")
            elif kind == "Except" and " " not in word:
                problems.append(f"{term}, line {number}: '{word}' {NO_SPACE}")
        if kind == "Avoid":
            entries[-1][1].extend(words)
        else:
            exceptions.extend(words)
    if stray and not saw_language:
        problems.append("it holds _Avoid_: or _Except_: lines and no ## Language heading")
    return entries, exceptions, problems


def build_swap(entries):
    terms = {term.lower() for term, _ in entries}
    swap, owners, problems = {}, {}, []
    for term, words in entries:
        for word in words:
            key = word.lower()
            if key in terms:
                problems.append(f"{term}: '{word}' is also an entry's term, so the rule would flag it where it is correct")
            elif owners.setdefault(key, term) != term:
                problems.append(f"{term}: '{word}' is also on {owners[key]}'s _Avoid_: line, so it has no single replacement")
            else:
                swap[word] = term
    return swap, problems


def holds_drift(text, swap):
    return any(re.search(rf"\b{re.escape(word)}\b", text, re.IGNORECASE) for word in swap)


def idle_exceptions(exceptions, swap):
    return [f"'{phrase}' on an _Except_: line holds no word from any _Avoid_: line, so it excuses nothing" for phrase in exceptions if PLAIN_WORDS.fullmatch(phrase) and not holds_drift(phrase, swap)]


def terms_holding_drift(entries, swap):
    held, problems = [], []
    for term, _ in entries:
        if holds_drift(term, swap):
            if not PLAIN_WORDS.fullmatch(term):
                problems.append(f"{term}: holds a drift word, so the rule must skip it, and it must be {PLAIN_CHARACTERS}, with more of the term after it, for that")
            elif " " not in term:
                problems.append(f"{term}: holds a drift word, so the rule must skip it, and it {NO_SPACE}")
            else:
                held.append(term)
    return held, problems


def render(swap, exceptions):
    lines = [
        GENERATED,
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
    config = find_config(glossary)
    if config is None and Path(CONFIG_NAMES[0]).exists():
        stop(f"glossary-rule: {CONFIG_NAMES[0]} is not a file, and the config belongs at that path")
    styles_path = read_config(config)[0] if config else None
    entries, exceptions, problems = parse_language(read_file(glossary))
    swap, swap_problems = build_swap(entries)
    held_terms, held_problems = terms_holding_drift(entries, swap)
    problems += swap_problems + held_problems + idle_exceptions(exceptions, swap)
    exceptions += held_terms
    if problems:
        print(f"glossary-rule: {glossary} cannot become a correct rule:", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        return 1
    rule = Path(styles_path or DEFAULT_STYLES) / "Glossary" / "Terms.yml"
    if rule.exists() and not read_file(rule).startswith(GENERATED):
        stop(f"glossary-rule: this script did not write {rule}, so it will not replace it; move that file and run this again")
    try:
        rule.parent.mkdir(parents=True, exist_ok=True)
        rule.write_text(render(swap, exceptions), encoding="utf-8")
        if config is None:
            Path(CONFIG_NAMES[0]).write_text(read_file(TEMPLATE), encoding="utf-8")
    except OSError as error:
        stop(f"glossary-rule: cannot write: {error}")
    print(f"glossary-rule: wrote {rule} with {len(swap)} word(s) from {glossary}")
    if config is None:
        print(f"glossary-rule: wrote {CONFIG_NAMES[0]}, which turns the rule on")
    else:
        print("\n".join(config_advice(config, styles_path)))
    print(f"glossary-rule: check the project from here with: vale {shlex.quote(str(Path.cwd()))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
