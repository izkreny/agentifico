> **Tools used:** `Bash(node:*)` for the check, `npm` for the one-time install of what it needs, which prompts, `Glob` to enumerate skills.

The mechanical audit. Run it after writing or editing any skill, and in a review once the read is done and before any judgement is made. One command runs everything: markdownlint's general rules over every markdown file a skill keeps, this skill's own markdownlint custom rules, listed in `scripts/lint-config.js` beside the configuration, on what a file is and on how it lays its prose out, and Vale with this skill's own rules on what a file says, which live under `assets/` and are named in `.vale.ini`.

**Findings group by heading**: `skill rules` for the rules that decide what a file is, `prose shape` for the rules on how it lays its prose out, `general lint` for markdownlint's defaults, `prose rules` for Vale's alerts.

**Read the last line**, `N files checked, M issues, K warnings`: an issue fails the run, a warning fails nothing. `prose rules not run` in place of the warning count means Vale was missing or refused its configuration, and the run fails whatever the count, since a check that silently ran half its rules would read as a clean sweep. On that line the file count is the markdown files alone, since a code file's only reader is the process that did not start.

## Setup, once per install

The check runs on Node 22 or later with what `package.json` declares, installed once into the skill's own directory. `<skill-dir>` is where this skill is installed, one of the placeholders `workflows/new.md` defines under *Paths must survive any working directory and any machine*:

```bash
npm --prefix <skill-dir> ci
```

The prose rules run through Vale on `PATH`, at the version `scripts/check.js` requires; a run on an older one refuses and names that version. Vale's [installation page](https://docs.vale.sh/topics/installation) gives a route per machine; a pinned version through a tool manager is the one that keeps the version the rules were written against.

## The check

The target is one skill's own directory, a directory of skills, or a package root whose skills sit further down - a plugin's at `<target>/skills/` - and it defaults to the current directory. Symlinks are followed, because an agent's own skills directory is a directory of them pointing into the canonical tree. Dot-directories are skipped, and so is anything under `node_modules/`, which belongs to a skill's dependencies rather than to its prose:

```bash
node <skill-dir>/scripts/check.js path/to/the-skill
```

**One skill is the gate; a wider target is a survey.** Against a single skill the exit code answers "is this skill clean", which is what a branch and a sweep both want. Against a directory of skills or a package root it answers only "does anything under here have findings", and it will usually be non-zero: the run reports every skill it reaches, and `references/managing.md` forbids editing a manager-installed one, so a finding there is a report to that skill's author rather than work for the runner.

Every markdown file under the target is read, subject to those exclusions, since a rule about prose applies wherever the skill keeps prose; the rules about frontmatter apply to a file named `SKILL.md` and leave the rest alone. Nothing under the target is read as configuration, so a tree cannot switch off the rules that judge it, and a copy of this skill under the target is linted rather than imported. Checking nothing exits non-zero: a target with no markdown under it is a wrong target, and its silence is indistinguishable from a clean sweep. A target holding markdown but no skill is a legitimate one and is read.

Every `*.js` and `*.py` file under the target is read too, under the same exclusions, by the prose rules alone: Vale reads a code file as its comments and docstrings and skips the code and its string literals, so a comment is held to the rules a paragraph is, and markdownlint never sees the file. When Vale ran, a code file counts in the closing line's file count as a markdown one does, so a code file that raised nothing is visible there rather than silently skipped.

How a review reads a target covering more than one skill is `workflows/review.md` Step 1's.

## What the general lint covers

markdownlint's own rules run at their defaults and catch what no local rule states: list indentation, blank lines around lists, heading increments, duplicate headings, trailing whitespace, and the rest of its set. A rule that is off is named in `scripts/lint-config.js` with its reason beside it, and a rule may be turned off there for a reason and never for quiet. A comment in the target cannot turn one off: the check runs markdownlint with its inline configuration ignored, so `<!-- markdownlint-disable -->` and every comment of its family silence nothing.

## The description rules

These are the ones that matter, because their failure modes are silent twice over: a truncated description keeps loading with fewer triggers, and a frontmatter parse error makes the skill vanish from the listing with no complaint. Every trap they test is one a real YAML parser exhibits.

**`skill-description`** is the raw-line sweep: it reads the frontmatter as strings and never parses it. No finding means the description carries none of the traps here. A block scalar is immune to the quote and truncation traps, which need a plain or quoted value to bite; a finding names its defect. `SKILL.md` owns the membership of the trap classes it tests, under "YAML eats the description at `#`". Neither class is loud: the silent one corrupts the triggers while the skill keeps working, and the parse-error one is swallowed by the harness, so the skill never appears in the listing.

