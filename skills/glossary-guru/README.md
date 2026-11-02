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

## Automatic rule check

`scripts/glossary-rule.py` writes a Vale rule from the glossary, so a project's Vale run flags a drifted word in its prose and code comments. It needs Python to generate the rule and [Vale](https://vale.sh) to run it. It takes no argument, and it writes a `<repo-root>/.vale.ini` for a project that has no Vale config. The check supports Latin script only.

The script only writes the rule. Run the check itself from the project's root, on your machine or in CI, which needs Vale and the committed rule and neither this skill nor Python:

```bash
vale .
```

A drifted word is a warning, which leaves the run at exit 0. To make it fail, add `Glossary.Terms = error`, as the comments in `assets/vale.ini.template` explain.

## Sources

Adapted from these sources, keeping only the glossary half of each. Each is MIT licensed, and its licence is reproduced under `assets/`. Each link is pinned to the upstream commit this skill was adapted from, so a later version can be compared against it.

| Source | What it gave | Licence |
| --- | --- | --- |
| mattpocock/skills _[domain-modeling](https://github.com/mattpocock/skills/tree/d80fa0f4ebe0c5714af0adf8670336065233ecc6/skills/engineering/domain-modeling)_ | An entry's definition and `_Avoid_` lines, creating the file only when a term is settled, and challenging a word as it is used | [MIT](assets/LICENSE-mattpocock-skills.txt) |
| EveryInc/compound-engineering-plugin, [the vocabulary rules](https://github.com/EveryInc/compound-engineering-plugin/blob/c4a643b1e4b87507782293367e7f3110daceea16/skills/ce-compound/references/concepts-vocabulary.md) | An entry's `###` heading, the rule that an entry stands on its own, `## Flagged ambiguities`, and folding a term into the entry that carries its meaning | [MIT](assets/LICENSE-compound-engineering-plugin.txt) |
