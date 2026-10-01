#!/usr/bin/env python3
"""Check plan files for the structure the pr-flow skill's open workflow requires.

The filename is checked here, since Vale reads no filenames. Everything else is a rule of the plugin's own GhSolo Vale style: a "## Steps" heading, a "## Verification" heading with a list item under it, and no checkbox anywhere. The style is read from the plugin's own .vale.ini, never from the repository being checked.

Example, on the plan a branch is about to commit:
    plan-check.py docs/plans/2026-08-16_GHI-50_login-form.md

Exit status: 0 clean, 1 problems found, 2 usage error or no usable Vale.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

MIN_VALE = (3, 23)
CONFIG = Path(__file__).resolve().parents[3] / ".vale.ini"
INSTALL = f"Install Vale {MIN_VALE[0]}.{MIN_VALE[1]} or later, per Requirements in the gh-solo plugin's README.md, and run the check again."

FILENAME = re.compile(r"^(\d{4}-\d{2}-\d{2})_GHI-[1-9]\d*_[a-z0-9]+(?:-[a-z0-9]+)*\.md$")

# WHY: Vale reports a missing occurrence on line 1, which points at nothing, so these alerts print without a line.
WHOLE_FILE_RULES = {"GhSolo.PlanSteps", "GhSolo.PlanVerification"}


def filename_problem(path: Path) -> str | None:
    match = FILENAME.match(path.name)
    if match:
        try:
            date.fromisoformat(match.group(1))
            return None
        except ValueError:
            pass
    return f"{path}: the filename is not YYYY-MM-DD_GHI-{{issue-number}}_{{slug}}.md, with a real date and a lowercase kebab-case slug"


def vale_refusal() -> str | None:
    try:
        run = subprocess.run(["vale", "--version"], capture_output=True, text=True)
    except FileNotFoundError:
        return f"vale is not on PATH: the plans were not checked. {INSTALL}"
    found = re.search(r"(\d+)\.(\d+)\.\d+", run.stdout)
    if run.returncode != 0 or not found:
        return f"could not read Vale's version from {run.stdout.strip() or run.stderr.strip()!r}: the plans were not checked. {INSTALL}"
    if (int(found.group(1)), int(found.group(2))) < MIN_VALE:
        return f"vale {found.group(0)} is older than {MIN_VALE[0]}.{MIN_VALE[1]}: the plans were not checked. {INSTALL}"
    return None


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("plans", nargs="+", help="plan files to check")
    args = parser.parse_args()

    files = [Path(p) for p in args.plans]
    missing = [str(p) for p in files if not p.is_file()]
    if missing:
        print(f"plan-check: not a file: {', '.join(missing)}", file=sys.stderr)
        return 2

    refusal = vale_refusal()
    if refusal:
        print(f"plan-check: {refusal}", file=sys.stderr)
        return 2

    vale = subprocess.run(
        ["vale", "--config", str(CONFIG), "--no-global", "--output=JSON", *map(str, files)],
        capture_output=True,
        text=True,
    )
    # WHY: Vale's exit code is not read for findings, because the JSON carries every alert; exit 2 is a run that never got that far.
    if vale.returncode == 2:
        print(f"plan-check: vale could not run: {(vale.stderr or vale.stdout).strip()}", file=sys.stderr)
        return 2
    try:
        report = json.loads(vale.stdout) if vale.stdout.strip() else {}
    except json.JSONDecodeError:
        print(f"plan-check: vale printed no report: {(vale.stderr or vale.stdout).strip()}", file=sys.stderr)
        return 2
    # WHY: Vale cleans the path it was given before using it as a key, so a key matched as written misses "a/../b" and reports that plan clean.
    alerts = {Path(key).resolve(): found for key, found in report.items()}

    problems: list[str] = []
    for path in files:
        problem = filename_problem(path)
        if problem:
            problems.append(problem)
        for alert in alerts.get(path.resolve(), []):
            where = f"{path}" if alert["Check"] in WHOLE_FILE_RULES else f"{path}:{alert['Line']}"
            problems.append(f"{where}: {alert['Message']}")

    for problem in problems:
        print(problem)

    status = "clean" if not problems else f"{len(problems)} problem(s)"
    print(f"plan-check: {len(files)} file(s), {status}", file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