A check decided before the value's style is looked at holds for a block scalar as well: the absent key and the duplicate key. The empty value and the ceiling are judged against the value rather than the line, so `skill-frontmatter-parsed` owns them.

**`skill-frontmatter-parsed`** is the differential: it parses the same frontmatter with a real YAML parser and compares every top-level plain scalar against its raw line. Any difference means a trap fired, and a parse error means the skill will not load at all. It parses under YAML 1.1, the reading under which `yes` becomes a boolean, because the trap it catches is what some parsers make of a value and the stricter reading is the one that can fail. A parser alone cannot replace the sweep, since the silent class is valid YAML and a parser returns the corrupted value without complaint; the sweep and the differential each run on every target.

It also holds the description to the specification's ceiling of 1,024 characters and reports a present key whose value is empty, both measured on what the parser read rather than on the lines as written: a block scalar's indentation is not part of its value, a quote character is not either, and every empty shape is one empty string only once a parser has read it.

It holds `compatibility` to the specification's own ceiling of 500 characters the same way. Both are measured on what the author wrote: a clipped block scalar keeps one trailing newline that the style adds rather than the author, so it is trimmed before the comparison and a ceiling does not depend on which style carries the text.

It reads every key rather than the description alone, because a space and a hash inserted anywhere in the frontmatter drops the tail of whatever key it lands in. Left alone are a quoted value and a block scalar, which the family cannot reach; a value the parser reads as something other than text, which belongs to the rule that owns it; and a value whose text begins on the next line, which has nothing on its own key line to compare.

## The README rule

**`skill-readme`** is anchored to `SKILL.md` rather than to the README, because a README that does not exist is never a file markdownlint visits. It reports a missing `README.md` beside a `SKILL.md`, and one that carries no install form. Which forms count is `workflows/new.md`'s to state, under *How it is installed*.

## The path rules

**`skill-portable-paths`** reads the token tree and reports a path absolute to one machine: a code span, a line inside a fenced block, or a link destination opening '/home/', '/Users/' or a drive letter. Prose that mentions a home directory in words is not a path, which is why the rule never reads a raw line. It also reports a `~/` code span in prose and a `<home-dir>` inside a fenced block, each being the other's form. A URL is not a drive letter: `https://` carries a letter, a colon and a slash too, so the drive-letter branch refuses one preceded by a letter.

**`skill-referenced-paths`** reports a code span in prose that names a file and resolves against none of the owning skill, the file's own directory and the target root. Fenced content is never read, because a fence carries a command to run rather than a reference into this tree. The rule takes no `--ignore`, so a span naming a file this tree does not hold is reported rather than silenced.

**Which spans count as paths**, so a reader can tell a finding from a span the rule was never going to read: one ending in a known file extension, or one ending in a slash, which names a directory. A span carrying a glob, a placeholder, a URL scheme, a space or a `..` is not a path, nor is one opening with `-`, `#`, `@` or a slash. That is what keeps a branch name, a slash command and an `owner/repo` slug out of the findings, and it is why an absolute path is invisible here and belongs to `skill-portable-paths` instead.

**A path the target cannot resolve, and is not meant to, opens with the placeholder that names its root**: `<repo-root>/.agents/gh-solo.md` for a file the served repository holds, `<skill-dir>/workflows/example.md` for an example file the skill does not hold. The set of placeholders, and why a path to a file the skill holds stays bare, is in `workflows/new.md` under *Paths must survive any working directory and any machine*.

**Write a path in the user's own locations as `<home-dir>/` in prose and `~/` inside a fenced command.** Either is portable and names a file no checkout can resolve, and a reader pasting a command gets a shell that expands `~` and no placeholder.

## The name rule

**`skill-name`**: every skill's frontmatter `name` must match its own directory, and must be what the specification allows a name to be - at most 64 characters of lowercase alphanumerics joined by single hyphens, so no leading, trailing or doubled hyphen.

The directory match cannot decide the charset on its own, because a directory may carry anything the filesystem allows, so a name matching its own directory exactly can still be one the standard's validator rejects.

## The invocation rule

