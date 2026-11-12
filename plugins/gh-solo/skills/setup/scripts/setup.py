#!/usr/bin/env python3
"""Put a repository into the state the gh-solo loop assumes, and scaffold its config.

Run from inside the repository. `plan` reads the repository's settings, its trunk's branch protection and the config lookup, prints every change `apply` would make, and writes nothing. `apply` reads the same state again and writes only what differs, so running it twice changes nothing the second time.

`pr-flow/references/repo-settings.md` owns why each value is what it is, and `pr-flow/references/repo-config.md` owns where a config lives and what its keys mean.

Exit codes: 0 nothing to change, or `apply` made its changes; 1 `plan` found changes pending; 2 a refusal, printed as a `⛔ REFUSED` line, or a read or write that could not run.

Usage:
    setup.py plan
    setup.py apply
"""

import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE.parent / "assets" / "gh-solo.md"
READ_CONFIG = HERE.parents[1] / "pr-flow" / "scripts" / "read-config.py"

REPO_SETTINGS = {
    "allow_squash_merge": True,
    "allow_merge_commit": False,
    "allow_rebase_merge": False,
    "delete_branch_on_merge": True,
    "squash_merge_commit_title": "PR_TITLE",
    "squash_merge_commit_message": "PR_BODY",
}
SQUASH_PAIR = ("squash_merge_commit_title", "squash_merge_commit_message")
CARRIED_FLAGS = (
    "required_linear_history",
    "allow_force_pushes",
    "allow_deletions",
    "block_creations",
    "required_conversation_resolution",
    "lock_branch",
    "allow_fork_syncing",
)
CARRIED_REVIEW_FIELDS = ("dismiss_stale_reviews", "require_code_owner_reviews", "require_last_push_approval")


class Refused(Exception):
    pass


def gh(*args, stdin=None):
    r = subprocess.run(["gh", *args], input=stdin, capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr


def must(*args, stdin=None):
    code, out, err = gh(*args, stdin=stdin)
    if code != 0:
        raise OSError(f"gh {' '.join(args)} exited {code}: {err.strip()}")
    return out


def git_root():
    r = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True)
    if r.returncode != 0:
        raise Refused("not inside a git repository")
    return Path(r.stdout.strip())


def read_config_module():
    spec = importlib.util.spec_from_file_location("read_config", READ_CONFIG)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_state():
    repo = json.loads(must("api", "repos/{owner}/{repo}"))
    if not repo.get("permissions", {}).get("admin"):
        raise Refused(f"{repo.get('full_name')}: setup needs admin permission, which only the repository's owner has")
    trunk = repo["default_branch"]
    code, out, err = gh("api", f"repos/{{owner}}/{{repo}}/branches/{trunk}/protection")
    if code == 0:
        protection = json.loads(out)
    elif "HTTP 404" in err:
        protection = None
    else:
        raise OSError(f"reading the protection on {trunk} exited {code}: {err.strip()}")
    return repo, trunk, protection


def settings_patch(repo):
    patch = {key: value for key, value in REPO_SETTINGS.items() if repo.get(key) != value}
    # WHY: GitHub validates the squash title and message as a pair and answers 422 to either sent alone.
    if any(key in patch for key in SQUASH_PAIR):
        patch.update({key: REPO_SETTINGS[key] for key in SQUASH_PAIR})
    return patch


def protection_holds(protection):
    if protection is None:
        return False
    reviews = protection.get("required_pull_request_reviews")
    return (
        protection.get("enforce_admins", {}).get("enabled") is True
        and reviews is not None
        and reviews.get("required_approving_review_count") == 0
    )


def status_checks(protection):
    checks = (protection or {}).get("required_status_checks")
    if not checks:
        return None
    if checks.get("checks"):
        listed = [{"context": c["context"], "app_id": c["app_id"]} if c.get("app_id") is not None else {"context": c["context"]} for c in checks["checks"]]
        return {"strict": checks.get("strict", False), "checks": listed}
    return {"strict": checks.get("strict", False), "contexts": checks.get("contexts", [])}


def restrictions(protection):
    current = (protection or {}).get("restrictions")
    if not current:
        return None
    return {
        "users": [u["login"] for u in current.get("users", [])],
        "teams": [t["slug"] for t in current.get("teams", [])],
        "apps": [a["slug"] for a in current.get("apps", [])],
    }


def protection_payload(protection):
    reviews = (protection or {}).get("required_pull_request_reviews") or {}
    payload = {
        "required_status_checks": status_checks(protection),
        "enforce_admins": True,
        "required_pull_request_reviews": {
            **{key: reviews.get(key, False) for key in CARRIED_REVIEW_FIELDS},
            "required_approving_review_count": 0,
        },
        "restrictions": restrictions(protection),
    }
    for flag in CARRIED_FLAGS:
        if protection and flag in protection:
            payload[flag] = protection[flag].get("enabled", False)
    return payload


def scaffold_target(root, repo, rc):
    user_file = rc.user_config_dir() / "gh-solo" / f"{repo['full_name']}.md"
    found = [user_file] + [root / name for name in rc.IN_REPO_CONFIGS]
    if any(path.is_file() for path in found):
        return None
    # WHY: a fork's commits are bound for someone else's repository, so its config stays out of the tree.
    return user_file if repo.get("fork") else root / ".agents" / "gh-solo.md"


def changes():
    root = git_root()
    repo, trunk, protection = read_state()
    patch = settings_patch(repo)
    put = None if protection_holds(protection) else protection_payload(protection)
    target = scaffold_target(root, repo, read_config_module())
    return repo, trunk, protection, patch, put, target


def describe(repo, trunk, protection, patch, put, target):
    lines = []
    if patch:
        lines.append(f"Repository settings on {repo['full_name']}, in one PATCH:")
        lines += [f"  {key}: {json.dumps(repo.get(key))} -> {json.dumps(value)}" for key, value in patch.items()]
    if put:
        state = "absent" if protection is None else "missing a load-bearing value"
        lines.append(f"Branch protection on {trunk} is {state}; this PUT replaces it whole:")
        lines += ["  " + line for line in json.dumps(put, indent=2).splitlines()]
    if target:
        lines.append(f"Config: create {target} from the template")
    return lines


def apply(trunk, patch, put, target):
    done = []
    if patch:
        must("api", "-X", "PATCH", "repos/{owner}/{repo}", "--input", "-", stdin=json.dumps(patch))
        done.append(f"patched {', '.join(patch)}")
    if put:
        must("api", "-X", "PUT", f"repos/{{owner}}/{{repo}}/branches/{trunk}/protection", "--input", "-", stdin=json.dumps(put))
        done.append(f"protected {trunk}")
    if target:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(TEMPLATE.read_text(encoding="utf-8"), encoding="utf-8")
        done.append(f"wrote {target}")
    return done


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("command", choices=["plan", "apply"])
    a = p.parse_args(argv)
    try:
        repo, trunk, protection, patch, put, target = changes()
        if a.command == "plan":
            lines = describe(repo, trunk, protection, patch, put, target)
            print("\n".join(lines) if lines else f"{repo['full_name']}: nothing to change")
            return 1 if lines else 0
        done = apply(trunk, patch, put, target)
        print("; ".join(done) if done else f"{repo['full_name']}: nothing to change")
        return 0
    except Refused as e:
        print(f"⛔ REFUSED - {e}")
        return 2
    except Exception as e:
        print(f"setup: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
