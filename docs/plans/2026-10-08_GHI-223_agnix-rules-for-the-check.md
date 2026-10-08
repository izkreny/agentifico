> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Answer which agnix rules the check should state

Issue [#223](https://github.com/izkreny/agentifico/issues/223), a spike and a child of epic #226.

## Where this branch sits

**It is cut from the tip of `feat/GHI-228_prefer-number-words`, and its pull request targets that branch.** #223 is blocked by #228, and the issue's own `## Dependencies` says that records the stack's order rather than a need for #228's work. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names, so the blocker does not stop the branch. For the same reason the trunk sitting ahead of this branch is normal for a stack and is not recovered here.

## What this branch carries

This plan and nothing else. The deliverable is a comment on #223 and the follow-up issues it names. The issue rules out a rule as a deliverable, so anything the reading writes into the tree is reverted and no package version moves.

## The source

**The catalogue is [knowledge-base/rules.json](https://github.com/agent-sh/agnix/blob/v0.56.6/knowledge-base/rules.json) in the agnix repository at tag `v0.56.6`.** Every rule there carries its category, its evidence and the pages it cites. The rows come from the categories the issue names: `agent-skills`, `claude-skills`, `claude-plugins`, `claude-hooks` and `claude-agents`. Each rule in them gets one row, so the table is the answer's spine.

## How a rule gets its verdict

**The source type is read first.** In the categories the issue names, the catalogue types each rule's evidence as `spec`, `vendor_docs`, `vendor_code` or `community`. Only `spec` and `vendor_docs` make a rule a candidate. A rule whose evidence is a vendor's code or community practice is not one, and its row says so without a re-read, since the issue admits the specification and vendor documents alone.

**#180's comment settles some rows already.** The rules it names as stated by the check are marked already owned, after a check that each named rule still holds them. The rules it found misfiring are skipped with that finding as the reason.

**Every remaining candidate's cited page is re-read**, never trusted from the catalogue. A rule whose page does not say what the rule checks is skipped with that reason. A rule the page supports is marked for porting, as a check rule under `skills/skills-guru/scripts/rules/` when it is mechanical, or as prose in `skills/skills-guru/workflows/new.md` or `skills/skills-guru/workflows/review.md` when it is a judgement.

**The reader question is answered from the rows.** The plugin, hook and agent rules judge a JSON manifest, a JSON hooks file and an agent's frontmatter, which the check does not read. The comment weighs how many of those rows port against the cost of a reader, and names the gaps #180 found on a copy broken on purpose: an unknown manifest key, an unknown hook event and a malformed agent name.

**The comment is staged for the owner before it is posted.** It goes up under their name on a public issue, so they read it first. The follow-up issues, or the statement that nothing ports, wait on the same word.

## Steps

- Read the categories the issue names from the catalogue at `v0.56.6`, one row per rule.
- Mark each rule sourced to a vendor's code or to community practice as skipped, and each rule #180 settled as owned or skipped, checking each owned rule against the check.
- Re-read the cited page of every remaining candidate and give it a verdict, naming the destination file of each rule that ports and the page that was re-read.
- Decide whether a reader for the manifest, hooks and agent files is worth building.
- Write the verdict comment for #223, stage it for the owner, and post it on their word.
- Open one follow-up issue per group of rules that ports together, or record on #223 that nothing does, on the owner's word.
- Revert anything the reading wrote into the tree.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `git diff --quiet origin/feat/GHI-228_prefer-number-words...HEAD -- plugins skills scripts` exits zero, so this branch changed no package and no check.

The gates cannot tell whether a verdict is right. Whether a page supports a rule, and whether a reader is worth its cost, is a reading the owner judges on the comment.

## Open questions

None.

## Settled

Decisions the owner made in the terminal while this spike ran, recorded here per `plugins/gh-solo/skills/pr-flow/workflows/discuss.md`. The verdict on #223 is the outcome they shaped.

**Is a rule skipped because no file in this repository uses the field it judges?** No. A first draft skipped such rules as "unused", and the owner overruled it: a mistake someone else has already documented is a lesson learned, so guarding against it is not speculation. Every such row was judged again on its source and its page.

**Does a rule that copies a vendor's list of valid values port?** No. Model names, tool names, hook events and effort levels grow with Claude Code releases, and a stale copy in the check would flag correct files. A list of values that only narrows a warning, such as the events that ignore a matcher, can port, since a stale copy only misses a warning.

**What answers the reader question?** `claude plugin validate --strict`, which reports most manifest and hooks rules and moves with Claude Code. Its rows port as prose in #281, which tells a sweep to run it. The six documented mistakes it passes are worth a JSON reader, in #279. An agent file needs no new reader, since the check already reads every markdown file.

**Is the answer checked before it is posted?** Yes. At the owner's request a second agent re-derived every row from the catalogue, the pages and the validator, and its corrections are in the verdict.

**How does the verdict read?** Every reason is a full sentence that reads without the legend. A ported row names the issue that builds it and the page re-read, and every rule id links to its page in agnix's documentation.

**Where do the follow-ups go?** Inside epic #226, as #278 to #281, stacked after #231 and before the rename in #256, so the sweep #229 stays on top.

**What happens to the agnix defects found on the way?** They go upstream, as the maintainer asked on #180: agent-sh/agnix#1639 to agent-sh/agnix#1644, each reproduced on agnix 0.56.6.
