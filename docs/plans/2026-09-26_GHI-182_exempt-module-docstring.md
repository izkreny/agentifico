> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Exempt the module docstring from the comment rules

Issue [#182](https://github.com/izkreny/agentifico/issues/182). Not part of an epic, so the branch is cut from `main` and not stacked.

## What lands

A Vale View for `*.py` files gives the module docstring a scope of its own, and `CommentSentences` and `CommentLength` stop reading that scope. Every other comment and docstring keeps the scope it had, so both rules read them as before. `skills/skills-maker/workflows/new.md` says beside the one comment rule that a module docstring is exempt, because PEP 257 asks it to carry the module's summary and usage. `skills/skills-maker/workflows/check.md` says the same in the two rules' table rows. `metadata.version` moves a minor, `3.11.1` to `3.12.0`.

## What was measured before writing this

**Measured on Vale 3.21.0 on 2026-09-26**, with a probe style over Python, JavaScript and markdown fixtures:

- Vale gives every Python comment and docstring the same scope, `text.comment.line` or `text.comment.block`. No rule scope can tell a module docstring apart by default. `BlockIgnores` and `TokenIgnores` do not reach a code file.
- Vale's Python queries sit in [internal/lint/code/py.go](https://github.com/vale-cli/vale/blob/v3.21.0/internal/lint/code/py.go) at the `v3.21.0` tag. One query each covers comments, function docstrings, class docstrings and the module docstring. A View replaces that set. A View that repeats the four and names the module query `module` gives the module docstring the scope `text.comment.module.*` and leaves the other three unnamed.
- A rule scoped `comment & ~module` then reads every comment, function docstring and class docstring, and skips the module docstring. `~module` alone also reads markdown paragraphs, so the `comment &` half is what keeps markdown out. The Vale scopes page documents `&` and `~` from 3.18, which is below the package's 3.21 floor.
- A `[*.py]` section that carries only `View =` merges onto the existing `[*.{js,py}]` section. JavaScript keeps Vale's own queries.
- **A module docstring under a shebang is read by no query**, with or without the View. Vale anchors the module query to the module's first child, and a shebang is a comment node, so the anchor fails. On `main`, the multi-sentence module docstring in `plugins/gh-solo/skills/pr-flow/scripts/watch.py` raises nothing for that reason. The gh-solo scripts #181 restores all open with a shebang. So the check never failed on their module docstrings. What #181 waits on is the rule in `skills/skills-maker/workflows/new.md`, which a reviewer applies by hand.

## The View

`'skills/skills-maker/assets/config/views/Python.yml'` uses `engine: tree-sitter` and carries Vale's four Python queries as they stand in Vale's source. The module query takes `name: module`. `skills/skills-maker/.vale.ini` gains a `[*.py]` section with `View = Python` and a one-sentence comment saying why.

## The rules

`skills/skills-maker/assets/Agentifico/CommentSentences.yml` and `skills/skills-maker/assets/Agentifico/CommentLength.yml` each change `scope: comment` to `scope: comment & ~module`. Each header comment gains one sentence: the module docstring is exempt per PEP 257, and #182 is the source.

`Counts`, `Position`, `History` and `ParagraphLength` keep reading the module docstring. The exemption covers the one comment rule, and those rules hold prose to other standards.

## The suite

`skills/skills-maker/scripts/test/vale.test.js` builds its own Vale configuration string, so that configuration gains the `[*.py]` section with the View. The existing function-docstring fixture already trips `CommentSentences`, which is the trip half of the criterion. The fixtures it gains:

- a guards fixture whose module docstring opens the file with no shebang and carries two sentences and 46 words, raising neither rule;
- the same file's function docstring, class docstring and `#` comment each carrying two sentences, each still tripping `CommentSentences`.

The guards fixture has no shebang on purpose. With a shebang, the module docstring raises nothing before the change as well as after, so the fixture could never be watched failing. It is run before the View lands, and the failing assertion is read.

## The prose

`skills/skills-maker/workflows/new.md` gains one sentence under *A comment inside code exists only where the solution is unconventional, and is one sentence saying why*. A module docstring is the module's interface, so it follows PEP 257: a summary line and the usage.

`skills/skills-maker/workflows/check.md` gains a clause in the `CommentSentences` and `CommentLength` rows naming the module docstring as exempt. Its escapes paragraph gains one sentence: Vale reads no module docstring under a shebang, so there the exemption changes nothing. That sentence is adjacent to the goal rather than in it, so the PR body flags it as one the round may strike.

## Steps

- Add the guards fixture to `skills/skills-maker/scripts/test/vale.test.js`, run the suite, and read the assertion fail.
- Write `'skills/skills-maker/assets/config/views/Python.yml'` and add the `[*.py]` section to `skills/skills-maker/.vale.ini`.
- Scope `CommentSentences` and `CommentLength` to `comment & ~module`, each header naming the exemption and #182.
- Add the `[*.py]` section to the suite's configuration string and run the suite green.
- Add the exemption to `skills/skills-maker/workflows/new.md`, and to the rule rows and escapes paragraph of `skills/skills-maker/workflows/check.md`.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.11.1` to `3.12.0`.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

The suite proves the module docstring is spared and every other comment and docstring is still read. The check over the package proves the new prose breaks no prose rule. No gate reads whether PEP 257 is the right reason, or whether the View's copy of Vale's queries tracks a later Vale that changes them. The round reads those.

## Open questions

None.
