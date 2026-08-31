> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Fix what the version check misreads (#41)

## Context

`scripts/version-check.py` shipped in `368f923` with two misreads, both introduced by #40's own review fixes. One is silent: a branch that deletes a package's manifest while the package itself survives passes the gate, so a package can ship with nothing left to compare a version against. The other is cosmetic but misdirecting: `1.1.0` rewritten as `1.1` is reported as a version that moved backwards.

## Approach

**The base-side guard asks the wrong question.** `problems` currently reads the manifest at the base to decide whether a manifest missing at the head is a retirement, and a retirement is the only case it is meant to let through. What actually separates a retirement from a manifest deleted out from under a live package is whether any of that package's files survive at the head, which is a head-side question and is what the guard becomes: `git ls-tree -r --name-only <head> -- <label>/` empty means the package is gone and nothing is owed; non-empty means the package is there without its manifest, and the existing "carries no `<manifest>`" message names it.

**`parse` returns a tuple as long as the version has parts**, so `(1, 1)` sorts below `(1, 1, 0)` and the `new < old` arm fires on a version that did not change. Both sides get padded with zeros to a common length before comparing. The comparison is the only thing that reads the padded values - the messages keep printing the parsed originals, so a genuine backwards move from `1.2` still reports `1.2` rather than `1.2.0`.

**One behaviour changes that neither acceptance criterion names.** A directory under `plugins/` or `skills/` that never carried a manifest at all and is deleted wholesale by the branch is refused today and passes after this change. That is the right answer - it is a retirement, whatever the directory carried while it existed - but it is a decision rather than a side effect, so it is written down here.

**The bench comes first.** `368f923` is the tip of `main`, so the working tree holds the pre-fix script until the fix is written: adding the cases and running the bench once before touching `scripts/version-check.py` is the watched failure, with no copy of the old script to restore.

## Steps

- Add two synthetic commits to `scripts/test-version-check.sh`: a second package carrying a file beside its manifest, then its version rewritten `1.1.0` → `1.1`, then its manifest deleted while that other file remains and changes.
- Add the two cases that read them - the shortened version must say it stayed rather than went back, the orphaned manifest must be refused by name - and run the bench to watch exactly those two fail against the unfixed script.
- Replace the base-side retirement test in `problems` with the head-side survival test, so a manifest missing at the head passes only when the package has no files left there.
- Pad both parsed versions to a common length before the `<` and `==` comparisons, leaving the message text reading the unpadded values.
- Run the bench again: the two new cases pass and the existing retirement case is still quiet.

## Verification

- [ ] `bash scripts/test-version-check.sh`
- [ ] `python3 scripts/version-check.py`
- [ ] `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`

**The bench is the gate that matters here, and its two new cases are only worth their exit code because they were watched failing first.** Running it before the fix is a step above rather than a nicety.

**This branch's own version check passes without exercising anything.** `scripts/` is repository-level, so no package is in scope - the same correct silence #39's branch got.

**What none of these see:** whether `git ls-tree` is the right question to ask about survival on a repository whose packages are laid out differently from this one. The script is deliberately repository-specific, so that is a judgement about this tree rather than a gate.

## Open questions

None.
