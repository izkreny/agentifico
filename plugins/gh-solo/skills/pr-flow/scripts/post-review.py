#!/usr/bin/env python3
"""Build and reconcile the one API call that lands a review round on a pull request.

The reviewer emits a findings file and knows nothing about posting conventions. This turns
that file into the payload for `POST repos/{owner}/{repo}/pulls/{pr}/reviews`, which lands
every finding as an inline thread and the record Review in one request, and afterwards
reconciles what the pull request actually carries against what was sent.

    post-review.py build      --findings F --disclaimer-file D --continue-from N --out PAYLOAD
    post-review.py verify     --payload PAYLOAD --comments C
    post-review.py highest-id --comments C

`build` refuses the whole round on any invalid finding rather than emitting a partial
payload: a payload that posts is irreversible, and half a round on a pull request is worse
than none. It writes no network traffic and needs none, so it is safe to re-run.

`verify` takes the pull request's inline comments as JSON, which must be read with
`gh api --paginate` - that endpoint pages at 30, and an unpaginated read of a pull request
carrying an ordinary plan discussion returns a slice that looks exactly like a failed post.

`highest-id` reads the same listing and prints the number `build --continue-from` wants. It
is a subcommand rather than a `--jq` filter on the `gh` call because `--jq` cannot read a
paginated result whole; the unattended-command bullet in the `pr-flow` skill's SKILL.md owns
that rule and says why.

Exit codes: 0 all checks passed, 2 a check failed, 1 the arguments or the files were unusable.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
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
# An id a post *issues* is delimited, so prose can name one without being counted: an
# explanation writing `RF7` to illustrate the flow inflated this counter, and a convention
# asking writers to remember that is a rule with no gate. The delimiter is the gate.
# `::` rather than brackets because `[RF8]` is markdown link syntax and can acquire
# meaning where a reference definition exists, while `::RF8::` renders literally in every
# markdown dialect and is not something prose types by accident.
ID_PATTERN = r"::RF(\d+)::"
# What a finding post wrote before the brackets: the id at the start of a line. Read for
# the life of every pull request that already carries one, because under-reading hands a
# live id to a second finding, which is the one failure that cannot be undone.
LEGACY_PATTERN = r"^RF(\d+) "
# A bare id anywhere else is prose. Ignoring it is the whole point, but a *legacy* post put
# them mid-line too - a verdict answering about several findings - so an ignored one is
# reported rather than silently dropped.
BARE_PATTERN = r"\bRF(\d+)\b"
# The key that marks a fenced JSON block as this flow's own held-findings ledger. `release`
# scans every ```json fence in every review body, so a sentinel inside the object is what
# tells ours from a fence someone else wrote; a heading above it would not survive an edit.
HELD_KEY = "gh_solo_held"
# The record Review that holds a finding is posted before that finding has a fix plan, a
# fix result or a verdict - they do not exist yet - and a posted Review is never rewritten.
# So the round posts a second Review at its end carrying those, keyed by id, and `release`
# merges the two ledgers: the finding becomes the thread, each follow-up becomes a reply.
FOLLOWUP_KEY = "gh_solo_held_followup"
FOLLOWUP_KINDS = ("plan", "result", "verdict")

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
# What a ledger entry carries: the finding whole, the id it was reserved under, and the
# head its `line` was counted against - without which the number cannot be brought
# forward to the pushed head.
HELD_FIELDS = FINDING_FIELDS + ("rf", "at")


def load_json(path: Path, what: str) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        sys.exit(f"post-review: {what} not found: {path}")
    except json.JSONDecodeError as exc:
        sys.exit(f"post-review: {what} is not valid JSON: {path}: {exc}")


def rf_ids(body: str) -> list[int]:
    """Every id a body *issues*, since one reply can answer about several at once.

    Delimited ids anywhere, plus a legacy post's line-opening bare id. A bare id anywhere
    else is prose naming a finding rather than a post issuing one.
    """
    found = [int(n) for n in re.findall(ID_PATTERN, body)]
    found += [int(m.group(1)) for m in re.finditer(LEGACY_PATTERN, body, re.M)]
    return found


def rf_id(body: str) -> int | None:
    """The id a posted or built body carries, or None."""
    found = rf_ids(body)
    return found[0] if found else None


def ignored_bare_ids(body: str) -> list[int]:
    """Bare ids this body carries that no longer count, for reporting rather than use."""
    counted = set(rf_ids(body))
    return sorted({int(n) for n in re.findall(BARE_PATTERN, body)} - counted)


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


def unpushed_paths(text: str, problems: list[str]) -> set[str]:
    """The files the unpushed fix commits touch, from a `git diff` of them.

    Held-or-not is decided per *file*, never per hunk, and the reason is line numbers. A
    rescope finding's `line` counts lines in the file at local HEAD, while GitHub resolves
    an anchor against the pushed head, so an unpushed commit that inserts lines anywhere
    above a finding shifts it - including a finding outside every hunk. Holding the whole
    file is the strict superset that has no such gap, and it over-flags in the direction
    the design already accepts: a thread minutes later rather than a `422`.
    """
    paths: set[str] = set()
    saw_header = False
    for line in text.splitlines():
        # `diff --git` is the one line git emits for every file in every diff. The
        # `---`/`+++` pair is absent for a pure rename, a mode-only change and a binary
        # file, so a reader that took only those would refuse a legitimate diff.
        match = re.match(r"diff --git a/(.*) b/(.*)$", line)
        if match:
            saw_header = True
            paths.update(name for name in match.groups() if name)
            continue
        if line.startswith("--- ") or line.startswith("+++ "):
            saw_header = True
            name = line[4:].strip()
            if name == "/dev/null":
                continue
            if name.startswith(("a/", "b/")):
                name = name[2:]
            if name:
                paths.add(name)
    if text.strip() and not saw_header:
        problems.append(
            "the unpushed diff has content but no `diff --git` or ---/+++ file header, so "
            "nothing could be held; it is not the output of `git diff`"
        )
    return paths


def shift_line(diff_text: str, line: int) -> int | None:
    """Where `line` has moved to across a diff, or None when the diff changed it.

    A held finding's `line` counts lines in the file as it stood when the reviewer read it,
    and the round goes on committing between the hold and the push, so replaying that
    number would anchor the thread to whatever now sits there. `None` is the honest answer
    where the fixes rewrote the line itself: nothing can say where such a finding belongs.
    """
    offset = 0
    for match in re.finditer(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@", diff_text, re.M):
        old_start = int(match.group(1))
        old_len = 1 if match.group(2) is None else int(match.group(2))
        new_len = 1 if match.group(4) is None else int(match.group(4))
        # `-a,0` is a pure insertion *after* old line a, so it never covers a line itself.
        if old_len == 0:
            if old_start < line:
                offset += new_len
        elif old_start + old_len <= line:
            offset += new_len - old_len
        elif old_start <= line:
            return None
    return line + offset


def repo_root() -> str | None:
    """The working tree's top level, or None where this is not a git repository."""
    proc = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True
    )
    return None if proc.returncode != 0 else proc.stdout.strip()


