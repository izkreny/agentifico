> **Tools used:** `Bash(gh:*)` for the extension and PR queries, `Bash(git:*)` for branch and worktree state.

Inspect or move a stack. The `gh-stack` skill is the command reference; this file is the judgement around it.

## Prerequisites

The `gh stack` extension is per developer and is not carried by a clone:

```bash
gh extension list                        # look for github/gh-stack
gh extension install github/gh-stack     # if absent
```

**The repository must have stacked pull requests enabled**, per the `gh-stack` manual: without it `gh stack submit` exits 9, non-interactively and with no fallback. Step 0 asks whether a stack is wanted; this is whether one is possible.

**The `gh-stack` skill owns the CLI.** It is installed at user scope, from `github/gh-stack`, and it is the manual: every command, the JSON output shapes and the exit codes. Upstream splits it, so `SKILL.md` is the summary and the detail lives in its `references/` directory; follow the pointer rather than concluding the manual is silent. Consult it for command mechanics rather than guessing flags.

```bash
gh extension list | grep gh-stack              # read the installed binary version
```

**The `gh-stack` skill is a prerequisite this plugin does not bundle.** It ships from `github/gh-stack` alongside the extension it documents. How it gets onto a machine is that machine's business rather than this plugin's; what matters here is that the skill and the extension are both present, and that the extension's version is the one the skill documents.

**Do not pin the skill to the extension's version.** Upstream tags releases of the binary, not of the manual, and the skill carries its own separate `version`, which has been seen both behind and ahead of the tag it ships under. The two counters are unrelated, so matching them fetches an arbitrary manual rather than a matched one. Before trusting an unfamiliar flag, check behaviour rather than numbers: `gh extension list` for the binary, and `gh stack <command> --help`, which is authoritative. Note that `gh stack help <command>` is not: it prints the top-level help.

**Agent rules from that manual worth repeating**, because getting them wrong produces confusing failures rather than clean errors:

- Always `gh stack view --json`, never bare `view` or `view --short`.
- Always `gh stack submit --auto`.
- Always positional branch names.
- `gh stack merge --yes --squash`, never `gh pr merge`, which does not work on stacked PRs. Without an explicit method the last-used one is reused, so the strategy must always be named.
- `gh stack unstack --local` before a checkout that would conflict.
- **A bare number given to `gh stack merge` resolves as a stack number first, then a PR number**, per `gh stack merge --help`. The manual presents PR number and stack number as a free choice; they are not. The merge is all-or-nothing and irreversible, so establish which the number is before running it.
- **Always pass `-m` to `gh stack add`, including with `-A` and `-u`.** The `gh-stack` skill's own commands reference implies those flags supply a message; they do not, and without `-m` the command opens `$EDITOR` and hangs, which is the exact failure the non-interactive rules exist to prevent. Stage and commit with plain `git` instead where that is easier.

## Step 0 - Decide whether a stack is even wanted

**A stack is for a branch that depends on another unmerged branch.** That is the whole trigger. Work that starts from `main` and merges to `main` is an ordinary branch and an ordinary PR, and turning it into a one-branch stack buys nothing.

Ask what the branch depends on. If the answer is `main`, or an already-merged branch, there is no stack: cut an ordinary branch, open an ordinary PR against `main`, and stop here. Say that plainly rather than building a one-branch stack to satisfy the request as phrased.

A stack is the right answer when the branch depends on work that is **open and unmerged**, because that is the case ordinary branching handles badly: without stacking, the child's diff contains the parent's commits and the review becomes unreadable. Then stacking is the preferred answer and manual rebasing is not: cut from the parent's tip, target its PR at the parent, and let GitHub retarget the child when the parent merges. A manual `git rebase` against `main` rewrites the history the stack tooling manages, which is how a stack loses track of itself.

**The no-rebase rule is about stacked branches only.** An ordinary branch cut from `main` is normal git and may be rebased, squashed or force-pushed freely. Do not generalise this to every branch: check the stack object first, per the layers below, and let that decide which of the two a branch is.

## Step 1 - Establish which layer knows what

