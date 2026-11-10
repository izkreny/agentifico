# Where a repository's config lives

Every skill in this plugin, and the `reviewer` agent, looks for a repository's config in these files, in this order, and reads the earliest one that exists:

1. `$XDG_CONFIG_HOME/gh-solo/<owner>/<repo>.md`
2. `<repo-root>/.agents/gh-solo.md`
3. `<repo-root>/.claude/gh-solo.md`

`$XDG_CONFIG_HOME` is read from the environment, and `<home-dir>/.config` stands in for it where it is unset, empty or a relative path, as the XDG Base Directory specification says. On most machines the user-level file is therefore `<home-dir>/.config/gh-solo/<owner>/<repo>.md`.

**The first file found is the whole config.** Nothing is merged in from a later one, so a key the found file leaves out falls back to the plugin's default, never to another file in the list.

**`<owner>/<repo>` is the `nameWithOwner` that `gh repo view --json nameWithOwner` reports** from the working directory. Every `gh` command in this plugin writes to that repository, so keying the file by the same name means the config that is read and the tracker that is written are always one repository.

**The in-repo file is the default.** A repository the owner owns wants its config committed and reviewed like any other file. The user-level file is for a tree that is not the owner's to write config into, such as a fork made to contribute upstream: a committed file there would land on the branch the upstream pull request is opened from. Every worktree of a clone shares the user-level file, and no commit to the clone can carry it, while a repository of the owner's own that tracks their config directory can still version it.

## The keys

**Every key the plugin reads sits in one fenced `json` block in the config file**, as one JSON object. The rest of the file is prose: an agent reads it as the repository's conventions, and the script reads it only to refuse, never for a key. A file with no block sets no key, so every default applies.

```json
{
  "reviewer_model": "opus",
  "test_files": "spec/**/*_spec.rb"
}
```

| Key | What it holds |
| --- | --- |
| `reviewer_model` | the model a review round asks the `reviewer` spawn for |
| `test_files` | a git pathspec glob naming the repository's tests, which turns the criteria gate on |
| `mandatory_labels` | an object: `axis` names the mandatory axis, and `values` maps each of its labels to what that label's deliverable is |
| `branch_name_format` | the branch-name template |
| `commit_types` | the Conventional Commits types a branch name, a commit header and a PR title may take |
| `use_issue_types` | `true` where the repository uses GitHub issue types |
| `default_branch` | the trunk's name |
| `remote` | the remote's name |
| `commit_scope` | `"label"`, giving every branch commit the issue's mandatory-axis label as its scope |

`get-all` shows the value in force for each. A `null` there means the plugin does without the key: the `reviewer` agent's frontmatter picks the model, the criteria gate is off, the remote is the one the recipe in `SKILL.md`'s remote-name convention resolves, and branch commits carry no scope.

### Reading a key

**Read a key with the script, never from the file by eye**, so every reader gets the same answer and every refusal the script owns fires:

```bash
python3 <skill-dir>/scripts/read-config.py get <key>
python3 <skill-dir>/scripts/read-config.py get-all
```

`get-all` prints every key at once, as one JSON object: the config's value, or else the default, or `null` where a key is unset and has no default.

From the `tracker` and `implement` skills, the script is `<skill-dir>/../pr-flow/scripts/read-config.py`. Exit `0` prints the value, the config's or else the default `scripts/defaults.json` holds: a string as it is, anything else as JSON. Exit `1` means the key is unset and the plugin does without it, as *The keys* says. Exit `2` is a refusal printed as a `⛔ REFUSED` line, or a read that could not run: stop and relay it, since the gate that key feeds cannot be trusted.

### What refuses

**A config the script cannot read exactly refuses, with no fallback**, because a key read wrong, or not read at all, switches a gate off without a sound. Which configs refuse, and what each refusal prints, is `scripts/read-config.py`'s to say, and `scripts/test-read-config.sh` holds a case for each.

## Writing a config

**Where a repository has no config and one is to be written**, offer `<repo-root>/.agents/gh-solo.md` in the owner's own project, and the user-level file in a fork or any other tree whose commits are bound for someone else's repository.
