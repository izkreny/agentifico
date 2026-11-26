> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Say /reload-plugins loads the server

Issue #443 holds the acceptance criteria. This plan says how.

## Approach

The last line of the Install section in `plugins/typescript-native-lsp/README.md` tells the user to start a new session. It becomes one sentence offering both routes: start a new session, or run `/reload-plugins` in the current one. N1 on the issue is the evidence that the second route loads the server.

The plugin's `version` in `plugins/typescript-native-lsp/.claude-plugin/plugin.json` moves from `1.0.0` to `1.0.1`. The change fixes an instruction and adds no behaviour, so it is a patch. The marketplace entry carries no `version`, so `.claude-plugin/marketplace.json` stays as it is.

## Steps

- ::S1:: Rewrite the last line of the Install section in `plugins/typescript-native-lsp/README.md` to say: start a new session, or run `/reload-plugins`, to load the server
- ::S2:: Move `version` in `plugins/typescript-native-lsp/.claude-plugin/plugin.json` from `1.0.0` to `1.0.1`

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-26_GHI-443_say-reload-plugins-loads-the-server.md`
- ::V2:: `node skills/agents-guru/scripts/check.js plugins/typescript-native-lsp`
- ::V3:: `python3 plugins/typescript-native-lsp/tests/test-manifest.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `python3 scripts/version-check.py`
- ::V6:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`

No gate can see whether `/reload-plugins` still loads the server on a later Claude Code; N1 records the one run that showed it.

## Open questions

None.

## Settled

None yet.
