#!/usr/bin/env python3
"""Read one key from a repository's gh-solo config.

The config is the first file the lookup in `references/repo-config.md` finds, and its keys are the one fenced `json` block in that file. A file with no block sets no key. That reference names the keys, `defaults.json` beside this script holds the defaults, and a key it leaves out has none; this script enforces the schema and owns every refusal and its message, so every reader of a key gets the same answer.

Usage:
    read-config.py get <key>
    read-config.py get-all

Exit codes: 0 the value is printed, the config's or else the default: for `get` a string as it is and anything else as JSON, for `get-all` one JSON object of every key, `null` where a key is unset with no default; 1 `get` found the key unset with no default to print, so it means nothing is set; 2 the config refuses, with a `⛔ REFUSED` line, or the read could not run.
"""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

IN_REPO_CONFIGS = (".agents/gh-solo.md", ".claude/gh-solo.md")
FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})[ \t]*([^`\s]*)")
OLD_KEYS = {"Reviewer model": "reviewer_model", "Test files": "test_files"}
OLD_LINE = re.compile(r"^(" + "|".join(OLD_KEYS) + r"):")


class Refused(Exception):
    pass


class ReadError(Exception):
    pass


def text(value):
    return isinstance(value, str) and value != ""


def text_list(value):
    return isinstance(value, list) and value != [] and all(text(v) for v in value)


def axis(value):
    return (
        isinstance(value, dict)
        and set(value) == {"name", "labels"}
        and text(value["name"])
        and isinstance(value["labels"], dict)
        and value["labels"] != {}
        and all(text(k) and text(v) for k, v in value["labels"].items())
    )


SCHEMA = {
    "reviewer_model": (text, "a string"),
    "test_files": (text, "a string"),
    "mandatory_axis": (axis, 'an object with "name", a string, and "labels", an object of strings'),
    "branch_name_format": (text, "a string"),
    "commit_types": (text_list, "a list of strings"),
    "use_issue_types": (lambda v: isinstance(v, bool), "true or false"),
    "default_branch": (text, "a string"),
    "remote": (text, "a string"),
    "commit_scope": (lambda v: v == "label", '"label"'),
}

DEFAULTS_FILE = Path(__file__).with_name("defaults.json")


def user_config_dir():
    # WHY: the XDG Base Directory spec ignores a relative value, as it does an empty one.
    xdg = os.environ.get("XDG_CONFIG_HOME", "")
    return Path(xdg) if os.path.isabs(xdg) else Path.home() / ".config"


def config_paths(root, name_with_owner):
    in_repo = [Path(root) / name for name in IN_REPO_CONFIGS]
    user_dir = user_config_dir() / "gh-solo"
    # WHY: naming the user-level file costs a GitHub API call, so a machine with no such directory reads offline.
    if not user_dir.is_dir():
        return in_repo
    name = name_with_owner() if callable(name_with_owner) else name_with_owner
    return [user_dir / f"{name}.md"] + in_repo


def json_blocks(lines):
    blocks, fence, body = [], None, None
    for number, line in enumerate(lines, 1):
        marker = FENCE.match(line)
        if fence:
            same = marker and marker.group(1)[0] == fence[0]
            if same and len(marker.group(1)) >= len(fence) and not line.strip()[len(marker.group(1)):]:
                if body is not None:
                    blocks.append("\n".join(body))
                fence, body = None, None
            # WHY: an opener at least as long as the open fence has a closer that would close that fence too, so it cannot nest: an earlier fence was left open and swallows the block.
            elif same and len(marker.group(1)) >= len(fence) and marker.group(2).lower() == "json":
                raise ReadError(f"a json block opens on line {number}, inside a fence still open")
            elif body is not None:
                body.append(line)
            continue
        if marker:
            fence = marker.group(1)
            body = [] if marker.group(2).lower() == "json" else None
            continue
        m = OLD_LINE.match(line)
        if m:
            raise Refused(f"{m.group(1)} is now {OLD_KEYS[m.group(1)]}")
    if fence:
        raise ReadError("a fence is never closed")
    return blocks


def no_repeats(pairs):
    seen = {}
    for key, value in pairs:
        if key in seen:
            raise ReadError(f"{key} is set twice")
        seen[key] = value
    return seen


def parse(config_text):
    blocks = json_blocks(config_text.replace("\r\n", "\n").split("\n"))
    if not blocks:
        return {}
    if len(blocks) > 1:
        raise ReadError(f"it holds {len(blocks)} json blocks, and only one is read")
    try:
        config = json.loads(blocks[0], object_pairs_hook=no_repeats)
    except json.JSONDecodeError as e:
        raise ReadError(f"its json block does not parse: {e}")
    return checked(config, "its json block")


def checked(config, what):
    if not isinstance(config, dict):
        raise ReadError(f"{what} is not an object")
    for key, value in config.items():
        if key not in SCHEMA:
            raise ReadError(f"{key} is not a key")
        valid, shape = SCHEMA[key]
        if not valid(value):
            raise ReadError(f"{key} must be {shape}")
    return config


def defaults():
    # WHY: a bad default would print a wrong value to every repository that sets none, so the plugin's own file is held to the config's rules.
    try:
        return checked(json.loads(DEFAULTS_FILE.read_text(encoding="utf-8"), object_pairs_hook=no_repeats), "it")
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ReadError) as e:
        raise ReadError(f"{DEFAULTS_FILE}: {e}")


def load(root, name_with_owner):
    for path in config_paths(root, name_with_owner):
        if path.is_file():
            try:
                text = path.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError) as e:
                raise Refused(f"{path}: it cannot be read: {e}")
            try:
                return str(path), parse(text)
            except ReadError as e:
                raise Refused(f"{path}: {e}")
    return None, {}


def must(*args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        raise OSError(f"{' '.join(args)} exited {r.returncode}: {r.stderr.strip()}")
    return r.stdout.strip()


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="command", required=True)
    get = sub.add_parser("get", help="print one key's value")
    get.add_argument("key", choices=sorted(SCHEMA))
    sub.add_parser("get-all", help="print every key's value as one JSON object")
    a = p.parse_args(argv)
    try:
        root = must("git", "rev-parse", "--show-toplevel")
        _, config = load(root, lambda: must("gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"))
        fallback = defaults()
    except Refused as e:
        print(f"⛔ REFUSED - {e}")
        return 2
    # WHY: exit 1 means "unset, with no default", so an unexpected failure must never fall through to it.
    except Exception as e:
        print(f"read-config: {e}", file=sys.stderr)
        return 2
    if a.command == "get-all":
        print(json.dumps({key: config.get(key, fallback.get(key)) for key in SCHEMA}, indent=2))
        return 0
    if a.key not in config and a.key not in fallback:
        return 1
    value = config.get(a.key, fallback.get(a.key))
    print(value if isinstance(value, str) else json.dumps(value))
    return 0


if __name__ == "__main__":
    sys.exit(main())
