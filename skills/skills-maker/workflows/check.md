> **Tools used:** `Bash(node:*)` and, where present, `Bash(ruby:*)` for the frontmatter checks in `scripts/`, `Bash(bash:*)` for their regression bench, `Glob` to enumerate skills.

The mechanical audit. Run it after writing or editing any skill, and before reviewing one. Every command runs from the skills directory of the agent in use (for Claude Code, `~/.claude/skills`).

## The description check

This is the one that matters, because its failure modes are silent twice over: a truncated description keeps loading with fewer triggers, and a frontmatter parse error makes the skill vanish from the listing with no complaint. Every trap it tests was watched failing in a real YAML parser before it earned its place; `scripts/test-checks.sh` re-runs that evidence on demand.

The checks live as files under this skill's `scripts/` and take the skills directory as their argument (defaulting to the current directory):

```bash
node <this-skill>/scripts/check-descriptions.js ~/.claude/skills
command -v ruby >/dev/null && ruby <this-skill>/scripts/check-differential.rb ~/.claude/skills
```

**`check-descriptions.js`** is the raw-line sweep. `ok` means the description is a block scalar (immune to every trap here), or a plain or quoted scalar carrying none of them. Everything else names its defect. The silent class corrupts the triggers while the skill keeps working: truncation at ` #`, a leading `&` or `!` eating the first word, curly quotes that only look like quotes, a duplicate key discarding the first value, a bare `yes` turning boolean. The parse-error class (stray colons, unescaped inner quotes, odd apostrophes, bad escapes) is not loud in practice either: the harness swallows the error and the skill simply never appears.

**`check-differential.rb`** is the supplement for machines that have Ruby, whose standard library carries a real YAML parser: it parses the frontmatter and compares the parsed description against the raw line, where any difference means a trap fired. Skip it without concern where Ruby is absent, since the sweep covers the same ground heuristically. A YAML parser or linter alone cannot replace the sweep: the silent class is valid YAML, which is exactly its disguise, so a parser returns the corrupted value without complaint. Do not bundle a YAML library or a compiled helper to close that gap: vendored parser code is exactly the unreviewable bulk the security notes in `references/managing.md` warn about, and the differential needs nothing beyond a stdlib.

After editing either check, run `scripts/test-checks.sh`: it generates one fixture per known trap in a temp directory (never shipped as real `SKILL.md` files, which some agents discover recursively) and asserts both checks still catch every one.

## The rest

```bash
for d in */; do
  n=$(basename "$d")
  grep -q "^name: $n$" "$d/SKILL.md" || echo "$n: name does not match directory"
done
```

Then, per skill. These are the mechanical faces of the authoring rules in `workflows/new.md`, which owns each rule and its reason; this list carries only what a sweep can look for:

- **`argument-hint` against the routing table.** Every advertised verb routes somewhere, and every route is advertised.
- **Referenced files exist.** A router pointing at `workflows/foo.md` that was never written fails only when that path is taken, which may be months later.
- **Code blocks are Bash.** Shell-specific syntax from another shell (`set x (cmd)`, `; or`, `; and`) fails when an agent executes it.
- **Line lengths.** Body prose is one line per paragraph, unwrapped. Fenced code, tables and frontmatter keep their own structure.
- **Portable paths.** Nothing absolute to one machine's home directory; skill-relative or `~/`-relative instead.

## Reporting

State what was checked, not just what failed. "10 skills checked, all descriptions intact" is a result; silence is not.

If a skill was edited to fix a finding, re-run the description check afterwards. Editing frontmatter is exactly how a quoted description loses its quotes.
