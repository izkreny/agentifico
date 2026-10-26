> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Turn the argument-hint and Bash checks into rules

Issue [#303](https://github.com/izkreny/agentifico/issues/303), a child of epic #226. Two items on the by-hand list in `skills/agents-guru/workflows/check.md` are decidable from text the check already reads. This branch turns each into a markdownlint rule and takes both off the list.

## Where this branch sits

**It is cut from the tip of `fix/GHI-302_hold-rule-messages-to-headings`, and its pull request targets that branch.** #303 is blocked by #302, and the issue's own `## Dependencies` says that is stack order. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names. It sits below the sweep, #229, which has no branch yet. The trunk sitting ahead of this branch is normal for a stack, so nothing is fast-forwarded.

## The argument-hint rule

`skills/agents-guru/scripts/rules/skill-argument-hint.js` (new) reads a `<skill-dir>/SKILL.md` only.

- **Advertised verbs** come from the frontmatter `argument-hint`. Each top-level `[...]` group is split on its own `|`, and the first word of each alternative is a verb. A first word that is not a bare lowercase word, such as `<pr-number>` in implement's hint, is a placeholder and not a verb.
- **Routed verbs** come from the list items under a heading whose text contains "routing", matched without case, since tracker's heading is *Explicit routing*. The section runs to the next heading of the same or a higher level. Only list items are read, so the table in pr-flow's *Routing* section is left alone.
- **Only the condition is read**: the text before an item's first `→`. Everything after the arrow names files, tools and other skills, as pr-flow's `authorise`, `TaskStop` and `implement` do. Each backticked span in the condition gives its first word, so `create issues for X` routes `create` as tracker's hint advertises it.
- "If it starts with `new`" and "If the argument is exactly `help`" are both read, because both are a backticked span before the arrow. The empty route and the catch-all carry no span before their arrow, so neither yields a verb.
- An advertised verb nothing routes is reported on the `argument-hint` line. A routed verb the hint leaves out is reported on its list item's line. Both name the verb.
- A `<skill-dir>/SKILL.md` with no `argument-hint`, or with no routing heading, is left alone. review-text has a hint and no routing heading, so it is the live case.

A dry read of the four skills with a hint gives no finding: agents-guru, pr-flow, tracker and implement each route exactly what they advertise.

## The Bash rule

`skills/agents-guru/scripts/rules/skill-bash-blocks.js` (new) reads every markdown file, as `skill-portable-paths` does, and reads fenced blocks only. A code span is never read, because `skills/agents-guru/workflows/check.md` and `skills/agents-guru/workflows/new.md` name the Fish phrasings in code spans.

- A fence tagged `fish` or `zsh` is reported on its opening line.
- A fence tagged `bash` or `sh`, or untagged, is read line by line. A line carrying `set <name> (`, `; or` or `; and` is reported on its own line, naming the phrase.
- A comment line inside the fence, one whose first non-blank character is `#`, is not read. An agent does not execute a comment, so prose there is free to say "; and".
- Every other tag is left alone, so a `text` or `yaml` block may quote any of it.

The phrasings are the ones `skills/agents-guru/workflows/check.md` names, and the rule starts from them rather than parsing Fish.

## The rest of the change

- Both rules join `contractRules` in `skills/agents-guru/scripts/lint-config.js`, and the suite's `RULES` list in `skills/agents-guru/scripts/test/rules.test.js`.
- `skills/agents-guru/workflows/check.md` gains *The argument-hint rule* and *The Bash rule*, each naming its file and what it cannot decide, and loses the two by-hand bullets. *The Bash rule* calls itself the mechanical face of *Code blocks are Bash* in `skills/agents-guru/workflows/new.md`.
- `metadata.version` moves from 7.0.2 to 7.1.0, since the check reports something it did not before. Every earlier rule branch moved the minor.

## Steps

- Add the fixtures for both rules to `skills/agents-guru/scripts/test/rules.test.js`, with a stub of each rule registered, and commit them alone. Run the suite and watch every case that wants a finding fail.
- Write `skills/agents-guru/scripts/rules/skill-argument-hint.js` (new) and `skills/agents-guru/scripts/rules/skill-bash-blocks.js` (new), and register both in `skills/agents-guru/scripts/lint-config.js`. Run the suite green.
- Add the two rule sections to `skills/agents-guru/workflows/check.md` and remove the two by-hand bullets.
- Move `metadata.version` to 7.1.0 in `skills/agents-guru/SKILL.md`.
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

The red run against the stubs is the evidence each rule can fire, and it is recorded in the rule commit's body. The four check runs are the false-positive test, since gh-solo's routing sections are the hardest real input. The version check sees `skills/agents-guru/` as a new package against `main`, so 7.1.0 is checked by reading the frontmatter. Whether a routed verb really does what the hint promises is judgement, and neither rule reads it.

## Open questions

None.

## Settled

- **May the docs check run with `--ignore`?** Yes, `--ignore 'skills/skills-guru/*'` and nothing wider, as #256's plan settled for every branch above it.
