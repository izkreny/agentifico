> **Tools used:** `Bash(node:*)` and, where present, `Bash(ruby:*)` for the frontmatter checks in `scripts/`, `Bash(bash:*)` for their regression bench, `Glob` to enumerate skills.

The mechanical audit. Run it after writing or editing any skill, and before reviewing one. The checks take their target as an argument; the shell loop under "The rest" runs from the skills directory of the agent in use (for Claude Code, `~/.claude/skills`).

## The description check

This is the one that matters, because its failure modes are silent twice over: a truncated description keeps loading with fewer triggers, and a frontmatter parse error makes the skill vanish from the listing with no complaint. Every trap it tests was watched failing in a real YAML parser before it earned its place; `scripts/test-checks.sh` re-runs that evidence on demand.

The checks live as files under this skill's `scripts/`. Their argument is either a directory of skills or one skill's own directory, and defaults to the current directory:

```bash
node scripts/check-descriptions.js ~/.claude/skills
command -v ruby >/dev/null && ruby scripts/check-differential.rb ~/.claude/skills
```

Each run ends with a count of what it checked, and checking nothing exits non-zero: a target with no skill under it is a wrong target, and its silence is indistinguishable from a clean sweep.

**`check-descriptions.js`** is the raw-line sweep. `ok` means the description is a block scalar (immune to every trap here), or a plain or quoted scalar carrying none of them. Everything else names its defect. `SKILL.md` owns the membership of the trap classes it tests, under "YAML eats the description at `#`"; what matters here is that neither class is loud. The silent class corrupts the triggers while the skill keeps working, and the parse-error class is swallowed by the harness, so the skill simply never appears in the listing.

**`check-differential.rb`** is the supplement for machines that have Ruby, whose standard library carries a real YAML parser: it parses the frontmatter and compares the parsed description against the raw line, where any difference means a trap fired. Skip it without concern where Ruby is absent, since the sweep covers the same ground heuristically. A YAML parser or linter alone cannot replace the sweep: the silent class is valid YAML, which is exactly its disguise, so a parser returns the corrupted value without complaint. Do not bundle a YAML library or a compiled helper to close that gap: vendored parser code is exactly the unreviewable bulk the security notes in `references/managing.md` warn about, and the differential needs nothing beyond a stdlib.

After editing either check, run `scripts/test-checks.sh`: it generates one fixture per known trap in a temp directory (never shipped as real `SKILL.md` files, which some agents discover recursively) and asserts the checks still catch every one, pass every good form, and fail on a target with no skill under it.

## The rest

```bash
for d in */; do
  n=$(basename "$d")
  grep -q "^name: $n$" "$d/SKILL.md" || echo "$n: name does not match directory"
done
```

Then, per skill. These are the mechanical faces of the authoring rules in `workflows/new.md`, which owns each rule and its reason; this list carries only what a sweep can look for:

- **`argument-hint` against the routing table.** Every advertised verb routes somewhere, and every route is advertised.
- **A `README.md` exists, and names how the skill is installed.** Both are sweepable: the file is there or it is not, and a grep for an install heading or command says whether a reader who wants the skill can get it.
- **Referenced files exist.** A router pointing at `workflows/foo.md` that was never written fails only when that path is taken, which may be months later.
- **Code blocks are Bash.** Shell-specific syntax from another shell (`set x (cmd)`, `; or`, `; and`) fails when an agent executes it.
- **Line lengths.** Body prose is one line per paragraph, unwrapped. Fenced code, tables and frontmatter keep their own structure.
- **Portable paths.** Nothing absolute to one machine's home directory; skill-relative or `~/`-relative instead.

## Reporting

State what was checked, not just what failed. "10 skills checked, all descriptions intact" is a result; silence is not.

If a skill was edited to fix a finding, re-run the description check afterwards. Editing frontmatter is exactly how a quoted description loses its quotes.
