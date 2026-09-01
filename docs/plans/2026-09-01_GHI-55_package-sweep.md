> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Review the gh-solo package before the 3.3.0 tag (#55)

## Context

The sweep #55 exists for has run, in the two acts `AGENTS.md` defines for a plugin. Act one was `/skills-maker review` over each skill under `plugins/gh-solo/skills/`, each in its own fresh-context subagent. Act two was a read of the six files belonging to no skill, which act one cannot reach. Both acts read the package at `441ca34`.

It returned 71 findings, of which two were closed before this plan was written. The mechanical layer was run first and is clean: the description checks report no defects across all four skills, `name:` matches every directory, every skill's README names how it is installed, no absolute or non-portable paths, no non-Bash shell syntax in fenced blocks, `docs-check` reports 48 files clean, and `manifest-check` reports the two manifests in step. The repository and installed copies of `skills-maker` were byte-identical, so act one judged against the current standard rather than a stale one.

**The findings themselves live in this file.** They were produced in a session working directory that is not part of this repository and that carries machine-specific paths, so this plan is their public record and the triage below is the decision trail #55's fourth criterion asks for. Finding ids are `IM` for `implement`, `PF` for `pr-flow`, `RV` for `reviewer`, `TR` for `tracker` and `AT` for act two.

**Two findings are already closed, by observation rather than by reading.** `AT-6` asked whether the undocumented top-level `description` key in `plugins/gh-solo/hooks/hooks.json` prevents the hook loading, and `AT-7` whether `plugins/gh-solo/hooks/hooks.json` is auto-discovered from a manifest declaring no component keys. A single-line trunk push against a throwaway fixture, declined at the prompt, answered both: the hook fired, attributed to this plugin, and resolved `develop` as the trunk through a non-`origin` remote. So the key is tolerated, auto-discovery reaches hooks, and `permissionDecision: "ask"` behaves as documented.

**Three decisions the owner has already settled**, recorded here because the work below depends on them rather than proposing them:

- Every skill prints markdown to the console, and printed tables are padded so their columns align. This resolves `TR-16` and `PF-2` in `tracker`'s favour and inverts `pr-flow`'s rule.
- `reviewer` gains `user-invocable: false`, which is the correct field for a skill whose only caller is an agent through the Skill tool. This resolves `RV-9` better than the reviewer's own proposal to delete `argument-hint`.
- The wider question of which skills the model may invoke at all is #56, not this branch, because it is new behaviour rather than a defect and is plausibly breaking.

## Approach

**The behavioural findings come first and the wording follows.** Two findings change what the plugin does; the rest change what it says. Ordering the behaviour first means a bisect lands on a small commit, and it means the branch's riskiest edit is reviewed against the cleanest tree.

**Every check this branch adds is watched failing before its pass is trusted.** That is the repository's standing rule and it binds three places here: the hook's new bench cases, the posting script's new refusal, and the `via`-literal assertions. Each is fed the pre-fix input first.

**Findings are grouped by defect class, not by file.** A class fixed in one pass stays consistent; the same class fixed file by file drifts. So the pointer fixes land together, the count and position claims land together, and the cross-file contradictions land together, each as one commit spanning whatever files it touches.

**Five findings are deferred to their own issues rather than fixed here, and the reason is the same for all five: each is a file split, not a fix.** `PF-6` (`plugins/gh-solo/skills/pr-flow/SKILL.md` at 4,390 words against a roughly 3,500 cap, needing *Post caps* moved to a reference), `PF-7` (`plugins/gh-solo/skills/pr-flow/workflows/discuss.md` at 5,410 words holding two separately routed verbs, needing a watch workflow of its own), `TR-13` (`plugins/gh-solo/skills/tracker/references/standards.md` at 6,363 words read whole by two workflows needing a fraction), `TR-7` and `RV-5` in their structural halves. Splitting a file changes what every installed user loads and cannot be reviewed as a wording diff; bundling five such splits into a branch that also carries 50 wording fixes would make the whole branch unreviewable. Deferral with the reason recorded is what #55's fourth criterion permits, and it is the honest call rather than the convenient one.

**One finding cannot be closed by editing anything.** `PF-19` says the watch block's tool grant is asserted rather than observed: `allowed-tools` grants no bare `Bash` while the watch script opens with `mktemp`, and `plugins/gh-solo/skills/pr-flow/SKILL.md` states the friendlier of the two possible outcomes without saying it was watched. Settling it means arming the watch once and recording what happened, which this branch does at its end, since the chain arms a watch anyway.

**The version does not move.** `plugins/gh-solo/.claude-plugin/plugin.json` stays at `3.3.0`: that version is unreleased, no tag points at it, so nothing an installer could have fetched ships under a different number. Whether any fix here breaks a contract is the open question below.

## The triage

Fixed on this branch, grouped as the commits that will carry them.

**The hook, `plugins/gh-solo/hooks/ask-before-trunk-push.py`.** `AT-1`: `shlex` never emits `\n` as a token, so the `"\n"` entry in `OPERATORS` is dead code, a multi-line command collapses into one segment, and the unconditional `break` abandons it after the first `git`-basename token; the guard is silent on every multi-line command. `AT-2`: `branch_of` returns `None` for a bare `HEAD` destination, so `git push origin HEAD` from a trunk checkout is silent. `AT-3`: the `-c` test is `endswith("c")`, so `bash -ceu` is missed although bash still takes the script. `AT-4`: only `tokens[0]` is tested for a shell or `eval`, so `env bash -c` is missed, while the `git` scan in the same function correctly scans the whole segment. `AT-5` closes with `AT-1`: `plugins/gh-solo/README.md` states the guard's coverage unconditionally.

**The stack verbs, `plugins/gh-solo/skills/pr-flow/`.** `PF-1`: `sync` and `restack` both route to `gh stack sync`, which force-pushes - its own help states "Pushes all branches atomically (using --force-with-lease --atomic)" - while `gh stack rebase` is the separate subcommand that rebases without pushing. `plugins/gh-solo/skills/pr-flow/SKILL.md`, `plugins/gh-solo/skills/pr-flow/workflows/stack.md` and `plugins/gh-solo/skills/pr-flow/workflows/help.md` treat the two as one thing, `plugins/gh-solo/skills/pr-flow/workflows/stack.md` claims `gh stack push` is the only sanctioned force-push, and `plugins/gh-solo/skills/pr-flow/workflows/merge.md` recommends `sync --prune` after a stack merge. An owner mid-round on a stacked branch destroys the round's push-hold by typing the advertised verb.

**The checks that assert less than the docs claim.** `PF-4`: the appointed-command fixture in `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh` sets neither `severity_source` nor `severity_basis`, so it exercises a shape no legitimate producer can emit, while `plugins/gh-solo/skills/pr-flow/workflows/review.md` cites it as benching that case; and `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` does not refuse `severity: unrated` under `severity_source: "reviewer"`, which is the concrete shape of the dishonesty `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` says it refuses. `PF-5`: the `via` literals `round record` and `re-review record` are composed in one line of `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` and gate both the merge door and the already-reviewed filter, and no test asserts either appears, nor that the payload's `event` is `COMMENT`.

**Console output and tables.** `PF-2` and `TR-16`, per the owner's decision: `plugins/gh-solo/skills/pr-flow/SKILL.md`'s plain-text rule inverts to markdown, and every printed table in both skills is padded to align.

**Invocation frontmatter.** `RV-9`: `reviewer` gains `user-invocable: false`, and its `argument-hint` stops advertising a `rescope` invocation that cannot execute.

**Cross-file contradictions, where one file states something another denies.** `IM-1`: `plugins/gh-solo/skills/implement/workflows/fix.md` says `## Plan overview` is the one prose reaching the trunk, contradicted by `plugins/gh-solo/skills/pr-flow/workflows/merge.md`'s `squash_merge_commit_message: PR_BODY`, by `plugins/gh-solo/skills/pr-flow/workflows/open.md` twice, and by `plugins/gh-solo/skills/implement/workflows/implement.md` inside its own skill. `IM-2`: `plugins/gh-solo/skills/implement/workflows/implement.md` asserts *Post caps* binds a printed handoff, where `plugins/gh-solo/skills/pr-flow/SKILL.md` defines that cap's domain as the `via` line itself, which a print does not carry. `IM-8`: `plugins/gh-solo/skills/implement/SKILL.md` refuses on the plan's `## Verification` where the implemented refusal reads the PR body's. `PF-9`: `plugins/gh-solo/skills/pr-flow/workflows/discuss.md` adds a qualifier to the evidence-form conclusion that `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` and `plugins/gh-solo/skills/pr-flow/workflows/merge.md` both state unqualified. `RV-1`: `plugins/gh-solo/skills/reviewer/workflows/rescope.md` tells the reviewer to write a finding into the findings file that `plugins/gh-solo/skills/pr-flow/workflows/review.md` says must be left out entirely, and the 422 takes every verdict in the re-review down with it. `RV-2`: `plugins/gh-solo/skills/reviewer/SKILL.md` says a `needs_owner` finding stops the round, which it does not, and pairs the false claim with a deterrent. `RV-3` and `PF-3`, found independently by two reviewers: `plugins/gh-solo/agents/reviewer.md` forbids the prompt content that every rescope spawn is required to carry, and contradicts itself between its frontmatter and its body. `RV-4`: the finding `index` is defined without the contiguity `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` enforces, while three rules order findings dropped. `RV-15`: `plugins/gh-solo/skills/pr-flow/references/review-protocol.md` claims the reviewer has no write access, where the skill honestly says the grant cannot express read-only, and claims the re-review is spawned with a diff where every other file passes a commit range. `TR-1`: `plugins/gh-solo/skills/tracker/SKILL.md`'s assignment premise is contradicted by its own next sentence and by three other files.

**Pointers that cannot be followed.** `IM-4`: three `pr-flow` sites cite a "pre-spawn sync in the `implement` skill" that cannot exist, since that skill forbids subagents. `IM-10` and `PF-15`: two sites cite a `finish` *workflow* in `tracker` that is a routing argument into `plugins/gh-solo/skills/tracker/workflows/create.md`'s *Finishing a draft* section. `PF-8`: `plugins/gh-solo/skills/pr-flow/workflows/merge.md` cites step 4.2.1 of `plugins/gh-solo/skills/pr-flow/references/review-protocol.md`, which numbers its steps 1 to 8. `TR-15`: four cross-skill pointers give no way to resolve a sibling skill's path, one of them on a write path that needs the disclaimer's wording. `docs-check` catches none of these, because each is a prose name rather than a backticked path.

**Counts, positions and uniqueness claims.** `PF-10`, `PF-11`, `PF-12`, `PF-18`, `TR-9`, `TR-10`, and the uniqueness half of `IM-1`. Each is falsified by an edit made elsewhere, and each is replaced by naming members or by dropping the claim.

**Duplication with no named owner.** `IM-3` (an uncallable contract bullet), `IM-5` (a fourth copy of the plan-edit rule), `IM-7` (a grouping rule copied across a skill boundary), `RV-10` (one rule in three places), `RV-13` (three fetched fields nothing reads), `RV-14` (`Tools used` omits `Write` in both workflow files), `RV-16` (a value the reviewer must never use, taught at length), `TR-5` (a drifted second copy of the auto-trigger table), `TR-8` (a 309-word enumeration of another file's keys), `TR-11` and `TR-12`.

**The file's own history, and rationale that restates the rule.** `IM-6`, `IM-9`, `PF-13` and its twin inside `IM-2`, `RV-7`, `RV-11`, `RV-12`, `PF-16`, `PF-17`, `RV-6` in its divergence half.

**Behaviour in `tracker` that is wrong rather than merely unclear.** `TR-2`: an unrecognised argument routes into the issue-creating workflow, where the sibling skill routes it to help. `TR-3`: the startable query lacks `-label:epic`, so `next` can offer a container. `TR-4`: `plugins/gh-solo/skills/tracker/workflows/state.md` writes on an inferred trigger with no gate, fixed by the narrow rule rather than by `disable-model-invocation`, which #56 owns. `TR-6`: `plugins/gh-solo/skills/tracker/workflows/validate.md` hardcodes layer values this repository does not have.

**Cosmetic.** `AT-8`: `homepage` unset in the plugin manifest.

## Steps

- Fix `AT-1` in `plugins/gh-solo/hooks/ask-before-trunk-push.py`: cut segments on newlines before `shlex` sees them, and remove the unconditional `break` so a segment carrying more than one `git` invocation is scanned to its end. Then `AT-2`, `AT-3` and `AT-4` in the same file.
- Add the four shapes to `plugins/gh-solo/hooks/test-ask-before-trunk-push.sh`, watch each fail against the unfixed file first, then confirm they pass against the fixed one.
- Fix `PF-1`: map `restack` to `gh stack rebase` and `sync` to `gh stack sync`, state in `plugins/gh-solo/skills/pr-flow/workflows/stack.md` that `sync` pushes, add the refusal while a round holds unpushed fix commits, and correct the uniqueness claim in `plugins/gh-solo/skills/pr-flow/workflows/stack.md`, the equivalence claim in `plugins/gh-solo/skills/pr-flow/workflows/help.md` and the recommendation in `plugins/gh-solo/skills/pr-flow/workflows/merge.md`.
- Fix `PF-4` and `PF-5` in `plugins/gh-solo/skills/pr-flow/scripts/post-review.py` and `plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`, each new assertion watched failing first.
- Invert the console-output rule for `PF-2` and `TR-16`, and pad every printed table in both skills so its columns align.
- Set `user-invocable: false` on `reviewer` and narrow its `argument-hint`, for `RV-9`.
- Fix the cross-file contradictions as one pass, so both sides of each pair are edited together.
- Fix the unfollowable pointers as one pass, then grep for each pattern to confirm the set was whole.
- Fix the counts, positions and uniqueness claims as one pass.
- Fix the duplication findings, giving each fact one owner and pointing every other site at it.
- Fix the file's-own-history and restated-rationale findings.
- Fix `TR-2`, `TR-3`, `TR-4` and `TR-6`, and set `homepage` for `AT-8`.
- Open the deferral issues for `PF-6`, `PF-7`, `TR-13` and the structural halves of `TR-7` and `RV-5`, and record on #55 that each was deferred and why.
- Settle `PF-19` by arming the watch and recording what the grant actually did.
- Run every gate in `## Verification`, reading each exit code directly rather than through a pipe.

## Verification

- `bash plugins/gh-solo/hooks/test-ask-before-trunk-push.sh`, which must fail on the unfixed hook for each new case before it passes on the fixed one.
- `bash plugins/gh-solo/skills/pr-flow/scripts/test-post-review.sh`, same rule for each new assertion.
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md docs/plans --ignore '.claude/*' --ignore 'docs/plans*' --ignore '*GHI-50*'`, run from the repository root with its exit code read directly and never through a pipe.
- `python3 scripts/version-check.py`, which must report `plugins/gh-solo` moved, since this branch changes that package's own files.
- `python3 scripts/manifest-check.py`, owed because `AT-8` edits a manifest.
- `node scripts/check-descriptions.js plugins/gh-solo/skills` and, where Ruby is present, `ruby scripts/check-differential.rb plugins/gh-solo/skills`, both from the `skills-maker` skill's directory, owed because this branch edits frontmatter.
- `bash scripts/test-version-check.sh` and `bash scripts/test-manifest-check.sh` are **not** owed: this branch edits neither script.

**What none of these gates see.** Whether each wording fix says the true thing rather than merely a different thing. The description checks read frontmatter, `docs-check` reads paths and fences, and the two benches read the hook and the posting script; nothing mechanical can tell that `IM-1`'s replacement sentence is now correct about what reaches the trunk, or that a pointer rewritten to name a section names the right one. That is the review round's judgement. Nor can any gate see whether the five deferrals were the right calls: a deferral is a decision, and the only check on it is the owner reading the reason.

## Open questions

- **Does anything on this branch break a contract, and therefore make the tag a major rather than `3.3.0`?** Two candidates. `user-invocable: false` on `reviewer` removes a slash entrance that users could type, although `RV-9` establishes that the entrance never worked. Remapping `restack` from `gh stack sync` to `gh stack rebase` changes what an advertised verb does, although `PF-1` establishes the current mapping as a defect. Both read as fixes to me, which keeps the version at `3.3.0`; both are visible changes to an installed user, which is the argument for the other answer.
- **Are the five deferrals the right five?** They share one property - each is a file split rather than a fix - but `TR-7` and `RV-5` each also have a small half that could land here: trimming the essay in `tracker`'s "Who this is for" and deleting `reviewer`'s trailing `## Rules` recap are both wording edits. The plan above takes the small halves and defers the structural ones, which means two findings are split across two branches, and that is worth arguing with.
- **Should the findings have gone onto #55 as comments rather than into this plan?** The fourth criterion says triage is recorded on the issue. This plan is committed, public and survives in `git log` through the squash merge, where a comment does not, so it is the more durable record; #55 gets a short comment pointing here. If the criterion meant the issue literally, this needs redoing before the tag.
