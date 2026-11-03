#!/usr/bin/env python3
"""Write a Vale substitution rule and a readable GLOSSARY.md from a project's GLOSSARY.json.

Usage, from the project's root:

    python3 <skill-dir>/scripts/glossary-rule.py

Reads docs/GLOSSARY.json or GLOSSARY.json, and writes GLOSSARY.md beside it and
Glossary/Terms.yml under the StylesPath in the project's Vale config, or under
.vale/styles where the config names none. A project with no Vale config gets a
.vale.ini that turns the rule on; one that has a config is told what it needs.

Exit 0: the rule and GLOSSARY.md were written. A glossary naming no drift word gets a rule that
swaps nothing, since `BasedOnStyles = Glossary` fails a Vale run with no style.
A word with stray spaces is read tidied, and each one is named on stderr.
Exit 1: the glossary is not valid, or cannot become a correct rule; each reason
is on stderr, and nothing is written.
Exit 2: an argument, no single readable glossary, no single readable Vale
config, a run from below the project's root, a file this script did not write
where one of its outputs goes, or nowhere to write them.
"""

import json
import re
import shlex
import sys
from configparser import ConfigParser
from configparser import Error as ConfigParserError
from pathlib import Path
from typing import NoReturn

GLOSSARY_PATHS = (Path("docs/GLOSSARY.json"), Path("GLOSSARY.json"))
# WHY: Vale 3.25.1 finds its config under exactly these names, and a project with one of them must not get a second.
CONFIG_NAMES = (".vale.ini", "vale.ini", "_vale.ini", ".vale", "_vale")
DEFAULT_STYLES = ".vale/styles"
ABOVE_SECTIONS = "glossary-rule: above every section"
# WHY: the name carries `.template` so that a Vale run started in `assets/` never takes it for a config.
TEMPLATE = Path(__file__).resolve().parent.parent / "assets" / "vale.ini.template"
# WHY: Vale reads a swap key and an exception as a regular expression, so only text with no metacharacter is safe to pass through.
PLAIN_WORDS = re.compile(r"(?:[^\W_]|[ -]|(?<=[^\W_])'(?=[^\W_]| ))+")
# WHY: Vale 3.25.1 honours an exception only when it holds a space, so `Pre-Order` in `exceptions` silences nothing.
NO_SPACE = "holds no space, and Vale skips only a phrase that holds one"
REGENERATE = "python3 <skill-dir>/scripts/glossary-rule.py"
GENERATED = "# Generated from the project's glossary by the glossary-guru skill. Edit the glossary, not this file."
GENERATED_MARKDOWN = f"<!-- Generated from GLOSSARY.json by the glossary-guru skill. Edit GLOSSARY.json, not this file. Regenerate from the project's root: {REGENERATE} -->"
TOP_KEYS = ("project", "summary", "terms", "flagged_ambiguities")
TOP_REQUIRED = ("project", "summary", "terms")
ENTRY_KEYS = ("term", "definition", "avoid", "except")
ENTRY_REQUIRED = ("term", "definition")
ONE_LINE = "must be one line of text with no lone surrogate"
# WHY: JSON can spell a lone surrogate, which no UTF-8 file can hold, so it would fail at the write after the rule had already landed.
SURROGATE = re.compile("[\ud800-\udfff]")
PLAIN_CHARACTERS = "letters with no combining mark, digits, spaces, hyphens or a straight apostrophe after a letter"


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
    stop("glossary-rule: no docs/GLOSSARY.json or GLOSSARY.json here; run this from the project's root")


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
    lines = [f"glossary-rule: to check a file, {config} must list Glossary in the last section covering it that sets BasedOnStyles, because a later list replaces an earlier one, and must hold these lines, with any StylesPath above every section:"]
    if not styles_path:
        lines.append(f"StylesPath = {template_styles}")
    for heading, settings in template_sections:
        for key, value in settings.items():
            if key != "BasedOnStyles":
                lines += [f"[{heading}]", f"{key} = {value}"]
    lines.append("glossary-rule: the rule reports a warning, so a MinAlertLevel of error hides it unless the section that sets BasedOnStyles also sets Glossary.Terms = error")
    return lines


class JsonObject(dict):
    repeated = ()


# WHY: Python's JSON reader keeps the last of two equal keys, so a second `avoid` in one entry would lose every word in the first.
def note_repeated_keys(pairs):
    found = JsonObject(pairs)
    keys = [key for key, _ in pairs]
    found.repeated = [key for key in found if keys.count(key) > 1]
    return found


def load_glossary(text):
    try:
        return json.loads(text, object_pairs_hook=note_repeated_keys), []
    except ValueError as error:
        return None, [f"not valid JSON: {error}"]


# WHY: each value renders as one Markdown block and a line break would split it, while markup inside the line stays, so a definition can hold a code span.
def is_one_line(value):
    return isinstance(value, str) and value.splitlines() == [value] and bool(value.strip()) and not SURROGATE.search(value)


