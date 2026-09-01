> 🤖 Written by AI --- read/modified by izkreny! 🤓

# gh-solo

The GitHub loop for a repository with one committer. An issue becomes a branch, a branch opens a draft pull request holding its plan, the plan is argued over as a diff before any code exists, the session that read the plan implements it, a fresh-context subagent reviews what it wrote, findings come back as numbered threads, and nothing merges until every thread is resolved and every gate has been ticked by whoever actually ran it.

It is deliberately not a generic workflow plugin. It assumes GitHub, it assumes the `gh` CLI, and it assumes you are the repository's only committer and its only reviewer with authority. Where that last assumption stops holding, the skills say so and stop rather than guessing.

## What is inside

| Component            | What it owns                                                                                                     |
|----------------------|------------------------------------------------------------------------------------------------------------------|
| `/gh-solo:tracker`   | The issue tracker: epics with sub-issues, spikes, drafts, blocked-by links, milestones, and what to work on next |
| `/gh-solo:pr-flow`   | Branches, plan files, opening and readying pull requests, stacks, review rounds, and the merge gate              |
| `/gh-solo:implement` | Turning an approved plan into commits, and review findings into fixes                                            |
| `reviewer` agent     | The subagent a review round spawns to read the diff, so the code is judged by something that did not write it    |
| trunk-push hook      | Asks for confirmation before any `git push` whose destination is the trunk                                       |

Each skill carries its own `README.md` with the full picture. `/gh-solo:pr-flow` and `/gh-solo:tracker` also take `help` as a routing verb, which prints their own summary; `implement` and the `reviewer` skill have no such verb, because each has one job and its README is the summary.

## Requirements

- **The `gh` CLI**, authenticated. Every read and write goes through it.
- **The `gh stack` extension** and the **`gh-stack` skill** from `github/gh-stack`, needed only for stacked pull requests. The stack workflow documents the extension's traps but does not bundle its manual.
- **A harness that can spawn a subagent**, for the `reviewer` agent a review round uses. Where yours cannot, appoint a capability with a `Reviewer command:` line in `.agents/gh-solo.md`; the round invokes it and posts what it returns. **Reading the diff yourself is not the fallback**, because the session that wrote the code is the one thing a review may not be: the round refuses rather than substituting the author. A pass by an appointed command is also not recorded identically - it lands with `severity_source`, `severity_basis` and the `unrated` axis, which exist precisely so a reader can tell which kind of pass they are looking at.
- **Python 3**, for `hooks/ask-before-trunk-push.py`, `skills/pr-flow/scripts/docs-check.py` and `skills/pr-flow/scripts/post-review.py`. The hook is the one that makes this non-optional: it runs on every Bash call in every session and repository, not only while a skill of this plugin is loaded.

**One thing to know about the tool grants.** `/gh-solo:implement` takes bare `Bash`, because it is the skill that runs *your* repository's tests, linters and builds and those cannot be enumerated in advance. Its sibling skills are all narrowed to `gh`, `git` and `python3`. So where the other three are stopped by their grant, that one is stopped by a rule written in its own instructions - never install software, never push to the trunk - the same way the `reviewer` agent's read-only discipline is a rule rather than a wall, because a `gh` grant cannot express read-only either. If your harness can deny command shapes itself, this is the skill to point that at.

## Install

```bash
claude plugin marketplace add izkreny/agentifico
claude plugin install gh-solo@agentifico
```

To work on the plugin itself, add the checkout instead of the repository, so edits are live without a push:

```bash
claude plugin marketplace add /path/to/your/agentifico/checkout
claude plugin install gh-solo@agentifico
```

## The AI disclaimer, and how to make it yours

Every post this plugin makes lands under **your** GitHub login, because it uses your credentials. So a login can never tell your comments from an agent's, and one string does that job instead: an AI disclaimer line opening the body of every agent-written PR body, comment, Review and thread reply.

That line is not decoration. The mechanisms that test it:

- the watch filter in `pr-flow`'s discuss workflow, which without it would re-emit the plugin's own replies as fresh comments and answer itself forever
- the merge gate, which treats a Review whose body opens with it as the proof that the review pass actually ran
- the thread gate, which reads a comment *without* it as yours, and refuses to merge a thread you never replied in
- the review workflow, recognising its own records from a previous pass

**What is fixed is the prefix `> 🤖`, and nothing else.** That is the literal the filters test. Everything after it is yours to write.

The default, used when nothing overrides it:

```markdown
> 🤖 Written by AI --- read/modified by human! 🤓
```

To make it your own, define your line in your agent's global instructions file, the one loaded into every session automatically (`AGENTS.md`, `CLAUDE.md`, or whatever your agent reads). When that file defines a disclaimer line, it wins, and the plugin's default is not used. Keep the `> 🤖` prefix and keep it a single-line markdown blockquote: a `via` line naming which skill and workflow posted goes underneath as the blockquote's second paragraph, which is what keeps an implementation record, a divergence note and a review finding tellable apart on one pull request.

What to know before you change it. It must be a string you would never type by hand yourself, or the thread gate will read your own comment as the agent's. And change it once, early: posts already made under a previous wording keep that wording forever.

## Working in a fork

Contributing to a project you do not own splits the work across two repositories, and that boundary is the one thing this plugin cannot cross.

**Everything up to the merge works unchanged inside your fork**: your own issue, the branch, the plan-first draft pull request into your fork's own default branch, the implementation, the review rounds, the ready audit and the merge gate. You administer your fork, so nothing there lacks permission. Turn Issues on first, because a new fork has them switched off and `tracker` would otherwise have nothing to write to.

**What does not cross the boundary is anything aimed at the pull request you open upstream**, since that one lives in a repository where you have read access only. `merge` cannot run there, and it also expects to read and set repository settings and branch protection you do not own. `tracker` cannot label, assign, milestone or attach a sub-issue on upstream's tracker, each of which needs triage permission, so the convention that an assignee means work in progress has nothing to write to. And the review protocol's authority inverts: resolving a thread becomes the maintainer's act rather than yours.

**So the substitution is one step, at the very end.** The gate's terminal act changes from "squash merge into the default branch" to "open the upstream pull request from this branch". Your fork-internal pull request stays open as your own review record, and upstream receives a branch that has already been planned, argued over, implemented, reviewed and audited.

Untested rather than known in that flow: whether a pull request's author may resolve review threads on a repository they cannot write to, and whether `gh stack` works across a fork boundary at all. Settle both against a real pull request before relying on either.

## The one guardrail

The plugin installs a single hook. A `git push` whose destination is the trunk asks for confirmation first, and says why. Every skill here states that work reaches the trunk only through a reviewed pull request's squash merge, and a rule written in prose is a request rather than a stop.

It asks rather than refuses, deliberately: a plugin's hook runs on every shell command in every session and every repository, not only while one of these skills is loaded, and plenty of repositories are legitimately trunk-only. `hooks/test-ask-before-trunk-push.sh` is its regression bench, and every case in it has been watched to fire, or to stay quiet, on the situation it names.

## What it will not do

It will not mark a draft ready, merge, push to the trunk, edit a plan file after approval, resolve a review thread, or tick a checkbox on your behalf. Those are the decisions the flow exists to protect, and each of them is a judgement no record of the work can stand in for.