**Stack state lives in layers, and they disagree.** Read them in this order, and when they conflict believe the higher one and say which one you believed. Never silently "fix" a lower layer to match.

```bash
gh api "repos/{owner}/{repo}/pulls/<pr-number>" --jq .stack   # 1: GitHub's stack object
gh pr list --json number,headRefName,baseRefName              # 2: the base topology
gh stack view --json                                          # 3: local tracking
```

1. **The GitHub stack object is ground truth.** The REST payload carries a `stack` field with the stack number, base, size and position. An empty result means GitHub holds no stack object for that PR.
2. **PR bases can stack without a stack object, but the base is a positive test only.** A base other than `main` means a stacked PR even when layer 1 is empty, and GitHub still retargets it when the parent merges. Promote a base-only stack with `gh stack link`, which needs no local tracking.
3. **Local tracking is frequently absent, and `gh stack view` lies when it is.** It only knows stacks tracked in this working tree, so it reports "not part of a stack" for a branch that is in one on GitHub. Never take that at face value; it is also per-worktree, per the trap below.

**Never conclude "not stacked" from the base alone.** A base of `main` proves nothing: GitHub retargets a child to `main` when its parent merges, and the stack object survives that. A PR can therefore look ordinary in every respect — base `main`, every ancestor already merged, the last branch standing — and still be stacked, at which point both merge paths refuse it: `gh pr merge` fails with "must be merged using the asynchronous merge REST API", and a plain `PUT /pulls/<pr-number>/merge` answers 403. Only layer 1 explains that, and `gh stack merge --yes --squash` is what lands it.

So **query the stack object before any merge or branch operation**, not just when something looks unusual.

`gh stack view --json` also refuses while the trunk is checked out — "branch `main` belongs to multiple stacks" — which is expected rather than stale tracking. Run stack reads before switching to `main`.

## Adopting tracking is mandatory before any write

`add`, `submit`, `sync`, `rebase`, `merge` — every one of them, every time:

```bash
gh stack checkout <stack-number|pr-number|pr-url>
```

It discovers the stack, fetches its branches and sets up tracking, and running it when tracking already exists is harmless. Doing it unconditionally removes the whole class of confusion where a command half-works against a stack the tool cannot see.

**It is the `git push -u` of stacks**, and for the same reason: one cheap step establishing the local pointer to remote state the tool reasons from, whose omission degrades silently instead of failing. Without `-u`, `git status` goes quiet about ahead and behind; without tracking, `gh stack view` says "not part of a stack". Neither errors, both mislead.

The analogy stops short, and each gap is why the limits below exist. `-u` is once per branch and lives in the shared config; tracking is once per **worktree** and dies with it. And `-u` never touches your working tree, where `checkout` moves HEAD — so a forgotten `-u` costs information and reverses exactly, while a forgotten adoption followed by a write can leave a stack half-moved.

**That rule has limits, and each matters.** It does not apply to reads: "is this stacked" and "what is it on" come from layers 1 and 2 with no local state, and `checkout` mutates the working tree, so requiring it to answer a question is a needless collision with the worktree trap. And it is **never** satisfied by `gh stack init` — init is only for branches not stacked anywhere yet, and running it over PRs that already form a GitHub stack is what produces the local/remote divergence prompt during `sync`. If a branch is stacked on GitHub, the verb is always `checkout`.

## Step 2 - Do the one thing asked

### View

```bash
gh stack view --json
```

Never bare `view` or `--short`. Summarise as a list from trunk outward, naming each branch, its PR number and its base, so the shape is legible without reading JSON.

### Init - start a new stack

Only for branches that are stacked nowhere yet. A stack that already exists on GitHub is adopted with `checkout`, never with `init`, per the limits above.

```bash
gh stack init <branch1> <branch2> ...   # positional branch names, never bare
```

Pass `-b <base>` when the stack grows from something other than the default branch. Then Submit opens its PRs, and the repair step there applies to every one of them.

### Add a dependent branch

Cut from the parent's tip. **If the parent is stacked on GitHub, adopt the stack before adding to it** — this is the mandatory-before-writes rule above, and `gh stack add` against an unseen stack is exactly the half-working case it exists to prevent:

