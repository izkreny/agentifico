> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Sweep action-policy-guru before its first tag

Issue [#379](https://github.com/izkreny/agentifico/issues/379). It has no parent and no blockers, so this branch is cut from `main` and is not stacked.

## The sweep

A reviewer subagent ran `skills/agents-guru/workflows/review.md` over `skills/action-policy-guru` at de67850, inline and whole, and is kept resumable for its Step 5. It read `<skill-dir>/assets/llms-full.txt` whole and held the claims against the action_policy 0.7.7 source too, since #374 showed the bundle can be wrong. The check and the upstream bench both exit 0. The findings are recorded on the issue as SW1 to SW10, and each is fixed here:

- **SW1.** `<skill-dir>/references/caching.md` states what per-thread memoization covers, which is `policy_for` calls from a behaviour across its instances in a thread. A rule composed through `allowed_to?` builds a new policy on each call, marked as observed on 0.7.7 where upstream says otherwise, with `action_policy.init` as the way to measure it.
- **SW2.** `<skill-dir>/SKILL.md` scopes its defect sentence: a claim that disagrees with the cited page without naming a gem version it was observed on is the defect, and an observed claim outranks the page, which is what `<skill-dir>/README.md` already says.
- **SW3.** `<skill-dir>/references/scoping.md` states the real condition, a target with no policy of its own, for `authorized_scope` and `authorized` alike, and names `with:` as the way out. The sentence leaves the `authorized` paragraph.
- **SW4.** `<skill-dir>/references/testing.md` points a Minitest codebase at the two assertions and the bundle's section, and `<skill-dir>/README.md` records under its deliberate choices that the file is RSpec-first because its claims were run on RSpec.
- **SW5.** `<skill-dir>/README.md` splits the sentence: a typo is denied, while a missing `authorize!` or an unscoped `index` fails open.
- **SW6.** `<skill-dir>/references/rails.md` says a channel's `authorize!` requires `to:` and has no implicit target.
- **SW7.** `<skill-dir>/references/caching.md` says `cache(user) { ... }` raises `NoMethodError` where no store is set, unlike a cached rule.
- **SW8.** The links in `<skill-dir>/references/caching.md`, `<skill-dir>/references/rails.md` and `<skill-dir>/references/scoping.md` become code spans holding the path from the skill's directory, so the check reads them.
- **SW9.** The citation under *Applying a policy* in `<skill-dir>/SKILL.md` adds the upstream pages quick_start.md and reasons.md.
- **SW10.** `<skill-dir>/references/testing.md` writes `<repo-root>/spec/policies`.

`metadata.version` moves from `1.0.0` to `1.0.1`, since every fix corrects a statement and none changes what an installer's skill fires on or offers.

SW4 takes the pointer rather than full Minitest coverage, since covering it would mean running every testing claim on a second framework, which is new work rather than a sweep's fix.

## Steps

- Probe SW1's and SW3's new claims on action_policy 0.7.7 before writing them, since each is a new observed claim.
- Fix SW1 to SW10, citing each id in its commit.
- Move `metadata.version` to `1.0.1`.
- Resume the sweep reviewer on the fix commits for a verdict per finding, per `skills/agents-guru/workflows/review.md` Step 5.
- Record the verdicts on the issue.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `node skills/agents-guru/scripts/check.js skills/action-policy-guru`
- `bash skills/action-policy-guru/scripts/test-check-upstream.sh`

Most fixes are prose, which no gate reads for meaning, so the resumed reviewer's verdicts judge those. The check cannot say whether an observed claim is true, which the probes do, and they run without Rails, so a controller's behaviour is mirrored by including the same modules rather than run in an app.

## After the review round

The Vale re-mine is this pull request's last task, run after the round's fixes are pushed and before the merge, so it can read the round's own threads. The package has no tag, so it reads the whole trunk history, per *How a phrase list grows* in `skills/agents-guru/references/maintaining.md`, along with this issue's findings, this pull request's threads and this branch's fix commits. New tokens go on an `agents-guru` issue opened from this one and none land on this branch, per *The skill review is its own issue, not a branch's gate* in `.agents/gh-solo.md`. The issue records what was read.

## Open questions

None.

## Settled

None yet.
