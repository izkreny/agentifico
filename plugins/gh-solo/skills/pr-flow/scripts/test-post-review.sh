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


# A `git diff -U0` of one unpushed fix commit. `app/models/group.rb` is FINDING's own
# path, so a re-review handed this diff holds that finding; the OTHER_DIFF touches a file
# no finding names, so the same finding is threaded instead.
GROUP_DIFF = """diff --git a/app/models/group.rb b/app/models/group.rb
index 1111111..2222222 100644
--- a/app/models/group.rb
+++ b/app/models/group.rb
@@ -42,0 +43 @@ class Group
+  validates :owner, presence: true
"""
OTHER_DIFF = """diff --git a/README.md b/README.md
index 3333333..4444444 100644
--- a/README.md
+++ b/README.md
@@ -1,0 +2 @@
+a line
"""
SHAPELESS_DIFF = "these are notes about a diff, not a diff\n"
# Real `git diff -U0` output for the three shapes git emits with no ---/+++ pair at all.
# Taken from actual ranges rather than written by hand: a reader that required that pair
# refused each of these as malformed and took the whole re-review down with it.
RENAME_DIFF = """diff --git a/app/models/group.rb b/app/models/team.rb
similarity index 100%
rename from app/models/group.rb
rename to app/models/team.rb
"""
MODE_DIFF = """diff --git a/scripts/run.sh b/scripts/run.sh
old mode 100644
new mode 100755
"""
BINARY_DIFF = """diff --git a/app/models/group.rb b/app/models/group.rb
new file mode 100644
index 0000000..1111111
Binary files /dev/null and b/app/models/group.rb differ
"""


def run_build(data, disclaimer=None, continue_from=0, name="case", diff=None,
              anchored_at="__auto__"):
    findings = work / f"{name}.json"
    findings.write_text(json.dumps(data), encoding="utf-8")
    out = work / f"{name}.payload.json"
    cmd = ["python3", script, "build",
           "--findings", str(findings),
           "--disclaimer-file", str(disclaimer or good_disclaimer),
           "--continue-from", str(continue_from),
           "--out", str(out)]
    if diff is not None:
        d = work / f"{name}.diff"
        d.write_text(diff, encoding="utf-8")
        cmd += ["--unpushed-diff", str(d)]
    if anchored_at == "__auto__":
        anchored_at = "1bb80f6" if data.get("pass") == "re-review" else None
    if anchored_at is not None:
        cmd += ["--anchored-at", anchored_at]
    return subprocess.run(cmd, capture_output=True, text=True), out


def run_highest(comments, reviews=None, name="case"):
    c = work / f"{name}.comments.json"
    r = work / f"{name}.reviews.json"
    c.write_text(json.dumps(comments), encoding="utf-8")
    r.write_text(json.dumps(reviews if reviews is not None else []), encoding="utf-8")
    return subprocess.run(
        ["python3", script, "highest-id", "--comments", str(c), "--reviews", str(r)],
        capture_output=True, text=True)


def run_verify(payload, comments, reviews=None, name="case"):
    p = work / f"{name}.payload.json"
    c = work / f"{name}.comments.json"
    r = work / f"{name}.reviews.json"
    p.write_text(json.dumps(payload), encoding="utf-8")
    c.write_text(json.dumps(comments), encoding="utf-8")
    r.write_text(json.dumps(reviews if reviews is not None else []), encoding="utf-8")
    return subprocess.run(
        ["python3", script, "verify", "--payload", str(p),
         "--comments", str(c), "--reviews", str(r)],
        capture_output=True, text=True)


def run_release(reviews, comments, disclaimer=None, name="case", cwd=None):
    r = work / f"{name}.reviews.json"
    c = work / f"{name}.comments.json"
    out = work / f"{name}.release.json"
    r.write_text(json.dumps(reviews), encoding="utf-8")
    c.write_text(json.dumps(comments), encoding="utf-8")
    proc = subprocess.run(
        ["python3", script, "release",
         "--reviews", str(r), "--comments", str(c),
         "--disclaimer-file", str(disclaimer or good_disclaimer),
         "--out", str(out)],
        capture_output=True, text=True, cwd=cwd)
    return proc, out


