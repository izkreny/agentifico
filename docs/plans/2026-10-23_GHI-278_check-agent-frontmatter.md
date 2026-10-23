> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Hold an agent file's frontmatter to what Claude Code loads

Issue [#278](https://github.com/izkreny/agentifico/issues/278), a child of epic #226. It ports the agnix rules #223 assigned to it: CC-AG-001, CC-AG-012, CC-AG-020 and CC-PL-014. None of them is in the check yet.

## Where this branch sits

**It is cut from the tip of `feat/GHI-255_check-named-paths`, and its pull request targets that branch.** #278 is blocked by #255, and the issue's own `## Dependencies` says that records the stack's order rather than a need. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names. The trunk sitting ahead of this branch is normal for a stack and is not recovered here.

## What the pages say

Both pages were re-read for this plan, and the rule cites them.

- [sub-agents](https://code.claude.com/docs/en/sub-agents): Claude Code skips a file in a project, user or managed `agents` directory, without saying so in the session, when it has no `name`, when its opening `---` is not its first line, or when its `name` starts with `-`, contains `:` or runs past 256 characters.
- The same page: a subagent that sets `permissionMode: bypassPermissions` keeps the main conversation's mode instead, from Claude Code 2.1.267.
- [plugin components](https://code.claude.com/docs/en/plugins/components): a plugin's agent ignores `permissionMode`, `hooks`, `mcpServers` and `initialPrompt`. One with no `name` loads under its filename.
- Both pages: an agents folder is scanned recursively, so an agent may sit in a subfolder of it.
- Neither page bars a capital or an underscore in a `name`.

## Which files are agent files

**A markdown file is an agent file when one of its ancestor folders is named `agents` and that folder is a plugin's or a `.claude` folder's.** The nearest such ancestor decides, since agents nest in subfolders.

- **A plugin's agent** sits under `<plugin-dir>/agents/`, where `<plugin-dir>` holds a `.claude-plugin/` folder. That is the plugin shape this repository has. A plugin without a manifest, or one whose manifest points its agents elsewhere, is out of reach; #279 is the issue that reads the manifest.
- **Any other agent** sits under `<project-dir>/.claude/agents/` or `<home-dir>/.claude/agents/`. A managed directory is reached only when it has that shape, since the page names no path for it.
- **Anything else is not an agent file**, and the rule leaves it alone. The suite's fixture at `<tmp>/pkg/agents/reviewer.md` has no `.claude-plugin/` beside it, so it stays out.

**A file under `<project-dir>/.claude/agents/` is reached only as a named file target.** A folder walk skips dot-folders, and #255 is what lets a file inside one be named.

## The rule

**One new contract rule, `agent-frontmatter`, in `skills/skills-guru/scripts/rules/agent-frontmatter.js` (new).** It is a contract rule because every defect it reports is silent. It reports on the frontmatter line, as the skill rules do.

**On a file outside a plugin it reports:**

- no `name`;
- an opening `---` that is not the first line, read off the file's lines, because markdownlint hands a rule no frontmatter at all when a blank line comes first;
- a `name` that contains `:`, starts with `-` or runs past 256 characters;
- `permissionMode: bypassPermissions`.

**On a plugin's agent it reports** each of `permissionMode`, `hooks`, `mcpServers` and `initialPrompt` that is set. A missing `name` is fine there.

**What stays out.** Frontmatter that does not parse, and a missing `description`, because `claude plugin validate --strict` reports both and #281 points the sweep at it. The model, effort, tool and permission-mode lists, because a copy of a list of valid values goes stale and then flags correct files.

**The reading is split in two, so the suite can reach both halves.** A pure `defects(fm, inPlugin)` takes the frontmatter lines, and `skills/skills-guru/scripts/test/rules.test.js` tests it on strings. The folder lookup that decides `inPlugin` needs a real tree, so `skills/skills-guru/scripts/test/check.test.js` tests it on fixtures in its temporary folder.

## Steps

- Add `defects` cases to `skills/skills-guru/scripts/test/rules.test.js`: one trip case per defect, a clean agent outside a plugin, a clean plugin agent with no `name`, and a `name` with a capital and an underscore that is not reported.
- Add tree cases to `skills/skills-guru/scripts/test/check.test.js`: a plugin's agent setting an ignored field, a plugin agent in a subfolder, a named file under `<tmp>/.claude/agents/` with no `name`, and an agents folder that is neither shape and gets no finding.
- Run the suite before the rule exists and record which new cases fail.
- Write `skills/skills-guru/scripts/rules/agent-frontmatter.js` (new) and register it in `skills/skills-guru/scripts/lint-config.js`.
- Run the suite until it is green, then remove each check in the rule one at a time and record the case that fails for each.
- Give the rule its section in `skills/skills-guru/workflows/check.md`, beside the other rules' sections, and change the sentence there that says the frontmatter rules apply to a skill file alone.
- Move skills-guru's version a minor, to 6.2.0.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `npm --prefix skills/skills-guru test`
- `npm --prefix skills/skills-guru run lint`
- `node skills/skills-guru/scripts/check.js skills/skills-guru`
- `node skills/skills-guru/scripts/check.js plugins/gh-solo`
- `node skills/skills-guru/scripts/check.js skills/review-text`
- `node skills/skills-guru/scripts/check.js skills/socratic-tutor`
- `python3 scripts/version-check.py`

The suite cannot see whether Claude Code still skips what the pages say it skips. The limits are copied from the pages on the day the rule is written, and a page that changes later makes the rule wrong without failing anything. The run over `plugins/gh-solo` is what reads `plugins/gh-solo/agents/reviewer.md`.

## Open questions

None.