```bash
gh stack checkout <stack-number|pr-number|pr-url>   # unless already tracked here
gh stack add <branch>
```

Only when the parent is in no stack at all does the plain path apply, and that opens a base-only stack which `gh stack link` can promote later:

```bash
gh pr create --base <parent> --assignee @me
```

Either way the PR body needs `Closes #{issue-number}` for the issue the branch belongs to.

### Submit

```bash
gh stack submit --auto
```

Always `--auto`. Without it the command prompts in ways that do not survive a non-interactive run.

**Never add `--open`.** It marks every PR it touches ready for review, and drafts-at-creation is the rule in `workflows/open.md` - `--auto`'s default of opening new PRs as drafts is the correct behaviour, not an accident to fix. `workflows/ready.md` is the only thing that lifts a draft.

**Then repair every PR it opened, immediately.** `gh stack submit` has no flag for a title, a body or an assignee, and `--auto` humanizes the branch name into the title once a branch carries more than one commit - which is always here, since the plan commit lands first and alone. Every stacked PR is therefore born breaking three conventions at once, and `workflows/review.md` would flag all of them by construction. Per PR, after every submit:

```bash
gh pr edit <pr-number> --title "{type}({scope}): {issue title}" --add-assignee @me --body-file <file>
```

The body carries `Closes #{issue-number}` and the rest of the template in `workflows/open.md`, built read-modify-write per `SKILL.md`.

### Sync or restack

**These are two different commands, and only one of them pushes.** Read the worktree trap below before running either.

`restack` is the cascade rebase alone, which moves branches locally and leaves the remote untouched:

```bash
gh stack rebase
```

`sync` fetches, rebases **and pushes**. Its own help states the push as its fifth step: "Pushes all branches atomically (using --force-with-lease --atomic)". So it is a force-push across every branch in the stack, not a local operation:

```bash
gh stack sync
```

**`sync` is refused while a review round holds unpushed fix commits on any branch in the stack.** The round's fix commits sit local for the owner's word, and `references/review-protocol.md` makes step 7 the round's only push; a `sync` in the middle of that pushes them early and re-anchors every thread under a part-finished read, which is the exact failure the push-hold exists to prevent. `rnp` is what releases them. Say which branch holds them, and offer `gh stack rebase` where the intent was only to move onto the trunk.

**The reviewer's read refuses `sync` as well, and that window is the earlier one.** *The push gate, while a reviewer is reading* in `references/review-protocol.md` covers the gap between a spawn and its post, where no fix commit exists yet - so the refusal above cannot fire there, and a `sync` walks straight through it and costs the pass. What releases this one is not `rnp`: it is the round posting, or the owner typing `discard` at the standing refusal, per *While it reads, a push is refused* in `workflows/review.md`.

**`gh stack push` and the drift playbook are refused on the same terms, because the verb is not what does the damage.** That command force-pushes per branch, as *When CI goes silent: the stack has drifted* states below, so a rebase-then-push run to get around a refused `sync` moves the head under the reviewer exactly as `sync` would. A refusal keyed to one verb would leave its own documented alternative as the way through it.

**Each refusal here is checked per stack rather than per branch**, because the commands they name force-push every branch in the stack rather than only the one you are standing on: a round reading a *lower* branch's pull request is moved under by a command run from an upper one, and a check that looked only at the current branch would miss exactly that case.

Where the fetch is not wanted either, the drift playbook below runs `gh stack rebase` and `gh stack push` as separate steps, which is the same work with the push under the owner's eye - and under the refusals above all the same, since its final step pushes.

### Merge

**Merging belongs to `workflows/merge.md`, including for a stack.** It holds the reviewed-or-not gate and the squash policy, and a merge routed here instead would skip both. Read that file rather than reaching for the command.

Facts it depends on, stack-specific and so stated here: `gh pr merge` does not work on stacked PRs at all, and merging the bottom of a stack retargets its child automatically — never retarget by hand afterwards.

## The worktree trap

**`sync` and `rebase` rewrite every branch in the stack, and git refuses to move a branch that is checked out in another worktree.** A repository that routinely holds several branches of one stack checked out at once, a main checkout plus a worktree per branch, will fail a cascade rebase partway through and leave the stack half-moved. A checked-out trunk blocks the fast-forward step the same way.