def git_fixture(name, first_lines, second_lines):
    """A throwaway repository whose two commits move the lines of one file.

    `release` brings a held finding's line forward with `git diff <at>..HEAD`, so the only
    honest bench for it is a real range. Returns the directory and the first commit's sha,
    which is the `at` a ledger entry would carry.
    """
    repo = work / f"repo-{name}"
    (repo / "app" / "models").mkdir(parents=True)
    target = repo / "app" / "models" / "group.rb"
    env = {"GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null",
           "GIT_AUTHOR_NAME": "b", "GIT_AUTHOR_EMAIL": "b@b",
           "GIT_COMMITTER_NAME": "b", "GIT_COMMITTER_EMAIL": "b@b", "PATH": "/usr/bin:/bin"}

    def git(*args):
        subprocess.run(["git", *args], cwd=repo, env=env, check=True,
                       capture_output=True, text=True)

    git("init", "-q", "-b", "main")
    target.write_text("\n".join(first_lines) + "\n", encoding="utf-8")
    git("add", "-A"); git("commit", "-q", "-m", "first")
    at = subprocess.run(["git", "rev-parse", "HEAD"], cwd=repo, env=env,
                        capture_output=True, text=True).stdout.strip()
    target.write_text("\n".join(second_lines) + "\n", encoding="utf-8")
    git("add", "-A"); git("commit", "-q", "-m", "second")
    return repo, at


BASE = [f"line {n}" for n in range(1, 61)]


# The repository the generic release cases run in: its second commit appends below every
# line, so nothing shifts and each case tests what it says it tests rather than the
# arithmetic. The shift itself has its own fixtures further down.
SHARED_REPO, SHARED_AT = None, "0000000"


def ledger_review(*entries):
    """A submitted review shaped like the one record_body writes: a row per finding, whose
    `RF{n}` is what highest-id reads, and the fenced ledger release reads back."""
    block = json.dumps({"gh_solo_held": list(entries)}, ensure_ascii=False, indent=1)
    rows = "\n".join(
        f"- RF{e.get('rf')} \U0001f534 high {e.get('path')}:{e.get('line')}"
        " - no thread yet, held for the push"
        for e in entries
    )
    return {"body": "> \U0001f916 h\n\nScoped re-review.\n\n" + rows
                    + "\n\n```json\n" + block + "\n```"}


def held_entry(rf=7, at=None, **changes):
    entry = {**copy.deepcopy(FINDING), "rf": rf, "at": at or SHARED_AT}
    for key, value in changes.items():
        if value is None:
            entry.pop(key, None)
        else:
            entry[key] = value
    return entry


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

