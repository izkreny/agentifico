#!/usr/bin/env bash
# Every case was watched failing on a deliberately broken disclaimer filter first, because without that filter the flow answers itself forever and no reader would spot it in a poll loop's output.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"

python3 - "$HERE/watch.py" <<'PY'
import importlib.util, sys

spec = importlib.util.spec_from_file_location("watch", sys.argv[1])
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)

fails = 0

def check(name, got, want):
    global fails
    ok = got == want
    fails += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} {name}: {got!r}" + ("" if ok else f" want {want!r}"))

print("the disclaimer filter:")
# The prefix is the whole of what the gates test, so it is tested literally here too.
check("an agent post is ours", w.mine("> \U0001F916 Written by AI --- read/modified by human! \U0001F913\n\nvia x"), True)
check("the prefix alone is ours", w.mine("> \U0001F916"), True)
check("the owner's plain reply is not", w.mine("looks right to me"), False)
check("a quote that is not the prefix is not", w.mine("> not a robot"), False)
check("an emoji later in the line is not", w.mine("I think \U0001F916 wrote this"), False)
check("empty body is not", w.mine(""), False)
check("a missing body is not", w.mine(None), False)
# The gates test startswith, so a looser test here would silently drop the owner quoting an agent.
check("the prefix quoted mid-body is not ours", w.mine("as you said:\n> \U0001F916 Written by AI"), False)

print("\nbody flattening, so one comment is one line:")
check("newlines collapse", w.one_line("a\nb\nc"), "a b c")
check("runs of space collapse", w.one_line("a     b"), "a b")
check("it truncates", w.one_line("x" * 200), "x" * 140)
check("empty survives", w.one_line(""), "")
check("None survives", w.one_line(None), "")

print("\nthe boundary second is admitted, and the key dedupes the repeat:")
# `since` is stamped before the requests, so a record posted later in that same second carries its timestamp and would be skipped for good by a strict comparison.
SINCE = "2026-10-02T10:00:00Z"
real_gh_json = w.gh_json
w.gh_json = lambda *a, **k: [{"id": 5, "submitted_at": SINCE, "body": "fine by me",
                              "state": "COMMENTED", "user": {"login": "o"}}]
got = w.review_bodies(1, SINCE)
check("a review stamped at since emits", [k for k, _ in got], ["5@" + SINCE])
w.gh_json = lambda *a, **k: {"data": {"repository": {"pullRequest": {"reviewThreads": {"nodes": [
    {"path": "a.py", "line": 3, "comments": {"nodes": [{"databaseId": 9, "reactions": {"nodes": [
        {"content": "THUMBS_UP", "createdAt": SINCE, "user": {"login": "o"}}]}}]}}]}}}}}
got = w.reactions(1, SINCE)
check("a reaction stamped at since emits", [k for k, _ in got], ["9/THUMBS_UP/o@" + SINCE])
check("and its key is the same next cycle", [k for k, _ in w.reactions(1, SINCE)], [k for k, _ in got])
w.gh_json = real_gh_json

print("\na failed read holds the window open, so its comments emit on the next poll:")
POSTED = "2026-10-02T10:00:10Z"
state = {"fail": True}
def fake(*a, **k):
    if a[1] == "graphql":
        return {"data": {"repository": {"pullRequest": {"reviewThreads": {"nodes": []}}}}}
    if "issues/1/comments" not in a[-1]:
        return []
    if state["fail"]:
        return None
    since = a[-1].split("since=")[1]
    return [{"id": 7, "updated_at": POSTED, "body": "an answer", "user": {"login": "o"}}] if POSTED >= since else []
real_now = w.now_iso
w.gh_json = fake
w.now_iso = lambda: "2026-10-02T10:00:30Z"
seen, out = set(), []
nxt = w.poll(1, SINCE, seen, out.append)
check("a failed read keeps since", nxt, SINCE)
state["fail"] = False
w.now_iso = lambda: "2026-10-02T10:01:00Z"
check("a clean poll moves since", w.poll(1, nxt, seen, out.append), "2026-10-02T10:01:00Z")
check("the comment from the failed window emits", out, ["o  conversation  an answer"])
w.gh_json, w.now_iso = real_gh_json, real_now

print("\nfailure is skipped rather than fatal:")
# A transient API error must not end a watch the owner is relying on mid-review.
w.subprocess.run = lambda *a, **k: (_ for _ in ()).throw(OSError("no gh"))
check("a missing gh yields None", w.gh_json("api", "x"), None)

print(f"\n{fails} failure(s)")
sys.exit(1 if fails else 0)
PY
