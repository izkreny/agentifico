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

## How each skill is reached

Two Claude Code frontmatter fields decide who may start a skill: `disable-model-invocation: true` leaves only your slash command, and `user-invocable: false` leaves only the model.

| Skill | You, by its slash command | The model, by the Skill tool | One load at 6.0.0 | Why |
| --- | --- | --- | --- | --- |
| `tracker` | yes | yes | about 12k characters | Its trigger phrases are how an aside reaches it, and a state change one of them starts prints its command and waits rather than writing. |
| `pr-flow` | yes | yes | about 41k characters | Its workflows are reached by sentences once it is loaded, and the model may need to load it again after a long session is summarised. |
| `implement` | yes | yes | about 9k characters | `pr-flow` enters it through the Skill tool from its `auto`, `review` and `reply` workflows, which `disable-model-invocation` would block, and you type it yourself to implement without the rest of the chain. |
| `reviewer` | no | yes | about 14k characters | The `reviewer` agent loads it through the Skill tool, so `disable-model-invocation` would break every review round without an error. `user-invocable: false` keeps it out of your `/` menu, because the session that wrote the code reviewing it is a self-review. |

**What a load costs.** A skill loads by putting its whole skill file into the conversation, which is what the table's load column counts. A slash command loads it again in full every time it is typed, even with the same argument. The model calling the Skill tool again for a skill already loaded gets a one-line note instead, and a plain sentence reaches a loaded skill's workflows without loading anything. So model invocation is also what keeps repeats cheap: a skill only you could start could be re-entered only by the command that re-injects it. The observations behind this, with the commands that produced them, are on issue #56.

**So a next step is printed as a shortcut, or as the bare command, and never as the slash form.** The session printing it already has the skill loaded, so typing `:mr 60` there costs nothing where `/gh-solo:pr-flow merge 60` reloads the whole file. A printed shortcut names its command beside it, as in `:mr 60 (merge)`, and `/gh-solo:pr-flow help` lists every shortcut. In a fresh session the slash form costs no more than a shortcut, and it is the sure way in.

**`auto`, `go`, `ready review` and `watch` stay literal commands whatever a sentence would save.** Each skips a stop that is yours to make: `auto`, `go` and `ready review` the waits between workflows, `auto` the plan reading too, and `watch` the choice to leave something polling in the background. A saving is never a reason to let a sentence start one. A shortcut such as `:rr 60` or `:wt 60` is the typed command, so it starts one as the full form does.

**Other agents ignore `disable-model-invocation` and `user-invocable`.** They are Claude Code extensions rather than part of the Agent Skills specification, so another agent reading these skills reaches every one of them every way, silently. That is why `reviewer`'s description also says who starts it: on such an agent the description is what states the policy.

## Requirements

