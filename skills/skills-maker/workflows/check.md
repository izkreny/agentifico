> **Tools used:** `Bash(node:*)` for the check and its suite, `Bash(npm:*)` for the one-time install of what they need, `Glob` to enumerate skills.

The mechanical audit. Run it after writing or editing any skill, and before reviewing one. One command runs everything: markdownlint's general rules over every markdown file a skill keeps, this skill's own rules on what a file is, which are markdownlint custom rules listed in `scripts/lint-config.js` beside the configuration, and Vale with this skill's own rules on what a file says, which live under `styles/` and are named in `.vale.ini`. Each finding prints as its file, line and rule with the detail beside it, and the run ends with one line, `N files checked, M issues, K warnings`, which is the line to read: an issue fails the run, a warning is a helper that points a reviewer somewhere and fails nothing.

When Vale is missing or refuses its configuration the line reads `N files checked, M issues, prose rules not run`, with the reason beneath it, and the run fails whatever the count, since a check that silently ran half its rules would read as a clean sweep.

## Setup, once per install

The check runs on Node 22 or later with what `package.json` declares, installed once into the skill's own directory. `<skill-dir>` is where this skill is installed, per `SKILL.md`, which defines it once for every command here:

```bash
npm --prefix <skill-dir> ci
```

The prose rules run through Vale, 3.20 or later, on `PATH`. Its [installation page](https://docs.vale.sh/topics/installation) gives a route per machine; a pinned version through a tool manager is the one that keeps the version the rules were written against.

## The check

The target is one skill's own directory, a directory of skills, or a package root whose skills sit further down - a plugin's at `<root>/skills/` - and it defaults to the current directory. Symlinks are followed, because an agent's own skills directory is a directory of them pointing into the canonical tree. Dot-directories are skipped, and so is anything under `node_modules/`, which belongs to a skill's dependencies rather than to its prose:

```bash
node <skill-dir>/scripts/check.js path/to/the-skill
```

**One skill is the gate; a wider target is a survey.** Against a single skill the exit code answers "is this skill clean", which is what a branch and a sweep both want. Against a directory of skills or a package root it answers only "does anything under here have findings", and it will usually be non-zero: the run reports every skill it reaches, and `references/managing.md` forbids editing a manager-installed one, so a finding there is a report to that skill's author rather than work for the runner.

Every markdown file under the target is read, subject to those exclusions, since a rule about prose applies wherever the skill keeps prose; the rules about frontmatter apply to a file named `SKILL.md` and leave the rest alone. Nothing under the target is read as configuration, so a tree cannot switch off the rules that judge it, and a copy of this skill under the target is linted rather than imported. Checking nothing exits non-zero: a target with no markdown under it is a wrong target, and its silence is indistinguishable from a clean sweep.

How a review reads a target covering more than one skill is `workflows/review.md` Step 1's.

## What the general lint covers

markdownlint's own rules run at their defaults and catch what no local rule states: list indentation, blank lines around lists, heading increments, duplicate headings, trailing whitespace, and the rest of its set. A rule that is off is named in `scripts/lint-config.js` with its reason beside it, and a rule may be turned off there for a reason and never for quiet.

## The description rules

These are the ones that matter, because their failure modes are silent twice over: a truncated description keeps loading with fewer triggers, and a frontmatter parse error makes the skill vanish from the listing with no complaint. Every trap they test was watched failing in a real YAML parser before it earned its place, and the suite re-runs that evidence on demand.

**`skill-description`** is the raw-line sweep: it reads the frontmatter as strings and never parses it. No finding means the description carries none of the traps here. A block scalar is immune to the quote and truncation traps, which need a plain or quoted value to bite; a finding names its defect. `SKILL.md` owns the membership of the trap classes it tests, under "YAML eats the description at `#`". Neither class is loud: the silent one corrupts the triggers while the skill keeps working, and the parse-error one is swallowed by the harness, so the skill never appears in the listing.

A check decided before the value's style is looked at holds for a block scalar as well: the absent key, the duplicate key, the empty value and the ceiling.

It also holds the description to the specification's ceiling of 1,024 characters, measured on the value a parser would produce rather than on the lines as written, since a block scalar's indentation is not part of its value.

**`skill-frontmatter-parsed`** is the differential: it parses the same frontmatter with a real YAML parser and compares every top-level plain scalar against its raw line. Any difference means a trap fired, and a parse error means the skill will not load at all. It parses under YAML 1.1, the reading under which `yes` becomes a boolean, because the trap it catches is what some parsers make of a value and the stricter reading is the one that can fail. A parser alone cannot replace the sweep, since the silent class is valid YAML and a parser returns the corrupted value without complaint; the sweep and the differential each run on every target.

It reads every key rather than the description alone, because a space and a hash inserted anywhere in the frontmatter drops the tail of whatever key it lands in. Two shapes are left alone: a value the parser reads as something other than text, which belongs to the rule that owns it, and a value whose text begins on the next line, which has nothing on its own key line to compare.

## The name rule

**`skill-name`**: every skill's frontmatter `name` must match its own directory, and must be what the specification allows a name to be - at most 64 characters of lowercase alphanumerics joined by single hyphens, so no leading, trailing or doubled hyphen.

The directory match cannot decide the charset on its own, because a directory may carry anything the filesystem allows, so a name matching its own directory exactly can still be one the standard's validator rejects. It is a rule rather than a loop written out here because shell written as prose carries quoting, word-splitting and glob hazards that nothing runs and nothing tests: a pipe swallows an exit code, an empty capture runs the body once on nothing, an unquoted expansion splits a name on its spaces and matches its brackets against the working directory. A rule gets the suite, where each of those is a fixture.

## The invocation rule

**`skill-invocation`**: `disable-model-invocation` and `user-invocable` decide who may invoke a skill, and `workflows/new.md` owns what each does. A field present must be lowercase `true` or `false`, once and unquoted: `yes` and `True` are booleans in some parsers and strings in others, a quoted value is a string in every parser, and a duplicate key is the last-wins trap the description rule reports. A field at a non-default value has to be matched by a description that says something about invocation, because another agent ignores the field silently and there the description is all that holds.

**What it cannot decide is whether the sentence it found matches the field.** It tells a description silent on invocation from one that speaks, and stops there; a description stating the wrong policy is the reviewer's to catch.

## The continuation rule

**`skill-continuations`**: `workflows/new.md` owns the rule on continuation paragraphs under a list item, and its reason; this is its mechanical face, over every markdown file under the target. It reads the parser's tree rather than the lines, so how a list item's paragraphs are found is the parser's business and only the cap is this skill's.

**What it cannot decide is whether the item has a heading level free to be promoted to.** That is the judgement `workflows/new.md` leaves with the writer, so a report from this rule names the item and the writer chooses between promoting it and unindenting it.

## The layout rule

**`skill-layout`**: a `SKILL.md` with another `SKILL.md` in an ancestor directory under the target is a skill inside a skill. Some agents discover skills recursively and would read it as a broken skill, so an example quoted inside a skill's own tree is a finding rather than something the check tolerates. The search stops at the target.

## The prose rules

Vale runs the `Agentifico` style under `styles/`, which is one rule file per mechanical half of a rule `workflows/new.md` states, with each message opening on the heading it enforces. A rule's tokens are the phrasings a review caught in this repository's own history, each named in the rule file by the finding or commit that removed it, so a token with no source is not there. A token added later carries its own source the same way, which is what keeps the list evidence rather than taste. Text inside double quotes is not read, per `.vale.ini`, because the rule files quote their own bad examples, which is also why a defect written inside quotes escapes the check.

- **`Counts`**, for *Write sentences that survive change*: a count of adjacent content. An error. A cap is not matched, since a figure that constrains future content stays true when an item lands, and a count of things outside the document is not adjacent content, so the nouns a bare "both" may count are the ones the record carries rather than any plural.
- **`Position`**, the other half of the same rule: a pointer by direction, a uniqueness claim, a recency claim, or an ordinal into the document's own list. An error. Whether a uniqueness claim is true by construction is a reading, and such a phrase is an exception in the rule file with its reason beside it.
- **`History`**, for *Never write the file's own history*: the words that anchor a sentence to a moment rather than a reason. An error. A sentence that is history in substance with none of those words is the round's to read.
- **`Banner`**, for *Put a version next to the claim it qualifies, never as a banner at the top*: a version, a date or a currency claim in a file's opening region, its opening paragraph read past the frontmatter and past a tools blockquote or heading. An error. A version beside the claim it qualifies further down is what the rule asks for and is out of the rule's reach by design; no review in this repository ever caught a banner, so its tokens are borrowed from published Vale styles and the shapes the tracker writes.
- **`ParagraphLength`**, for *Cut every paragraph to its one new claim*: a body paragraph over 120 words, a figure measured against this package. A warning: the message says the paragraph is long enough to read for a second claim, and whether that claim is new is the reading the rule exists to prompt.
- **`SkillSplit`** and **`SkillLength`**, for *Let size decide whether to split*: a `SKILL.md` past roughly 2,000 words of prose, where operations move to workflow files, and past roughly 3,500, the cap the spec's token budget allows. Warnings, since both figures are roughly, counted on Vale's prose metric rather than `wc -w`, which also counts code.

## The suite

After editing a rule or the check itself, run the suite. Each markdownlint rule's fixtures are strings passed through markdownlint's own string input, and each Vale rule's are files in a temporary directory the suite creates and removes, so no fixture is ever written as a real `SKILL.md`, which some agents would discover recursively as a broken skill.

Every Vale rule has a fixture that trips it and a guards fixture of the forms it must leave alone, and the suite fails on any rule no fixture reaches, since a Vale rule that matches nothing fails silently. The argument shapes the wrapper test names run against the check in a temporary directory that the suite creates and removes:

```bash
npm --prefix <skill-dir> test
```

Every assertion in it was watched failing against the behaviour it exists to catch before it was trusted. A check that has never been seen to fail is not evidence.

**`styles/` sits at the skill's own root**, because `StylesPath` is resolved from the `.vale.ini` beside it and that is the layout a Vale reader already knows. The rule files are machine-read definitions rather than prose a reader loads or code the check runs, so neither `references/` nor `scripts/` is their home.

## What a sweep still looks for by hand

These are the faces of the authoring rules in `workflows/new.md`, which owns each rule and its reason, that no rule in this file decides, so a sweep reads for them:

- **`argument-hint` against the routing table.** Every advertised verb routes somewhere, and every route is advertised.
- **A `README.md` exists, and names how the skill is installed.** Both are sweepable: the file is there or it is not, and a grep for an install heading or command says whether a reader who wants the skill can get it.
- **Referenced files exist.** A router pointing at `workflows/foo.md` that was never written fails only when that path is taken, which may be months later.
- **Code blocks are Bash.** Shell-specific syntax from another shell (`set x (cmd)`, `; or`, `; and`) fails when an agent executes it.
- **Portable paths.** Nothing absolute to one machine's home directory; skill-relative or `~/`-relative instead.
- **The opening line of every file.** `MD041` is off because the files here open with different things and no one rule fits them all: a skill file and a workflow with the tools blockquote, per the layout `workflows/new.md` states, a `README.md` with the AI disclaimer line, and a file under `references/` with a heading. Which of those a given file owes is what a sweep reads for.
- **The judgement half of every prose rule.** A regex catches the wording of a defect and never its substance, so a clean prose run says only that the recorded phrasings are absent.

## Reporting

State what was checked, not just what failed. The run's last line, `7 files checked, 0 issues, 0 warnings`, is a result; silence is not.

If a skill was edited to fix a finding, re-run the check afterwards. Editing frontmatter is exactly how a quoted description loses its quotes.
