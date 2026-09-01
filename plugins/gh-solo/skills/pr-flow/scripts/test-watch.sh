#!/usr/bin/env bash
# Bench for watch.py. Run it after any edit to that file.
#
# It exists for one behaviour above all: the disclaimer filter. Without it the watch
# re-emits the round's own posts as fresh comments and the flow answers itself forever,
# and that is a defect no reader would spot in a poll loop's output. Every case below was
# watched failing on a deliberately broken filter before its pass was trusted.
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
# A post that merely contains the prefix further in must not be filtered: the gates test
# startswith, and a looser test here would silently drop the owner quoting an agent.
check("the prefix quoted mid-body is not ours", w.mine("as you said:\n> \U0001F916 Written by AI"), False)

print("\nbody flattening, so one comment is one line:")
check("newlines collapse", w.one_line("a\nb\nc"), "a b c")
check("runs of space collapse", w.one_line("a     b"), "a b")
check("it truncates", w.one_line("x" * 200), "x" * 140)
check("empty survives", w.one_line(""), "")
check("None survives", w.one_line(None), "")

print("\nfailure is skipped rather than fatal:")
# A transient API error must not end a watch the owner is relying on mid-review.
w.subprocess.run = lambda *a, **k: (_ for _ in ()).throw(OSError("no gh"))
check("a missing gh yields None", w.gh_json("api", "x"), None)

print(f"\n{fails} failure(s)")
sys.exit(1 if fails else 0)
PY
