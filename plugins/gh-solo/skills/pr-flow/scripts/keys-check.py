#!/usr/bin/env python3
"""Check that every item an issue body or a pull request body keys carries its key, and that no key opens two items.

The body is a file the caller fetched, as `gh issue view <n> --json body --jq .body > <scratch>.md`. Four rules of the plugin's own GhSolo Vale style run on it: PlanKeys and PlanKeyRepeat for a pull request's "## Steps", "## Verification" and "## Open questions", and IssueKeys and IssueKeyRepeat for an issue's "## Acceptance criteria", "## Technical notes" and "## Done when". Each pair finds nothing on the other surface, so one run serves both. The rules are per Keys in the tracker skill's references/formats.md.

Example:
    keys-check.py /tmp/body-60.md

Exit status: 0 clean, 1 problems found, 2 usage error or no usable Vale.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

RULES = ["GhSolo.PlanKeys", "GhSolo.PlanKeyRepeat", "GhSolo.IssueKeys", "GhSolo.IssueKeyRepeat"]


def plan_check():
    # WHY: the Vale floor and the config path are the plan check's, and importing them keeps one copy of each.
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location("plan_check", Path(__file__).resolve().with_name("plan-check.py"))
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("body", help="the body file, ending in .md")
    args = parser.parse_args()

    path = Path(args.body)
    if not path.is_file():
        print(f"keys-check: not a file: {path}", file=sys.stderr)
        return 2
    # WHY: the config applies its style to *.md alone, so Vale reports any other file clean without reading it.
    if path.suffix != ".md":
        print(f"keys-check: {path} does not end in .md, so Vale would check nothing in it", file=sys.stderr)
        return 2

    pc = plan_check()
    refusal = pc.vale_refusal("the body was not checked")
    if refusal:
        print(f"keys-check: {refusal}", file=sys.stderr)
        return 2

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

    problems = [f"{path}:{alert['Line']}: {alert['Message']}" for found in report.values() for alert in found]
    for problem in problems:
        print(problem)
    status = "clean" if not problems else f"{len(problems)} problem(s)"
    print(f"keys-check: {path}, {status}", file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