# Each row is (name, findings file, --continue-from, strings the run must produce, diff).
# The diff is None for a review pass, which refuses the argument outright.
MUST_BUILD = [
    ("one valid finding", REVIEW, 0, ["RF1", "round record"], None),
    # An appointed command supplies no level, so the orchestrator derives one and has
    # to say so. Without both fields this fixture exercised a round claiming the
    # reviewer assigned `unrated` itself, which no legitimate producer can emit.
    ("an unrated finding from an appointed command",
     mutate(REVIEW, axes_run=["unrated"], findings=[UNRATED],
            severity_source="derived",
            severity_basis="unrated throughout: the appointed command supplies no level"),
     0, ["RF1", "\u26aa", "arrived unrated", "round record"], None),
    ("continues from the highest id on the pull request", REVIEW, 7, ["RF8"], None),
    ("zero findings still builds the record", mutate(REVIEW, findings=[]), 0,
     ["no findings"], None),
    ("re-review with verdicts and no new defect", RERdefault, 3,
     ["no findings", "re-review record"], GROUP_DIFF),
    # The finding's file is untouched by the unpushed commits, so GitHub can anchor it and
    # it becomes a thread exactly as a full pass's finding does.
    ("re-review whose new defect is on a file the fixes did not touch",
     mutate(RERdefault, findings=[FINDING]), 3, ["RF4", "1 new finding(s) threaded, 0 held"],
     OTHER_DIFF),
    ("re-review with no unpushed commits at all holds nothing",
     mutate(RERdefault, findings=[FINDING]), 3, ["RF4", "0 held"], ""),
    ("a rename-only range still names its files",
     mutate(RERdefault, findings=[FINDING]), 3, ["RF4", "1 held"], RENAME_DIFF),
    ("a mode-only range holds nothing and refuses nothing",
     mutate(RERdefault, findings=[FINDING]), 3, ["RF4", "0 held"], MODE_DIFF),
    ("a binary-only range still names its file",
     mutate(RERdefault, findings=[FINDING]), 3, ["RF4", "1 held"], BINARY_DIFF),
    ("derived severities with a basis, which the record must publish",
     mutate(REVIEW, severity_source="derived",
            severity_basis="high where the branch does not do what the PR body claims"),
     0, ["The severity basis", "does not do what the PR body claims"], None),
    # The issue's own case. The finding points at a line only the unpushed fix commits
    # carry, so it gets its id, stays out of the `comments` array - which is what stops the
    # atomic call answering 422 - and travels whole in the record's ledger instead.
    ("re-review whose new defect is on a file the fixes touched",
     mutate(RERdefault, findings=[FINDING]), 3,
     ["RF4", "HELD", "0 new finding(s) threaded, 1 held", "gh_solo_held",
      "Held for the push", FINDING["failure_scenario"]],
     GROUP_DIFF),
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

print("\nmust refuse on the unpushed diff (exit 2):")
# The argument belongs to the rescope entrance alone, in both directions. Given on a full
# pass it claims held lines a pass over the pushed head cannot have; missing on a re-review
# it leaves nothing able to tell an anchorable finding from one only the fixes carry, which
# is the state that answered 422 on #6 and on izkreny/groupifico#210.
cases = [
    ("--unpushed-diff on a review pass", REVIEW, GROUP_DIFF),
    ("--unpushed-diff missing on a re-review", mutate(RERdefault, findings=[FINDING]), None),
    ("a diff with content but no file header",
     mutate(RERdefault, findings=[FINDING]), SHAPELESS_DIFF),
]
for name, data, diff in cases:
    slug = "ud-" + "".join(c if c.isalnum() else "-" for c in name)
    proc, out = run_build(data, continue_from=3, name=slug, diff=diff)
    ok = proc.returncode == 2 and not out.exists()
    fails += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} {name}  (exit {proc.returncode})")

print("\nmust refuse on the anchor head (exit 2):")
# Without it a held finding's line cannot be brought forward to the pushed head, so the
# release would replay a number counted before the round's later commits landed.
cases = [
    ("--anchored-at on a review pass", REVIEW, None, "1bb80f6"),
    ("--anchored-at missing on a re-review",
     mutate(RERdefault, findings=[FINDING]), GROUP_DIFF, None),
    ("--anchored-at that is not a sha",
     mutate(RERdefault, findings=[FINDING]), GROUP_DIFF, "the-head"),
]
for name, data, diff, at in cases:
    slug = "aa-" + "".join(c if c.isalnum() else "-" for c in name)
    proc, out = run_build(data, continue_from=3, name=slug, diff=diff, anchored_at=at)
    ok = proc.returncode == 2 and not out.exists()
    fails += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} {name}  (exit {proc.returncode})")

print("\nmust build (exit 0):")
for name, data, continue_from, wants, diff in MUST_BUILD:
    slug = "".join(c if c.isalnum() else "-" for c in name)
    proc, out = run_build(data, continue_from=continue_from, name=slug, diff=diff)
    ok = proc.returncode == 0 and out.exists()
    if ok:
        payload = json.loads(out.read_text(encoding="utf-8"))
        blob = proc.stdout + json.dumps(payload, ensure_ascii=False)
        missing = [w for w in wants if w not in blob]
        ok = not missing
        if payload["comments"] and not payload["comments"][0]["body"].startswith("> 🤖"):
            ok = False
        # A held finding must be in the record and nowhere in the comments array; that
        # absence is the whole fix, so it is asserted rather than left to the wants list.
        if "HELD" in proc.stdout and payload["comments"]:
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

