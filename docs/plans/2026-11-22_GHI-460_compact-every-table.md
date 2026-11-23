> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Compact every table in gh-solo

Issue #460 holds the acceptance criteria. This plan says how.

## Approach

A compact table has one space each side of a cell's content and `| --- |` delimiters. An alignment colon stays where it is, as `| :--- |`. An empty cell becomes two spaces.

Six tables stay padded, because the plugin prints them to the console:

- the tables in `plugins/gh-solo/skills/pr-flow/workflows/help.md` and `plugins/gh-solo/skills/tracker/workflows/help.md`
- the two `text`-fenced tables in `plugins/gh-solo/skills/tracker/workflows/create.md`
- the `text`-fenced table in `plugins/gh-solo/skills/tracker/workflows/search.md`
- the `text`-fenced table in `plugins/gh-solo/skills/tracker/workflows/validate.md`

Every other padded table is read as a file, so it becomes compact. That includes the fenced table in `plugins/gh-solo/skills/pr-flow/workflows/resolve.md`: it is a comment template posted to GitHub, not printed, so AC2 does not cover it. Its rows are already compact, and only its delimiter changes.

Each table is converted by a scratchpad script that takes one file and one line, and rewrites that one table. One call per table keeps each edit legible. The script splits a row on unescaped pipes and strips only the padding at each cell's edges, so no cell's content can change. No script in the plugin parses a table out of a plugin file, so no bench is owed.

The version moves from 5.2.11 to 5.2.12, a patch, as a stacked branch does. The commit type is `docs`: no behaviour changes.

## Steps

- ::S1:: Compact each padded table read as a file under `plugins/gh-solo/`, one table per script call, leaving the six console tables byte for byte
- ::S2:: Compact the delimiter of the posted table in `plugins/gh-solo/skills/pr-flow/workflows/resolve.md`
- ::S3:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` from 5.2.11 to 5.2.12

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-22_GHI-460_compact-every-table.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `git diff -w -I '^[[:space:]]*[|][-:| ]*[|][[:space:]]*$' --exit-code fix/GHI-311_ask-on-a-trunk-resolving-push...HEAD -- plugins/gh-solo ':!plugins/gh-solo/.claude-plugin/plugin.json'` exits 0, so the only changes are whitespace and delimiter rows. It is watched failing on a cell altered by one letter.

No gate decides which tables the plugin prints. That call is the list in *Approach*, and a reviewer judges it. V6 cannot see a delimiter row that lost a column. A scratchpad inventory of every table, run before and after, is what shows each file table compact and the six console tables unchanged.

## Open questions

None.

## Settled

- ::Q1:: Do the tables the plugin prints stay padded? No: the owner settled on #482 that every markdown table is compact, printed or in a file, so the six console tables are compacted too and *Console output* loses its padding clause in both skill files.
