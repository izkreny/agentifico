> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Run the checks as markdownlint custom rules

Closes #101. `skills/skills-maker` carries five checks in two languages over a hand-rolled walk, a hand-rolled scalar reader and a hand-rolled approximation of CommonMark, benched by a 385-line bash script. This branch replaces all of it with markdownlint-cli2, its custom-rule API, one YAML library, and a `node:test` suite, and moves the version to a major.

Stacked on #57, whose branch this one is cut from and whose PR is this one's base, itself stacked on #75, #77, #88 and #54. That is the exception `.agents/gh-solo.md` states for an epic child's `blockedBy`: #57 is the blocker and its branch is the base. The trunk-staleness step of the `open` workflow does not apply on a stacked branch.

The branch name carries the slug the issue had when the branch was cut. The owner chose to leave it.

## The shape

**markdownlint-cli2 is the runner, the general linter and the host of every local rule.** The choice was made on 2026-09-06 against the alternatives the issue asked for and is recorded in `skills/skills-maker/workflows/check.md` on this branch: reference implementation of the markdownlint rule set, micromark under it, a custom-rule API that hands each rule the file's raw frontmatter lines apart from its body lines, its CommonMark token tree and a line-numbered `onError`, and string input in its programmatic API, which is what lets the bench hold fixtures as strings. The alternatives and why they lost, one line each: rumdl is a runtime-free binary that approximates the same rule set under one maintainer and has no rule API; mdl is a Ruby gem with no CommonMark parser under it and a 3-space list default; remark-lint lacks two of the five general rules; commonmarker and markly are parsers only, so choosing one would have left the general lint and the local rules in two tools with two parsers.

**Every local check becomes a rule module in a rules/ directory under `skills/skills-maker/scripts/`**, one file each, loaded through the `customRules` key of a .markdownlint-cli2.jsonc under `skills/skills-maker/`. The rules that read frontmatter apply only to a file named SKILL.md, decided from `params.name`; the continuation rule applies to every markdown file, since a rule about prose applies wherever the skill keeps prose. A shared module beside them holds what more than one rule needs: the raw scalar reader that `skills/skills-maker/scripts/scalar.js` is today, the description reader from `skills/skills-maker/scripts/check-invocation.js`, and the test for whether a file is a SKILL.md. Verified against the 0.41.1 custom-rule documentation: a rule receives `params.name`, `params.lines`, `params.frontMatterLines` ("not present in `lines`"), `params.parsers.micromark.tokens` and `params.config`, and reports through `onError({ lineNumber, detail, context })`.

- `skill-description`: the raw sweep, `parser: "none"`, reading `frontMatterLines` as strings and never parsing. Every trap class it tests today carries over unchanged. Its closing-quote test uses the shared scalar reader, which is what fixes the live false positive: a quoted description followed by a comment ends at its own closing quote rather than at the end of the line.
- `skill-description-parsed`: the differential, feeding the same lines to the `yaml` library and comparing the parsed description against the raw line, reporting a parse error, a silent mutation, or a non-string value exactly as the Ruby script does. It parses under the YAML 1.1 schema, which the library offers, because the trap it exists to catch is what *some* parsers make of `yes`, and 1.1 is the reading under which `yes` becomes a boolean; under the 1.2 default the fixture could never fail.
- `skill-name`: the frontmatter `name` against the directory holding the file, taken from `params.name`, through the shared scalar reader.
- `skill-invocation`: the two fields, their values and the description cross-check, as `skills/skills-maker/scripts/check-invocation.js` states them today, through the same shared readers.
- `skill-continuations`: `parser: "micromark"`. In micromark's tree a list token holds `listItemPrefix` tokens and content blocks as siblings rather than wrapping each item, which is how markdownlint's own MD005 walks items, so an item is the run of children between one prefix and the next. Its paragraphs are the `paragraph` tokens in that run: a nested list is a single child token holding its own paragraphs, a fence, a table and a blockquote are other token types, and none of them counts. A continuation opening with a bolded lead-in is the paragraph whose text starts with `**`. Exact token type names are confirmed against the library's own test snapshot before the first fixture is trusted.
- `skill-layout`: a SKILL.md with another SKILL.md in an ancestor directory under the target is a skill inside a skill. The walk stopped descending at each skill so that an example quoted inside a skill's references directory did not count as a second one; a glob has no such rule, and some agents discover skills recursively and would read that example as a broken skill, so this rule reports it rather than tolerating it. Frontmatter rules still run on it, since a finding there is true whichever skill owns the file.

