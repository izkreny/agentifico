#!/usr/bin/env python3
# It asks rather than denies, and fails open on anything it cannot read, because a plugin hook fires on every Bash call in every repository, many of which are legitimately trunk-only.
import json, os, re, shlex, subprocess, sys

TRUNK_NAMES = {"main", "master", "trunk"}
# Flags taking a value, so the value is never mistaken for a remote or a refspec.
FLAGS_WITH_VALUE = {"-C", "--git-dir", "--work-tree", "--exec", "--receive-pack",
                    "--repo", "-o", "--push-option"}
PUSHES_EVERYTHING = {"--all", "--mirror"}
DELETES = {"--delete", "-d"}
# Separators are matched as tokens rather than by a regex over the raw string, because a regex split runs before quoting is understood and would cut a quoted `;` inside an argument.
OPERATORS = {"&&", "||", "|", ";", ";;", "&", "(", ")", "`", "\n"}
# Backtick is added because shlex does not carry it, and newline is here and taken out of the whitespace set in `segments` because punctuation is only consulted for characters whitespace did not already eat.
PUNCTUATION = "();<>|&`\n"
SHELLS = {"bash", "sh", "zsh", "dash", "ksh"}
# `eval` takes its script the same way `sh -c` does, so it needs the same recursion.
EVAL = "eval"
MAX_DEPTH = 2


def git(cwd, *args):
    r = subprocess.run(("git",) + args, cwd=cwd, capture_output=True, text=True, timeout=5)
    return r.stdout.strip() if r.returncode == 0 else ""


def trunk_names(cwd):
    """Every remote is asked for its default branch, because a repository's one remote may be called anything and its trunk anything."""
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
    """`HEAD` is returned rather than dropped so `destinations` resolves it the way it resolves a bare `git push`."""
    spec = refspec.lstrip("+")
    dest = spec.split(":", 1)[1] if ":" in spec else spec
    dest = dest.strip()
    if not dest:
        return None
    # Only the prefix is stripped, because a branch named `feature/main` is not the trunk.
    return re.sub(r"^refs/heads/", "", dest)


HEREDOC = re.compile(r"<<-?\s*(['\"]?)([A-Za-z_][A-Za-z0-9_]*)\1")


def strip_heredocs(command):
    """A heredoc body is data the shell never executes, and a commit message can legitimately contain the very line this hook exists to catch."""
    out, lines, i = [], command.split("\n"), 0
    while i < len(lines):
        line = lines[i]
        out.append(line)
        found = HEREDOC.search(line)
        i += 1
        if not found:
            continue
        delimiter = found.group(2)
        while i < len(lines) and lines[i].strip() != delimiter:
            i += 1
        if i < len(lines):
            out.append(lines[i])
            i += 1
    return "\n".join(out)

def join_continuations(command):
    """The pair is removed before `shlex` sees it, because `shlex` resolves the escape into a literal newline indistinguishable from a separator."""
    out, i, single, double = [], 0, False, False
    while i < len(command):
        c = command[i]
        if c == "'" and not double:
            single = not single
        elif c == '"' and not single:
            double = not double
        elif c == "\\" and not single and i + 1 < len(command):
            if command[i + 1] == "\n":
                i += 2
                continue
            # Outside single quotes an escaped backslash is data and the newline after it still cuts, so the pair is copied together and neither is re-examined.
            out.append(c)
            out.append(command[i + 1])
            i += 2
            continue
        out.append(c)
        i += 1
    return "".join(out)

def segments(command):
    """Quoting is resolved before the cut so a `;` or `&&` inside an argument stays part of that argument."""
    try:
        lex = shlex.shlex(join_continuations(strip_heredocs(command)), posix=True,
                          punctuation_chars=PUNCTUATION)
        lex.whitespace_split = True
        # Newline has to stop being whitespace for the punctuation set to see it at all.
        lex.whitespace = " \t\r"
        tokens = list(lex)
    except ValueError:
        return
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
    return path if os.path.isabs(path) else os.path.normpath(os.path.join(base, path))


def push_invocations(command, cwd, depth=0):
    """`cd` is not followed, because resolving against a directory that may not be a repository would silence the guard on a trunk push."""
    if depth > MAX_DEPTH:
        return
    for tokens in segments(command):
        if not tokens:
            continue
        # A nested shell is looked for at every position and neither scan suppresses the other, because a bare word that happens to be a shell name would otherwise silence the `git` scan.
        for k, tok in enumerate(tokens):
            base = os.path.basename(tok)
            if base == EVAL:
                for t in tokens[k + 1:]:
                    yield from push_invocations(t, cwd, depth + 1)
            elif base in SHELLS:
                for j in range(k + 1, len(tokens) - 1):
                    t = tokens[j]
                    # `c` anywhere in a short-flag cluster means the next word is the script, which is what `bash -ceu '<script>'` itself does.
                    if t.startswith("-") and not t.startswith("--") and "=" not in t and "c" in t[1:]:
                        yield from push_invocations(tokens[j + 1], cwd, depth + 1)
                        break
        for i, tok in enumerate(tokens):
            if os.path.basename(tok) != "git":
                continue
            rest = tokens[i + 1:]
            where, j = cwd, 0
            while j < len(rest):
                t = rest[j]
                if t == "-C" and j + 1 < len(rest):
                    target = resolve(cwd, rest[j + 1])
                    # Falling back rather than skipping keeps an unreadable -C target from silencing the guard.
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
            # No `break`, because a segment may carry more than one `git` and abandoning it after a non-push hid every push behind it.


def destinations(args, cwd):
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

    def current_branch():
        b = git(cwd, "rev-parse", "--abbrev-ref", "HEAD")
        return b if b and b != "HEAD" else None

    if refspecs:
        out = []
        for r in refspecs:
            b = branch_of(r)
            if b == "HEAD":
                b = current_branch()
            if b:
                out.append(b)
        return out
    b = current_branch()  # A bare `git push` follows HEAD.
    return [b] if b else []


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
