---
name: skills-maker
description: |
  Write, review, maintain and export agent skills. Covers the frontmatter contract, the traps that fail silently, the routing-skill layout, installing and updating skills, and publishing a local skill for others. Explicit invocation only: type `/skills-maker`.
argument-hint: "[new <name> | review <path> | check | export <path>]"
disable-model-invocation: true
compatibility: Requires Node for the frontmatter checks. Ruby (optional) adds the differential check; the gh CLI is needed only for export.
metadata:
  version: "1.1.0"
allowed-tools: Bash(gh:*), Bash(node:*), Bash(ruby:*), Bash(bash:*), Bash(skills:*), Bash(npx skills:*), Read, Write, Edit, Grep, Glob
---

> **Tools used:** `Read` / `Grep` / `Glob` to inspect existing skills, `Write` / `Edit` to author them, `Bash(node:*)` / `Bash(ruby:*)` for the frontmatter checks in `scripts/`, `Bash(bash:*)` for their regression bench, `Bash(skills:*)` / `Bash(npx skills:*)` for install and updates, `Bash(gh:*)` for repository visibility during export.

The user invoked this skill with the argument: **`$ARGUMENTS`**

This is a **routing skill**. Read `$ARGUMENTS` and the conversation context, pick exactly one workflow, read that workflow file, and follow its instructions inline.

All paths below are **relative to this skill's own directory**. Resolve them against wherever this skill is installed rather than assuming a location.

## Where skills live

Keep one canonical copy in an agent-neutral location such as `~/.agents/skills/<name>/`, and symlink each agent's skills directory to it as needed: one file then serves every agent, and no copy drifts. Each agent reads its own directory; Claude Code, for example, reads `~/.claude/skills/<name>/SKILL.md`. When a workflow below says "the skills directory", resolve it for the agent in use.

## The facts every workflow here depends on

### The description is the whole trigger surface

**Only the frontmatter is read before a skill loads.** As far as discovery is concerned the body does not exist, so every phrase that should cause the skill to fire has to appear in `description:`. A trigger documented only in the body will never fire, because nothing reads the body until something has already decided to load it.

The corollary matters when refactoring: moving a rule out of a global instructions file and into a skill only works if whatever made an agent reach for it survives in the description. Otherwise the rule is unreachable rather than relocated.

### YAML eats the description at `#`

**In an unquoted YAML scalar, a space followed by `#` starts a comment.** Everything after it is discarded with no parse error, no warning, and a skill that still loads and still works. The only symptom is triggers that never fire.

```yaml
description: Use when asked to review PR #N, or check what needs review.
```

Everything from ` #N` onward is gone. Backticks do not protect against it: a description containing `` `#123` `` survives only because the character before the `#` is a backtick rather than a space, which is luck, not correctness.

**Write the description as a block scalar.** It has no comment, anchor, tag or escape processing, so it is immune to this trap and to every relative of it:

```yaml
description: |
    Use when asked to review PR #N, or check what needs review.
```

Quoting also survives ` #`, but every quote style carries its own trap: inside `"..."` a backslash or an unescaped inner `"` is a parse error, inside `'...'` an apostrophe must be doubled, and curly “smart” quotes are not quotes at all, so a description that merely looks quoted still truncates. The family goes further, all verified against a real parser: a leading `&` or `!` silently eats the first word, a duplicate `description:` key silently discards the first value, a bare `yes` becomes a boolean in some parsers, and a stray `:` or a leading `*`, `[`, `{`, `%` or `@` is a parse error. A parse error is not loud in practice: the harness swallows it and the skill simply vanishes from the listing. `workflows/check.md` tests for all of these.

Then avoid ` #` in the prose anyway. Write "a numbered PR" rather than "PR #N", so the text stays safe under any later edit that changes the form.

---

## Routing

Based on the argument above, do exactly one of the following:

- If it starts with `new` → read `workflows/new.md` and follow it.
- If it starts with `review` → read `workflows/review.md` and follow it.
- If it starts with `check`, or is empty → read `workflows/check.md` and follow it.
- If it starts with `export` → read `workflows/export.md` and follow it.
- If the request is about installing, pinning or updating a skill someone else wrote → read `references/managing.md`.

## Supporting files

- **`workflows/new.md`** - authoring a skill from scratch: frontmatter, layout, content rules
- **`workflows/review.md`** - reviewing an existing skill against the defects that actually occur
- **`workflows/check.md`** - the mechanical audit across every installed skill
- **`workflows/export.md`** - publishing a local skill to a shared repository
- **`references/managing.md`** - installing and updating skills, and why not to hand-edit an installed one
- **`scripts/`** - the frontmatter checks as runnable files, plus `test-checks.sh`, the trap-fixture bench that re-verifies them after any edit