# A held finding is in no comments array, so the loop over the payload cannot see it. Its
# only evidence is the ledger in the record Review, and an id reserved nowhere is an id the
# next round hands to a different finding.
held_payload = {
    "body": ("> \U0001f916 h\n\nScoped re-review.\n\n```json\n"
             + json.dumps({"gh_solo_held": [held_entry(7)]}, ensure_ascii=False, indent=1)
             + "\n```"),
    "comments": [],
}
proc = run_verify(held_payload, [], [], name="verify-held-missing")
ok = proc.returncode == 2
fails += not ok
print(f"  {'ok  ' if ok else 'FAIL'} a held id in no review body on the pull request  (exit {proc.returncode})")

print("\nverify must pass (exit 0):")
proc = run_verify(payload, [{"path": "a.rb", "line": 1, "body": "> 🤖 h\n\nRF1 x"},
                            {"path": "b.rb", "line": 2, "body": "> 🤖 h\n\nRF2 x"}], name="verify-clean")
ok = proc.returncode == 0
fails += not ok
print(f"  {'ok  ' if ok else 'FAIL'} every anchor reconciled  (exit {proc.returncode})")

proc = run_verify(held_payload, [], [ledger_review(held_entry(7))], name="verify-held-found")
ok = proc.returncode == 0 and "1 held id(s)" in proc.stdout
fails += not ok
print(f"  {'ok  ' if ok else 'FAIL'} a held id reserved in the record  (exit {proc.returncode})")

SHARED_REPO, SHARED_AT = git_fixture("shared", BASE, BASE + ["appended"])

print("\nrelease must build (exit 0):")
# The other half of the fix: after rnp's push the held line is ordinary, so the ledger in
# the record Review is read back and each entry becomes the thread it was standing in for,
# under the id it was reserved with rather than a fresh one.
proc, out = run_release([ledger_review(held_entry(7))], [], name="release-one",
                        cwd=str(SHARED_REPO))
ok = proc.returncode == 0 and out.exists()
if ok:
    payload = json.loads(out.read_text(encoding="utf-8"))
    ok = (len(payload["comments"]) == 1
          and "RF7" in payload["comments"][0]["body"]
          and payload["comments"][0]["path"] == FINDING["path"]
          and payload["comments"][0]["line"] == FINDING["line"]
          and FINDING["failure_scenario"] in payload["comments"][0]["body"]
          and payload["comments"][0]["body"].startswith("> \U0001f916")
          and payload.get("event") == "COMMENT")
fails += not ok
print(f"  {'ok  ' if ok else 'FAIL'} a held finding round-trips into a thread under its own id")

# The second-round hole. Nothing rewrites a posted Review, so round one's ledger still
# lists RF7 when round two's rnp runs. Refusing on it would break every round after the
# first; posting it again would duplicate the thread.
proc, out = run_release(
    [ledger_review(held_entry(7)), ledger_review(held_entry(9))],
    [{"body": "> \U0001f916 h\n\nRF7 already a thread"}], name="release-skip",
    cwd=str(SHARED_REPO))
ok = (proc.returncode == 0 and out.exists() and "RF7" in proc.stdout
      and "already threaded" in proc.stdout)
if ok:
    payload = json.loads(out.read_text(encoding="utf-8"))
    ok = len(payload["comments"]) == 1 and "RF9" in payload["comments"][0]["body"]
fails += not ok
print(f"  {'ok  ' if ok else 'FAIL'} an id already carrying a thread is skipped, not reposted")

# Nothing held is the ordinary answer on most rounds, and it must not look like a failure
# or leave a payload for the workflow to post.
for name, reviews in [("no reviews at all", []),
                      ("reviews with no ledger", [{"body": "> \U0001f916 h\n\nRound one."}]),
                      ("every held id already threaded",
                       [ledger_review(held_entry(7))])]:
    comments = ([{"body": "RF7 x"}] if name == "every held id already threaded" else [])
    proc, out = run_release(reviews, comments, cwd=str(SHARED_REPO),
                            name="rn-" + "".join(c if c.isalnum() else "-" for c in name))
    ok = proc.returncode == 0 and not out.exists() and "nothing to release" in proc.stdout
    fails += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} nothing to release: {name}  (exit {proc.returncode})")

