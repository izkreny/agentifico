#!/usr/bin/env python3
# PreToolUse hook (Bash): confirm before a git push whose destination is the trunk.
#
# Every skill in this plugin states "never commit or push to the trunk" as a hard rule,
# but a rule written in prose is a request. This turns it into a stop.
#
# It asks rather than denies on purpose. A plugin hook fires on every Bash call in every
# session and repository, not only while one of this plugin's skills is loaded, and plenty
# of repositories are legitimately main-only. Denying would break those; asking catches
# the accident and costs one keystroke when the push was meant.
#
# Fails open on anything unexpected: a guard that cannot read the situation must not
# stand in the way of work it does not understand.
import json, os, re, shlex, subprocess, sys

TRUNK_NAMES = {"main", "master", "trunk"}
# Flags taking a value, so the value is never mistaken for a remote or a refspec.
FLAGS_WITH_VALUE = {"-C", "--git-dir", "--work-tree", "--exec", "--receive-pack",
                    "--repo", "-o", "--push-option"}
PUSHES_EVERYTHING = {"--all", "--mirror"}
DELETES = {"--delete", "-d"}
# Tokens that end one command and begin another. `shlex` with punctuation_chars emits
# each of these as its own token, which is why they are matched here and not by a regex
# over the raw string: a regex split runs before quoting is understood, so it cuts a
# quoted `;` inside an argument and turns `echo 'a; git push origin main'` into a push.
OPERATORS = {"&&", "||", "|", ";", ";;", "&", "(", ")", "\n"}
SHELLS = {"bash", "sh", "zsh", "dash", "ksh"}
MAX_DEPTH = 2


def git(cwd, *args):
    r = subprocess.run(("git",) + args, cwd=cwd, capture_output=True, text=True, timeout=5)
    return r.stdout.strip() if r.returncode == 0 else ""


def trunk_names(cwd):
    """Every remote's default branch, plus the conventional names.

    Never assume `origin`: that is only `git clone`'s default, and the plugin's own
    remote-name convention says a repository's one remote may be called anything.
    Reading only `origin/HEAD` leaves a repo whose trunk is neither main, master nor
    trunk with no guard at all, so ask every remote what its default branch is.
    `git remote` is a handful of names at most, so the extra calls are cheap.
    """
    names = set(TRUNK_NAMES)
    for remote in git(cwd, "remote").splitlines():
        remote = remote.strip()
        if not remote:
            continue
        head = git(cwd, "symbolic-ref", "--short", "refs/remotes/%s/HEAD" % remote)
        if head:
            names.add(head.split("/", 1)[-1])
    return names


def branch_of(refspec):
    """The destination branch a refspec writes to, or None."""
    spec = refspec.lstrip("+")
    dest = spec.split(":", 1)[1] if ":" in spec else spec
    dest = dest.strip()
    if not dest or dest == "HEAD":
        return None
    # Strip the prefix only. Never take the last path segment: a branch named
    # `feature/main` is not the trunk, and `refs/heads/` is the one form where
    # dropping everything before the final slash would say it was.
    return re.sub(r"^refs/heads/", "", dest)


def segments(command):
    """The command's tokens, cut into one list per shell command.

    Quoting is resolved before the cut, so a `;` or `&&` inside an argument stays part
    of that argument. That is what keeps `grep "git push origin main" .` quiet while
    `(git push origin main)` and `git push origin main&` are still seen: the parentheses
    and the ampersand are operator tokens, not part of the word next to them.
    """
    try:
        lex = shlex.shlex(command, posix=True, punctuation_chars=True)
        lex.whitespace_split = True
        tokens = list(lex)
    except ValueError:
        return                                   # unbalanced quotes: nothing to read
    current = []
    for tok in tokens:
        if tok in OPERATORS:
            if current:
                yield current
            current = []
        else:
            current.append(tok)
    if current:
        yield current