**A check.mjs under `skills/skills-maker/scripts/` keeps the one-argument command the workflows describe.** The target is one skill's directory, a directory of skills, or a package root, defaulting to the current directory. The wrapper turns it into cli2's globs, `<target>/**/*.md` with `#<target>/**/.*/**` excluded, because cli2 passes `dot: true` to globby and the walk skipped dot-directories; passes `--config` pointing at the package's own config so the rules apply wherever the target lives; calls cli2's exported `main` with that `argv`; and exits non-zero when cli2 linted no files, since a target with no skill under it is a wrong target and its silence reads like a clean sweep, which is the one property cli2 alone does not give. globby follows symlinks by default, which is what makes an agent's directory of symlinked skills a valid target; the bench asserts it rather than assuming it.

**The general lint runs in the same invocation.** The .markdownlint-cli2.jsonc under `skills/skills-maker/` carries the `config` for markdownlint's own rules. The package has never been linted, so the first run over `skills/skills-maker` is triaged rule by rule: a finding is fixed, or the rule is disabled in the config with the reason beside it. Two disables are expected from the house rules rather than from laziness, MD013 because a paragraph is one unwrapped line here, and MD041 because a skill file opens with its tools blockquote rather than a heading; anything else is fixed unless the triage says otherwise, and the config comments are where that record lives.

**The bench is a `node:test` suite in a test/ directory under `skills/skills-maker/scripts/`, in two files.** The rules file calls `lint` from `markdownlint/promise` with `strings` keyed by a fixture path such as fixtures/mismatch/SKILL.md, so the name rule sees a directory name and nothing touches disk; every description trap, every invocation case and every continuation shape in the bash bench carries over as a string. The wrapper file builds the argument shapes the bash bench built, a package root, two roots side by side, a directory of symlinks, a dot-directory, a nested SKILL.md and an empty target, in a temporary directory that setup creates and teardown removes, and runs check.mjs against each; that is the one place fixtures touch disk, and the temporary directory is outside any tree an agent discovers, which is the property the bash bench protected. Each migrated assertion is watched failing before it is trusted, by running it against the rule with the relevant clause removed or the fixture with its defect removed; one that cannot be made to fail is dropped, and the handoff names it.

**A package.json inside the package declares the dependencies**, with `markdownlint-cli2`, `markdownlint` and `yaml` as `dependencies`, since running the checks needs them, and Biome as the one `devDependency`, since only linting the rules needs it. Biome is the JavaScript linter and formatter because it is one dependency covering both with a configuration written to what these files are, a handful of rule modules and two test files, where ESLint would need a plugin set and a formatter beside it. The lockfile is committed. A `.gitignore` inside the package ignores `node_modules`, per *A package's build artifacts are ignored by a `.gitignore` inside that package's own directory* in `AGENTS.md`.

## What the prose says afterwards

`skills/skills-maker/SKILL.md` defines `<skill-dir>` once, as the directory the skill is installed to, and every fenced command in the package names its files through it, the way the `pr-flow` skill already does. Its `compatibility:` names Node 22 or later and `npm ci` in `<skill-dir>` as required and no optional runtime; `allowed-tools` drops `Bash(ruby:*)` and `Bash(bash:*)` and gains `Bash(npm:*)`; the tools line and the `scripts/` bullet describe the rules, the wrapper and the suite. `skills/skills-maker/workflows/check.md` is rewritten around the one command: the install step, what the general lint covers, one section per local rule with what it tests and what it cannot decide, the recorded choice with its rejected alternatives, and no sentence claiming a drift guard, since the drift the old sentences guarded against has no second copy to drift from. `skills/skills-maker/README.md` says the skill assumes a shell, a filesystem and Node with one install step. `metadata.version` moves from 1.6.0 to 2.0.0.

