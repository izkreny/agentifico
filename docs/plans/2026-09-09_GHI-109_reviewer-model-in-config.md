> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Name the reviewer model in the gh-solo config

Closes #109.

## The problem

`plugins/gh-solo/skills/pr-flow/workflows/review.md` Step 1 reads a `Reviewer model:` line from `.agents/gh-solo.md` and passes its value as the spawn's model parameter. This repository carries no such line, so the reviewer agent's own `model: inherit` decides, and the reviewer runs on whatever the orchestrating session runs on. The owner wants the reviewer on Opus, and a round told so in the session can only cite the session, which dies with it.

## The approach

Add the key to `.agents/gh-solo.md` in its own section, beside the other per-repository facts the plugin reads. The value is `opus`, unconditionally: the key names one model for every round, so a session orchestrating on Opus gets an Opus reviewer too. The conditional form of the rule - which model reviews under which orchestrator - is not this file's business and stays where the owner keeps it; the line is the floor.

`Reviewer agent:` is deliberately absent. This repository uses the bundled `reviewer` agent, and a key restating a default is a drift surface.

Two things the value has to satisfy, both of which review.md Step 1 validates before it spawns: `opus` is a name the `Agent` tool's model parameter accepts, and it offers the `effort: high` that `plugins/gh-solo/agents/reviewer.md` pins. A value failing either refuses the round rather than falling back.

## Steps

- Add a `## The reviewer model` section to `.agents/gh-solo.md` carrying the `Reviewer model: opus` line and the reason it is unconditional.
- Run the verification gates below.

## Verification

- [ ] `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*' --ignore 'skills/skills-maker/scripts/*'` exits `0`, run unpiped so the exit code is the script's own
- [ ] `python3 scripts/version-check.py` exits `0`

What those gates cannot see: whether the line is in the form review.md Step 1 actually reads. Neither script parses the key, so the only proof is a round reporting the model as read from the file rather than from the session - which is this issue's second acceptance criterion, and which the review round on this branch is what closes.

`scripts/manifest-check.py` is not a gate here: the branch touches no manifest. The skills-maker suite is not either: it touches nothing under `skills/`.

## Open questions

None.
