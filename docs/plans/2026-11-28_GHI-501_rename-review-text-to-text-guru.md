> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Rename review-text to text-guru

Issue #501 holds the acceptance criteria. This plan says how. #256 made the last skill rename, and its plan, `docs/plans/2026-10-26_GHI-256_rename-skills-guru.md`, is the model.

## Where this branch sits

**It is the bottom of epic #353's stack, cut from `origin/main`, and its pull request targets `main`.** A child that joins an epic already carrying a sweep goes below the sweep, per *What an epic here must carry* in `.agents/gh-solo.md`. #354's branch, PR #499, goes on top of this one, and `gh stack link` makes the stack object once this pull request exists.

**This branch leaves #354's branch alone.** That branch still has to merge this one in, set the release's version, and move its own `skills/review-text/` (delete) paths and criteria. It is #354's work.

## What lands

`skills/review-text/` (delete) moves to `skills/text-guru/` (new) with `git mv`, so history follows the files. A grep over the package finds every mention to change:

- `skills/text-guru/SKILL.md` (new): the frontmatter `name`, the `/review-text` command in the description, and `issues` in the argument hint, the paragraph under `## Arguments`, the sentence above the table, the table's first row, the `fix` row and the `none` row.
- `skills/text-guru/README.md` (new): the title, the install command, the `/review-text` command and `issues` in the usage paragraph, and `issues` in the same three table rows.

Prose that uses "issues" as a plain word, not as an argument, stays as written. That is "reporting the issues" in the description and `no issues found` under `## Instructions`. The H1 in the skill file, `# Review text`, names what the skill does and stays too.

`metadata.version` moves by the patch, from 1.1.0 to 1.1.1, per *A stacked branch moves only the patch because no installer can fetch the versions in between* in `AGENTS.md`. The rename breaks what an installer types, so the commit and the PR title carry `!`. The type is `refactor`: the skill does the same thing under new names.

## The repository-level files

The owner granted these in the #499 discussion, as N5 on #501 records:

- `.agents/gh-solo.md`: the `review-text` entry of the `mandatory_axis` key becomes `"text-guru": "skills/text-guru/"`, and `skills/review-text` (delete) in the agents-guru check list becomes `skills/text-guru` (new).
- `README.md`: the package row names `text-guru` and links `skills/text-guru/README.md` (new).
- The label: `gh label edit review-text --name text-guru`, which keeps it on every issue that carries it.

Plans under `docs/plans/` keep the old name, since a plan records intent. So does the source comment in `skills/agents-guru/assets/Agentifico/Position.yml`, per N3.

## Steps

- ::S1:: Move `skills/review-text/` (delete) to `skills/text-guru/` (new) with `git mv`
- ::S2:: Rename the skill and the `issues` argument in `skills/text-guru/SKILL.md` (new) and `skills/text-guru/README.md` (new), per *What lands*
- ::S3:: Move `metadata.version` from 1.1.0 to 1.1.1
- ::S4:: Point `.agents/gh-solo.md` and `README.md` at `text-guru`
- ::S5:: Rename the `review-text` label to `text-guru`

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `node skills/agents-guru/scripts/check.js skills/text-guru`
- ::V4:: `node skills/agents-guru/scripts/check.js AGENTS.md .agents/gh-solo.md .agents/dependencies.md`
- ::V5:: `python3 scripts/version-check.py`
- ::V6:: `python3 plugins/gh-solo/skills/pr-flow/scripts/read-config.py get mandatory_axis` exits zero and names `text-guru`

The version check sees `skills/review-text/` (delete) as a retired package and `skills/text-guru/` (new) as a new one with nothing to compare against, so it passes on any version. The patch bump is checked by reading the frontmatter. No gate reads `README.md` or the label, so AC3's README row and AC4 are checked by reading `README.md` and `gh label list`.

## Open questions

None.

## Settled

None yet.
