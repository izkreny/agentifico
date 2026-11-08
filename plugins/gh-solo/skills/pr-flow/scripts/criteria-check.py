#!/usr/bin/env python3
"""Check that a test names each keyed acceptance criterion of the issue a pull request closes.

It reads the `Test files:` glob from the repository's config, the first file the lookup in `references/repo-config.md` finds, then the criterion keys of the issue the PR body's `Closes #` line names, and the PR's head, then searches that head once per key. It writes only to stdout and stderr.

Exit codes: 0 every key is named, or the gate is off, or no criterion carries a key; 1 a key no test names; 2 the check could not run.

Usage:
    criteria-check.py <pr-number> [--remote <remote>]
"""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

IN_REPO_CONFIGS = (".agents/gh-solo.md", ".claude/gh-solo.md")
GLOB_LINE = re.compile(r"^Test files:[ \t]*(\S.*?)[ \t]*$", re.M)
CLOSES = re.compile(r"\bCloses #(\d+)\b")
ITEM = re.compile(r"^( {0,3})((?:[-*+]|\d+[.)])[ \t]+)\S")
FENCE = re.compile(r"^(`{3,}|~{3,})")
HEADING = re.compile(r"^#{1,6}[ \t]")
# WHY: a removed criterion has no checkbox and a READ one is the owner's to prove, so neither is searched.
CRITERION = re.compile(r"\[[ xX]\][ \t]+::(AC[1-9]\d*)::(READ::)?")


class CheckError(Exception):
    pass


def run(*args):
    r = subprocess.run(args, capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr


def must(*args):
    code, out, err = run(*args)
    if code != 0:
        raise CheckError(f"{' '.join(args)} exited {code}: {err.strip()}")
    return out


def test_glob(config_text):
    m = GLOB_LINE.search(config_text or "")
    return m.group(1) if m else None


def closed_issue(pr_body):
    m = CLOSES.search(pr_body or "")
    return int(m.group(1)) if m else None


def criterion_keys(issue_body):
    # WHY: a nested item is not a criterion, and only the previous item's content column tells nesting from an indented top-level item, as IssueKeys.yml tracks it.
    keys, content, blank, fence = [], -1, False, ""
    for line in (issue_body or "").replace("\r\n", "\n").split("\n"):
        item = ITEM.match(line)
        expanded = line.expandtabs(4)
        indent = len(expanded) - len(expanded.lstrip())
        marker = FENCE.match(line.lstrip(" \t"))
        if fence:
            if marker and marker.group(1).startswith(fence) and not line.strip()[len(marker.group(1)):].strip():
                fence = ""
        elif marker:
            fence = marker.group(1)
            if indent < content:
                content = -1
        elif HEADING.match(line):
            content = -1
        elif item and (content < 0 or len(item.group(1)) < content):
            content = len(item.group(1)) + len(item.group(2))
            m = CRITERION.match(line, item.end(2))
            if m and not m.group(2):
                keys.append(m.group(1))
        elif not item and line.strip() and blank and indent < content:
            content = -1
        blank = not line.strip()
    return keys


def parse_hits(grep_out, sha):
    hits = []
    for line in grep_out.splitlines():
        rest = line[len(sha) + 1:] if line.startswith(sha + ":") else line
        path, num, _ = rest.split(":", 2)
        hits.append(f"{path}:{num}")
    return hits


def search(issue, key, sha, glob):
    code, out, err = run("git", "grep", "-n", "-w", "-F", "-e", f"GHI-{issue}", "--and", "-e", key, sha, "--", f":(glob){glob}")
    if code == 1:
        return []
    if code != 0:
        raise CheckError(f"git grep for {key} exited {code}: {err.strip()}")
    return parse_hits(out, sha)


def resolve_remote():
    remotes = must("git", "remote").split()
    if len(remotes) == 1:
        return remotes[0]
    code, out, _ = run("git", "config", "branch.main.remote")
    if code == 0 and out.strip():
        return out.strip()
    raise CheckError("more than one remote and none tracked by main: pass --remote")


def user_config_dir():
    # WHY: the XDG Base Directory spec ignores a relative value, as it does an empty one.
    xdg = os.environ.get("XDG_CONFIG_HOME", "")
    return Path(xdg) if os.path.isabs(xdg) else Path.home() / ".config"


def config_paths(root, name_with_owner):
    user_level = user_config_dir() / "gh-solo" / f"{name_with_owner}.md"
    return [user_level] + [Path(root) / name for name in IN_REPO_CONFIGS]


def read_config(root, name_with_owner):
    for path in config_paths(root, name_with_owner):
        if path.is_file():
            return str(path), path.read_text()
    return None, ""


def check(pr, remote):
    root = must("git", "rev-parse", "--show-toplevel").strip()
    name_with_owner = must("gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner").strip()
    name, text = read_config(root, name_with_owner)
    glob = test_glob(text)
    if glob is None:
        print(f"criteria-check: gate off, no `Test files:` line in {name or 'any config file'}")
        return 0
    view = json.loads(must("gh", "pr", "view", str(pr), "--json", "body,headRefName"))
    issue = closed_issue(view["body"])
    if issue is None:
        raise CheckError(f"PR {pr} carries no `Closes #` line")
    body = json.loads(must("gh", "issue", "view", str(issue), "--json", "body"))["body"]
    keys = criterion_keys(body)
    if not keys:
        print(f"criteria-check: #{issue} carries no keyed criterion")
        return 0
    # WHY: `gh pr view --json headRefOid` was seen answering with a pre-push sha, so the head is read by fetch.
    must("git", "fetch", remote or resolve_remote(), view["headRefName"], "--quiet")
    sha = must("git", "rev-parse", "FETCH_HEAD").strip()
    missing = []
    for key in keys:
        hits = search(issue, key, sha, glob)
        print(f"{key}  {', '.join(hits) if hits else 'no test names it'}")
        if not hits:
            missing.append(key)
    if missing:
        print(f"criteria-check: no test names {', '.join(missing)}")
        return 1
    print(f"criteria-check: every keyed criterion of #{issue} is named at {sha[:7]}")
    return 0


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("pr", type=int)
    p.add_argument("--remote")
    a = p.parse_args(argv)
    try:
        return check(a.pr, a.remote)
    except CheckError as e:
        print(f"criteria-check: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