# The ids travel in prose all over this flow: a fix plan, a fix result and a re-review
# verdict each name the ids they cover. Counting any mention as a posted thread dropped the
# held finding silently, at exit 0, with no gate downstream able to see it.
proc, out = run_release(
    [ledger_review(held_entry(9))],
    [{"body": "> \U0001f916 h\n\nvia `implement` fix, closing reply\n\n"
              "fix: tighten the guard - closes RF6, and this commit also closes RF9"}],
    name="release-crossref", cwd=str(SHARED_REPO))
ok = proc.returncode == 0 and out.exists() and "already threaded" not in proc.stdout
if ok:
    payload = json.loads(out.read_text(encoding="utf-8"))
    ok = len(payload["comments"]) == 1 and "RF9" in payload["comments"][0]["body"]
fails += not ok
print(f"  {'ok  ' if ok else 'FAIL'} a prose cross-reference does not count as a thread")

# RF8: the stored line counts lines as they stood when the reviewer read them, and the
# round keeps committing between the hold and the push. Replaying that number anchored the
# thread to whatever now sat there - and where the shift moved it out of the diff, every
# later rnp on the pull request failed its release the same way.
repo, at = git_fixture("shift", BASE, ["new a", "new b", "new c", "new d", "new e", "new f"] + BASE)
proc, out = run_release([ledger_review(held_entry(9, at=at, line=42))], [],
                        name="release-shift", cwd=str(repo))
ok = proc.returncode == 0 and out.exists() and "moved" in proc.stdout
if ok:
    payload = json.loads(out.read_text(encoding="utf-8"))
    ok = len(payload["comments"]) == 1 and payload["comments"][0]["line"] == 48
fails += not ok
print(f"  {'ok  ' if ok else 'FAIL'} a held line six insertions above it releases at 48, not 42"
      f"  (got {json.loads(out.read_text())['comments'][0]['line'] if out.exists() and json.loads(out.read_text())['comments'] else '-'})")

# Nothing before the finding moved, so the number is already right and nothing is reported.
repo, at = git_fixture("tail", BASE, BASE + ["appended"])
proc, out = run_release([ledger_review(held_entry(9, at=at, line=42))], [],
                        name="release-noshift", cwd=str(repo))
ok = proc.returncode == 0 and out.exists() and "moved" not in proc.stdout
if ok:
    ok = json.loads(out.read_text(encoding="utf-8"))["comments"][0]["line"] == 42
fails += not ok
print(f"  {'ok  ' if ok else 'FAIL'} a change below the finding leaves its line alone")

# A ledger `path` is repo-relative while a git pathspec is relative to the working
# directory, so from a subdirectory git matched nothing and answered empty at exit 0 -
# indistinguishable from "unchanged", and the stale line went out silently.
repo, at = git_fixture("subdir", BASE, ["new a", "new b", "new c", "new d", "new e", "new f"] + BASE)
proc, out = run_release([ledger_review(held_entry(9, at=at, line=42))], [],
                        name="release-subdir", cwd=str(repo / "app" / "models"))
ok = proc.returncode == 0 and out.exists()
if ok:
    ok = json.loads(out.read_text(encoding="utf-8"))["comments"][0]["line"] == 48
fails += not ok
print(f"  {'ok  ' if ok else 'FAIL'} run from a subdirectory, the line still moves to 48")

print("\nrelease must skip rather than guess (exit 0, nothing written):")
# The one case with no answer: the fixes rewrote the very line the finding points at, so
# no number can be brought forward and a named gap beats a thread on the wrong statement.
rewritten = list(BASE); rewritten[41] = "rewritten entirely"
repo, at = git_fixture("rewrite", BASE, rewritten)
proc, out = run_release([ledger_review(held_entry(9, at=at, line=42))], [],
                        name="release-rewritten", cwd=str(repo))
