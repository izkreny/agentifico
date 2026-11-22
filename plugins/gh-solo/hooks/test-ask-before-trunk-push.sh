#!/usr/bin/env bash
# Every case has been watched to fire, or to stay quiet, on the situation it names, because a guard only ever seen to pass is indistinguishable from one that passes on everything.
set -euo pipefail

HOOK="$(cd "$(dirname "$0")" && pwd)/ask-before-trunk-push.py"
REPO="$(mktemp -d)"
ODD="$(mktemp -d)"
CONF="$(mktemp -d)"
BARE="$(mktemp -d)"
TAGGED="$(mktemp -d)"
SOLE="$(mktemp -d)"
trap 'rm -rf "$REPO" "$ODD" "$CONF" "$BARE" "$TAGGED" "$SOLE"' EXIT

git -C "$REPO" init -q -b main .
git -C "$REPO" config user.email bench@example.invalid
git -C "$REPO" config user.name bench
echo x > "$REPO/a.txt"
git -C "$REPO" add .
git -C "$REPO" commit -qm init
git -C "$REPO" checkout -qb feat/GHI-50_login-form

# A trunk named neither main, master nor trunk, a remote not called origin and a branch ending in a trunk name are each what a guard written around `origin/HEAD` and a last-segment match gets wrong.
git -C "$ODD" init -q -b develop .
git -C "$ODD" config user.email bench@example.invalid
git -C "$ODD" config user.name bench
echo x > "$ODD/a.txt"
git -C "$ODD" add .
git -C "$ODD" commit -qm init
git -C "$ODD" remote add upstream /dev/null
git -C "$ODD" symbolic-ref refs/remotes/upstream/HEAD refs/remotes/upstream/develop
git -C "$ODD" checkout -qb feature/main

# WHY: config is set per case in a repository of its own, so the cases above keep testing the default `simple`.
for dir in "$CONF" "$BARE" "$TAGGED" "$SOLE"; do
  git -C "$dir" init -q -b main .
  git -C "$dir" config user.email bench@example.invalid
  git -C "$dir" config user.name bench
  echo x > "$dir/a.txt"
  git -C "$dir" add .
  git -C "$dir" commit -qm init
done
git -C "$CONF" checkout -qb feat/GHI-50_login-form
# WHY: `matching` asks only when a local trunk branch exists, so one fixture must have none.
git -C "$BARE" checkout -qb work
git -C "$BARE" branch -qD main
# WHY: a tag sharing a branch's name makes git print that branch's short name as `heads/<name>`.
git -C "$TAGGED" tag main
git -C "$TAGGED" checkout -qb feat
git -C "$TAGGED" tag feat
# WHY: with no config naming a push remote, git pushes to a repository's sole remote, whatever it is called.
git -C "$SOLE" remote add upstream /dev/null
git -C "$SOLE" checkout -qb feat

python3 - "$HOOK" "$REPO" "$ODD" "$CONF" "$BARE" "$TAGGED" "$SOLE" <<'PY'
import json, subprocess, sys
hook, cwd, odd, conf, bare, tagged, sole = sys.argv[1:8]

def decision(cmd, branch, repo=None, config=None):
    repo = repo or cwd
    subprocess.run(["git", "checkout", "-q", branch], cwd=repo, check=True)
    for key, value in (config or {}).items():
        subprocess.run(["git", "config", "--add", key, value], cwd=repo, check=True)
    try:
        p = subprocess.run(["python3", hook], capture_output=True, text=True, input=json.dumps(
            {"tool_name": "Bash", "cwd": repo, "tool_input": {"command": cmd}}))
    finally:
        for key in config or {}:
            subprocess.run(["git", "config", "--unset-all", key], cwd=repo, check=True)
    if not p.stdout.strip():
        return "silent"
    return json.loads(p.stdout)["hookSpecificOutput"]["permissionDecision"]

FEAT = "feat/GHI-50_login-form"
PUSH = "git push origin main"          # the plain form, composed into the shapes below
# A regex cut made before quoting is resolved stays silent on every one of these, which is why the guard tokenises instead.
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
    # Newline separates two commands as `&&` does, and shlex eats it as whitespace unless it is taken out of `lex.whitespace`.
    (f"git status\n{PUSH}", FEAT),
    (f"git add -A\ngit commit -m x\n{PUSH}", FEAT),
    (f"{PUSH}\n", FEAT),
    (f"bash -ceu '{PUSH}'", FEAT),     # `c` need not end the cluster; bash still runs it
    (f"env bash -c '{PUSH}'", FEAT),   # a wrapper in front of the shell
    # WHY: posix-mode shlex resolves the escape into a newline glued to the next word, so a scan matching the bare token `git` misses `\ngit`.
    (f"git status && \\\n{PUSH}", FEAT),
    (f"git push \\\n  origin main", FEAT),
    (f"git add -A \\\n  . && {PUSH}", FEAT),
    # An escaped backslash is data and the newline after it still separates, so the second backslash is never a continuation.
    (f"echo a\\\\\n{PUSH}", FEAT),
    (f"cat <<'EOF' > f\n{PUSH}\nEOF\n{PUSH}", FEAT),   # after the delimiter, commands again
    (f"cat <<-EOF\n{PUSH}\nEOF\n{PUSH}", FEAT),
    (f"printf 'x\\\\'\n{PUSH}", FEAT),
]
# A regex cut on `;` fires on every one of these, and a guard that cries wolf on a grep is one people click through.
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
    ("git -c core.sshCommand=ssh push origin main", FEAT),   # -c takes a value, and that value is not the subcommand
    ("git --namespace=x -c push.default=current push", "main"),
    ("git --attr-source HEAD push origin main", FEAT),
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
    # Taking `\n` out of shlex's whitespace must not cost the quoting that keeps a grep or an echo quiet.
    (f"echo 'a\n{PUSH}'", FEAT),
    (f"grep -r 'a\n{PUSH}' .", FEAT),
    # A bare word that happens to name a shell must not stop the `git` scan running.
    ("git push origin sh", FEAT),
    ("git push origin eval", FEAT),
    # A heredoc body is data, and a commit message legitimately contains the very line this hook exists to catch.
    (f"git commit -F - <<'EOF'\ntext\n{PUSH}\nEOF", FEAT),
    (f"cat <<'EOF'\n{PUSH}", FEAT),          # unterminated: body runs to the end
    (f"echo 'a \\\n{PUSH}'", FEAT),        # a continuation inside quotes is data
]
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

