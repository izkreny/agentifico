# Dependency conventions for this repository

What an update round is, how each dependency in it moves, and what holds some of them where they are. This file wins on any conflict about dependency work. The GitHub conventions around the pull request that carries a round live in [`gh-solo.md`](gh-solo.md), which also owns every check command named here.

Read this before opening or working an update issue, bumping any package, editing a `<package-dir>/package.json` or a `<package-dir>/package-lock.json`, or moving a Vale floor.

## An update round

**One update issue covers every upgradable dependency in the repository**: the npm packages under each package directory, Node, and Vale. There is no CI, so there are no GitHub Actions to move. The inventory below is taken whole before the issue's scope is fixed. Whatever it finds either moves in that round or is named in the issue as left where it is, with what holds it.

**The npm commands run inside `<package-dir>`**, or with `--prefix <package-dir>` from the repository root. `<package-dir>` is any package directory that holds a `<package-dir>/package.json`.

### The inventory

Each entry is what to compare and the commands that read both sides:

- **The npm packages**: `npm outdated`, `npm outdated --all` and `npm audit`, each after `npm ci`. `npm outdated` covers the direct dependencies. `npm outdated --all` adds the transitive ones, and a row whose current version is below its wanted version is one `npm update` moves. An audit finding is in scope even where nothing is outdated.
- **Node**: the `engines` field in each `<package-dir>/package.json` against `mise latest node`. `engines` is a floor, so a newer Node moves nothing unless the floor has to rise.
- **Vale**: `vale --version` against `mise latest vale`, and each `MIN_VALE` against the version the round installs. A package that runs Vale names its floor as `MIN_VALE` in its own check script.

**Rehearse the npm moves on a copy before writing the issue.** Copy the `<package-dir>/package.json` and `<package-dir>/package-lock.json` into a scratch directory, and run each move there with `--package-lock-only --ignore-scripts`. Comparing the copy's lockfile against the original shows every version that moves, which is what the issue names.

## The update order

Vale moves before any npm package does, so the round's checks judge every later commit with the Vale it ships with.

1. **Vale**: the owner installs it, since that is a machine-wide install. Then the round runs every Vale-backed check under the new version.
2. **Each direct npm dependency**, by naming its version: `npm install --save-exact <package>@<version>`. That keeps the exact pin each `<package-dir>/package.json` here carries. A major release goes in its own commit, with its changelog read first.
3. **The lockfile**: `npm update`. It never moves an exact pin, so it moves only the transitive packages, inside the ranges their dependents declare.
4. **An audit fix**, only after reading `npm audit fix --dry-run --json`. Without `--force` the fix stays inside the declared ranges, but it can still lower a version inside one. Take it only when no version goes down. Never run it with `--force`, which may install a breaking major.

**A fix that lowers a version is a decision for the issue, not a step.** The next `npm update` usually raises the version straight back, and the advisory with it. The issue names the advisory as left open, and what would let it close.

Then compare the lockfile against the branch below it by version: no package should sit lower than it did.

## What an update round may fix

**Adapting the code to a bump goes in the round's pull request at any size**: a renamed API, a deprecation, a new lint rule, a rule case a new Vale reports differently. Anything that leaves the package's behaviour unchanged counts.

**A behaviour change the bump reveals goes in the round only when it is small**: at most 3 files and 5 changed lines, tests included, and named in the issue so the round's scope says so. Anything larger is a separate issue. The dependency that revealed it stays at its old version, named in the round's issue as left, until that issue lands.

## Floors

**A Vale floor moves with the round.** A run on an older Vale can report fewer alerts than one on the latest, and a lower count is a silent pass. Raising a floor refuses every installer on an older Vale, so it is a breaking change and moves that package's major version.

**A round that reaches another package's files splits that work into an issue of its own.** An epic covers one package, per *A package epic's last child is that package's sweep issue, and its branch is the stack's top branch* in [`AGENTS.md`](../AGENTS.md), so each package's floor moves on that package's own branch.
