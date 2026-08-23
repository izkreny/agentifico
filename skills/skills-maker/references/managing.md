# Installing, updating and removing skills

The manager is the `skills` CLI ([skills.sh](https://skills.sh), `vercel-labs/skills`). The commands below use `npx`, the invocation skills.sh itself documents, which needs no install; when the CLI is installed as a real command (for example through mise's npm backend), drop the `npx`.

```bash
npx skills add <owner/repo> -l                          # list what a repo offers, installs nothing
npx skills add <owner/repo> -g -y -s <name> -s <name>   # global, non-interactive, named skills only
npx skills list
npx skills update
npx skills remove <name> -g
```

- `-s` selects skills by name and must be repeated per name; a comma-separated list matches nothing. Without `-s` the whole repository lands.
- `-g` targets global (user) scope, `-y` skips confirmation prompts. Both are what non-interactive agent use needs.
- Installs are tracked in a lock file at `~/.local/state/skills/.skill-lock.json`, one `skillFolderHash` per skill, outside any repository.
- On an interactive first run the CLI offers to install its own `find-skills` discovery skill; that is the CLI's offer, not something the repository being installed asked for. Declining once records the dismissal in the lock.

## Security

Installing a skill is installing instructions an agent will follow with all of its permissions; treat it like installing software, because it is. Review what actually arrived on disk before first use, and install from an exact `owner/repo` already trusted rather than from search results: registry popularity metrics belong to the repository, not to the skill inside it. `npx` adds its own surface, fetching and running the latest published CLI on every invocation; pin it as `npx skills@<version>` when that matters.

## One manager per skill

Whichever tool installed a skill owns it: it alone updates it, and it alone records where it came from. A second manager laid over the same directory leaves two provenance records, and whichever ran second owns the file while the other record goes stale silently. Skills the manager did not install appear to it as unmanaged and will never update; that is correct behaviour, not a bug to fix by force-adopting them.

## Do not hand-edit an installed skill

The lock records a hash of what was installed. Editing the file in place makes that hash stop matching upstream, and the next update either clobbers the edit silently or conflicts. Fix it in the source repository and reinstall. Hand-written skills are not in the lock and are yours to edit freely.

## Versions

There is no documented pin syntax; installs track the source repository's default branch. Before trusting that a repository's release tag says anything about the skill inside it, check what upstream actually tags: projects that ship a skill alongside a binary usually tag the binary, and the skill carries its own independent version, so "matching" the two numbers can fetch an older manual rather than a matched one. When a skill documents a versioned tool, verify unfamiliar flags against the tool's own `--help` rather than against version arithmetic.
