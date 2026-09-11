> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Review and version skills-maker

Issue [#158](https://github.com/izkreny/agentifico/issues/158), the last child of epic [#156](https://github.com/izkreny/agentifico/issues/156), stacked on [#141](https://github.com/izkreny/agentifico/issues/141)'s branch.

## What the sweep read, and where its findings came from

`/skills-maker review skills/skills-maker` was run inline against this tree at `6e1ffbb`, which is the tip of `feat/GHI-141_separate-failure-classes` and the commit this branch was cut from. Every other child of the epic is in that ancestry: [#124](https://github.com/izkreny/agentifico/issues/124) at `a757ff9`, [#142](https://github.com/izkreny/agentifico/issues/142) at `183d28f`, [#141](https://github.com/izkreny/agentifico/issues/141) at `6e1ffbb`. The mechanical run was clean on that tree, `7 files checked, 0 issues, 0 warnings`, and the suite passed 174 of 174, so every finding below is prose or contract rather than something a rule already decides.

**The run did not receive the short-id line the issue's invocation carries**, so its findings arrived numbered one to eight. This plan names them `S1` through `S8`, `S{n}` being the reviewer's section n, and the fix commits cite those ids. One id scheme, decided here, so nothing later has to guess which numbering a commit means.

**The reviewer's line citations do not resolve, and its file and symbol citations do.** It cited lines past the end of files that are 29 to 73 lines long. Each finding was re-located by content in this tree before it entered this plan, and the sites named below are the ones that exist. A fix commit cites the site it actually changed.

**The reviewer resolved `S8` itself and it is not a step.** The duplication it names is between this skill's own authoring rules and the owner's global instructions file; the skill's copy has to exist for the skill to be exportable, so the skill owns it and any deduplication is outside this package.

**The reviewer named one shortfall in its own pass.** The three files under `skills/skills-maker/scripts/test/` were grepped for specific questions rather than read whole, so a defect living only in a test body escaped it. That is recorded rather than hidden, because the tag this sweep precedes asserts the package was read whole.

## Where the re-verification happens, and why not here

**The review ran in the owner's own session rather than in a subagent**, so there is no agent id to resume and `skills/skills-maker/workflows/review.md` Step 5's resume is the owner's to run, in that session, against this branch's fix commits. This session cannot reach it. That is why no finding below is set aside as phantom: setting one aside is only answerable by the resumed reviewer, and every actionable finding is therefore fixed rather than argued with.

If that session is gone by then, Step 5's own fallback applies: a fresh review pointed at the fix commit.

## The findings, and what each one costs to leave

**`S1` - the router runs on `$ARGUMENTS`, which the specification does not define.** `skills/skills-maker/SKILL.md` hinges on it in three places, and `skills/skills-maker/workflows/new.md` lists the Claude Code extensions other agents ignore without naming it. On an agent that does not expand the placeholder the skill reads a literal `$ARGUMENTS` and has nothing to route on. The routing list also has no branch for an argument matching none of its prefixes.

**`S2` - the skill breaks its own sweep item.** `skills/skills-maker/workflows/check.md` makes "every advertised verb routes somewhere, and every route is advertised" a by-hand sweep item, and the install, pin and update route carries no verb in `argument-hint`. Satisfying the rule is cheaper than softening it, and with `disable-model-invocation: true` the argument is typed anyway, so a verb costs nothing.

**`S3` - a sweep item requires the author's own convention.** `skills/skills-maker/workflows/check.md` names "a `README.md` with the AI disclaimer line" as what that file owes on its opening line, and `skills/skills-maker/workflows/export.md` states the governing rule: the skill may practise its author's conventions and must not require them.

**`S4` - `skills/skills-maker/README.md` asserts facts about other tools that nothing here can recheck.** The survey of what neighbouring tools do not do is true when written and silently false later, in a public README, and no check reaches it.

**`S5` - the truncation trap is guarded for `description` only.** `skills/skills-maker/scripts/rules/skill-frontmatter-parsed.js` says in its own comment that the same edit anywhere in the frontmatter drops the tail of whatever key it lands in, and that this package's own `compatibility` is that exact shape. `skills/skills-maker/SKILL.md` scopes the fact to the description and `skills/skills-maker/workflows/new.md` tells an author to block-scalar the description alone, so an author following it writes the vulnerable shape. The same rule enforces the specification's 1024-character description ceiling and `skills/skills-maker/scripts/rules/skill-name.js` the 64-character name ceiling, and nothing enforces `compatibility`'s documented 500.

**`S6` - the two rules disagree about which duplicate key wins.** `skills/skills-maker/scripts/rules/skill-invocation.js` reads `dl.at(-1)` because last wins, and `skills/skills-maker/scripts/rules/skill-description.js` reads `dl[0]` and judges its traps. Both report the duplicate, so a file is never silently clean, but the trap sweep runs on the value that does not load: a truncation in the winning description is reported as a duplicate key and never as a truncation.

**`S7` - `enclosingSkill` compares paths by string prefix.** `skills/skills-maker/scripts/rules/skill-layout.js` treats a sibling directory whose name extends the stop's as being inside it. It is unreachable through `skills/skills-maker/scripts/check.js`, which globs under the target, and the function is exported and tested on its own.

## Steps

- Add `$ARGUMENTS` to the list of Claude Code mechanisms other agents ignore in `skills/skills-maker/workflows/new.md`, beside `argument-hint`, `disable-model-invocation` and `user-invocable`, so an author is told the router's own substitution is one of them.
- State in `skills/skills-maker/SKILL.md`'s routing what to do when the placeholder arrives unexpanded, which is to read the argument from the conversation, and add the branch the list has no answer for, which is an argument matching no prefix: say so rather than guessing a verb.
- Give the install, pin and update route a verb in `skills/skills-maker/SKILL.md`'s `argument-hint` and a matching line in its routing list, and add the verb to the argument table in `skills/skills-maker/README.md`, so the sweep item in `skills/skills-maker/workflows/check.md` passes on this skill rather than reporting it.
- Reword the opening-line sweep item in `skills/skills-maker/workflows/check.md` to what a `README.md` opens with in general, a heading or a byline, so the item is about the file's opening rather than about one author's convention.
- Cut the survey of what neighbouring tools do not do from `skills/skills-maker/README.md`, keeping what this skill does that a YAML parser cannot, which is the raw-line sweep, and dropping the claims no check can recheck.
- Rewrite `skills/skills-maker/SKILL.md`'s `compatibility` as a block scalar, so the package's own frontmatter is the shape its rules recommend.
- Widen the block-scalar instruction in `skills/skills-maker/workflows/new.md` from the description to any long plain value, since the trap is the key's, not the description's.
- Enforce `compatibility`'s 500-character ceiling in `skills/skills-maker/scripts/rules/skill-frontmatter-parsed.js`, beside the description ceiling that rule already enforces.
- Read the last `description:` line rather than the first in `skills/skills-maker/scripts/rules/skill-description.js`, so the trap sweep judges the value the parser loads, matching what `skills/skills-maker/scripts/rules/skill-invocation.js` already does.
- Compare paths by segment rather than by string prefix in `skills/skills-maker/scripts/rules/skill-layout.js`, and drop the length clause beside it that the prefix test already implies.
- Add an assertion per code fix to `skills/skills-maker/scripts/test/rules.test.js`: a `compatibility` over the ceiling, a duplicate `description` whose winning value carries a truncation, and a sibling directory whose name extends an enclosing skill's path.
- Watch each new assertion fail before trusting it, by running it against the current code, which is what makes a green run afterwards evidence rather than decoration.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.2.0` to `3.3.0`. A minor: an advertised verb and a check that newly fires are behaviour an installed reader gains, and nothing they relied on is removed.
- Post the reviewed commit, the invocation as run, and where the re-verification has to happen as a comment on [#158](https://github.com/izkreny/agentifico/issues/158), which is what that issue's criterion asks be recorded there and what no workflow in this flow writes.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

The suite can see that the three new assertions catch what they were written for, and the check run over this package can see that its own frontmatter and prose stay clean after the edits. What neither can see is whether the prose findings were resolved as the reviewer meant them: whether the reworded sweep item still asks for something a reader can sweep, whether the cut section of the README left the remaining claim standing, and whether the routing fallback says the useful thing. Those are the resumed reviewer's to judge under Step 5, in the session that produced the findings.

The check run over this package exercises the clean path only. The three code fixes are watched failing in the suite instead, which is the only place a defect that no longer exists can be shown to have been caught.

## Open questions

- The reviewer's id that the issue asks be recorded is a session rather than a subagent, so re-verification cannot be driven from this branch. Is asking that session for the Step 5 verdicts acceptable, or should the fix commits take a fresh review instead?

## Settled

None yet.
