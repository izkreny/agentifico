> **Tools used:** `Write` to create the files, `Read` / `Glob` to check for an existing skill covering the same ground.

Author a new skill. The description facts in `SKILL.md` apply throughout and are not repeated here.

## Step 1 - Check nothing already covers it

Run from the skills directory of the agent in use:

```bash
ls
grep -rl "<topic>" */SKILL.md
```

If an existing skill is within one section of the new idea, extend it instead. Two skills that both half-cover a topic is worse than one that covers it, because the trigger phrases compete and whichever loads first wins.

A skill is worth writing when one of these happened: a multi-step workflow proved worth repeating, an error's working path was finally found, or the user corrected the approach and the correction generalises. A skill written before one of those is speculation about what will be needed.

## Step 2 - Write the frontmatter

| Field | Purpose |
|---|---|
| `name` | Must match the directory name exactly |
| `description` | The trigger surface. **Write it as a `\|` block scalar** (the trap family is in `SKILL.md`). Name the phrases the user actually says, not a summary of the topic |
| `argument-hint` | Shown in the slash-command UI, e.g. `"[view \| add \| submit]"`. Only advertise verbs that route somewhere |
| `allowed-tools` | Narrow it. `Bash(gh:*)` rather than bare `Bash` |
| `disable-model-invocation` | `true` means explicit invocation only, never auto-discovered. Use it for anything with side effects, and for reference material that would otherwise fire on unrelated work |

Write the description as trigger phrases plus a boundary. **Say what the skill is not for**: one boundary sentence prevents more misfires than another trigger phrase adds.

The format's authority is the [Agent Skills specification](https://agentskills.io/specification): `name` and `description` are its only required fields, `license`, `compatibility` and `metadata` are optional (quote metadata values, `version: "1.0"`, since a bare `1.0` parses as a float), and `allowed-tools` is in the spec but experimental. `argument-hint` and `disable-model-invocation` are Claude Code extensions that other agents silently ignore, so never let behaviour depend on them alone: a skill meant for explicit invocation only says so in its description too, because on an agent that ignores the flag the description is all that holds.

## Step 3 - Pick the layout

### Let size decide whether to split

Under roughly 2,000 words, one `SKILL.md` is right and splitting it is overhead. Measure size in words (`wc -w`) or tokens, never in lines: a line count depends on the author's wrapping style, and an unwrapped paragraph is one line where an 80-column author writes six.

Past that, split: `SKILL.md` keeps the frontmatter, the shared model and a routing table; each operation gets `workflows/<verb>.md`; long reference material gets `references/<topic>.md`. The router reads exactly one workflow and follows it inline, which keeps loaded context proportional to the task rather than to the skill.

### Keep the shared layer in `SKILL.md`, stated once

Whatever every workflow depends on belongs there, because a fact copied into three workflow files will drift in at least one of them. When that shared layer itself grows enough to bloat `SKILL.md`, which costs context on every invocation, move the detail into one `references/` file and keep in `SKILL.md` the one-line version plus the pointer, with each workflow that needs the detail told to read it first. The cap is roughly 3,500 words: the spec states it as 5,000 loaded tokens, tokens run about three quarters of a word in English prose, and its companion 500-line figure assumes conventionally wrapped text.

### State in `SKILL.md` that paths are relative to the skill's own directory

A skill gets invoked from many working directories, and nothing else tells the agent which one the paths are anchored to.

### Ship a `README.md` for human readers

`SKILL.md` and everything it routes to address the agent; the README is what a person browsing the repository reads to decide whether to trust and install the skill. A skill without one is a review defect, not a style choice, at every size: the tiering that excuses a single-file skill from `workflows/` does not excuse the README. It answers each of the following.

#### What the skill does

In the reader's terms rather than the agent's, and with its boundary, since the same sentence tells someone it is not the thing they were looking for.

#### Why it exists

The failure it prevents, stated concretely. A README that cannot name one usually belongs to a skill written before it was needed, which Step 1 is the test for.

#### How it is installed

The exact command, copyable. Required even for a skill that never leaves the machine it was written on, where it is the canonical path and the symlink rather than a manager command: a reader who cannot install it cannot use it.

