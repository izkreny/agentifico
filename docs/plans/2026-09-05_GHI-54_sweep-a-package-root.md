> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Take a package root and sweep the skills under it

Closes #54. `/skills-maker review <path>` accepts a directory of skills or one skill's own directory, and a plugin root is neither: `plugins/gh-solo/` has no SKILL.md of its own and its immediate children are `plugins/gh-solo/agents/`, `plugins/gh-solo/hooks/`, `plugins/gh-solo/skills/`, `plugins/gh-solo/.claude-plugin/` and `plugins/gh-solo/README.md`, none of which carries one. Both check scripts report `no SKILL.md found` and exit 1 against it, which is why `AGENTS.md` had to define a plugin's sweep as two acts. This branch makes the argument shape wide enough that one command delivers what a `<name>_<version>` tag asserts.

Bottom of #95's stack, cut from `main`, so its pull request takes a plain `--base main`. `gh stack init` is not run here: it takes positional branch names and there is one branch, so the stack is initialised when #88 is cut on top of this one.

## What #54 owns and what #88 does not

**#54 changes what the sweep reads and what it reports.** The argument shapes the scripts accept, the file scope `skills/skills-maker/workflows/review.md` puts under a package root, and a report naming the files that were read.

**#88 changes how a multi-skill set is read**, in one inline pass rather than fanned out to subagents. Nothing here states that rule, and its absence from this branch is the scope fence rather than a gap.

## One discovery rule, not three

The acceptance criteria name three shapes - one skill's own directory, a directory of skills, a package root whose skills sit at `<root>/skills/` - and a rule per shape is three things to keep in step. One rule covers all three:

- If the target itself carries a SKILL.md of its own, it is one skill. This is today's first branch, unchanged, and the criterion that a single skill's directory behaves exactly as it does now is satisfied by not touching it.
- Otherwise walk down from the target and collect every SKILL.md, stopping the descent at each one: a skill's own directory is never entered, so a `workflows` or `references` directory beneath it cannot yield a second hit.

A directory of skills is then the depth-1 case of the walk and needs no branch of its own, and `plugins/` - a directory of plugins - falls out for free.

**The walk follows symlinks, and that is load-bearing rather than incidental.** `skills/skills-maker/SKILL.md` under *Where skills live* tells the owner to keep one canonical copy at `~/.agents/skills/<name>/` and symlink each agent's directory to it, so `~/.claude/skills` is a directory of symlinks and is the check's primary target. Today's `fs.existsSync(s + "/SKILL.md")` and Ruby's `Dir["*/SKILL.md"]` both follow; a walk written with `withFileTypes` and no symlink handling, or with `Dir.glob("**/SKILL.md")`, silently stops finding anything there. Cycles are bounded with a realpath visited set, and dot-directories are skipped.

**A skill is reported by its path relative to the target, not its basename.** Two plugins can each ship a `review` skill, and a report listing `review` twice says nothing about which. At depth 1 the relative path *is* the basename, so every existing bench assertion keeps matching.

## The shell loop in `check` is part of the argument contract

The criterion that `check` accepts the same shapes as `review` reaches more than the two scripts: *The rest* in `skills/skills-maker/workflows/check.md` opens with `for d in */`, which from a package root yields a plugin's `agents`, `hooks` and `skills` directories and reports all three as `name does not match directory`. The loop iterates the skill directories the description check discovered rather than the target's immediate children - one discovery rule, used by everything downstream of it, instead of a second walk written in shell that can drift from the first.

## The package root's residue

`skills/skills-maker/workflows/review.md` Step 1 already reads every file in a skill's directory, so what the widened argument adds is the files that belong to no skill, which in this repository's one plugin are `plugins/gh-solo/agents/`, `plugins/gh-solo/hooks/`, `plugins/gh-solo/.claude-plugin/` and `plugins/gh-solo/README.md`. **Reachability is by walking the tree, never by following references out of the skills**, and the file has to say why, because a reference-following scope is the plausible design and it is wrong: `plugins/gh-solo/agents/reviewer.md` is cited by path in no skill under `plugins/gh-solo/skills/`, and it is the agent every review round spawns.

