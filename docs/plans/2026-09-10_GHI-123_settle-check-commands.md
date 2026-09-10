> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Settle what *Check commands* asks a branch to run

Closes the two open questions in *Check commands* of `.agents/gh-solo.md`: what the docs-check command reads, and whether a package's own linter is a gate. Both are edits to that one section, both are repository-level, and neither moves a package version.

## What the docs-check command reads

The command drops `docs/plans` from its targets and takes the open branch's own plan file in its place. The form that needs no per-branch edit is an unquoted command substitution as a trailing target:

```bash
python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md \
  $(git diff --name-only origin/main...HEAD -- docs/plans) \
  --ignore '.claude/*' --ignore '*GHI-50*'
```

Unquoted is load-bearing and is the reason a placeholder was not used instead. `plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` defaults its target list to the whole tree when it receives none, and `Path("")` is the current directory, so a quoted substitution on a branch carrying no plan yet would hand the script an empty string and scan the repository root. Unquoted, an empty result contributes no word at all and the three named targets stand alone. Plan filenames carry no spaces, so nothing else splits.

The remaining ignore set was established by dropping one span at a time and reading the exit code, not by reasoning about it:

- `.claude/*` catches five spans naming the served repository's own agent config, in the plugin's skill files. Dropped, the run reports five problems.
- `*GHI-50*` catches the example plan filename in `plugins/gh-solo/skills/pr-flow/workflows/open.md` and `plugins/gh-solo/skills/tracker/references/formats.md`. Dropped, the run reports two problems.
- `docs/plans*` catches nothing once merged plans are no longer read. Dropped, the run stays clean, so it goes.
- `skills/skills-maker/scripts/*` catches only the stale script paths inside merged plans, which is the span the issue names. It goes with them.

## Whether a package's lint is a gate

`skills/skills-maker/package.json` declares `lint` as `biome check scripts/`, and neither `test` nor `skills/skills-maker/scripts/check.js` invokes it, so it is a real gate that nothing else covers. It joins the package's suite and its own check rather than being written off as a convenience.

It is stated as a rule about any package that ships a `lint` script in its own manifest, so a second package carrying a linter needs no edit here. It sits in the same paragraph as the suite because it needs the same one-time install.

## Steps

- Rewrite the docs-check command in *Check commands* of `.agents/gh-solo.md` to the form above: `docs/plans` out of the targets, the unquoted substitution in, the `docs/plans*` and `skills/skills-maker/scripts/*` spans gone.
- Rewrite the paragraph beneath the command so it says what each remaining span catches, named rather than counted, and why the branch's own plan is the only plan still read. Say that unquoted is deliberate.
- Leave the *Why it is narrower*, *`skills/` is deliberately not a target* and *Read the exit code, not the output* paragraphs standing; none of them turns on plans being a target.
- Extend the skills-maker checks paragraph with the lint, phrased as the rule that a package shipping a `lint` script owes that run beside its suite, and list the three commands so a branch touching that package reads its whole obligation off this file.
- Run every box in `## Verification`, watching each new check fail on the case it exists to catch before trusting it.

## Verification

- [ ] The new docs-check command, run from the repository root without a pipe, exits 0.
- [ ] The new command exits 1 when this branch's own plan file is given a backticked path that does not resolve, and 0 again once that edit is reverted.
- [ ] The old target set with `skills/skills-maker/scripts/*` dropped exits 1 on stale paths in merged plans, and the new command over the same tree exits 0.
- [ ] The new command with `--ignore '.claude/*'` dropped exits 1, and with `--ignore '*GHI-50*'` dropped exits 1.
- [ ] `python3 scripts/version-check.py` exits 0 and reports no package touched.

What these cannot see: whether the substitution behaves the same in fish, which is the shell the commands are pasted into, and whether a future stacked branch pulling in the plans of every branch below it is wanted or merely harmless. Nothing under `plugins/`, `skills/` or `scripts/` changes, so no bench and no package suite is owed by this branch, and the lint this branch names as a gate is exercised by the next branch to touch that package rather than by this one.

## Open questions

None.

## Settled

None yet.
