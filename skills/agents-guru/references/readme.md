# What a skill's README owes its reader

Read this when writing or reviewing a skill's `README.md`.

`SKILL.md` and everything it routes to address the agent; the README is what a person browsing the repository reads to decide whether to trust and install the skill. A skill without one is a review defect, not a style choice, at every size: the tiering that excuses a single-file skill from `workflows/` does not excuse the README.

## What it answers

### What the skill does

In the reader's terms rather than the agent's, and with its boundary, since the same sentence tells someone it is not the thing they were looking for.

### Why it exists

The failure it prevents, stated concretely. A README that cannot name one usually belongs to a skill written before it was needed, which Step 1 of `workflows/new.md` is the test for.

### How it is installed

The exact command, copyable. Required even for a skill that never leaves the machine it was written on, where it is the canonical path and the symlink rather than a manager command: a reader who cannot install it cannot use it.

Give the section a heading opening with `install`, `installation`, `setup` or `getting started`, or put the command in a fenced block: `skills add`, `npm install`, `npm ci`, `mise use`, `claude plugin install`, `git clone` or `ln -s`.

A form this list does not name goes under such a heading, which passes whatever the command is. Report the missing form to this skill's maintainers rather than adding it to an installed copy, which `references/managing.md` forbids editing.

### How it is invoked

Whether it fires on its own or has to be typed, and for a routing skill every argument it accepts. A small table works, and a diagram of the argument-to-workflow map says the routing faster than prose.

### What inspired it

Required when the skill draws on an outside source, under a heading reading `## Inspiration` or `## Sources`, with one entry per source: its link, then what the skill took from it. A reader can then go to the original, and judge how much of it survived here.

A source on a git host is linked at the commit that was read, because `main` moves and a later version could not be compared against what the skill took. Record that commit at the moment of reading, because it cannot be recovered with certainty afterwards.

## When it links a file

A README links a file it sends the reader to open, because the reader is on the rendered page, where a link is one click and a backticked path is a search.

A plain mention, such as a row of a file table, stays in backticks, because on that page a link says to go somewhere and a mention sends the reader nowhere.

A link to a file never leaves the README's own folder, because a link out of it breaks once the skill is installed alone.
