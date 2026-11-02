> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Move the glossary to a JSON source

Issue #402 holds the acceptance criteria. This plan says how.

## Approach

The script keeps its name and every config path it has today. Only its input changes: a JSON file replaces the Markdown parser, and a second output, the generated `<repo-root>/GLOSSARY.md`, joins the rule.

## The format

The top level holds `project`, `summary` and `terms`, each required, and `flagged_ambiguities`, which is optional. An entry holds `term` and `definition`, each required, and `avoid` and `except`, each optional. No other key is allowed at either level.

Decisions the issue left to the plan:

1. **`project` and `summary` are required.** The generated file opens with them, so a missing one would render as a hole.
2. **An empty `terms` list is refused.** The skill already says a glossary never exists without a settled term.
3. **A repeated key is refused like a misspelled one.** Python's JSON reader keeps the last copy silently, so a second `avoid` in one entry would lose every word in the first.
4. **`project`, `summary`, `term`, `definition` and each flagged ambiguity are non-empty and one line.** A line break in a definition could forge a heading in the generated file.
5. **A word with space at either end is refused.** The Markdown parser stripped that space, and JSON keeps it, so `" client"` would become a swap key that never matches where the word opens a line.
6. **An empty `avoid` or `except` list is allowed**, and renders nothing.
7. **Unreadable bytes keep their exit `2`.** A file that is not UTF-8 is the existing "cannot read" stop. Only text that fails to parse as JSON is the new exit `1`.

## The generated file

`<repo-root>/GLOSSARY.md` sits beside the source. It opens with one HTML comment saying it is generated and naming the command, and that opening is what marks a file as the script's own. Then come `# {project}`, the summary, `## Language` with each entry, and `## Flagged ambiguities` where there are any. Those section names stay, since the skill already documents them and the issue does not drop them. Entries keep the source's order, so a run is byte-identical without sorting.

## Every refusal comes before every write

The rule's marker check sits right before its write today. With two outputs, both marker checks run before either file is written, so a refused `<repo-root>/GLOSSARY.md` leaves no fresh rule behind.

## What stays as it is

`build_swap`, `holds_drift`, `idle_exceptions`, `terms_holding_drift`, `render` and all the config handling stay, apart from the marker names in their messages. `skills/glossary-guru/assets/vale.ini.template` keeps its `[**/GLOSSARY.md]` section, which already keeps the rule off the generated file, so only its comments change. The repository-level files stay out of the diff: `.agents/gh-solo.md` names the script and the template by path, and the root `README.md` row still reads true.

## Steps

- Replace the parser in `skills/glossary-guru/scripts/glossary-rule.py` with a JSON loader and validator, add the Markdown renderer, point the search at `<repo-root>/docs/GLOSSARY.json` then `<repo-root>/GLOSSARY.json`, and move both marker checks ahead of all writes
- Move `skills/glossary-guru/scripts/test-glossary-rule.sh` to JSON fixtures: drop the parser cases (marker near-misses, plain prose, code fences, heading variants, flagged list lines, retired sections), carry over the config, Vale, exception, sharp-s and second-run cases, and add one case per new criterion, with `expect_refusal` also asserting no `<repo-root>/GLOSSARY.md` was written
- Rewrite the affected sections of `skills/glossary-guru/SKILL.md` and its description, and move `metadata.version` to `2.0.0`
- Update `skills/glossary-guru/README.md` and the comments in `skills/glossary-guru/assets/vale.ini.template`

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `node skills/agents-guru/scripts/check.js skills/glossary-guru`
- `bash skills/glossary-guru/scripts/test-glossary-rule.sh`
- `! git grep -nE '::AVOID::|::EXCEPT::' -- skills/glossary-guru`

Each new refusal case is watched failing once, by removing its check, before its pass is trusted. These gates cannot see whether the generated file reads well, which is the owner's call on a rendered copy.

## Open questions

None.
