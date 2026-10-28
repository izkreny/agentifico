> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Update outdated dependencies

Issue [#355](https://github.com/izkreny/agentifico/issues/355), a child of epic #329. It takes over #356.

## Where this branch sits

**It is cut from the tip of `docs/GHI-308_new-agnix-rules-for-the-check`, and it sits on stack #359 above that branch.** #355 is blocked by #308, and the issue's own `## Dependencies` says that records the stack's order. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names, so the blocker does not stop the branch.

## The rules file comes first

`.agents/dependencies.md` (new) is written before anything moves, so the round follows it rather than the other way round. It takes its shape from groupifico's file of the same name, cut down to what this repository has:

- **What a round covers**: every npm package under a package directory, Node, and Vale. There is no CI, so no GitHub Actions.
- **The inventory**: `npm outdated`, `npm outdated --all` and `npm audit` after `npm ci`; `mise latest node` against `engines`; `mise latest vale` against `vale --version` and each package's `MIN_VALE`.
- **The order**: Vale first, since it is a machine-wide install the owner runs. Then each direct pin with `npm install --save-exact`, a major in a commit of its own. Then `npm update` for the lockfile.
- **`npm audit fix`** runs only after its `--dry-run --json` shows no lowered version. A fix that lowers one is a decision for the issue. groupifico's file lacks this rule.
- **What a round may fix**: groupifico's size rule, unchanged.
- **Floors**: a linter's floor moves with the round, since an older Vale can report fewer alerts. A round that reaches another package's files splits that work into an issue of its own, since an epic covers one package.

`AGENTS.md` names the file in its layout table and among the files held to the `agents-guru` skill. The owner granted this repository-level edit on this branch.

## Vale

Vale moves from 3.23.0 to 3.25.1, and `MIN_VALE` in `skills/agents-guru/scripts/check.js` moves to 3.25. The threshold stubs in `skills/agents-guru/scripts/test/check.test.js` move to one per minor under 3.25, and a 3.25.0 stub is not refused. Raising the floor refuses installers on an older Vale, so it is breaking, as #209's floor raise was: the commit carries `!` and agents-guru's version moves a major.

The 3.25.1 changes #356 lists are what the suite is read for: phrases matching across a wrap, comment alert placement, `Vale.Terms` with punctuation, and the new spelling messages. Adapting a rule or its cases goes in at any size. A behaviour change goes in only under the size rule; anything larger splits Vale back out to #356, the floor stays at 3.23, and the version moves a patch instead.

`plugins/gh-solo` keeps its own 3.23 floor. Its plan-check bench is run under 3.25.1 to show nothing there breaks.

## npm

Biome moves to 2.6.3 with `npm install --save-exact @biomejs/biome@2.6.3`, and the `$schema` URL in `skills/agents-guru/biome.json` moves with it. Then `npm update` moves the transitive packages the issue names. A rehearsal on a copy of the lockfile showed exactly those moves and no lowered version.

`npm audit fix` is not run: both fixes it offers here lower a version, as the issue records.

## Steps

- Write `.agents/dependencies.md` (new), and name it in `AGENTS.md`'s layout table and among the files held to the `agents-guru` skill.
- Wait for the owner to install Vale 3.25.1.
- Read the Vale 3.25.0 and 3.25.1 release notes, and run the suite and the check under 3.25.1.
- Move `MIN_VALE` to 3.25 and the threshold stubs with it, adapt any rule or case 3.25.1 breaks, and move agents-guru's version a major, in a commit marked breaking.
- Read Biome 2.6.3's changelog, then pin Biome at 2.6.3 and move the `$schema` URL, in a commit of their own.
- Run `npm update` in `skills/agents-guru`, in a commit of its own.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `npm --prefix skills/agents-guru test`, with Vale 3.25.1 on `PATH`
- `npm --prefix skills/agents-guru run lint`
- `node skills/agents-guru/scripts/check.js <package-dir>` exits zero on each of `plugins/gh-solo`, `skills/review-text`, `skills/agents-guru` and `skills/socratic-tutor`, with Vale 3.25.1 on `PATH`
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-plan-check.sh`, with Vale 3.25.1 on `PATH`
- `npm --prefix skills/agents-guru outdated` exits zero
- `npm --prefix skills/agents-guru update` then `git diff --exit-code -- skills/agents-guru/package-lock.json` exits zero
- `python3 -c 'import json,re,subprocess,sys; k=lambda v: [int(x) for x in re.findall(r"\d+", v.split("-")[0])]; old=json.loads(subprocess.check_output(["git","show","origin/docs/GHI-308_new-agnix-rules-for-the-check:skills/agents-guru/package-lock.json"]))["packages"]; new=json.load(open("skills/agents-guru/package-lock.json"))["packages"]; down=[p for p in new if p in old and "version" in new[p] and k(new[p]["version"])<k(old[p]["version"])]; print(*down, sep="\n"); sys.exit(bool(down))'` exits zero, having been seen to exit 1 on the lockfile `npm audit fix` writes

The gates cannot tell whether `.agents/dependencies.md` (new) says the right thing; the owner judges that on the diff. The no-downgrade gate compares by lockfile path, so a package that only moves to another path is not compared.

## Open questions

None.

## Settled

**Does Vale move in this round, or in #356?** In this round, with #356's criteria, under the size rule. The owner chose it in the terminal on 2026-10-28; #356 closes when this pull request merges.
