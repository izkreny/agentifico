#!/usr/bin/env python3
"""Read one key from a repository's gh-solo config.

The config is the first file the lookup in `references/repo-config.md` finds, and its keys are the one fenced `json` block in that file. A file with no block sets no key. The schema, the defaults and the refusals are stated in that reference; this script enforces them, so every reader of a key gets the same answer.

Usage:
    read-config.py get <key>

Exit codes: 0 the key is set and its value is printed, a string as it is and anything else as JSON; 1 the key is unset, so the caller applies the default; 2 the config refuses, with a `⛔ REFUSED` line, or the read could not run.
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


def labels(value):
    return (
        isinstance(value, dict)
        and set(value) == {"axis", "values"}
        and text(value["axis"])
        and isinstance(value["values"], dict)
        and value["values"] != {}
        and all(text(k) and text(v) for k, v in value["values"].items())
    )


SCHEMA = {
    "reviewer_model": (text, "a string"),
    "test_files": (text, "a string"),
    "labels": (labels, 'an object with "axis", a string, and "values", an object of strings'),
    "branch_format": (text, "a string"),
    "branch_types": (text_list, "a list of strings"),
    "issue_types": (lambda v: isinstance(v, bool), "true or false"),
    "default_branch": (text, "a string"),
    "remote": (text, "a string"),
    "commit_scope": (lambda v: v == "label", '"label"'),
}


def user_config_dir():
    # WHY: the XDG Base Directory spec ignores a relative value, as it does an empty one.
    xdg = os.environ.get("XDG_CONFIG_HOME", "")
    return Path(xdg) if os.path.isabs(xdg) else Path.home() / ".config"


def config_paths(root, name_with_owner):
    user_level = user_config_dir() / "gh-solo" / f"{name_with_owner}.md"
    return [user_level] + [Path(root) / name for name in IN_REPO_CONFIGS]


def json_blocks(lines):
    blocks, fence, body = [], None, None
    for line in lines:
        marker = FENCE.match(line)
        if fence:
            if marker and marker.group(1)[0] == fence[0] and len(marker.group(1)) >= len(fence) and not line.strip()[len(marker.group(1)):]:
                if body is not None:
                    blocks.append("\n".join(body))
                fence, body = None, None
            elif body is not None:
                body.append(line)
            continue
        if marker:
            fence = marker.group(1)
            body = [] if marker.group(2) == "json" else None
            continue
        m = OLD_LINE.match(line)
        if m:
            raise Refused(f"{m.group(1)} is now {OLD_KEYS[m.group(1)]}")
    if body is not None:
        raise ReadError("its json block is never closed")
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
    if not isinstance(config, dict):
        raise ReadError("its json block is not an object")
    for key, value in config.items():
        if key not in SCHEMA:
            raise ReadError(f"{key} is not a key")
        valid, shape = SCHEMA[key]
        if not valid(value):
            raise ReadError(f"{key} must be {shape}")
    return config


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
    a = p.parse_args(argv)
    try:
        root = must("git", "rev-parse", "--show-toplevel")
        name_with_owner = must("gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner")
        _, config = load(root, name_with_owner)
    except Refused as e:
        print(f"⛔ REFUSED - {e}")
        return 2
    # WHY: exit 1 means "unset, use the default", so an unexpected failure must never fall through to it.
    except Exception as e:
        print(f"read-config: {e}", file=sys.stderr)
        return 2
    if a.key not in config:
        return 1
    value = config[a.key]
    print(value if isinstance(value, str) else json.dumps(value))
    return 0


if __name__ == "__main__":
    sys.exit(main())