def resolve(base, path):
    """A `-C` value against the directory the command runs in."""
    return path if os.path.isabs(path) else os.path.normpath(os.path.join(base, path))


def push_invocations(command, cwd, depth=0):
    """(args, directory) for each `git push` the command would run.

    `cd` is deliberately not tracked. Following it would make `cd /elsewhere && git push
    origin main` resolve against a directory that may not be a repository at all, and the
    guard would then go quiet on a command whose second half is a trunk push. Over-asking
    against the session's repository is the safe direction; going silent is not.
    """
    if depth > MAX_DEPTH:
        return
    for tokens in segments(command):
        if not tokens:
            continue
        if os.path.basename(tokens[0]) in SHELLS:
            for k in range(1, len(tokens) - 1):   # `bash -c '<script>'` carries a command
                t = tokens[k]
                # Short flags combine, and `-lc` is commoner than `-c` alone. Match any
                # short-flag cluster ending in `c`; `--foo=c` is excluded by the `=`,
                # and a long option never ends up here because of the `--` prefix test.
                if t.startswith("-") and not t.startswith("--") and "=" not in t and t.endswith("c"):
                    yield from push_invocations(tokens[k + 1], cwd, depth + 1)
                    break
            continue
        for i, tok in enumerate(tokens):
            if os.path.basename(tok) != "git":
                continue                          # skips `env FOO=1`, `xargs -I{}` and friends
            rest = tokens[i + 1:]
            where, j = cwd, 0
            while j < len(rest):
                t = rest[j]
                if t == "-C" and j + 1 < len(rest):
                    target = resolve(cwd, rest[j + 1])
                    # Fall back rather than skip: an unreadable -C target must not
                    # silence the guard, only stop it from using the wrong trunk set.
                    where = target if git(target, "rev-parse", "--git-dir") else cwd
                    j += 2
                elif t in FLAGS_WITH_VALUE:
                    j += 2
                elif t.startswith("-"):
                    j += 1
                else:
                    break
            if j < len(rest) and rest[j] == "push":
                yield rest[j + 1:], where
            break


def destinations(args, cwd):
    """Branches this push would write to."""
    if "--dry-run" in args or "-n" in args:
        return []
    if any(a in PUSHES_EVERYTHING for a in args):
        return sorted(trunk_names(cwd))          # --all/--mirror reaches the trunk by definition
    positional, j = [], 0
    while j < len(args):
        a = args[j]
        if a in FLAGS_WITH_VALUE:
            j += 2
            continue
        if a.startswith("-"):
            j += 1
            continue
        positional.append(a)
        j += 1
    deleting = any(a in DELETES for a in args)
    refspecs = positional if deleting else positional[1:]   # a delete names branches, not a remote
    if refspecs:
        return [b for b in (branch_of(r) for r in refspecs) if b]
    current = git(cwd, "rev-parse", "--abbrev-ref", "HEAD")  # bare `git push` follows HEAD
    return [current] if current and current != "HEAD" else []


def main():
    data = json.load(sys.stdin)
    command = data.get("tool_input", {}).get("command", "")
    if "push" not in command:
        return
    cwd = data.get("cwd") or os.getcwd()
    for args, where in push_invocations(command, cwd):
        if not git(where, "rev-parse", "--git-dir"):
            continue
        hits = [d for d in destinations(args, where) if d in trunk_names(where)]
        if not hits:
            continue
        reason = (
            f"This push writes to '{hits[0]}', the trunk. Every gh-solo skill states as a "
            f"hard rule that work reaches the trunk only through a reviewed pull request's "
            f"squash merge, never a direct push, so the plan record, the review threads and "
            f"the ticked gates stay the only route in. Confirm only if this repository is "
            f"deliberately trunk-only and no gh-solo pull request is in flight."
        )
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "ask",
                "permissionDecisionReason": reason,
            }
        }))
        return


try:
    main()
except Exception:
    pass
sys.exit(0)
