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


def run_highest(comments, name="case"):
    c = work / f"{name}.comments.json"
    c.write_text(json.dumps(comments), encoding="utf-8")
    return subprocess.run(
        ["python3", script, "highest-id", "--comments", str(c)],
        capture_output=True, text=True)


def run_verify(payload, comments, name="case"):
    p = work / f"{name}.payload.json"
    c = work / f"{name}.comments.json"
    p.write_text(json.dumps(payload), encoding="utf-8")
    c.write_text(json.dumps(comments), encoding="utf-8")
    return subprocess.run(
        ["python3", script, "verify", "--payload", str(p), "--comments", str(c)],
        capture_output=True, text=True)


UNRATED = {**FINDING, "severity": "unrated", "axis": "unrated"}

MUST_REFUSE = [
    ("severity outside the scale", with_finding(REVIEW, severity="critical"), 0),
    ("severity spelled unranked rather than unrated", with_finding(REVIEW, severity="unranked"), 0),
    ("severity_source outside the two", mutate(REVIEW, severity_source="guessed"), 0),
    ("derived severities with no basis stated",
     mutate(REVIEW, severity_source="derived"), 0),
    ("derived severities with a blank basis",
     mutate(REVIEW, severity_source="derived", severity_basis="   "), 0),
    ("a basis stated while the reviewer assigned the levels",
     mutate(REVIEW, severity_basis="read from the finding text"), 0),
    ("severity missing", with_finding(REVIEW, severity=None), 0),
    ("side neither RIGHT nor LEFT", with_finding(REVIEW, side="BOTH"), 0),
    ("axis outside the set", with_finding(REVIEW, axis="performance"), 0),
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
    # A level the reviewer never gave, published as the reviewer's. This is the
    # "makes a derivation it does not state" half of the rule in
    # references/review-protocol.md, which the script did not enforce.
    ("unrated severity while severity_source is reviewer",
     mutate(REVIEW, axes_run=["unrated"], findings=[UNRATED]), 0),
]

MUST_BUILD = [
    ("one valid finding", REVIEW, 0, ["RF1", "round record"]),
    # An appointed command supplies no level, so the orchestrator derives one and has
    # to say so. Without both fields this fixture exercised a round claiming the
    # reviewer assigned `unrated` itself, which no legitimate producer can emit.
    ("an unrated finding from an appointed command",
     mutate(REVIEW, axes_run=["unrated"], findings=[UNRATED],
            severity_source="derived",
            severity_basis="unrated throughout: the appointed command supplies no level"),
     0, ["RF1", "\u26aa", "arrived unrated", "round record"]),
    ("continues from the highest id on the pull request", REVIEW, 7, ["RF8"]),
    ("zero findings still builds the record", mutate(REVIEW, findings=[]), 0, ["no findings"]),
    ("re-review with verdicts and no new defect", RERdefault, 3, ["no findings", "re-review record"]),
    ("re-review with a new defect",
     mutate(RERdefault, findings=[FINDING]), 3, ["RF4"]),
    ("derived severities with a basis, which the record must publish",
     mutate(REVIEW, severity_source="derived",
            severity_basis="high where the branch does not do what the PR body claims"),
     0, ["The severity basis", "does not do what the PR body claims"]),
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
        blob = proc.stdout + json.dumps(payload, ensure_ascii=False)
        missing = [w for w in wants if w not in blob]
        ok = not missing
        if payload["comments"] and not payload["comments"][0]["body"].startswith("> 🤖"):
            ok = False
        # A round records; it never approves. Nothing asserted this.
        if payload.get("event") != "COMMENT":
            ok = False
    fails += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} {name}")

print("\nverify must refuse (exit 2):")
payload = {"comments": [{"path": "a.rb", "line": 1, "side": "RIGHT", "body": "RF1 x"},
                        {"path": "b.rb", "line": 2, "side": "RIGHT", "body": "RF2 x"}]}
cases = [
    ("a finding that never landed",
     [{"path": "a.rb", "line": 1, "body": "> 🤖 h\n\nRF1 x"},
      {"path": "zzz.rb", "line": 9, "body": "> 🤖 h\n\nRF9 x"}]),
    ("a listing read without --paginate, so a slice",
     [{"path": "a.rb", "line": 1, "body": "> 🤖 h\n\nRF1 x"}]),
    # The second-round hole. An earlier round left RF7 and RF8 on the very lines this round
    # posted to, and this round's RF1 and RF2 never landed. A path:line check passes here,
    # and so does any check that only counts RF-marked threads: there are two of each.
    ("a later round missing, with an earlier round on the same lines",
     [{"path": "a.rb", "line": 1, "body": "> 🤖 h\n\nRF7 old"},
      {"path": "b.rb", "line": 2, "body": "> 🤖 h\n\nRF8 old"}]),
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

print("\nhighest-id must print (exit 0):")
# The number these produce is what `build --continue-from` takes, so a wrong answer here
# reissues an id that is already on the pull request. Ids never restart.
cases = [
    ("an empty listing, a pull request with no comments at all", [], "0"),
    ("comments carrying no id, a plan discussion before any round",
     [{"body": "> 🤖 h\n\nthis line reads oddly"}], "0"),
    ("one round", [{"body": "> 🤖 h\n\nRF1 x"}, {"body": "> 🤖 h\n\nRF2 x"}], "2"),
    # The listing comes back in creation order, not id order, and a reply can be older than
    # the finding above it. A reader that took the last id rather than the maximum passes
    # every case above and fails this one.
    ("ids out of order", [{"body": "RF9 x"}, {"body": "RF3 x"}, {"body": "RF7 x"}], "9"),
    # One body, several ids: a re-review verdict can answer about more than one finding, and
    # a single `re.search` reads only the first, so it would print 4 here.
    ("several ids in one body", [{"body": "RF4 and RF11 both close"}], "11"),
    ("a bare RF with no number", [{"body": "the RF ids restart"}], "0"),
    # The word boundary earns its place here. Without it PERF123 reads as RF123 and the next
    # round starts at 124, skipping every id in between and making the sequence unreadable.
    ("PERF123 is not an id", [{"body": "PERF123 regressed"}, {"body": "RF2 x"}], "2"),
    ("a comment with no body field at all", [{"path": "a.rb", "line": 1}], "0"),
]
for name, comments, want in cases:
    proc = run_highest(comments, name="hi-" + "".join(c if c.isalnum() else "-" for c in name))
    got = proc.stdout.strip()
    ok = proc.returncode == 0 and got == want
    fails += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} {name}  (want {want}, got {got or '-'}, exit {proc.returncode})")

print("\nhighest-id must refuse (exit 1):")
# The listing is the flat array `gh api --paginate` writes. Handed the array-of-arrays that
# `--paginate --slurp` writes instead, every element is a list and no body is found, so the
# answer would be a silent 0 - the one wrong answer that looks like a first round.
cases = [
    ("an object rather than an array", {"body": "RF3 x"}),
    ("the array-of-arrays --slurp writes", [[{"body": "RF3 x"}]]),
]
for name, comments in cases:
    proc = run_highest(comments, name="hir-" + "".join(c if c.isalnum() else "-" for c in name))
    ok = proc.returncode == 1
    fails += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} {name}  (exit {proc.returncode})")

print(f"\n{fails} failure(s)")
sys.exit(1 if fails else 0)
PY
