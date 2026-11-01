> 🤖 Written by AI --- read/modified by izkreny! 🤓

# State the new agnix lessons in prose, and credit agnix

Issue [#367](https://github.com/izkreny/agentifico/issues/367), a child of epic #329. The verdict on each rule is in #308's comment, and each page below was re-read for this plan.

## Where this branch sits

**It is cut from the tip of `feat/GHI-366_hold-skill-body-and-bundled-files`, and it sits on stack #359 above that branch.** #367 is blocked by #366, and the issue's own `## Dependencies` says that is serialisation on the package's version field. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names, so the blocker does not stop the branch.

## Where each sentence goes

### `skills/agents-guru/workflows/new.md`

**AS-022 gets its own heading in Step 4, after *Code blocks are Bash*.** Both are about how an agent's shell runs what a skill ships. The using-scripts page says agents "operate in non-interactive shells", and that a script blocking on input "will hang indefinitely". The reason sentence restates that.

**CC-SK-032 goes in the `description` row.** The best practices page says to write in third person, because the description is injected into the system prompt.

**CC-SK-033 goes in the `name` row.** It names `helper`, `utils` and `tools` as examples. It is a judgement, and no rule copies the list.

**CC-SK-034 goes in *Material a workflow does not need on every run goes to a reference file*.** The sentence names no line count, for the reason the issue's technical notes give. Its reason is the page's: an agent previewing with a partial read still sees the file's whole scope.

### `skills/agents-guru/workflows/review.md`

**CC-AG-022 and CC-HK-035 go in a new subsection of Step 3.** Both are about what a plugin's files grant, and neither fits a heading there today. Step 1 already tells the sweep to read those files, so Step 3 is where it judges them. Each entry is a question for the reviewer, since the first is a choice rather than a defect and the second depends on what a script does.

### `skills/agents-guru/README.md`

**The credit gets a short section of its own, at the end.** It names agnix at https://github.com/agent-sh/agnix as the catalogue several rules were ported from. It points at `skills/agents-guru/references/porting.md` for the tests a rule has to pass, and restates none of them.

## Decisions

**The version moves to 8.5.0, a minor.** `skills/agents-guru/workflows/review.md` enforces whatever `skills/agents-guru/workflows/new.md` requires, so these sentences are new behaviour for whoever installs the package.

**The branch type is `feat`, for the same reason.**

**No description in the repository changes here.** `skills/agents-guru/SKILL.md` opens with "Write, review, check", which the third-person sentence now reads as a defect. Sweep #330 reads that file whole, and its rule is that a finding it stands behind is fixed on its own branch. The same opening in `plugins/gh-solo/skills/pr-flow/SKILL.md` and its siblings belongs to that package's sweep, since a change to one package is not a change to another.

## Steps

- Add the AS-022 heading to `skills/agents-guru/workflows/new.md`, citing the using-scripts page.
- Add the third-person sentence to the `description` row and the vague-name sentence to the `name` row of `skills/agents-guru/workflows/new.md`, citing the best practices page for the first.
- Add the contents sentence to the reference-file section of `skills/agents-guru/workflows/new.md`.
- Add the subsection holding the agent and `PermissionRequest` questions to Step 3 of `skills/agents-guru/workflows/review.md`.
- Add the agnix credit to `skills/agents-guru/README.md`.
- Move agents-guru's `metadata.version` from 8.4.0 to 8.5.0 in `skills/agents-guru/SKILL.md`.

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

These gates prove the prose breaks no rule. None of them proves a sentence says what its page says, since that is a reader's call, and the review round reads it.

## Open questions

None.
