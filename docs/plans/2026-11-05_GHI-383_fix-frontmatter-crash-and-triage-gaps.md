> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Fix the frontmatter crash and the gaps the mutation triage found

Issue [#383](https://github.com/izkreny/agentifico/issues/383), a child of epic #329. It is blocked by #381 and #365, both open. This is the stacked exception in *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`: the branch is cut from `feat/GHI-381_feed-sweeps-back-into-agents-guru`, and that branch is the pull request's base. #365's branch sits below it in the same stack, so its work is already in this tree.

## What was found

`claude plugin validate` 2.1.318 passes an agent and a skill holding `<<: 1`, and it passes `x: *a` too. So the finding cannot say the file will not load. It says the check could not read the frontmatter, and names the parser's message.

The same command rejects `name: {toString: 1}`, `name: {a: 1}` and `name: [a]` with "name must be a string, got object". The finding takes its words from that.

Vale honours a `vale` comment anywhere in an HTML block, on the line after `<div>` and mid-line after `<div>x` alike. So the anchor goes, rather than gaining the `m` flag.

A code span broken across lines reaches the rule as `codeTextData`, `lineEnding`, `codeTextData`. CommonMark turns the line ending into a space, so the rule does the same.

`new URL()` keeps a trailing dot in `hostname`, for `github.com.` and `git.example.com.` alike.

## What changes

**One guard beside `parsed` in `skills/agents-guru/scripts/rules/frontmatter.js` builds the value or returns what it threw.** Every rule that calls `toJS()` today calls it instead: `skills/agents-guru/scripts/rules/agent-frontmatter.js` twice, `skills/agents-guru/scripts/rules/skill-frontmatter-parsed.js`, `skills/agents-guru/scripts/rules/skill-fork.js`, `skills/agents-guru/scripts/rules/skill-argument-hint.js`, and `description()` in the guard's own file. A skill file holding `<<: 1` reaches four of them, so a fix in one rule alone would still crash.

**Two rules report the throw, and the rest skip the file.** `agent-frontmatter` reports it for an agent file and `skill-frontmatter-parsed` for a skill file, each with a message of its own that is not `PARSE ERROR, skill will not load`. `skill-fork` and `skill-argument-hint` return nothing, and `description()` falls back to its rough reading, as each does on a parse error.

**An agent's name that is a mapping or a list is a finding, and declares no name.** `defects` reports it before `String()` is reached. `declaredName` returns null for it, so the duplicate comparison agrees with `defects`, and its own try and catch go, since the guard covers the throw. Numbers and booleans are left as they are.

**`skill-vale-directive` drops the `^` from its pattern.** The constant is renamed, since it no longer tests what a comment opens with. The finding names the line holding the comment, not the line the HTML block opens on.

**`skill-argument-hint` reads a `lineEnding` inside a code span as a space.**

**`skill-pinned-sources` strips one trailing dot from the hostname before matching.** `GIT_SUBDOMAIN` then drops its `$`.

**The dead code goes.** `RUNNER` drops the `$` from `(?=\s|$)`, `QUOTED_OR_COMMENT` drops its trailing `$`, and the block-scalar loop in `rough()` drops `j < fm.length` with the disable comment above it. None of these changes a result, so no test can fail without them. The scoped Stryker run is their evidence.

**`metadata.version` in `skills/agents-guru/SKILL.md` moves from 8.7.0 to 8.7.1.** Every change fixes a defect or removes dead code, so it is a patch.

**Out of scope:** `validate` also passed an agent holding `description: [x`, which does not parse at all. `agent-frontmatter` leaves a parse error to `validate`, so that file gets no finding from either. It is worth its own issue.

## Steps

- Add the crash tests: an agent holding `<<: 1`, an agent holding `name: {toString: 1}`, and a skill file holding `<<: 1`. Each target also holds a sibling with a known finding, and each test asserts both findings print, the run exits non-zero and no stack trace appears. Watch each fail.
- Make the `throws` case of *agents declaring no name, a bare name or a name that cannot load share no name* assert that the run finished, and watch it fail.
- Add the guard to `skills/agents-guru/scripts/rules/frontmatter.js`, move every `toJS()` caller onto it, and add the two findings.
- Add the object-name finding to `defects`, and make `declaredName` return null for such a name.
- Add the vale-comment, code-span and trailing-dot tests, watch each fail, then make each fix.
- Drop the dead anchors and the dead loop guard.
- Move `metadata.version` to 8.7.1.
- Run Stryker scoped to the changed lines, through `capped -p` with `--concurrency 9`, and kill or remove every survivor on them.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `npm --prefix skills/agents-guru test`
- `npm --prefix skills/agents-guru run lint`
- `node skills/agents-guru/scripts/check.js skills/agents-guru`
- `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- `node skills/agents-guru/scripts/check.js skills/review-text`
- `node skills/agents-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

The suite proves each crash costs one finding and each gap is closed. It cannot prove that the removed anchors and guard were dead; the Stryker run shows that, and it is a step rather than a gate. Whether the finding's wording is right is the review's to judge.

## Open questions

None.

## Settled

None yet.
