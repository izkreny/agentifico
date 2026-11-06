> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Tune Biome's rules for modern syntax

Issue [#395](https://github.com/izkreny/agentifico/issues/395), a child of epic #329. It is blocked by #394, which is open. This is the stacked exception in *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md`: the branch is cut from `chore/GHI-394_lint-the-stryker-configs` at `3deba3f`, and that branch is the pull request's base.

## What was found

At Biome 2.6.5 all ten rules sit outside the nursery: `noAwaitInLoops` in `performance`, `noCommonJs`, `useForOf` and `useObjectSpread` in `style`, and the other six in `suspicious`.

A trial with all ten set to `error` gives 30 findings on the package, and none from the five syntax rules:

- 8 `useArraySortCompare`, in `skills/agents-guru/scripts/check.js` and `skills/agents-guru/scripts/rules/agent-frontmatter.js`.
- 9 `noShadow`, in `skills/agents-guru/scripts/check.js`, `skills/agents-guru/scripts/rules/skill-bundled-files.js` and three test files.
- 5 `noUnnecessaryConditions`, 5 `noAwaitInLoops` and 3 `noLoopFunc`.

Four `noUnnecessaryConditions` findings are false. Biome reads a counter that starts at `0` as never truthy, though the code increments it. The fifth is false too: `absorb` is missing from two of the three objects `underStryker` returns in `skills/agents-guru/scripts/test/check.test.js`.

## What changes

**`skills/agents-guru/biome.json` sets the ten rules to `error`**, beside the `recommended` preset, which stays.

**Each `useArraySortCompare` site gets a shared `byCodeUnit` comparator** from `skills/agents-guru/scripts/rules/order.js` (new). It compares with `<` and `>`, which is what a bare `.sort()` does, so no output changes order. Every site sorts either strings or `[entry, code]` pairs, and `<` turns a pair into the same string the bare sort does. It uses two `if` statements rather than a nested ternary.

**Each `noShadow` site renames its inner binding.**

**Four `noAwaitInLoops` sites move to `Promise.all`**, where the order of the awaits changes nothing:

- `skills/agents-guru/scripts/check.js`, the markdownlint run per root: each root holds its own files, so the results share no key.
- The same file's `.claude-plugin` search: the folders land in a set that is sorted afterwards. This also clears the `noShadow` on that line.
- `skills/agents-guru/scripts/test/rules.test.js`, two loops: the `findings` helper lints strings held in memory, so the calls cannot race.

**The rest are excused beside their line**, each with a `biome-ignore` comment that gives the reason:

- The five false `noUnnecessaryConditions` findings.
- The target walk in `skills/agents-guru/scripts/check.js`, which must stay in order. A file two targets reach keeps the first target's root, and a bad target stops the run before the targets after it.
- The three `noLoopFunc` findings in `skills/agents-guru/scripts/test/check.test.js`. `tmp` is set once, in the hook that runs before any test body.

**`metadata.version` in `skills/agents-guru/SKILL.md` moves from 8.7.2 to 8.7.3.** Only the package's lint tooling and code shape change, so it is a patch.

## Steps

- Plant a sample under `skills/agents-guru/scripts/` holding what each of the ten rules bars, and watch the current config report none of the ten on it.
- Set the ten rules in `skills/agents-guru/biome.json`. Run the lint and watch each of the ten report the sample. Remove the sample.
- Add `skills/agents-guru/scripts/rules/order.js` (new) and fix the `useArraySortCompare` sites with it.
- Rename the shadowing bindings.
- Move the four `noAwaitInLoops` sites to `Promise.all`.
- Excuse the remaining findings beside their lines.
- Move `metadata.version` to 8.7.3.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `npm --prefix skills/agents-guru run lint`
- `npm --prefix skills/agents-guru test`
- `node skills/agents-guru/scripts/check.js skills/agents-guru`
- `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- `node skills/agents-guru/scripts/check.js skills/review-text`
- `node skills/agents-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

No gate judges an excuse's reason; a reader does. Only the suite shows that the comparator kept every order.

## Open questions

None.

## Settled

None yet.