Before any cascade rebase, list the worktrees and confirm every branch the command would move is checked out only where the command runs:

```bash
git worktree list
```

Detach the others with `git -C <path> switch --detach`, or park them off the stack, and re-attach afterwards. `git -C` is correct here and not a loophole: detaching several sibling worktrees in a row is not moving your session into one, which is what the `EnterWorktree` move in the next paragraph is for. Read operations do not care: `view`, PR queries and checking out an unrelated stack are all safe with worktrees attached.

**Never add a second worktree for a branch already in the stack.** When a session needs to move to a sibling stack branch, check that branch out **in the worktree that already holds the stack**: enter it with the `EnterWorktree` tool, passing its `path` - where the owner's global instructions authorise entering a worktree without asking, that rule covers this; where they do not, let the harness prompt - then `git checkout <branch>`. The folder name then disagrees with the branch, which is fine and far cheaper than a pinned branch a cascade cannot move.

**Local tracking is stored per working tree**, in that worktree's private gitdir, so removing a worktree deletes the tracking with it. Recover with `gh stack checkout <pr-number>`; nothing on the remote was lost.

## When CI goes silent: the stack has drifted

**Zero check-suites on a pushed stack branch means a merge conflict against the trunk, not a slow or flaky CI.** The tell is the absence, not a failure:

```bash
gh api repos/{owner}/{repo}/commits/<sha>/check-suites --jq .total_count   # 0
gh pr view <pr-number> --json mergeable                                   # "UNKNOWN"
```

Sibling branches getting fresh runs in the same window rules out an outage. The GitHub PR page's own "Resolve conflicts via the command line" dialog confirms it and pre-fills the correct `gh stack checkout <stack-number>`, which is the fastest way to get the stack number.

**Closing and reopening the PR does not fix it.** `ready_for_review` and `reopened` events change nothing while the conflict is still there.

The fix, entirely through `gh stack` and never a raw `git rebase`:

1. `git worktree list` — confirm no other worktree holds any branch in the stack, per the trap above. Detach if one does.
2. `gh stack checkout <stack-number>` — adopts the GitHub stack locally if it is not already tracked.
3. `gh stack rebase` — cascades trunk to bottom to top, stopping at the first conflict with exit code 3.
4. On conflict, read the file for diff3 markers. The `|||||||` section is the pre-edit common ancestor, which is what lets you see what each side actually changed: **merge both sides' substantive edits rather than picking one.** Then `git add <file>` and `gh stack rebase --continue`. Expect the same conflict one branch up, because that branch's own edit to the line has not yet been reconciled with the new content below it.
5. Once it reports all branches rebased, `gh stack push`.
6. Confirm `mergeable` flips to `MERGEABLE` and CI actually runs on the new head (`gh pr checks <pr-number>`). Check the siblings too — a cascade rebase touched all of them.

**The `gh stack push` item in that list force-pushes per branch, and so does `gh stack sync`** - the two are where the no-rebase rule sanctions a force-push, which is why the playbook uses `rebase` then `push`: it puts the push on its own line where the owner can see it, rather than inside a verb that also fetches and rebases. Force pushes may be deny-listed by policy, and a `git -C <path> push --force…` rephrasing that slips past a deny pattern is a loophole rather than an authorisation. Run the plain command so the policy surfaces, then hand it to the owner to run themselves.

## Step 3 - Confirm

One line: what moved, from what to what, and the PR URLs affected. If nothing changed because the stack was already in the requested shape, say that rather than reporting success.

---

## Rules

- **Never `git rebase` stacked branch against `main` by hand.** It rewrites the history the stack tooling manages, and the stack loses track of itself. Every restack goes through `gh stack`.
- **Never commit or push directly to `main`.** This holds even when the change is trivial and even when a stack is not involved.
- One stack operation per invocation. If the owner asks for two, run them in sequence and confirm each.
- If a command fails partway through a cascade, stop and report which branches moved and which did not. Do not retry blindly: a half-rebased stack is worse than an unrebased one, and the usual cause is the worktree trap above.
