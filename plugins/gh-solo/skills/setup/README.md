> 🤖 Written by AI --- read/modified by izkreny! 🤓

# setup

Puts a GitHub repository you administer into the state the gh-solo loop assumes, once. It turns off merge commits and rebase merges, deletes branches on merge, makes the PR title and body the squash commit, protects the trunk without requiring an approval, and scaffolds a config file for you to fill in.

The loop's merge gate assumes all of that, and each setting left at GitHub's default fails quietly: a merge commit from the UI's dropdown, a squash commit carrying every fix commit's message, a branch left on the remote forever. This skill makes the state one command instead of a checklist you have to remember.

## Install

This skill ships inside the `gh-solo` plugin and is not installed on its own:

```bash
claude plugin marketplace add izkreny/agentifico
claude plugin install gh-solo@agentifico
```

The plugin's own [README](../../README.md) has the requirements and what else installing it brings.

## Running it

Type `/gh-solo:setup` in the repository. The model never starts it on its own, because it rewrites repository settings.

It prints every change it would make and waits for your yes before the first write. A repository already in that state gets nothing written, so running it again is safe. It needs admin permission, so on a repository where you have less it refuses before reading anything else.

What it leaves to you: the required checks for a repository with CI, since their names come off a real pull request; the check commands in the scaffolded config; and the label taxonomy, which the `tracker` skill records once you settle it.

## Layout

| Path | Holds |
| --- | --- |
| `SKILL.md` | the steps: confirm the repository, show the changes, wait, apply, read them back |
| `scripts/setup.py` | every read and write, in a `plan` pass that writes nothing and an `apply` pass |
| `scripts/test-setup.sh` | the bench, against a faked `gh`, so no case can reach GitHub |
| `assets/gh-solo.md` | the config template, with an empty settings block |

Why each setting holds the value it does is in [pr-flow's settings reference](../pr-flow/references/repo-settings.md), and where a config lives in [its config reference](../pr-flow/references/repo-config.md).
