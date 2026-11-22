#!/usr/bin/env bash
# WHY: no repository on hand holds a wrong setting, so every case runs against a faked gh, and the bench is the only place a refusal is seen firing.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(mktemp -d)"
HOME_DIR="$(mktemp -d)"
trap 'rm -rf "$REPO" "$HOME_DIR"' EXIT

HOME="$HOME_DIR" XDG_CONFIG_HOME= python3 - "$HERE/settings-check.py" "$REPO" <<'PY'
import contextlib, copy, importlib.util, io, json, sys
from pathlib import Path

spec = importlib.util.spec_from_file_location("settings_check", sys.argv[1])
sc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sc)
setup = sc.setup
repo_root = Path(sys.argv[2])
(repo_root / ".agents").mkdir()
# WHY: with a config in place setup's plan has no scaffold to report, so its exit code speaks for the settings alone.
(repo_root / ".agents/gh-solo.md").write_text("# config\n")
setup.git_root = lambda: repo_root
fails = 0

GOOD_REPO = {
    "full_name": "bench/repo", "default_branch": "main", "fork": False, "permissions": {"admin": True},
    "allow_squash_merge": True, "allow_merge_commit": False, "allow_rebase_merge": False,
    "delete_branch_on_merge": True, "squash_merge_commit_title": "PR_TITLE", "squash_merge_commit_message": "PR_BODY",
}
NO_CHECKS = {
    "required_status_checks": None,
    "enforce_admins": {"enabled": True},
    "required_pull_request_reviews": {"dismiss_stale_reviews": False, "require_code_owner_reviews": False, "require_last_push_approval": False, "required_approving_review_count": 0},
}
WITH_CHECKS = {**copy.deepcopy(NO_CHECKS), "required_status_checks": {"strict": False, "contexts": ["lint"], "checks": [{"context": "lint", "app_id": 1}]}}
WRONG = {
    "allow_squash_merge": False, "allow_merge_commit": True, "allow_rebase_merge": True, "delete_branch_on_merge": False,
    "squash_merge_commit_title": "COMMIT_OR_PR_TITLE", "squash_merge_commit_message": "COMMIT_MESSAGES",
}


class Fake:
    def __init__(self, repo, protection, permission="ADMIN", fail=None):
        self.repo, self.protection, self.permission, self.fail = repo, protection, permission, fail
        self.calls = []

    def __call__(self, *args, stdin=None):
        self.calls.append(args)
        if self.fail and self.fail in " ".join(args):
            return 1, "", "gh: Server Error (HTTP 500)"
        if args[:2] == ("repo", "view"):
            view = {"nameWithOwner": self.repo["full_name"], "viewerPermission": self.permission}
            view.update({field: self.repo[rest] for field, rest in sc.VIEW_FIELDS.items()})
            return 0, json.dumps({key: view[key] for key in args[3].split(",")}), ""
        if args == ("api", "repos/{owner}/{repo}"):
            return 0, json.dumps(self.repo), ""
        if args == ("api", "repos/{owner}/{repo}/branches/main/protection"):
            if self.protection is None:
                return 1, '{"message":"Branch not protected"}', "gh: Branch not protected (HTTP 404)"
            return 0, json.dumps(self.protection), ""
        raise AssertionError(args)


def run(fake, command):
    sc.gh = fake
    out = io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(io.StringIO()):
        code = sc.main([command])
    return code, out.getvalue().strip()


def setup_plan(fake):
    setup.gh = fake
    with contextlib.redirect_stdout(io.StringIO()):
        return setup.main(["plan"])


def check(name, got, want):
    global fails
    ok = got == want
    fails += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} {name}: {got!r}" + ("" if ok else f" want {want!r}"))


def refused(code, out, *names):
    out = out.splitlines()[-1] if out else ""
    return code == 1 and out.startswith("⛔ REFUSED - bench/repo: ") and "/gh-solo:setup" in out and all(n in out for n in names)


