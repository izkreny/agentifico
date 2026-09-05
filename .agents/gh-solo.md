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

The ignore set is not optional and is not tuning. Without it the run reports every backticked path that belongs to a repository the plugin serves rather than to this one, and the output reads as failure. The script's own usage note documents the set that keeps the *plugin's* tree clean; for this repository the command above is the authority, and it is narrower.

**Why it is narrower.** `--ignore` skips a matching *span* rather than a file, so `--ignore 'AGENTS.md'`, `--ignore 'CLAUDE.md'` and `--ignore '.agents/*'` would skip exactly the cross-links between this file and `AGENTS.md` - the spans most worth checking, since both files exist here where in a served repository they do not. Never add them back to make an output quieter.

**`skills/` is deliberately not a target.** Those skills carry home-relative paths this script cannot resolve, and they are checked by their own tooling, so widening the target to the repository root reports failures that are not failures.

**Read the exit code, not the output.** A run piped through `tail` reports the pipe's status, so a chained command runs anyway; this has caused a broken path to be committed here twice. Use `set -o pipefail`, or read `${PIPESTATUS[0]}`, or do not pipe it.

**Every package a branch touches has moved its own version**, per *Each plugin, and each skill under `skills/`, is a package* in `AGENTS.md`, which owns the rule:

```bash
python3 scripts/version-check.py
```

It compares `origin/main...HEAD` by default and takes a range or a single commit instead. It reads the paths a change touches rather than the issue's package label, so relabelling an issue cannot satisfy it; which part of the version moved is left to a reader, since one branch can carry several commit types.

**The stacked release train asks nothing of this script, and the reason is not that each branch is checked alone.** `origin/main...HEAD` resolves through `git merge-base`, which on an upper branch of a stack predates every branch below it, so the range spans the whole stack and a lower branch's bump satisfies an upper branch that moved no version. What the check still gates is the thing the tag depends on: that the stack as a whole moved the package's version before `gh stack merge` publishes it. Per-branch bumping inside a stack is a rule this script cannot see, and nothing else here catches it either: it holds because each branch is written to hold it, not because a gate refuses when it does not.

Every branch's plan lists it in `## Verification`, which is what makes it a gate rather than a command nobody runs: `ready` and `merge` both refuse on an unticked box. A branch touching no package passes it without exercising anything, and that is the correct answer for such a branch rather than a reason to leave it out.

**The version check's bench**, after any edit to `scripts/version-check.py`:

```bash
bash scripts/test-version-check.sh
```

**The posting script's bench**, after any edit to `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`:

```bash
bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh
```

**The watch script's bench**, after any edit to `plugins/gh-solo/skills/pr-flow/scripts/watch.py`:

```bash
bash plugins/gh-solo/skills/pr-flow/scripts/test-watch.sh
```

**The trunk-push hook's bench**, after any edit to `plugins/gh-solo/hooks/ask-before-trunk-push.py`:

```bash
bash plugins/gh-solo/hooks/test-ask-before-trunk-push.sh
```

**What a plugin's two manifests share, and which fields must be kept in step.** A plugin's entry in `.claude-plugin/marketplace.json` and its own `plugins/<name>/.claude-plugin/plugin.json` overlap by schema rather than by convention: an entry may carry any field of the plugin manifest, plus the entry-only `source`, `category`, `tags`, `strict`, `relevance`, `headers` and `headersHelper`. So the answer is finite and worth writing out rather than remembering.

| Field | Lives in | Kept in step |
|---|---|---|
| `name` | both | Yes, exactly. It is the plugin's id, and two names disagreeing is a marketplace entry pointing at nothing. |
| `description` | both | Yes. This is the pair that has drifted before, which is why the agreement is checked rather than remembered. |
| `keywords` in the manifest, `tags` in the entry | one each | Yes, the same values. They are different fields with different names, and nothing here wants a plugin advertised differently in the two places; they have already drifted by one value. |
| `version` | the manifest only | No, and never. The entry's copy is read only when the manifest has none, so a version there could drift and could never be read - `AGENTS.md` owns why, under *How a package is released*. |
| `homepage` | the manifest only | No, for the reason `author`, `repository` and `license` are not: the marketplace's own `owner` block already says who publishes this, so an entry's copy would buy a drift surface and nothing else. |
| `author`, `repository`, `license` | the manifest only | No. The marketplace's own `owner` block already says who publishes this, so copying them into an entry buys a drift surface and nothing else. |
| `category`, `source` | the entry only | No; the plugin manifest has no such fields. |
| `strict`, `relevance`, `headers`, `headersHelper` | the entry only | No; the plugin manifest has no such fields, and no entry here sets them. An entry that gains one owes this table a row of its own rather than falling under this one. |

