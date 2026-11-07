#!/usr/bin/env python3
"""Check that every item an issue body or a pull request body keys carries its key, and that no key opens two items.

It fetches the body with `gh issue view` or `gh pr view` into a temporary file and runs four rules of the plugin's own GhSolo Vale style on it: PlanKeys and PlanKeyRepeat for a pull request's "## Steps", "## Verification" and "## Open questions", and IssueKeys and IssueKeyRepeat for an issue's "## Acceptance criteria", "## Technical notes" and "## Done when". Each pair finds nothing on the other surface, so one run serves both. The rules are per Keys in the tracker skill's references/formats.md.

Each problem prints on one line, tagged with what is wrong:
    unkeyed: line 9: - [ ] It refuses.
    repeated: AC1 opens 2 items: line 9: - [ ] ::AC1:: It refuses.; line 10: - [x] ::AC1:: It passes.

Example:
    keys-check.py pr 60
    keys-check.py issue 50

Exit status: 0 clean, 1 problems found, 2 usage error, a fetch that failed, or no usable Vale.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

RULES = ["GhSolo.PlanKeys", "GhSolo.PlanKeyRepeat", "GhSolo.IssueKeys", "GhSolo.IssueKeyRepeat"]
REPEAT_RULES = {"GhSolo.PlanKeyRepeat", "GhSolo.IssueKeyRepeat"}
ITEM_KEY = re.compile(r"^ {0,3}(?:[-*+]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?::((?:AC|N|D|S|V|Q)[1-9]\d*)::")
FENCE = re.compile(r"^[ \t]*(`{3,}|~{3,})")


def plan_check():
    # WHY: the Vale floor and the config path are the plan check's, and importing them keeps one copy of each.
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location("plan_check", Path(__file__).resolve().with_name("plan-check.py"))
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def items_by_key(lines: list[str]) -> dict[str, list[int]]:
    """Line numbers of the items each key opens, skipping fenced blocks as the repeat rules do."""
    found: dict[str, list[int]] = {}
    fence = ""
    for number, line in enumerate(lines, 1):
        marker = FENCE.match(line)
        if fence:
            if marker and marker.group(1).startswith(fence) and not line.strip()[len(marker.group(1)):].strip():
                fence = ""
        elif marker:
            fence = marker.group(1)
        else:
            item = ITEM_KEY.match(line)
            if item:
                found.setdefault(item.group(1), []).append(number)
    return found


def problems_in(alerts: list[dict], lines: list[str]) -> list[str]:
    problems = []
    repeated: list[str] = []
    for alert in sorted(alerts, key=lambda a: a["Line"]):
        line = lines[alert["Line"] - 1]
        if alert["Check"] in REPEAT_RULES:
            key = ITEM_KEY.match(line)
            if key and key.group(1) not in repeated:
                repeated.append(key.group(1))
        else:
            problems.append(f"unkeyed: line {alert['Line']}: {line}")
    owners = items_by_key(lines)
    for key in repeated:
        named = "; ".join(f"line {n}: {lines[n - 1]}" for n in owners[key])
        problems.append(f"repeated: {key} opens {len(owners[key])} items: {named}")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("kind", choices=["issue", "pr"], help="what the number names")
    parser.add_argument("number", help="the issue or pull request number")
    args = parser.parse_args()

    pc = plan_check()
    refusal = pc.vale_refusal("the body was not checked")
    if refusal:
        print(f"keys-check: {refusal}", file=sys.stderr)
        return 2

    try:
        fetch = subprocess.run(["gh", args.kind, "view", args.number, "--json", "body", "--jq", ".body"], capture_output=True, text=True)
    except FileNotFoundError:
        print("keys-check: gh is not on PATH: the body was not checked", file=sys.stderr)
        return 2
    if fetch.returncode != 0:
        print(f"keys-check: gh {args.kind} view {args.number} exited {fetch.returncode}: {fetch.stderr.strip()}", file=sys.stderr)
        return 2
    body = fetch.stdout.replace("\r\n", "\n")

    with tempfile.TemporaryDirectory() as scratch:
        # WHY: the config applies its style to *.md alone, so the file takes that suffix or Vale reads nothing in it.
        path = Path(scratch) / "body.md"
        path.write_text(body)
        vale = subprocess.run(
            ["vale", "--config", str(pc.CONFIG), "--no-global", "--output=JSON", f"--filter=.Name in {json.dumps(RULES)}", str(path)],
            capture_output=True,
            text=True,
        )
    if vale.returncode not in (0, 1):
        print(f"keys-check: vale could not run (exit {vale.returncode}): {(vale.stderr or vale.stdout).strip()}", file=sys.stderr)
        return 2
    try:
        report = json.loads(vale.stdout)
    except json.JSONDecodeError:
        report = None
    if not isinstance(report, dict):
        print(f"keys-check: vale printed no report: {(vale.stderr or vale.stdout).strip()}", file=sys.stderr)
        return 2

    problems = problems_in([alert for found in report.values() for alert in found], body.split("\n"))
    for problem in problems:
        print(problem)
    status = "clean" if not problems else f"{len(problems)} problem(s)"
    print(f"keys-check: {args.kind} {args.number}, {status}", file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
