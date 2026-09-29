> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Point repo files at skills-guru

Issue [#190](https://github.com/izkreny/agentifico/issues/190), the second child of epic [#188](https://github.com/izkreny/agentifico/issues/188). #190 is blocked by #189, and that block is the stack's order. This branch is cut from the tip of `refactor/GHI-189_rename-skills-maker`, and its pull request has that branch as its base.

## The tree this plan describes

#189's branch was cut before #201 and #203 landed on `main`. #201 retired daisyui-designer, which dropped its row from the label table and its term from the audit query in `.agents/gh-solo.md`. #203 replaced `README.md`, which now lists every package. This plan describes those files as they are on `main`, so the stack is synced before any edit.

PR #202 carries no GitHub stack object yet. So the sync first links the two pull requests into a stack, then adopts it locally, then syncs. The sync rebases both branches onto `main` and force-pushes them. The primary checkout holds `main`, and a checked-out trunk blocks the sync's fast-forward, so it is detached for the sync and reattached after.

## What changes

- `.agents/gh-solo.md`: the label table's `skills-maker` cell, and the `-label:skills-maker` term in the audit query, both become `skills-guru`. The sweep invocation already reads `/skills-guru review`, since #189.
- `AGENTS.md`: nothing. #189 already names `skills-guru` and `skills/skills-guru/` throughout, per RF1 on #202. A grep confirms it.
- `skills/review-text/README.md`: the link to skills-maker's review workflow points at `skills/skills-guru/workflows/review.md` and carries the name `skills-guru`. review-text's `metadata.version` moves from `1.0.0` to `1.0.1`. This package file sits on a `repo` branch by the owner's decision on RF2 of #202.
- `README.md`: the package list's skills-maker row links `skills/skills-guru/README.md` under the name `skills-guru`. The table is padded again so its columns line up.

## Steps

- Link PR #202 and this branch's pull request into one stack with `gh stack link`, bottom first, then adopt it with `gh stack checkout`.
- Detach the primary checkout from `main`, run `gh stack sync`, then reattach it. A conflict in the label table is resolved inside the stack tooling, never with a raw `git rebase`.
- Rename the label's table cell and its audit query term in `.agents/gh-solo.md`.
- Grep `AGENTS.md` for `skills-maker` and read no match.
- Point the link in `skills/review-text/README.md` at skills-guru, and move review-text's `metadata.version` to `1.0.1`.
- Rename the skills-maker row in the package list of `README.md`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`

The docs check runs without `--ignore`, which is the issue's own criterion. On this branch the substitution names both #189's plan and this one. The version check's range spans the whole stack, so #189's bump of skills-guru satisfies it as well. It cannot see which part moved, so review-text's patch bump is checked by reading the frontmatter. The audit query is no gate: until the label is renamed, it lists the epic's `skills-maker` issues as unlabelled.

## Open questions

None.

## Settled

- **When does the label rename happen, and which issue owns it?** Epic #188 owns it, in its `## Done when`, run right after `gh stack merge`. #190's criteria no longer carry it.
