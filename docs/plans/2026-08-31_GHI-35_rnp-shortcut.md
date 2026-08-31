> 🤖 Written by AI --- read/modified by izkreny! 🤓

# `rnp`, a typed shortcut for "resolve all and push"

Closes #35.

`rnp` is a third spelling of the review protocol's step 7. Nothing after the routing point learns which spelling arrived, so `plugins/gh-solo/skills/pr-flow/workflows/resolve.md` is not in this diff and no authorisation semantics move: the `resolve` bullet is already deliberately not literal-command-only, and `rnp` joins the sentence rather than replacing it.

The part that is easy to miss is the frontmatter. A skill loads on its `description`, so a bare `rnp` typed into a fresh session matches nothing and the skill never opens; the routing bullet alone would leave the shortcut reachable only once the skill had been loaded some other way.

## Steps

- Add `rnp` to `description:` in `plugins/gh-solo/skills/pr-flow/SKILL.md`, in the clause that already names "resolve all and push", so a bare `rnp` fires the skill.
- Add `rnp [pr-number]` to that file's `argument-hint:`, beside `resolve [pr-number]`.
- Name `rnp` in the routing table row and in the routing bullet of the same file, both of which currently name the sentence and the word `resolve`. The bullet's contrast sentence stays true as written: `rnp` is a third spelling of a decision, not a fourth literal command like `watch`.
- Name `rnp` in `plugins/gh-solo/skills/pr-flow/workflows/help.md` wherever it names the sentence: the `unwatch` and `resolve 60` command rows, the step 7 entry in the branch's life, the paragraph that tells the owner what to say, and the `watch` paragraph that lists what stops the poll.
- Offer `rnp` alongside the sentence in the owner's next-move block of `plugins/gh-solo/skills/pr-flow/workflows/review.md` and `plugins/gh-solo/skills/pr-flow/workflows/auto.md`, and in the hand-back paragraph of `plugins/gh-solo/skills/pr-flow/workflows/discuss.md`.
- Add `rnp` to the terminal-gate row of `plugins/gh-solo/skills/pr-flow/workflows/discuss.md`, which names the exact command the owner has to type in the session and is therefore one of the lines that teaches them what to say.
- Move the `gh-solo` package version to `3.3.0` in `plugins/gh-solo/.claude-plugin/plugin.json`.

## Verification

- [ ] `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'` exits zero
- [ ] `python3 scripts/version-check.py` exits zero

Neither gate can see whether `rnp` actually fires the skill from a cold session, because that depends on the harness matching the `description:` text rather than on anything in this repository. The evidence for that criterion is the literal word appearing in the description, which is what the harness matches against, and the owner typing it once after the plugin is next installed.

Neither gate reads prose for consistency either: a place that still names only the sentence after this branch is a review finding, not a failing command.

## Settled

**Does `plugins/gh-solo/skills/pr-flow/README.md` get `rnp` too?** No. It names the sentence three times, and it is outside the closed acceptance-criteria list on #35, which reaches the workflow files and the frontmatter only. The issue's own scoping reason for leaving `plugins/gh-solo/skills/implement/workflows/fix.md` alone applies unchanged here: the word is taught where the round runs, and the README is the rendered overview a reader meets before any round exists. The round may overturn this; it is recorded here so it is a decision rather than an omission.

## Open questions

None.
