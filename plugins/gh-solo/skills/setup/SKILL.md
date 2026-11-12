---
name: setup
description: |
  Put a GitHub repository the owner administers into the state the gh-solo loop assumes, once per repository: squash as the only merge method, branches deleted on merge, the PR title and body as the squash commit, the trunk protected with no approval required, and a gh-solo config scaffolded to fill in. Only the owner starts it, by typing `/gh-solo:setup`, because it rewrites repository settings; the model never invokes it. Not for creating a repository, nor its labels, which the `tracker` skill creates when an issue needs one.
disable-model-invocation: true
allowed-tools: Bash(gh:*) Bash(git:*) Bash(python3:*) Read
---

> **Tools used:** `Bash(gh:*)` to confirm the repository, `Bash(python3:*)` for `scripts/setup.py`, which makes every read and write itself, `Bash(git:*)` for the repository root that script reads, `Read` for the config it scaffolds.

Put the repository in the working directory into the state the gh-solo loop assumes. Paths here are relative to this skill's own directory, and `<skill-dir>` stands for it in a command.

**Only the owner starts this skill.** It rewrites a repository's settings, so the model deciding to run it from something said in passing is what `disable-model-invocation` stops. *How each skill is reached* in `../../README.md` says what that choice costs. An agent that ignores the field reads the same rule here: run this only when the owner typed the command.

`../pr-flow/references/repo-settings.md` owns why each value is what it is, and `../pr-flow/references/repo-config.md` owns where the config lives and what its keys mean. Read the first before answering a question about a setting.

## Step 1 - Confirm the repository

```bash
gh repo view --json nameWithOwner,viewerPermission
```

Say which repository resolved before anything else, because every write lands there. `scripts/setup.py` refuses below `ADMIN` by itself, so a lower permission needs no separate stop here.

## Step 2 - Show every change, and wait

```bash
python3 <skill-dir>/scripts/setup.py plan
```

It reads and writes nothing:

- **Exit 0**: nothing to change. Print `✅ ALL PASS - {repository} already holds every setting` and stop.
- **Exit 2**: print its `⛔ REFUSED` line, or the error it gave, and stop.
- **Exit 1**: print its output whole, ask the owner to approve the changes it printed, and stop. Only their yes to that list, in this session, opens Step 3.

## Step 3 - Apply, then read it back

```bash
python3 <skill-dir>/scripts/setup.py apply
python3 <skill-dir>/scripts/setup.py plan
```

`apply` reads the state again and writes only what still differs. The second `plan` must exit 0, because a value GitHub did not keep is what the write's own exit code cannot show. Anything else ends on `⚠️ PASSED WITH FINDINGS - {what plan still lists}`, with its output; `✅ ALL PASS` otherwise.

## Step 4 - Say what is left to the owner

Name each of these that applies, since the script decides none of them:

- **Required checks.** Where the repository runs CI and its protection lists no check, the PUT sent none, since check names come off a real pull request. *Branch protection on `main`* in `../pr-flow/references/repo-settings.md` says how to add them.
- **The scaffolded config**, where Step 3 wrote one. It is uncommitted and sets no key, so the owner fills in its check commands and lands it through a pull request like any other file. A fork's config is outside the tree and is never committed.
- **The label taxonomy**, which the scaffold leaves out. The `tracker` skill offers to record it once the owner settles the labels.
