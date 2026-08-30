> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Cap the length of what a review round posts

Closes #14.

## Where the caps go, and why there

`plugins/gh-solo/skills/pr-flow/SKILL.md` already carries the AI-disclaimer bullet and the `via`-line bullet, and both govern every post the flow makes from either skill. `plugins/gh-solo/skills/implement/SKILL.md` reaches them by pointer rather than by copy — its own bullets name the `pr-flow` skill's `plugins/gh-solo/skills/pr-flow/SKILL.md` for the disclaimer wording and again for the standing `via` convention. A cap on what a post may contain is the same kind of fact about the same set of surfaces, so it belongs in the same place and travels by the same route. Nothing new is invented here: the pointer pattern is what makes "stated in exactly one place" achievable across two skills.

## The four caps

| Cap | Governs | The rule |
|---|---|---|
| Thread reply | `pr-flow` discuss thread reply; `pr-flow` review re-review verdict; the reply `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` Step 4 posts after an in-thread fix | Five sentences, the disclaimer and `via` line excluded |
| Fix plan | `pr-flow` review fix plan | The change and the files it touches. Not why the finding is right, which the finding already said, and not what was considered and rejected |
| Fix-landed reply | `implement` fix closing reply | The commit and any departure from the plan, one line each |
| Round report | `pr-flow` review round report | The reviewer's own report text plus the fixed header, with no restatement of findings that are already threads on the pull request |

The thread-reply cap is one cap over three surfaces rather than three caps, because all three are replies into a review thread and the owner reads them as the same kind of object. Writing three would break criterion 5 by construction.

The reviewer's own report already carries a 250-word cap in `plugins/gh-solo/skills/reviewer/SKILL.md`, so the round-report cap is a cap on what the orchestrator adds around that text, not a second cap on the text itself.

**The escape stays with the caps**: anything longer belongs in the commit message, which has a reader who wants it and lands in `git log` rather than in a thread.

**Precedence mirrors the disclaimer bullet.** Where the owner's global instructions file sets its own cap on a post under their name, that file wins and the plugin's number is the floor beneath it.

## How a cap is held, and how it is caught

Two different moments, and saying which is which is what keeps the *Convention checks* row honest.

**Held at write time**, by the workflow that composes the post. This is the same pattern `plugins/gh-solo/skills/pr-flow/workflows/review.md` already uses for the plain-fence rule on fix plans, which it states as "here it is yours to hold" precisely because `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` cannot see those replies. No script sees any of these posts either: they go out through `gh pr comment --body-file` and the replies endpoint, with no chokepoint between the composition and the API.

**Caught after the fact**, by the *next* round's *Convention checks*. A round cannot audit posts it has not made yet, so the row catches a breach one round late. That is worth having anyway — it is the same latency the `## Plan overview` row lives with — but it is not enforcement and the plan does not claim it is.

## Steps

- Add the post-caps bullet to `plugins/gh-solo/skills/pr-flow/SKILL.md`, beside the AI-disclaimer and `via` bullets: the four caps and the surfaces each governs, the precedence line, and the commit-message escape.
- Point each posting workflow at that bullet instead of restating the cap: `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` at its thread reply and its Step 4 fix reply, `plugins/gh-solo/skills/pr-flow/workflows/review.md` at its fix plan, its round report and its re-review verdict, and `plugins/gh-solo/skills/implement/workflows/fix.md` at its closing reply.
- Add the pointer to `plugins/gh-solo/skills/implement/SKILL.md`, in the bullet that already names `plugins/gh-solo/skills/pr-flow/SKILL.md` for the disclaimer and the `via` line, so a session inside that skill reads the caps by the route it already reads those.
- Add one row to *Convention checks* in `plugins/gh-solo/skills/pr-flow/workflows/review.md`. Its rule points at the caps bullet and says to count; it does not restate a number, which would put the cap in two places and fail criterion 5 by this diff's own edit.
- Watch each cap fail on a real over-long post. `izkreny/groupifico#190` is the corpus the issue already counted: 28 agent posts, 7,329 words, longest 486. Read the posts from that pull request through `gh api`, sort them by the `via` line into the four surfaces, and check each against the cap that now governs it. Record which cap rejected which post, and name any cap that rejected nothing — a cap with no rejection in that corpus is a cap that has not been seen to fail, and the issue's last criterion is not met for it.
- Tick the issue's acceptance criteria as each lands.

## Verification

- [ ] `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, run from the repository root with its exit code read directly and never through a pipe, per *Check commands* in `.agents/gh-solo.md`

That gate reads paths and fences. It cannot see any of what this branch is actually for: whether a cap is the right length, whether a workflow's pointer replaced the restatement rather than sitting beside it, or whether the caps bullet is itself over-long. Nor can it run the corpus exercise in the last step, which is a judgement made by reading posts and is deliberately not a checkbox — every box here has to close before the branch merges, so a box only a reading could close would block its own branch.

## Open questions

Five posting surfaces are left uncapped by this issue: the `implement` implementation record and fix map, the `implement` divergence note, the `pr-flow` resolve authorisation comment, and the `pr-flow` review convention check. Each is a Conversation comment rather than a thread reply, and the criteria name none of them. Leaving them uncapped is deliberate here rather than an oversight, and at least one resists a cap outright: `plugins/gh-solo/skills/implement/workflows/implement.md` requires the implementation record to carry **the same content** as the printed handoff, because the `auto` chain relays that comment verbatim, so a sentence cap on it would make the chain relay a different account from the one the workflow produced.

Cap them in this branch under a separate rule, or open a follow-up issue and leave this one to its four?

## Settled

None yet.
