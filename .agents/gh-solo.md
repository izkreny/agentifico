# gh-solo, in this repository

Per-repository facts the `gh-solo` plugin reads. Only what differs from its defaults, or what it refuses to guess, is written down here.

`AGENTS.md` owns everything about this repository that is not this loop: what it is, its layout, the package scheme. This file points at it rather than restating any of it.

## Check commands

There is no CI and no build. Everything below runs locally, and nothing else is a gate.

**The plugin's own files, this file, `AGENTS.md` and every plan**, from the repository root:

```bash
python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans \
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

## Labels

**The package axis replaces the plugin's Layer axis.** The plugin's own standards call the `backend`/`frontend`/`fullstack`/`infra`/`docs` set a default rather than a law, and this repository has no such split: it has packages, each released on its own tag. The axis rules carry over untouched - mandatory, exactly one per issue, an epic exempt.

| Label | The deliverable is |
|---|---|
| `gh-solo` | `plugins/gh-solo/` |
| `daisyui-designer` | `skills/daisyui-designer/` |
| `rails-style` | `skills/rails-style/` |
| `review-text` | `skills/review-text/` |
| `skills-maker` | `skills/skills-maker/` |
| `socratic-tutor` | `skills/socratic-tutor/` |
| `repo` | the repository itself: `README.md`, `.claude-plugin/marketplace.json`, `LICENSE`, `AGENTS.md`, this file |

**The label is where the deliverable lands, not every directory the branch touches.** A change to the plugin that also updates its README is `gh-solo`; ask what the issue would be closed *for*.

**A new package arrives with a new value.** The axis is the set of packages, so it grows when `plugins/` or `skills/` does, and this table is what a new directory owes an edit to.

## The skill review is manual, and stays manual

**A change to a skill owes a second manual review by the owner that no diff review covers:** `/skills-maker review <path>`.

So a skill change carries this as an `[owner]` verification entry, and **the reason is the skill's own `disable-model-invocation` flag rather than absent tooling** - the distinction that keeps a genuinely tool-closable check from being parked with the owner. An agent must not attempt the review by reading the skill's workflow files instead.

## What is deliberately not here

No branch `{type}` vocabulary, because the plugin's own is what this repository uses.
