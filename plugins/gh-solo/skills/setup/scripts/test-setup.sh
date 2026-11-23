#!/usr/bin/env bash
# WHY: setup writes to a live repository, so every case runs against a faked gh whose state the writes mutate, and nothing here can reach GitHub.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(mktemp -d)"
HOME_DIR="$(mktemp -d)"
trap 'rm -rf "$REPO" "$HOME_DIR"' EXIT

HOME="$HOME_DIR" XDG_CONFIG_HOME= python3 - "$HERE/setup.py" "$HERE/../../pr-flow/scripts/read-config.py" "$REPO" <<'PY'
import contextlib, copy, importlib.util, io, json, os, shutil, sys
from pathlib import Path


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


setup = load("setup", sys.argv[1])
rc = load("rc", sys.argv[2])
repo_root = Path(sys.argv[3])
setup.git_root = lambda: repo_root
fails = 0

GOOD_REPO = {
    "full_name": "bench/repo", "default_branch": "main", "fork": False, "permissions": {"admin": True},
    "allow_squash_merge": True, "allow_merge_commit": False, "allow_rebase_merge": False,
    "delete_branch_on_merge": True, "squash_merge_commit_title": "PR_TITLE", "squash_merge_commit_message": "PR_BODY",
}
FLAGS = {flag: {"enabled": False} for flag in setup.CARRIED_FLAGS}
NO_CHECKS = {
    "required_status_checks": None,
    "enforce_admins": {"url": "x", "enabled": True},
    "required_pull_request_reviews": {"url": "x", "dismiss_stale_reviews": False, "require_code_owner_reviews": False, "require_last_push_approval": False, "required_approving_review_count": 0},
    "required_signatures": {"url": "x", "enabled": False},
    **FLAGS,
}
WITH_CHECKS = {
    **copy.deepcopy(NO_CHECKS),
    "required_status_checks": {"url": "x", "strict": False, "contexts": ["lint", "test"], "checks": [{"context": "lint", "app_id": 15368}, {"context": "test", "app_id": 15368}]},
}


class Fake:
    def __init__(self, repo, protection):
        self.repo, self.protection, self.writes = copy.deepcopy(repo), copy.deepcopy(protection), []

    def __call__(self, *args, stdin=None):
        if args == ("api", "repos/{owner}/{repo}"):
            return 0, json.dumps(self.repo), ""
        if args == ("api", "repos/{owner}/{repo}/branches/main/protection"):
            if self.protection is None:
                return 1, '{"message":"Branch not protected"}', "gh: Branch not protected (HTTP 404)"
            return 0, json.dumps(self.protection), ""
        body = json.loads(stdin)
        self.writes.append((args[2], body))
        if args[:3] == ("api", "-X", "PATCH"):
            self.repo.update(body)
        elif args[:3] == ("api", "-X", "PUT"):
            self.protection = as_read(body)
        else:
            raise AssertionError(args)
        return 0, "{}", ""


def as_read(put):
    # WHY: the GET shape differs from the PUT body, so a rerun is only honest when the fake reads back what GitHub would.
    checks = put["required_status_checks"]
    if checks and "checks" in checks:
        checks = {"strict": checks["strict"], "contexts": [c["context"] for c in checks["checks"]], "checks": checks["checks"]}
    read = {
        "required_status_checks": checks,
        "enforce_admins": {"enabled": put["enforce_admins"]},
        "required_pull_request_reviews": put["required_pull_request_reviews"],
        "required_signatures": {"enabled": False},
    }
    read.update({flag: {"enabled": put.get(flag, False)} for flag in setup.CARRIED_FLAGS})
    return read


def run(fake, command):
    setup.gh = fake
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code = setup.main([command])
    return code, out.getvalue().strip()


def check(name, got, want):
    global fails
    ok = got == want
    fails += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} {name}: {got!r}" + ("" if ok else f" want {want!r}"))


def fresh():
    for path in (repo_root / ".agents", repo_root / ".claude", Path(os.environ["HOME"]) / ".config"):
        shutil.rmtree(path, ignore_errors=True)
    (repo_root / ".agents").mkdir()
    (repo_root / ".agents/gh-solo.md").write_text("# config\n")


