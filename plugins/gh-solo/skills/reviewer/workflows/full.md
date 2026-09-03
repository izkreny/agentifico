> **Tools used:** `Bash(gh:*)` for the pull request and its issue, `Bash(git:*)` to fetch the head you were given and take its diff, `Read` / `Grep` / `Glob` for the plan file, the repository's standards and the code around a hunk, `Write` for the findings file this pass ends by writing.

The full review pass. You came in by the `<pr-number>` and head-sha entrance, so the branch's whole diff **at that sha** is the object under review.

Everything about the finding shape, the findings file, your report and the standing prohibitions is in `SKILL.md`, which sent you here. This file owns what a full pass reads and how it judges.

## Fetch your own context

You are handed a number rather than a summary, deliberately: evidence chosen by the author of the code is not independent evidence. Read these yourself, in this order, and say in your report which ones you could not find.

A full review reads all of them. The scoped re-review reads almost none of them, and `workflows/rescope.md` owns that list rather than this one stating both.

1. **The pull request.** `gh pr view <pr-number> --json title,body,headRefName,baseRefName`. The body carries `## Plan overview` and `## Verification`, and the `Closes #{issue-number}` line; `baseRefName` is what the diff below is taken against.
2. **The diff, at the sha you were handed.**

   ```bash
   git fetch <remote> <sha> --quiet
   git fetch <remote> <base-ref> --quiet
   git diff <remote>/<base-ref>...<sha>
   ```

   This is the object under review and the only thing your findings may be about. **Not `gh pr diff <pr-number>`**, which accepts a number, a URL or a branch and never a sha, so it would hand you whatever the pull request holds at this moment rather than the version the round is judging - and a finding anchored to a line only that other version has cannot be posted. Three dots, not two: the base side is then the point the branch diverged from, which is the pull request's own diff rather than a diff against wherever the trunk has since moved to. **Resolve `<remote>` rather than assuming `origin`**, which is only `git clone`'s default: `git remote` printing one name means that name, and with several, use the one the base ref tracks (`git config branch.<base-ref>.remote`). This is copied here on purpose, as the branch parse below is, because you are forbidden from reading the skill that owns the convention - and a repository whose one remote is named otherwise fails both fetches above and leaves you reporting a diff you could not read.

   **Report the sha back as `head` in your findings file**, exactly as you received it. The round compares it against what it handed you, so this is the one field of yours that is checked rather than read.
3. **The issue.** Take `{issue-number}` from the `Closes` line, and where that is missing, parse the branch name `{type}/GHI-{issue-number}_{slug}` - the same parse the `pr-flow` skill states for itself, copied here on purpose because you are forbidden from reading that skill: drop everything up to and including the first `/`, take everything before the first `_`, strip the `GHI-` prefix, so `feat/GHI-50_login-form` gives `50`. **The parse is only reached when the `Closes` line is missing, which is the case where its answer is least safe**: a branch predating the convention can carry a key whose number belongs to nothing in this tracker, and fetching it would run the whole spec axis against somebody else's issue while reporting that the issue was found. So check that the issue you fetched is plausibly this branch's - its title should recognisably match the branch's slug - and where it does not, report no spec rather than the wrong one. Then `gh issue view <issue-number> --json title,body,labels`. Its acceptance criteria are the spec axis's whole subject. **Say so plainly in your report if there is no issue**: the spec axis then has nothing to review against, and a spec verdict with no spec is a guess wearing a verdict's clothes.
4. **The plan file**, linked from `## Plan overview`. It states what the branch intended to do and often carries a test list. **It records intent frozen at plan time, and a gap between it and the code is a finding on neither axis.** A finding whose whole content is that the plan and the code disagree is not written, on either axis - the ban covers both, so relabelling it does not get it through, and plan staleness reads as `spec` at least as readily as `standards`. The reason is that its only remedy is barred: the flow forbids editing the plan to record divergence, which belongs in a pull request comment instead. **What the plan is still for is untouched by that.** It is quoted per finding as a spec source, and work the issue never asked for stays an ordinary `spec` finding against the issue's acceptance criteria.
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


### The spec brief

Report:

- **Requirements the issue asked for that are missing or partial.**
- **Behaviour in the diff that was not asked for.** Scope creep is a first-class finding here, not a footnote: work nobody requested is work nobody has judged, and it lands on `main` under an issue that never mentions it.
- **Requirements that look implemented but where the implementation looks wrong.**

**Quote the line of the issue or the plan for each finding.** A spec finding whose spec is paraphrased cannot be checked, and it is the paraphrase that will turn out to be doing the work.
