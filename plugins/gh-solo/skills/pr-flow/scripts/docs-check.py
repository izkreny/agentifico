#!/usr/bin/env python3
"""Check Markdown files for failures that stay silent until someone follows a link.

1. Every backticked path resolves to a file or directory that exists.
2. Every fenced code block is closed.

Both checks are generic: neither knows anything about a particular repository.
Repo-specific documentation checks belong in that repository, not here.

Usage:
    docs-check.py [PATH ...]
    docs-check.py --root DIR --ignore 'docs/plans/*' [PATH ...]

A backticked span is treated as a path only when it has a known file extension or a
trailing slash. That deliberately excludes branch names (`feat/GHI-50_login-form`),
slash commands (`/gh-solo:pr-flow`) and repo slugs (`github/gh-stack`), none of which
are paths on this filesystem. The leading-slash exclusion that keeps slash commands
quiet also drops absolute paths, so a `/home/...` span is never checked: a known
blind spot, accepted rather than fixed because slash commands are the commoner span.

Each candidate is resolved against, in order: the nearest ancestor directory holding a
SKILL.md (so a skill's own `references/foo.md` works from any file inside it), the
directory of the mentioning file, and --root. Resolving any one way passes.

Use --ignore for paths that legitimately cannot resolve here: example filenames, and
paths belonging to a target repository rather than this tree.
The set that keeps this skill tree itself clean:
  --ignore '.agents/*' --ignore '.claude/*' --ignore 'AGENTS.md' --ignore 'CLAUDE.md' --ignore 'docs/plans*' --ignore '*GHI-50*'

Exit status: 0 clean, 1 problems found, 2 usage error.
"""

from __future__ import annotations

import argparse
import fnmatch
import re
import sys
from pathlib import Path

PATH_SPAN = re.compile(r"`([^`\n]+)`")
FENCE = re.compile(r"^\s*(`{3,}|~{3,})")

# Substrings meaning "command, glob or template", never a literal path.
NOT_A_PATH = ("$", "*", "{", "}", "<", ">", "|", "://", " ", "..")

PATHY_SUFFIXES = (
    ".md", ".py", ".sh", ".fish", ".bash", ".json", ".toml", ".yaml", ".yml",
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".rb", ".rs", ".go", ".txt",
    ".cfg", ".ini", ".lock", ".sql", ".css", ".html",
)

SKIP_DIRS = {".git", "node_modules", ".venv", "__pycache__", ".next", "dist", "build"}


def looks_like_path(span: str) -> bool:
    """True only for spans that must name something on disk."""
    if any(bad in span for bad in NOT_A_PATH):
        return False
    if span.startswith(("-", "#", "@", "/")):
        return False
    # A trailing slash is an explicit directory reference.
    if span.endswith("/"):
        return True
    # Otherwise require a real file extension. This is what excludes branch names,
    # slash commands and `owner/repo` slugs, all of which contain a slash but name
    # nothing on this filesystem.
    return span.endswith(PATHY_SUFFIXES)


def skill_root(path: Path) -> Path | None:
    """Nearest ancestor holding a SKILL.md, which is what a skill's paths are relative to."""
    for parent in path.resolve().parents:
        if (parent / "SKILL.md").is_file():
            return parent
    return None


def strip_fenced_blocks(lines: list[str]) -> tuple[list[tuple[int, str]], str | None]:
    """Prose lines with 1-based numbers, plus an error if a fence was left open."""
    prose: list[tuple[int, str]] = []
    open_marker: str | None = None
    open_line = 0

    for number, line in enumerate(lines, start=1):
        match = FENCE.match(line)
        if match:
            marker = match.group(1)
            if open_marker is None:
                # Keep the opener's full length. Truncating it to three would let a
                # ``` example nested inside a ```` block close that block early, and
                # the example's contents would then be scanned as prose.
                open_marker, open_line = marker, number
            elif len(marker) >= len(open_marker) and marker[0] == open_marker[0]:
                open_marker = None
            continue
        if open_marker is None:
            prose.append((number, line))

    if open_marker is not None:
        return prose, f"unclosed code fence opened on line {open_line}"
    return prose, None


def check_file(path: Path, root: Path, ignores: list[str]) -> list[str]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError) as exc:
        return [f"{path}: cannot read ({exc})"]

    problems: list[str] = []
    prose, fence_error = strip_fenced_blocks(lines)
    if fence_error:
        problems.append(f"{path}: {fence_error}")

    bases = [b for b in (skill_root(path), path.parent, root) if b is not None]

    for number, line in prose:
        for span in PATH_SPAN.findall(line):
            if not looks_like_path(span):
                continue
            if any(fnmatch.fnmatch(span, pattern) for pattern in ignores):
                continue
            candidate = span.rstrip("/")
            if any((base / candidate).exists() for base in bases):
                continue
            problems.append(f"{path}:{number}: `{span}` does not resolve")

    return problems


def collect(targets: list[Path]) -> list[Path]:
    found: list[Path] = []
    for target in targets:
        if target.is_dir():
            found.extend(
                p for p in sorted(target.rglob("*.md"))
                if not any(part in SKIP_DIRS for part in p.parts)
            )
        elif target.suffix == ".md" and target.is_file():
            found.append(target)
    return found


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify backticked paths resolve and code fences close.",
    )
    parser.add_argument("paths", nargs="*", help="files or directories (default: .)")
    parser.add_argument("--root", default=".", help="final fallback for resolving paths")
    parser.add_argument(
        "--ignore",
        action="append",
        default=[],
        metavar="GLOB",
        help="path span to skip; repeatable (e.g. --ignore '.claude/*')",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f"docs-check: --root {root} is not a directory", file=sys.stderr)
        return 2

    files = collect([Path(p) for p in (args.paths or ["."])])
    if not files:
        print("docs-check: no Markdown files found", file=sys.stderr)
        return 2

    problems: list[str] = []
    for path in files:
        problems.extend(check_file(path, root, args.ignore))

    for problem in problems:
        print(problem)

    status = "clean" if not problems else f"{len(problems)} problem(s)"
    print(f"docs-check: {len(files)} file(s), {status}", file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
