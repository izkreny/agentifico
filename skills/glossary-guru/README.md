> 🤖 Written by AI --- read/modified by izkreny! 🤓

# glossary-guru

Keeps a project's domain vocabulary in one glossary file and holds an agent to it. It defines the file's format, has the agent read it before writing names or prose in that domain, has it challenge a word the file rules out, and changes an entry only on your decision. It is not for a skill's own terms, for architecture decision records, or for general programming vocabulary.

## Why it exists

A project's vocabulary usually has no file an agent is told to read, so every branch copies whatever word it last saw and one concept ends up with several names. Nothing then says which word is right when two compete, and the drift spreads through code, specs and docs until a rename costs hundreds of lines.

## Install

```bash
npx skills add izkreny/agentifico -g -y -s glossary-guru
```

That is the [skills CLI](https://skills.sh).

## Invocation

The skill fires on its own in a project that holds a glossary, and when a task defines a term, settles what a word means or renames a domain concept. You can also type `/glossary-guru`. There is no argument to pass.

## Sources

Adapted from these sources, keeping only the glossary half of each. Each is MIT licensed, and its licence is reproduced under `assets/`.

| Source | What it gave | Licence |
| --- | --- | --- |
| [mattpocock/skills, `domain-modeling`](https://github.com/mattpocock/skills/tree/main/skills/engineering/domain-modeling) | The entry format, `_Avoid_`, creating the file only when a term is settled, and challenging a word as it is used | [assets/LICENSE-mattpocock-skills.txt](assets/LICENSE-mattpocock-skills.txt) |
| [EveryInc/compound-engineering-plugin, the vocabulary rules](https://github.com/EveryInc/compound-engineering-plugin/blob/main/skills/ce-compound/references/concepts-vocabulary.md) | The rule that an entry stands on its own, `## Relationships`, `## Flagged ambiguities`, `## Retired`, and folding a term into the entry that carries its meaning | [assets/LICENSE-compound-engineering-plugin.txt](assets/LICENSE-compound-engineering-plugin.txt) |
