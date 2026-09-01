#!/usr/bin/env bash
# Regression bench for ask-before-trunk-push.py. Run it after any edit to that file.
#
# It exists because a guard that has only ever been seen to pass is indistinguishable from
# one that passes on everything. Every case below has been watched to fire, or to stay
# quiet, on the situation it names.
set -euo pipefail

HOOK="$(cd "$(dirname "$0")" && pwd)/ask-before-trunk-push.py"
REPO="$(mktemp -d)"
ODD="$(mktemp -d)"
trap 'rm -rf "$REPO" "$ODD"' EXIT

git -C "$REPO" init -q -b main .
git -C "$REPO" config user.email bench@example.invalid
git -C "$REPO" config user.name bench
echo x > "$REPO/a.txt"
git -C "$REPO" add .
git -C "$REPO" commit -qm init
git -C "$REPO" checkout -qb feat/GHI-50_login-form

# The awkward repository: the trunk is named neither main, master nor trunk, the one
# remote is not called origin, and a feature branch's name ends in a trunk name. Each
# is a case a guard written around `origin/HEAD` and a last-path-segment match gets
# wrong, and each was watched getting it wrong before this fixture existed.
git -C "$ODD" init -q -b develop .
git -C "$ODD" config user.email bench@example.invalid
git -C "$ODD" config user.name bench
echo x > "$ODD/a.txt"
git -C "$ODD" add .
git -C "$ODD" commit -qm init
git -C "$ODD" remote add upstream /dev/null
git -C "$ODD" symbolic-ref refs/remotes/upstream/HEAD refs/remotes/upstream/develop
git -C "$ODD" checkout -qb feature/main

python3 - "$HOOK" "$REPO" "$ODD" <<'PY'
import json, subprocess, sys
hook, cwd, odd = sys.argv[1], sys.argv[2], sys.argv[3]

def decision(cmd, branch, repo=None):
    repo = repo or cwd
    subprocess.run(["git", "checkout", "-q", branch], cwd=repo, check=True)
    p = subprocess.run(["python3", hook], capture_output=True, text=True, input=json.dumps(
        {"tool_name": "Bash", "cwd": repo, "tool_input": {"command": cmd}}))
    if not p.stdout.strip():
        return "silent"
    return json.loads(p.stdout)["hookSpecificOutput"]["permissionDecision"]