**The report says which files were read**, so a run that covered part of a package is distinguishable from one that covered all of it. Without it the sweep's own output is the same shape whether it read the manifest or not, and the tag's whole claim is that nothing was missed.

## `AGENTS.md` collapses back to one command

*A package is tagged only after its own whole-package sweep has run* currently defines a plugin's sweep as the command over each skill plus a separate read of the files belonging to none. Once the argument accepts a package root, that second act is what the command does, and the two-act wording goes.

## Steps

- Add the package-root fixture to `skills/skills-maker/scripts/test-checks.sh` and run the bench, so the new assertions are watched failing against scripts that reject a package root before any script changes.
- Add a symlinked-skills-directory fixture to the same bench, so the symlink behaviour the walk must preserve is asserted rather than assumed.
- Replace the discovery in `skills/skills-maker/scripts/check-descriptions.js` with the one rule: a SKILL.md at the target means one skill, otherwise walk down collecting every SKILL.md and stop the descent at each, following symlinks, skipping dot-directories, and bounding cycles with a realpath visited set.
- Report each skill by its path relative to the target rather than its basename.
- Make the same change in `skills/skills-maker/scripts/check-differential.rb`, whose `Dir["*/SKILL.md"]` has the same depth-1 limit and the same symlink dependency.
- Update the usage comment at the head of each script to name the third argument shape.
- Rewrite *The rest* in `skills/skills-maker/workflows/check.md` so its loop iterates the skill directories the description check discovered, and state the package-root shape alongside the other two.
- Give `skills/skills-maker/workflows/review.md` Step 1 the package-root scope: every file under the root, the residue that belongs to no skill named, reachability by walking with its reason, and a report naming the files read.
- Update the `review <path>` row in `skills/skills-maker/README.md` to name the package-root shape.
- Move `metadata.version` in `skills/skills-maker/SKILL.md` from 1.1.0 to 1.2.0: new behaviour, nothing removed.
- Collapse the plugin sweep in `AGENTS.md` under *A package is tagged only after its own whole-package sweep has run* to one command.

## Verification

- [ ] `bash skills/skills-maker/scripts/test-checks.sh` - the bench, which owns the package-root and symlink shapes.
- [ ] `node skills/skills-maker/scripts/check-descriptions.js skills/skills-maker` - the one-skill shape still behaves as it did.
- [ ] `ruby skills/skills-maker/scripts/check-differential.rb skills/skills-maker` - the same, in the differential.
- [ ] `node skills/skills-maker/scripts/check-descriptions.js plugins/gh-solo` - the shape this issue exists for, against a real package.
- [ ] The docs-check command `.agents/gh-solo.md` states, run unpiped with its exit code read.
- [ ] `python3 scripts/version-check.py`.

**What these gates cannot see.** `skills/` is deliberately not a docs-check target, per `.agents/gh-solo.md`, so nothing mechanical reads the prose this branch adds to `skills/skills-maker/workflows/review.md` or `skills/skills-maker/workflows/check.md`. Whether the walk rule reads as a rule, whether `AGENTS.md`'s collapsed sentence still says what a plugin sweep covers, and whether the residue paragraph earns its length are the owner's judgement. `python3 scripts/manifest-check.py` is not owed: no manifest changes.

## Open questions

- None.

## Settled

- **Does `skills/skills-maker/workflows/review.md` cite `plugins/gh-solo/agents/reviewer.md` by name as the reason for walking rather than following references?** No. `skills-maker` is a standalone package that installs outside this repository, so a named path into `plugins/gh-solo/` points a portable reader at a file they do not have. The file carries the reason generically - a plugin's agents and hooks are cited by no skill under it - and this plan holds the instance that proves it.
