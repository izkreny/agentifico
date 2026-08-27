#!/usr/bin/env bash
# Regression bench for post-review.py. Run it after any edit to that file.
#
# It exists because a check that has only ever been seen to pass is indistinguishable from
# one that passes on everything. Every case below has been watched refusing, or building,
# on the situation it names - the refusals by feeding the malformed finding the check was
# written for, and the builds by feeding the one it must let through.
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/post-review.py"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

printf '%s\n' '> 🤖 Written by AI --- read/modified by human! 🤓' > "$WORK/disclaimer.txt"
printf '%s\n' 'Written by AI, no emoji prefix' > "$WORK/bad-disclaimer.txt"

python3 - "$SCRIPT" "$WORK" <<'PY'
import copy, json, subprocess, sys
from pathlib import Path

script, work = sys.argv[1], Path(sys.argv[2])
good_disclaimer = work / "disclaimer.txt"
bad_disclaimer = work / "bad-disclaimer.txt"

FINDING = {
    "index": 1,
    "axis": "spec",
    "severity": "high",
    "path": "app/models/group.rb",
    "line": 42,
    "side": "RIGHT",
    "failure_scenario": "A group created with no owner reaches #settle and raises on nil.",
    "finding": "The third acceptance criterion requires an owner at creation; this sets it after save.",
    "needs_owner": False,
}
REVIEW = {"pr": 61, "pass": "review", "axes_run": ["standards", "spec"], "findings": [FINDING]}
RERdefault = {
    "pr": 61,
    "pass": "re-review",
    "verdicts": [{"rf": 3, "closed": True, "why": "The owner is assigned inside the transaction."}],
    "findings": [],
}


def mutate(base, **changes):
    """A copy of base with top-level keys replaced; a key set to None is deleted."""
    out = copy.deepcopy(base)
    for key, value in changes.items():
        if value is None:
            out.pop(key, None)
        else:
            out[key] = value
    return out


def with_finding(base, **changes):
    """A copy of base whose single finding has those fields replaced or deleted."""
    out = copy.deepcopy(base)
    finding = out["findings"][0]
    for key, value in changes.items():
        if value is None:
            finding.pop(key, None)
        else:
            finding[key] = value
    return out


def run_build(data, disclaimer=None, continue_from=0, name="case"):
    findings = work / f"{name}.json"
    findings.write_text(json.dumps(data), encoding="utf-8")
    out = work / f"{name}.payload.json"
    proc = subprocess.run(
        ["python3", script, "build",
         "--findings", str(findings),
         "--disclaimer-file", str(disclaimer or good_disclaimer),
         "--continue-from", str(continue_from),
         "--out", str(out)],
        capture_output=True, text=True)
    return proc, out


def run_verify(payload, comments, name="case"):
    p = work / f"{name}.payload.json"
    c = work / f"{name}.comments.json"
    p.write_text(json.dumps(payload), encoding="utf-8")
    c.write_text(json.dumps(comments), encoding="utf-8")
    return subprocess.run(
        ["python3", script, "verify", "--payload", str(p), "--comments", str(c)],
        capture_output=True, text=True)


MUST_REFUSE = [
    ("severity outside the scale", with_finding(REVIEW, severity="critical"), 0),
    ("severity missing", with_finding(REVIEW, severity=None), 0),
    ("side neither RIGHT nor LEFT", with_finding(REVIEW, side="BOTH"), 0),
    ("axis outside the two", with_finding(REVIEW, axis="performance"), 0),
    ("path missing", with_finding(REVIEW, path=None), 0),
    ("path empty", with_finding(REVIEW, path="   "), 0),
    ("line zero", with_finding(REVIEW, line=0), 0),
    ("line not an integer", with_finding(REVIEW, line="42"), 0),
    ("failure scenario empty", with_finding(REVIEW, failure_scenario="  "), 0),
    ("finding text empty", with_finding(REVIEW, finding=""), 0),
    ("needs_owner missing", with_finding(REVIEW, needs_owner=None), 0),
    ("needs_owner not a boolean", with_finding(REVIEW, needs_owner="no"), 0),
    ("suggestion fence in the finding",
     with_finding(REVIEW, finding="Use this instead:\n```suggestion\nx = 1\n```"), 0),
    ("suggestion fence in the failure scenario",
     with_finding(REVIEW, failure_scenario="```suggestion\nx = 1\n```"), 0),
    ("local indices have a gap",
     mutate(REVIEW, findings=[FINDING, {**copy.deepcopy(FINDING), "index": 3}]), 0),
    ("local indices repeat",
     mutate(REVIEW, findings=[FINDING, copy.deepcopy(FINDING)]), 0),
    ("pass is not a known pass", mutate(REVIEW, **{"pass": "audit"}), 0),
    ("review pass with empty axes_run", mutate(REVIEW, axes_run=[]), 0),
    ("review pass with axes_run missing", mutate(REVIEW, axes_run=None), 0),
    ("axes_run holds something that is not an axis", mutate(REVIEW, axes_run=["vibes"]), 0),
    ("re-review with no verdicts", mutate(RERdefault, verdicts=[]), 0),
    ("verdict with an empty why", mutate(RERdefault, verdicts=[{"rf": 3, "closed": True, "why": " "}]), 0),
    ("verdict closed not a boolean", mutate(RERdefault, verdicts=[{"rf": 3, "closed": "yes", "why": "x"}]), 0),
    ("verdict rf not a positive integer", mutate(RERdefault, verdicts=[{"rf": 0, "closed": True, "why": "x"}]), 0),
]

