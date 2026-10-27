> **Tools used:** `Bash(node:*)` for the check, `npm` for the one-time install of what it needs, which prompts, `Glob` to enumerate skills.

The mechanical audit. Run it after writing or editing any skill, and in a review once the read is done and before any judgement is made. One command runs every rule this file names: markdownlint's general rules over every markdown file a skill keeps, this skill's own markdownlint custom rules, listed in `scripts/lint-config.js` beside the configuration, on what a file is and on how it lays its prose out, the YAML and plugin-file readers in `scripts/check.js`, and Vale with this skill's own rules on what a file says, which live under `assets/` and are named in `.vale.ini`.

**Findings group by heading**: `skill rules` for the rules that decide what a file is, `prose shape` for the rules on how it lays its prose out, `general lint` for markdownlint's defaults, `yaml files` for *The YAML rules*, `plugin files` for *The plugin file rules*, `prose rules` for Vale's alerts.

**Read the last line**, `N files checked, M issues, K warnings`: an issue fails the run, a warning fails nothing. `prose rules not run` in place of the warning count means Vale was missing, older than the version `scripts/check.js` requires, printed a version the check could not read, or refused its configuration, and the run fails whatever the count, since a check that silently ran half its rules would read as a clean sweep. On that line the file count is the markdown, YAML and plugin files alone, since a code file's only reader is the process that did not start.

## The check

Before the first run on an install, follow `references/setup.md`.

Each argument is a target, a folder or a file, and the current directory is the target when there is none. A folder target is one skill's own directory, a directory of skills, or a package root whose skills sit further down - a plugin's at `<target>/skills/`. Symlinks are followed, because an agent's own skills directory is a directory of them pointing into the canonical tree. Dot-directories under a folder target are skipped, and so is anything under `node_modules/`, which belongs to a skill's dependencies rather than to its prose:

```bash
node <skill-dir>/scripts/check.js path/to/the-skill
node <skill-dir>/scripts/check.js AGENTS.md .agents/gh-solo.md
```

**A file target is read as named, even inside a dot-directory**, which is how a file such as `<repo-root>/.agents/gh-solo.md` is reached at all. A file names no tree of its own, so its root is the current directory, where a folder target is its own root: the path rules resolve against it and the layout search stops at it. Run a file target from the folder its paths were written against. Several targets print every path from the folder they share, and a file reached by more than one is read once.

**One skill is the gate; a wider target is a survey.** Against a single skill the exit code answers "is this skill clean", which is what a branch and a sweep both want. Against a directory of skills or a package root it answers only "does anything under here have findings", and it will usually be non-zero: the run reports every skill it reaches, and `references/managing.md` forbids editing a manager-installed one, so a finding there is a report to that skill's author rather than work for the runner.

Every markdown file under the target is read, subject to those exclusions, since a rule about prose applies wherever the skill keeps prose; the rules about a skill's frontmatter apply to a file named `SKILL.md`, *The agent rule* applies to an agent file, and each leaves the rest alone. Nothing under the target is read as configuration, so a tree cannot switch off the rules that judge it, and a copy of this skill under the target is linted rather than imported.

A target the check cannot read fails the run, naming that target: a path that does not exist, a folder with no markdown under it, or a file no reader takes. Its silence is indistinguishable from a clean sweep, and beside other targets it would hide. A folder holding markdown but no skill is a legitimate target and is read.

Every `*.js` and `*.py` file under the target is read too, under the same exclusions, by the prose rules alone: Vale reads a code file as its comments and docstrings and skips the code and its string literals, so a comment is held to the rules a paragraph is, and markdownlint never sees the file. When Vale ran, a code file counts in the closing line's file count as a markdown one does, so a code file that raised nothing is visible there rather than silently skipped.

Every `*.yml` and `*.yaml` file under the target is read too, under the same exclusions, by the check itself and by neither linter, per *The YAML rules*. A YAML file counts in the closing line's file count whether or not Vale ran.

A plugin's hooks file and manifest are read too, by the check itself and by fixed paths, per *The plugin file rules*. Each counts in the closing line's file count as a YAML file does.

How a review reads a target covering more than one skill is `workflows/review.md` Step 1's.

## What the general lint covers

markdownlint's own rules run at their defaults. A rule that is off is named in `scripts/lint-config.js` with its reason, and none is turned off for quiet. A comment in the target turns none off, since `scripts/check.js` ignores markdownlint's inline configuration.

## The description rules

Each of their failure modes is silent: a truncated description keeps loading with fewer triggers, and a frontmatter parse error makes the skill vanish from the listing with no complaint. `SKILL.md` owns the trap classes, under "YAML eats the description at `#`".

**`skill-description`**, in `scripts/rules/skill-description.js`, reads the frontmatter as raw lines and never parses it.

