> **Tools used:** `Bash(git:*)` to read the fix commits locally, which are unpushed, `Bash(gh:*)` for the one body item a key names, `Read` / `Grep` / `Glob` for the repository's standards and the code around a hunk, `Write` for the findings file this pass ends by writing.

The scoped re-review. You came in by `rescope <pr-number>`, and your prompt handed you the commit range the fixes landed in, the findings they answer with their `RF{n}` ids, and which commit or body item key claims which id.

Everything about the finding shape, the findings file, your report and the standing prohibitions is in `SKILL.md`, which sent you here. This file owns what this pass reads, the questions it answers, and the verdicts it adds.

## What you read, and nothing else

**The repository's standards and the baseline, and nothing further**, read as *The standards, and what beats what* in `SKILL.md` defines them.

**The fix commits are unpushed, so read them with `git`** - `git diff`, `git log`, `git show` over the range you were given. `gh pr diff` cannot see them, and a diff handed to you by whoever wrote the fixes would put their reading between you and the code.

**Read the code around a hunk when the hunk alone cannot settle a question**, exactly as a full pass does.

**Read the one body item a key names, and no other part of the pull request.** A finding claimed by an `S{n}` or `V{n}` key was answered by a body edit, so its answer is the line that carries the key. Read it with this command, `<key>` being the key you were given, as `V3`:

```bash
gh pr view <pr-number> --json body --jq '[.body | splits("\n") | select(contains("::<key>::"))] | if length == 1 then .[0] else error("<key>: \(length) lines carry it") end'
```

The filter prints that one line, so the rest of the body never reaches you. A non-zero exit means no line or more than one carries the key, and that finding's verdict is `closed: false`, saying which.

## You answer exactly two questions, and no others

1. **For each finding claimed closed: does this diff, or the item its key names, close it?** Answer against the finding's own failure scenario. A fix that changes the code without making that scenario impossible has not closed it, however reasonable it looks. A finding claimed by a commit and a key is judged on the commit and the item together. An item yields its finding's verdict and nothing else: it has no file and line to anchor a new finding on, so a flaw in it is why that verdict reads `closed: false`.
2. **Did any fix introduce a new defect?** A new defect on a line the pull request's own diff contains is an ordinary finding, in the shape *What every finding must carry* defines in `SKILL.md`, with its own anchor and severity.

   A new defect on a line that exists only in the fix commits goes in the findings file like any other, with its `line` counted in the file as the fix commits leave it. Those commits are unpushed, so nothing can resolve an anchor to such a line yet, and that is handled after you rather than by you. **A finding you leave out is not deferred, it is lost**, because everything downstream selects from what your file carries. Name it in your report too, as you do every finding.

**The scope ends there.** No findings on code the fixes did not touch, no style preference the repository's standards do not state, no re-opening a finding somebody already rejected, no second thoughts about your own earlier findings. A convention the repository documents is not a style preference: a fix that breaks one is an ordinary `standards` finding under question 2. A full second review is where a round's iteration count explodes, because each pass finds fresh nitpicks on code nobody asked about.

**Each thing a full pass reads and this one does not is skipped on purpose, and each skip is what keeps the scope scoped. Under no circumstances read any of these:**

- **The pull request** - its title, body and file list describe the branch, and neither question is about the branch. A line a key names is read all the same, by its command under *What you read, and nothing else*, and never with the body around it.
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
