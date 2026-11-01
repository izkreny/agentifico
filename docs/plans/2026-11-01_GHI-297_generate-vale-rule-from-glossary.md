> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Generate a Vale rule from the glossary

Issue [#297](https://github.com/izkreny/agentifico/issues/297), the second child of epic [#295](https://github.com/izkreny/agentifico/issues/295), stacked on [#296](https://github.com/izkreny/agentifico/issues/296)'s branch. A script reads a project's glossary and writes one Vale `substitution` rule, so a drifted word in prose or a code comment fails a check instead of waiting for a reader.

## The script

`skills/glossary-guru/scripts/glossary-rule.py` (new) is standard-library Python, run from the project's root:

```bash
python3 <skill-dir>/scripts/glossary-rule.py <styles-path>
```

It finds the glossary the way the skill does, `<repo-root>/docs/GLOSSARY.md` then `<repo-root>/GLOSSARY.md`, and stops where both exist, because the skill leaves that choice to the owner. It writes `<styles-path>/Glossary/Terms.yml`. A project commits that file, so a Vale run needs neither the skill nor Python, and a project with no Vale setup yet takes `.vale/styles` as its styles path.

It reads only `## Language`: each `###` heading is a term, and each comma-separated word on that entry's `_Avoid_:` line becomes a `swap` key. `## Retired` and the other sections name no drift words. Keys are written sorted and nothing in the file depends on the date or the machine, which is what makes a second run byte-identical.

These decisions shape the rule:

- `ignorecase: true` with Vale's default word boundaries gives whole words in any case. A probe with Vale 3.25.1 flagged `Purchase` and `client`, and left `clients` and `accounting` alone.
- The message is `Use '%s' instead of '%s'.`, which the same probe rendered as `Use 'Order' instead of 'Purchase'.`.
- The level is `warning`, because a common word on an `_Avoid_:` line can still fire on a correct sentence. A project that wants it to fail a run sets `Glossary.Terms = error` in its `<repo-root>/.vale.ini`.

The script refuses a glossary it cannot turn into a correct rule, naming the entry each time. A word on two entries' lines has no single replacement. A word that is also another entry's term would flag that term wherever it is used correctly. Vale reads a `swap` key as a regular expression, so a word holding anything beyond letters, digits, spaces, hyphens and apostrophes would match something else. A glossary with no `_Avoid_:` line has nothing to generate, so the script says so and writes nothing.

## What Vale can reach

The probe confirmed the issue's note for Ruby: a comment fires, while a method name and a string literal do not. Views are less clean. With `erb = html` under `[formats]`, a view's text fires, and so does the code inside `<% %>`, so a local variable named `purchase` is reported. That result comes from a probe file, so the step below repeats it on izkreny/groupifico's own views, and the skill claims only what that run shows.

## Steps

- Write `skills/glossary-guru/scripts/glossary-rule.py` (new), with the behaviour above.
- Write `skills/glossary-guru/scripts/test-glossary-rule.sh` (new), a bench in the form of `skills/action-policy-guru/scripts/test-check-upstream.sh`. It runs Vale with a generated rule over a fixture, which must report a word from a fixture `_Avoid_:` line and nothing for a word on no such line. It also covers the byte-identical second run and each refusal. Watch it fail with the rule removed, and record the red run in the commit body.
- Run Vale with a generated rule over izkreny/groupifico's `app/views`, with and without the `[formats]` line, reading the source without changing that repository. Record on the pull request what fires.
- Add a section to `skills/glossary-guru/SKILL.md` naming the script, where the rule lives, the `<repo-root>/.vale.ini` lines that turn it on, what Vale cannot read, and that the rule is regenerated when an `_Avoid_:` line changes. Add an `_Except_:` line to the format, per the open question below.
- Mention the rule in `skills/glossary-guru/README.md`.
- Move `metadata.version` to `"1.1.0"`, since this is new behaviour for whoever installs the skill.
- Add the bench to *The benches* in `.agents/gh-solo.md`, per the open question below.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `node skills/agents-guru/scripts/check.js skills/glossary-guru`
- `bash skills/glossary-guru/scripts/test-glossary-rule.sh`

The version check passes on this branch through #296's bump alone, because its range spans the stack, so `1.1.0` is checked by reading the frontmatter. No gate can tell whether a real glossary's words give useful warnings, which izkreny/groupifico#353 will show when it writes the first one.

## Open questions

None.

## Settled

- **Should an entry be able to list phrases the rule skips?** Yes, the owner said so in the terminal: an optional `_Except_:` line under `_Avoid_:`, whose phrases go into Vale's `exceptions` key. The issue names the case, `account` firing on "take into account", and the probe saw that key silence the phrase while `account` alone still fired.
- **May this branch add the bench's entry to `.agents/gh-solo.md`?** Yes, the owner said so in the terminal. The edit is that one entry under *The benches*, and nothing else in the file.
