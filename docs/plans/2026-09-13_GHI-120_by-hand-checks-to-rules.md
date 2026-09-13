> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Turn the by-hand skill checks into rules

Issue [#120](https://github.com/izkreny/agentifico/issues/120), a child of epic [#157](https://github.com/izkreny/agentifico/issues/157), cut from the tip of `feat/GHI-148_watched-failing-rule` and stacked on it.

## What lands

Three markdownlint rules beside the ones already in `skills/skills-maker/scripts/rules/`, one shared helper, and the by-hand list in `skills/skills-maker/workflows/check.md` losing the items they decide.

| Rule | Decides | Reads |
|---|---|---|
| `skill-readme` | a `README.md` sits beside every 'SKILL.md' and carries an install form | the filesystem, from the 'SKILL.md's own path |
| `skill-portable-paths` | no path is absolute to one machine | the token tree |
| `skill-referenced-paths` | a path named in prose resolves | the token tree and the filesystem |

## What the tree says today, measured rather than assumed

The decision procedure in `plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` was reimplemented as a throwaway script and run over both trees at `9c8d245`, because the issue's premises about it are testable and one of them does not hold.

Over `skills/skills-maker`, seven spans do not resolve: '~/' three times and '~/.local/state/skills/.skill-lock.json' once, which the '~/' agreement below skips; 'check.js' and 'lint-config.js' at `skills/skills-maker/SKILL.md` line 77, which name real files under `scripts/` through a bullet whose lead already said `scripts/`; and 'workflows/foo.md' at `skills/skills-maker/workflows/check.md` line 106, which is a path deliberately naming nothing.

Over `plugins/gh-solo`, fifty-six spans do not resolve. They are `.agents/gh-solo.md`, `.claude/gh-solo.md`, `AGENTS.md` and `CLAUDE.md`, each naming a file in the repository the plugin serves rather than in its own tree; `docs/plans/` and the `2026-08-16_GHI-50_login-form.md` example; and two repo-relative spans that resolve from the repository root and not from `plugins/gh-solo` as target.

## The premise that does not hold

The issue says the rule takes no ignore list because "a skill tree has no such files". A skill that serves another repository names that repository's files by design, and fifty-six such spans are the demonstration. So `plugins/gh-solo` cannot reach a clean run under a rule with no escape hatch, and the criterion that allows "or every finding they print is reported on the pull request" is what this branch will rely on.

The plan follows the issue: no ignore list, and the findings reported. Clearing them is a `skills-maker` issue rather than a `gh-solo` one, because what closes it is the rule learning what to do with a skill that names its served repository's files, not fifty-six edits to another package's prose. The fifty-six spans are correct as written, so reading this as a `gh-solo` defect would send the wrong package a bill for a gap in this one.

## Two span predicates, not one

`looks_like_path` in `plugins/gh-solo/skills/pr-flow/scripts/docs-check.py` rejects any span starting with `/`, which its own docstring names as a deliberate blind spot: it drops slash commands and absolute paths together. That blind spot is exactly what `skill-portable-paths` hunts, so the two rules cannot share one predicate. `skill-referenced-paths` inherits the docs-check procedure whole, and `skill-portable-paths` matches `/home/`, `/Users/` and a drive letter on spans the other rule refuses to look at.

The '~/' agreement is one exported predicate in 'skills/skills-maker/scripts/rules/paths.js', imported by both: `skill-portable-paths` passes a '~/' span as portable, `skill-referenced-paths` skips it rather than resolving it, and neither states the rule itself.

## `enclosingSkill` is the wrong walk for this

`enclosingSkill` in `skills/skills-maker/scripts/rules/skill-layout.js` starts from the grandparent of the file, because it answers which skill *contains* this skill. The first resolution base wants the skill that *owns* the file, which for a 'SKILL.md' is its own directory. So 'skills/skills-maker/scripts/rules/paths.js' carries its own walk from the file's directory rather than reusing that one.

## Steps

- Add 'skills/skills-maker/scripts/rules/paths.js', carrying the '~/' predicate, the owning-skill walk and the docs-check span predicate, each with the script it came from named in a comment so the two stay in step by reference.
- Add 'skills/skills-maker/scripts/rules/skill-readme.js', anchored to 'SKILL.md' with `parser: "none"` as `skills/skills-maker/scripts/rules/skill-layout.js` is, reporting a missing `README.md` at the frontmatter line and a README carrying none of the install forms `skills/skills-maker/workflows/new.md` will name.
- Add 'skills/skills-maker/scripts/rules/skill-portable-paths.js' over the micromark token tree, reporting a code span, a fenced line or a link destination that is absolute to one machine.
- Add 'skills/skills-maker/scripts/rules/skill-referenced-paths.js' over the token tree and the filesystem, reading code spans in prose only and resolving against the owning skill, the file's own directory and the target root.
- Pass `root` to `skill-referenced-paths` in `skills/skills-maker/scripts/check.js`, beside the entry `skill-layout` already has; `skill-readme` needs none, since a README sits beside the file the rule is anchored to.
- Register all three in `skills/skills-maker/scripts/lint-config.js` as contract rules, and describe each in `skills/skills-maker/workflows/check.md`, removing the README, portable-path and referenced-path items from its by-hand list.
- State in `skills/skills-maker/workflows/new.md` which sections a README must carry and how an install form is recognised, as a cap on future content.
- Rewrite the three spans this branch's own tree fails on: 'check.js' and 'lint-config.js' at `skills/skills-maker/SKILL.md` line 77 become `scripts/`-prefixed, and 'workflows/foo.md' at `skills/skills-maker/workflows/check.md` line 106 goes into single quotes, which is the convention `.agents/gh-solo.md` already states for a path that deliberately names nothing.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from `3.4.0` to `3.5.0`. A minor: three rules are new behaviour and nothing that passed before starts failing except what the rules were written to catch.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --ignore '.claude/*' --ignore '*GHI-50*'`
- `python3 scripts/version-check.py`
- `npm --prefix skills/skills-maker test`
- `node skills/skills-maker/scripts/check.js skills/skills-maker`
- `npm --prefix skills/skills-maker run lint`

Vale 3.20.0 is on PATH and `skills/skills-maker/node_modules` is installed. The run over `plugins/gh-solo` is deliberately not a box here: its pass criterion is "exit zero or every finding reported", which is a judgement rather than an exit code, so it goes in a pull request comment instead. Each rule is watched failing before its pass is trusted, per *A check that has never been seen to fail is not evidence*, which `feat/GHI-148_watched-failing-rule` puts in `skills/skills-maker/workflows/new.md` and this branch sits on. `skill-referenced-paths` and `skill-readme` have real instances in the tree to be watched failing against; `skill-portable-paths` has none, since no absolute home path exists anywhere under `skills/` or `plugins/` at `9c8d245`, so its watched failure is against a fixture and the plan says so rather than claiming an instance it does not have.

## Open questions

None.

## Settled

- Which package owns clearing the fifty-six spans on `plugins/gh-solo`. Settled on the pull request: a `skills-maker` issue, not a `gh-solo` one. The deliverable is this package's rule gaining an answer for a skill that names its served repository's files; the spans themselves are correct as written.
- Whether the bare 'check.js' and 'lint-config.js' spans at `skills/skills-maker/SKILL.md` line 77 are a prose defect or a case the rule should understand. Settled on the pull request: the prose, fixed on this branch. A rule that read a bullet's lead would be a scoping mechanism with one caller.
- Whether `skill-portable-paths` gains a marker for a deliberate bad example. Settled on the pull request: no new mechanism, because single quotes already are one. `.agents/gh-solo.md` reserves them for a span naming nothing on disk, every rule here reads backticked spans only, and this plan's own quoted paths are the working instance.
