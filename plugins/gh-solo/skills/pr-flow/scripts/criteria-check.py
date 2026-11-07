#!/usr/bin/env python3
"""Check that a test names each keyed acceptance criterion of the issue a pull request closes.

It reads the repository's `Test files:` glob, the criterion keys of the issue the PR body's `Closes #` line names, and the PR's head, then searches that head once per key. It writes only to stdout and stderr.

Exit codes: 0 every key is named, or the gate is off, or no criterion carries a key; 1 a key no test names; 2 the check could not run.

Usage:
    criteria-check.py <pr-number> [--remote <remote>]
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

CONFIG_FILES = (".agents/gh-solo.md", ".claude/gh-solo.md")
GLOB_LINE = re.compile(r"^Test files:[ \t]*(\S.*?)[ \t]*$", re.M)
CLOSES = re.compile(r"\bCloses #(\d+)\b")
# WHY: a removed criterion has no checkbox and a READ one is the owner's to prove, so neither is searched.
CRITERION = re.compile(r"^(?:[-*+]|\d+[.)])[ \t]+\[[ xX]\][ \t]+::(AC[1-9]\d*)::(READ::)?", re.M)


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
    text = (issue_body or "").replace("\r\n", "\n")
    return [m.group(1) for m in CRITERION.finditer(text) if not m.group(2)]


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


def read_config(root):
    for name in CONFIG_FILES:
        path = Path(root) / name
        if path.is_file():
            return name, path.read_text()
    return None, ""


def check(pr, remote):
    root = must("git", "rev-parse", "--show-toplevel").strip()
    name, text = read_config(root)
    glob = test_glob(text)
    if glob is None:
        print(f"criteria-check: gate off, no `Test files:` line in {name or '.agents/gh-solo.md'}")
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
