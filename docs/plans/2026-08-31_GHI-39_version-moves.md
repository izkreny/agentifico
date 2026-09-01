> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Move a package's version when it changes (#39)

## Context

`AGENTS.md` states that each package carries its own version and that no package's version moves for another's change, which is the negative half of the rule only. The positive half - a change to a package's own files moves that package's version - is nowhere, and `390f9e5` is what its absence cost: six `gh-solo` skill files changed at `3.0.0`, with the `gh-solo_3.0.0` tag on the previous commit.

## Approach

The rule goes in `AGENTS.md`, which owns the package scheme, and `.agents/gh-solo.md` gains the check command and its bench, pointing at `AGENTS.md` for the rule rather than restating it.

The check is `scripts/version-check.py`, in the `repo` package. It maps every path a range touches to the package that owns it, reads that package's version at both ends of the range, and reports a package whose files moved while its version did not. **It cannot ship inside `plugins/gh-solo/`**: it encodes this repository's own package layout, where `plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` is generic by design, and putting it there would move `gh-solo`'s version for a `repo` change - the rule this branch adds.

**It reads paths, never the issue's label.** The label is a claim about the change and the diff is the change, so a mislabelled issue cannot pass. That also keeps the script offline and free of `gh`.

**It tests that the version increased, and says nothing about which part.** Which part is a judgement from the commit type (`feat` → minor, `fix` → patch), and that is rule prose read in review: a branch can carry mixed types, and the type the trunk sees does not exist until the PR title does.

## Steps

- Add `scripts/version-check.py`: map changed paths to packages, compare each package's version across the range, exit 0 clean, 1 on a package whose version did not increase, 2 on usage. A plugin's version is `plugins/<name>/.claude-plugin/plugin.json`'s `version`; a skill's is `metadata.version` in `skills/<name>/SKILL.md`'s frontmatter. Repository-level paths - `docs/`, `scripts/`, `.agents/`, `AGENTS.md`, both manifests at the root - belong to no package and oblige nothing.
- Give it the range interface `version-check.py [<range>]`, defaulting to `origin/main...HEAD` so the merge base is the comparison point. `origin` is hardcoded, which a repo-package script may do where a plugin script may not.
- Treat a package absent at the base as version `0.0.0`, so a package added on a branch passes on any version it declares.
- Fail distinctly, and non-zero, on a package that carries no version field at all, naming the missing field rather than any issue that would supply it.
- Add `scripts/test-version-check.sh`: replay `ae1cd1a...390f9e5` and require a failure, replay `91933a2`'s own range and require a pass, and cover the added-package case synthetically.
- State the positive rule in `AGENTS.md`'s package section, beside the negative half already there, and add the `scripts/` row to its layout table.
- Record the check command and the bench in `.agents/gh-solo.md` under `## Check commands`, pointing at `AGENTS.md` for the rule.

## Verification

- `python3 scripts/version-check.py` from the repository root, on this branch
- `bash scripts/test-version-check.sh`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`

**The bench is the watched-fail gate, turned into an exit code.** `390f9e5` is a real commit that breaks the rule, so the check is seen refusing something before it is trusted, and the bench keeps it seen rather than leaving it a one-off observation.

**This branch's own run passes without exercising anything.** Everything it touches is repository-level, so no package is in scope and the check has nothing to compare. That is the correct answer for this diff, not the check failing to run.

**What none of these see:** whether the version part that moved matches the commit type. Only a reader can judge that.

## Open questions

- Whether the plugin's marketplace entry ever grows a `version` field is #28's to settle. If it does, this check gains a second field to compare, and the two can drift the way `keywords` and `tags` already have per #33.

## Settled

None yet.
