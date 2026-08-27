# gh-solo, in this repository

Per-repository facts the `gh-solo` plugin reads. Only what differs from its defaults, or what it refuses to guess, is written down here.

## Check commands

There is no CI and no build. Everything below runs locally, and nothing else is a gate.

**The plugin's own files**, from the repository root:

```bash
python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md \
  --ignore '.agents/*' --ignore '.claude/*' --ignore 'AGENTS.md' --ignore 'CLAUDE.md' \
  --ignore 'docs/plans*' --ignore '*GHI-50*'
```

The ignore set is not optional and is not tuning. Without it the run reports every backticked path that belongs to a repository the plugin serves rather than to this one, and the output reads as failure. The script's own usage note is the authority on the set. `--ignore` skips a matching *span* rather than a file, so this file is checked even though `.agents/*` is ignored inside it.

**`skills/` is deliberately not a target.** Those skills carry home-relative paths this script cannot resolve, and they are checked by their own tooling, so widening the target to the repository root reports failures that are not failures.

**Read the exit code, not the output.** A run piped through `tail` reports the pipe's status, so a chained command runs anyway; this has caused a broken path to be committed here twice. Use `set -o pipefail`, or read `${PIPESTATUS[0]}`, or do not pipe it.

**The posting script's bench**, after any edit to `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`:

```bash
bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh
```

**The trunk-push hook's bench**, after any edit to `plugins/gh-solo/hooks/ask-before-trunk-push.py`:

```bash
bash plugins/gh-solo/hooks/test-ask-before-trunk-push.sh
```

**Both manifests carry the plugin's description**, `.claude-plugin/marketplace.json` and `plugins/gh-solo/.claude-plugin/plugin.json`, and they have drifted before. A change to either is a change to both.

**Mermaid diagrams in any README** are verified by rendering them, never by reading them. `mmdc` needs a puppeteer config naming a browser executable; one key is enough, and the renderer exits non-zero with a parse error on a broken diagram, which is what makes a clean run mean something.

## Skills outside the plugin

`skills/` holds skills that ship independently of `gh-solo` and are versioned by their own tags, `<name>_<version>`. A change to one of those is not a change to the plugin, and the plugin's version does not move for it.

## This repository does not run its own issue doctrine

**Deliberately, and it is not an oversight to correct.** Work here is committed on a branch and opened as a pull request for reading, with no tracker issue behind it and no `Closes` line in the body. So on this repository:

- The `tracker` skill has nothing to operate on. It should not create issues here, and it should not offer to write a label taxonomy.
- A branch name will not carry a `GHI-` key, and the parse that recovers an issue number from it will find nothing. That is expected: the reviewer and the review round both say so where an issue is absent rather than inventing one, and the spec axis has nothing to review against.
- The convention checks that gate on `Closes #{issue-number}` and on the branch format will fail by construction. Report them and carry on; they are not defects in the branch.

## What is deliberately not here

No label taxonomy, no layer set, no branch `{type}` vocabulary, because nothing here uses them. No default-branch name and no remote name, because `main` and a single `origin` are exactly what the plugin already assumes. No `Reviewer agent:` or `Reviewer command:` line, so rounds use the reviewer the plugin ships.
