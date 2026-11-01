> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Add the glossary-guru skill

Issue [#296](https://github.com/izkreny/agentifico/issues/296), the bottom child of epic [#295](https://github.com/izkreny/agentifico/issues/295). This branch adds a standalone skill that owns a project's `<repo-root>/GLOSSARY.md`: the file's format, when an agent reads it, when it challenges a word, and how a term changes.

The owner named the package `glossary-guru` when starting this branch. The issue's title and paths now say so, and the label moved with it.

## Shape of the skill

The skill stays under the 2,000 words `skills/agents-guru/workflows/new.md` sets for one file, so it is a single `skills/glossary-guru/SKILL.md` (new) with no workflows directory. It has no scripts on this branch, because the Vale rule generator is [#297](https://github.com/izkreny/agentifico/issues/297)'s work.

The agent must be able to load it by itself, since a glossary only helps if it is read before a word is written. So the description names the moments that matter, and the frontmatter sets no `disable-model-invocation`. The boundary sentence excludes ADRs and a skill's own terms.

The format comes from the two sources the issue names. The entry shape, `_Avoid_`, `## Relationships`, `## Flagged ambiguities`, lazy creation and challenging a word come from `domain-modeling`. The rule that an entry stands on its own, `## Retired` and folding a term come from the compound-engineering plugin's vocabulary rules. What the issue leaves out stays out.

Three decisions the issue leaves open:

- An existing glossary stays where it is, even if a docs directory arrives later. The placement rule decides where a new file goes, and moving a file would break every link to it.
- A term no other word competes with has no `_Avoid_:` line, because an empty line names nothing and an invented word would be false.
- Both licence texts are vendored under `skills/glossary-guru/assets/` (new), as `skills/action-policy-guru/assets/LICENSE-upstream.txt` does, because MIT requires the notice to travel with a substantial adaptation.

## Steps

- Write `skills/glossary-guru/SKILL.md` (new) with `metadata.version` at `"1.0.0"`, and `skills/glossary-guru/README.md` (new) in the form `skills/review-text/README.md` uses.
- Vendor `skills/glossary-guru/assets/LICENSE-mattpocock-skills.txt` (new) and `skills/glossary-guru/assets/LICENSE-compound-engineering-plugin.txt` (new), each verbatim from its upstream repository, and credit both sources in the README.
- Run `node skills/agents-guru/scripts/check.js skills/glossary-guru` to exit zero. Watch it fail first on a trapped copy in the scratchpad, with the description rewritten as a plain scalar carrying ` #`, and record the red run in the commit body.
- Trial the skill with a Sonnet subagent on a fixture project in the scratchpad: one that holds a glossary and one that holds none. It should call out an `_Avoid_` word, refuse a general programming term, and leave the file alone until the owner decides. Record the result on the pull request.
- In `.agents/gh-solo.md`, add the `glossary-guru` row to the label table, its exclusion to the mandatory-axis audit query, and the package to the agents-guru check's list. The issue's technical notes record the owner's grant for this edit, and nothing else in that file moves.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `node skills/agents-guru/scripts/check.js skills/glossary-guru`

The version check sees a new package, so it passes on any version, and `1.0.0` is checked by reading the frontmatter. No gate can tell whether an agent obeys the skill, which is why the trial exists and why its result is a record rather than a gate. Whether the skill reads well as a whole is [#298](https://github.com/izkreny/agentifico/issues/298)'s sweep. The README's install command cannot resolve until the stack merges, because the skills CLI reads the default branch.

## Open questions

- **May this branch add a `glossary-guru` row to the package table in the root `README.md`?** I recommend yes: every other package has a row, and the row is one line. The owner's grant in the issue covers `.agents/gh-solo.md` only, so the row stays out until the owner says so.

## Settled

None yet.
