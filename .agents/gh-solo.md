# gh-solo, in this repository

Per-repository facts the `gh-solo` plugin reads. Only what differs from its defaults, or what it refuses to guess, is written down here.

`AGENTS.md` holds what is true of this repository and not of this loop: what it is, its layout, and the package scheme. It is deliberately minimal, so a convention it does not state is owned by the plugin or by the agent's own instructions rather than missing.

## Check commands

There is no CI and no build. Everything below runs locally, and nothing else is a gate.

**The plugin's own files, this file, `AGENTS.md` and every plan**, from the repository root:

```bash
python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans \
  --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'
```

The ignore set is not optional and is not tuning. Without it the run reports every backticked path that belongs to a repository the plugin serves rather than to this one, and the output reads as failure. The script's own usage note is the authority on the set.

**It is deliberately narrower than that usage note's.** `--ignore` skips a matching *span* rather than a file, so `--ignore 'AGENTS.md'`, `--ignore 'CLAUDE.md'` and `--ignore '.agents/*'` would skip exactly the cross-links between this file and `AGENTS.md` - the spans most worth checking, since both files exist here where in a served repository they do not. Never add them back to make an output quieter.

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

## Labels

**The package axis replaces the plugin's Layer axis.** The plugin's own standards call the `backend`/`frontend`/`fullstack`/`infra`/`docs` set a default rather than a law, and this repository has no such split: it has packages, each released on its own tag. The axis rules carry over - exactly one value, mandatory, an epic exempt - but the plugin's *tooling* for them does not, per the audit below.

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

**The mandatory-axis audit has to be rewritten here, not reused.** The plugin's version names the five layer values it excludes, and none of them exists in this repository, so it excludes nothing and reports every open issue as unlabelled. This is the one that works:

```bash
gh issue list --state open --limit 100 --search "-label:epic -label:gh-solo -label:daisyui-designer -label:rails-style -label:review-text -label:skills-maker -label:socratic-tutor -label:repo"
```

**A new value in the table above is a new exclusion here.** A package label the query does not name is invisible to it, which is the same silent-pass failure the plugin's own version has here.

## The skill review is manual, and stays manual

**A change under `skills/` or under a plugin's own `skills/` tree owes a second manual review by the owner that no diff review covers:** `/skills-maker review <path>`. Both trees, whether or not the skill ships on its own tag.

So a skill change carries this as an `[owner]` verification entry, and **the reason is the skill's own `disable-model-invocation` flag rather than absent tooling** - the distinction that keeps a genuinely tool-closable check from being parked with the owner. An agent must not attempt the review by reading the skill's workflow files instead.

## What is deliberately not here

No branch `{type}` vocabulary, because the plugin's own is what this repository uses.
