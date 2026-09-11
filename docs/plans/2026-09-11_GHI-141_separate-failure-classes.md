> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Separate the check's failure classes in its output

Issue [#141](https://github.com/izkreny/agentifico/issues/141), a child of epic [#156](https://github.com/izkreny/agentifico/issues/156), stacked on [#142](https://github.com/izkreny/agentifico/issues/142)'s branch.

## What the run looks like now

`node skills/skills-maker/scripts/check.js skills` reports `19 files checked, 1494 issues, 0 warnings` as one undifferentiated stream. By rule on that run: 539 `MD022`, 381 `MD024`, 272 `MD032`, 249 `MD031`, 26 `MD026`, 7 `Agentifico.Position`, 5 `MD034`, 4 `MD060`, 4 `MD012`, 3 `Agentifico.History`, 2 `MD009`, 1 `MD029`, and one `skill-invocation`. The `skill-invocation` finding is the only one in the class the skill exists to catch, and it prints between an `MD060` and an `Agentifico.Position` with nothing marking it.

`skills/skills-maker/scripts/check.js` prints two loops. The first walks `results` in file order, so this package's own rules and markdownlint's defaults interleave; the second walks Vale's alerts after the spawn. The order is deliberate and stays: a structural finding is printed before a prose linter that may not start.

## The classes, and how membership is decided

**A finding belongs to this package's own rules, to markdownlint's defaults, or to Vale.** The first is the class the skill exists to catch and prints first; the second and third are what a reader is usually willing to defer.

**Membership is read off `rules` in `skills/skills-maker/scripts/lint-config.js`, never off an `MD` prefix.** That array is already the list of this package's own markdownlint rules, and each rule module carries its own `names`, so a rule added there joins the group without an edit anywhere else. A prefix test would be a second copy of the same membership, and the copy is what drifts when a rule arrives.

**The group that reads `rules` takes every rule in it, `skill-continuations` included.** The issue names the frontmatter, name and layout findings, and that array also holds a paragraph-shape rule, so the grouping is wider than the issue's wording. It is still one list rather than a hand-picked subset, which is the only reading under which a rule added later lands in the right group without an edit; and `skill-invocation`, the finding this issue is written about, is in that array for the same reason.

**The two markdownlint groups are both printed before Vale is spawned.** Splitting one loop into two passes over the same `results` changes which findings sit together and nothing about when they are available, so the invariant the current order exists for survives intact.

## What the report says it read

**The run names the skills it found, not only the file count.** A skill is a directory holding a 'SKILL.md', which is the boundary `skills/skills-maker/scripts/rules/skill-layout.js` already decides; the enumeration reuses `isSkillFile` from `skills/skills-maker/scripts/rules/frontmatter.js` over the files the glob already returned, so nothing walks the tree a second time.

**A 'SKILL.md' nested inside another skill is listed like any other.** The layout rule already reports it as a finding, and the list answers what was read rather than what is well formed; suppressing it there would make the list disagree with the finding.

**A target carrying markdown but no skill reports what it read and continues.** That is a different answer from the empty-target failure, which exits non-zero because a target with no markdown under it is a wrong target. Prose under a package root that holds no skill is a legitimate target, so it is reported and judged on its findings.

**The summary line is unchanged**, `N files checked, M issues, K warnings` and its `prose rules not run` variant. It is the line `skills/skills-maker/workflows/check.md` tells a reader to read and the line the suite matches on, and the skills report is new information rather than a correction to it, so it lands on its own lines above.

## Steps

- Export the group's rule names from `skills/skills-maker/scripts/lint-config.js`, derived from `rules` by flattening each module's own `names`, so `skills/skills-maker/scripts/check.js` asks that file which rules are this package's rather than deciding for itself.
- Split the markdownlint loop in `skills/skills-maker/scripts/check.js` into two passes over `results`, each printing a heading line and its findings indented beneath it: this package's own rules first, markdownlint's defaults second. Both stay above the Vale spawn.
- Print the Vale alerts under a third heading, in the pass that already walks them, and print that heading as not run in the branch that reports a missing or refusing Vale, so the three headings are present whatever happened.
- Print a heading whose count is zero rather than omitting it, so a clean run states that the class the skill exists to catch found nothing instead of leaving a reader to infer it from silence.
- Print the skills found above the findings: a header naming the target and the count, then one relative path per line, `.` where the target is itself a skill. Where none is found, say so and carry on to the findings.
- Leave the exit code exactly as it is. An error-level finding fails the run and a warning does not, which is #115's answer and not this branch's to revisit.
- Rewrite the opening paragraph of `skills/skills-maker/workflows/check.md` to describe the grouping, the skills report and the summary line together, since that paragraph is where the run is described. Leave every rule's own entry alone.
- Add a fixture target to `skills/skills-maker/scripts/test/check.test.js` carrying a finding of each class at once, and assert the three headings, their order, and that the skill-rule finding prints above the markdown group.
- Add assertions for the skills report: a single skill listed as `.`, a package root listing each skill under it, and a markdown-only target reporting that it found none while still failing on its findings.
- Watch each new assertion fail before trusting it. The grouping and heading assertions are watched against the current one-stream output, which is what they exist to catch. The skills-report assertions are watched the same way, since no such line exists yet.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.1.1` to `3.2.0`. A minor: an installed reader's runs come back with lines they did not have, and nothing they relied on is removed.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

The suite can see that the headings are printed and that a finding lands under the right one. What it cannot see is whether the split is the one a reader wants: which class is worth reading first, and whether a heading whose count is zero earns its line on a clean run are both judgements, and the run over `skills` is where they are legible rather than in any fixture.

`node skills/skills-maker/scripts/check.js skills/skills-maker` exercises the clean path only, so the grouping is watched on the wider target as well, per the criterion that asks for a target carrying findings of every class.

## Open questions

None.

## Settled

None yet.
