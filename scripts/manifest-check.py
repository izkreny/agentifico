#!/usr/bin/env python3
"""Check that every plugin's marketplace entry agrees with its own manifest.

`.claude-plugin/marketplace.json` and each `plugins/<name>/.claude-plugin/plugin.json`
overlap by schema rather than by convention: an entry may carry any field of the plugin
manifest, plus entry-only fields of its own. `.agents/gh-solo.md` owns the table saying
which of the shared fields must be kept in step; this script decides the rows a script
can decide.

    name           equal, or the entry points at a plugin that is not the one it names
    description    equal
    keywords/tags  the same set, whatever the order
    version        absent from the entry, always

`version` is the odd one and the reason this check is not merely tidiness. Claude Code
resolves a plugin's version from the manifest first and from the entry only when the
manifest has none, so a version in an entry beside a manifest that has one can never be
read - it would drift silently and forever. `AGENTS.md` owns why, under *How a package
is released*.

Usage:
    manifest-check.py             # every plugin in the marketplace
    manifest-check.py <name>...   # only the named plugins

Every plugin in the marketplace is checked, so a plugin landing beside the first needs
no edit here and none in `.agents/gh-solo.md`.

Exit status: 0 clean, 1 disagreements found, 2 a file is missing or unreadable.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

MARKETPLACE = Path(".claude-plugin/marketplace.json")
MANIFEST = "plugins/{name}/.claude-plugin/plugin.json"


class Unreadable(Exception):
    pass


def load(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise Unreadable(f"{path} does not exist")
    except json.JSONDecodeError as exc:
        raise Unreadable(f"{path} is not valid JSON: {exc}")


def entry_source(entry: dict) -> str | None:
    """The manifest path an entry's source implies, or None where it has no local one."""
    source = entry.get("source")
    if not isinstance(source, str) or not source.startswith("./"):
        return None
    return f"{source[2:].rstrip('/')}/.claude-plugin/plugin.json"


def compare(entry: dict, manifest: dict) -> list[str]:
    """Every way this entry and this manifest disagree, as one line each."""
    problems = []
    for field in ("name", "description"):
        if entry.get(field) != manifest.get(field):
            problems.append(f"{field} differs")
    if sorted(entry.get("tags", [])) != sorted(manifest.get("keywords", [])):
        problems.append("tags in the entry and keywords in the manifest differ")
    if "version" in entry:
        problems.append("the entry carries a version, which nothing can ever read")
    return problems


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("names", nargs="*", help="plugins to check; default every one")
    args = parser.parse_args(argv)

    try:
        marketplace = load(MARKETPLACE)
    except Unreadable as exc:
        print(f"manifest-check: {exc}", file=sys.stderr)
        return 2

    entries = marketplace.get("plugins")
    if not isinstance(entries, list):
        print(f"manifest-check: {MARKETPLACE} has no plugins array", file=sys.stderr)
        return 2

    if args.names:
        wanted = set(args.names)
        named = {e.get("name") for e in entries}
        missing = sorted(wanted - named)
        if missing:
            print(f"manifest-check: no entry named {', '.join(missing)}", file=sys.stderr)
            return 2
        entries = [e for e in entries if e.get("name") in wanted]

    if not entries:
        print("manifest-check: no plugins to check")
        return 0

    found = 0
    for entry in entries:
        name = entry.get("name", "<unnamed>")
        # The source is what says where the manifest is, so an entry that moves its
        # plugin cannot leave this check reading the old path.
        path = entry_source(entry) or MANIFEST.format(name=name)
        try:
            manifest = load(Path(path))
        except Unreadable as exc:
            print(f"manifest-check: {exc}", file=sys.stderr)
            return 2
        problems = compare(entry, manifest)
        found += len(problems)
        if problems:
            print(f"{name}: out of step with {path}")
            for problem in problems:
                print(f"  {problem}")
        else:
            print(f"{name}: in step with {path}")

    plural = "" if found == 1 else "s"
    print(f"manifest-check: {len(entries)} plugin(s), {found or 'no'} problem{plural}")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