def repo_with(**changes):
    return {**copy.deepcopy(GOOD_REPO), **changes}


print("a repository already in place:")
for name, protection in (("no check runs", NO_CHECKS), ("check runs", WITH_CHECKS)):
    fresh()
    fake = Fake(GOOD_REPO, protection)
    check(f"{name}: plan exits 0", run(fake, "plan")[0], 0)
    check(f"{name}: apply writes nothing", (run(fake, "apply")[0], fake.writes), (0, []))

print("\nthe repository settings:")
for key, wrong in (("allow_squash_merge", False), ("allow_merge_commit", True), ("allow_rebase_merge", True), ("delete_branch_on_merge", False)):
    fresh()
    fake = Fake(repo_with(**{key: wrong}), NO_CHECKS)
    code, out = run(fake, "plan")
    check(f"{key} {wrong}: plan exits 1 and names it", (code, key in out, fake.writes), (1, True, []))
    run(fake, "apply")
    check(f"{key} {wrong}: one PATCH sets it alone", fake.writes, [("PATCH", {key: setup.REPO_SETTINGS[key]})])
for key, wrong in (("squash_merge_commit_title", "COMMIT_OR_PR_TITLE"), ("squash_merge_commit_message", "COMMIT_MESSAGES")):
    fresh()
    fake = Fake(repo_with(**{key: wrong}), NO_CHECKS)
    run(fake, "apply")
    check(f"{key} {wrong}: the PATCH carries the pair", fake.writes, [("PATCH", {"squash_merge_commit_title": "PR_TITLE", "squash_merge_commit_message": "PR_BODY"})])
fresh()
fake = Fake(repo_with(allow_merge_commit=True, allow_rebase_merge=True, allow_squash_merge=False, delete_branch_on_merge=False), NO_CHECKS)
run(fake, "apply")
check("several wrong settings go in one PATCH", [verb for verb, _ in fake.writes], ["PATCH"])

print("\nthe branch protection:")
fresh()
fake = Fake(GOOD_REPO, None)
code, out = run(fake, "plan")
check("absent: plan exits 1 and says so", (code, "main is absent" in out), (1, True))
run(fake, "apply")
verb, body = fake.writes[0] if fake.writes else (None, {})
check("absent: one PUT", verb, "PUT")
check("absent: enforce_admins true", body.get("enforce_admins"), True)
check("absent: no approving review", body.get("required_pull_request_reviews", {}).get("required_approving_review_count"), 0)
check("absent: required_status_checks null", body.get("required_status_checks", "missing"), None)
check("absent: restrictions null", body.get("restrictions", "missing"), None)
for name, change in (("enforce_admins false", {"enforce_admins": {"enabled": False}}), ("one approving review", {"required_pull_request_reviews": {**WITH_CHECKS["required_pull_request_reviews"], "required_approving_review_count": 1}}), ("no review requirement", {"required_pull_request_reviews": None})):
    fresh()
    fake = Fake(GOOD_REPO, {**copy.deepcopy(WITH_CHECKS), **change})
    run(fake, "apply")
    verb, body = fake.writes[0] if fake.writes else (None, {})
    check(f"{name}: one PUT", [v for v, _ in fake.writes], ["PUT"])
    check(f"{name}: enforce_admins true", body.get("enforce_admins"), True)
    check(f"{name}: no approving review", body.get("required_pull_request_reviews", {}).get("required_approving_review_count"), 0)
    check(f"{name}: the checks are kept", body.get("required_status_checks"), {"strict": False, "checks": WITH_CHECKS["required_status_checks"]["checks"]})
fresh()
fake = Fake(GOOD_REPO, {**copy.deepcopy(NO_CHECKS), "enforce_admins": {"enabled": False}, "allow_deletions": {"enabled": True}, "required_pull_request_reviews": {**NO_CHECKS["required_pull_request_reviews"], "dismiss_stale_reviews": True}})
run(fake, "apply")
body = fake.writes[0][1] if fake.writes else {}
check("a flag the repository set is carried", body.get("allow_deletions"), True)
check("a review field the repository set is carried", body.get("required_pull_request_reviews", {}).get("dismiss_stale_reviews"), True)
check("null checks stay null", body.get("required_status_checks", "missing"), None)
fresh()
fake = Fake(GOOD_REPO, {**copy.deepcopy(NO_CHECKS), "required_status_checks": {"strict": True, "contexts": ["ci"], "checks": []}, "enforce_admins": {"enabled": False}})
run(fake, "apply")
body = fake.writes[0][1] if fake.writes else {}
check("contexts with no checks list are kept", body.get("required_status_checks"), {"strict": True, "contexts": ["ci"]})