- **The `gh` CLI**, authenticated. Every read and write goes through it.
- **The `gh stack` extension** and the **`gh-stack` skill** from `github/gh-stack`, needed only for stacked pull requests. The stack workflow documents the extension's traps but does not bundle its manual.
- **A harness that can spawn a subagent**, for the `reviewer` agent a review round uses. Without one there is no review round. **Reading the diff yourself is not the fallback**, because the session that wrote the code is what a review may never be: the round refuses rather than substituting the author.
- **Python 3**, for `hooks/ask-before-trunk-push.py`, `skills/pr-flow/scripts/docs-check.py`, `skills/pr-flow/scripts/plan-check.py`, `skills/pr-flow/scripts/keys-check.py`, `skills/pr-flow/scripts/criteria-check.py`, `skills/pr-flow/scripts/post-review.py` and `skills/pr-flow/scripts/watch.py`. The hook is the one that makes this non-optional: it runs on every Bash call in every session and repository, not only while a skill of this plugin is loaded.
- **[Vale](https://vale.sh)**, on `PATH`, for `skills/pr-flow/scripts/plan-check.py`, which checks a plan file before its commit, and `skills/pr-flow/scripts/keys-check.py`, which checks the keys on an issue or pull request body. It needs the version that script names as `MIN_VALE`, or later. A missing or older Vale fails the check rather than passing it, and the refusal names the version to install.

**One thing to know about the tool grants.** `/gh-solo:implement` takes bare `Bash`, because it is the skill that runs *your* repository's tests, linters and builds and those cannot be enumerated in advance. Its sibling skills are all narrowed to `gh`, `git` and `python3`.

So where the other three are stopped by their grant, that one is stopped by a rule written in its own instructions - never install software, never push to the trunk - the same way the `reviewer` agent's read-only discipline is a rule rather than a wall: its grant is bare `Bash`, since an agent's `tools:` takes tool names and never a command pattern, so a `permissions.deny` rule in your own settings is the wall if you want one. If your harness can deny command shapes itself, this is the skill to point that at.

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

## Update

An update takes two separate steps. The first refreshes the agentifico catalog, so Claude Code sees the new version. The second updates gh-solo to that version. Refreshing the catalog alone installs nothing.

In a shell:

```bash
claude plugin marketplace update agentifico
claude plugin update gh-solo@agentifico
```

In a session, run `/plugin marketplace update agentifico`. Then run `/plugin manage`, select gh-solo on the **Installed** tab, and choose **Update now**.

No command updates every installed plugin at once, and `claude plugin update` takes exactly one plugin. To update every plugin you installed from agentifico in one go, run `/plugin`, open the **Marketplaces** tab, select agentifico and choose **Update marketplace**. That one action refreshes the catalog and updates those plugins.

The new version loads when you start your next session. To switch a running session to it, run `/reload-plugins`, which moves hooks, MCP servers and LSP servers to the new version's path. Closing the `/plugin` panel after an update made there runs it for you.

Background auto-update is set per marketplace. A third-party marketplace such as agentifico starts with it off. To turn it on, run `/plugin`, open the **Marketplaces** tab, select agentifico and choose **Enable auto-update**.

Each version lives in its own directory in the plugin cache, and an update marks the outgoing version's directory as orphaned. Claude Code deletes it in a background sweep about fourteen days later. The delay is a grace period, so a session already running on the old copy keeps working. You never need to delete an old version by hand.

## Keys, and the gates that read them

Every item a reader has to point at carries a key: `::AC1::` on an acceptance criterion, `::S1::` on a plan step, `::V1::` on a gate, `::Q1::` on an open question. *Keys* in `skills/tracker/references/formats.md` owns the full table. A key is never renumbered or reused, so `AC3` names the same item for the life of its issue. A removed item keeps its line, marked as in `::AC3::REMOVED:: why`, and `::AC4::READ::` marks a criterion you prove by reading rather than by a test.

`ready` and `merge` refuse a pull request body with an unkeyed item or a repeated key, and `tracker`'s validate fails an issue the same way. So an issue written without keys fails validate until its items are keyed.

**You can also require a test for each criterion.** A `test_files` glob in your repository's config turns on a gate in `ready` and `merge`: each keyed criterion of the issue a pull request closes must be named by a line in a matching file that carries both `GHI-{issue-number}` and its key, such as `it "GHI-50 AC1 shows an error"`. A `READ` criterion is exempt. Without the key the gate is off.

```json
{
  "test_files": "spec/**/*_spec.rb"
}
```

Every setting the plugin reads sits in that one `json` block in your config, and the rest of the file is prose. A config the plugin cannot read exactly refuses rather than being half-read, and a key counts only inside the block. `skills/pr-flow/references/repo-config.md` lists every key and its default.

## The AI disclaimer, and how to make it yours

Every post this plugin makes lands under **your** GitHub login, because it uses your credentials. So a login can never tell your comments from an agent's, and one string does that job instead: an AI disclaimer line opening the body of every agent-written PR body, comment, Review and thread reply.

That line is not decoration. The mechanisms that test it:

- the watch filter in `pr-flow`'s watch script, which without it would re-emit the plugin's own replies as fresh comments and answer itself forever
- the merge gate, which looks under it for the `via` line naming a round record before it believes a review pass ran, since every agent post opens with the disclaimer and the convention check posts one on a diff nobody read
- the thread gate, which reads a comment *without* it as yours, and refuses to merge a thread you never replied in
- the review workflow, recognising its own records from a previous pass

**What is fixed is the prefix `> 🤖`, and nothing else.** That is the literal the filters test. Everything after it is yours to write.

The default, used when nothing overrides it:

```markdown
> 🤖 Written by AI --- read/modified by human! 🤓
```

To make it your own, define your line in your agent's global instructions file, the user-level one loaded into every session in every repository (`<home-dir>/.claude/CLAUDE.md` on Claude Code, or whatever your agent reads). When that file defines a disclaimer line, it wins, and the plugin's default is not used. Keep the `> 🤖` prefix and keep it a single-line markdown blockquote: a `via` line naming which skill and workflow posted goes underneath as the blockquote's second paragraph, which is what keeps an implementation record, a divergence note and a review finding tellable apart on one pull request.

What to know before you change it. It must be a string you would never type by hand yourself, or the thread gate will read your own comment as the agent's. And change it once, early: posts already made under a previous wording keep that wording forever.

## Working in a fork

Contributing to a project you do not own splits the work across two repositories, and that boundary is what this plugin cannot cross.

**Everything up to the merge works unchanged inside your fork**: your own issue, the branch, the plan-first draft pull request into your fork's own default branch, the implementation, the review rounds, the ready audit and the merge gate. You administer your fork, so nothing there lacks permission. Turn Issues on first, because a new fork has them switched off and `tracker` would otherwise have nothing to write to.

**Your fork's config lives outside its tree**, at `$XDG_CONFIG_HOME/gh-solo/<owner>/<repo>.md`, usually `<home-dir>/.config/gh-solo/<owner>/<repo>.md`, where `<owner>/<repo>` is the repository `gh repo view` reports. A config committed inside the fork would land on the branch you open the upstream pull request from. A fork cloned with `gh repo clone` makes its parent the default repository, so `gh repo view` reports upstream there; run `gh repo set-default <your-login>/<repo>` once in the clone, and the tracker and the file's name both follow your fork. `skills/pr-flow/references/repo-config.md` has the full lookup.

**What does not cross the boundary is anything aimed at the pull request you open upstream**, since that one lives in a repository where you have read access only. `merge` cannot run there, and it also expects to read and set repository settings and branch protection you do not own. `tracker` cannot label, assign, milestone or attach a sub-issue on upstream's tracker, each of which needs triage permission, so the convention that an assignee means work in progress has nothing to write to. And the review protocol's authority inverts: resolving a thread becomes the maintainer's act rather than yours.

**So the substitution is one step, at the very end.** The gate's terminal act changes from "squash merge into the default branch" to "open the upstream pull request from this branch". Your fork-internal pull request stays open as your own review record, and upstream receives a branch that has already been planned, argued over, implemented, reviewed and audited.

Untested rather than known in that flow: whether a pull request's author may resolve review threads on a repository they cannot write to, and whether `gh stack` works across a fork boundary at all. Settle both against a real pull request before relying on either.

## The one guardrail

The plugin installs a single hook. A `git push` it can see writing to the trunk asks for confirmation first, and says why. It reads the command the way a shell would: through the quoting, through `&&`, `;` and bare newlines, through a `\`-newline continuation, and into a nested `bash -c` or `eval`. What it cannot see is a destination that only exists at runtime - a variable, a `cd` it deliberately does not follow - and there it fails open rather than guessing. The gh-solo flow states as a hard rule that work reaches the trunk only through a reviewed pull request's squash merge, and a rule written in prose is a request rather than a stop.

It asks rather than refuses, deliberately: a plugin's hook runs on every shell command in every session and every repository, not only while one of these skills is loaded, and plenty of repositories are legitimately trunk-only. `hooks/test-ask-before-trunk-push.sh` is its regression bench, and every case in it has been watched to fire, or to stay quiet, on the situation it names - which is a claim about the cases it holds rather than about every shape a command can take. A new case is added by watching it fail first, since a case that has only ever passed proves nothing.

## What it will not do

It will not mark a draft ready, merge, push to the trunk, rewrite a plan file after approval, resolve a review thread, or tick a checkbox on your behalf. A plan edit it does make after approval is a new commit carrying a decision you settled in a plan thread, never a rewrite of what you approved. Those are the decisions the flow exists to protect, and each of them is a judgement no record of the work can stand in for.