**`skill-frontmatter-parsed`**, in `scripts/rules/skill-frontmatter-parsed.js`, parses the same frontmatter with a real YAML parser and compares each top-level plain scalar against its raw line. Neither replaces the other: the silent class is valid YAML, so a parser returns the corrupted value without complaint.

## The README rule

**`skill-readme`**, in `scripts/rules/skill-readme.js`, holds every skill to a `README.md` that says how it is installed. Which install forms count is `workflows/new.md`'s to state, under *How it is installed*.

## The path rules

**`skill-portable-paths`**, in `scripts/rules/skill-portable-paths.js`, holds a path to one that survives another machine. It reads code spans, fenced lines and link destinations off the token tree, never a raw line.

**`skill-referenced-paths`**, in `scripts/rules/skill-referenced-paths.js`, holds a path named in prose to one that resolves. It reads code spans in prose and never a fenced block, and `scripts/rules/paths.js` decides which spans are paths.

A path the target cannot resolve, and is not meant to, opens with the placeholder that names its root, per *Paths must survive any working directory and any machine* in `workflows/new.md`.

## The name rule

**`skill-name`**, in `scripts/rules/skill-name.js`, holds a skill's frontmatter `name` to its own directory and to what the specification allows a name to be.

## The invocation rule

**`skill-invocation`**, in `scripts/rules/skill-invocation.js`, holds `disable-model-invocation` and `user-invocable` to booleans, and a field at a non-default value to a description that speaks about invocation. `workflows/new.md` owns what each field does.

**What it cannot decide is whether the sentence it found matches the field.** A description stating the wrong policy is the reviewer's to catch.

## The fork rule

**`skill-fork`**, in `scripts/rules/skill-fork.js`, reports a skill that sets `agent` while its `context` is not `fork`, where Claude Code runs it inline and ignores the field. `workflows/new.md` owns what each field does.

**What it cannot decide is whether a forked skill's body holds a task.** That is the reviewer's to catch.

## The agent rule

**`agent-frontmatter`**, in `scripts/rules/agent-frontmatter.js`, holds an agent file's frontmatter to what Claude Code loads. An agent file sits under `<plugin-dir>/agents/` beside a `<plugin-dir>/.claude-plugin/` folder, or under the agents folder of any `.claude` folder, which a folder target reaches only when it names that `.claude` folder or one inside it. Frontmatter that does not parse and a missing `description` are left to `claude plugin validate --strict`. Beside it, `agent-plugin-name`, in the same file, warns on a plugin's agent whose name Claude Code drops, and a warning leaves the run passing.

## The continuation rule

**`skill-continuations`**, in `scripts/rules/skill-continuations.js`, is the mechanical face of *One continuation paragraph per list item, and it carries the item's reason* in `workflows/new.md`. It reads the parser's tree rather than the lines.

**What it cannot decide is whether the item has a heading level free to be promoted to.** The writer chooses between promoting the item and unindenting it.

## The bolded-run rule

**`skill-bolded-runs`**, in `scripts/rules/skill-bolded-runs.js`, is the mechanical face of *At most five list items in a row open with a bolded lead* in `workflows/new.md`. It reads the items the continuation rule reads.

**What it cannot decide is whether a run is members of one set or a section wearing bullets.** The writer chooses among the moves `workflows/new.md` gives each shape.

## The bolded-paragraph rule

**`skill-bolded-paragraphs`**, in `scripts/rules/skill-bolded-paragraphs.js`, is the mechanical face of *At most five paragraphs in a row open with a bolded lead* in `workflows/new.md`. It reads only the document's top-level blocks.

**What it cannot decide is where a run's subsections fall.** The writer chooses the seams.

## The hard-wrap rule

**`skill-hard-wrap`**, in `scripts/rules/skill-hard-wrap.js`, is the mechanical face of *No hard wrapping* in `workflows/new.md`. It reads every paragraph on the parser's tree, so a list item's and a blockquote's are reached too, and it leaves an HTML block alone. Its findings are warnings, which leave the run passing, because unwrapped prose is a convention of this skill's author and `workflows/export.md` lets a skill decline its author's conventions.

**What it cannot decide is what a reported paragraph was meant to be.** A list item the parser read as an earlier paragraph's text, as after a block at column 0 that closed its list, needs its structure fixed rather than its lines joined.

## The layout rule

**`skill-layout`**, in `scripts/rules/skill-layout.js`, holds every `SKILL.md` out of another skill's directory, searching no higher than the target.

## The directive rule

**`skill-vale-directive`**, in `scripts/rules/skill-vale-directive.js`, keeps a target from switching the prose rules off from inside its own markdown while the run still prints a clean last line. It reads HTML comments, so a directive inside a code span or a fenced block is left alone.

## The argument-hint rule

**`skill-argument-hint`**, in `scripts/rules/skill-argument-hint.js`, holds a `SKILL.md`'s `argument-hint` to its routing section, per that field's row in the frontmatter table of `workflows/new.md`.