**`skill-invocation`**: `disable-model-invocation` and `user-invocable` decide who may invoke a skill, and `workflows/new.md` owns what each does. A field present must be lowercase `true` or `false`, once and unquoted: `yes` and `True` are booleans in some parsers and strings in others, a quoted value is a string in every parser, and a duplicate key is the last-wins trap the description rule reports. A field at a non-default value has to be matched by a description that says something about invocation, because another agent ignores the field silently and there the description is all that holds.

**What it cannot decide is whether the sentence it found matches the field.** It tells a description silent on invocation from one that speaks, and stops there; a description stating the wrong policy is the reviewer's to catch.

## The continuation rule

**`skill-continuations`**: `workflows/new.md` owns the rule on continuation paragraphs under a list item, and its reason; this is its mechanical face, over every markdown file under the target. It reads the parser's tree rather than the lines, so how a list item's paragraphs are found is the parser's business and only the cap is this skill's.

**What it cannot decide is whether the item has a heading level free to be promoted to.** That is the judgement `workflows/new.md` leaves with the writer, so a report from this rule names the item and the writer chooses between promoting it and unindenting it.

## The bolded-run rule

**`skill-bolded-runs`**: `workflows/new.md` owns the cap on consecutive list items that open with a bolded lead, and its reason; this is its mechanical face, reading the same items the continuation rule reads. A run is counted within one list, so a nested list neither extends nor breaks its parent's run, and the finding names the run's first item. Five is a figure measured against the tree this package ships from.

**What it cannot decide is whether a run is members of one set or a section wearing bullets.** The shape is identical and the difference is meaning, so a report names the run and the writer chooses among the moves `workflows/new.md` gives each shape.

## The bolded-paragraph rule

**`skill-bolded-paragraphs`**: `workflows/new.md` owns the cap on consecutive paragraphs that open with a bolded lead, what ends a run, and the reason; this is its mechanical face, sharing the bolded-run rule's figure. It reads only the document's top-level blocks, so a paragraph inside a list item or a quote never counts, and a list, a fence or a table between bolded paragraphs sits inside the run rather than ending it. The finding names the run's first paragraph.

**What it cannot decide is where a run's subsections fall.** The headings that group five or fewer claims come from what the claims say, so a report names the run and the writer chooses the seams.

## The layout rule

**`skill-layout`**: a `SKILL.md` with another `SKILL.md` in an ancestor directory under the target is a skill inside a skill. Some agents discover skills recursively and would read it as a broken skill, so an example quoted inside a skill's own tree is a finding rather than something the check tolerates. The search stops at the target.

## The directive rule

**`skill-vale-directive`** reports an HTML comment whose text opens with lowercase `vale`. Such a comment is a Vale directive: it switches the prose rules off for the file carrying it, so a target can silence the rules that judge it from inside its own markdown while the run still prints a clean last line.

The match is case-sensitive because Vale's is, so an uppercase directive, which silences nothing, is left alone. So is one written inside a code span or a fenced block, which reaches no HTML token, and that is what lets this file write `<!-- vale off -->` at all. Where a phrase genuinely needs an exception, it belongs in the `exceptions` key of the rule it misfires on, under `assets/`, with its reason beside it, and the rule's message says so.

## The prose rules

Vale runs the `Agentifico` style under `assets/`, which is one rule file per mechanical half of a rule `workflows/new.md` states, with each message opening on the heading it enforces. A rule's tokens are the phrasings a review caught in this repository's own history. Text inside double quotes is not read, per `.vale.ini`, because the rule files quote their own bad examples, which is also why a defect written inside quotes escapes the check.

