> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Settle and price each skill's invocation

Issue #56 holds the acceptance criteria. This plan says how.

## Approach

Measure first, decide second, edit third. AC1, AC2 and AC15 are observations, so no frontmatter or prose changes until all three have been run and recorded on #56 for AC3. They run in a throwaway Claude Code project outside the repository, driven by `claude -p --output-format stream-json --verbose`, so each injection is read off the event stream by its character count and a unique marker string in each probe body.

The policy is then stated once, in a new `## How each skill is reached` section of `plugins/gh-solo/README.md`, as one row per skill: who may invoke it, why, and what that choice costs in injected characters. Every other site points at that section rather than repeating it.

`implement` keeps the default, so the owner and the model both reach it, and this does not wait on Q1. Owner-only would break `pr-flow`, which invokes it through the Skill tool from `plugins/gh-solo/skills/pr-flow/workflows/auto.md` Step 3 and at the `fix` entrance from `plugins/gh-solo/skills/pr-flow/workflows/review.md` and `plugins/gh-solo/skills/pr-flow/workflows/discuss.md`. Model-only would break the owner, who types `/gh-solo:implement` where `plugins/gh-solo/skills/pr-flow/workflows/open.md` and `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` offer it. AC1 still runs, and only a result contradicting the documentation reopens this.

`reviewer` keeps `user-invocable: false` from #55. What it gains is the reason it must never carry `disable-model-invocation`, written beside its frontmatter: the `reviewer` agent loads it through the Skill tool, so that field would break every review round silently.

## Steps

- ::S1:: Build the probe project: a `probe` skill carrying `disable-model-invocation: true`, a `caller` skill whose body invokes `probe` through the Skill tool, and a `plain` skill with neither field, each body opening with its own marker string
- ::S2:: AC1: run `/caller` and read whether the Skill call to `probe` is blocked, and with what message
- ::S3:: AC2: in a fresh session, prompt with a sentence matching `plain`'s description, then in another fresh session run `/plain`, and compare the characters each injects
- ::S4:: AC15: run `/plain x`, then resume that session and run `/plain x` again, and read whether the second injects the body or a note
- ::S5:: Record S2 to S4 on #56 as one comment, each with the command run and what happened, drafted for the owner before it posts
- ::S6:: Add `## How each skill is reached` to `plugins/gh-solo/README.md` after `## What is inside`: the reachable states, one row per skill with its injection cost, why `auto`, `go` and `watch` stay literal commands whatever a saving asks, and that both fields are Claude Code extensions another agent ignores
- ::S7:: Write the reason `reviewer` never carries `disable-model-invocation` in `plugins/gh-solo/skills/reviewer/SKILL.md`, beside its frontmatter, and make its `description` say it is reached by the `reviewer` agent alone
- ::S8:: Add the same-session note to the console conventions in `plugins/gh-solo/skills/pr-flow/SKILL.md`: a printed next-step command for a workflow the loaded skill routes is followed by a line saying a plain sentence reaches it too, except `auto`, `go` and `watch`; point the printing sites in `plugins/gh-solo/skills/pr-flow/workflows/open.md`, `plugins/gh-solo/skills/pr-flow/workflows/discuss.md`, `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` and `plugins/gh-solo/skills/implement/workflows/implement.md` at it
- ::S9:: Bring the skills' `README.md` files and the descriptions into line with S6, per AC11 to AC13, and leave the routing tables and `help` output unchanged
- ::S10:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` from 5.3.2 to 5.3.3, or to 6.0.0 if Q1 takes an entrance away from any skill

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-08_GHI-56_settle-each-skills-invocation.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `git grep -n '^disable-model-invocation:' -- plugins/gh-solo/skills/reviewer/SKILL.md plugins/gh-solo/skills/implement/SKILL.md` exits 1, watched exiting 0 with `disable-model-invocation: true` inserted into `reviewer`'s frontmatter as a mutation
- ::V7:: `git grep -q -F '## How each skill is reached' -- plugins/gh-solo/README.md` exits 0, watched exiting 1 on the tree before S6

No gate here can see whether the S2 to S4 observations were read correctly, or whether the README's costs match them; the comment on #56 is the evidence, and the review round judges the prose against it. The criteria gate is off, since `.agents/gh-solo.md` carries no `Test files:` line.

## Open questions

- ::Q1:: **Do `pr-flow` and `tracker` keep the default, so the owner and the model both invoke them?** Recommended: yes, both, settled after S2 to S4 report their numbers. Owner-only would save each one's description in the listing, about 1k characters per session, but would block the model re-entering `pr-flow` through the Skill tool after a compaction keeps only its first 5,000 tokens, and would silence the trigger phrases both routing tables advertise. The write risk that prompted the question for `tracker` is already gated by #55's `TR-4`. S6 onward waits on this answer.

## Settled

- ::Q2:: Should a printed next step keep the `/gh-solo:` form, beside a line saying a sentence works too? No, decided by the owner in the terminal during the review round: the session printing it has the skill loaded, so the slash form is the one route that costs a whole reload. A step prints its shortcut, or the bare command where none exists; `:mr`, `:rr`, `:wt`, `:uwt`, `:im` and `:ds` join `:rp` and `:rc`; and the `reply` and `chat` verbs go, which is breaking and moves the version to 6.0.0.