def is_plain(word):
    return isinstance(word, str) and bool(PLAIN_WORDS.fullmatch(word))


def key_problems(found, allowed, required, where):
    problems = [f"{where}: the key '{key}' is not in the format, which allows {', '.join(allowed)}" for key in found if key not in allowed]
    problems += [f"{where}: the key '{key}' is missing" for key in required if key not in found]
    problems += [f"{where}: the key '{key}' appears twice" for key in found.repeated]
    return problems


def word_problems(entry, key, where):
    words = entry.get(key, [])
    if not isinstance(words, list):
        return [f"{where}: '{key}' must be a list"]
    problems = []
    for word in words:
        if not is_plain(word):
            problems.append(f"{where}: {json.dumps(word, ensure_ascii=False)} under '{key}' must be {PLAIN_CHARACTERS}, with more of the phrase after it")
        elif key == "except" and " " not in word:
            problems.append(f"{where}: '{word}' {NO_SPACE}")
    return problems


def entry_problems(entry, number):
    if not isinstance(entry, dict):
        return [f"entry {number}: must be an object"]
    term = entry.get("term")
    where = term if is_one_line(term) else f"entry {number}"
    problems = key_problems(entry, ENTRY_KEYS, ENTRY_REQUIRED, where)
    if "term" in entry and not is_plain(term):
        problems.append(f"{where}: the term must be {PLAIN_CHARACTERS}, with more of the term after it")
    if "definition" in entry and not is_one_line(entry["definition"]):
        problems.append(f"{where}: the definition {ONE_LINE}")
    return problems + word_problems(entry, "avoid", where) + word_problems(entry, "except", where)


def glossary_problems(glossary):
    if not isinstance(glossary, dict):
        return ["top level: must be an object"]
    problems = key_problems(glossary, TOP_KEYS, TOP_REQUIRED, "top level")
    for key in ("project", "summary"):
        if key in glossary and not is_one_line(glossary[key]):
            problems.append(f"top level: '{key}' {ONE_LINE}")
    flagged = glossary.get("flagged_ambiguities", [])
    if not isinstance(flagged, list):
        problems.append("top level: 'flagged_ambiguities' must be a list")
    else:
        problems += [f"top level: {json.dumps(line, ensure_ascii=False)} under 'flagged_ambiguities' {ONE_LINE}" for line in flagged if not is_one_line(line)]
    terms = glossary.get("terms", [])
    if not isinstance(terms, list):
        problems.append("top level: 'terms' must be a list")
    elif "terms" in glossary and not terms:
        problems.append("top level: 'terms' holds no entry, and a glossary exists only once a term is settled")
    else:
        for number, entry in enumerate(terms, 1):
            problems += entry_problems(entry, number)
    return problems


def build_swap(entries):
    terms = {term.lower() for term, _ in entries}
    swap, owners, problems = {}, {}, []
    for term, words in entries:
        for word in words:
            key = word.lower()
            if key in terms:
                problems.append(f"{term}: '{word}' is also an entry's term, so the rule would flag it where it is correct")
            elif owners.setdefault(key, term) != term:
                problems.append(f"{term}: '{word}' is also on {owners[key]}'s 'avoid' list, so it has no single replacement")
            else:
                swap[word] = term
    return swap, problems


def repeated_terms(entries):
    seen, problems = set(), []
    for term, _ in entries:
        if term.lower() in seen:
            problems.append(f"{term}: is on two entries, so one name would hold two definitions")
        seen.add(term.lower())
    return problems


def tidy(word):
    return re.sub(" +", " ", word).strip(" ") if isinstance(word, str) else word


# WHY: Vale reads a run of spaces as one and a swap key with a space at either end matches no word, so both are typos to tidy rather than refuse.
def tidy_spaces(glossary):
    tidied = []

    def note(word):
        if tidy(word) != word:
            tidied.append(f"{json.dumps(word, ensure_ascii=False)} is read as {json.dumps(tidy(word), ensure_ascii=False)}")
        return tidy(word)

    terms = glossary.get("terms") if isinstance(glossary, dict) else None
    for entry in terms if isinstance(terms, list) else []:
        if isinstance(entry, dict):
            if "term" in entry:
                entry["term"] = note(entry["term"])
            for key in ("avoid", "except"):
                if isinstance(entry.get(key), list):
                    entry[key] = [note(word) for word in entry[key]]
    return tidied


def holds_phrase(text, phrases):
    return any(re.search(rf"\b{re.escape(phrase)}\b", text, re.IGNORECASE) for phrase in phrases)


def idle_exceptions(exceptions, swap):
    return [f"'{phrase}' under 'except' holds no word from any 'avoid' list, so it excuses nothing" for phrase in exceptions if not holds_phrase(phrase, swap)]


# WHY: Vale masks an exception before it matches a swap key, so a swap key holding an exception can never fire.
def masked_swaps(swap, exceptions):
    return [f"{swap[word]}: '{word}' holds '{phrase}', which the rule skips, so it would never fire" for word in swap for phrase in exceptions if holds_phrase(word, [phrase])]