| Rule | For | What it reports | Level | What stays out of its reach |
| --- | --- | --- | --- | --- |
| `Counts` | *Write sentences that survive change* | a count of adjacent content | error | A cap is not matched, since a figure that constrains future content stays true when an item lands, and a count of things outside the document is not adjacent content, so a bare "both" is matched only in the shapes the record carries: before a recorded noun, opening a line before a comma, and before "needing". |
| `Position` | *Write sentences that survive change*, its other half | a pointer by direction, a uniqueness claim, a recency claim, or an ordinal into the document's own list | error | Whether a uniqueness claim is true by construction is a reading, and such a phrase is an exception in the rule file with its reason beside it. |
| `History` | *Never write the file's own history* | the words that anchor a sentence to a moment rather than a reason | error | A sentence that is history in substance with none of those words is the round's to read. |
| `Banner` | *Put a version next to the claim it qualifies, never as a banner at the top* | a version, a date or a currency claim in a file's opening region, its opening paragraph read past the frontmatter and past a tools blockquote or heading | error | A version beside the claim it qualifies further down is what the rule asks for and is out of the rule's reach by design; no review in this repository ever caught a banner, so its tokens are borrowed from published Vale styles and the shapes the tracker writes. |
| `ParagraphLength` | *Cut every paragraph to its one new claim* | a body paragraph over 120 words, a figure measured against this package | warning | The message says the paragraph is long enough to read for a second claim, and whether that claim is new is the reading the rule exists to prompt. |
| `ClosingRecap` | *Cut every paragraph to its one new claim*, at the size of a section | a closing `##` section headed Rules, Summary or Recap, where another `##` section comes before it, in any markdown file but a `README.md` | warning | Whether a bullet repeats a step or states a rule the rest of the skill does not is the reading the warning prompts. A `##` line inside a fenced block is read as a heading, since the rule reads the raw source. |
| `CommentSentences` | *A comment inside code exists only where the solution is unconventional, and is one sentence saying why* | a comment or a docstring holding more than one sentence end, a Python module's docstring exempt per PEP 257 | error | A second sentence with no terminal punctuation counts one end and escapes. Vale does not read a comment addressed to a tool, such as `biome-ignore`, `eslint-disable`, `noqa` or `type: ignore`, so any number of sentences written on a directive line escape; in a run of line comments only the directive line is dropped, and the explanatory lines in it are still read. |
| `CommentLength` | *A comment inside code exists only where the solution is unconventional, and is one sentence saying why*, its counting half | a comment or a docstring over 45 words, a figure measured against this package, a Python module's docstring exempt per PEP 257 | warning | As with `ParagraphLength`, the message says the comment is long enough to read for a second claim, and whether the sentence is a reason is the reading the rule prompts. |
| `SkillSplit`, `SkillLength` | *Let size decide whether to split* | a `SKILL.md` past roughly 2,000 words of prose, where operations move to workflow files, and past roughly 3,500, the cap the spec's token budget allows | warning | Both figures are roughly, counted on Vale's prose metric rather than `wc -w`, which also counts code. |
| `FileLength` | *Let size decide whether to split* | a markdown file other than a `SKILL.md` or a `README.md` past 3,500 words of prose, the cap a `SKILL.md` has | warning | The message suggests cutting before splitting, and whether to cut, split or leave the file is the owner's call. |

**What escapes the code reach, and where each goes.** A comment in a `*.sh` or `*.ini` file is the reviewer's, since Vale has no comment scope for either and reads each whole, code lines included. `TokenIgnores` does not reach a code comment, so a phrase quoted inside one is read, and a rule it misfires on takes the exception. `*.yml` stays out because the style's own rule files quote the phrases they catch, and a rule cannot be judged by the phrases it defines. A `vale off` written as a code comment silences nothing, so the code reach has no twin of the hole `skill-vale-directive` covers.

## What a sweep still looks for by hand

No rule in this file decides these, so a sweep reads for them, and where an item is an authoring rule, `workflows/new.md` owns it and its reason:

- **`argument-hint` against the routing table.** Every advertised verb routes somewhere, and every route is advertised.
- **Code blocks are Bash.** Shell-specific syntax from another shell (`set x (cmd)`, `; or`, `; and`) fails when an agent executes it.
- **The opening line of every file.** `MD041` is off because the files here open with different things and no one rule fits them all: a skill file and a workflow here with the tools blockquote, a convention of this package that `workflows/new.md` does not require, a `README.md` with whatever it is written to open with, a heading or a byline, and a file under `references/` with a heading. Which of those a given file owes is what a sweep reads for, and a repository's own convention for that opening is the authority on its own files: `workflows/export.md` states why, which is that the skill may practise its author's conventions and must not require them.
- **Over-writing no rule reads.** No rule caps a section, compares one file with another or tells a reason from a defence, so a sweep reads for each under its note in `workflows/review.md` Step 3: *Rationale that restates the rule*, *A rule stated in two files of one skill*, *A defence of the design after the instruction*, *One-time reference inside a workflow*, and, past the heading `ClosingRecap` warns on, the bullets of *A closing recap*.
- **The judgement half of every prose rule.** A regex catches the wording of a defect and never its substance, so a clean prose run says only that the recorded phrasings are absent.

## Reporting

State what was checked, not just what failed. The run's last line, `7 files checked, 0 issues, 0 warnings`, is a result; silence is not.

If a skill was edited to fix a finding, re-run the check afterwards. Editing frontmatter is exactly how a quoted description loses its quotes.
