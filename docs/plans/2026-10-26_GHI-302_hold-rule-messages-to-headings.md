> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Hold every Vale rule message to a new.md heading

Issue [#302](https://github.com/izkreny/agentifico/issues/302), a child of epic #226. `skills/agents-guru/references/maintaining.md` says each rule's `message` opens on the `skills/agents-guru/workflows/new.md` heading it enforces. Nothing tests that, and two rules break it. This branch adds the test and fixes the two.

## Where this branch sits

**It is cut from the tip of `docs/GHI-291_state-supported-platforms`, and its pull request targets that branch.** #302 is blocked by #291, and the issue's own `## Dependencies` says that is stack order. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names. It sits below the sweep, #229, which has no branch yet. The trunk sitting ahead of this branch is normal for a stack, so nothing is fast-forwarded.

## What changes

- `skills/agents-guru/scripts/test/vale.test.js` gains a `describe` block. It reads every `### ` heading out of `skills/agents-guru/workflows/new.md` at test time. For each rule file under `skills/agents-guru/assets/Agentifico/`, it takes the `message` text before its first `:` and asserts some heading starts with it. A failure names the rule file and the message.
- The test lives in `skills/agents-guru/scripts/test/vale.test.js` rather than `skills/agents-guru/scripts/test/check.test.js`, because that file already iterates the rule files. It borrows only the shape of the install-form test in `skills/agents-guru/scripts/test/check.test.js`, which reads its list out of `skills/agents-guru/workflows/new.md`.
- The test guards against passing on nothing. The heading list and the rule-file list must each be non-empty, and each `message` must be a non-empty string, since an empty prefix starts every heading.
- `skills/agents-guru/assets/Agentifico/CommentLength.yml` and `skills/agents-guru/assets/Agentifico/CommentSentences.yml` open their `message` on the whole heading, *A comment inside code exists only where the solution is unconventional, and is one sentence saying why*. Each file's `want:` lines quote the message verbatim, so they change with it.
- `metadata.version` moves from 7.0.1 to 7.0.2. A message's wording and a new test change nothing an installer depends on.

A dry run of the reading over all twelve rule files on this branch's base passes ten and fails only the two above.

## Steps

- Add the heading test to `skills/agents-guru/scripts/test/vale.test.js` and commit it alone. Run the suite and watch it fail on `skills/agents-guru/assets/Agentifico/CommentLength.yml` and `skills/agents-guru/assets/Agentifico/CommentSentences.yml` by name.
- Reword the `message` and every `want:` line in `skills/agents-guru/assets/Agentifico/CommentLength.yml` and `skills/agents-guru/assets/Agentifico/CommentSentences.yml`, and move `metadata.version` to 7.0.2 in `skills/agents-guru/SKILL.md`.
- Run the agents-guru check on every listed package, the package's suite and its lint.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans --ignore 'skills/skills-guru/*'`
- `npm --prefix skills/agents-guru test`
- `npm --prefix skills/agents-guru run lint`
- `node skills/agents-guru/scripts/check.js skills/agents-guru`
- `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- `node skills/agents-guru/scripts/check.js skills/review-text`
- `node skills/agents-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

The red run before the fix is the evidence the test can fail, and it is recorded in the fix commit's body. The version check sees `skills/agents-guru/` as a new package against `main`, so it passes on any version, and 7.0.2 is checked by reading the frontmatter. Whether a heading is the right one for a rule is judgement, and the test checks only that the message opens on some heading.

## Open questions

None.

## Settled

- **May the docs check run with `--ignore`?** Yes, `--ignore 'skills/skills-guru/*'` and nothing wider, as #256's plan settled for every branch above it.