def terms_holding_drift(entries, swap):
    held, problems = [], []
    for term, _ in entries:
        if holds_phrase(term, swap):
            if " " not in term:
                problems.append(f"{term}: holds a drift word, so the rule must skip it, and it {NO_SPACE}")
            else:
                held.append(term)
    return held, problems


# WHY: the glossary allows only a straight apostrophe, and prose often sets a curly one, which a swap key or an exception would otherwise miss.
def any_apostrophe(words):
    return words.replace("'", "['’]")


def render(swap, exceptions):
    lines = [
        GENERATED,
        f"# Regenerate from the project's root: {REGENERATE}",
        "extends: substitution",
        'message: "Use \'%s\' instead of \'%s\'."',
        "level: warning",
        "ignorecase: true",
    ]
    if exceptions:
        lines.append("exceptions:")
        unique = {}
        for phrase in sorted(exceptions):
            # WHY: `casefold` makes `ß` equal `ss` and `(?i)` does not, so a phrase dropped on that key would fire as drift.
            unique.setdefault(phrase.lower(), phrase)
        # WHY: Vale matches an exception case-sensitively even under ignorecase, so each one carries its own flag.
        lines.extend(f"  - {json.dumps('(?i)' + any_apostrophe(unique[key]), ensure_ascii=False)}" for key in sorted(unique))
    lines.append("swap:" if swap else "swap: {}")
    for word in sorted(swap, key=str.casefold):
        lines.append(f"  {json.dumps(any_apostrophe(word), ensure_ascii=False)}: {json.dumps(swap[word], ensure_ascii=False)}")
    return "\n".join(lines) + "\n"


def bullets(items):
    return "\n".join(f"- {item}" for item in items)


def render_markdown(glossary):
    parts = [GENERATED_MARKDOWN, f"# {glossary['project']}", glossary["summary"], "## Language"]
    for entry in glossary["terms"]:
        parts += [f"### {entry['term']}", entry["definition"]]
        for key, label in (("avoid", "AVOID"), ("except", "EXCEPT")):
            if entry.get(key):
                parts += [f"**{label}**:", bullets(entry[key])]
    if glossary.get("flagged_ambiguities"):
        parts += ["## Flagged ambiguities", bullets(glossary["flagged_ambiguities"])]
    return "\n\n".join(parts) + "\n"


def refuse_foreign(path, marker):
    if path.exists() and not read_file(path).startswith(marker):
        stop(f"glossary-rule: this script did not write {path}, so it will not replace it; move that file and run this again")


def main():
    if len(sys.argv) != 1:
        stop(__doc__)
    source = find_glossary()
    config = find_config(source)
    if config is None and Path(CONFIG_NAMES[0]).exists():
        stop(f"glossary-rule: {CONFIG_NAMES[0]} is not a file, and the config belongs at that path")
    styles_path = read_config(config)[0] if config else None
    glossary, problems = load_glossary(read_file(source))
    if not problems:
        tidied = tidy_spaces(glossary)
        if tidied:
            print(f"glossary-rule: {source} holds stray spaces, read as below; fix them in {source}:", file=sys.stderr)
            for line in tidied:
                print(f"  {line}", file=sys.stderr)
        problems = glossary_problems(glossary)
    if not problems:
        entries = [(entry["term"], entry.get("avoid", [])) for entry in glossary["terms"]]
        exceptions = [phrase for entry in glossary["terms"] for phrase in entry.get("except", [])]
        swap, swap_problems = build_swap(entries)
        held_terms, held_problems = terms_holding_drift(entries, swap)
        problems = repeated_terms(entries) + swap_problems + held_problems + idle_exceptions(exceptions, swap)
        exceptions += held_terms
        problems += masked_swaps(swap, exceptions)
    if problems:
        print(f"glossary-rule: {source} is refused:", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        return 1
    rule = Path(styles_path or DEFAULT_STYLES) / "Glossary" / "Terms.yml"
    markdown = source.with_suffix(".md")
    refuse_foreign(rule, GENERATED)
    refuse_foreign(markdown, GENERATED_MARKDOWN)
    try:
        rule.parent.mkdir(parents=True, exist_ok=True)
        rule.write_text(render(swap, exceptions), encoding="utf-8")
        markdown.write_text(render_markdown(glossary), encoding="utf-8")
        if config is None:
            Path(CONFIG_NAMES[0]).write_text(read_file(TEMPLATE), encoding="utf-8")
    except OSError as error:
        stop(f"glossary-rule: cannot write: {error}")
    print(f"glossary-rule: wrote {rule} with {len(swap)} word(s) from {source}")
    print(f"glossary-rule: wrote {markdown}")
    if config is None:
        print(f"glossary-rule: wrote {CONFIG_NAMES[0]}, which turns the rule on")
    else:
        print("\n".join(config_advice(config, styles_path)))
    print(f"glossary-rule: check the project from here with: vale {shlex.quote(str(Path.cwd()))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
