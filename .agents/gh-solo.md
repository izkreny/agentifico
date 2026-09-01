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

**The stacked release train asks nothing of this script.** Each branch in a stack bumps its own package exactly as any branch does, and the comparison is against `origin/main`, so every branch passes on its own account rather than on the stack's - which is why `AGENTS.md` can state the train without a line of this file's tooling changing.

Every branch's plan lists it in `## Verification`, which is what makes it a gate rather than a command nobody runs: `ready` and `merge` both refuse on an unticked box. A branch touching no package passes it without exercising anything, and that is the correct answer for such a branch rather than a reason to leave it out.

**The version check's bench**, after any edit to `scripts/version-check.py`:

```bash
bash scripts/test-version-check.sh
```

**The posting script's bench**, after any edit to `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`:

```bash
bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh
```

**The trunk-push hook's bench**, after any edit to `plugins/gh-solo/hooks/ask-before-trunk-push.py`:

```bash
bash plugins/gh-solo/hooks/test-ask-before-trunk-push.sh
```

**What the two manifests share, and which fields must be kept in step.** `.claude-plugin/marketplace.json`'s `gh-solo` entry and `plugins/gh-solo/.claude-plugin/plugin.json` overlap by schema rather than by convention: an entry may carry any field of the plugin manifest, plus the entry-only `source`, `category`, `tags`, `strict`, `relevance`, `headers` and `headersHelper`. So the answer is finite and worth writing out rather than remembering.

| Field | Lives in | Kept in step |
|---|---|---|
| `name` | both | Yes, exactly. It is the plugin's id, and two names disagreeing is a marketplace entry pointing at nothing. |
| `description` | both | Yes. This is the pair that has already drifted, which is why the rule was written before the table was. |
| `keywords` in the manifest, `tags` in the entry | one each | Yes, the same values. They are different fields with different names, and nothing here wants the plugin advertised differently in the two places; they have already drifted by one value. |
| `version` | the manifest only | No, and never. The entry's copy is read only when the manifest has none, so a version there could drift and could never be read - `AGENTS.md` owns why, under *How a package is released*. |
| `author`, `repository`, `license` | the manifest only | No. The marketplace's own `owner` block already says who publishes this, so copying them into the entry buys a drift surface and nothing else. |
| `category`, `source` | the entry only | No; the plugin manifest has no such fields. |

**The agreement is checked rather than remembered**, because prose alone has now failed at it twice - once on `description` and once on `keywords`:

```bash
python3 -c 'import json, sys
e = next(x for x in json.load(open(".claude-plugin/marketplace.json"))["plugins"] if x["name"] == "gh-solo")
p = json.load(open("plugins/gh-solo/.claude-plugin/plugin.json"))
bad = [f for f in ("name", "description") if e.get(f) != p.get(f)]
if sorted(e.get("tags", [])) != sorted(p.get("keywords", [])): bad.append("tags/keywords")
if "version" in e: bad.append("version, which the entry must not carry")
print("gh-solo manifests: " + (", ".join(bad) + " out of step" if bad else "in step"))
sys.exit(1 if bad else 0)'
```

It reads the table's first three rows and the `version` row, which are the only ones with an answer a script can check. A branch touching either manifest owes this run; a branch touching neither does not.

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

**The change itself is covered by the round**, against the standard `AGENTS.md` states under *Skill files follow the skills-maker rules*. The reviewer reads that file by its own precedence, so a broken mechanical rule is an ordinary `standards` finding.

## What is deliberately not here

No branch `{type}` vocabulary, because the plugin's own is what this repository uses.
