> **Tools used:** `Bash(node:*)` and, where present, `Bash(ruby:*)` for the frontmatter checks in `scripts/`, `Bash(bash:*)` for their regression bench, `Glob` to enumerate skills.

The mechanical audit. Run it after writing or editing any skill, and before reviewing one. Every check here takes the same target; the node checks find their skills through `scripts/walk.js`, and `scripts/check-differential.rb` carries its own copy of the same rule because it is Ruby and cannot read that file.

## The description check

This is the one that matters, because its failure modes are silent twice over: a truncated description keeps loading with fewer triggers, and a frontmatter parse error makes the skill vanish from the listing with no complaint. Every trap it tests was watched failing in a real YAML parser before it earned its place; `scripts/test-checks.sh` re-runs that evidence on demand.

The checks live as files under this skill's `scripts/`. The target is one skill's own directory, a directory of skills, or a package root whose skills sit further down - a plugin's at `<root>/skills/` - and it defaults to the current directory:

```bash
node scripts/check-descriptions.js ~/.claude/skills
command -v ruby >/dev/null && ruby scripts/check-differential.rb ~/.claude/skills
```

Each run ends with a count of what it checked, and checking nothing exits non-zero: a target with no skill under it is a wrong target, and its silence is indistinguishable from a clean sweep.

How a review reads a target covering more than one skill is `workflows/review.md` Step 1's.

**`check-descriptions.js`** is the raw-line sweep. `ok` means the description is a block scalar (immune to every trap here), or a plain or quoted scalar carrying none of them. Everything else names its defect. `SKILL.md` owns the membership of the trap classes it tests, under "YAML eats the description at `#`"; what matters here is that neither class is loud. The silent class corrupts the triggers while the skill keeps working, and the parse-error class is swallowed by the harness, so the skill simply never appears in the listing.

**`check-differential.rb`** is the supplement for machines that have Ruby, whose standard library carries a real YAML parser: it parses the frontmatter and compares the parsed description against the raw line, where any difference means a trap fired. Skip it without concern where Ruby is absent, since the sweep covers the same ground heuristically. A YAML parser or linter alone cannot replace the sweep: the silent class is valid YAML, which is exactly its disguise, so a parser returns the corrupted value without complaint. That is a fact about what parsing can see rather than a reason to avoid a parser - the raw sweep and the parsed differential are two checks, and a real parser is the right way to do the second.

After editing either check, run `scripts/test-checks.sh`: it generates one fixture per known trap in a temp directory (never shipped as real `SKILL.md` files, which some agents discover recursively) and asserts the checks still catch every one, pass every good form, and fail on a target with no skill under it. It carries the argument shapes too - a package root, package roots side by side, and a directory of symlinks - and runs them against the node checks and the Ruby one alike, which catches the two copies of the discovery rule drifting apart on any machine that has Ruby. Where Ruby is absent the differential's assertions are skipped and the bench still passes, so there the copies are kept in step by whoever edits either.

## The name check

Every skill's frontmatter `name` must match its own directory, and the same target as above:

```bash
node scripts/check-names.js ~/.claude/skills
```

**It is a script rather than a loop written out here.** Shell written as prose carries quoting, word-splitting and glob hazards that nothing runs and nothing tests: a pipe swallows an exit code, an empty capture runs the body once on nothing, an unquoted expansion splits a name on its spaces and matches its brackets against the working directory. A script gets `scripts/test-checks.sh`, where each of those is a fixture.

Then, per skill. These are the mechanical faces of the authoring rules in `workflows/new.md`, which owns each rule and its reason; this list carries only what a sweep can look for:

- **`argument-hint` against the routing table.** Every advertised verb routes somewhere, and every route is advertised.
- **A `README.md` exists, and names how the skill is installed.** Both are sweepable: the file is there or it is not, and a grep for an install heading or command says whether a reader who wants the skill can get it.
- **Referenced files exist.** A router pointing at `workflows/foo.md` that was never written fails only when that path is taken, which may be months later.
- **Code blocks are Bash.** Shell-specific syntax from another shell (`set x (cmd)`, `; or`, `; and`) fails when an agent executes it.
- **Line lengths.** Body prose is one line per paragraph, unwrapped. Fenced code, tables and frontmatter keep their own structure.
- **Portable paths.** Nothing absolute to one machine's home directory; skill-relative or `~/`-relative instead.

## The invocation check

`disable-model-invocation` and `user-invocable` decide who may invoke a skill, and `workflows/new.md` owns what each does; this check is their mechanical face, over the same target:

```bash
node scripts/check-invocation.js ~/.claude/skills
```

A field present must be lowercase `true` or `false`, once and unquoted: `yes` and `True` are booleans in some parsers and strings in others, a quoted value is a string in every parser, and a duplicate key is the last-wins trap the description check reports. A field at a non-default value has to be matched by a description that says something about invocation, because another agent ignores the field silently and there the description is all that holds.

**What it cannot decide is whether the sentence it found matches the field.** It tells a description silent on invocation from one that speaks, and stops there; a description stating the wrong policy is the reviewer's to catch.

## The continuation check

`workflows/new.md` owns the rule on continuation paragraphs under a list item, and its reason; this check is its mechanical face. The target is the one *The description check* states, and every markdown file under a skill is read rather than its `SKILL.md` alone, since a rule about prose applies wherever the skill keeps prose:

```bash
node scripts/check-continuations.js ~/.claude/skills
```

**What it cannot decide is whether the item has a heading level free to be promoted to.** That is the judgement `workflows/new.md` leaves with the writer, so a report from this check names the item and the writer chooses between promoting it and unindenting it.

## Reporting

State what was checked, not just what failed. "10 skills checked, all descriptions intact" is a result; silence is not.

If a skill was edited to fix a finding, re-run the description check afterwards. Editing frontmatter is exactly how a quoted description loses its quotes.
