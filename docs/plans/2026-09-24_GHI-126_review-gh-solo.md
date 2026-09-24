> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Review the gh-solo package before its next tag

Issue [#126](https://github.com/izkreny/agentifico/issues/126), the sweep of `plugins/gh-solo` under skills-maker 3.11.1, cut from the trunk at `a982dc0`.

## Two halves, and where each one's findings come from

**The mechanical half is known in full.** `node skills/skills-maker/scripts/check.js plugins/gh-solo` was run against this tree at `a982dc0` and closed on `42 files checked, 454 issues, 69 warnings`. The issues are 155 `Position`, 74 `Counts`, 28 `History` and 50 `CommentSentences` findings from the `Agentifico` rules, and 43 markdownlint findings: MD040 on 15 fences, MD060 on 12 tables, MD036 on 10 bold lines standing as headings in the help workflows under `plugins/gh-solo/skills/pr-flow/` and `plugins/gh-solo/skills/tracker/`, and one each of MD012, MD026 and MD038. The warnings are 34 `ParagraphLength`, 33 `CommentLength` and 2 `SkillSplit`. Every one of these is a phrase, a fence or a comment at a line the run names, so its repair is local and needs no whole-file judgement.

**The whole-file half is the owner's run, in their own session.** `skills/skills-maker/SKILL.md` carries `disable-model-invocation: true`, so `/skills-maker review plugins/gh-solo` is typed by the owner and read inline there, and this branch cannot run it. That run is in progress as this plan is written, in a session that shares this working tree. Its findings reach this branch as a comment on [#126](https://github.com/izkreny/agentifico/issues/126) carrying the short ids the issue's invocation asks for, and the step that fixes them reads that comment when it is reached. Every citation is re-located by its content rather than its line number, since the mechanical passes rewrite the lines the review read.

**The mechanical half lands first**, because its repairs depend on nothing the whole-file read decides, and the reverse order would hold every edit on an input not yet posted.

## Where the re-verification happens

The review ran in the owner's session rather than in a subagent, so there is no agent id to resume from this branch. The shape settled on [#158](https://github.com/izkreny/agentifico/issues/158) and [#159](https://github.com/izkreny/agentifico/issues/159) applies: this round runs its own scoped re-review with the `gh-solo` reviewer, and the session that ran the sweep is asked for the independent second pass under `skills/skills-maker/workflows/review.md` Step 5. A finding that session set aside as phantom is confirmed or refuted there and nowhere else.

## What stays standing, and why each is not a deferral

- **`SkillSplit` on `plugins/gh-solo/skills/pr-flow/SKILL.md`** is [#89](https://github.com/izkreny/agentifico/issues/89), whose body records that the 4.7.0 sweep deferred it as a restructure. The same warning on `plugins/gh-solo/skills/reviewer/SKILL.md`, at 2,074 words, is a restructure of the same kind and is named on the pull request. A warning fails nothing, so neither is a finding the tag stands on.
- **The continuation paragraphs in `plugins/gh-solo/skills/pr-flow/workflows/review.md`** are [#76](https://github.com/izkreny/agentifico/issues/76)'s to decide, per the issue's own technical notes.
- **A phrase that is right where it stands** is named on the pull request with its reason. The exception it implies lives in a rule file under `skills/skills-maker/assets/Agentifico/`, which is a `skills-maker` change and is filed as its own issue from this branch rather than made on it.

## Steps

- Fix the markdownlint findings as markup only, one commit: MD040 gets the language a fence actually holds and `text` where it is not code, MD060 gets padded pipes, MD012, MD026 and MD038 get their one-line fixes, and each MD036 line in `plugins/gh-solo/skills/pr-flow/workflows/help.md` and `plugins/gh-solo/skills/tracker/workflows/help.md` is promoted to a heading or rewritten as prose, the choice stated per instance on the pull request since both files print to the owner's terminal.
- Fix the `Position` findings by the record in `skills/skills-maker/assets/Agentifico/Position.yml`: a pointer by direction names its section or file, and a uniqueness claim names the member or is made true by construction with one owner and every other site pointing at it.
- Fix the `Counts` findings by the record in `skills/skills-maker/assets/Agentifico/Counts.yml`: a count of adjacent content names its members or goes, and `.agents/gh-solo.md` is read first for the plurals it already argues are facts rather than counts.
- Fix the `History` findings by the record in `skills/skills-maker/assets/Agentifico/History.yml`: each `no longer`, `is now` and its kin becomes the durable reason for the live rule, or the sentence goes.
- Read every `ParagraphLength` warning for a second claim, and split, cut or keep the paragraph, with the reason for each keep named on the pull request.
- Bring every comment and docstring in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py`, `plugins/gh-solo/skills/pr-flow/scripts/watch.py`, `plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` and `plugins/gh-solo/hooks/ask-before-trunk-push.py` under the one comment rule: a comment stays only where the line is unconventional, as one sentence saying why, and a docstring that describes a return value or narrates the code is deleted rather than rewritten.
- Read every comment in `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`, `plugins/gh-solo/skills/pr-flow/scripts/test-watch.sh` and `plugins/gh-solo/hooks/test-ask-before-trunk-push.sh` by hand against the same rule, since Vale has no comment scope for shell, and delete or reduce each the same way. A case comment that only names the fixture it sits above is a description, and the case's own assertion message is where that name belongs.
- Run the three benches after their scripts' comments change, and read each exit code rather than its tail.
- Read the comment on [#126](https://github.com/izkreny/agentifico/issues/126) that carries the owner's whole-file findings, and fix each one on this branch, citing its id in the commit, with every citation re-located by content. If no such comment exists when this step is reached, the handoff says so and this step is what `go` resumes on.
- Read `plugins/gh-solo/README.md` whole against what the plugin now does, since the passes above touch it too.
- Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` from `4.7.0` to `4.7.1`. A patch: markup, prose and comment fixes that change no behaviour an installed reader sees. A whole-file finding that rewords a rule can move that to `4.8.0` when it lands, and the commit that does says so.
- Post the reviewed commit, the invocation as the owner ran it, the sweep session's id and where the second pass runs as a comment on [#126](https://github.com/izkreny/agentifico/issues/126), which is what that issue's criteria ask be recorded there and what no workflow in this flow writes.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `python3 scripts/manifest-check.py`
- `node skills/skills-maker/scripts/check.js plugins/gh-solo`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-watch.sh`
- `bash plugins/gh-solo/hooks/test-ask-before-trunk-push.sh`

The check can see that no token fires and no fence or table is malformed after the edits, and the benches can see that stripping a script's comments changed none of its behaviour. What none of them can see is whether a rewritten sentence still says what its author meant, whether a comment deleted as narration was in fact the one reason a later reader needed, or whether the whole-file findings arrived and were fixed as the reviewer meant them. Those are the two re-reviews' to judge, and the owner's to accept on the diff. The version check passes on any branch that touches the package's directory, so the patch bump is held by this plan rather than by that gate.

## Open questions

None.

## Settled

None yet.
