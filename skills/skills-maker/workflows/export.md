> **Tools used:** `Read` / `Grep` to audit the skill, `Write` to produce the exported copy, `Bash(gh:*)` for repository visibility.

Publish a local skill to a shared repository so others can install it. A skill written for one machine accumulates facts about that machine; exporting is the pass that separates the portable knowledge from the local residue.

## Step 1 - Decide which copy is canonical

The workable shapes, and the choice changes everything downstream:

- **The repository becomes canonical.** Reinstall locally through the skill manager afterwards, like any third-party skill. Cleanest single source, but the local copy becomes manager-owned: hand-editing it is then forbidden by its own rules, so every machine-specific fact must move out **before** the reinstall clobbers it.
- **The local copy stays canonical.** The repository gets a declared snapshot, refreshed when it is worth it. Keeps local facts in place, but two copies drift; mitigate with a one-line pointer in each naming the other.

Name the choice to the owner and get it confirmed before writing anything.

## Step 2 - Check where it is going

On GitHub:

```bash
gh repo view <owner/repo> --json visibility
```

On another forge, use its own CLI or API; and when no tool is at hand, open the repository page in a logged-out browser, since what it shows there, it shows everyone. The `gh` CLI is this skill's export-only dependency, declared in the frontmatter `compatibility` field.

A public repository permanently publishes everything in the skill. Strip anything that helps someone target or impersonate the origin machine: absolute paths under the author's home directory, inventories of installed tooling and their sources, permission and guardrail configuration.

## Step 3 - Generalise the content

- **Paths.** Home-absolute paths become skill-relative ("relative to this skill's own directory", stated in `SKILL.md`) or `~/`-relative for user locations. A path absolute to the author's home breaks on every other machine and identifies it.
- **The owner's global instructions file.** References to a specific AGENTS.md or CLAUDE.md become "the user's global instructions file". The skill may practice its author's conventions; it must not require them.
- **Facts true on one machine only.** Which manager owns which skill, where a lock file sits, how a tool was installed there: these move to the machine's own notes (a knowledge base, the local instructions file) before export, not into the shared copy.
- **Tool enumerations.** Name the one tool the skill actually supports rather than surveying alternatives; the survey is stale the day a new tool ships, and the skill's job is a working path, not a market overview.
- **Brand independence.** Write rules for agents in general, not for one vendor's harness. Where a fact is genuinely harness-specific (a CLI command, a marketplace, a skills directory, a model name), keep it but mark whose it is and phrase the rule so another harness substitutes its own equivalent.

## Step 4 - Make the code blocks Bash

The rule and its reason are in `workflows/new.md` ("Code blocks are Bash"), and the check in Step 5 hunts the leftover signatures. What export adds: a local skill may legitimately carry its author's interactive shell, so convert every block and re-test each converted command, since a translation that was never run is a guess with a shebang.

## Step 5 - Verify the exported copy

Run `workflows/check.md` against the exported directory: description intact and free of the frontmatter traps, name matches the directory, every advertised verb routes, every referenced file exists, no machine-absolute paths left. If the skill carries `metadata.version`, bump it in this same pass whenever the content changed; a version that does not move with the content is the banner lie in frontmatter form. Then grep the copy for the author's username and home directory as a final sweep; zero hits is the exit criterion, with one exception: `README.md` may name the destination repository in its install command and carry the author's byline, since both are public the moment the repository is.

## Step 6 - Hand over, then close the loop

Committing and pushing to a public repository is the owner's act; stage the copy and show the diff rather than pushing. After it lands and, in the repository-canonical shape, after the local reinstall: update whatever local records claimed the skill had no upstream, and re-run the check across the skills directory so the swap is verified rather than assumed.
