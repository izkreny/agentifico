> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Hold a skill's body and bundled files to what loads

Issue [#366](https://github.com/izkreny/agentifico/issues/366), a child of epic #329. The verdict on each rule is in #308's comment, and each page below was re-read for this plan.

## Where this branch sits

**It is cut from the tip of `feat/GHI-365_hold-agent-tool-fields-and-name`, and it sits on stack #359 above that branch.** #366 is blocked by #365, and the issue's own `## Dependencies` says that is serialisation on the package's version field. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names, so the blocker does not stop the branch.

## What each rule reads

Each new rule is its own file under `skills/agents-guru/scripts/rules/`, registered in `skills/agents-guru/scripts/lint-config.js`.

### AS-023: `skill-bundled-files`

**The file is `skills/agents-guru/scripts/rules/skill-bundled-files.js` (new).** It runs once per `<skill-dir>/SKILL.md` and reads the skill's tree from disk, since a target may not hold all of it. Symlinks are followed, as the check follows them, and a loop is walked once.

**"Names" means the file's name appears in another file of the skill.** The criterion says "no file of the skill", so a script only another script runs is named, and a sibling linked by its bare name is named. A file does not name itself. The name has to stand alone, so setup.md does not match other-setup.md.

**A dot-named file is out, and so is a file in a subfolder.** The criterion says "directly under". `plugins/gh-solo/skills/pr-flow/scripts/.gitignore` is the package's own ignore rule under *A package's build artifacts* in `AGENTS.md`, and nothing should list it for an agent. `node_modules` and dot-folders are skipped, as the check's walk skips them.

**A file or folder the rule cannot read gets its own finding.** A clean run would otherwise claim a comparison that never happened.

### AS-024: `skill-package-runners`

**The file is `skills/agents-guru/scripts/rules/skill-package-runners.js` (new). It is a warning**, as the issue's technical notes say, so it goes in `contractWarningRules`. The file still loads and the command still runs.

**It reads code spans and fenced lines in every markdown file of a skill, except `README.md`.** The using-scripts page is about what an agent is told to run, and `skills/agents-guru/workflows/new.md` says a README is for a person. So the `npx skills add` lines in `skills/review-text/README.md` and `skills/socratic-tutor/README.md` raise nothing, and no other package's version moves. A comment line in a fence is skipped, as `skill-bash-blocks` skips it.

**The runners are the page's own: `npx`, `bunx`, `uvx`, `pipx run`, `deno run` and `go run`.** Any version counts, so every example on the page stays clean: `npx eslint@9`, `pipx run 'black==24.10.0' .`, `deno run --allow-read npm:eslint@9 -- --fix .` and `go run golang.org/x/tools/cmd/goimports@v0.28.0 .`. `@latest` counts too, since the page accepts it for `go run`.

**A command that runs a local file is not a package.** `go run main.go`, `go run ./cmd/x` and `deno run script.ts` stay clean. Only a module path counts for `go run`, and only an `npm:` or `jsr:` specifier for `deno run`. For the other runners, a first argument that opens with `.`, `/`, `<` or `$` is not a package name.

### CC-SK-023: `skill-argument-placeholders`

**The file is `skills/agents-guru/scripts/rules/skill-argument-placeholders.js` (new). It reads only a `<skill-dir>/SKILL.md`, and only its code spans and fenced lines.** The criterion says "in a `<skill-dir>/SKILL.md` body", and this is narrower on purpose. The skills page's own example is the prose line `Migrate the $0 component from $1 to $2.`, so reporting prose would fail a correct file. A price such as `$1.00` in prose is therefore a known miss, which `skills/agents-guru/workflows/check.md` names as the reader's to catch.

**Exactly one backslash escapes.** The page says `\$1` is literal and `\\$1` still expands, so the rule counts the backslashes before the `$`.

**A command that means the argument has a clean form.** The finding offers `\$1` for a literal and `$ARGUMENTS[1]` for the argument, and the rule does not read the second.

### CC-SK-028: `skill-injected-commands`

**The file is `skills/agents-guru/scripts/rules/skill-injected-commands.js` (new). It reads only a `<skill-dir>/SKILL.md`, off the parser's tree.** A scan for the `` !` `` pair would report `` `!` `` in `skills/agents-guru/SKILL.md` and `` `step.advance!` `` in `skills/rails-style/references/jobs.md`, where the `!` sits inside a span.

**A command is a code span whose text before it ends in `!`.** The character before that `!` decides the position finding: a line start or whitespace is clean, as in `` Branch: !`cmd` ``, and anything else is reported, as in `` KEY=!`cmd` ``. The skills page says the second form stays literal text.

**The control-character case reads a recognised inline command and the body of a fence opened with `` ```! ``.** The sentence is on https://code.claude.com/docs/en/errors under *No shell command in a skill or command was run*, not on the skills page the issue names, which only links to it. It names "a raw control character other than a tab or newline".

### CC-SK-031: `skill-description` gains a case

**It tests the raw value, not a parsed one.** *The description rules* in `skills/agents-guru/workflows/check.md` says this rule never parses, and a parse can throw on a merge key. Block scalars and folded lines are both read. A `<placeholder>` counts as a tag, and `a < b` does not.

### CC-PL-020: `plugin-body-variables`

**The file is `skills/agents-guru/scripts/rules/plugin-body-variables.js` (new).** It reports a bare `$CLAUDE_PLUGIN_ROOT`, `$CLAUDE_PLUGIN_DATA` or `$CLAUDE_PROJECT_DIR` anywhere in the body of a plugin's `<skill-dir>/SKILL.md` or agent file. The braced form stays clean.

**A skill is a plugin's when an ancestor folder holds `<plugin-dir>/.claude-plugin/plugin.json`.** `isPluginRoot` is not enough, because this repository's root holds `.claude-plugin/marketplace.json` above `skills/`, so it would call every standalone skill a plugin's. An agent uses `agentFolder`, which gets exported.

## Steps

- Write the failing tests for `skill-argument-placeholders`, `skill-injected-commands`, `skill-package-runners` and the `skill-description` case in `skills/agents-guru/scripts/test/rules.test.js`, and watch each fail.
- Write the failing tests for `skill-bundled-files`, `plugin-body-variables` and a runner in a workflow and a README in `skills/agents-guru/scripts/test/check.test.js`, since they need a tree on disk, and watch each fail.
- Implement each new rule and the `skill-description` case, and register the rules in `skills/agents-guru/scripts/lint-config.js`.
- Name each rule in `skills/agents-guru/workflows/check.md`, with what it cannot decide.
- Move agents-guru's `metadata.version` from 8.3.0 to 8.4.0, since the check now fails skills it used to pass.

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

No gate shows that Claude Code still behaves as the pages say. Each rule rests on the page's wording, and the validator's behaviour is the one #308's comment records.

## Open questions

None.

## Settled

None yet.