`.agents/gh-solo.md` gains this package's commands under *Check commands*: the suite and the check over the package itself. The owner approved that repository-level edit on this branch on 2026-09-06, confined to that section.

## Steps

- Add package.json, its lockfile and a .gitignore under `skills/skills-maker/`; install the dependencies; confirm the string-input API and the token type names against the installed version before writing a rule.
- Write the shared frontmatter module and the six rule modules in a rules/ directory under `skills/skills-maker/scripts/`, and a .markdownlint-cli2.jsonc under `skills/skills-maker/` loading them.
- Write check.mjs under `skills/skills-maker/scripts/`: target to globs, config path, cli2's `main`, the empty-target failure.
- Write the rules test file with every string fixture the bash bench carried, and the wrapper test file with the argument shapes in a temporary directory; watch each assertion fail before trusting it.
- Run the general lint over `skills/skills-maker`, triage every finding, fix or disable with the reason in the config.
- Delete `skills/skills-maker/scripts/walk.js`, `skills/skills-maker/scripts/scalar.js`, `skills/skills-maker/scripts/check-descriptions.js`, `skills/skills-maker/scripts/check-names.js`, `skills/skills-maker/scripts/check-invocation.js`, `skills/skills-maker/scripts/check-continuations.js`, `skills/skills-maker/scripts/check-differential.rb` and `skills/skills-maker/scripts/test-checks.sh`, and grep the package for any reference left.
- Rewrite `skills/skills-maker/workflows/check.md`, the frontmatter and tools line of `skills/skills-maker/SKILL.md` with the `<skill-dir>` placeholder defined once, and the Node sentence in `skills/skills-maker/README.md`.
- Add a Biome configuration written to the files and make `npm run lint` exit zero.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from 1.6.0 to 2.0.0.
- Add the two commands to *Check commands* in `.agents/gh-solo.md`.

## Verification

- The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- `python3 scripts/version-check.py`.
- `npm --prefix skills/skills-maker test`.
- `npm --prefix skills/skills-maker run lint`.
- `node skills/skills-maker/scripts/check.mjs skills/skills-maker`, from the repository root, exits zero.

**What these gates cannot see.** `skills/` is not a docs-check target, so nothing mechanical reads the rewritten prose except the package's own lint. The version check's range on this stack spans the bumps below, so it passes whether or not this branch moves the version. The suite proves each rule on its fixtures and nothing about a shape no fixture states. Running the check over `plugins/gh-solo` is done once by hand to see the rules on a second real package, and a finding there is reported in the handoff rather than fixed here.

## Open questions

- None.

## Settled

- **Node or Ruby?** Node: the owner dropped the one-runtime criterion on 2026-09-06 and asked for the best markdown tooling, the research settled on markdownlint-cli2, and its custom-rule API carries every local check, so Ruby would have been a second runtime with no job left.
- **Test runner?** `node:test` with `node:assert/strict`, the owner's choice: zero dependencies, `describe`/`it`, and a bench small enough that matchers buy little.
- **JavaScript linter?** Biome, for one dependency covering lint and format over a handful of files.
- **Keep the one-argument wrapper or type cli2 globs?** The wrapper: the workflows describe a target, not globs, and only a wrapper can fail on an empty target.
- **Is a SKILL.md inside another skill a finding or a tolerated example?** A finding, since agents that discover recursively would read it as a broken skill.
- **YAML 1.1 or 1.2 for the differential?** 1.1, the reading under which the boolean trap can fire at all.
- **May this branch edit `.agents/gh-solo.md`?** Yes, the owner said on 2026-09-06, confined to *Check commands*.
