> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Review the gh-solo skills before the 2.1.0 tag

Implements #29, the second child of epic #26. `plugins/gh-solo/.claude-plugin/plugin.json` already reads `2.1.0` after #25 merged, and the `gh-solo_2.1.0` tag is not pushed. This branch is what stands between the two: the package's whole-skill sweep, its triage, and the fixes the triage keeps.

## Why the sweep is a branch at all

`.agents/gh-solo.md` says a whole-skill review is its own issue, one per package, opened before that package's `<name>_<version>` tag, and never a `## Verification` box on a branch. So the sweep has nowhere else to run: a branch that changes one skill file cannot carry it, because a whole-file review returns findings that branch never touched, and a gate that reports something unrelated every time gets waved through. The release is the trigger that fires where the habit does not.

The tag is also not bookkeeping. A review round spawns the reviewer from the *installed* plugin, so the `effort: high` pin #25 wrote does nothing on this machine until `gh-solo_2.1.0` is tagged and the plugin updated. Every round run before then still spawns at `xhigh` and still reads the unconditional fetch list, which is the cost #26 exists to cut.

## The sweep runs in a fresh-context subagent, and the agent id is kept

`skills/skills-maker/SKILL.md` and `skills/skills-maker/workflows/review.md` both want a reader who has not already reasoned its way to why every line looks the way it does. This session wrote this plan and will write the fixes, so it is the wrong reader twice over.

Keeping the spawned agent's id is not tidiness either. `skills/skills-maker/workflows/review.md` Step 5 re-verifies the fixes by resuming that same agent rather than starting a second audit, so it judges each fix against what the finding originally meant. Losing the id costs a full second read and a weaker verdict, and it is lost by default.

The path cited is `skills/skills-maker/`, this repository's own copy, which `AGENTS.md` sanctions under *Skill files follow the skills-maker rules* precisely so it can be cited rather than duplicated.

## What the sweep reads, and what it is not

The target is the package `plugins/gh-solo/` and every file in it: the skills under `plugins/gh-solo/skills/`, the reviewer agent under `plugins/gh-solo/agents/`, the hook under `plugins/gh-solo/hooks/`, and each README written for a human reader. `skills/skills-maker/workflows/review.md` Step 1 asks for every file whatever the layout, because a routing skill's defects are usually contradictions between two files and are invisible when only one is read.

Out of scope, and worth naming so the diff does not grow into them: every other package. `skills/skills-maker/` is a package with its own label, its own version and its own sweep issue when its own tag comes; so are the other entries under `skills/`. A finding about the reviewing skill itself is recorded and handed to that package, never fixed here.

## Triage is a decision per finding, and a declined finding still gets written down

Every finding ends in one of two places: fixed on this branch, or declined with the reason recorded on #29. A third outcome, quietly dropping one, is what makes the next sweep re-derive it.

Declined is a legitimate outcome and needs its reason kept where the next sweep will find it, which is the issue rather than this plan or a commit message. Two shapes are expected: a finding that is style rather than defect, which `skills/skills-maker/workflows/review.md` Step 4 asks to be separated explicitly; and a finding whose fix is a design change large enough to deserve its own issue, which is a decline here plus a new issue rather than a silent expansion of this branch.

## The version does not move again

`2.1.0` is already in `plugins/gh-solo/.claude-plugin/plugin.json` and unreleased, so fixes this branch lands ship under it. A second bump would mean tagging a version nobody could have installed, and the tag this issue exists to unblock is the one already named.

## The tag and the observation after it are not this branch's to close

Two of #29's acceptance criteria live past the merge. The tag has to point at the squash commit on `main`, which does not exist while this branch is open, and the confirmation that a round spawns the reviewer at `effort: high` needs the installed plugin updated to that tag. Neither is a gate this branch owes, and neither appears in `## Verification` below, where every box has to close before merge. `## Open questions` is where the handling is proposed.

## Steps

