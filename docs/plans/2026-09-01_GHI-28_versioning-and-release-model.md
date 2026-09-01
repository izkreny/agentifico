> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Settle how a package is versioned and released

Implements #28. The repository's own `AGENTS.md` says a plugin carries its version "in `plugins/gh-solo/.claude-plugin/plugin.json` and its marketplace entry", and the entry carries none, so the sentence is false of the tree it describes. The correction cannot be made in isolation: the field named there is the field Claude Code reads to decide an update is available, so what a bump *means* is the release model, and the model is what has to be written down before the sentence can be true. This branch writes it into `AGENTS.md`, makes `.agents/gh-solo.md` agree with it, and closes the one manifest drift that is visible today.

The whole diff is prose plus one value in one JSON array. Nothing under `plugins/` or `skills/` is touched, so no package version moves, which is itself one of the things the plan has to prove rather than assert.

## The one fact everything else follows from

The Claude Code plugins reference, under *Version management*, says Claude Code "uses the plugin's version as the cache key that determines whether an update is available", and resolves that version from the first of: the plugin manifest's own `version`; the marketplace entry's `version`; the source's git commit SHA; an archive digest; `unknown`. Of the explicit-version approach it says users "get updates only when you bump this field. Pushing new commits without bumping it has no effect".

Three consequences, and every statement this branch adds is one of them or a rule built on one:

- The `version` in `plugins/gh-solo/.claude-plugin/plugin.json` is the release signal, not a label. Bumping it publishes to everyone installed; the `<name>_<version>` git tag is invisible to the mechanism.
- The marketplace entry's `version` is consulted only when the plugin manifest has none. Here it always has one, so a version in the entry could drift and could never be read - which is why the entry stays versionless, and why the sentence naming it as a second home has to go rather than be corrected.
- If every branch bumps and every merge publishes, then an unreviewed intermediate state is installable. The release train is what makes that untrue without changing per-branch discipline.

The marketplace-entry schema is the second documented fact, and it decides the shape of the drift warning: the plugin-marketplaces page says an entry may carry any field from the plugin manifest schema, plus the marketplace-specific `source`, `category`, `tags`, `strict`, `relevance`, `headers` and `headersHelper`. So the two files overlap by schema rather than by convention, and "which fields must be kept in step" is a question with a finite answer that can be written out.

## Where each statement lands

`AGENTS.md` gets the model, because it is the file that already owns the package scheme and is read by any agent whatever its harness. Its existing package section states where a version lives; that sentence is repaired, and the release rules follow it as their own section rather than swelling it.

`.agents/gh-solo.md` gets the three statements that are facts about *this repository's loop* rather than about packaging: that the sweep must have run before a tag rather than merely be open, that `scripts/version-check.py` needs nothing from the stacked model, and the enumeration of what the two manifests share. That split follows the division both files already declare - `AGENTS.md` holds what is true of the repository, `.agents/gh-solo.md` holds what the `gh-solo` loop does differently here.

**The skill half of the version-location sentence is not touched.** It claims a skill carries its version in frontmatter under `metadata.version`, which is false of three skills today and is #10, #11 and #12's to settle. The rewrite must repair the plugin half and leave that clause able to be corrected later without a second rewrite.

## `keywords` and `tags` are aligned, from the marketplace side only

`plugins/gh-solo/.claude-plugin/plugin.json` carries six `keywords` and the marketplace entry carries five `tags`; `gh-cli` is in the first and not the second. The acceptance criterion allows either aligning them or recording the difference as deliberate, and there is no reason to advertise the plugin differently in the two places, so they are aligned.

**The alignment is made by adding `gh-cli` to the entry, never by removing it from the plugin manifest.** `.claude-plugin/marketplace.json` is repository-level and owns no version; `plugins/gh-solo/.claude-plugin/plugin.json` is a `gh-solo` package file, and editing it on a `repo`-labelled branch would owe a `gh-solo` version bump for a change that is not the plugin's. The direction of the edit is what keeps this branch inside one package.

## The manifest agreement becomes a check, because prose has already failed at it

`.agents/gh-solo.md` records that the two manifests' descriptions "have drifted before" and asks for a change to either to be a change to both. That is a rule with no gate, and the `gh-cli` drift is what a rule with no gate looks like a second time. So the enumeration this issue asks for arrives with a command beside it, in the file that already holds every check command this repository runs.

The check compares the fields the enumeration marks as kept in step, as parsed values rather than by eye. It is watched failing before the fix rather than trusted: run against the tree as it stands it must report the `gh-cli` difference and exit non-zero, and that pre-fix output is recorded on the pull request. A check first seen passing proves nothing about what it would catch.

`plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` covers the prose half and is exercised the same way, against a scratch copy carrying a deliberately broken backticked path, so its green run on the real tree means something.

## What this branch does not touch

`scripts/version-check.py` is left exactly as it is. The stacked model needs no change to it: it compares `origin/main...HEAD`, and every branch in a stack carries its own bump, so each passes on its own account. What is owed is a sentence saying so, not a diff.

Also outside this branch, and named so the diff does not grow into them: the sweep issue that the release plan puts next, any tag, the dead `$schema` URL in `.claude-plugin/marketplace.json`, and the three skills missing `metadata.version`.

## The repository is public, and the lag story is told at the issue's own ceiling

One statement this issue asks for is that an agent may be running an installed copy of a package older than the tree it is editing. It is true of this very session, which is running an installed `gh-solo` several versions behind `main`. The wording must stay at the level of "the installed copy may be older than the tree, so compare the two before debugging" and must name no path outside the repository, no cache layout and no detail of any particular machine's harness - the issue body's own wording is the ceiling, and it is public for the same reason.