print("\nrunning it twice:")
fresh()
fake = Fake(repo_with(allow_merge_commit=True, squash_merge_commit_title="COMMIT_OR_PR_TITLE", delete_branch_on_merge=False), None)
run(fake, "apply")
first = len(fake.writes)
check("the second apply writes nothing", (first, run(fake, "apply")[0], len(fake.writes)), (2, 0, 2))
check("and plan then exits 0", run(fake, "plan")[0], 0)

print("\nthe refusals:")
fresh()
os.remove(repo_root / ".agents/gh-solo.md")
fake = Fake(repo_with(permissions={"admin": False}, allow_merge_commit=True), None)
code, out = run(fake, "apply")
check("below admin refuses and writes nothing", (code, out.startswith("⛔ REFUSED - bench/repo: setup needs admin"), fake.writes), (2, True, []))
check("below admin scaffolds nothing", (repo_root / ".agents/gh-solo.md").exists(), False)
fake = Fake(GOOD_REPO, None)
fake_err = lambda *args, stdin=None: (1, "", "gh: Server Error (HTTP 500)") if "protection" in args[-1] else fake(*args, stdin=stdin)
setup.gh = fake_err
out = io.StringIO()
with contextlib.redirect_stdout(out), contextlib.redirect_stderr(io.StringIO()):
    code = setup.main(["apply"])
check("a protection read that fails is not taken for absent", (code, fake.writes), (2, []))

print("\nthe config scaffold:")
fresh()
os.remove(repo_root / ".agents/gh-solo.md")
fake = Fake(GOOD_REPO, NO_CHECKS)
code, out = run(fake, "plan")
check("no config: plan exits 1 and names the file", (code, str(repo_root / ".agents/gh-solo.md") in out), (1, True))
check("plan writes no file", (repo_root / ".agents/gh-solo.md").exists(), False)
run(fake, "apply")
scaffold = repo_root / ".agents/gh-solo.md"
check("apply writes the template", scaffold.read_text() if scaffold.exists() else None, setup.TEMPLATE.read_text())
rc.must = lambda *args: str(repo_root) if args[:2] == ("git", "rev-parse") else "bench/repo"
os.chdir(repo_root)
for argv, want in ((["get-all"], 0), (["get", "mandatory_axis", "--no-default"], 1)):
    with contextlib.redirect_stdout(io.StringIO()):
        code = rc.main(argv)
    check(f"the scaffold reads with {' '.join(argv)}", code, want)
check("a second apply leaves the file alone", (run(fake, "apply")[0], len(fake.writes)), (0, 0))
fresh()
os.remove(repo_root / ".agents/gh-solo.md")
(repo_root / ".claude").mkdir()
(repo_root / ".claude/gh-solo.md").write_text("# config\n")
fake = Fake(GOOD_REPO, NO_CHECKS)
check("a .claude config counts as one", run(fake, "plan")[0], 0)
fresh()
os.remove(repo_root / ".agents/gh-solo.md")
user_file = Path(os.environ["HOME"]) / ".config/gh-solo/bench/repo.md"
user_file.parent.mkdir(parents=True)
user_file.write_text("# config\n")
check("a user-level config counts as one", run(Fake(GOOD_REPO, NO_CHECKS), "plan")[0], 0)
fresh()
os.remove(repo_root / ".agents/gh-solo.md")
run(Fake(repo_with(fork=True), NO_CHECKS), "apply")
check("a fork's scaffold goes to the user-level file", (user_file.exists(), (repo_root / ".agents/gh-solo.md").exists()), (True, False))

print(f"\n{'all passed' if not fails else f'{fails} failed'}")
sys.exit(1 if fails else 0)
PY