- Spawn a fresh-context subagent over `plugins/gh-solo/`, following `skills/skills-maker/workflows/review.md` from Step 1, and keep the agent id it returns.
- Record the findings it returns, ranked by consequence, in a comment on #29 so the triage has a fixed reference that survives the branch.
- Decide each finding: fix here, or decline. Record every decline with its reason in the same comment thread on #29, and open a separate issue for any decline whose fix is a design change.
- Land the kept fixes, in as few commits as make sense, each with its own conventional type since a sweep's fixes are not all one kind of change.
- Resume the same subagent per `skills/skills-maker/workflows/review.md` Step 5 with the fix commits, and ask for a per-finding CLOSED / NOT CLOSED / REGRESSED verdict, its judgement on any fix that took a different design than it proposed, and a regression pass over the changed files. Report only, no edits.
- Act on any NOT CLOSED or REGRESSED verdict, then re-verify again by the same route.
- Leave `plugins/gh-solo/.claude-plugin/plugin.json` at `2.1.0`, and touch `.claude-plugin/marketplace.json` only if a finding moves the plugin's description, which is the one field the two manifests share.
- Record a finding about any package other than `plugins/gh-solo/` on that package's own tracker, and do not fix it here.

## Verification

Gates, each with an exit code:

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, the command `.agents/gh-solo.md` states for this repository, read by exit code and never through a pipe.
- `python3 -c "import json,sys; d=json.load(open('plugins/gh-solo/.claude-plugin/plugin.json')); sys.exit(0 if d['version']=='2.1.0' else 1)"`, which fails if a fix moved the version.
- The two manifests still carry the same description string, compared as values rather than read side by side, since `.agents/gh-solo.md` records that they have drifted before.
- `git diff --stat origin/main` names only this plan and files a recorded finding names, and nothing under `skills/`.
- `gh issue view 29 --comments` shows the findings list and a recorded outcome for every entry in it.

**Conditional benches are added to the pull request body when their condition fires, not before.** `.agents/gh-solo.md` names three that depend on what the sweep touches: `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` after any edit to `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`, `bash plugins/gh-solo/hooks/test-ask-before-trunk-push.sh` after any edit to `plugins/gh-solo/hooks/ask-before-trunk-push.py`, and an `mmdc` render of any mermaid diagram in a README that changes. Listing them as boxes at plan time would put boxes in the body that may never have a condition to close them, and `plugins/gh-solo/skills/pr-flow/workflows/ready.md` refuses on an empty box.

**No `[owner]` box.** Every box here has to close before merge, and both `ready` and `merge` refuse on an empty one, so a box the owner alone can close blocks its own branch. The judgement below is prose for that reason.

What these gates cannot see: whether the triage was right. Every gate above proves that a decision was recorded and that the diff stayed inside its package; none of them can distinguish a finding correctly declined as style from one declined because fixing it was inconvenient. That is the owner's read of the #29 comment against the diff, and it is the whole substance of this issue. The gates also cannot see the sweep's coverage: a subagent that read six files of the package and reported cleanly is indistinguishable at the exit code from one that read all of them, which is why the report is asked to name its file set.

## Open questions

- **How do the two post-merge acceptance criteria on #29 close?** They cannot tick on this branch: the tag has to point at the squash commit on `main`, and the `effort: high` observation needs the plugin updated to that tag. `plugins/gh-solo/skills/pr-flow/workflows/merge.md` reports an unticked criterion and asks rather than refusing, so the proposal is that the owner acknowledges both at the door and they tick when the tag is pushed. The alternative is splitting them into a follow-up issue that #29 blocks, which keeps the tracker honest at the cost of an issue whose whole content is two commands.
- **Does a finding whose fix is a design change get declined here, or does it grow this branch?** The plan above declines it and opens an issue, on the grounds that a sweep's job is to find and triage rather than to become the vehicle for whatever it finds. The cost is that the tag ships with a known defect recorded against it. Where the finding is severe enough that tagging over it is wrong, the answer has to be the other one, and the threshold is the owner's.

## Settled