**The agreement is checked rather than remembered**, because prose alone has now failed at it twice - once on `description` and once on `keywords`:

```bash
python3 scripts/manifest-check.py
```

It reads every plugin the marketplace lists, so a second plugin landing beside the first needs no edit here and none in the script. What it decides is the table's `name`, `description` and `keywords`/`tags` rows plus the absence of `version` from the entry - the rows whose answer a script can decide, the rest being judgement. A branch touching any manifest owes this run; a branch touching none does not.

**The manifest check's bench**, after any edit to `scripts/manifest-check.py`:

```bash
bash scripts/test-manifest-check.sh
```

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

**The mandatory-axis audit has to be rewritten here, not reused.** The plugin's version names the layer values it excludes, and none of them exists in this repository, so it excludes nothing and reports every open issue as unlabelled. This is the one that works:

```bash
gh issue list --state open --limit 100 --search "-label:epic -label:gh-solo -label:daisyui-designer -label:rails-style -label:review-text -label:skills-maker -label:socratic-tutor -label:repo"
```

**A new value in the table above is a new exclusion here.** A package label the query does not name is invisible to it, which is the same silent-pass failure the plugin's own version has here.

## The skill review is its own issue, not a branch's gate

**`/skills-maker review <path>` reviews a whole skill, so it is never a `## Verification` entry.** A skill change carries no such box. Run once against `plugins/gh-solo/skills/pr-flow`, it returned nine findings and not one was in the diff of the branch that triggered it; a per-branch gate built on a whole-file review reports something unrelated every time, and such a gate gets waved through.

**The sweep is its own issue, one per package, and it must have run before that package's `<name>_<version>` tag is cut**, carrying that package's own label. Open is not run: an issue nobody has worked is a review nobody has done, and a tag over one asserts something untrue, which is the whole thing a tag is for here. A release is when the whole file matters, and a trigger tied to one fires where a habit does not.

**Where a package's work is an epic, that sweep issue is the epic's last child**, per *How a package is released* in `AGENTS.md`, which owns the rule and the reason.

**The change itself is covered by the round**, against the standard `AGENTS.md` states under *Skill files follow the skills-maker rules*. The reviewer reads that file by its own precedence, so a broken mechanical rule is an ordinary `standards` finding.

## An epic child's blocker is its stack parent, not a wait

**`plugins/gh-solo/skills/pr-flow/workflows/open.md` stops on an open `blockedBy`, and a child cut from that blocker's own branch tip is the exception.** Per *An epic's work is stacked, and the stack is the release train* in `AGENTS.md`, every child of an epic but the bottom one is cut from the branch below it and lands with the stack rather than before it, so the stop fires on the epic's normal shape.

**Both reasons the stop gives are void in that shape.** The plan is written against a tree that already contains the blocker's work, so landing the blocker rewrites nothing; and not merging first is what the stack is for rather than an obstacle to it.

**The exception is that shape and nothing wider.** The blocking issue's branch must exist, must be the branch the new one is cut from, and must be the new pull request's `--base`. A blocker carrying no branch, or one the child is not stacked on, is an ordinary wait and the stop holds unchanged.

**Say which of the two it is, and name the branch the child was cut from.** A run that claims the exception is then readable back off the pull request's base rather than taken on trust.

**Never clear the relation to get past the stop.** `blockedBy` is what records the stack's order, and removing it to satisfy a gate destroys the only typed record of which branch sits under which.

## The commit header format

No branch `{type}` vocabulary is recorded here, because the plugin's own is what this repository uses.

**A branch commit here carries its package label as a scope**, `fix(gh-solo): the description (#63)` and `docs(repo): the description (#84)`, where *Branch and commit type* in `plugins/gh-solo/skills/tracker/references/formats.md` leaves the header at `{type}: {description} (#{issue-number})`. That is an override under *Repository-specific conventions live in the repository* in `plugins/gh-solo/skills/pr-flow/SKILL.md`, not a second opinion about the plugin's rule.

**The ban's reasons do not decide it here.** The value does repeat on a branch, and it costs nothing to: it is decided once by the issue's package label, and it buys a commit that names its package in any read crossing branches, which a repository shipping several packages has and a single-deliverable one does not. Squashing deletes it, which is why the pull request title carries it onto the trunk.

**The pull request title's own scope rule is unchanged, and a pushed header is never rewritten to match this record.**
