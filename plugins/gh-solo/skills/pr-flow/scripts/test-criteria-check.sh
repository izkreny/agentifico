#!/usr/bin/env bash
# WHY: the gate's whole value is refusing, so the bench drives check() end to end on a real git repository and fakes only gh and the fetch.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(mktemp -d)"
trap 'rm -rf "$REPO"' EXIT

git -C "$REPO" init -q
mkdir -p "$REPO/.agents" "$REPO/spec/models"
printf 'it "GHI-287 AC1 shows an error"\nit "GHI-287 AC10 x"\n# GHI-287 AC3\n' > "$REPO/spec/models/a_spec.rb"
printf 'GHI-2870 AC2\nGHI-287\nAC2\nGHI-287_AC2\n' > "$REPO/spec/b_spec.rb"
printf 'GHI-287 AC2\n' > "$REPO/README.md"
git -C "$REPO" add -A
git -C "$REPO" -c commit.gpgsign=false -c user.name=bench -c user.email=bench@example.invalid commit -qm bench

python3 - "$HERE/criteria-check.py" "$REPO" <<'PY'
import importlib.util, json, os, sys

spec = importlib.util.spec_from_file_location("cc", sys.argv[1])
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
repo = sys.argv[2]
os.chdir(repo)

fails = 0

def check(name, got, want):
    global fails
    ok = got == want
    fails += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} {name}: {got!r}" + ("" if ok else f" want {want!r}"))

print("the config line:")
check("a glob is read", c.test_glob("x\nTest files: spec/**/*_spec.rb\n"), "spec/**/*_spec.rb")
check("trailing space is dropped", c.test_glob("Test files: spec/*  \n"), "spec/*")
check("no line is no glob", c.test_glob("Reviewer model: opus\n"), None)
check("an empty value is no glob", c.test_glob("Test files:   \n"), None)
check("an indented line is not the key", c.test_glob("  Test files: spec/*\n"), None)

print("\nthe Closes line:")
check("the issue is read", c.closed_issue("> x\n\nCloses #287\n"), 287)
check("no line is no issue", c.closed_issue("Refs #287"), None)

print("\nthe criterion keys:")
body = "\r\n".join([
    "- [ ] ::AC1:: open",
    "- [x] ::AC2:: ticked",
    "- [X] ::AC3:: capital tick",
    "- ::AC4::REMOVED:: superseded by AC5",
    "- [ ] ::AC5::READ:: the owner reads it",
    "- [ ] ::AC10:: two digits",
    "  - [ ] ::AC6:: nested is not a criterion line",
    "- [ ] Criterion without a key",
])
check("checkbox lines only, READ and removed skipped, CRLF read", c.criterion_keys(body), ["AC1", "AC2", "AC3", "AC10"])
check("an unkeyed body has no keys", c.criterion_keys("- [ ] plain\n- [x] plain"), [])

print("\nthe search, on a real repository:")
head = c.must("git", "rev-parse", "HEAD").strip()
glob = "spec/**/*_spec.rb"
check("AC1 found, not AC10's line", c.search(287, "AC1", head, glob), ["spec/models/a_spec.rb:1"])
check("a comment line counts", c.search(287, "AC3", head, glob), ["spec/models/a_spec.rb:3"])
check("AC2 split, joined or outside the glob is not found", c.search(287, "AC2", head, glob), [])
check("GHI-28 does not match GHI-287", c.search(28, "AC1", head, glob), [])
check("AC10 is found on its own line", c.search(287, "AC10", head, glob), ["spec/models/a_spec.rb:2"])

print("\nthe whole check, gh and the fetch faked:")
real_run = c.run

def fake(issue_body, pr_body="Closes #287"):
    def run(*args):
        if args[:3] == ("gh", "pr", "view"):
            return 0, json.dumps({"body": pr_body, "headRefName": "feat/x"}), ""
        if args[:3] == ("gh", "issue", "view"):
            return 0, json.dumps({"body": issue_body}), ""
        if args[:2] == ("git", "fetch"):
            return 0, "", ""
        if args == ("git", "rev-parse", "FETCH_HEAD"):
            return 0, head + "\n", ""
        return real_run(*args)
    c.run = run

def config(text):
    with open(os.path.join(repo, ".agents/gh-solo.md"), "w") as f:
        f.write(text)

config("Reviewer model: opus\n")
fake("- [ ] ::AC1:: x")
check("no Test files line turns the gate off", c.check(423, "origin"), 0)

config("Test files: spec/**/*_spec.rb\n")
fake("- [ ] criterion with no key")
check("an unkeyed issue passes", c.check(423, "origin"), 0)

fake("- [x] ::AC1:: x\n- [ ] ::AC3:: y\n- [ ] ::AC2::READ:: z")
check("every key named passes", c.check(423, "origin"), 0)

fake("- [x] ::AC1:: x\n- [ ] ::AC2:: y")
check("a key no test names refuses", c.check(423, "origin"), 1)

fake("- [x] ::AC1:: x", pr_body="no closing line")
check("a PR with no Closes line cannot run", c.main(["423", "--remote", "origin"]), 2)

c.run = real_run
print(f"\n{'all passed' if not fails else f'{fails} failed'}")
sys.exit(1 if fails else 0)
PY
