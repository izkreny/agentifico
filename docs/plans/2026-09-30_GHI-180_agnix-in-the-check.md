> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Answer whether agnix earns a place in the check

Issue [#180](https://github.com/izkreny/agentifico/issues/180), a spike. It is not part of an epic, so the branch is cut from `main` and not stacked.

## What this branch carries

This plan and nothing else. The spike's deliverable is a comment on the issue, and the issue rules out a change to `skills/skills-guru/scripts/check.js`. Anything the run writes into the tree is reverted, so no package version moves.

## What moved since the issue was written

**The package was renamed.** The issue names paths under skills-maker; #189 renamed it, so every such path reads as `skills/skills-guru/`.

**#134 has landed, as #210.** It put every package file under the skills-guru standard, and the check still reads only markdown, plus the comments of `*.js` and `*.py` files. A plugin's `plugins/gh-solo/.claude-plugin/plugin.json`, its `plugins/gh-solo/hooks/hooks.json` and the frontmatter of `plugins/gh-solo/agents/reviewer.md` are still read by no rule, so the issue's first question stands as asked. Its note that a follow-up lands after #134 is already satisfied.

## How the run goes

**agnix joins `PATH` first, and its own help is read before any invocation is written.** The issue's account of how agnix is configured is a recollection until the tool confirms it.

**One run per package**, so the table can say which rule fired where: `plugins/gh-solo`, `skills/rails-style`, `skills/review-text`, `skills/skills-guru` and `skills/socratic-tutor`. The `prompt-engine` and `claude-memory` categories are off, per the issue, and no run takes `--fix`.

**The overlap reading covers every rule the check owns**, not only the three the issue names: each file under `skills/skills-guru/scripts/rules/` and the markdownlint set in `skills/skills-guru/scripts/lint-config.js`.

**The configuration question is answered by trying it, in both directions.** Outward: each form that would keep the configuration outside the target, a command-line option, an environment variable, a working directory outside the tree. Inward: whether a '.agnix.toml' or an inline disable comment inside the target still switches a rule off when the configuration comes from outside, since that is what *The check* in `skills/skills-guru/workflows/check.md` forbids.

**The comment is staged for the owner before it is posted.** It goes up under their name on a public issue, so they read it first. The follow-up issue, or the statement that agnix stays a sweep-time tool, waits on the same word.

## Steps

- Put agnix on `PATH` and read its help.
- Run it over each package with `prompt-engine` and `claude-memory` off, and record which rules fired on each.
- Give every fired rule a verdict, and name which side keeps each rule the check also states.
- Try each invocation form that keeps the configuration outside the target, in both directions, and record what each read.
- Write the verdict comment for #180, stage it for the owner, and post it on their word.
- Open the follow-up issue, or record on #180 that agnix stays a sweep-time tool, on the owner's word.
- Revert anything the run wrote into the tree.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `git diff --quiet origin/main...HEAD -- plugins skills scripts` exits zero, so the branch changed no package and no check.

The gates cannot tell whether a verdict is right. Whether a fired rule is a real defect, a duplicate or noise is a reading, and the owner judges it on the comment.

## Open questions

None.

## Settled

None yet.
