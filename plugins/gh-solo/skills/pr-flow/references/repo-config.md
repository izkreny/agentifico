# Where a repository's config lives

Every skill in this plugin, and the `reviewer` agent, looks for a repository's config in these files, in this order, and reads the earliest one that exists:

1. `<home-dir>/.agents/gh-solo/<owner>/<repo>.md`
2. `<repo-root>/.agents/gh-solo.md`
3. `<repo-root>/.claude/gh-solo.md`

**The first file found is the whole config.** Nothing is merged in from a later one, so a key the found file leaves out falls back to the plugin's default, never to another file in the list.

**`<owner>/<repo>` is the `nameWithOwner` that `gh repo view --json nameWithOwner` reports** from the working directory. Every `gh` command in this plugin writes to that repository, so keying the file by the same name means the config that is read and the tracker that is written are always one repository.

**The in-repo file is the default.** A repository the owner owns wants its config committed and reviewed like any other file. The user-level file is for a tree that is not the owner's to write config into, such as a fork made to contribute upstream: a committed file there would land on the branch the upstream pull request is opened from. Every worktree of a clone shares the user-level file, and nothing can commit it.

**An untracked in-repo file is not the same fix.** Excluding it from git keeps it out of commits, but each worktree is its own tree, so every worktree needs its own copy and a fresh clone has none.

**Where a repository has no config and one is to be written**, offer `<repo-root>/.agents/gh-solo.md` in the owner's own project, and the user-level file in a fork or any other tree whose commits are bound for someone else's repository.
