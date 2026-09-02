#!/usr/bin/env python3
"""Poll a pull request for the owner's replies and reactions, printing each once.

Invoked as `python3 <skill-dir>/scripts/watch.py <pr-number>`, which is the whole reason
it is Python rather than the shell block it replaces. The skill's grant is
`Bash(gh:*)`, `Bash(git:*)`, `Bash(python3:*)` and no bare `Bash`, and the shell block
opened with `mktemp` and went on through `grep`, `printf`, `date` and `sleep` - none of
which prefix-match. Whether that prompts or is denied is harness behaviour the skill was
asserting rather than reporting, so the fix is to need no answer: every command this
script runs is its own subprocess, and the one Bash call is `python3`.

Reads nothing and writes nothing but stdout. Runs until killed.
"""
import json
import subprocess
import sys
import time
from datetime import datetime, timezone

# The literal every gate in this flow tests, and the reason this filter exists: without
# it the watch re-emits the round's own posts as fresh comments and answers itself.
DISCLAIMER_PREFIX = "> \N{ROBOT FACE}"
POLL_SECONDS = 30
BODY_CHARS = 140


def gh_json(*args):
    """`gh` output parsed as JSON, or None when the call failed.

    A failed poll is skipped rather than fatal: the owner is mid-review and a transient
    API error must not end the watch they are relying on.
    """
    try:
        r = subprocess.run(("gh",) + args, capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired):
        return None
    if r.returncode != 0:
        return None
    try:
        return json.loads(r.stdout or "null")
    except ValueError:
        return None


def mine(body):
    return (body or "").startswith(DISCLAIMER_PREFIX)


def one_line(body, limit=BODY_CHARS):
    return " ".join((body or "")[:limit].split())


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def inline_comments(pr, since):
    out = []
    for c in gh_json("api", "--paginate",
                     f"repos/{{owner}}/{{repo}}/pulls/{pr}/comments?since={since}") or []:
        if mine(c.get("body")):
            continue
        line = c.get("line") or c.get("original_line")
        out.append((f"{c['id']}@{c['updated_at']}",
                    f"{c['user']['login']}  {c.get('path')}:{line}  {one_line(c.get('body'))}"))
    return out


def review_bodies(pr, since):
    out = []
    for r in gh_json("api", "--paginate",
                     f"repos/{{owner}}/{{repo}}/pulls/{pr}/reviews") or []:
        submitted = r.get("submitted_at") or ""
        if submitted <= since or not r.get("body") or mine(r.get("body")):
            continue
        out.append((f"{r['id']}@{submitted}",
                    f"{r['user']['login']}  review({r.get('state')})  {one_line(r.get('body'))}"))
    return out


def conversation(pr, since):
    out = []
    for c in gh_json("api", "--paginate",
                     f"repos/{{owner}}/{{repo}}/issues/{pr}/comments?since={since}") or []:
        if mine(c.get("body")):
            continue
        out.append((f"{c['id']}@{c['updated_at']}",
                    f"{c['user']['login']}  conversation  {one_line(c.get('body'))}"))
    return out


QUERY = """
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) { nodes { path line
        comments(first: 20) { nodes { databaseId
          reactions(first: 20) { nodes { content createdAt user { login } } } } } } } } } }
"""


def reactions(pr, since):
    """Reactions are GraphQL-only, and they are half the owner's vocabulary."""
    data = gh_json("api", "graphql", "-F", "owner={owner}", "-F", "repo={repo}",
                   "-F", f"pr={pr}", "-f", f"query={QUERY}")
    if not data:
        return []
    out = []
    try:
        threads = data["data"]["repository"]["pullRequest"]["reviewThreads"]["nodes"]
    except (KeyError, TypeError):
        return []
    for t in threads:
        for c in t.get("comments", {}).get("nodes", []):
            for rx in c.get("reactions", {}).get("nodes", []):
                if (rx.get("createdAt") or "") <= since:
                    continue
                who = (rx.get("user") or {}).get("login")
                key = f"{c['databaseId']}/{rx['content']}/{who}@{rx['createdAt']}"
                out.append((key, f"{who}  {t.get('path')}:{t.get('line')}  "
                                 f"reacted {rx['content']}"))
    return out


def main():
    if len(sys.argv) != 2 or not sys.argv[1].isdigit():
        sys.exit("usage: watch.py <pr-number>")
    pr = int(sys.argv[1])
    seen = set()
    since = now_iso()
    while True:
        stamp = now_iso()
        for source in (inline_comments, review_bodies, conversation, reactions):
            for key, text in source(pr, since):
                if key in seen:
                    continue
                seen.add(key)
                print(text, flush=True)
        since = stamp
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
