# GitHub access

There is one route to the tracker, `gh` in a shell, and it needs no MCP server, no OAuth grant held elsewhere, and no token in a file this skill can read.

## Requirements

- **A `gh` that has sub-issues and dependencies.** `--parent` and `--add-sub-issue`, `--blocked-by` and `--add-blocked-by` are what the epic and dependency halves of `references/standards.md` need. They are present in any current `gh`; if one is ever rejected as unknown, `gh issue create --help` is the answer rather than a version number.
- **An authenticated account** with write access to the repository.

## Check, once per session

```bash
gh auth status
```

It prints the account, how the token is stored, and the token's scopes. Two lines matter:

- **`repo`** must be among the scopes. Everything this skill does needs it.
- **Active account: true** on the account that owns the repository. `gh` supports several accounts at once, and an inactive one produces confident 404s on repositories that plainly exist.

Then confirm where you are pointed:

```bash
gh repo view --json nameWithOwner,viewerPermission
```

Every `gh issue` command infers the repository from the working directory. That is convenient and it is the single biggest hazard in this skill: run one from the wrong directory and it succeeds against the wrong tracker. Confirm once per session, and pass `--repo owner/name` explicitly whenever the working directory is not the repository being discussed.

If authentication fails, `gh auth login` and pick SSH or HTTPS to match the remote. Nothing in this skill should attempt to repair auth on the owner's behalf.

## Failures that read as something else

**A label that does not exist is a hard error, not a silent skip.** `gh issue create --label epic` fails outright if nobody ran `gh label create epic`. The message names the label, but it arrives after the title and body were accepted, so it reads like the create failed for a deeper reason. Run `gh label list` before a batch create and make the missing ones first.

**`--type` fails on a repository that cannot have issue types.** An unknown type is an error rather than a no-op, and a repository owned by a personal account has no types at all, so every `--type` there fails. That is normal rather than misconfigured, and the *Issue types are for organizations only* section of `references/standards.md` has the why and the one exception.

**`--project` needs a scope the default login does not grant.** A token from a plain `gh auth login` typically carries `repo`, `read:org` and `gist`, and adding an issue to a Project needs `project` on top. The failure is a 403 mentioning scopes, not a message about projects. Fix with `gh auth refresh -s project`, and only if the repo actually uses Projects; a solo tracker usually does not need one.

## What is deliberately not here

No token lives in any file this skill reads, and none should be added. `gh` holds credentials in the system keyring or its own config, and the correct way to inspect them is `gh auth status`, which redacts the value. If a task genuinely needs a raw token, `gh auth token` prints one on demand, and it should be piped into the consuming command rather than written down.

There is no API-token environment variable here and no `.env` entry to maintain. The credential is managed by a tool that already exists on the machine, instead of by this repository.
