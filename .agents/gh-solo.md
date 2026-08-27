# gh-solo, in this repository

Per-repository facts the `gh-solo` plugin reads. Only what differs from its defaults, or what it refuses to guess, is written down here.

`AGENTS.md` owns everything about this repository that is not this loop: what it is, its layout, the package scheme, the prose conventions, and what a public repository must not carry. This file points at it rather than restating any of it.

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

## The issue doctrine this repository runs

Work here is backed by an issue, and the plugin's defaults apply unchanged:

- **A branch is `{type}/GHI-{issue-number}_{slug}`**, so the parse that recovers an issue number from a branch name finds one.
- **A pull request body carries `Closes #{issue-number}`**, and the issue closes on merge.
- **The `tracker` skill operates here.** It may create issues, and the taxonomy it would otherwise offer to write is the package axis below.
- **The reviewer is the one the plugin ships.** There is no `Reviewer agent:` or `Reviewer command:` line, deliberately.

This was not always true. Until the axis below existed, branches here carried no issue and the convention checks that gate on the branch format and on `Closes` were expected to fail; that exemption is gone, and a failure in either is now a real finding.

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

**Recording a value here is not creating its label.** Labels are never created in advance: `gh label create` runs in the same breath as the first `gh issue create` or `gh issue edit` that applies one, so the picker only ever holds labels something carries. A value in the table above with no label yet is the normal state, not a gap to fill.

Every other axis is the plugin's, unchanged, and its defaults are still expressed by carrying no label - so `bug` and `spike` exist as they are needed, and there is no `feature` label and no `enhancement` label, those being two names for the value that lands on almost everything.

## The skill review is manual, and stays manual

**A change to a skill owes a second review no diff review covers:** whether the skill still works *as a skill*. That pass is `skills/skills-maker/workflows/review.md`, with `skills/skills-maker/workflows/check.md` as its mechanical half, and it applies to a change under `skills/` or under a plugin's own `skills/` tree.

**The owner starts it by hand**, typing the skill's command in a session of their own. No agent can start it and none is failing to:

- `skills/skills-maker/SKILL.md` sets `disable-model-invocation: true` and its description says "Explicit invocation only", so the skill does not appear in an agent session's skill listing at all.
- The review round's reviewer cannot be handed over either. What a round spawns is a sidechain of the orchestrating session rather than a session of its own, so there is no session id to resume and nothing for the owner to type into.

**Neither costs anything, which is why this is not a workaround.** The skill takes a path and its first step is to read every file in the skill's directory, so a session that has just reviewed the diff hands it nothing it does not read for itself. The owner typing the command is the route, not a degraded substitute for one.

So a skill change carries this as an `[owner]` verification entry, and **the reason is the skill's own flag rather than absent tooling** - the distinction that keeps a genuinely tool-closable check from being parked with the owner. An agent must not attempt the review by reading the skill's workflow files instead: those lean on facts stated in `skills/skills-maker/SKILL.md`, so a hand-read pass either misses them or needs a file enumeration that goes stale the first time the skill's routing changes.

## What is deliberately not here

No branch `{type}` vocabulary, because the plugin's own is what this repository uses. No default-branch name and no remote name, because `main` and a single `origin` are exactly what the plugin already assumes. No `Reviewer agent:` or `Reviewer command:` line, so rounds use the reviewer the plugin ships - which is stated once under *The issue doctrine this repository runs* and not repeated as a fact here.
