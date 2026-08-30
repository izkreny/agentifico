> **Tools used:** `Bash(git:*)` to read the fix commits locally, which are unpushed, `Read` / `Grep` / `Glob` for the repository's standards and the code around a hunk.

The scoped re-review. You came in by `rescope <pr-number>`, and your prompt handed you the commit range the fixes landed in, the findings they answer with their `RF{n}` ids, and which commit claims which id.

Everything about the finding shape, the findings file, your report and the standing prohibitions is in `SKILL.md`, which sent you here. This file owns what this pass reads, the two questions it answers, and the verdicts it adds.

## What you read, and nothing else

**The repository's standards and the baseline, and nothing further**, read as *The standards, and what beats what* in `../SKILL.md` defines them.

**The fix commits are unpushed, so read them with `git`** - `git diff`, `git log`, `git show` over the range you were given. `gh pr diff` cannot see them, and a diff handed to you by whoever wrote the fixes would put their reading between you and the code.

**Read the code around a hunk when the hunk alone cannot settle a question**, exactly as a full pass does.

## You answer exactly two questions, and no others

1. **For each finding claimed closed: does this diff close it?** Answer against the finding's own failure scenario. A fix that changes the code without making that scenario impossible has not closed it, however reasonable it looks.
2. **Did any fix introduce a new defect?** New defects are ordinary findings in the shape *What every finding must carry* defines in `../SKILL.md`, with their own anchors and severities.

**Nothing else is in scope.** No findings on code the fixes did not touch, no style opinions, no re-opening a finding somebody already rejected, no second thoughts about your own earlier findings. A full second review is where a round's iteration count explodes, because each pass finds fresh nitpicks on code nobody asked about.

**Each thing a full pass reads and this one does not is skipped on purpose, and each skip is what keeps the scope scoped - i.e. IN ANY CIRCUMSTANCES DO NOT READ:**

- **The pull request** - its title, body and file list describe the branch, and neither question is about the branch.
- **The whole-branch diff** - the commit range you were given is the object under review, and reading the rest is how a scoped pass turns into a second full one.
- **The issue** - its acceptance criteria are the spec axis's subject, and judging fixes against them re-opens the whole branch's spec, which is the re-judging this entrance exists to cut.
- **The plan file** - it records intent frozen at plan time, so it answers neither question, and reading it is where plan-staleness findings come from.

**The cost of skipping the issue is real and it is stated rather than hidden.** A new defect you find here is a `standards` finding, because with the acceptance criteria out of the pass the spec axis has no spec to judge against. Say so in your report rather than reaching for the issue: what backstops it is the owner's own read of the fix diff and the next full pass, both of which have it.

The file adds verdicts and keeps the same finding shape for anything new:

```json
{
  "pr": 61,
  "pass": "re-review",
  "verdicts": [
    {"rf": 3, "closed": true, "why": "The owner is now assigned inside the transaction, before any callback runs, so the scenario cannot occur."},
    {"rf": 4, "closed": false, "why": "The guard was added to `Group#settle`, but the scenario reaches the nil through `Group#close`, which is unchanged."}
  ],
  "findings": []
}
```

- **`rf` is the id you were given**, echoed back unchanged. You are not assigning it; you are answering about it.
- **`closed` is a verdict, not a courtesy.** Say `false` when the scenario survives, and say what still reaches it. A fix pass nobody checks is why this entrance exists.
- **`why` is required whichever way the verdict reads**, because "yes" with no reason is indistinguishable from not having looked.