# Both directions are asserted, because the earlier fixtures pass on the hardcoded names alone and prove nothing about `-C`.
CROSS_C_MUST_ASK = [
    (f"git -C {odd} push upstream develop", FEAT),
]
CROSS_C_MUST_STAY_SILENT = [
    (f"git -C {cwd} push origin develop", "feature/main"),
]

# WHY: git sends a push with no refspec wherever its config says, and under `upstream` that is the trunk from a branch named anything.
TRACKS_MAIN = {f"branch.{FEAT}.remote": "origin", f"branch.{FEAT}.merge": "refs/heads/main"}
CONF_MUST_ASK = [
    ("git push", FEAT, {"push.default": "upstream", **TRACKS_MAIN}),
    ("git push", FEAT, {"push.default": "tracking", **TRACKS_MAIN}),
    ("git push origin", FEAT, {"push.default": "upstream", **TRACKS_MAIN}),
    ("git push", FEAT, {"push.default": "matching"}),            # a local main exists, so git pushes it
    ("git push", FEAT, {"remote.origin.push": "refs/heads/*:refs/heads/*"}),
    # The push remote comes from remote.pushDefault, so its own push refspec is the one git reads.
    ("git push", FEAT, {"remote.pushDefault": "fork", "remote.fork.push": "HEAD:refs/heads/main"}),
    ("git push origin 'refs/heads/*:refs/heads/*'", FEAT, {}),
    ("git push origin '+refs/heads/*:refs/heads/*'", FEAT, {}),
    ("git push origin 'refs/*:refs/*'", FEAT, {}),               # the pattern covers every ref, branches included
    ("git push origin :", FEAT, {}),                              # a bare colon is git's matching refspec
    # WHY: a `-c` on the command line wins over the repository's config for that one push.
    ("git -c push.default=upstream push", FEAT, TRACKS_MAIN),
    ("git -c remote.origin.push=refs/heads/*:refs/heads/* push", FEAT, {}),
]
CONF_MUST_STAY_SILENT = [
    ("git push", FEAT, {"push.default": "upstream", f"branch.{FEAT}.remote": "origin",
                        f"branch.{FEAT}.merge": f"refs/heads/{FEAT}"}),
    # git refuses an `upstream` push to a remote other than the branch's upstream remote.
    ("git push other", FEAT, {"push.default": "upstream", **TRACKS_MAIN}),
    ("git push", "main", {"push.default": "nothing"}),
    # `--tags` with no refspec pushes tags only, so neither HEAD nor `matching` reaches a branch.
    ("git push origin --tags", "main", {}),
    ("git push origin --tags", FEAT, {"push.default": "matching"}),
    ("git push origin 'refs/heads/feat/*:refs/heads/feat/*'", FEAT, {}),
]
BARE_MUST_STAY_SILENT = [
    ("git push", "work", {"push.default": "matching"}),          # no local trunk branch to match
]
TAGGED_MUST_ASK = [
    ("git push", "feat", {"push.default": "matching"}),          # a tag named main must not hide the branch
    ("git push origin :", "feat", {}),
    # A tag named feat must not hide the branch's own upstream config.
    ("git push", "feat", {"push.default": "upstream", "branch.feat.remote": "origin",
                          "branch.feat.merge": "refs/heads/main"}),
]
SOLE_MUST_ASK = [
    ("git push", "feat", {"remote.upstream.push": "refs/heads/*:refs/heads/*"}),
    # A remote defined by `-c` counts too, so git falls back to `origin` and reads its pattern.
    ("git -c remote.origin.url=/dev/null -c remote.origin.push=refs/heads/*:refs/heads/* push", "feat", {}),
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
    ("ask", CONF_MUST_ASK, conf),
    ("silent", CONF_MUST_STAY_SILENT, conf),
    ("silent", BARE_MUST_STAY_SILENT, bare),
    ("ask", TAGGED_MUST_ASK, tagged),
    ("ask", SOLE_MUST_ASK, sole),
)
NAMES = {odd: "odd repo", conf: "config repo", bare: "no-trunk repo", tagged: "tagged repo",
         sole: "sole-remote repo"}
for want, cases, repo in rounds:
    print(f"must be {want}{f' [{NAMES[repo]}]' if repo else ''}:")
    for cmd, branch, *config in cases:
        config = config[0] if config else None
        got = decision(cmd, branch, repo, config)
        ok = got == want
        fails += not ok
        print(f"  {'ok  ' if ok else 'FAIL'} [{branch}] {cmd!r}{f' {config}' if config else ''} -> {got}")
print(f"\n{fails} failure(s)")
sys.exit(1 if fails else 0)
PY
