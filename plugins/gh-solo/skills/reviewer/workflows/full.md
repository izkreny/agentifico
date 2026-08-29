> **Tools used:** `Bash(gh:*)` for the pull request, its diff and its issue, `Read` / `Grep` / `Glob` for the plan file, the repository's standards and the code around a hunk.

The full review pass. You came in by the bare `<pr-number>` entrance, so the branch's whole diff is the object under review.

Everything about the finding shape, the findings file, your report and the standing prohibitions is in `SKILL.md`, which sent you here. This file owns what a full pass reads and how it judges.

## Fetch your own context

You are handed a number rather than a summary, deliberately: evidence chosen by the author of the code is not independent evidence. Read these yourself, in this order, and say in your report which ones you could not find.

A full review reads all of them. The scoped re-review reads almost none of them, and `workflows/rescope.md` owns that list rather than this one stating both.

1. **The pull request.** `gh pr view <pr-number> --json title,body,headRefName,baseRefName,commits,changedFiles`. The body carries `## Plan overview` and `## Verification`, and the `Closes #{issue-number}` line.
2. **The diff.** `gh pr diff <pr-number>`. This is the object under review and the only thing your findings may be about.
3. **The issue.** Take `{issue-number}` from the `Closes` line, and where that is missing, parse the branch name `{type}/GHI-{issue-number}_{slug}` - the same parse the `pr-flow` skill states for itself, copied here on purpose because you are forbidden from reading that skill: drop everything up to and including the first `/`, take everything before the first `_`, strip the `GHI-` prefix, so `feat/GHI-50_login-form` gives `50`. Then `gh issue view <issue-number> --json title,body,labels`. Its acceptance criteria are the spec axis's whole subject. **Say so plainly in your report if there is no issue**: the spec axis then has nothing to review against, and a spec verdict with no spec is a guess wearing a verdict's clothes.
4. **The plan file**, linked from `## Plan overview`. It states what the branch intended to do and often carries a test list. **It records intent frozen at plan time, and a gap between it and the code is a finding on neither axis.** The flow forbids editing it to record divergence - that gap belongs in a pull request comment - so a finding whose whole content is that the plan and the code disagree names a defect whose only remedy is barred, and it has to be named on both axes or it comes back relabelled: plan staleness reads as `spec` at least as readily as `standards`. **What the plan is still for is untouched by that.** It is quoted per finding as a spec source, and work the issue never asked for stays an ordinary `spec` finding against the issue's acceptance criteria.
5. **The repository's standards and the baseline**, per *The standards, and what beats what* in `../SKILL.md`, which owns the sources and the precedence because both passes share them. Read them with `Read`.

**Read the code around a hunk when the hunk alone cannot settle a question.** A diff shows what changed, not what the changed thing is called elsewhere or who else calls it, and a finding that a wider read would have refuted is worse than no finding. `Read`, `Grep` and `Glob` are for exactly this.

## The two axes

Every finding belongs to one of two axes, and **the axes are never merged, never ranked against each other, and never deduplicated into one another.**

- **`standards`** - does the diff follow the conventions this repository documents, and the engineering baseline where it documents none?
- **`spec`** - does the diff faithfully implement what the issue asked for?

They stay apart because they fail differently. Code that obeys every convention while implementing the wrong thing, and code that does what the issue asked while breaking the repository's conventions, are two different defects, and folding either into the other hides it. Run them as two separate reads of the same diff and keep the findings labelled.

### The standards brief

Report, per file or hunk:

- **Every place the diff breaks a documented standard.** Cite the standard: which file, and the rule as it is written there.
- **Every baseline smell you see.** Name it and quote the hunk.

**Distinguish a hard violation from a judgement call.** Breaching a documented standard can be hard. A baseline smell never is: it is a labelled heuristic, so write "possible Feature Envy" rather than asserting one. Where a documented standard endorses something the baseline would flag, the standard wins and the smell is suppressed.

**Skip anything tooling already enforces.** A linter, a formatter, a type checker and a test suite all report for free and report the same thing every time. Spending a review on them costs the owner attention and buys nothing.

### The spec brief

Report:

- **Requirements the issue asked for that are missing or partial.**
- **Behaviour in the diff that was not asked for.** Scope creep is a first-class finding here, not a footnote: work nobody requested is work nobody has judged, and it lands on `main` under an issue that never mentions it.
- **Requirements that look implemented but where the implementation looks wrong.**

**Quote the line of the issue or the plan for each finding.** A spec finding whose spec is paraphrased cannot be checked, and it is the paraphrase that will turn out to be doing the work.
