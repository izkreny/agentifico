> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Point repo files at agents-guru

Issue [#257](https://github.com/izkreny/agentifico/issues/257), a child of epic #226. #256 moved `skills/skills-guru/` to `skills/agents-guru/` and left the label and the files outside its reach to this branch. #190 did the same job for the last rename, and its plan, `docs/plans/2026-09-29_GHI-190_point-repo-files.md`, is the model.

## Where this branch sits

**It is cut from the tip of `refactor/GHI-256_rename-skills-guru`, and its pull request targets that branch.** #257 is blocked by #256, and the issue's own `## Dependencies` says that is stack order. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names. The trunk sitting ahead of this branch is normal for a stack, so nothing is fast-forwarded.

## What changes

- `.agents/gh-solo.md`: the label table's `skills-guru` cell, the `-label:skills-guru` term of the audit query, and the label a non-agents-guru sweep files its tokens under. The last one also takes `an` for `a`. #256 already moved the check commands, the package list, the sweep invocation and every path.
- `AGENTS.md`: nothing. #256 already names `agents-guru` and `skills/agents-guru/` throughout. A grep confirms it.
- `README.md`: the package list's row links `skills/agents-guru/README.md` under the name `agents-guru`. Both strings keep their length, so the table's padding does not move.
- `skills/review-text/README.md`: the link points at `skills/agents-guru/workflows/review.md` under the name `agents-guru`. review-text's `metadata.version` moves from 1.0.1 to 1.0.2. This package file sits on a `repo` branch by the exception the owner granted #190 on RF2 of #202.
- The `skills-guru` label becomes `agents-guru`, and its description names `skills/agents-guru`. GitHub renames it on every issue at once, so it is the branch's last act.

## Steps

- Grep `AGENTS.md` for `skills-guru` and read no match.
- Rename the label cell, the audit query term and the sweep's token label in `.agents/gh-solo.md`.
- Rename the package list's row in `README.md`.
- Point the link in `skills/review-text/README.md` at agents-guru, and move review-text's `metadata.version` to 1.0.2.
- Run the docs-check command without the ignore, and read it fail on spans in `docs/plans/` only.
- Rename the label with `gh label edit skills-guru --name agents-guru --description "Package: skills/agents-guru"`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans --ignore 'skills/skills-guru/*'`
- `node skills/agents-guru/scripts/check.js skills/review-text`
- `python3 scripts/version-check.py`

The docs check targets neither `README.md` nor `skills/review-text/README.md`, so both links are checked by reading them. The version check's range spans the whole stack and cannot see which part moved, so the patch bump is checked by reading the frontmatter. Until the stack merges, `main`'s audit query names `-label:skills-guru`, so in that window it lists the epic's children as unlabelled.

## Open questions

None.

## Settled

- **May the docs check run with `--ignore`?** Yes, `--ignore 'skills/skills-guru/*'` and nothing wider, as #256's plan settled for every branch above it. The lower plans in the stack keep the old paths by design. #257's docs-check criterion is reworded to match, which that plan also named.