MUST_BUILD = [
    ("one valid finding", REVIEW, 0, ["RF1"]),
    ("continues from the highest id on the pull request", REVIEW, 7, ["RF8"]),
    ("zero findings still builds the record", mutate(REVIEW, findings=[]), 0, ["no findings"]),
    ("re-review with verdicts and no new defect", RERdefault, 3, ["no findings"]),
    ("re-review with a new defect",
     mutate(RERdefault, findings=[FINDING]), 3, ["RF4"]),
]

fails = 0

print("must refuse (exit 2):")
for name, data, continue_from in MUST_REFUSE:
    slug = "".join(c if c.isalnum() else "-" for c in name)
    proc, out = run_build(data, continue_from=continue_from, name=slug)
    ok = proc.returncode == 2 and not out.exists()
    fails += not ok
    detail = "" if ok else f"  (exit {proc.returncode}, payload written: {out.exists()})"
    print(f"  {'ok  ' if ok else 'FAIL'} {name}{detail}")

print("\nmust refuse on the disclaimer (exit 2):")
proc, out = run_build(REVIEW, disclaimer=bad_disclaimer, name="bad-disclaimer-case")
ok = proc.returncode == 2 and not out.exists()
fails += not ok
print(f"  {'ok  ' if ok else 'FAIL'} disclaimer without the emoji prefix")

proc, out = run_build(REVIEW, continue_from=-1, name="negative-continue")
ok = proc.returncode == 2 and not out.exists()
fails += not ok
print(f"  {'ok  ' if ok else 'FAIL'} negative --continue-from")

print("\nmust build (exit 0):")
for name, data, continue_from, wants in MUST_BUILD:
    slug = "".join(c if c.isalnum() else "-" for c in name)
    proc, out = run_build(data, continue_from=continue_from, name=slug)
    ok = proc.returncode == 0 and out.exists()
    if ok:
        payload = json.loads(out.read_text(encoding="utf-8"))
        blob = proc.stdout + json.dumps(payload)
        missing = [w for w in wants if w not in blob]
        ok = not missing
        if payload["comments"] and not payload["comments"][0]["body"].startswith("> 🤖"):
            ok = False
    fails += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} {name}")

print("\nverify must refuse (exit 2):")
payload = {"comments": [{"path": "a.rb", "line": 1, "side": "RIGHT", "body": "RF1 x"},
                        {"path": "b.rb", "line": 2, "side": "RIGHT", "body": "RF2 x"}]}
cases = [
    ("an anchor that never landed",
     [{"path": "a.rb", "line": 1, "body": "> 🤖 h\n\nRF1 x"},
      {"path": "zzz.rb", "line": 9, "body": "> 🤖 h\n\nRF2 x"}]),
    ("a listing read without --paginate, so a slice",
     [{"path": "a.rb", "line": 1, "body": "> 🤖 h\n\nRF1 x"}]),
]
for name, comments in cases:
    proc = run_verify(payload, comments, name="".join(c if c.isalnum() else "-" for c in name))
    ok = proc.returncode == 2
    fails += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} {name}  (exit {proc.returncode})")

print("\nverify must pass (exit 0):")
proc = run_verify(payload, [{"path": "a.rb", "line": 1, "body": "> 🤖 h\n\nRF1 x"},
                            {"path": "b.rb", "line": 2, "body": "> 🤖 h\n\nRF2 x"}], name="verify-clean")
ok = proc.returncode == 0
fails += not ok
print(f"  {'ok  ' if ok else 'FAIL'} every anchor reconciled  (exit {proc.returncode})")

print(f"\n{fails} failure(s)")
sys.exit(1 if fails else 0)
PY
