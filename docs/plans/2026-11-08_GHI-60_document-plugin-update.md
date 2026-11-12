> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Document how to update the plugin

Issue #60 holds the acceptance criteria. This plan says how.

## Approach

`plugins/gh-solo/README.md` gets an `## Update` section directly after `## Install`, written to someone who installed the plugin. It gives the two steps in both forms and says the catalog refresh alone installs nothing. It names **Update marketplace** on the `/plugin` Marketplaces tab as the one action that does both for every plugin from this marketplace, since no command updates every plugin at once. It also covers restart and `/reload-plugins`, the auto-update toggle and its off default, and the 14-day sweep of the old cache directory.

Every command is checked against `claude plugin --help` and `claude plugin marketplace --help`, and every behaviour against the pages #60 cites in N3. `claude plugin prune` stays out, since it removes dependencies rather than old versions. The change is documentation for installers, so the version moves its patch, from 5.3.1 to 5.3.2.

## Steps

- ::S1:: Add the `## Update` section to `plugins/gh-solo/README.md`, directly after `## Install`
- ::S2:: Move `version` in `plugins/gh-solo/.claude-plugin/plugin.json` to 5.3.2

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-08_GHI-60_document-plugin-update.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `node skills/agents-guru/scripts/check.js plugins/gh-solo`
- ::V6:: `git grep -q -F '/plugin marketplace update agentifico' -- plugins/gh-solo/README.md && git grep -q -F '/plugin manage' -- plugins/gh-solo/README.md && git grep -q -F 'claude plugin marketplace update agentifico' -- plugins/gh-solo/README.md && git grep -q -F 'claude plugin update gh-solo@agentifico' -- plugins/gh-solo/README.md` exits 0, watched exiting 1 on the tree before S1
- ::V7:: `git grep -n 'prune' -- plugins/gh-solo/README.md` exits 1, watched exiting 0 with `prune` inserted into the new section as a mutation
- ::V8:: `git grep -n -F '/plugin update' -- plugins/gh-solo/README.md` exits 1, watched exiting 0 with that string inserted into the new section as a mutation

V6 proves the four update commands are present, not that the prose around them is right. Whether the section reads as instructions to an installer, and whether each behaviour claim matches the cited docs, is the review round's to judge. The criteria gate is off, since `.agents/gh-solo.md` carries no `Test files:` line.

## Open questions

None.

## Settled

- ::Q1:: Is the in-session update `/plugin update gh-solo@agentifico`? No: `update` has no session form, so the session path is **Update now** on the Installed tab, and #60's AC1 was reworded to match.
