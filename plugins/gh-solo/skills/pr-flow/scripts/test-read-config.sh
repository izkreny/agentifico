#!/usr/bin/env bash
# WHY: every refusal exists to stop a gate switching off silently, so each one is driven through main() as a reader sees it, with only git and gh faked.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(mktemp -d)"
HOME_DIR="$(mktemp -d)"
trap 'rm -rf "$REPO" "$HOME_DIR"' EXIT
mkdir -p "$REPO/.agents"

HOME="$HOME_DIR" XDG_CONFIG_HOME= python3 - "$HERE/read-config.py" "$REPO" <<'PY'
import contextlib, importlib.util, io, json, os, sys

spec = importlib.util.spec_from_file_location("rc", sys.argv[1])
rc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rc)
repo = sys.argv[2]
os.chdir(repo)
in_repo = os.path.join(repo, ".agents/gh-solo.md")


def must(*args):
    if args[:2] == ("git", "rev-parse"):
        return repo
    if args[:3] == ("gh", "repo", "view"):
        return "bench/repo"
    raise AssertionError(args)


rc.must = must
fails = 0


def check(name, got, want):
    global fails
    ok = got == want
    fails += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} {name}: {got!r}" + ("" if ok else f" want {want!r}"))


def config(text):
    with open(in_repo, "w") as f:
        f.write(text)


def block(obj):
    return "# config\n\n```json\n" + json.dumps(obj, indent=2) + "\n```\n"


def get(key):
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code = rc.main(["get", key])
    return code, out.getvalue().strip()


full = {
    "reviewer_model": "opus",
    "test_files": "spec/**/*_spec.rb",
    "labels": {"axis": "package", "values": {"gh-solo": "plugins/gh-solo/", "repo": "the repository itself"}},
    "branch_format": "{type}/GHI-{issue-number}_{slug}",
    "branch_types": ["feat", "fix", "docs"],
    "issue_types": False,
    "default_branch": "trunk",
    "remote": "upstream",
    "commit_scope": "label",
}

print("no config:")
check("no file sets no key", get("reviewer_model"), (1, ""))

print("\nthe block:")
config("# config\n\nProse with no block.\n")
check("a file with no block sets no key", get("reviewer_model"), (1, ""))
config(block(full))
check("a string prints as it is", get("reviewer_model"), (0, "opus"))
check("a glob prints as it is", get("test_files"), (0, "spec/**/*_spec.rb"))
check("an object prints as JSON", json.loads(get("labels")[1]), full["labels"])
check("a list prints as JSON", get("branch_types"), (0, '["feat", "fix", "docs"]'))
check("a boolean prints as JSON", get("issue_types"), (0, "false"))
for key in ("branch_format", "default_branch", "remote", "commit_scope"):
    check(f"{key} is read", get(key), (0, full[key]))
config(block({"reviewer_model": "opus"}))
check("an unset key exits 1", get("test_files"), (1, ""))
config("```bash\necho hi\n```\n\n```json\n{\"reviewer_model\": \"opus\"}\n```\n\n~~~\n```json\n{}\n```\n~~~\n")
check("a json fence inside another fence is not a block", get("reviewer_model"), (0, "opus"))
config("```json\r\n{\"reviewer_model\": \"opus\"}\r\n```\r\n")
check("CRLF line ends are read", get("reviewer_model"), (0, "opus"))

