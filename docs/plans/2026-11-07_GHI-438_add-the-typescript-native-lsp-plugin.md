> 🤖 Written by AI --- read/modified by izkreny! 🤓

# Add the typescript-native-lsp plugin

Issue #438 holds the acceptance criteria. This plan says how.

## Approach

The plugin is a manifest and a README. `plugins/typescript-native-lsp/.claude-plugin/plugin.json` (new) declares one server under `lspServers`, keyed `typescript` as the official plugin's is. Its `command` is `tsc`, its `args` are `--lsp` and `--stdio`, and its `extensionToLanguage` map is the official one, entry for entry. The server config is inline, as upstream's is, so the plugin carries no separate LSP config file. The package starts at version 1.0.0, as glossary-guru did.

The manifest is adapted from the official `typescript-lsp` manifest at commit `cb421c81df4274fd28fd1ead817bc6ffea723fed` of `anthropics/claude-plugins-official`. `plugins/typescript-native-lsp/README.md` (new) credits it by that permalink. The README also states what AC3 asks for, and gives the install lines in gh-solo's form.

`tsc --lsp --stdio` was probed with one `initialize` request. It first sends a `window/logMessage` notification, then the reply with `id` 1, whose `serverInfo` names `typescript-go` 7.0.2. So the test reads messages until it finds the reply rather than taking the first one.

`plugins/typescript-native-lsp/tests/test-manifest.py` (new) is the test for AC1 and AC2. For AC1 it asserts that the manifest maps exactly the eight extensions, and that the marketplace lists the plugin at its own directory. For AC2 it starts the manifest's own `command` and `args`, sends `initialize`, and asserts a `capabilities` object in the reply. End of output before a reply, and no reply within a timeout, both fail it rather than hang it.

The repository-level edits are the marketplace entry, the root README row, and the label row and query exclusion in `.agents/gh-solo.md`. N4 on the issue records the owner's approval for those. Q1 asks about the two other `.agents/gh-solo.md` edits, and nothing lands there before it is answered.

## Steps

- ::S1:: Write `plugins/typescript-native-lsp/.claude-plugin/plugin.json` (new) with `name`, `version` 1.0.0, `description`, `author`, `repository`, `homepage`, `license`, `keywords` and the inline `lspServers` entry
- ::S2:: Add the plugin's entry to `.claude-plugin/marketplace.json`, with `name`, `source`, `description`, `category` and `tags` matching the manifest, and no `version`
- ::S3:: Write `plugins/typescript-native-lsp/tests/test-manifest.py` (new), each test line naming `GHI-438` and its criterion
- ::S4:: Write `plugins/typescript-native-lsp/README.md` (new): the requirement of TypeScript 7 or later on `PATH`, disabling the official `typescript-lsp` beside it, checking with the `tsc` on `PATH` rather than a project's pinned one, the install lines, and a `## Sources` section
- ::S5:: Add the `typescript-native-lsp` row to the package table in `README.md`, with the marketplace route
- ::S6:: Add the `typescript-native-lsp` row to the label table in `.agents/gh-solo.md`, and its exclusion to the mandatory-axis audit query

## Verification

- ::V1:: `python3 plugins/gh-solo/skills/pr-flow/scripts/plan-check.py docs/plans/2026-11-07_GHI-438_add-the-typescript-native-lsp-plugin.md`
- ::V2:: `python3 plugins/gh-solo/skills/pr-flow/scripts/docs-check.py plugins/gh-solo plugins/typescript-native-lsp .agents/gh-solo.md .agents/dependencies.md AGENTS.md $(git diff --name-only origin/main...HEAD -- docs/plans) --plans docs/plans`
- ::V3:: `python3 scripts/version-check.py`
- ::V4:: `python3 scripts/manifest-check.py`
- ::V5:: `claude plugin validate plugins/typescript-native-lsp`
- ::V6:: `node skills/agents-guru/scripts/check.js plugins/typescript-native-lsp`
- ::V7:: `python3 plugins/typescript-native-lsp/tests/test-manifest.py`, watched failing with the manifest's `command` set to `true`, which exits at once, and again with it set to `cat`, which echoes the request back and never replies

V2 adds the new plugin to the repository's docs-check targets on this branch only. V6 needs `npm --prefix skills/agents-guru ci` and Vale on `PATH`. No gate here installs the plugin from the marketplace, which is what AC1 names. The agent's proxy is the AC1 test and a session loaded with `claude -p --plugin-dir plugins/typescript-native-lsp`; the install from the marketplace is the owner's own step. The criteria gate is off here, since `.agents/gh-solo.md` carries no `Test files:` line. Whether the README reads clearly is no gate's to see.

## Open questions

- ::Q1:: **May this branch also add `plugins/typescript-native-lsp` to the agents-guru check list in `.agents/gh-solo.md`, once V6 exits zero, and add the plugin's test as a bench there?** N6 states when the package joins the list, and nothing records the test as owed by later branches. I recommend both, on this branch, since each describes the package this branch adds.

## Settled

- **Q1, whether this branch also adds `plugins/typescript-native-lsp` to the agents-guru check list in `.agents/gh-solo.md` and the plugin's test as a bench there.** Both, on this branch. Settled by the owner in the terminal on 2026-11-07.
