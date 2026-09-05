> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Record the commit scope this repository uses

Closes #84. Branch commits here carry the package label as a scope and `plugins/gh-solo/skills/tracker/references/formats.md` forbids it, so every round is entitled to raise the difference and one on #82 did. This branch writes the record that makes the practice an override rather than a deviation, in `.agents/gh-solo.md` and nowhere else.

Independent of every open branch: one file changes, and it is repository-level.

## The record has to answer three questions, not one

**Why the plugin's ban does not reach here.** Its stated reason is that the scope "would repeat the same value" on every commit of a branch, which holds where a repository ships one deliverable. This one ships a plugin and several standalone skills, each released on its own `<name>_<version>` tag, so the scope answers a question that exists here and not there. On a stacked epic branch `git log --oneline` shows commits from several branches at once, and the scope is what separates them.

**What it does to the default.** *Repository-specific conventions live in the repository* in `plugins/gh-solo/skills/pr-flow/SKILL.md` is what licenses a repository to differ, and naming it by that heading is what makes a later round read the record as an override instead of weighing it as a second opinion against `plugins/gh-solo/skills/tracker/references/formats.md`. A record that only asserts the practice invites the same finding again.

**What it does not license.** The pull request title's scope is the issue's package label and already agrees with the plugin, so that rule is untouched. And a pushed commit header is never rewritten to match this record, stated as a standing rule rather than as a note about the past: rewriting pushed headers strands the review threads anchored against them, which is why #82 reported the finding instead of fixing it.

## No change to `plugins/gh-solo/`

The override clause in `plugins/gh-solo/skills/pr-flow/SKILL.md` is already general, so `plugins/gh-solo/skills/tracker/references/formats.md` needs no hatch of its own and gains none. Putting a repository's business inside a package that serves many is the thing the override clause exists to avoid, and keeping the change to one file is also what keeps this a `repo` branch that moves no package version.

## Steps

- Give `.agents/gh-solo.md` the record: a branch commit here carries its package label as a scope, `fix(gh-solo): …` and `docs(repo): …`, against `plugins/gh-solo/skills/tracker/references/formats.md`'s `{type}: {description} (#{issue-number})`.
- State why the ban's premise fails here - one deliverable versus several packages on their own tags - and that a stacked branch's `git log --oneline` is where the scope earns it.
- Name *Repository-specific conventions live in the repository* in `plugins/gh-solo/skills/pr-flow/SKILL.md` in the record, so it reads as an override.
- Say in the record that the pull request title's scope rule is unchanged, and that a pushed header is never rewritten to match.
- Place it so a reader checking whether the commit format is overridden finds the `{type}` answer and the scope answer together, per the open question below.

## Verification

- The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- `python3 scripts/version-check.py`, which passes without exercising anything because no package's files change - the correct answer for a repository-level branch rather than a reason to leave the box out.

**Neither gate reads prose.** They see that backticked paths resolve, that fences close and that no package moved a version it owed. Whether the wording reads as an override rather than a second opinion is the owner's judgement, and the only real test is a later round declining to raise the finding again.

`python3 scripts/manifest-check.py` is not owed here: no manifest changes.

## Open questions

- **Which heading the record sits under.** The issue points at `## What is deliberately not here`, whose one paragraph today says the branch `{type}` vocabulary is the plugin's. That gets the reader to one place for both answers, but a positive override stated under a heading that promises absences is a heading that lies about its contents. **Recommendation: rename the section to one true of both paragraphs, `## The commit header format`**, keeping the `{type}` paragraph first and the scope record beneath it. Nothing in the repository cites the old heading - `plugins/gh-solo/skills/tracker/references/github-access.md` has a heading of the same name, but it is that file's own - so the rename costs one line and no cross-reference. The alternative, a separate `## The commit scope` section, keeps the heading honest and splits the two answers, which is the thing the issue asked to avoid.

## Settled

- None yet.