FEAT = "feat/GHI-50_login-form"
PUSH = "git push origin main"          # the plain form, composed into the shapes below
# Shapes an agent composes routinely. Every one was watched staying silent while the
# command was cut with a regex before quoting was resolved, which is why they are here.
EVASIONS = [
    (f"({PUSH})", FEAT),
    (f"{PUSH}&", FEAT),
    (f"bash -c '{PUSH}'", FEAT),
    (f"bash -lc '{PUSH}'", FEAT),      # short flags combine, and -lc is commoner than -c
    (f"sh -lc '{PUSH}'", FEAT),
    (f"bash -ec '{PUSH}'", FEAT),
    (f"bash -e -c '{PUSH}'", FEAT),
    (f"`{PUSH}`", FEAT),               # backtick substitution: not in shlex's own punctuation set
    (f"eval '{PUSH}'", FEAT),          # eval takes its script the way sh -c does
    (f"$({PUSH})", FEAT),
    (f"{{ {PUSH}; }}", FEAT),
    (f"nohup {PUSH} &", FEAT),
    (f"/usr/bin/git push origin main", FEAT),
    ('git push "origin" "main"', FEAT),
    ("git push origin main:main", FEAT),
    (f"env FOO=1 {PUSH}", FEAT),
    (f"xargs -I{{}} {PUSH}", FEAT),
    (f"if true; then {PUSH}; fi", FEAT),
    (f"for r in a; do {PUSH}; done", FEAT),
    # Newline separates two commands exactly as `&&` does. `shlex` eats it as whitespace
    # unless it is taken out of `lex.whitespace`, and until it was, every multi-line
    # command collapsed into one segment and the guard went silent on all of them - the
    # single commonest shape an agent composes.
    (f"git status\n{PUSH}", FEAT),
    (f"git add -A\ngit commit -m x\n{PUSH}", FEAT),
    (f"{PUSH}\n", FEAT),
    (f"bash -ceu '{PUSH}'", FEAT),     # `c` need not end the cluster; bash still runs it
    (f"env bash -c '{PUSH}'", FEAT),   # a wrapper in front of the shell
]
# The mirror image: the phrase is present, but as data. A regex cut on `;` fires on
# every one of these, and a guard that cries wolf on a grep is one people click through.
QUOTED_MENTIONS = [
    (f"grep -r '{PUSH}' .", FEAT),
    (f"echo 'a; {PUSH}'", FEAT),
    (f"rg --files-with-matches '{PUSH}'", FEAT),
]
MUST_ASK = [
    ("git push origin main", FEAT),
    ("git push origin HEAD:main", FEAT),
    ("git push -f origin main", FEAT),
    ("git push --force-with-lease origin feat/x:main", FEAT),
    ("git push origin :main", FEAT),
    ("git push --delete origin main", FEAT),
    ("git push origin --all", FEAT),
    ("git push origin refs/heads/main", FEAT),
    ("git push origin master", FEAT),
    ("cd /somewhere && git push origin main", FEAT),
    ("git -C . push origin main", FEAT),
    ("git push", "main"),
    ("git push origin HEAD", "main"),        # HEAD resolves the way a bare push does
    ("git push origin refs/heads/HEAD", "main"),
]
MUST_STAY_SILENT = [
    (f"git push origin {FEAT}", FEAT),
    (f"git push -u origin {FEAT}", FEAT),
    ("git push", FEAT),
    ("git push origin main --dry-run", FEAT),
    ("git push origin --tags", FEAT),
    ('echo "git push origin main"', FEAT),
    ("git status", "main"),
    ("gh pr merge 60 --squash --delete-branch", "main"),
    ("git log --oneline main", "main"),
    ("git commit -m 'fix: thing'", "main"),
    ("git push origin HEAD", FEAT),          # HEAD is not the trunk from a feature branch
    # A newline inside quotes is data, not a separator. Taking `\n` out of shlex's
    # whitespace must not cost the quoting that keeps a grep or an echo quiet.
    (f"echo 'a\n{PUSH}'", FEAT),
    (f"grep -r 'a\n{PUSH}' .", FEAT),
    # A bare word that happens to name a shell must not stop the `git` scan running.
    ("git push origin sh", FEAT),
    ("git push origin eval", FEAT),
]
# Same two lists, run against the awkward repository above.
ODD_MUST_ASK = [
    ("git push upstream develop", "feature/main"),          # trunk found via a non-origin remote
    ("git push upstream HEAD:develop", "feature/main"),
    ("git push", "develop"),                                # bare push while on that trunk
]
ODD_MUST_STAY_SILENT = [
    ("git push upstream feature/main", "feature/main"),             # not the trunk, merely ends in one
    ("git push upstream refs/heads/feature/main", "feature/main"),  # nor in fully-qualified form
    ("git push -u upstream feature/main", "feature/main"),
]

# `-C` is read, so a push aimed at another repository is judged against that
# repository's trunk rather than the session's. Both directions are asserted, because
# the earlier fixtures pass on the hardcoded names alone and prove nothing about `-C`.
CROSS_C_MUST_ASK = [
    (f"git -C {odd} push upstream develop", FEAT),
]
CROSS_C_MUST_STAY_SILENT = [
    (f"git -C {cwd} push origin develop", "feature/main"),
]

fails = 0
rounds = (
    ("ask", MUST_ASK, None),
    ("ask", EVASIONS, None),
    ("silent", MUST_STAY_SILENT, None),
    ("silent", QUOTED_MENTIONS, None),
    ("ask", ODD_MUST_ASK, odd),
    ("silent", ODD_MUST_STAY_SILENT, odd),
    ("ask", CROSS_C_MUST_ASK, None),
    ("silent", CROSS_C_MUST_STAY_SILENT, odd),
)
for want, cases, repo in rounds:
    print(f"must be {want}{' [odd repo]' if repo else ''}:")
    for cmd, branch in cases:
        got = decision(cmd, branch, repo)
        ok = got == want
        fails += not ok
        print(f"  {'ok  ' if ok else 'FAIL'} [{branch}] {cmd!r} -> {got}")
print(f"\n{fails} failure(s)")
sys.exit(1 if fails else 0)
PY
