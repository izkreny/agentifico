> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Answer which new agnix rules the check should state

Issue [#308](https://github.com/izkreny/agentifico/issues/308), a spike and a child of epic #329.

## Where this branch sits

**It is cut from the tip of `chore/GHI-231_add-stryker-to-bench`, and it sits on stack #359 above that branch.** #308 is blocked by #231, and the issue's own `## Dependencies` says that records the stack's order rather than a need for #231's work. That is the exception *An epic child's blocker is its stack parent, not a wait* in `.agents/gh-solo.md` names, so the blocker does not stop the branch. The trunk sitting ahead of this branch is normal for a stack and is not recovered here.

## What this branch carries

This plan and nothing else. The deliverable is a comment on #308 and the follow-up issues it names. The issue rules out a rule as a deliverable, so anything the reading writes into the tree is reverted and no package version moves.

## The source

**The catalogue is [knowledge-base/rules.json](https://github.com/agent-sh/agnix/blob/v0.59.3/knowledge-base/rules.json) in agnix at tag `v0.59.3`, the latest release.** It adds no rule beyond `v0.59.1` in the five categories the issue names, so the candidates are the 36 rules #308 lists. The issue's range `CC-SK-023` to `CC-SK-034` skips `CC-SK-026` and `CC-SK-029` because neither id exists in any category at that tag. Between `v0.59.1` and `v0.59.3` one existing rule changed, `CC-HK-025`, and only its `verified_on` date.

**Each rule's implementation is read too**, from the agnix source at the same tag. The catalogue says what a rule claims; the code says what it reports.

## How a rule gets its verdict

**#223's settled decisions stand as method**, recorded under `## Settled` in `docs/plans/2026-10-08_GHI-223_agnix-rules-for-the-check.md`:

- Only `spec` and `vendor_docs` evidence makes a rule a candidate. `AS-027` cites vendor code, so it is skipped on that alone.
- A rule is never skipped because no file here uses what it judges.
- A rule that copies a vendor's list of valid values does not port, since the list goes stale. A list that only narrows a warning can.
- `claude plugin validate --strict` is run on every manifest and hooks rule, and a rule it already reports ports as prose pointing at it.

**Every candidate's cited page is re-read**, never trusted from the catalogue. A rule the page does not support is skipped with that reason.

**A rule that ports names its destination.** A mechanical rule goes under `skills/agents-guru/scripts/rules/`, and a hooks or manifest rule builds on the reader in `skills/agents-guru/scripts/rules/plugin-files.js`. A judgement goes in `skills/agents-guru/workflows/new.md` or `skills/agents-guru/workflows/review.md`.

**A rule the check already states is marked already owned**, after confirming that the named check rule really fires on the rule's bad example.

## Running agnix here

The installed agnix runs over `plugins/` and `skills/`. A report that is wrong, or a rule that misfires on a valid file, is an upstream defect. Each one is reproduced first, and checked against the open and closed issues in `agent-sh/agnix` so nothing is reported twice.

## The credit to agnix

No file in the repository credits agnix today, though #278 to #281 built rules from its catalogue. The credit is a package change, so it does not land on this branch. It goes into the follow-up issues as a criterion of the first one that edits `skills/agents-guru/README.md`, or as its own issue when nothing ports.

## Staged for the owner

Everything posted under the owner's name is drafted first and posted on their word:

- the verdict comment on #308;
- the follow-up issue bodies;
- one upstream issue in `agent-sh/agnix` carrying every defect found, as one report rather than several.

## Steps

- Read the 36 rules from the catalogue at `v0.59.3`, with their implementations, one row per rule.
- Skip each rule whose evidence is a vendor's code or community practice.
- Re-read the cited page of every remaining candidate, and run the validator on each manifest and hooks rule.
- Give each candidate a verdict, naming the destination file of each rule that ports and the page that was re-read.
- Run agnix over `plugins/` and `skills/`, and reproduce every defect it shows.
- Draft the verdict comment, the follow-up issues with the agnix credit, and the one upstream issue, for the owner.
- Post each draft on the owner's word.
- Revert anything the reading wrote into the tree.

## Verification

- `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py $(git diff --name-only origin/main...HEAD -- docs/plans)`
- `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- `python3 scripts/version-check.py`
- `git diff --quiet origin/chore/GHI-231_add-stryker-to-bench...HEAD -- plugins skills scripts` exits zero, so this branch changed no package and no check.

The gates cannot tell whether a verdict is right. Whether a page supports a rule is a reading the owner judges on the comment.

## Open questions

None.

## Settled

None yet.
