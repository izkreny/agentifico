# gh-solo, in this repository

Per-repository facts the gh-solo plugin reads. Write down only what differs from its defaults, or what it refuses to guess.

## Settings

Every key the plugin reads goes in this one block, as a JSON object. The plugin's repo-config reference, in its pr-flow skill, names each key and the default it falls back to, so an empty block means every default applies.

```json
{}
```

The label taxonomy is left out on purpose. The `mandatory_axis` key records it once the labels are settled, and the tracker offers to write it then.

## Check commands

The commands that prove a change works here, each with when it runs. The implement skill runs nothing it does not find here or in the repository's own agent instructions, so a repository that lists none gets no gates.
