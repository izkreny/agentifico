#!/usr/bin/env python3
"""Build and reconcile the one API call that lands a review round on a pull request.

The reviewer emits a findings file and knows nothing about posting conventions. This turns
that file into the payload for `POST repos/{owner}/{repo}/pulls/{pr}/reviews`, which lands
every finding as an inline thread and the record Review in one request, and afterwards
reconciles what the pull request actually carries against what was sent.

    post-review.py build  --findings F --disclaimer-file D --continue-from N --out PAYLOAD
    post-review.py verify --payload PAYLOAD --comments C

`build` refuses the whole round on any invalid finding rather than emitting a partial
payload: a payload that posts is irreversible, and half a round on a pull request is worse
than none. It writes no network traffic and needs none, so it is safe to re-run.

`verify` takes the pull request's inline comments as JSON, which must be read with
`gh api --paginate` - that endpoint pages at 30, and an unpaginated read of a pull request
carrying an ordinary plan discussion returns a slice that looks exactly like a failed post.

Exit codes: 0 all checks passed, 2 a check failed, 1 the arguments or the files were unusable.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# `unrated` means the reviewer supplied none, which an appointed command cannot. It is
# never a guess: a level or an axis that looked like the reviewer's but came from the
# orchestrator is the fictional mapping this whole flow exists to have removed.
SEVERITIES = {"high": "🔴", "medium": "🟡", "low": "🔵", "unrated": "⚪"}
AXES = ("standards", "spec", "unrated")
SIDES = ("RIGHT", "LEFT")
PASSES = ("review", "re-review")
SEVERITY_SOURCES = ("reviewer", "derived")
DISCLAIMER_PREFIX = "> 🤖"
SUGGESTION_FENCE = "```suggestion"

FINDING_FIELDS = (
    "index",
    "axis",
    "severity",
    "path",
    "line",
    "side",
    "failure_scenario",
    "finding",
    "needs_owner",
)


def load_json(path: Path, what: str) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        sys.exit(f"post-review: {what} not found: {path}")
    except json.JSONDecodeError as exc:
        sys.exit(f"post-review: {what} is not valid JSON: {path}: {exc}")


def rf_id(body: str) -> int | None:
    """The RF id a posted or built body carries, or None."""
    match = re.search(r"\bRF(\d+)\b", body)
    return int(match.group(1)) if match else None


def check_finding(finding: object, position: int, problems: list[str]) -> None:
    where = f"findings[{position}]"
    if not isinstance(finding, dict):
        problems.append(f"{where} is not an object")
        return

    for field in FINDING_FIELDS:
        if field not in finding:
            problems.append(f"{where} has no {field}")

    index = finding.get("index")
    if not isinstance(index, int) or isinstance(index, bool) or index < 1:
        problems.append(f"{where} index is not a positive integer: {index!r}")

    axis = finding.get("axis")
    if axis not in AXES:
        problems.append(f"{where} axis is not one of {'/'.join(AXES)}: {axis!r}")

    severity = finding.get("severity")
    if severity not in SEVERITIES:
        problems.append(
            f"{where} severity is not one of {'/'.join(SEVERITIES)}: {severity!r}"
        )

    path = finding.get("path")
    if not isinstance(path, str) or not path.strip():
        problems.append(f"{where} path is empty or not a string: {path!r}")

    line = finding.get("line")
    if not isinstance(line, int) or isinstance(line, bool) or line < 1:
        problems.append(f"{where} line is not a positive integer: {line!r}")

    side = finding.get("side")
    if side not in SIDES:
        problems.append(f"{where} side is not RIGHT or LEFT: {side!r}")

    for field in ("failure_scenario", "finding"):
        value = finding.get(field)
        if not isinstance(value, str) or not value.strip():
            problems.append(f"{where} {field} is empty or not a string")

    if not isinstance(finding.get("needs_owner"), bool):
        problems.append(
            f"{where} needs_owner is not true or false: {finding.get('needs_owner')!r}"
        )

    for field in ("finding", "failure_scenario"):
        value = finding.get(field)
        if isinstance(value, str) and SUGGESTION_FENCE in value:
            problems.append(
                f"{where} {field} carries a {SUGGESTION_FENCE} fence, which renders a "
                "button that commits straight to the branch"
            )


def check_verdict(verdict: object, position: int, problems: list[str]) -> None:
    where = f"verdicts[{position}]"
    if not isinstance(verdict, dict):
        problems.append(f"{where} is not an object")
        return

    rf = verdict.get("rf")
    if not isinstance(rf, int) or isinstance(rf, bool) or rf < 1:
        problems.append(f"{where} rf is not a positive integer: {rf!r}")

    if not isinstance(verdict.get("closed"), bool):
        problems.append(f"{where} closed is not true or false: {verdict.get('closed')!r}")

    why = verdict.get("why")
    if not isinstance(why, str) or not why.strip():
        problems.append(f"{where} why is empty, so the verdict cannot be checked")


def check_indices(findings: list[object], problems: list[str]) -> None:
    indices = [
        f["index"]
        for f in findings
        if isinstance(f, dict) and isinstance(f.get("index"), int)
    ]
    if len(set(indices)) != len(indices):
        problems.append("findings repeat a local index, so two findings cannot be told apart")
    if indices and sorted(indices) != list(range(1, len(indices) + 1)):
        problems.append(
            f"findings indices are not 1..{len(indices)} with no gaps: {sorted(indices)} - "
            "a gap means a finding was dropped between writing the file and posting it"
        )


def header(disclaimer: str, via: str) -> str:
    return f"{disclaimer}\n>\n> via `pr-flow` review, {via}"


def finding_body(finding: dict, rf: int, disclaimer: str, via: str) -> str:
    emoji = SEVERITIES[finding["severity"]]
    return (
        f"{header(disclaimer, via)}\n\n"
        f"RF{rf} {emoji} {finding['severity']} - {finding['finding'].strip()}\n\n"
        f"Failure scenario: {finding['failure_scenario'].strip()}"
    )


def record_body(
    data: dict, assigned: list[tuple[int, dict]], disclaimer: str, via: str
) -> str:
    lines = [header(disclaimer, via), ""]

    if data["pass"] == "review":
        axes = ", ".join(data["axes_run"])
        unrated = sum(1 for _, f in assigned if f["severity"] == "unrated")
        tail = f" {unrated} arrived unrated." if unrated else ""
        lines.append(f"Review round on {len(assigned)} finding(s). Axes run: {axes}.{tail}")
    else:
        verdicts = data.get("verdicts", [])
        closed = sum(1 for v in verdicts if v.get("closed"))
        lines.append(
            f"Scoped re-review: {closed} of {len(verdicts)} finding(s) verified closed, "
            f"{len(assigned)} new finding(s)."
        )

    if assigned:
        lines.append("")
        for rf, finding in assigned:
            emoji = SEVERITIES[finding["severity"]]
            axis = "" if finding["axis"] == "unrated" else f"`{finding['axis']}` "
            lines.append(
                f"- RF{rf} {emoji} {finding['severity']} {axis}"
                f"{finding['path']}:{finding['line']}"
            )
    else:
        lines.append("")
        lines.append("No findings.")

    if data.get("severity_source") == "derived":
        lines.append("")
        lines.append("## The severity basis, and why it is stated")
        lines.append("")
        lines.append(
            "These levels were not supplied by the reviewer, which gave none. They were "
            "read out of each finding's own account of what goes wrong, on this basis:"
        )
        lines.append("")
        lines.append(data["severity_basis"].strip())

    return "\n".join(lines)


def build(args: argparse.Namespace) -> int:
    data = load_json(Path(args.findings), "findings file")
    disclaimer = Path(args.disclaimer_file).read_text(encoding="utf-8").strip()

    problems: list[str] = []

    if not disclaimer.startswith(DISCLAIMER_PREFIX):
        problems.append(
            f"the disclaimer does not open with {DISCLAIMER_PREFIX!r}, which is the whole "
            "of what every gate downstream tests"
        )

    if args.continue_from < 0:
        problems.append(f"--continue-from is negative: {args.continue_from}")

    if not isinstance(data, dict):
        sys.exit("post-review: the findings file is not an object")

    which_pass = data.get("pass")
    if which_pass not in PASSES:
        problems.append(f"pass is not one of {'/'.join(PASSES)}: {which_pass!r}")

    findings = data.get("findings")
    if not isinstance(findings, list):
        problems.append("findings is missing or not a list")
        findings = []

    # A derived severity is one the orchestrator read out of the finding's own words,
    # which an appointed command's findings require because such a command supplies no
    # level. It is honest only if the record says so, which is why the basis is required
    # here and refused when the reviewer assigned the levels itself.
    source = data.get("severity_source", "reviewer")
    basis = data.get("severity_basis")
    if source not in SEVERITY_SOURCES:
        problems.append(
            f"severity_source is not one of {'/'.join(SEVERITY_SOURCES)}: {source!r}"
        )
    elif source == "derived":
        if not isinstance(basis, str) or not basis.strip():
            problems.append(
                "severity_source is derived but severity_basis is empty, so the record "
                "would publish levels with no account of where they came from"
            )
    elif basis is not None:
        problems.append(
            "severity_basis is set while severity_source is reviewer, which would claim a "
            "derivation that did not happen"
        )

    if which_pass == "review":
        axes_run = data.get("axes_run")
        if not isinstance(axes_run, list) or not axes_run:
            problems.append("axes_run is missing or empty, so nothing says which axes ran")
        elif [a for a in axes_run if a not in AXES]:
            problems.append(f"axes_run holds something that is not an axis: {axes_run!r}")
    elif which_pass == "re-review":
        verdicts = data.get("verdicts")
        if not isinstance(verdicts, list) or not verdicts:
            problems.append(
                "a re-review with no verdicts answers neither of its two questions"
            )
        else:
            for position, verdict in enumerate(verdicts):
                check_verdict(verdict, position, problems)

    for position, finding in enumerate(findings):
        check_finding(finding, position, problems)
    check_indices(findings, problems)

    if problems:
        print(f"post-review: {len(problems)} problem(s), nothing built", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        return 2

    ordered = sorted(findings, key=lambda f: f["index"])
    assigned = [(args.continue_from + n, f) for n, f in enumerate(ordered, start=1)]

    via_finding = "finding" if which_pass == "review" else "re-review finding"
    via_record = "round record" if which_pass == "review" else "re-review record"

    payload = {
        "event": "COMMENT",
        "body": record_body(data, assigned, disclaimer, via_record),
        "comments": [
            {
                "path": f["path"],
                "line": f["line"],
                "side": f["side"],
                "body": finding_body(f, rf, disclaimer, via_finding),
            }
            for rf, f in assigned
        ],
    }

    for comment in payload["comments"]:
        if not comment["body"].startswith(DISCLAIMER_PREFIX):
            print("post-review: a built body does not open with the disclaimer", file=sys.stderr)
            return 2
        if SUGGESTION_FENCE in comment["body"]:
            print(f"post-review: a built body carries a {SUGGESTION_FENCE} fence", file=sys.stderr)
            return 2

    Path(args.out).write_text(
        json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )

    print(f"post-review: {len(assigned)} finding(s) -> {args.out}")
    for rf, finding in assigned:
        print(
            f"  index {finding['index']} -> RF{rf}  {finding['severity']:<6} "
            f"{finding['axis']:<9} {finding['path']}:{finding['line']}"
        )
    if not assigned:
        print("  no findings; the record Review posts alone")
    return 0


def verify(args: argparse.Namespace) -> int:
    payload = load_json(Path(args.payload), "payload")
    posted = load_json(Path(args.comments), "comments listing")

    if not isinstance(payload, dict) or not isinstance(payload.get("comments"), list):
        sys.exit("post-review: the payload has no comments array")
    if not isinstance(posted, list):
        sys.exit(
            "post-review: the comments listing is not a JSON array - it must be the output "
            "of `gh api --paginate repos/{owner}/{repo}/pulls/<pr-number>/comments`"
        )

    problems: list[str] = []
    bodies = [c["body"] for c in posted if isinstance(c, dict) and isinstance(c.get("body"), str)]

    # Keyed on this round's own RF ids, never on a path:line anchor and never on a count of
    # RF-marked threads. Both of those pass by accident on any round after the first, where
    # an earlier round's threads are in the same listing and can sit on the same line.
    for comment in payload["comments"]:
        rf = rf_id(comment["body"])
        if rf is None:
            problems.append(f"a sent body carries no RF id: {comment['path']}:{comment['line']}")
            continue
        if not any(rf_id(body) == rf for body in bodies):
            problems.append(
                f"RF{rf} was sent for {comment['path']}:{comment['line']} and is not on the "
                "pull request; if this listing was read without --paginate it is a slice, "
                "not a result"
            )

    sent = len(payload["comments"])

    if problems:
        print(f"post-review: {len(problems)} problem(s)", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        return 2

    print(f"post-review: all {sent} finding(s) reconciled against the pull request")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build and reconcile a review round's single API call.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="mode", required=True)

    b = sub.add_parser("build", help="findings file -> reviews-endpoint payload")
    b.add_argument("--findings", required=True, help="the reviewer's findings file")
    b.add_argument(
        "--disclaimer-file",
        required=True,
        help="file holding the AI disclaimer line; must open with '> 🤖'",
    )
    b.add_argument(
        "--continue-from",
        type=int,
        required=True,
        help="the highest RF id already on this pull request, or 0 for a first round",
    )
    b.add_argument("--out", required=True, help="where to write the payload JSON")

    v = sub.add_parser("verify", help="reconcile a posted round against the pull request")
    v.add_argument("--payload", required=True, help="the payload that was sent")
    v.add_argument(
        "--comments",
        required=True,
        help="the pull request's inline comments, read with `gh api --paginate`",
    )

    args = parser.parse_args()
    return build(args) if args.mode == "build" else verify(args)


if __name__ == "__main__":
    sys.exit(main())
