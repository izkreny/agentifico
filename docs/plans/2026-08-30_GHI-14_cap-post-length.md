> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Cap the length of what a review round posts

Closes #14.

## Where the caps go, and why there

`plugins/gh-solo/skills/pr-flow/SKILL.md` already carries the AI-disclaimer bullet and the `via`-line bullet, and both govern every post the flow makes from either skill. `plugins/gh-solo/skills/implement/SKILL.md` reaches them by pointer rather than by copy — its own bullets name the `pr-flow` skill's `plugins/gh-solo/skills/pr-flow/SKILL.md` for the disclaimer wording and again for the standing `via` convention. A cap on what a post may contain is the same kind of fact about the same set of surfaces, so it belongs in the same place and travels by the same route. Nothing new is invented here: the pointer pattern is what makes "stated in exactly one place" achievable across two skills.

## What the cap applies to

**Every post that carries a `via` line.** That is the domain, and it is stated as a property rather than as a list, because the `via` bullet immediately above already enumerates the surfaces and a second enumeration would drift from it. It reaches a surface that does not exist yet by construction, and it excludes the PR body for exactly the reason `via` does — the body is unmistakably itself, and it lands in the squash commit on `main` where a cap on prose the owner reviewed at plan time would be the wrong constraint.

## The two rules

**A post is five sentences or bullets at most, the disclaimer and `via` line excluded.** Count them; mechanical, not a judgement. This is the number and the wording the repository already uses for `## Plan overview`, an issue's `## Overview` and an epic's `## What this delivers`, so it is one form applied to a new object rather than a new form.

**Never restate what the reader is already looking at.** A fix plan does not re-argue the finding it hangs under, a round report does not re-list findings that are already threads on the pull request, and a closing reply does not paraphrase its own commit. This is the rule that does the work the count cannot: five sentences of restatement are still five sentences of nothing.

**Not counted, because none of it is prose the agent chose the length of:**

- A fenced code block, and a table.
- A record row — one line per item, where the length is set by how many items there are rather than by how much was written. The fix map's `RF{n}`-to-commit rows and a convention check's failure list are both this; a seven-failure Review is not a cap breach.
- The owner's own words, quoted.
- A literal a gate reads, such as `RESOLVE AUTHORISED: RF1, RF3`.
- Text relayed verbatim from another producer. The reviewer's report is the only one, and it carries its own 250-word cap in `plugins/gh-solo/skills/reviewer/SKILL.md`, so the round-report cap bounds what the orchestrator writes around that text rather than the text itself.

**Where the detail has to exist, it goes in the commit message, which has a reader who wants it, and the post names where it went.**

**Precedence mirrors the disclaimer bullet.** Where the owner's global instructions file sets its own cap on a post under their name, that file wins and the plugin's number is the floor beneath it.

## The one surface the cap changes something for

`plugins/gh-solo/skills/implement/workflows/implement.md` requires the implementation record comment to carry **the same content** as the printed handoff, because the `auto` chain relays the comment verbatim in place of the print. **So the cap binds the print too**, and the bullet has to say so: capping only the comment would make the two diverge, which is the one thing that requirement exists to prevent. Both shrink together and the requirement survives untouched.

## How a cap is held, and how it is caught

Two different moments, and saying which is which is what keeps the *Convention checks* row honest.

**Held at write time**, by the workflow that composes the post. This is the same pattern `plugins/gh-solo/skills/pr-flow/workflows/review.md` already uses for the plain-fence rule on fix plans, which it states as "here it is yours to hold" precisely because `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` cannot see those replies. No script sees any of these posts either: they go out through `gh pr comment --body-file` and the replies endpoint, with no chokepoint between the composition and the API.

**Caught after the fact**, by the *next* round's *Convention checks*. A round cannot audit posts it has not made yet, so the row catches a breach one round late. That is worth having anyway — it is the same latency the `## Plan overview` row lives with — but it is not enforcement and the plan does not claim it is.

## Steps

- Add the post-caps bullet to `plugins/gh-solo/skills/pr-flow/SKILL.md`, beside the AI-disclaimer and `via` bullets: the domain, the two rules, the exclusion list, the precedence line, and the commit-message escape.
- Point each posting workflow at that bullet instead of restating the cap: `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` at its thread reply and its Step 4 fix reply, `plugins/gh-solo/skills/pr-flow/workflows/review.md` at its convention check, fix plan, round report and re-review verdict, `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` at its authorisation comment, `plugins/gh-solo/skills/implement/workflows/implement.md` at its divergence note and its implementation record, and `plugins/gh-solo/skills/implement/workflows/fix.md` at its closing reply and fix map.
- Extend the same-content requirement in `plugins/gh-solo/skills/implement/workflows/implement.md` so the cap reaches the printed handoff, keeping the comment and the print identical.
- Add the pointer to `plugins/gh-solo/skills/implement/SKILL.md`, in the bullet that already names `plugins/gh-solo/skills/pr-flow/SKILL.md` for the disclaimer and the `via` line, so a session inside that skill reads the caps by the route it already reads those.
- Add one row to *Convention checks* in `plugins/gh-solo/skills/pr-flow/workflows/review.md`. Its rule points at the caps bullet and says to count; it does not restate a number, which would put the cap in two places and fail the issue's fifth criterion by this diff's own edit.
- Watch the cap fail on a real over-long post. `izkreny/groupifico#190` is the corpus the issue already counted: 28 agent posts, 7,329 words, longest 486. Read the posts from that pull request through `gh api`, sort them by their `via` line, and count each against the rule that now governs it. Record what was rejected and on which rule, and name any surface the corpus contains no breach of — a cap with no rejection there has not been seen to fail, and the issue's last criterion is unmet for it.
- Tick the issue's acceptance criteria as each lands.

## Verification

- [ ] `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, run from the repository root with its exit code read directly and never through a pipe, per *Check commands* in `.agents/gh-solo.md`

That gate reads paths and fences. It cannot see any of what this branch is actually for: whether five is the right number, whether a workflow's pointer replaced the restatement rather than sitting beside it, or whether the caps bullet is itself over-long. Nor can it run the corpus exercise in the last step, which is a judgement made by reading posts and is deliberately not a checkbox — every box here has to close before the branch merges, so a box only a reading could close would block its own branch.

## Open questions

None.

## Settled

**Which surfaces the cap covers.** Every post carrying a `via` line, rather than the four the issue's criteria name. The owner's global instructions file already caps every comment under their name at five sentences, so the four were the plugin under-stating a rule that was universal in its source; the issue's own Overview lists the divergence note and the authorisation comment among the surfaces with no cap, so universal scope is inside the problem it states rather than an extension of it. The four named caps survive as per-surface consequences and each criterion stays tickable.

**What the number is.** Five sentences or bullets, disclaimer and `via` line excluded, and no word cap. Sentences are what every other cap in this repository counts and what a *Convention checks* row can count; a word cap would be a second unit for the same kind of object.

**Proportionality stays with #17.** "Write to the size of the change, not the size of the process" bounds how many posts a round makes, which is that issue's subject. This one bounds how long each post is, and the two hold independently.