def range_diff(at: str, path: str, root: str) -> str | None:
    """`git diff` from the head a finding was anchored against to the current one.

    Run at the top level, because a ledger's `path` is repo-relative while a git pathspec
    is relative to the working directory: from a subdirectory the pathspec matches nothing
    and git answers empty output at exit 0, which is indistinguishable from "the file did
    not change" and would replay the stored line silently - the very defect the shift
    exists to remove.
    """
    proc = subprocess.run(
        ["git", "diff", f"{at}..HEAD", "--unified=0", "--", path],
        capture_output=True, text=True, cwd=root,
    )
    return None if proc.returncode != 0 else proc.stdout


def threaded_ids(bodies: list[str]) -> set[int]:
    """The ids that already carry a finding thread, never the ones merely mentioned.

    Every convention here puts ids in prose - a fix plan, a fix result and a re-review
    verdict all name the ids they cover - so "any RF{n} anywhere" reads a cross-reference
    as a posted finding and silently drops the held finding it names. `finding_body` is the
    only thing that posts a finding and it opens a line with the id, so that shape is the
    test; it is also what `verify` matches on, which keeps the two halves in agreement.
    """
    found: set[int] = set()
    for body in bodies:
        first = rf_id(body)
        if first is None:
            continue
        if any(
            line.startswith(f"::RF{first}:: ") or line.startswith(f"RF{first} ")
            for line in body.splitlines()
        ):
            found.add(first)
    return found


