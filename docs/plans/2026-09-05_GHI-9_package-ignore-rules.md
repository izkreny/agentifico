> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Record where a package's ignore rules live

Closes #9. The arrangement already works - `plugins/gh-solo/skills/pr-flow/scripts/.gitignore` ignores the bytecode cache and `git status` is clean - but nothing states it, so the next package to generate an artifact has no rule to follow. This branch writes the rule into `AGENTS.md` and changes nothing else.

Independent of every open branch: one file changes, it is repository-level, and no package's version moves.

## The rule follows from a sentence the section already carries

*Each plugin, and each skill under `skills/`, is a package* already establishes that every path outside a `plugins/<name>/` or `skills/<name>/` directory is repository-level. Once that holds, where an ignore rule belongs is not a fresh decision: an ignore rule is a fact about one package's tooling, so putting it at a repository-level path would state one package's business where the repository states its own. The new prose therefore uses `repository-level` as the term that section defines, rather than re-deriving it: a second copy of a sentence in the same section is one that can drift from the sentence that owns it.

## One paragraph, in the package section

It goes in *Each plugin, and each skill under `skills/`, is a package* rather than in a section of its own: the rule is a consequence of the package model, and a heading for one paragraph would suggest the topic is bigger than it is. The paragraph carries all three cases the issue asks for - the package's own file, what a root file would be for, and the tool that ignores itself - because they are one rule read at three scopes rather than three rules.

**No root `.gitignore` is created.** Nothing in the tree belongs to no package: ruby-lsp's own directory writes a `.gitignore` containing `*` and ignores itself, and the scripts under `scripts/` are invoked rather than imported, so they leave no bytecode cache. The prose says what a root file is *for* without claiming one exists.

## A correction the issue owes

Its criterion reads `git ls-files --ignored --exclude-standard`, which exits 128: `fatal: ls-files -i must be used with either -o or -c`. The working form is `git ls-files -c --ignored --exclude-standard`, and that is what `## Verification` below carries. The criterion's wording is corrected on the issue when it is ticked.

## Steps

- Add the rule to *Each plugin, and each skill under `skills/`, is a package* in `AGENTS.md`, as one paragraph: a package's build artifacts are ignored by a `.gitignore` in that package's own directory, because an ignore rule is a fact about that package's tooling and a root file would state it at a repository-level path.
- Say in the same paragraph what a root `.gitignore` is for - an artifact belonging to no package - without enumerating what one would hold.
- Say that a tool writing its own self-ignoring `.gitignore` needs no entry anywhere else.
- Name `plugins/gh-solo/skills/pr-flow/scripts/.gitignore` as the instance, and what produces the artifact it covers.
- Correct the `git ls-files` criterion on the issue to the form that runs, and say so when ticking it.

## Verification

- The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- `python3 scripts/version-check.py`, which passes without exercising anything because only a repository-level file changes.
- `git status --porcelain` is empty after `plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` and every bench `.agents/gh-solo.md` names have run - the gate that proves the convention holds rather than merely being described.
- `git ls-files -c --ignored --exclude-standard` prints nothing, so no tracked file was made ignored.

**No gate reads the prose.** They see that backticked paths resolve, that fences close, that no package moved a version it owed, and that running the repository's own tooling leaves the tree clean. Whether the paragraph states the rule at the right altitude - one paragraph in an existing section rather than a section of its own - is the owner's judgement.

`python3 scripts/manifest-check.py` is not owed here: no manifest changes.

## Open questions

- None.

## Settled

- **Whether to create a root `.gitignore` while here.** No. Nothing in the tree belongs to no package, so the file would be empty, and a rule with no reader is what the issue's own notes argue against. The prose defines what a root file is for, which is what makes the next artifact placeable without one existing now.