- **Every finding the sweep returns is fixed on this branch.** Settled by the owner, against this plan's own proposal of declining a design-change finding into its own issue. The sweep returned 57 defects across the four skills and the package shell; all of them land here, the work is not split into a successor issue, and a decline is now the exception rather than the routing rule. `## Steps` keeps its frozen wording; this entry is what governs.
- **The findings record is `## Findings` below, in this file.** Settled by the owner. `## Steps` asks for the ranked findings and every decline reason in a comment on #29, which a comment under the owner's name cannot carry at that length; the commit messages alone are no better, because they name what a commit closed in prose and nobody can audit 57 defects against them. The record therefore lands in the plan, which is already on this branch, is already public and permanent, and needs no new directory and no row in a file belonging to another package. The cost, stated rather than hidden: the plan stops being purely frozen intent. `## Findings` is an appendix of evidence rather than a rewrite of intent, and `## Steps` above is untouched.
- **A finding about a package other than `plugins/gh-solo/` is not fixed here.** Settled by the owner's rule that a package's version never moves for another's change, which `AGENTS.md` states. Those findings carry `repo` or `skills-maker` in the table below and go to that package's own tracker.

## Findings

The sweep of 2026-08-29, run per `skills/skills-maker/workflows/review.md` over `plugins/gh-solo/`, in four fresh-context subagents: one per skill, plus one for the package shell. 704,371 subagent tokens, 130 tool calls. `WRONG` in each agent's report means a defect in the skill, against `DIFFERENT, not wrong` for a style choice it dismissed; only the former is listed here.

Ids are this table's own, grouped by the reviewer that raised the finding: `PF` pr-flow, `TR` tracker, `IM` implement, `RV` the reviewer skill and the package shell. Where two reviewers raised the same defect from different files, the row names both and the duplicate is not listed twice.