def repo_with(**changes):
    return {**copy.deepcopy(GOOD_REPO), **changes}


print("preflight:")
check("every setting holds: passes", run(Fake(GOOD_REPO, NO_CHECKS), "preflight")[0], 0)
check("it prints the name and the permission", run(Fake(GOOD_REPO, NO_CHECKS), "preflight")[1].splitlines()[0], "bench/repo, ADMIN")
fake = Fake(repo_with(allow_merge_commit=True), NO_CHECKS)
run(fake, "preflight")
check("it makes one gh call, the repo view", [args[:2] for args in fake.calls], [("repo", "view")])
for rest in sc.VIEW_FIELDS.values():
    fake = Fake(repo_with(**{rest: WRONG[rest]}), NO_CHECKS)
    check(f"{rest} {WRONG[rest]}: refuses, naming it and setup", refused(*run(fake, "preflight"), rest), True)
    check(f"{rest} {WRONG[rest]}: setup plan has work to do", setup_plan(fake), 1)
for rest in ("squash_merge_commit_title", "squash_merge_commit_message"):
    check(f"{rest} wrong: not preflight's to see", run(Fake(repo_with(**{rest: WRONG[rest]}), NO_CHECKS), "preflight")[0], 0)
for permission in ("WRITE", "READ"):
    code, out = run(Fake(repo_with(**{rest: WRONG[rest] for rest in sc.VIEW_FIELDS.values()}), NO_CHECKS, permission), "preflight")
    check(f"{permission} with every setting wrong: passes unchecked", (code, "unchecked below ADMIN" in out), (0, True))
check("a failed read exits 2", run(Fake(GOOD_REPO, NO_CHECKS, fail="repo view"), "preflight")[0], 2)

print("\ndoor:")
for name, protection in (("no check runs", NO_CHECKS), ("check runs", WITH_CHECKS)):
    fake = Fake(GOOD_REPO, protection)
    check(f"every setting holds, {name}: passes", run(fake, "door")[0], 0)
    check(f"every setting holds, {name}: setup plan agrees", setup_plan(fake), 0)
for key, wrong in WRONG.items():
    fake = Fake(repo_with(**{key: wrong}), NO_CHECKS)
    check(f"{key} {wrong}: refuses, naming it and setup", refused(*run(fake, "door"), key), True)
    check(f"{key} {wrong}: setup plan has work to do", setup_plan(fake), 1)
for name, protection, says in (
    ("no protection", None, "main has no branch protection"),
    ("enforce_admins false", {**copy.deepcopy(WITH_CHECKS), "enforce_admins": {"enabled": False}}, "lacks enforce_admins"),
    ("no review requirement, check runs listed", {**copy.deepcopy(WITH_CHECKS), "required_pull_request_reviews": None}, "lacks enforce_admins"),
    ("one approving review", {**copy.deepcopy(NO_CHECKS), "required_pull_request_reviews": {**NO_CHECKS["required_pull_request_reviews"], "required_approving_review_count": 1}}, "lacks enforce_admins"),
):
    fake = Fake(GOOD_REPO, protection)
    check(f"{name}: refuses, naming setup", refused(*run(fake, "door"), says), True)
    check(f"{name}: setup plan has work to do", setup_plan(fake), 1)
code, out = run(Fake(repo_with(permissions={"admin": False}), NO_CHECKS), "door")
check("below admin: refuses", (code, out.startswith("⛔ REFUSED - bench/repo: reading its settings")), (1, True))
check("a protection read that fails is not taken for absent", run(Fake(GOOD_REPO, NO_CHECKS, fail="protection"), "door")[0], 2)
check("a failed repository read exits 2", run(Fake(GOOD_REPO, NO_CHECKS, fail="repos/{owner}/{repo}"), "door")[0], 2)

print(f"\n{'all passed' if not fails else f'{fails} failed'}")
sys.exit(1 if fails else 0)
PY
