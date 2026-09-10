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

**`skills/skills-maker/workflows/check.md`'s claim is therefore true as written**, since the value it says is measured on what the parser read is measured on what the parser read. The plan proposes no edit there, and the criterion that asked for one is gone from the issue.

**What the divergence actually reaches is `statesPolicy()`** in `skills/skills-maker/scripts/rules/skill-invocation.js`, the one caller of `description()`. Its tests are `/invo[ck]|spawn/i` and a slash-command pattern, and a word broken across a fold boundary fails both readings alike, so no case is known where the two answers differ today. The reason to fix it is that `description()` is a function whose whole purpose is to return what the parser returns, and a future caller that measures or matches it is correct by construction rather than by luck.

## Steps

The reimplementation is deleted rather than corrected. The `yaml` package is already a dependency and the differential already parses these same lines, so the shortest correct `description()` is one that asks it.

- Add a `parsed(fm)` helper to `skills/skills-maker/scripts/rules/frontmatter.js` holding the one `parseDocument(fm.join("\n"), { version: "1.1", uniqueKeys: false })` call, and have `skills/skills-maker/scripts/rules/skill-frontmatter-parsed.js` use it instead of its own. That file's header comment says the rules never parse except the differential, which stops being true, so it moves with the code.
- Replace `description()`'s block-scalar branch with the parsed value, read off that helper. It is last-wins on a duplicate `description:` key for free, where the raw reader takes the first.
- Keep a deliberately crude fallback for a frontmatter the parser rejects: the block body's lines joined as they stand, with no dedent and no indicator handling. Its only consumer is two indentation-insensitive regexes, on a file the differential is already reporting as unloadable, and a second dedent-and-chomp implementation there would recreate what this branch removes.
- Leave `folded()` reading raw lines, untouched.
- Add fixtures to `skills/skills-maker/scripts/test/rules.test.js` covering `|`, `|-`, `|+`, `>`, `>-`, `>+`, a fold across one blank and across two, a more indented line inside a fold, an indentation indicator on each header kind, a duplicate `description:` key reading as the last, and a frontmatter that does not parse still yielding text `statesPolicy()` matches.
- Assert each against a literal value from a real run, not against a live `parseDocument` call. That file's header rule excludes a shape the parser alone decides, and once `description()` asks the parser, an assertion computed by asking it again can only fail if the two calls disagree about options. A literal also fails loudly if the pinned `yaml` ever changes its answer, where a parser-derived expectation would silently follow it.
- Watch every fixture fail against the current reader before trusting it. The table above says which shape each of the style fixtures catches; the duplicate-key and parse-error fixtures fail against the current code for reasons of their own.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.1.0` to `3.1.1`. A patch, and the evidence is a run rather than an argument: the check's own report over every skill in the tree reads identically before and after.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

`folded()` is the function that must not parse, and no gate can see the difference. `skill-frontmatter-parsed` compares its raw reading against the parsed value and reports a silent mutation on any difference, so a `folded()` that returned that value would compare a value against itself, could never fire, and would still pass every fixture in the suite. `description()` is the opposite case and always was: its caller wants the string an agent actually reads, so asking the parser is what makes it right. The two live in one file and the distinction between them is the thing to hold on to.

`frontmatter()` strips trailing blank lines before either reader sees them, so a `|+` scalar's own trailing blanks never reach this comparison. That is a limit of `frontmatter()` rather than of this fix, and it is out of scope here.

## Open questions

None.

## Settled

- Does #142's Overview get corrected? "Correct it." Applied to the issue directly: the ceiling claim and the `skills/skills-maker/workflows/check.md` claim are gone, and the Overview now states the divergence that is real.
- Is the patch the right part, given that the criterion's stated reason was the ceiling? "Rescope it.", read as rescoping the criterion rather than the version move. It now asks for evidence instead of giving a reason: the check's report identical before and after.
- Teach `description()` chomping and folding, or delete it in favour of the parser? The parser, decided in the session. The `yaml` dependency is already pinned and already used by the differential, the divergence table above is a list of what a reimplementation has to get right, and `statesPolicy()`'s verdict cannot change either way, so the raw reader buys nothing here.