| Id | Site | Defect | Closed by |
|---|---|---|---|
| PF1 | `open.md:117,137`, `ready.md:23`, `auto.md:46` | The `[owner]` judgement checkbox deadlocks its own merge: `ready` and `merge` both refuse an empty `## Verification` box, so a check whose evidence cannot exist before the branch lands is clearable only by ticking it untruthfully. Raised again as IM9. | `327151d` |
| PF2 | `review.md:203-211` | A re-review's new defects sit on lines only the unpushed fix commits contain, so the inline anchor cannot resolve; the call is atomic, so the 422 takes the closed findings' verdicts with it. | |
| PF3 | `review.md:197-201`, `discuss.md:207-215` | Step 4 re-runs the repository's own gates, which this skill's narrowed `Bash` grant cannot run, and it never says to enter the `implement` skill that can. | |
| PF4 | `review.md:205` | The scoped re-review hardcodes the bundled reviewer, silently ignoring a `Reviewer agent:` appointment that Step 1 refuses to override, and has no defined behaviour at all for `Reviewer command:`. | |
| PF5 | `SKILL.md:4` | "resolve all and push" is printed to the owner as their next move in four places and routed in the body, and appears nowhere in `description:`, so a fresh session cannot fire it. | |
| PF6 | `discuss.md:201-205,230` | The stated reason for not resolving ("an agent setting `isResolved` destroys the signal") contradicts the protocol that owns resolution, which makes resolving the orchestrator's act. The rule is right; its justification is a premise that stopped being true. | |
| PF7 | `review.md:126-133` | The appointed-command findings file is specified with seven fields where `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` requires nine plus two top-level keys, so the path refuses the whole round on first use. Same root as RV6. | |
| PF8 | `discuss.md:119-122` | `reviewThreads(first:100)` and `comments(first:20)` truncate with no `pageInfo`, and GraphQL returns the *oldest* twenty while the classification reads the newest. Three gates consume it, including the merge door. | |
| PF9 | `ready.md:63` | Prints `✅ ALL PASS` over the bookkeeping misses its own Step 3 defines, and a third sentence at `:73` disagrees with both. | |
| PF10 | `review-protocol.md:47` | Asserts "nothing in this plugin answers that tab" about Conversation comments, which `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` answers, in the file that declares itself authoritative over every workflow. | |
| PF11 | `plugins/gh-solo/skills/pr-flow/README.md` | No install section, which `skills/skills-maker/workflows/new.md` makes a review defect at every size. Same defect as TR6, IM11. | |
| PF12 | `review.md:102` | `../../reviewer/SKILL.md` is written relative to the file rather than the skill, breaking the anchor `SKILL.md:15` declares; `plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` cannot catch it because it skips any span containing `..`. | |
| PF13 | `discuss.md:46-79`, `review.md:154` | The watch loop and the RF-max pipeline do not prefix-match the granted `Bash(gh:*)`, so a permission prompt lands inside the block that must run unattended. | |
| PF14 | `merge.md:157` | "Worth doing, not yet done" is a to-do about the author's own repository, shipped to every repository the plugin serves. | |
| PF15 | `stack.md:34` | The bolded half says `-m` is not required; the unbolded half says omitting it hangs the session on `$EDITOR`. Bold is what a skimming agent takes. | |
| PF16 | `review.md:3`/`resolve.md:3`, `discuss.md:17`, and the evidence-form counts in three files | Duplicated blocks that will drift, where one copy should own the fact and the rest point at it. | |
| PF17 | eight sites | `viewerPermission` fetched and unused; `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` given a relative path that will not resolve from a served repository; `SKILL.md:97` and `:111` disagreeing about `help`; the watch-arming rule stated absolutely while `plugins/gh-solo/skills/pr-flow/workflows/auto.md` claims a carve-out; `merge.md:98` asserting what `:141` says to check; `docs-check.py:90` truncating a fence opener to three characters; `open.md:77` pointing at an ignore set written for another tree; two routing rows for one phrase. | |
| TR1 | `standards.md:191-196`, `search.md:19` | The mandatory-axis audit hardcodes the default layer values two paragraphs after saying a repository may replace them, so under an override it excludes nothing and reports every open issue as unlabelled. This repository already had to write the missing rule into its own config. | |
| TR2 | `SKILL.md:80`, `state.md:9-19` | `milestone` is an advertised verb routed into a workflow whose first two steps demand an issue number a milestone operation does not have. | |
| TR3 | `create.md:54-64,74-97` | The only workflow that creates issues never sets a milestone, though `next` sorts on milestone first and the standards insist it go on the leaf issues. | |
| TR4 | `SKILL.md:25`, `standards.md:407`, `search.md:72` | "in queue" is a documented meaning of `@me` that no operation produces, and `next` excludes a state the tool cannot create. | |
| TR5 | `SKILL.md:49` | Claims a key set is "stated here in full" and that this is "the one workflow" offering to create the file: a completeness claim about another file, a uniqueness claim that is false twice, and an offer no workflow step picks up. | |
| TR6 | `plugins/gh-solo/skills/tracker/README.md` | No install section. Same defect as PF11, IM11. | |
| TR7 | `SKILL.md:15` | "because it is a personal skill used across several repositories" is no longer true; it ships in a marketplace plugin. | |
| TR8 | `tracker/README.md:17` | The mermaid subgraph is labelled `tracker · the tracker`, against the pattern its sibling follows. | |
| TR9 | `github-access.md:16` | "Two lines matter" is a count of adjacent content in a preflight file. | |
| TR10 | `standards.md:18,130,191,219`, `SKILL.md:23,25`, `README.md:47` | Position and uniqueness claims that make a file cited by section name resistant to reordering. | |
| TR11 | `status.md:18`, `validate.md:16` | `blocking`, `comments` and `issueType` are fetched and never used, and the standards are emphatic that a status pass must read the comments it asks for. | |
| TR12 | `SKILL.md:62` | "reopen" and "mark it in progress" are auto-trigger phrases with no counterpart in `description:`. | |
| TR13 | `create.md:9` | An enumeration ending in a catch-all, on the freshness check the same file declares not skippable. | |
| TR14 | `validate.md:32` | Checks two of the body template's headings and is silent on the others, including in the section that exists to say what is deliberately not checked. | |
| IM1 | `fix.md:33-49` | The `## Plan overview` update the protocol requires at step 4 has no site anywhere, and the squash writes the PR body onto `main` as a commit message nobody can correct. | |
| IM2 | `fix.md:37` | The fix-result reply omits whether the fix departed from the step 3 plan, which the protocol calls the entire reason steps 3 and 4 are two posts. | |
| IM3 | `implement.md:93` | A flat "Never edit the plan file" contradicts three sites that carve out the `docs:` commit applying a settled decision, and it is in context exactly when Step 1 asks for that commit. | |
| IM4 | `fix.md:21,24` | The jq projection drops `in_reply_to_id`, so a finding is indistinguishable from a reply; measured on PR #27, 38 comments of which 28 were replies. | |
| IM5 | `SKILL.md:34` | The contract's "a plan naming no gates stops the work" has no implementation site: an empty `## Verification` runs every gate vacuously and reaches `✅ ALL PASS`. | |
| IM6 | `implement.md:80,82` | The PR comment is called "the same record" as the printed handoff and then given a different content list, while `plugins/gh-solo/skills/pr-flow/workflows/auto.md` relies on the identity. | |
| IM7 | `SKILL.md:25` | Quotes "*implementation - not this skill*" as `pr-flow`'s wording; that phrase exists nowhere in the plugin. | |
| IM8 | `implement.md:64` | "the one state this skill promises not to keep" is false of `plugins/gh-solo/skills/implement/workflows/fix.md` Step 5, which mandates exactly that state. | |
| IM9 | `implement.md:77` | "`[owner]` boxes to fill (the normal case)". Closed with PF1. | `327151d` |
| IM10 | `fix.md:5,7,24`, `README.md:33,39`, `SKILL.md:31` | Counts of adjacent content. | |
| IM11 | `plugins/gh-solo/skills/implement/README.md` | No install section. Same defect as PF11, TR6. | |
| IM12 | `SKILL.md:43` | The never-install bullet duplicates the owner's global instructions with no precedence clause, and says the rule is a category rather than a list before supplying a list. | |
| IM13 | `implement.md:46`, `README.md:31` | "The repository squash-merges" as fact, where `plugins/gh-solo/skills/pr-flow/workflows/merge.md` says the setting is per-repository and not a default. | |
| IM14 | `SKILL.md:33` | "(loaded into the session automatically)" is a harness premise the workflow already works around with an explicit read. | |
| IM15 | `implement.md:13` | "the first thing this workflow does" is preceded by three steps in the same workflow. | |
| RV1 | `plugins/gh-solo/hooks/ask-before-trunk-push.py`, its bench | The command was cut with a regex before quoting was resolved: silent on `(git push …)`, a trailing `&` and `bash -c`, and firing on any command that merely mentions the phrase. `-C` was parsed only enough to be skipped. The bench proved neither. | `60d9528` |
| RV2 | `agents/reviewer.md:12` | Turns a prohibition into a handling procedure: three files forbid an account of the diff reaching the reviewer, and the agent said to read one as a claim to check. | `748d473` |
| RV3 | `plugins/gh-solo/skills/reviewer/SKILL.md` | The only one of the four skills missing the skill-relative path anchor, in the one skill whose working directory is the repository under review. | `748d473` |
| RV4 | `plugin README:19,26` | Claims every skill has a `help` verb, which two do not, and omits the hook from the Python 3 requirement although it runs in every session. | `748d473` |
| RV5 | `plugins/gh-solo/skills/reviewer/SKILL.md` | 3,286 words against `skills/skills-maker/workflows/new.md`'s split threshold, with the concrete cost that the `rescope` entrance loads the full fetch list and a later section spends its length undoing it. | |
| RV6 | `reviewer/SKILL.md:184` | Names three required finding fields where the script requires nine and refuses the round on a miss. Same root as PF7. | `748d473` |
| RV7 | `plugin README:47,63,75`, `reviewer/SKILL.md:88`, `baseline.md:7,61,63` | Counts of adjacent content and position claims, including a cached count of an upstream file the same section says is synced by hand. | `748d473` |
| RV8 | `baseline.md:24` | Points at `../SKILL.md` without naming the heading, so the pointer cannot fail loudly, which is the whole reason a pointer beats a copy. | `748d473` |
| RV9 | `plugins/gh-solo/.claude-plugin/plugin.json` keywords against the marketplace entry's tags | The two lists have already drifted by one value, and the config's drift warning covers only the descriptions. The marketplace manifest is the `repo` package. | `repo` issue |
| RV10 | marketplace entry, `AGENTS.md` | `AGENTS.md` says a plugin's version lives in its manifest "and its marketplace entry", which carries no version field; adding one creates a silently-disagreeing second copy, so the sentence is what is wrong. `AGENTS.md` is the `repo` package. | `repo` issue |
| RV11 | `agents/reviewer.md:14`, `review.md:106,219` | States as fact an environment-variable precedence over a spawn-time model request that is not documented, and prints it to the owner as a caveat on the figure they compare rounds by. | `748d473` (agent file) |
