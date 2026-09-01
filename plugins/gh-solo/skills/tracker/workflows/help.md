**`tracker`** - manage a GitHub issue tracker you own, through `gh`.

For repositories you own and commit to alone. A client setting scope and dates is fine, and so is a mentor who comments on issues and reviews PRs; a second committer or a QA sign-off that gates a merge is not. The test is who **writes**, not who is involved.

**Commands**

| Command                               | What it does                                                                            |
|---------------------------------------|-----------------------------------------------------------------------------------------|
| `create issues for [description]`     | Break a feature into issues, show the plan, create on confirmation                      |
| `next`                                | Offer the top three startable issues, ordered, with why each is a candidate             |
| `status`                              | Summarise the issue behind the current branch                                           |
| `status 50`                           | Summarise a specific issue                                                              |
| `validate`                            | Check the current branch's issue against the standards                                  |
| `validate 50`                         | Check a specific issue                                                                  |
| `search [query]`                      | Find issues by label, state or free text                                                |
| `state 50`                            | Close, reopen, mark blocked, or start a branch                                          |
| `start 50`                            | Assign `@me` and cut the branch                                                         |
| `finish 50`                           | Write a draft issue's missing description, run the split test, remove the `draft` label |
| `close 50` / `reopen 50` / `block 50` | One state change, with the right close reason                                           |
| `milestone`                           | Create one, move its date, close it on scope                                            |
| `help`                                | This page                                                                               |

Bare invocation with a description routes to `create`.

An issue you want in the backlog before you have time or information to describe it gets the `draft` label: title and layer label as normal, body a stub. It stays invisible to `next` until `finish` removes the label. `search draft` lists them.

**Auto-triggers**

- A `#50` number, or "what's left on this one" → status
- "close this", "reopen", "set it aside", "this is blocked" → state
- "find the issue about X", "which are still open" → search
- "break this into issues" → create
- "park this as a draft", "finish the draft" → create

**Prerequisites**

- `gh`, authenticated with the `repo` scope. Check with `gh auth status`.
- Labels must exist before they can be applied; `gh issue create` fails on an unknown label rather than creating it. See `gh label list`.
- Optional: `.agents/gh-solo.md` in the repository, recording its label taxonomy, branch format and whether it uses issue types.

Setup and the failures that read as something else: `references/github-access.md`

**What GitHub does not have**

No time logging, no story-point gate, no typed "relates to" link, and no status field beyond open and closed. Those are genuinely absent from GitHub rather than declined here. In-progress is carried by the assignee instead: `@me` while you are working on it, cleared when you set it aside, and a PR saying `Closes #50` ends it when the code merges.

Milestones are the exception people expect to find on that list. They exist, they carry a due date, and this skill uses them heavily — closed on scope rather than on the calendar. See *Milestones, and why not Projects* in the standards.

**Standards:** `references/standards.md`
