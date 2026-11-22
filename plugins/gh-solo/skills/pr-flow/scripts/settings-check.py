#!/usr/bin/env python3
"""Refuse the loop where the repository's settings do not back it, naming `/gh-solo:setup` as the remedy.

Run from inside the repository. `preflight` makes the skill's one `gh repo view` call, prints the repository's name and the viewer's permission, and checks the four merge settings that call carries: squash the only enabled method, and branches deleted on merge. Below ADMIN it checks nothing, since `gh` then resolves a repository the viewer does not administer. `door` reads the repository over REST and the trunk's branch protection, and checks every repository setting, the squash title and message pair included, and that the protection holds.

The expected values and the protection test are `setup.py`'s own, loaded from the `setup` skill, so this gate never demands a state that `setup` reports as nothing to change. `references/repo-settings.md` owns why each value is what it is.

Exit codes: 0 the settings hold, or `preflight` ran below ADMIN; 1 a refusal, printed as a `⛔ REFUSED` line; 2 a read that could not run.

Usage:
    settings-check.py preflight
    settings-check.py door
"""

import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

SETUP = Path(__file__).resolve().parents[2] / "setup" / "scripts" / "setup.py"
REMEDY = "run /gh-solo:setup"
VIEW_FIELDS = {
    "squashMergeAllowed": "allow_squash_merge",
    "mergeCommitAllowed": "allow_merge_commit",
    "rebaseMergeAllowed": "allow_rebase_merge",
    "deleteBranchOnMerge": "delete_branch_on_merge",
}


def load_setup():
    spec = importlib.util.spec_from_file_location("setup", SETUP)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


setup = None


class Refused(Exception):
    pass


def gh(*args):
    r = subprocess.run(["gh", *args], capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr


def must(*args):
    code, out, err = gh(*args)
    if code != 0:
        raise OSError(f"gh {' '.join(args)} exited {code}: {err.strip()}")
    return json.loads(out)


def refuse_on(name, wrong):
    if wrong:
        raise Refused(f"{name}: {', '.join(wrong)}; {REMEDY}")


def preflight():
    view = must("repo", "view", "--json", ",".join(["nameWithOwner", "viewerPermission", *VIEW_FIELDS]))
    name, permission = view["nameWithOwner"], view["viewerPermission"]
    print(f"{name}, {permission}")
    if permission != "ADMIN":
        print(f"{name}: merge settings unchecked below ADMIN")
        return
    refuse_on(name, [f"{rest} is {json.dumps(view.get(field))}" for field, rest in VIEW_FIELDS.items() if view.get(field) != setup.REPO_SETTINGS[rest]])
    print(f"{name}: merge settings hold")


def door():
    repo = must("api", "repos/{owner}/{repo}")
    name, trunk = repo["full_name"], repo["default_branch"]
    if not repo.get("permissions", {}).get("admin"):
        raise Refused(f"{name}: reading its settings and branch protection needs admin permission")
    wrong = [f"{key} is {json.dumps(repo.get(key))}" for key, value in setup.REPO_SETTINGS.items() if repo.get(key) != value]
    code, out, err = gh("api", f"repos/{{owner}}/{{repo}}/branches/{trunk}/protection")
    if code == 0:
        protection = json.loads(out)
    elif "HTTP 404" in err:
        protection = None
    else:
        raise OSError(f"reading the protection on {trunk} exited {code}: {err.strip()}")
    if protection is None:
        wrong.append(f"{trunk} has no branch protection")
    elif not setup.protection_holds(protection):
        wrong.append(f"the protection on {trunk} lacks enforce_admins or a zero-approval review requirement")
    refuse_on(name, wrong)
    print(f"{name}: settings and protection on {trunk} hold")


def main(argv=None):
    global setup
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("command", choices=["preflight", "door"])
    a = p.parse_args(argv)
    try:
        # WHY: loaded here rather than at import, so a missing setup.py exits 2 like any read that could not run, never 1 like a refusal.
        setup = setup or load_setup()
        if a.command == "preflight":
            preflight()
        else:
            door()
        return 0
    except Refused as e:
        print(f"⛔ REFUSED - {e}")
        return 1
    except Exception as e:
        print(f"settings-check: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
