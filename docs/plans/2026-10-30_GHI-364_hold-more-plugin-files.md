> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Hold more of a plugin's hooks file and manifest in the check

Issue [#364](https://github.com/izkreny/agentifico/issues/364), a child of epic #329. The verdict on each rule, and the page it rests on, is in #308's comment.

## Where this branch sits

**It is cut from the tip of `chore/GHI-362_make-mutation-timeouts-real`, and it sits on stack #359 above that branch.** #364 is blocked by #362, and the issue's own `## Dependencies` says that is serialisation on the package's version field. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names, so the blocker does not stop the branch.

## What each rule reads

All of them land in `skills/agents-guru/scripts/rules/plugin-files.js`. Each decision below rests on the hooks page, the manifest reference, the dependencies page or the components page, re-read for this plan.

### CC-HK-029: `onFailure` with no effect

**The events get their own set, since `SubagentStop` has matcher support and so is not in `NO_MATCHER`.** The set holds `Stop`, `SubagentStop`, `TaskCompleted` and `TeammateIdle`, for any hook type on them. The page's words are about the event, not the type.

**The background half fires only on a command hook whose `async` or `asyncRewake` is `true`.** The page names those hooks as background hooks, and `"async": false` runs in the foreground. An `http` hook that sets `async` keeps its `onFailure`, since `async` is ignored there, and the existing `async` finding already reports it.

### CC-HK-031: `args` beside a command that holds more than the program

**The rule fires when `command`, up to its first whitespace, holds no path separator, and whitespace follows.** That is wider than the condition the page gives for Claude Code's own warning, which is a bare name with no separator anywhere. The page also says that in exec form `command` is "the executable name or path only", so `node ./script.js` is the same defect, and the warning's condition would miss it. `C:\Program Files\nodejs\node.exe` and `${CLAUDE_PLUGIN_ROOT}/my tool` stay clean, since their first word holds a separator. A relative path whose first folder has a space is reported, and the page's exemption names absolute paths only.

### CC-HK-032: placeholders PowerShell never expands

**The rule reads a command hook with `shell` set to `powershell` and no `args`.** The page says `shell` is ignored when `args` is set, so such a hook runs in no shell at all.

**It names the three placeholders the page says Claude Code rewrites**, `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PLUGIN_DATA`. Any other `${...}` inside single quotes is PowerShell's own literal text, and it may be meant.

**Single quotes are found by walking the command's strings in order**, because a `'` inside a double-quoted string is no quote: `"it's ${CLAUDE_PROJECT_DIR}/it's"` expands. The walk knows backtick escapes inside double quotes. It does not know here-strings, which a hook command has no call for.

### CC-HK-033: a server prefix with no `.*`

**It fires on the five tool events the page names, and only where the whole matcher is on the page's exact-match path.** That is letters, digits, `_`, `-`, spaces, `,` and `|`. The matcher is split on `|` and `,`, and a part fires when it is `mcp__<server>` with no `__<tool>` after it, a trailing `__` included. `mcp__memory|Edit.*` is on the regular-expression path, where `mcp__memory` matches as a substring, so it stays clean.

### CC-HK-034: the plugin's own server by its bare key

**It fires on both matcher paths**, since the page says `mcp__database-tools__.*` never fires for a bundled server. Each part after the split is compared by the server segment it names, an opening `^` allowed. A key holding a character outside the tool-name set is compared in the form the page gives it too, with that character as `_`. An `mcp_tool` hook's `server` is compared on any event.

**`ownServers(pluginDir)` is a new reader, and `hooksDefects` takes its result as an optional second argument.** The existing string fixtures in `skills/agents-guru/scripts/test/rules.test.js` then stand, and `skills/agents-guru/scripts/check.js` passes the set. The reader takes the keys of `<plugin-dir>/.mcp.json` and of each entry of the manifest's `mcpServers`: an inline map, or a path to a JSON file, or an array of those. Each file may be wrapped in `mcpServers` or flat, which the components page states and the validator confirmed on 2.1.314. A bundle or a URL holds no JSON to read, so it adds no name, and neither does an unreadable file.

### CC-PL-019: a dependency's version

**An object entry's `version` fires when `semver.validRange` returns null**, which includes a non-string, since the validator passes `"version": 1`. A string entry has no version to judge. `semver` goes in `dependencies` at the exact 7.8.5 `.agents/dependencies.md` asks for, since `skills/agents-guru/scripts/check.js` runs it. It is already in the lockfile at that version, through Stryker.

### CC-PL-022: `${user_config.*}` in a monitor's command

**`manifestDefects` reads inline monitors, and a new reader reads the file.** A finding in a monitors file then prints that file's own path and line, through the loop in `skills/agents-guru/scripts/check.js`, and the file counts as checked, so a finding needs no new field. `monitorsFile(pluginDir)` names it: the path `experimental.monitors` holds, or `<plugin-dir>/monitors/monitors.json` when no key is set, or nothing when the monitors are inline.

**The top-level `monitors` key is read as well.** The manifest reference says it still loads, so a command in it still fails. The validator warns about the key and passes the command.

## Steps

- Write the failing tests for the hook rules that need no disk, in `skills/agents-guru/scripts/test/rules.test.js`, and watch each fail on the current rule: CC-HK-029, CC-HK-031, CC-HK-032 and CC-HK-033, each with its clean neighbours, plus CC-HK-034 given a set of names.
- Write the failing tests that read from disk in `skills/agents-guru/scripts/test/check.test.js`, and watch each fail: `ownServers` over each shape the manifest and `<plugin-dir>/.mcp.json` take, and CC-PL-022 inline, in the default file, in a named file and under the top-level key.
- Write the failing CC-PL-019 tests, then add `semver` to `skills/agents-guru/package.json` with `npm --prefix skills/agents-guru install --save-exact semver@7.8.5`.
- Implement the hook rules and `ownServers`, and pass the set from `skills/agents-guru/scripts/check.js`.
- Implement the two manifest rules and `monitorsFile`, and add the monitors reader to `skills/agents-guru/scripts/check.js`.
- Name what the rules now report, and the files they now read, in *The plugin file rules* in `skills/agents-guru/workflows/check.md`.
- Move agents-guru's `metadata.version` from 8.1.2 to 8.2.0, since the check now fails plugins it used to pass.

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

No gate shows that Claude Code still behaves as the pages say. The rules rest on the pages' wording and on the validator's 2.1.314 behaviour.

## Open questions

None.
