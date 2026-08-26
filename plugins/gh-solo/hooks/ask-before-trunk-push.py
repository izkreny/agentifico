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


def push_segments(command):
    """Each shell segment that invokes `git push`, tokenised."""
    for segment in re.split(r"&&|\|\||;|\||\n", command):
        try:
            tokens = shlex.split(segment)
        except ValueError:
            continue
        for i, tok in enumerate(tokens):
            if os.path.basename(tok) != "git":
                continue
            rest = tokens[i + 1:]
            j = 0
            while j < len(rest):
                t = rest[j]
                if t in FLAGS_WITH_VALUE:
                    j += 2
                elif t.startswith("-"):
                    j += 1
                else:
                    break
            if j < len(rest) and rest[j] == "push":
                yield rest[j + 1:]
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
    if not git(cwd, "rev-parse", "--git-dir"):
        return
    trunks = trunk_names(cwd)
    for args in push_segments(command):
        hits = [d for d in destinations(args, cwd) if d in trunks]
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
