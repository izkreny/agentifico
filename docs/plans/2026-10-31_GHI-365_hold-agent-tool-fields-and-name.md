> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Hold an agent file's tool fields and name to what Claude Code loads

Issue [#365](https://github.com/izkreny/agentifico/issues/365), a child of epic #329. The verdict on each rule is in #308's comment, and the wording below was re-read on https://code.claude.com/docs/en/sub-agents for this plan.

## Where this branch sits

**It is cut from the tip of `feat/GHI-364_hold-more-plugin-files`, and it sits on stack #359 above that branch.** #365 is blocked by #364, and the issue's own `## Dependencies` says that is serialisation on the package's version field. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names, so the blocker does not stop the branch.

## What each rule reads

Both land in `agent-frontmatter`, in `skills/agents-guru/scripts/rules/agent-frontmatter.js`.

### CC-AG-024: a `disallowedTools` entry with a specifier

**It fires on a plugin's agent as well as a standalone one.** The page limits neither `disallowedTools` nor this sentence to one kind, and `disallowedTools` is not among the fields a plugin's agent ignores. So `defects` gains the case on both of its paths, rather than after the early return for a plugin's agent.

**An entry with a specifier is a name followed by `(`.** The field takes a comma-separated string or a YAML list, per the page's "same format as `tools`", so each form is read. The match runs over the text rather than a split on commas, since `Agent(a, b)` holds a comma that separates nothing. `mcp__github` and `mcp__github__*` hold no `(` and stay clean. A value that is neither a string nor a list reports nothing, since it holds no entry.

**`Agent(Explore)` fires too.** The page's sentence covers any entry with a specifier. The only place the page shows that form is a `permissions.deny` rule and the `--disallowedTools` flag, where it denies one agent, and neither is this field.

### CC-AG-023: two files in one tree declaring one name

**It reads only a standalone agent's own `<project>/.claude/agents/` folder, subfolders included**, which is the one case the page calls unresolved. Different locations, nested project folders and a plugin's agents each follow an order the page documents, so they are not duplicates.

**The rule reads the tree from disk instead of asking the walk.** A folder target usually skips `.claude`, and a file target names one file, so the walk does not hold the other files. The tree is what Claude Code loads one name from, so a target narrower than the tree still compares against all of it.

**Each file of a duplicate gets the finding, naming the others.** The page says the file loaded depends on read order, so neither file is the loser. Each path prints from the agents folder.

**`filesIn` in `skills/agents-guru/scripts/rules/plugin-files.js` lists the tree, and gets exported for it.** It already states a symlink through and skips a dot-named file or folder, which is what the check's own walk does. The page does not say whether Claude Code does the same, so a duplicate behind a dot-folder is a known miss.

**A file with no name declares nothing.** Frontmatter is read off the file by the shape `defects` reads: a first line of `---`, then a closing `---`. A file that opens otherwise, never closes or does not parse names nothing, since each is reported on its own account when the target reaches it. A file or folder the rule cannot read also names nothing, because a run that throws here would report no finding at all.

**`/doctor` does not replace this.** It reports files in one directory that share a name, and it runs on the user's machine after install. The rule reads the whole tree in the package.

**Reading the tree needs the folder as well as the kind.** `agentKind` walks to that folder and drops it, so it becomes `agentFolder`, returning both. Nothing outside the file calls `agentKind`.

## Steps

- Write the failing CC-AG-024 tests in `skills/agents-guru/scripts/test/rules.test.js`, each form with its clean neighbours, and watch each fail on the current rule.
- Write the failing CC-AG-023 tests in `skills/agents-guru/scripts/test/check.test.js`, since they need a tree on disk, and watch each fail: a duplicate at one level and across a subfolder, a file target, a different name, a different tree, a plugin's agents, a nameless and an unreadable sibling.
- Implement the `disallowedTools` case in `defects`.
- Implement the duplicate-name case, with `agentFolder` and the exported `filesIn`.
- Say what the rule is for and what it now reads in *The agent rule* in `skills/agents-guru/workflows/check.md`, leaving each defect to the code.
- Move agents-guru's `metadata.version` from 8.2.0 to 8.3.0, since the check now fails agent files it used to pass.

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

No gate shows that Claude Code still behaves as the page says. Both rules rest on the page's wording, and the validator's behaviour is the one #308's comment records.

## Open questions

None.

## Settled

None yet.