**What it cannot decide is whether a one-word group such as `[manage]` is a verb or a placeholder, or whether a route does what the hint promises.** It holds only a group listing alternatives with `|` to routing, so an unrouted verb in a one-word group, and a route that does the wrong thing, are the reviewer's to catch.

## The Bash rule

**`skill-bash-blocks`**, in `scripts/rules/skill-bash-blocks.js`, is the mechanical face of *Code blocks are Bash* in `workflows/new.md`. It reads fenced blocks only, so a code span may name a phrasing it reports.

**What it cannot decide is another shell's syntax beyond the phrasings it records.** That is the reviewer's to catch.

## The YAML rules

`scripts/check.js` parses every YAML file under the target and holds its comments to *No hard wrapping* in `workflows/new.md`. It reads comments off the parser's tree, and neither linter reads a YAML file. Commented-out YAML reads as a wrap, and deleting the block is the fix.

## The plugin file rules

**`plugin-hooks`** and **`plugin-manifest`**, in `scripts/rules/plugin-files.js`, hold a plugin's `<plugin-dir>/hooks/hooks.json` and `<plugin-dir>/.claude-plugin/plugin.json` to what Claude Code loads. A plugin is any folder at the target or under it that holds a `<plugin-dir>/.claude-plugin/` folder, and each file is read by its fixed path because the walk skips dot-folders.

A file that is not valid JSON, and every mistake `claude plugin validate --strict` reports, are left to that command.

## The prose rules

Vale runs the `Agentifico` style, one rule file under `assets/Agentifico/` per mechanical half of a rule `workflows/new.md` states. Each file's header says what the rule reaches and what it leaves to a reader. Text inside double quotes is not read, for the reason `.vale.ini` gives beside `TokenIgnores`.

| Rule | Enforces |
| --- | --- |
| `assets/Agentifico/Counts.yml` | *Write sentences that survive change* |
| `assets/Agentifico/Digits.yml` | *Write a count from two to twenty in words* |
| `assets/Agentifico/Position.yml` | *Write sentences that survive change* |
| `assets/Agentifico/History.yml` | *Never write the file's own history* |
| `assets/Agentifico/Banner.yml` | *Put a version next to the claim it qualifies, never as a banner at the top* |
| `assets/Agentifico/ParagraphLength.yml` | *Cut every paragraph to its one new claim* |
| `assets/Agentifico/ClosingRecap.yml` | *Cut every paragraph to its one new claim* |
| `assets/Agentifico/CommentSentences.yml` | *A comment inside code exists only where the solution is unconventional, and is one sentence saying why* |
| `assets/Agentifico/CommentLength.yml` | *A comment inside code exists only where the solution is unconventional, and is one sentence saying why* |
| `assets/Agentifico/SkillSplit.yml` | *Let size decide whether to split* |
| `assets/Agentifico/SkillLength.yml` | *Let size decide whether to split* |
| `assets/Agentifico/FileLength.yml` | *Let size decide whether to split* |

**What escapes the code reach, and where each goes.** A comment in a `*.sh` or `*.ini` file is the reviewer's, since Vale has no comment scope for either and reads each whole, code lines included. `TokenIgnores` does not reach a code comment, so a phrase quoted inside one is read, and a rule it misfires on takes the exception. `*.yml` stays out of the prose rules, though the check parses it, because the style's own rule files quote the phrases they catch, and a rule cannot be judged by the phrases it defines. A `vale off` written as a code comment silences nothing, so the code reach has no twin of the hole `skill-vale-directive` covers.

## What a sweep still looks for by hand

No rule in this file decides these, so a sweep reads for them, and where an item is an authoring rule, `workflows/new.md` owns it and its reason:

- **The opening line of every file.** `MD041` is off because the files here open with different things and no one rule fits them all: a skill file and a workflow here with the tools blockquote, a convention of this package that `workflows/new.md` does not require, a `README.md` with whatever it is written to open with, a heading or a byline, and a file under `references/` with a heading. Which of those a given file owes is what a sweep reads for, and a repository's own convention for that opening is the authority on its own files: `workflows/export.md` states why, which is that the skill may practise its author's conventions and must not require them.
- **Over-writing no rule reads.** No rule caps a section, compares one file with another or tells a reason from a defence, so a sweep reads for each under its note in `workflows/review.md` Step 3: *Rationale that restates the rule*, *A rule stated in two files of one skill*, *A document restating the code it describes*, *A defence of the design after the instruction*, *One-time reference inside a workflow*, and, past the heading `ClosingRecap` warns on, the bullets of *A closing recap*.
- **The judgement half of every prose rule.** A regex catches the wording of a defect and never its substance, so a clean prose run says only that the recorded phrasings are absent.

## Reporting

State what was checked, not just what failed. The run's last line, `7 files checked, 0 issues, 0 warnings`, is a result; silence is not.

If a skill was edited to fix a finding, re-run the check afterwards. Editing frontmatter is exactly how a quoted description loses its quotes.