ok = (proc.returncode == 0 and not out.exists()
      and "cannot be brought forward" in proc.stdout and "RF9" in proc.stdout)
fails += not ok
print(f"  {'ok  ' if ok else 'FAIL'} the fixes rewrote the line the finding points at")

# An `at` no longer in the repository - a fresh clone, a rewritten branch - is reported
# rather than treated as "no change", which would replay the stale number silently.
repo, _ = git_fixture("unknown", BASE, BASE + ["appended"])
proc, out = run_release([ledger_review(held_entry(9, at="deadbee", line=42))], [],
                        name="release-unknown-at", cwd=str(repo))
ok = proc.returncode == 0 and not out.exists() and "could not diff" in proc.stdout
fails += not ok
print(f"  {'ok  ' if ok else 'FAIL'} an anchor head git does not have")

print("\nrelease must refuse (exit 2):")
cases = [
    # A thread needs the finding text and the failure scenario, so a ledger entry that
    # lost one cannot become a thread and must not half-post.
    ("a ledger entry missing its finding text",
     [ledger_review(held_entry(7, finding=None))], []),
    ("a ledger entry missing its anchor", [ledger_review(held_entry(7, line=None))], []),
    ("a ledger entry with no id", [ledger_review({k: FINDING[k] for k in FINDING})], []),
    # Two ledgers naming one id means highest-id reissued it, which is the invariant the
    # widened read exists to keep. Posting both threads would hide that it broke.
    ("one id held twice", [ledger_review(held_entry(7)), ledger_review(held_entry(7))], []),
]
for name, reviews, comments in cases:
    proc, out = run_release(reviews, comments,
                            name="rr-" + "".join(c if c.isalnum() else "-" for c in name))
    ok = proc.returncode == 2 and not out.exists()
    fails += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} {name}  (exit {proc.returncode})")

proc, out = run_release([ledger_review(held_entry(7))], [],
                        disclaimer=bad_disclaimer, name="release-bad-disclaimer")
ok = proc.returncode == 2 and not out.exists()
fails += not ok
print(f"  {'ok  ' if ok else 'FAIL'} disclaimer without the emoji prefix  (exit {proc.returncode})")

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

# The surface a held id lives on until its push. Read from the comments alone these answer
# 0 or too low, and the next round reissues an id that is already reserved - which is what
# made withholding the id the only honest option before this.
cases = [
    ("a held id in a review body and no threads at all", [], [ledger_review(held_entry(7))], "7"),
    ("a review body's id above every threaded one",
     [{"body": "RF2 x"}], [ledger_review(held_entry(5))], "5"),
    ("a threaded id above every held one",
     [{"body": "RF9 x"}], [ledger_review(held_entry(5))], "9"),
    ("a review body that is not a ledger still counts its ids",
     [], [{"body": "> \U0001f916 h\n\n- RF4 \U0001f7e1 medium a.rb:1"}], "4"),
    ("reviews with empty bodies", [{"body": "RF1 x"}], [{"body": ""}], "1"),
]
for name, comments, reviews, want in cases:
    proc = run_highest(comments, reviews,
                       name="hir2-" + "".join(c if c.isalnum() else "-" for c in name))
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
    print(f"  {'ok  ' if ok else 'FAIL'} comments: {name}  (exit {proc.returncode})")

# The same wrong shape on the new surface, refused for the same reason: found empty it
# would answer as though no id had ever been reserved, which is indistinguishable from a
# pull request that has had no round.
for name, reviews in [("an object rather than an array", {"body": "RF3 x"}),
                      ("the array-of-arrays --slurp writes", [[{"body": "RF3 x"}]])]:
    proc = run_highest([], reviews,
                       name="hirr-" + "".join(c if c.isalnum() else "-" for c in name))
    ok = proc.returncode == 1
    fails += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} reviews: {name}  (exit {proc.returncode})")

print(f"\n{fails} failure(s)")
sys.exit(1 if fails else 0)
PY
