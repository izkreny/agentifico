> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Move the README guidance to its own reference file

Issue [#372](https://github.com/izkreny/agentifico/issues/372), a child of epic #329. The issue holds the acceptance criteria and the survey behind the link convention.

## Where this branch sits

**It is cut from the tip of `feat/GHI-367_state-agnix-lessons-and-credit-agnix`, and it sits on stack #359 above that branch.** #372 is blocked by #367, and the issue's own `## Dependencies` says that is serialisation on the package's version field. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names, so the blocker does not stop the branch.

## What moves

**`skills/agents-guru/references/readme.md` (new) takes the whole of *Ship a `README.md` for human readers* from `skills/agents-guru/workflows/new.md`, its four subsections included.** The heading stays in `skills/agents-guru/workflows/new.md` with one line under it, because `skills/agents-guru/workflows/review.md` Step 3 holds a skill against every rule in that file, and that line is how a review reaches the guidance. So `skills/agents-guru/workflows/review.md` needs no edit.

**The install-forms sentence moves word for word.** `skills/agents-guru/scripts/test/check.test.js` finds it by its opening words and splits it on its middle ones, so only the path the test reads changes.

**The one cross-reference inside the moved text gains a file.** "Step 1" becomes Step 1 of `skills/agents-guru/workflows/new.md`, since that step is no longer in the same file.

## What is added

**A section of `skills/agents-guru/references/readme.md` (new) states the link convention, with the two reasons the issue names.** A README links a file it sends the reader to open, and a plain mention stays in backticks, because the reader is on the rendered page. A link to a file never leaves the README's own folder, because that link breaks once the skill is installed alone. The survey stays on the issue, since it defends the design rather than helping anyone apply the rule.

**`skills/agents-guru/README.md` links `skills/agents-guru/references/setup.md`, `skills/agents-guru/references/managing.md`, `skills/agents-guru/references/porting.md`, `skills/agents-guru/workflows/review.md` and `skills/agents-guru/SKILL.md` where its prose sends the reader to them.** Every other mention stays in backticks, the router sentence and the sentence saying a request does not reach the managing file among them, since neither sends the reader anywhere.

## Decisions

**Two pointers the issue does not list change as well.** `skills/agents-guru/scripts/rules/skill-readme.js` and `skills/agents-guru/scripts/rules/skill-package-runners.js` each carry a comment citing `skills/agents-guru/workflows/new.md` for a fact this branch moves, and both comments would go false.

**The version moves to 8.5.1, a patch, as the issue asks.**

**The branch type is `docs`, because the change is prose.** The script edits are comments and one test path.

## Steps

- Create `skills/agents-guru/references/readme.md` (new) with the moved guidance and the link convention.
- Replace the moved text in `skills/agents-guru/workflows/new.md` with one line saying when to read the new file.
- Point `skills/agents-guru/workflows/check.md`, `skills/agents-guru/references/maintaining.md` and the install-forms test in `skills/agents-guru/scripts/test/check.test.js` at `skills/agents-guru/references/readme.md` (new).
- Point the comments in `skills/agents-guru/scripts/rules/skill-readme.js` and `skills/agents-guru/scripts/rules/skill-package-runners.js` at `skills/agents-guru/references/readme.md` (new).
- List `skills/agents-guru/references/readme.md` (new) in the supporting files of `skills/agents-guru/SKILL.md`.
- Link the files `skills/agents-guru/README.md` sends its reader to open.
- Move agents-guru's `metadata.version` from 8.5.0 to 8.5.1 in `skills/agents-guru/SKILL.md`.

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

The suite proves the install-forms test still reads the moved sentence. No gate proves a README links the right files, since the convention is a judgement with no check rule, and the review round reads it.

## Open questions

None.
