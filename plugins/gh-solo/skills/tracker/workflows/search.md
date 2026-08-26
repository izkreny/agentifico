> **Tools used:** `Bash(gh:*)` for `gh issue list`.

Find issues. `gh issue list` takes structured filters as flags and free text through `--search`, and the two combine.

## Step 1 - Translate the request

| User says | Command |
|---|---|
| what am I working on | `gh search issues --assignee=@me --state=open` - `gh search`, not `gh issue list`, because the promise in `SKILL.md` is every repository at once and `gh issue list` sees only the current one |
| open backend issues | `gh issue list --label backend` |
| everything still open | `gh issue list --state open` |
| closed but not done | `gh issue list --state closed --search "reason:not-planned"` |
| issues about receipts | `gh issue list --search "receipts"` |
| the epics | `gh issue list --state all --label epic` |
| children of #51 | `gh issue view 51 --json subIssues` |
| what is blocked | `gh issue list --label blocked` |
| show drafts | `gh issue list --label draft` |
| anything mentioning a legacy tracker key | `gh issue list --state all --search "ABC-72"` |
| issues missing a layer label | `gh issue list --state open --limit 100 --search "-label:epic -label:backend -label:frontend -label:fullstack -label:infra -label:docs"` - `-label:epic` is the epic exemption, not a layer; the same audit lives in `references/standards.md`, which owns it |

`--state` defaults to `open`, which is usually right and is the single most common cause of "that issue does not exist" when it was closed last week. Pass `--state all` whenever the answer might be historical.

Free text in `--search` uses GitHub's issue search syntax, so `-label:x` excludes, `in:title` narrows, and `sort:updated-desc` orders. Structured filters (`--label`, `--milestone`, `--assignee`) are faster and clearer where they cover the need; reach for `--search` when they do not.

## Step 2 - Run it

Add `--limit` explicitly. The default is 30 and silently truncates, which on a tracker of any size turns "there are 30 open issues" into a wrong answer nobody questions.

```bash
gh issue list --state all --limit 100 \
  --json number,title,state,labels,parent \
  --jq '.[] | [.number, .state, .title] | @tsv'
```

Prefer `--json` with `--jq` over the default table when the result feeds anything further, and use the plain table when a person is reading it.

## Step 3 - Output

```
## Results
Query: [the command that ran]
Found: N

| # | Title | State | Labels |
|---|---|---|---|
```

State the command you ran, not a paraphrase of it. It is the only way the owner can tell an empty result from a wrong filter, and those look identical otherwise.

If the count equals the limit exactly, say the result is probably truncated and re-run with a higher limit rather than reporting it as a total.

---

## "Give me the next task"

A distinct request from a search, and worth its own procedure. "Next task", "next ticket" and "what should I pick up" are one question: which open issue is ready to start.

**First, say what is already in progress.** More than one issue can carry `@me` at once, and the honest answer to "what next" sometimes is "finish one of these three".

```bash
gh search issues --assignee=@me --state=open --json number,title,labels,repository
```

**Then find what is startable.** Ready means open, unassigned, and not waiting on anything:

```bash
gh issue list --state open --limit 100 \
  --search "no:assignee -label:blocked -label:draft" \
  --json number,title,labels,milestone,parent,blockedBy
```

`no:assignee` excludes everything assigned - in progress and queued alike, since `@me` covers both per *Quick reference* in `references/standards.md` - `-label:blocked` drops externally blocked work, and `-label:draft` drops unfinished descriptions, because a draft is finished, not started, per *Drafts* in the standards. **None of them catches issue-to-issue dependencies.** Filter `blockedBy` yourself: drop any candidate with a blocker that is still open. Skipping this is how a task gets handed over that cannot actually be started.

**Order what survives**, in this order, since there is no size label to sort on:

1. **Milestone**, since a milestone is what ships together and is the only recorded statement of what matters now.
2. **Unblocking the most**, by `blocking` count: an issue two others wait on is worth more than an isolated one.
3. **Within an epic already in progress**, since finishing a container beats opening a second.

Anything past that is your judgement of which is smallest, made by reading the acceptance criteria. Say it is a judgement when you offer it, rather than presenting it as a ranking the tracker produced.

**Offer, do not pick.** Show the top three with number, title, labels and milestone, say why each is a candidate, and let the owner choose. Then ask whether to start it, which is the Start work step in `workflows/state.md` and assigns `@me`.

If nothing is startable, say which issues are blocked and on what. "There is nothing to do" is almost always wrong; "everything open is blocked by #51" is the useful answer. If open drafts exist, name them too and offer to finish one: writing the missing description is real work, and it is what turns a draft into something this procedure can hand over.

If nothing matched, do not stop at "no results". Say which filter most likely excluded everything, and offer the same query one filter looser. A label that does not exist matches nothing while erroring nowhere, so check `gh label list` when a label filter returns empty.
