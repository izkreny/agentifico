> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Document how a Vale list grows

Issue [#130](https://github.com/izkreny/agentifico/issues/130), a child of epic [#157](https://github.com/izkreny/agentifico/issues/157), cut from the tip of `feat/GHI-171_cap-bolded-lead-paragraphs` and stacked on it in stack #168. The `blockedBy` on #171 is the stack-parent shape `.agents/gh-solo.md` exempts under *An epic child's blocker is its stack parent, not a wait*: #171's branch exists, is the branch this one was cut from, and is this pull request's base. The branch was created with `gh stack add`, which is the documented way onto a tracked stack and cannot link the branch to the issue; the assignee is the in-progress record, per the tracker skill.

## What lands

A section in `skills/skills-maker/workflows/check.md`, after *The prose rules* and before *The suite*, that says how a phrase list grows: where a phrase comes from and the command that reads each source, how to tell which rule a caught phrase belongs to, how a token lands with its evidence, and what happens when the new token fires on the package itself. The procedure is then run once over what merged after PR #128, the pull request that landed the first lists, and its result is posted on #130. `metadata.version` in `skills/skills-maker/SKILL.md` moves from `3.8.0` to `3.8.1`.

## The sources, and the command that reads each

Both sources are records the review loop already writes, so the procedure is a query and a judgement rather than a collection step.

**Findings.** A `pr-flow` review round posts each finding as an inline review comment whose body carries `::RF{n}::`. So the findings on a merged pull request are its review comments filtered on that marker, and a finding on prose is one whose `path` names a markdown file:

```bash
gh pr list --state merged --search "merged:>=<date>" --json number --jq '.[].number'
gh api repos/{owner}/{repo}/pulls/<pr-number>/comments --paginate --jq '.[] | select(.path | endswith(".md")) | select(.body | test("::RF[0-9]+::")) | "\(.path):\(.line)\n\(.body)\n"'
```

**Fix commits.** A commit that closes a finding cites it in its body, and its diff carries the phrase removed and the phrase written in its place, which is a token and its guards line at once. A tag or a date bounds the read, and every prose commit in the range is read, since the range between two runs is short:

```bash
git log --patch <name>_<version>..origin/main -- '*.md'
git log --patch --since=<date> origin/main -- '*.md'
```

## The test for which rule a phrase belongs to

Each rule file's `message` opens with the `skills/skills-maker/workflows/new.md` heading it enforces, and that heading's own test decides. A phrase is `Counts` when adding one more item to the content it names makes the sentence false. It is `Position` when an edit made anywhere in the document can falsify it. It is `History` when it anchors the sentence to a moment rather than a reason. `Banner` grows the same way only for a phrase caught in a file's opening region, and the length rules hold no phrases.

A phrase that passes none of those tests is reported to the issue or handoff that asked for the run, with its source, and gets no rule. A rule whose message names no heading enforces nothing the package states.

## How a token lands

Three edits, and each is what makes the token evidence rather than taste:

- In the rule file under `skills/skills-maker/assets/Agentifico/`, as a token under a YAML comment naming the finding or commit it came from, in the form the file already uses.
- In `TRIP` in `skills/skills-maker/scripts/test/vale.test.js`, as a line of its own that only the new token trips. The suite's per-token coverage proves a token fires somewhere on its rule's fixture, and with several tokens on one line a token can pass that on a neighbour's line. A line only it trips is what fails the once-per-line test when the token is removed, and that removal is how the line is watched failing before it is trusted.
- In the guards fixture beside it, where the phrase has a legitimate use, as a line carrying that use.

After the token lands, `node skills/skills-maker/scripts/check.js skills/skills-maker` reports every place the new token fires on the package itself. A true finding is fixed in the prose. A phrase that is right where it stands goes into the rule's `exceptions` with the reason beside it, never into an inline directive, per *The directive rule* in `skills/skills-maker/workflows/check.md`.

## The exercise

The procedure is run once over what merged after PR #128 on 2026-09-09: pull requests #135, #151, #152, #154, #155, #160, #161, #163 and #165, and the prose commits in `9827051..origin/main`. Every candidate goes through the test, and the result is posted on #130 as a comment: each token added with its source, or that none was, and any phrase that belonged to no rule.

## Two readings the plan settles

Criterion 3 of #130 says the suite's coverage test proves each rule reaches a fixture and not each token. The suite has proved each token since #128, in its `every token of every phrase rule fired on its rule's own fixture` test. The requirement stands for the reason *How a token lands* gives, and the criterion's premise is reported as stale rather than acted on.

The version moves a patch whether or not the exercise adds a token, as the criterion states. The check already promises to report the recorded phrasings, and a list that grows is that promise kept rather than new behaviour.

## Steps

- Write the section in `skills/skills-maker/workflows/check.md` after *The prose rules*: the two sources with their commands, the test for which rule a phrase belongs to and what happens to a phrase that belongs to none, how a token lands with its fixture line and guards line, and how a finding on the package is fixed or excepted.
- Run the exercise over the pull requests and commits *The exercise* names, and post the result on #130.
- Land each token the exercise returns, if any: the rule file with its source comment, a `TRIP` line only it trips, watched failing with the token removed, a guards line where the phrase has a legitimate use, and the package's own findings fixed or excepted.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.8.0` to `3.8.1`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

The check's own run over the package catches the new section breaking a prose rule or the bolded-paragraph cap. No gate reads whether the section's test sorts a phrase rightly, nor whether the exercise's judgement on each candidate was sound; a token's fixture line proves the token matches its own record and nothing about the reading that admitted it.

## Open questions

None.

## Settled

None yet.
