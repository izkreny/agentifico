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

Under roughly 2,000 words, one `SKILL.md` is right and splitting it is overhead. Measure size in words (`wc -w`) or tokens, never in lines: a line count depends on the author's wrapping style, and an unwrapped paragraph is one line where an 80-column author writes six.

Past that, split: `SKILL.md` keeps the frontmatter, the shared model and a routing table; each operation gets `workflows/<verb>.md`; long reference material gets `references/<topic>.md`. The router reads exactly one workflow and follows it inline, which keeps loaded context proportional to the task rather than to the skill.

Whatever every workflow depends on stays in `SKILL.md`, stated once. A fact copied into three workflow files will drift in at least one of them. When that shared layer itself grows enough to bloat `SKILL.md`, which costs context on every invocation, move the detail into one `references/` file and keep in `SKILL.md` the one-line version plus the pointer, with each workflow that needs the detail told to read it first. The cap is roughly 3,500 words: the spec states it as 5,000 loaded tokens, tokens run about three quarters of a word in English prose, and its companion 500-line figure assumes conventionally wrapped text.

State in `SKILL.md` that paths are relative to the skill's own directory, since a skill gets invoked from many working directories.

Whatever the size, ship a `README.md` for human readers. `SKILL.md` and everything it routes to address the agent; the README is what a person browsing the repository reads to decide whether to trust and install the skill. Say what the skill does, why it exists, and how it is invoked; a routing skill also lists every argument it accepts, a small table works, and a diagram of the argument-to-workflow map says the routing faster than prose. A skill without one is a review defect, not a style choice, at every size: the tiering that excuses a single-file skill from `workflows/` does not excuse the README.

## Step 4 - Write the body

- **Write what was verified, and say how.** A command's actual output beats a description of it.
- **Put a version next to the claim it qualifies, never as a banner at the top.** A banner ages into a lie because nothing updates it; a version attached to a specific behavioural claim tells the reader what to re-check and when.
- **One fact, one place.** Duplication between a global instructions file and a skill drifts, and the drifted copy is the one nobody is looking at. When a fact must appear twice, one copy owns it and every other copy points at it: a stale pointer fails loudly, since the heading it names is gone, while a stale copy fails silently, two truths disagreeing and both looking right.
- **Code blocks are Bash.** An agent executes a skill's commands through its shell tool, which is Bash; fish or zsh syntax in a skill fails at execution time, on the machine of whoever installed it.
- **Paths must survive any working directory and any machine.** Inside the skill, relative to the skill's own directory and say so; for user locations, `~/`-relative. A path absolute to the author's home directory breaks on every other machine.
- **No hard wrapping.** One line per paragraph, per list item, per blockquote. Fenced code, tables and frontmatter keep their line structure exactly.
- **Write sentences that survive change.** Never state a count of adjacent content and never claim uniqueness, recency or position ("the four rules below", "the only copy", "the section above"): whoever adds the fifth rule edits the list, never the sentence, and in a skill the false sentence is not read past but obeyed. The test: if adding one more item makes the sentence false, it was a count and it goes; if it makes the item wrong, it is a cap and it stays. When membership is the rule, name the members.
- Prefer a rule with its reason over a rule alone, but keep the reason to a sentence. A rule an agent understands survives a situation the rule did not anticipate.

## Step 5 - Verify before finishing

Run `workflows/check.md`. A new skill that never fires looks identical to a skill that was never written.

Confirm the skill appears in the session's skill listing with its **full** description. A listing that stops mid-sentence is the `#` trap, not a length limit.
