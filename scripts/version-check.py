#!/usr/bin/env python3
"""Check that every package a change touches also moves its own version.

A package is a directory under `plugins/` or `skills/`, released on its own
`<name>_<version>` tag. `AGENTS.md` owns the rule this enforces; the failure it
catches is a change to a package's files that leaves the package's version where
the last tag already claimed it.

Usage:
    version-check.py                 # origin/main...HEAD
    version-check.py <range>         # base..head, base...head, or one commit

Every path outside a `plugins/<name>/` or `skills/<name>/` directory is
repository-level: it belongs to no package and obliges no version to move.

This script is deliberately repository-specific: it encodes this repository's
package layout, which is why it lives here rather than inside the `gh-solo`
plugin, whose own scripts are generic because they ship to other trees.

It reads the paths a range touches, never an issue's package label: the label is
a claim about a change and the diff is the change.

It tests that a version increased. Which part increased follows from the commit
type - `feat` a minor, `fix` a patch - and that is prose for a reader, since one
branch can carry several types and the trunk's type does not exist until the
pull request has a title.

Exit status: 0 clean, 1 problems found, 2 usage or git error.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys

DEFAULT_RANGE = "origin/main...HEAD"

PLUGIN_MANIFEST = "plugins/{name}/.claude-plugin/plugin.json"
SKILL_MANIFEST = "skills/{name}/SKILL.md"

ABSENT = (0, 0, 0)


class GitError(Exception):
    pass


def git(*args: str) -> str:
    proc = subprocess.run(("git",) + args, capture_output=True, text=True)
    if proc.returncode != 0:
        raise GitError(proc.stderr.strip() or f"git {' '.join(args)} failed")
    return proc.stdout


def git_show(rev: str, path: str) -> str | None:
    """File content at a revision, or None where the revision has no such file."""
    proc = subprocess.run(("git", "show", f"{rev}:{path}"), capture_output=True, text=True)
    return proc.stdout if proc.returncode == 0 else None


def split_range(spec: str) -> tuple[str, str]:
    if "..." in spec:
        base, head = spec.split("...", 1)
        head = head or "HEAD"
        return git("merge-base", base or "HEAD", head).strip(), head
    if ".." in spec:
        base, head = spec.split("..", 1)
        return base, head or "HEAD"
    return f"{spec}^", spec


def package_of(path: str) -> tuple[str, str] | None:
    """The package owning a path, as (manifest, label), or None for repo-level."""
    parts = path.split("/")
    if len(parts) < 3:
        return None
    if parts[0] == "plugins":
        return PLUGIN_MANIFEST.format(name=parts[1]), f"plugins/{parts[1]}"
    if parts[0] == "skills":
        return SKILL_MANIFEST.format(name=parts[1]), f"skills/{parts[1]}"
    return None


def skill_version(text: str) -> str | None:
    """`metadata.version` from a SKILL.md's frontmatter."""
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    frontmatter = text[:end] if end != -1 else text
    in_metadata = False
    for line in frontmatter.splitlines():
        if re.match(r"^metadata:\s*$", line):
            in_metadata = True
            continue
        if in_metadata:
            if re.match(r"^\S", line):
                in_metadata = False
                continue
            found = re.match(r"^\s+version:\s*[\"']?([^\"'\s]+)", line)
            if found:
                return found.group(1)
    return None


def declared_version(manifest: str, text: str) -> str | None:
    if manifest.endswith(".json"):
        try:
            return json.loads(text).get("version")
        except json.JSONDecodeError:
            return None
    return skill_version(text)


def parse(version: str) -> tuple[int, ...] | None:
    if not re.fullmatch(r"\d+(\.\d+)*", version):
        return None
    return tuple(int(part) for part in version.split("."))


def problems(base: str, head: str) -> tuple[list[str], int]:
    changed = git("diff", "--name-only", base, head).splitlines()
    packages: dict[str, str] = {}
    for path in changed:
        owner = package_of(path)
        if owner:
            packages[owner[1]] = owner[0]

    found = []
    for label in sorted(packages):
        manifest = packages[label]
        at_head = git_show(head, manifest)
        if at_head is None:
            if git_show(base, manifest) is None:
                found.append(f"{label}: changed, and carries no {manifest}")
            continue
        declared = declared_version(manifest, at_head)
        if declared is None:
            field = "metadata.version" if manifest.endswith("SKILL.md") else "version"
            found.append(f"{label}: changed, and {manifest} declares no {field}")
            continue
        new = parse(declared)
        if new is None:
            found.append(f"{label}: {manifest} declares an unreadable version, {declared!r}")
            continue
        was = git_show(base, manifest)
        old = ABSENT
        if was is not None:
            previous = declared_version(manifest, was)
            old = parse(previous) if previous else ABSENT
            if old is None:
                old = ABSENT
        if new < old:
            found.append(
                f"{label}: changed, and its version went back from "
                f"{'.'.join(str(part) for part in old)} to {declared} "
                f"({manifest} moves forward when the package changes)"
            )
        elif new == old:
            found.append(
                f"{label}: changed, and its version stayed at {declared} "
                f"({manifest} moves when the package does)"
            )
    return found, len(packages)


def main() -> int:
    parser = argparse.ArgumentParser(add_help=True, description=__doc__)
    parser.add_argument("range", nargs="?", default=DEFAULT_RANGE)
    args = parser.parse_args()

    try:
        base, head = split_range(args.range)
        found, seen = problems(base, head)
    except GitError as error:
        print(f"version-check: {error}", file=sys.stderr)
        return 2

    print(f"version-check: {seen} package(s) touched, {len(found) or 'no'} problem(s)")
    for line in found:
        print(f"  {line}")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