print("\nthe refusals:")
config(block({"reviewer_model": "opus"}) + "\n" + block({"test_files": "x"}))
check("two blocks refuse", get("reviewer_model"), (2, f"⛔ REFUSED - {in_repo}: it holds 2 json blocks, and only one is read"))
config("```json\n{\"reviewer_model\": \"opus\",}\n```\n")
code, out = get("reviewer_model")
check("an unparseable block refuses", (code, out.startswith(f"⛔ REFUSED - {in_repo}: its json block does not parse")), (2, True))
config("```json\n{\"reviewer_model\": \"opus\"}\n")
check("an unclosed block refuses", get("reviewer_model"), (2, f"⛔ REFUSED - {in_repo}: its json block is never closed"))
config("```json\n[\"opus\"]\n```\n")
check("a block that is not an object refuses", get("reviewer_model"), (2, f"⛔ REFUSED - {in_repo}: its json block is not an object"))
config(block({"reviewr_model": "opus"}))
check("an unknown key refuses", get("reviewer_model"), (2, f"⛔ REFUSED - {in_repo}: reviewr_model is not a key"))
config("```json\n{\"reviewer_model\": \"opus\", \"reviewer_model\": \"sonnet\"}\n```\n")
check("a key set twice refuses", get("reviewer_model"), (2, f"⛔ REFUSED - {in_repo}: reviewer_model is set twice"))
for key, bad in (("reviewer_model", ""), ("test_files", 3), ("issue_types", "false"), ("branch_types", "feat"), ("commit_scope", "package"), ("labels", {"axis": "package"}), ("labels", {"axis": "package", "values": {"x": 1}})):
    config(block({key: bad}))
    code, out = get("reviewer_model")
    check(f"{key} as {bad!r} refuses", (code, out.startswith(f"⛔ REFUSED - {in_repo}: {key} must be")), (2, True))
config(block({"test_files": ""}))
check("a bad value refuses a read of another key", get("reviewer_model")[0], 2)

print("\nthe old lines:")
config("Reviewer model: opus\n")
check("Reviewer model refuses", get("reviewer_model"), (2, "⛔ REFUSED - Reviewer model is now reviewer_model"))
config(block({"reviewer_model": "opus"}) + "\nTest files: spec/*\n")
check("Test files refuses beside a block", get("reviewer_model"), (2, "⛔ REFUSED - Test files is now test_files"))
config("A `Reviewer model:` line refuses.\n\n  Test files: indented is prose\n\n```\nReviewer model: opus\n```\n" + block({"reviewer_model": "opus"}))
check("an old line in backticks, indented or fenced is not read", get("reviewer_model"), (0, "opus"))

print("\nthe lookup:")
user_level = os.path.join(os.environ["HOME"], ".config/gh-solo/bench/repo.md")
os.makedirs(os.path.dirname(user_level))
with open(user_level, "w") as f:
    f.write(block({"reviewer_model": "sonnet"}))
config(block({"reviewer_model": "opus", "test_files": "x"}))
check("the user-level file beats the in-repo one", get("reviewer_model"), (0, "sonnet"))
check("nothing is merged in from a later file", get("test_files"), (1, ""))
os.remove(user_level)
os.remove(in_repo)
os.makedirs(os.path.join(repo, ".claude"))
with open(os.path.join(repo, ".claude/gh-solo.md"), "w") as f:
    f.write(block({"reviewer_model": "haiku"}))
check("the .claude file is read last", get("reviewer_model"), (0, "haiku"))
os.remove(os.path.join(repo, ".claude/gh-solo.md"))
for root in (os.path.join(os.environ["HOME"], "xdg"), "relative/xdg"):
    os.makedirs(os.path.join(root, "gh-solo/bench"))
    with open(os.path.join(root, "gh-solo/bench/repo.md"), "w") as f:
        f.write(block({"reviewer_model": root}))
os.environ["XDG_CONFIG_HOME"] = os.path.join(os.environ["HOME"], "xdg")
check("XDG_CONFIG_HOME moves the user-level file", get("reviewer_model"), (0, os.path.join(os.environ["HOME"], "xdg")))
os.environ["XDG_CONFIG_HOME"] = "relative/xdg"
check("a relative XDG_CONFIG_HOME is ignored", get("reviewer_model"), (1, ""))
os.environ["XDG_CONFIG_HOME"] = ""

print(f"\n{'all passed' if not fails else f'{fails} failed'}")
sys.exit(1 if fails else 0)
PY
