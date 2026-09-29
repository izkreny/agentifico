> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Let agents call skills-guru via subagent

Issue [#191](https://github.com/izkreny/agentifico/issues/191), the third child of epic [#188](https://github.com/izkreny/agentifico/issues/188). #191 is blocked by #190, and that block is the stack's order. This branch is cut from the tip of `docs/GHI-190_point-repo-files`, and its pull request has that branch as its base.

## What the Claude Code docs say

The skills page of the Claude Code docs, read on 2026-09-29, settles the frontmatter:

- `context: fork` runs the skill in a subagent. That subagent gets the skill's content as its prompt, without the caller's conversation.
- `agent` picks the subagent type, and `general-purpose` is the default.
- `background` defaults to `true`, and a backgrounded fork runs with the narrower tool set of background subagents. `false` makes the caller wait for the result and keeps the full tool set. It needs Claude Code 2.1.218 or later.
- `disable-model-invocation` defaults to `false`. Removing it lets the model invoke the skill.

## What changes

All of it is under `skills/skills-guru/`.

- **Frontmatter.** `disable-model-invocation: true` goes. `context: fork` and `background: false` come in. `agent` stays at its default. `background: false` is needed because the workflows write files and run `node` and `npm`, and a check or a review is a gate whose result the caller needs in the same turn.
- **Description.** It names the requests that should load the skill: writing a skill, reviewing or checking a SKILL.md file or a package of skills, exporting one, and installing or updating one. It ends with one boundary sentence and one sentence saying the skill always runs in a subagent. `context` is a Claude Code extension, and the skill's own rule is that such a field never carries behaviour alone.
- **Body.** A short section before the routing says who runs the skill. An agent that loaded it in the middle of other work spawns a subagent and hands it the skill and the argument. An agent that was handed the skill as its task is that subagent, and carries on. That second sentence stops the fork from spawning another fork, since the fork reads the same text. The opening line stops claiming the user typed the argument, and the unexpanded-argument fallback also reads it from the task the agent was handed.
- **`<skill-dir>/workflows/new.md`.** The frontmatter table gains a `context` row covering `agent` and `background`, and `context` joins the list of Claude Code extensions that other agents ignore. The skill is the authority on frontmatter and now uses these keys itself.
- **`<skill-dir>/README.md`.** Its opening stops saying "explicit invocation only" and says an agent may invoke it, always in a subagent.
- **`metadata.version`** moves from `4.0.0` to `4.1.0`, in the commit that changes the frontmatter.

`<skill-dir>/scripts/rules/skill-invocation.js` is not extended. The criterion is that the check passes, not that the rule grows.

## Steps

- Stack this branch's pull request onto stack #205 with `gh stack link 205 <pr-number>`, then adopt it with `gh stack checkout 205`.
- Build the invocation gate, and read it fail on the tree as #190 left it.
- Change the frontmatter and move `metadata.version` to `4.1.0`.
- Rewrite the description.
- Add the section on who runs the skill, and fix the opening line and the argument fallback.
- Add the `context` row to the frontmatter table in `<skill-dir>/workflows/new.md`.
- Update the opening of `<skill-dir>/README.md`.

## Verification

- `npm --prefix skills/skills-guru test`
- `node skills/skills-guru/scripts/check.js skills/skills-guru`
- `npm --prefix skills/skills-guru run lint`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- The invocation gate: `claude -p "/skills-guru check" --output-format stream-json --verbose`, run in a scratch project whose `<scratch-dir>/.claude/skills/skills-guru` links to this branch's `skills/skills-guru`, piped to a `python3` filter. It passes, exiting 0, only when the stream shows messages from a subagent. The filter's test is fixed from a real run's output, not recalled, and the gate is trusted only after it fails on the tree as #190 left it.

The docs do not say whether `allowed-tools` reaches the fork, so a fork may prompt for commands the inline run did not. The README's advice on which model to run the skill with now depends on the model the `general-purpose` agent uses, which no gate here checks. If the harness refuses a nested `claude` run, the invocation gate is reported as not run, and the reinstall in #188's `## Done when` is where it gets seen.

## Open questions

- **Does the sweep still work once the skill forks?** `.agents/gh-solo.md` says the sweep's run is inline and its reviewer is kept resumable by its id, and `<skill-dir>/workflows/review.md` Step 5 resumes that agent. A forked skill is not inline, and the docs say nothing about handing back a fork's agent id. Recommendation: open a `repo` issue to restate the sweep's run for a forked skill before #192 runs it, and leave `.agents/gh-solo.md` alone on this branch.

## Settled

None yet.
