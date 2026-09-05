> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Document how a package tag is cut

Closes #61. `AGENTS.md`'s *How a package is released* settles what a version bump means, that a tag waits for the package's sweep, and that this repository creates no GitHub Releases. It never says how the tag is made, so the mechanics live only in whichever session last cut one. This branch writes them into that section and changes nothing else.

Independent of every open branch: one file changes, it is repository-level, and no package's version moves.

## What the section already states, and therefore is not written again

The hardest part of this change is subtraction. Four of the facts a reader needs are already in the section: that bumping the manifest version *is* publishing to everyone installed; that a package is tagged only after its own whole-package sweep has run; that a stacked epic yields one tag, on the last squash commit; and that the trunk runs ahead of every install between releases. New prose that restates any of them makes the section longer and its two copies free to drift.

So what lands is the part nobody has written down: the two commands, the commit they point at, the message shape, and who runs them when. Everything else is reached by pointing at the sentence that owns it.

## Where the commit is, verified rather than asserted

A package's tag goes on that package's own last squash commit on the trunk, which is `git log -1 origin/main -- plugins/gh-solo` for a plugin and the same command against the skill's directory for a standalone skill. The current tag of each tagged package satisfies it: `gh-solo_4.7.0` at 25ca57b, `skills-maker_1.1.0` at 7b06a2e and `rails-style_1.0.0` at be0e40a, each the newest trunk commit touching its own directory. That is worth stating in the record precisely because it is not the trunk tip - a tag cut at `origin/main` would claim every other package's intervening work.

## The message shape is read off the tags, not invented

Every tag in the repository already carries the same body: a `<name> <version>` subject line, the disclaimer, then what shipped, and a breaking-change paragraph where something broke. `skills-maker_1.1.0` and `rails-style_1.0.0` carry no such paragraph, which is what makes it conditional rather than optional.

## The tag push does not trip the trunk-push hook

`plugins/gh-solo/hooks/ask-before-trunk-push.py` reads a push's refspecs and asks only when one names a trunk branch, so `git push origin gh-solo_4.7.0` passes without a prompt. Worth knowing while writing the record; not worth a sentence in it, since a hook that stays quiet is the absence of an event.

## Steps

- Add the mechanics to `## How a package is released` in `AGENTS.md`, after the paragraph that makes the sweep a precondition: the annotated tag at the package's own last squash commit, and the push of that tag.
- Give the commands literally, and say how the reader finds that commit rather than leaving `<sha>` unexplained.
- State that the tag is annotated and not lightweight, and give the message shape the existing tags use: `<name> <version>` as the subject, the disclaimer line, then what shipped and what breaks.
- State who cuts it and when: by hand, once the package's sweep issue is closed, and never as part of a branch's merge.
- State the consequence - a package can carry published versions that no tag names - by pointing at the bump-is-publishing and sweep-precondition paragraphs rather than restating either.
- Keep the consumer side out: fetching and updating an installed plugin belongs to the `gh-solo` package's own README.

## Verification

- The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- `python3 scripts/version-check.py`, which passes without exercising anything because only a repository-level file changes - the correct answer for such a branch rather than a reason to leave the box out.

**Neither gate reads prose.** They see that backticked paths resolve, that fences close, and that no package moved a version it owed. Whether any added sentence is a second copy of a fact the section already states is the owner's judgement, and it is the one criterion on the issue that no command can decide.

`python3 scripts/manifest-check.py` is not owed here: no manifest changes.

## Open questions

- **A fenced block, or the commands inline?** `AGENTS.md` carries no fenced code today, while `.agents/gh-solo.md` is full of them. The recommendation is a fence: these commands get copied, and a command that gets copied belongs alone on its own line.
- **Does the record state the tag body's 72-column wrap?** The existing tags are all wrapped that way and nothing says so. The recommendation is one clause, since a tag message is immutable and nobody rewraps one later.
- **Which form of `git tag -a` is given?** The bare form opens an editor; `-F` takes a prepared file. The recommendation is the bare form, because it needs no scaffolding and the message is prose the owner should read before it becomes immutable.

## Settled

- None yet.