#### How it is invoked

Whether it fires on its own or has to be typed, and for a routing skill every argument it accepts. A small table works, and a diagram of the argument-to-workflow map says the routing faster than prose.

## Step 4 - Write the body

### Write what was verified, and say how

A command's actual output beats a description of it.

### Put a version next to the claim it qualifies, never as a banner at the top

A banner ages into a lie because nothing updates it; a version attached to a specific behavioural claim tells the reader what to re-check and when.

### One fact, one place

Duplication between a global instructions file and a skill drifts, and the drifted copy is the one nobody is looking at. When a fact must appear twice, one copy owns it and every other copy points at it: a stale pointer fails loudly, since the heading it names is gone, while a stale copy fails silently, two truths disagreeing and both looking right.

### Code blocks are Bash

An agent executes a skill's commands through its shell tool, which is Bash; fish or zsh syntax in a skill fails at execution time, on the machine of whoever installed it.

### A payload that spans a line, or carries a backtick or a `#`, travels in a file, never in a shell string

Write it to a file and pass the path - `--body-file <file>`, `-F body=@<file>` - because those are the characters shell quoting mangles: a `'` in the prose ends a single-quoted string, a backtick inside double quotes executes, and a `#` opens a comment wherever the quoting slips, so the payload lands mangled, as posted, under the owner's name. The test is the payload's own text in the skill rather than where it is going: a one-line title, a label or a date gains nothing from a file, and a quoted span that breaks a line or carries either character is over the line whatever it is bound to.

### Paths must survive any working directory and any machine

Inside the skill, relative to the skill's own directory and say so; for user locations, `~/`-relative. A path absolute to the author's home directory breaks on every other machine.

### No hard wrapping

One line per paragraph, per list item, per blockquote. Fenced code, tables and frontmatter keep their line structure exactly.

### One continuation paragraph per list item, and it carries the item's reason

Markdown requires the indent, so a stack of paragraphs under a bullet renders correctly and reads as deliberate while what it records is a section that was written as a list item and never promoted - nothing else signals the mistake. Giving every rule its reason in a sentence is the one thing a bullet legitimately has more to say, so a second paragraph is a second claim, and a claim that is not the item's reason has stopped continuing the item.

**A continuation that opens with a bolded lead-in is over the cap whatever its count**, because a bolded lead announces a claim the way a heading does rather than continuing one.

**Promote what has outgrown its item, and where no heading level is free, unindent instead.** A continuation inside an already-`###` numbered item has nowhere deeper to go, so the move that always exists is to drop the indent: the item's bolded lead becomes a paragraph of its own and its continuations become the paragraphs beneath it.

### Write sentences that survive change

Never state a count of adjacent content and never claim uniqueness, recency or position ("the four rules below", "the only copy", "the section above"): whoever adds the fifth rule edits the list, never the sentence, and in a skill the false sentence is not read past but obeyed. The test: if adding one more item makes the sentence false, it was a count and it goes; if it makes the item wrong, it is a cap and it stays. When membership is the rule, name the members.

### Cut every paragraph to its one new claim

A sentence that re-explains a rule already stated, or restates the same point in different words, is over-writing: it costs context on every load and buries the claim that was doing the work. When a paragraph reads as a short essay, name what is new in it and delete the rest.

### Never write the file's own history

"This reverses an earlier rule", "the older test was wrong", "it does not stop it any more": the reader cannot locate the past being described, and in a file read as instructions a claim about a rule that no longer exists reads as a rule about the present. If the history was justifying a live rule, state the durable reason instead, so "we used to cap the watch at an hour" becomes "a timeout short enough to stop a forgotten watch cannot span a review round". If it is the skill's premise, keep the concrete failure as the bad example it always was. Otherwise delete it.

### Give every rule its reason, in a sentence

A rule an agent understands survives a situation the rule did not anticipate; a reason longer than a sentence is the essay this step already forbids.

## Step 5 - Verify before finishing

Run `workflows/check.md`. A new skill that never fires looks identical to a skill that was never written.

Confirm the skill appears in the session's skill listing with its **full** description. A listing that stops mid-sentence is the `#` trap, not a length limit.