def ledger_entries(bodies: list[str], key: str) -> list[dict]:
    """Every entry under `key` in a review body's fenced ledgers, oldest body first."""
    entries: list[dict] = []
    for body in bodies:
        for block in re.findall(r"```json\n(.*?)\n```", body, re.DOTALL):
            try:
                data = json.loads(block)
            except json.JSONDecodeError:
                continue
            if isinstance(data, dict) and isinstance(data.get(key), list):
                entries.extend(e for e in data[key] if isinstance(e, dict))
    return entries


def held_entries(bodies: list[str]) -> list[dict]:
    """Every held finding recorded in a review body's fenced ledger, oldest body first."""
    return ledger_entries(bodies, HELD_KEY)


def followup_entries(bodies: list[str]) -> list[dict]:
    """Every fix plan, fix result and verdict recorded for a held finding."""
    return ledger_entries(bodies, FOLLOWUP_KEY)


def followup(args: argparse.Namespace) -> int:
    """Post-round: record a held finding's plan, result and verdict for `release` to copy.

    Each is kept as its own entry rather than folded into the finding's text, so the thread
    `release` opens carries the same reply-per-step shape a threaded finding collects.
    """
    disclaimer = Path(args.disclaimer_file).read_text(encoding="utf-8").strip()
    data = load_json(Path(args.entries), "follow-up entries")

    problems: list[str] = []
    if not disclaimer.startswith(DISCLAIMER_PREFIX):
        problems.append(
            f"the disclaimer does not open with {DISCLAIMER_PREFIX!r}, which is the whole "
            "of what every gate downstream tests"
        )
    if not isinstance(data, list) or not data:
        sys.exit("post-review: the follow-up entries file is not a non-empty JSON array")

    for position, entry in enumerate(data):
        where = f"entries[{position}]"
        if not isinstance(entry, dict):
            problems.append(f"{where} is not an object")
            continue
        rf = entry.get("rf")
        if not isinstance(rf, int) or isinstance(rf, bool) or rf < 1:
            problems.append(f"{where} rf is not a positive integer: {rf!r}")
        kind = entry.get("kind")
        if kind not in FOLLOWUP_KINDS:
            problems.append(f"{where} kind is not one of {'/'.join(FOLLOWUP_KINDS)}: {kind!r}")
        text = entry.get("text")
        if not isinstance(text, str) or not text.strip():
            problems.append(f"{where} text is empty or not a string")
        elif SUGGESTION_FENCE in text:
            problems.append(f"{where} text carries a {SUGGESTION_FENCE} fence")

    if problems:
        print(f"post-review: {len(problems)} problem(s), nothing built", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        return 2

    ordered = sorted(data, key=lambda e: (e["rf"], FOLLOWUP_KINDS.index(e["kind"])))
    rows = [f"- ::RF{e['rf']}:: {e['kind']}" for e in ordered]
    body = "\n".join(
        [header(disclaimer, "held follow-up"), "",
         f"What the round did about {len({e['rf'] for e in ordered})} held finding(s), "
         "for `release` to copy into their threads once the push opens them:", ""]
        + rows
        + ["", "```json", json.dumps({FOLLOWUP_KEY: ordered}, ensure_ascii=False, indent=1), "```"]
    )
    Path(args.out).write_text(
        json.dumps({"event": "COMMENT", "body": body}, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    print(f"post-review: {len(ordered)} follow-up(s) -> {args.out}")
    for e in ordered:
        print(f"  ::RF{e['rf']}::  {e['kind']}")
    return 0


def header(disclaimer: str, via: str) -> str:
    return f"{disclaimer}\n>\n> via `pr-flow` review, {via}"


def finding_note(kind: str, text: str, disclaimer: str) -> str:
    """One reply a released thread collects: its fix plan, its fix result or its verdict."""
    via = {"plan": "released fix plan", "result": "released fix result",
           "verdict": "released re-review verdict"}[kind]
    return f"{header(disclaimer, via)}\n\n{text.strip()}"


def finding_body(finding: dict, rf: int, disclaimer: str, via: str) -> str:
    emoji = SEVERITIES[finding["severity"]]
    return (
        f"{header(disclaimer, via)}\n\n"
        f"::RF{rf}:: {emoji} {finding['severity']} - {finding['finding'].strip()}\n\n"
        f"Failure scenario: {finding['failure_scenario'].strip()}"
    )


def record_body(
    data: dict,
    assigned: list[tuple[int, dict]],
    held: set[int],
    anchored_at: str,
    reviewed_at: str,
    corroborated: bool,
    disclaimer: str,
    via: str,
) -> str:
    lines = [header(disclaimer, via), ""]

    if data["pass"] == "review":
        axes = ", ".join(data["axes_run"])
        unrated = sum(1 for _, f in assigned if f["severity"] == "unrated")
        tail = f" {unrated} arrived unrated." if unrated else ""
        lines.append(f"Review round on {len(assigned)} finding(s). Axes run: {axes}.{tail}")
        # A record row, so *Never counted* in `../references/post-caps.md` keeps it out of
        # this body's length cap. It is here because the head otherwise lives in one
        # session's memory and dies with it, leaving nobody able to say afterwards which
        # version of the branch a round actually judged.
        witness = ("corroborated by the reviewer" if corroborated
                   else "not corroborated - the reviewer reported no head")
        lines.append(f"- Reviewed at {reviewed_at} ({witness})")
    else:
        verdicts = data.get("verdicts", [])
        closed = sum(1 for v in verdicts if v.get("closed"))
        threaded = len(assigned) - len(held)
        lines.append(
            f"Scoped re-review: {closed} of {len(verdicts)} finding(s) verified closed, "
            f"{threaded} new finding(s) threaded, {len(held)} held for the push."
        )

    if assigned:
        lines.append("")
        for rf, finding in assigned:
            emoji = SEVERITIES[finding["severity"]]
            axis = "" if finding["axis"] == "unrated" else f"`{finding['axis']}` "
            tail = " - no thread yet, held for the push" if rf in held else ""
            lines.append(
                f"- ::RF{rf}:: {emoji} {finding['severity']} {axis}"
                f"{finding['path']}:{finding['line']}{tail}"
            )
    else:
        lines.append("")
        lines.append("No findings.")

    # The ledger `release` reads back after the push. It carries each held finding whole
    # rather than the row above, because a thread cannot be opened later from a `file:line`
    # with no finding text. `json.dumps` never emits a raw newline inside a string, so no
    # finding's own text can close this fence early.
    if held:
        ledger = [
            {**{k: f[k] for k in FINDING_FIELDS}, "rf": rf, "at": anchored_at}
            for rf, f in assigned
            if rf in held
        ]
        lines.append("")
        lines.append("## Held for the push")
        lines.append("")
        lines.append(
            "These point at lines only the unpushed fix commits carry, so GitHub cannot "
            "anchor a thread to them yet. Their ids are reserved, and `rnp` posts each as "
            "a thread the moment its push lands."
        )
        lines.append("")
        lines.append("```json")
        lines.append(json.dumps({HELD_KEY: ledger}, ensure_ascii=False, indent=1))
        lines.append("```")

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

    # The other half of the same rule. `unrated` exists for a reviewer that cannot assign
    # a level, so a finding carrying it while the source is `reviewer` publishes a level
    # the reviewer never gave as the reviewer's own. The check above refuses a derivation
    # that did not happen; this one refuses one that did and was not stated.
    if source == "reviewer":
        unrated = [
            f.get("index") for f in findings
            if isinstance(f, dict) and f.get("severity") == "unrated"
        ]
        if unrated:
            problems.append(
                "severity is unrated on finding(s) %s while severity_source is reviewer, "
                "so the record would attribute a level to a reviewer that supplied none"
                % ", ".join(str(i) for i in unrated)
            )

    # `--unpushed-diff` belongs to the rescope entrance alone. A full pass runs on the
    # pushed head, so a finding it cannot anchor is the reviewer failing to anchor, which
    # `../../reviewer/SKILL.md` already tells it to drop rather than hand on.
    if which_pass == "review" and args.unpushed_diff is not None:
        problems.append(
            "--unpushed-diff was given on a review pass, which reads the pushed head and "
            "has nothing held to reason about"
        )
    elif which_pass == "re-review" and args.unpushed_diff is None:
        problems.append(
            "--unpushed-diff is missing on a re-review, so nothing can tell a finding "
            "GitHub can anchor from one only the unpushed fixes carry"
        )

    # The pin is what the reviewer was told to read, so it belongs to the full pass and
    # the full pass alone: a re-review reads unpushed commits with `git` and takes
    # `--anchored-at` for the same job. Both directions are refused, as with the pair
    # above, because an argument that is silently ignored on one entrance is an argument
    # nobody can reason about on either.
    reported = data.get("head")
    if which_pass == "re-review":
        for flag, value in (("--pinned-head", args.pinned_head), ("--head-now", args.head_now)):
            if value is not None:
                problems.append(
                    f"{flag} was given on a re-review, which reads the fix commits it was "
                    "handed rather than a head it was pinned to"
                )
        if reported is not None:
            problems.append(
                "head was given on a re-review, whose findings are counted against the "
                "local commits and whose reference is --anchored-at"
            )
    else:
        for flag, value in (("--pinned-head", args.pinned_head), ("--head-now", args.head_now)):
            if value is None:
                problems.append(
                    f"{flag} is missing on a review pass, so nothing says "
                    + ("what the reviewer was told to read" if flag == "--pinned-head"
                       else "whether the pull request has moved since")
                )
            elif not re.fullmatch(r"[0-9a-f]{7,40}", value):
                problems.append(f"{flag} is not a commit sha: {value!r}")
        # Optional, because a reviewer a repository appointed may not write it. What it
        # buys when present is corroboration: the pin says what was asked for, this says
        # what was read, and only the two together rule out a reviewer that read elsewhere.
        if reported is not None and not re.fullmatch(r"[0-9a-f]{7,40}", str(reported)):
            problems.append(f"head is not a commit sha: {reported!r}")
        else:
            # Two comparisons, two messages. They fail for different reasons - one means
            # the pass is invalid, the other that the anchors can no longer resolve - and
            # a single merged message would leave a reader unable to tell which.
            if reported is not None and args.pinned_head is not None and reported != args.pinned_head:
                problems.append(
                    f"the reviewer read {reported} but was told to read "
                    f"{args.pinned_head}, so the pass judged something else"
                )
            if (
                args.pinned_head is not None
                and args.head_now is not None
                and args.pinned_head != args.head_now
            ):
                problems.append(
                    f"the pull request moved from {args.pinned_head} to {args.head_now} "
                    "during the round, so GitHub would resolve these anchors against "
                    "content the pass never read"
                )

    if which_pass == "review" and args.anchored_at is not None:
        problems.append(
            "--anchored-at was given on a review pass, whose findings become threads now "
            "and so never need their lines brought forward"
        )
    elif which_pass == "re-review":
        if args.anchored_at is None:
            problems.append(
                "--anchored-at is missing on a re-review, so a held finding's line could "
                "not be brought forward to the pushed head and would be replayed stale"
            )
        elif not re.fullmatch(r"[0-9a-f]{7,40}", args.anchored_at):
            problems.append(
                f"--anchored-at is not a commit sha: {args.anchored_at!r}"
            )

    held_paths: set[str] = set()
    if which_pass == "re-review" and args.unpushed_diff is not None:
        try:
            diff_text = Path(args.unpushed_diff).read_text(encoding="utf-8")
        except FileNotFoundError:
            sys.exit(f"post-review: unpushed diff not found: {args.unpushed_diff}")
        held_paths = unpushed_paths(diff_text, problems)

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

    # Ids run over every finding whether or not it gets a thread, which is the whole point
    # of holding rather than deferring: the id is reserved now and cannot be reissued.
    held = {rf for rf, f in assigned if f["path"] in held_paths}

    via_finding = "finding" if which_pass == "review" else "re-review finding"
    via_record = "round record" if which_pass == "review" else "re-review record"

    payload = {
        "event": "COMMENT",
        "body": record_body(
            data,
            assigned,
            held,
            args.anchored_at or "",
            args.pinned_head or "",
            data.get("head") is not None,
            disclaimer,
            via_record,
        ),
        "comments": [
            {
                "path": f["path"],
                "line": f["line"],
                "side": f["side"],
                "body": finding_body(f, rf, disclaimer, via_finding),
            }
            for rf, f in assigned
            if rf not in held
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

    print(
        f"post-review: {len(assigned)} finding(s) -> {args.out} "
        f"({len(assigned) - len(held)} threaded, {len(held)} held)"
    )
    for rf, finding in assigned:
        tail = "  HELD - no thread until the push" if rf in held else ""
        print(
            f"  index {finding['index']} -> RF{rf}  {finding['severity']:<6} "
            f"{finding['axis']:<9} {finding['path']}:{finding['line']}{tail}"
        )
    if not assigned:
        print("  no findings; the record Review posts alone")
    return 0


def comment_bodies(path: Path) -> list[str]:
    """Every body in a pull request's inline-comment listing.

    The listing is what `gh api --paginate` writes with no `--slurp`: one flat array of
    comment objects, pages already merged. `--slurp` would nest one array per page, so a
    reader written for that shape and a reader written for this one cannot be the same.
    """
    posted = load_json(path, "comments listing")
    wrong_shape = (
        "post-review: the comments listing is not one flat JSON array of comments - it must "
        "be the output of `gh api --paginate "
        "repos/{owner}/{repo}/pulls/<pr-number>/comments`, with no --slurp"
    )
    if not isinstance(posted, list):
        sys.exit(wrong_shape)
    # A non-object element is the array-of-arrays `--paginate --slurp` writes, one array per
    # page. Filtering it out rather than refusing would find no bodies at all and answer 0,
    # which is indistinguishable from a pull request that has had no round.
    if any(not isinstance(c, dict) for c in posted):
        sys.exit(wrong_shape)
    return [c["body"] for c in posted if isinstance(c.get("body"), str)]


def review_bodies(path: Path) -> list[str]:
    """Every submitted review's body on a pull request.

    Same shape and same refusal as `comment_bodies`: the flat array `gh api --paginate`
    writes for `pulls/<pr-number>/reviews`, never the array-of-arrays `--slurp` nests. A
    reserved id lives only here until its push, so a reader that missed this surface would
    answer as though the id had never been issued.
    """
    posted = load_json(path, "reviews listing")
    wrong_shape = (
        "post-review: the reviews listing is not one flat JSON array of reviews - it must "
        "be the output of `gh api --paginate "
        "repos/{owner}/{repo}/pulls/<pr-number>/reviews`, with no --slurp"
    )
    if not isinstance(posted, list):
        sys.exit(wrong_shape)
    if any(not isinstance(r, dict) for r in posted):
        sys.exit(wrong_shape)
    return [r["body"] for r in posted if isinstance(r.get("body"), str)]


def release(args: argparse.Namespace) -> int:
    """Post-push: turn the held ledger back into the threads it was standing in for.

    Exit 0 with no payload written means there was nothing to release, which is the
    ordinary answer on a round that held nothing.
    """
    disclaimer = Path(args.disclaimer_file).read_text(encoding="utf-8").strip()
    bodies = review_bodies(Path(args.reviews))
    entries = held_entries(bodies)
    follow_ups = followup_entries(bodies)
    threaded = threaded_ids(comment_bodies(Path(args.comments)))

    problems: list[str] = []
    if not disclaimer.startswith(DISCLAIMER_PREFIX):
        problems.append(
            f"the disclaimer does not open with {DISCLAIMER_PREFIX!r}, which is the whole "
            "of what every gate downstream tests"
        )

    for position, entry in enumerate(entries):
        for field in HELD_FIELDS:
            if field not in entry:
                problems.append(f"held[{position}] has no {field}")
    if problems:
        print(f"post-review: {len(problems)} problem(s), nothing built", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        return 2

    # An id already carrying a thread is skipped rather than refused. Every earlier round's
    # ledger stays in its own review body for good - nothing rewrites a posted Review - so
    # on the second `rnp` of a pull request the first round's released ids are still listed
    # here, and refusing on them would break every round after the first.
    already = sorted({e["rf"] for e in entries} & threaded)
    pending = [e for e in entries if e["rf"] not in threaded]
    # Two ledgers can name one id only if a round reissued it, which is the invariant the
    # widened `highest-id` exists to keep; posting it twice would hide that it broke.
    seen: set[int] = set()
    unique = []
    for entry in sorted(pending, key=lambda e: e["rf"]):
        if entry["rf"] in seen:
            print(
                f"post-review: RF{entry['rf']} is held twice, so an id was reissued",
                file=sys.stderr,
            )
            return 2
        seen.add(entry["rf"])
        unique.append(entry)

    if already:
        print("post-review: already threaded, skipped: " + ", ".join(f"RF{n}" for n in already))

    # The stored line was counted against `at`, and the round kept committing after the
    # hold, so it is brought forward rather than replayed. A line the fixes rewrote cannot
    # be brought forward at all, and a named gap beats a thread on the wrong statement.
    # Checked here rather than on entry: a malformed ledger is still a malformed ledger
    # outside a repository, and refusing earlier turned every existing exit-2 refusal into
    # an exit 1 that says something else entirely.
    root = repo_root()
    if root is None:
        sys.exit(
            "post-review: release must run inside the branch's git repository - it brings "
            "each held finding's line forward with `git diff`, and cannot without one"
        )

    anchored: list[dict] = []
    for entry in unique:
        diff = range_diff(entry["at"], entry["path"], root)
        if diff is None:
            print(
                f"post-review: RF{entry['rf']} skipped - git could not diff {entry['at']}"
                f"..HEAD for {entry['path']}"
            )
            continue
        moved = shift_line(diff, entry["line"])
        if moved is None:
            print(
                f"post-review: RF{entry['rf']} skipped - the fixes rewrote "
                f"{entry['path']}:{entry['line']}, so its line cannot be brought forward"
            )
            continue
        if moved != entry["line"]:
            print(
                f"post-review: RF{entry['rf']} moved {entry['path']}:{entry['line']}"
                f" -> :{moved}"
            )
        anchored.append({**entry, "line": moved})

    if not anchored:
        print("post-review: nothing to release")
        return 0
    unique = anchored

    rows = [
        f"- ::RF{e['rf']}:: {SEVERITIES[e['severity']]} {e['severity']} {e['path']}:{e['line']}"
        for e in unique
    ]
    payload = {
        "event": "COMMENT",
        "body": "\n".join(
            [header(disclaimer, "the release"), "",
             f"The push has landed, so {len(unique)} held finding(s) now have threads:", ""]
            + rows
        ),
        "comments": [
            {
                "path": e["path"],
                "line": e["line"],
                "side": e["side"],
                "body": finding_body(e, e["rf"], disclaimer, "released finding"),
            }
            for e in unique
        ],
    }

    Path(args.out).write_text(
        json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )

    # The replies the workflow posts once the threads above exist and have ids. They are
    # kept separate rather than folded into the finding's own comment so a released thread
    # collects the same reply-per-step shape a threaded finding does.
    released = {e["rf"] for e in unique}
    plan = [
        {
            "rf": rf,
            "bodies": [
                finding_note(f["kind"], f["text"], disclaimer)
                for f in sorted(
                    (f for f in follow_ups if f.get("rf") == rf),
                    key=lambda f: FOLLOWUP_KINDS.index(f["kind"])
                    if f.get("kind") in FOLLOWUP_KINDS else len(FOLLOWUP_KINDS),
                )
                if isinstance(f.get("text"), str) and f.get("kind") in FOLLOWUP_KINDS
            ],
        }
        for rf in sorted(released)
    ]
    plan = [entry for entry in plan if entry["bodies"]]
    Path(args.replies_out).write_text(
        json.dumps(plan, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )

    print(f"post-review: {len(unique)} held finding(s) -> {args.out}")
    for e in unique:
        print(f"  RF{e['rf']}  {e['severity']:<6} {e['path']}:{e['line']}")
    replies = sum(len(entry["bodies"]) for entry in plan)
    print(f"post-review: {replies} reply(ies) -> {args.replies_out}")
    missing = sorted(released - {entry["rf"] for entry in plan})
    if missing:
        print(
            "post-review: no follow-up recorded for "
            + ", ".join(f"RF{n}" for n in missing)
            + " - their threads open carrying the finding alone"
        )
    return 0


def highest_id(args: argparse.Namespace) -> int:
    """Print the highest RF id on a pull request, or 0 - what `build --continue-from` wants."""
    bodies = comment_bodies(Path(args.comments)) + review_bodies(Path(args.reviews))
    ids = [rf for body in bodies for rf in rf_ids(body)]
    # A legacy post could put several ids mid-line, and those no longer count. Say so:
    # ignoring one that was a real issued id would reissue it, so a round on an older pull
    # request is told rather than left to find out.
    ignored = sorted({n for body in bodies for n in ignored_bare_ids(body)})
    above = [n for n in ignored if n > max(ids, default=0)]
    if above:
        print(
            "post-review: bare ids not counted, above the answer: "
            + ", ".join(f"RF{n}" for n in above)
            + " - prose if this flow wrote them, an issued id if an older round did",
            file=sys.stderr,
        )
    print(max(ids, default=0))
    return 0


def verify(args: argparse.Namespace) -> int:
    payload = load_json(Path(args.payload), "payload")
    bodies = comment_bodies(Path(args.comments))

    if not isinstance(payload, dict) or not isinstance(payload.get("comments"), list):
        sys.exit("post-review: the payload has no comments array")

    problems: list[str] = []

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

    # A held finding is in no `comments` array, so the loop above cannot see it. Its
    # evidence is the ledger inside the record Review this payload carries: read the ids
    # back out of what was sent and require each to be on the pull request as a review
    # body. An id that reserved nothing is the failure this reconciliation exists to catch.
    held = [e.get("rf") for e in held_entries([payload.get("body") or ""])]
    posted_reviews = review_bodies(Path(args.reviews))
    for rf in held:
        if not any(rf in rf_ids(body) for body in posted_reviews):
            problems.append(
                f"RF{rf} was held for the push and is not in any review body on the pull "
                "request, so its id is reserved nowhere and the next round will reissue it"
            )

    if problems:
        print(f"post-review: {len(problems)} problem(s)", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        return 2

    print(
        f"post-review: all {sent} finding(s) reconciled against the pull request"
        + (f", {len(held)} held id(s) found in the record" if held else "")
    )
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
    b.add_argument(
        "--unpushed-diff",
        help="a `git diff` of the fix commits this round is holding; required on a "
             "re-review and refused on a review pass",
    )
    b.add_argument(
        "--anchored-at",
        help="the head the reviewer read, which a held finding's line is counted "
             "against; required on a re-review and refused on a review pass",
    )
    b.add_argument(
        "--pinned-head",
        help="the sha the reviewer was told to read; required on a review pass and "
             "refused on a re-review",
    )
    b.add_argument(
        "--head-now",
        help="the head the ref holds now, read immediately before this build; required "
             "on a review pass and refused on a re-review",
    )
    b.add_argument("--out", required=True, help="where to write the payload JSON")

    r = sub.add_parser("release", help="post-push: the held ledger back into threads")
    r.add_argument(
        "--reviews",
        required=True,
        help="the pull request's reviews, read with `gh api --paginate`",
    )
    r.add_argument(
        "--comments",
        required=True,
        help="the pull request's inline comments, read with `gh api --paginate`",
    )
    r.add_argument(
        "--disclaimer-file",
        required=True,
        help="file holding the AI disclaimer line; must open with '> 🤖'",
    )
    r.add_argument("--out", required=True, help="where to write the payload JSON")
    r.add_argument(
        "--replies-out",
        required=True,
        help="where to write the replies each released thread owes, for the workflow to "
             "post once the threads exist and have ids",
    )

    f = sub.add_parser("followup", help="record a held finding's plan, result and verdict")
    f.add_argument(
        "--entries",
        required=True,
        help="JSON array of {rf, kind, text}, kind being plan, result or verdict",
    )
    f.add_argument(
        "--disclaimer-file",
        required=True,
        help="file holding the AI disclaimer line; must open with '> 🤖'",
    )
    f.add_argument("--out", required=True, help="where to write the payload JSON")

    v = sub.add_parser("verify", help="reconcile a posted round against the pull request")
    v.add_argument("--payload", required=True, help="the payload that was sent")
    v.add_argument(
        "--comments",
        required=True,
        help="the pull request's inline comments, read with `gh api --paginate`",
    )
    v.add_argument(
        "--reviews",
        required=True,
        help="the pull request's reviews, read with `gh api --paginate`; a held id is "
             "reserved in a review body and nowhere else",
    )

    h = sub.add_parser("highest-id", help="the highest RF id already on the pull request")
    h.add_argument(
        "--comments",
        required=True,
        help="the pull request's inline comments, read with `gh api --paginate`",
    )
    h.add_argument(
        "--reviews",
        required=True,
        help="the pull request's reviews, read with `gh api --paginate`; required because "
             "a held id lives in a review body until its push, and a read that skipped "
             "this surface would reissue it",
    )

    args = parser.parse_args()
    return {
        "build": build, "release": release, "followup": followup,
        "verify": verify, "highest-id": highest_id,
    }[args.mode](args)


if __name__ == "__main__":
    sys.exit(main())