## Steps

- Rewrite the version-location sentence in `AGENTS.md`'s package section so `plugins/gh-solo/.claude-plugin/plugin.json` is the sole home of a plugin's version, leaving the `metadata.version` clause about skills able to be corrected by #10, #11 and #12.
- Add a release section to `AGENTS.md` stating: that the `version` in `plugins/gh-solo/.claude-plugin/plugin.json` is what Claude Code reads to decide an update is available, so a bump is the release rather than a label; that the marketplace entry carries no version and why; and that `.claude-plugin/marketplace.json` distributes plugins only, so the packages under `skills/` are absent from it by nature.
- State the release train in the same section: an epic's work is stacked, the stack's top branch is the whole-package sweep, `gh stack merge` lands the stack atomically so no installer sees an intermediate version, and one tag is cut on the last squash commit.
- State the train's limits in the same section: work outside an epic is not stacked; a package is tagged only after its own whole-package sweep has run, which is `/skills-maker review <package-path>`; and a hotfix runs the sweep too, deferring any finding that touches none of the files it changed.
- State in the same section that this repository creates no GitHub Releases, because that surface is repository-level with a single "Latest" badge and cannot serve per-package tags.
- State in the same section that an agent working here may be running an installed copy of a package older than the tree, that this follows from releasing only at a swept tag, and that a package command failing on something the tree appears to have fixed is compared against the installed copy before it is debugged.
- Change the sweep section of `.agents/gh-solo.md` so it requires the sweep to have run before the tag rather than merely to have an issue open.
- Replace the description-drift paragraph in `.agents/gh-solo.md` with an enumeration of every field the two manifests share, saying of each whether it must be kept in step, including why `version` is absent from the entry by design.
- Add the manifest-agreement comparison to `.agents/gh-solo.md`'s check commands, beside that enumeration, and watch it fail against the tree as it stands before anything is aligned.
- Add `gh-cli` to `tags` in the `gh-solo` entry of `.claude-plugin/marketplace.json`, and change nothing in `plugins/gh-solo/.claude-plugin/plugin.json`.
- Add a sentence to the `scripts/version-check.py` paragraph of `.agents/gh-solo.md` saying why the stacked model needs no change to that script.
- Re-read every added sentence against the public-repository rule before pushing, and remove anything naming a path outside the repository or a detail of a particular machine's harness.

## Verification

Gates, each with an exit code:

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'` - the command `.agents/gh-solo.md` states for this repository, read by exit code and never through a pipe.
- The same docs-check run against a scratch copy carrying a deliberately broken backticked path, seen to exit non-zero, before the clean run above is trusted.
- The manifest-agreement comparison added to `.agents/gh-solo.md`, seen to exit non-zero against the tree as it stands and zero after `gh-cli` is added to the entry, with both outputs recorded on the pull request.
- `python3 scripts/version-check.py` - passes without exercising anything, which is the correct answer for a branch confined to repository-level paths.
- `git diff --stat origin/main` names only this plan, `AGENTS.md`, `.agents/gh-solo.md` and `.claude-plugin/marketplace.json`, and nothing under `plugins/` or `skills/`.
- `git diff origin/main -- AGENTS.md .agents/gh-solo.md .claude-plugin/marketplace.json` contains no path outside this repository, and no `/home/` anywhere.

What these gates cannot see: whether the model written down is the model the owner settled. Every gate above proves that the files parse, that the paths resolve, that the diff stayed inside one package and that the two manifests now agree; not one of them can tell a correct account of the release train from a plausible one, and the account is the whole substance of this issue. That reading is the owner's, against the acceptance criteria on #28. The gates are equally blind to the omission case: a criterion silently unaddressed leaves every check green, so the criteria are ticked one at a time as each statement lands rather than swept at the end.

## Open questions

None. The chain was entered with `auto 28`, which waives the plan-reading stop, so the calls above were made in prose with their reasons attached rather than left open - the alignment direction for `keywords`/`tags`, the split of statements between the two files, and the check earning a place in `.agents/gh-solo.md`. Any of them the owner would have argued with comes back as a review finding, which is that entrance's own premise.

## Settled

Both settled in the terminal during the review round, and recorded here because that is where a decision reached outside a thread belongs.

- **Does the tag keep asserting that the whole package was read, or does it narrow to the skills?** It keeps asserting the whole package: the tag is the package's, skill or plugin alike. So `AGENTS.md` defines the sweep by the coverage that assertion needs rather than by one command - the skills through `/skills-maker review`, and the manifest, agents, hooks and README through a read of their own, since those belong to no skill. The alternative, keeping the single command and weakening what a tag claims, was declined: that claim is the premise the release model rests on, and weakening it silently would rewrite the model rather than correct a sentence. What this costs until the tool catches up is that a plugin's sweep is two acts rather than one.
- **Where does the gap RF2 named get fixed?** In `skills-maker`, taught to take a package root and walk to the skills under it, in its own issue against that package rather than on this branch. Two facts established while settling it, both of which that issue has to carry: `skills/skills-maker/workflows/review.md` Step 1 already reads every file in a skill's directory, so what is missing is the argument the tool accepts and not the file set it reads; and `plugins/gh-solo/agents/reviewer.md` is cited by path in no skill under `plugins/gh-solo/skills/`, so the extension reaches it by reading every file under the package root rather than by following references out of the skills.
