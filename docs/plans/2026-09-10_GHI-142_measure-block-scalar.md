> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Measure a block scalar exactly as the parser reads it

Issue [#142](https://github.com/izkreny/agentifico/issues/142), a child of epic [#156](https://github.com/izkreny/agentifico/issues/156), stacked on [#124](https://github.com/izkreny/agentifico/issues/124)'s branch.

## What diverges

`description()` in `skills/skills-maker/scripts/rules/frontmatter.js` reads a block scalar by dedenting its lines and joining them with newlines. That is the parser's answer for exactly one of the five styles a header can carry. From a run against the `yaml` package this package pins, under the `{ version: "1.1", uniqueKeys: false }` the differential uses:

| Frontmatter | Parser | `description()` |
|---|---|---|
| `\|` then `one`, `two` | `"one\ntwo\n"` | `"one\ntwo"` |
| `\|-` then `one`, `two` | `"one\ntwo"` | `"one\ntwo"` |
| `\|+` then `one`, `two` | `"one\ntwo\n"` | `"one\ntwo"` |
| `>` then `one`, `two` | `"one two\n"` | `"one\ntwo"` |
| `>` then `one`, blank, `two` | `"one\ntwo\n"` | `"one\n\ntwo"` |
| `>` then `one`, blank, blank, `two` | `"one\n\ntwo\n"` | `"one\n\n\ntwo"` |
| `>` then `one`, `  deep`, `two` | `"one\n  deep\ntwo\n"` | `"one\n  deep\ntwo"` |

So `|-` matches and nothing else does. Two rules are at work. Chomping decides the trailing newlines: `-` strips them, the bare indicator keeps one, `+` keeps them all. Folding decides the interior of a `>` scalar: a line break between two equally indented content lines becomes a space, a run of n blank lines becomes n newlines, and a more indented line is kept verbatim with its breaks intact.

## Two of the issue's premises do not survive a run

**The ceiling is not leaking.** `skill-frontmatter-parsed` measures it on `parsed.description`, which is the `yaml` package's own value, so `description()` never reaches it. A `|` block whose parsed value is exactly 1,025 characters was run through that rule and reported: `description is 1025 characters, over the spec's 1024`.

**`skills/skills-maker/workflows/check.md`'s claim is therefore true as written**, since the value it says is measured on what the parser read is measured on what the parser read. The issue's second acceptance criterion is met before this branch starts, and the plan proposes no edit there.

**What the divergence actually reaches is `statesPolicy()`** in `skills/skills-maker/scripts/rules/skill-invocation.js`, the one caller of `description()`. Its tests are `/invo[ck]|spawn/i` and a slash-command pattern, and a word broken across a fold boundary fails both readings alike, so no case is known where the two answers differ today. The reason to fix it is that `description()` is a function whose whole purpose is to return what the parser returns, and a future caller that measures or matches it is correct by construction rather than by luck.

## Steps

- Give `description()` the chomping rule: read the indicator off the header, strip every trailing newline for `-`, keep exactly one for the bare form, and keep all of them for `+`. The empty-body case stays the empty string.
- Give it the folding rule for a `>` header: join equally indented content lines with a space, turn a run of n blank lines into n newlines, and keep a more indented line verbatim with its breaks. A `|` header keeps every break as it stands.
- Add one fixture per style to `skills/skills-maker/scripts/test/rules.test.js`, each asserting `description(fm)` against `parseDocument(fm.join("\n"))`'s own value for the same frontmatter rather than against a string written into the test, so a later divergence fails the suite instead of needing a fresh probe. Cover `|`, `|-`, `|+`, `>`, `>-`, `>+`, a fold across one blank and across two, a more indented line inside a fold, and an indentation indicator on each of the two header kinds.
- Watch every fixture fail before trusting it, per the header rule in that file: the differential table above says which shape each one catches, so each is run against the current reader first.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.1.0` to `3.1.1`. A patch: no report changes for any skill in the tree, since `statesPolicy()` is the only caller and its answer is unchanged, so nothing an installer sees moves.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

`description()` stays a raw reader and never calls a parser: the header comment in `skills/skills-maker/scripts/rules/frontmatter.js` makes the differential the one rule that parses, and this fix must not become the second. What no gate can see is that distinction, since a `description()` that simply returned the parser's value would pass every fixture above while destroying the reason the differential means anything.

`frontmatter()` strips trailing blank lines before either reader sees them, so a `|+` scalar's own trailing blanks never reach this comparison. That is a limit of `frontmatter()` rather than of this fix, and it is out of scope here.

## Open questions

- Does #142's Overview get corrected? Two of its claims are false as written: the ceiling is measured on the parser's value already, and `skills/skills-maker/workflows/check.md` is accurate. Editing the issue is the tracker's act and the owner's call, so nothing here touches it.
- Is the patch the right part, given the reason the criterion gives for moving the version is the ceiling, which was never wrong? The plan reads it as a patch because no report changes for any existing skill.
