> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Read a plugin's hooks file and manifest in the check

Issue [#279](https://github.com/izkreny/agentifico/issues/279), a child of epic #226. It ports the agnix rules #223 assigned to it: CC-HK-013, CC-HK-014, CC-HK-018, CC-HK-024, CC-HK-028 and CC-PL-015. Each one passes `claude plugin validate --strict`.

## Where this branch sits

**It is cut from the tip of `docs/GHI-305_point-at-the-code`, and its pull request targets that branch.** #279 is blocked by #305, and the issue's own `## Dependencies` says that is stack order rather than a need. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names. The trunk sitting ahead of this branch is normal for a stack and is not recovered here.

## What the pages say

Read for this plan through a summarising fetch. The implementation re-reads each page's raw text before it writes a list, and the rule file cites both pages.

- [hooks](https://code.claude.com/docs/en/hooks): "If you add a `matcher` field to an event without matcher support, it is silently ignored." The matcher table names the events without it.
- The same page lists `async` among the command hook's fields only.
- The same page: `once` is "only honored for hooks declared in skill frontmatter".
- The same page: an HTTP hook's header resolves `$VAR` or `${VAR}` only for a variable in `allowedEnvVars`. Any other is replaced with an empty string.
- The same page: a command hook without `args` runs in shell form, and a shell-form plugin hook whose `command` names `${user_config.*}` "fails with an error instead of running".
- [plugins reference](https://code.claude.com/docs/en/plugins-reference): `commands`, `agents`, `outputStyles`, `workflows`, `experimental.themes` and `experimental.monitors` replace their default folder. `skills` adds to its folder, and `hooks`, `mcpServers` and `lspServers` merge with their default file.

## Which files are read

**A plugin is a folder holding a `.claude-plugin/` folder**, the test `skills/skills-guru/scripts/rules/agent-frontmatter.js` already makes. That test moves into a helper both rules share, so the two cannot disagree about what a plugin is.

**The check looks for that folder at the target and at every folder the walk reaches under it.** In each plugin it reads `<plugin-dir>/hooks/hooks.json` and `<plugin-dir>/.claude-plugin/plugin.json` by those fixed paths. The walk skips dot-folders, so a fixed path is the only way the manifest is reached at all.

**What stays out.** A hooks file the manifest names elsewhere, a plugin without a `.claude-plugin/` folder, and a JSON file named as a target. A file that is not valid JSON is left to `claude plugin validate --strict`, as the agent rule leaves frontmatter that does not parse.

## The rules

**One module, `skills/skills-guru/scripts/rules/plugin-files.js` (new), with a rule per file.** Neither is a markdownlint rule, since markdownlint never reads JSON. `skills/skills-guru/scripts/check.js` runs them after *The YAML rules* and prints their findings under a heading of their own, `plugin files`. A finding fails the run and counts in the closing line's file count.

**`JSON.parse` decides whether a file is read, and the `yaml` parser gives each finding its line.** Every JSON document is YAML, so the package the check already uses can place a key. It is laxer than JSON, so it never decides validity.

**`plugin-hooks` reports, in a plugin's hooks file:**

- a `matcher` on an event the hooks page lists as having no matcher support. The rule lists those events, never the supported ones: a stale copy then only misses a warning, where the other list would flag a correct file on a new event;
- `async` on a hook whose `type` is not `command`;
- `once` on any hook;
- a header naming `$VAR` or `${VAR}` that `allowedEnvVars` does not list;
- a command hook without `args` whose `command` names `${user_config.`.

**`plugin-manifest` reports** a key that replaces a default folder while that folder still holds files, unless one of the key's paths is that folder or sits inside it. The page names that case as the one that silences Claude Code's own warning.

**The reading is split so the suite reaches both halves.** A pure function per file takes its text and returns the findings, and `skills/skills-guru/scripts/test/rules.test.js` tests the hooks half on strings. The manifest half needs a real folder, and so does finding the plugins, so `skills/skills-guru/scripts/test/check.test.js` tests those on fixtures in its temporary folder.

## Steps

- Re-read both pages' raw text, and record the events without matcher support and each replacing key's default folder.
- Add the hooks cases to `skills/skills-guru/scripts/test/rules.test.js`: a trip case and a clean case per defect.
- Add the tree cases to `skills/skills-guru/scripts/test/check.test.js`: a plugin found under a package target, a shadowed default folder, a key listing its own default folder, an empty default folder, a hooks file with no `.claude-plugin/` beside it, and a file that is not valid JSON.
- Run the suite before the rules exist and record which new cases fail.
- Move the plugin test out of `skills/skills-guru/scripts/rules/agent-frontmatter.js` into a shared helper.
- Write `skills/skills-guru/scripts/rules/plugin-files.js` (new) and wire it into `skills/skills-guru/scripts/check.js`.
- Run the suite until it is green, then remove each check in the rules one at a time and record the case that fails for each.
- Give the rules their section in `skills/skills-guru/workflows/check.md`, name the `plugin files` heading beside the others, and say what *The check* now reads.
- Move skills-guru's version a minor, to 6.4.0.

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

The suite cannot see whether Claude Code still behaves as the pages say. The lists are copied from the pages on the day the rules are written, and a page that changes later makes a rule wrong without failing anything. The run over `plugins/gh-solo` is what reads a real hooks file and manifest.

## Open questions

None.
