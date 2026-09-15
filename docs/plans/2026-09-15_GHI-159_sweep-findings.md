> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Review and version skills-maker

Issue [#159](https://github.com/izkreny/agentifico/issues/159), the last child of epic [#157](https://github.com/izkreny/agentifico/issues/157), stacked on [#173](https://github.com/izkreny/agentifico/issues/173)'s branch as the top of stack 168.

## What the sweep read, and where its findings came from

`/skills-maker review skills/skills-maker` was run inline, in the owner's own session, against this tree at `16ecc92`, which is the tip of `feat/GHI-173_comment-rules` and the commit this branch was cut from. Every other child of the epic is in that ancestry, since the stack runs from [#148](https://github.com/izkreny/agentifico/issues/148) at the bottom through [#173](https://github.com/izkreny/agentifico/issues/173) at the top. The mechanical run was clean on that tree, `26 files checked, 0 issues, 0 warnings`, the suite passed 273 of 273 and the lint was clean, so every finding below is prose or contract rather than something a rule already decides.

**The run did not receive the short-id line the issue's invocation carries**, so its findings arrived as six numbered sections and four one-line lower ones. This plan names them `S1` through `S6` and `L1` through `L4`, in the reviewer's own order, and the fix commits cite those ids. One id scheme, decided here, so nothing later has to guess which numbering a commit means.

**Every citation was re-located in this tree before it entered this plan**, and each resolved to the line the reviewer named. The reviewer read every file under the package, the three test files included, and named no shortfall in its own pass.

**The reviewer set one observation aside itself and it is not a step.** The description carries no "not for" sentence; with `disable-model-invocation: true` and explicit invocation stated, there is no misfire for a boundary to prevent.

## Where the re-verification happens

**The review ran in the owner's own session rather than in a subagent**, so there is no agent id to resume from this branch. The owner settled the same shape on [#158](https://github.com/izkreny/agentifico/issues/158): this round runs its own scoped re-review with the `gh-solo` reviewer, and the session that ran the sweep is then asked for an independent second pass under `skills/skills-maker/workflows/review.md` Step 5. That session is still open, so the pass can run there against this branch's fix commits. No finding below is set aside as phantom, because setting one aside is only answerable by that resumed reviewer, and every finding is fixed instead.

## The findings, and what each one costs to leave

**`S1` - `skills/skills-maker/workflows/check.md` contradicts the script on the not-run count.** Its paragraph on code files says a code file counts in the closing line's file count as a markdown one does. `skills/skills-maker/scripts/check.js` prints the markdown count alone when Vale did not run, and the suite asserts that. A reader of a `prose rules not run` line believes the code files were counted and reads the shortfall as a missing file.

**`S2` - `skills/skills-maker/workflows/export.md`'s exit criterion fails on this package.** Step 5 grants zero hits for the author's username one exception, the README's install command and byline. Every rule file under `skills/skills-maker/assets/Agentifico/` carries a `link:` to its own file in this repository, and the portable-paths fixtures in `skills/skills-maker/scripts/test/rules.test.js` carry the author's username inside example paths. An export of this skill cannot meet its own gate. The fixtures are satisfied by a neutral username, since the rule they test reads the path's shape and not its owner; the `link:` lines name a public URL, which is the one case the exception has to widen for.

**`S3` - a count that is already wrong in `skills/skills-maker/workflows/check.md`.** The `skill-frontmatter-parsed` paragraph says two shapes are left alone and names a non-string value and a next-line value. `skills/skills-maker/scripts/rules/skill-frontmatter-parsed.js` skips four: quoted, block scalar, empty on its own line, and non-string. A reader trusting the sentence thinks a quoted value is compared.

**`S4` - a stale pointer in `skills/skills-maker/README.md`.** Its *What a YAML parser cannot see* section says `skills/skills-maker/workflows/check.md` lists the traps and `skills/skills-maker/SKILL.md` explains each. `skills/skills-maker/workflows/check.md` now says `skills/skills-maker/SKILL.md` owns the membership and lists nothing.

**`S5` - the lint script has no reader.** `skills/skills-maker/package.json` declares `lint`, and `skills/skills-maker/assets/Agentifico/Counts.yml` records it landing as a third command, but no workflow names it. *The suite* in `skills/skills-maker/workflows/check.md` tells an editor of a rule to run the suite alone, so a rule edit ships with a lint error nobody ran.

**`S6` - a partial enumeration in `skills/skills-maker/SKILL.md`.** The `scripts/` row of its supporting-files table says the rules share `skills/skills-maker/scripts/rules/frontmatter.js`. `skills/skills-maker/scripts/rules/paths.js` is shared by the two path rules and `skills/skills-maker/scripts/rules/skill-continuations.js` feeds both bolded-run rules, so the row names one helper of three.

**`L1` - `skills/skills-maker/workflows/new.md` does not say whose form `allowed-tools` takes.** The specification calls it a space-separated string; the comma-separated form this package's own frontmatter uses is Claude Code's.

**`L2` - `skills/skills-maker/workflows/new.md` and `skills/skills-maker/workflows/check.md` measure the split cap differently.** The first recommends `wc -w`; the second and `skills/skills-maker/assets/Agentifico/SkillSplit.yml` measure on Vale's prose metric, so the two disagree near the threshold.

**`L3` - `axes` appears twice in the noun alternation in `skills/skills-maker/assets/Agentifico/Counts.yml`.** No behaviour changes, and a duplicate in an alternation is the kind of thing that stops a later edit from finding the one copy.

**`L4` - `currently` is a token in both `skills/skills-maker/assets/Agentifico/History.yml` and `skills/skills-maker/assets/Agentifico/Banner.yml`**, so an opening paragraph gets two alerts for one word. `History` reads the word anywhere and `Banner` only at the top, so `History` alone covers every position and `Banner` is the one to drop it.

## Steps

- Add to *Read the last line* in `skills/skills-maker/workflows/check.md` that on `prose rules not run` the file count is the markdown files alone, and qualify the code-file paragraph with the case where Vale ran, for `S1`.
- Rename the username inside the portable-paths fixtures in `skills/skills-maker/scripts/test/rules.test.js` to a neutral one, for `S2`, so the export criterion is satisfied there rather than amended.
- Widen the README exception in Step 5 of `skills/skills-maker/workflows/export.md` to a URL naming the destination repository wherever it appears, for `S2`, since a rule file's `link:` is public the moment the repository is.
- Rewrite the two-shapes sentence in `skills/skills-maker/workflows/check.md` to name every shape `skills/skills-maker/scripts/rules/skill-frontmatter-parsed.js` leaves alone, without a count, for `S3`.
- Point *What a YAML parser cannot see* in `skills/skills-maker/README.md` at `skills/skills-maker/SKILL.md`'s own section on the trap classes, for `S4`.
- Name `npm --prefix <skill-dir> run lint` beside the suite in *The suite* in `skills/skills-maker/workflows/check.md`, for `S5`.
- Replace the one-helper clause in the `scripts/` row of `skills/skills-maker/SKILL.md` with the helpers the rules share, unnamed, for `S6`.
- Say in `skills/skills-maker/workflows/new.md` that the specification's form of `allowed-tools` is space-separated and the comma-separated form is Claude Code's, for `L1`.
- Align the split-cap measure in `skills/skills-maker/workflows/new.md` with the check's, Vale's prose metric, for `L2`.
- Drop the duplicate `axes` from the noun alternation in `skills/skills-maker/assets/Agentifico/Counts.yml`, for `L3`.
- Drop `currently` from `skills/skills-maker/assets/Agentifico/Banner.yml`, its comment included, and add a guards fixture in `skills/skills-maker/scripts/test/vale.test.js` asserting an opening `currently` raises `History` alone, for `L4`.
- Watch the new fixture fail against the current rule before trusting it, which is what makes a green run afterwards evidence rather than decoration.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.11.0` to `3.11.1`. A patch: every change corrects prose or tidies a rule's alternation, and an installed reader gains no behaviour and loses none.
- Post the reviewed commit, the invocation as run, the sweep session's id and where the second pass runs as a comment on [#159](https://github.com/izkreny/agentifico/issues/159), which is what that issue's criteria ask be recorded there and what no workflow in this flow writes.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

The suite can see that the new fixture catches the double alert, and the check run over this package can see that its own prose stays clean after the edits. What neither can see is whether the prose findings were resolved as the reviewer meant them: whether the not-run sentence now reads true, whether the widened export exception still excludes what it should, and whether the README pointer lands on the section that holds the answer. Those are the two re-reviews' to judge. The version check passes on this branch through the whole stack's range whatever this branch does, so the patch bump is held by this plan rather than by that gate.

## Open questions

None.

## Settled

None yet.
