> **Tools used:** `Bash(node:*)` for the check and its suite, `Bash(npm:*)` for the one-time install of what they need, `Glob` to enumerate skills.

The mechanical audit. Run it after writing or editing any skill, and before reviewing one. One command runs everything: markdownlint's general rules over every markdown file a skill keeps, and this skill's own rules, which are markdownlint custom rules loaded from the `.markdownlint-cli2.jsonc` beside `SKILL.md`. A finding names its file, its line and its rule, and the run ends with a count of what it checked.

## Setup, once per install

The check runs on Node 22 or later with what `package.json` declares, installed once into the skill's own directory. `<skill-dir>` is where this skill is installed, per `SKILL.md`, which defines it once for every command here:

```bash
npm --prefix <skill-dir> ci
```

## The check

The target is one skill's own directory, a directory of skills, or a package root whose skills sit further down - a plugin's at `<root>/skills/` - and it defaults to the current directory. Symlinks are followed, because an agent's own skills directory is a directory of them pointing into the canonical tree, and dot-directories are skipped:

```bash
node <skill-dir>/scripts/check.js ~/.agents/skills
```

Every markdown file under the target is read, since a rule about prose applies wherever the skill keeps prose; the rules about frontmatter apply to a file named `SKILL.md` and leave the rest alone. Checking nothing exits non-zero: a target with no markdown under it is a wrong target, and its silence is indistinguishable from a clean sweep.

How a review reads a target covering more than one skill is `workflows/review.md` Step 1's.

## What the general lint covers

markdownlint's own rules run at their defaults and catch what no local rule states: list indentation, blank lines around lists, heading increments, duplicate headings, trailing whitespace, and the rest of its set. A rule that is off is named in `.markdownlint-cli2.jsonc` with its reason beside it, and a rule may be turned off there for a reason and never for quiet.

## The description rules

These are the ones that matter, because their failure modes are silent twice over: a truncated description keeps loading with fewer triggers, and a frontmatter parse error makes the skill vanish from the listing with no complaint. Every trap they test was watched failing in a real YAML parser before it earned its place, and the suite re-runs that evidence on demand.

**`skill-description`** is the raw-line sweep. It reads the frontmatter as strings and never parses it. No finding means the description is a block scalar, immune to every trap here, or a plain or quoted scalar carrying none of them; a finding names its defect. `SKILL.md` owns the membership of the trap classes it tests, under "YAML eats the description at `#`"; what matters here is that neither class is loud. The silent class corrupts the triggers while the skill keeps working, and the parse-error class is swallowed by the harness, so the skill simply never appears in the listing.

**`skill-description-parsed`** is the differential: it parses the same frontmatter with a real YAML parser and compares the parsed description against the raw line, where any difference on a plain scalar means a trap fired, and a parse error means the skill will not load at all. It parses under YAML 1.1, the reading under which `yes` becomes a boolean, because the trap it catches is what some parsers make of a value, and the stricter reading is the one that can fail. A parser alone cannot replace the sweep: the silent class is valid YAML, which is exactly its disguise, so a parser returns the corrupted value without complaint. The raw sweep and the parsed differential are two rules, and both run on every target.

## The name rule

**`skill-name`**: every skill's frontmatter `name` must match its own directory. It is a rule rather than a loop written out here because shell written as prose carries quoting, word-splitting and glob hazards that nothing runs and nothing tests: a pipe swallows an exit code, an empty capture runs the body once on nothing, an unquoted expansion splits a name on its spaces and matches its brackets against the working directory. A rule gets the suite, where each of those is a fixture.

## The invocation rule

**`skill-invocation`**: `disable-model-invocation` and `user-invocable` decide who may invoke a skill, and `workflows/new.md` owns what each does. A field present must be lowercase `true` or `false`, once and unquoted: `yes` and `True` are booleans in some parsers and strings in others, a quoted value is a string in every parser, and a duplicate key is the last-wins trap the description rule reports. A field at a non-default value has to be matched by a description that says something about invocation, because another agent ignores the field silently and there the description is all that holds.

**What it cannot decide is whether the sentence it found matches the field.** It tells a description silent on invocation from one that speaks, and stops there; a description stating the wrong policy is the reviewer's to catch.

## The continuation rule

**`skill-continuations`**: `workflows/new.md` owns the rule on continuation paragraphs under a list item, and its reason; this is its mechanical face, over every markdown file under the target. It reads the parser's tree rather than the lines, so how a list item's paragraphs are found is the parser's business and only the cap is this skill's.

**What it cannot decide is whether the item has a heading level free to be promoted to.** That is the judgement `workflows/new.md` leaves with the writer, so a report from this rule names the item and the writer chooses between promoting it and unindenting it.

## The layout rule

**`skill-layout`**: a `SKILL.md` with another `SKILL.md` in an ancestor directory under the target is a skill inside a skill. Some agents discover skills recursively and would read it as a broken skill, so an example quoted inside a skill's own tree is a finding rather than something the check tolerates. The search stops at the target.

## Why markdownlint-cli2

The choice was made on 2026-09-06 against stated criteria - maintenance, CommonMark conformance, whether every local rule could live in the same tool as the general lint - and markdownlint-cli2 is the one that met all three: the reference implementation of the markdownlint rule set, micromark under it, a custom-rule API that hands a rule the raw frontmatter lines apart from the body, the CommonMark token tree and a line-numbered report, and string input in its library, which is what lets the suite hold its fixtures as strings. The alternatives, and why each lost: rumdl is a runtime-free binary approximating the same rule set under one maintainer, with no rule API; mdl is a Ruby gem with no CommonMark parser under it and a three-space list default; remark-lint lacks two of the general rules named above; a parser library alone would have left the general lint and the local rules in two tools with two parsers.

## The suite

After editing a rule or the check itself, run the suite. Each rule's fixtures are strings passed through markdownlint's own string input, so no fixture is ever written as a real `SKILL.md`, which some agents would discover recursively as a broken skill; the argument shapes - a package root, roots side by side, a directory of symlinks, a dot-directory, a skill inside a skill, an empty target - run against the check in a temporary directory that the suite creates and removes:

```bash
npm --prefix <skill-dir> test
```

Every assertion in it was watched failing against the behaviour it exists to catch before it was trusted. A check that has never been seen to fail is not evidence.

## What a sweep still looks for by hand

These are the mechanical faces of the authoring rules in `workflows/new.md`, which owns each rule and its reason; no rule above decides them yet, so a sweep reads for them:

- **`argument-hint` against the routing table.** Every advertised verb routes somewhere, and every route is advertised.
- **A `README.md` exists, and names how the skill is installed.** Both are sweepable: the file is there or it is not, and a grep for an install heading or command says whether a reader who wants the skill can get it.
- **Referenced files exist.** A router pointing at `workflows/foo.md` that was never written fails only when that path is taken, which may be months later.
- **Code blocks are Bash.** Shell-specific syntax from another shell (`set x (cmd)`, `; or`, `; and`) fails when an agent executes it.
- **Portable paths.** Nothing absolute to one machine's home directory; skill-relative or `~/`-relative instead.

## Reporting

State what was checked, not just what failed. "7 files checked, 0 issues" is a result; silence is not.

If a skill was edited to fix a finding, re-run the check afterwards. Editing frontmatter is exactly how a quoted description loses its quotes.
