> 🤖 Written by AI --- read/modified by izkreny! 🤓

# typescript-native-lsp

TypeScript and JavaScript code intelligence for Claude Code, from the language server built into the `tsc` of TypeScript 7.0. It gives Claude go-to-definition, find references, symbols and diagnostics for .ts, .tsx, .mts, .cts, .js, .jsx, .mjs and .cjs files.

The official `typescript-lsp` plugin starts `typescript-language-server`, which wraps the `tsserver` that TypeScript 6.0 and older ship. TypeScript 7.0 ships no `tsserver`, so with only TypeScript 7.0 installed that plugin never starts. Its `tsc` speaks the Language Server Protocol itself, as `tsc --lsp --stdio`. This plugin starts that instead, so you need neither `typescript-language-server` nor an older TypeScript.

## Requirements

- **TypeScript 7.0 or later, with its `tsc` on `PATH`.** An older `tsc` has no `--lsp` flag, so the server fails to start.

**It checks code with whichever `tsc` is on `PATH`, not the version a project pins in its own `node_modules`.** Claude Code starts the command from the plugin's manifest, and the manifest names `tsc`, so a project that pins a different TypeScript is checked by your global one.

## Install

```bash
claude plugin marketplace add izkreny/agentifico
claude plugin install typescript-native-lsp@agentifico
```

**Use it instead of the official `typescript-lsp`, and disable that one if you have it installed.** Both claim the same file extensions, so keep only one of them enabled:

```bash
claude plugin disable typescript-lsp@claude-plugins-official
```

## Sources

The manifest is adapted from the official plugin's: the same server name and the same extension map, with `tsc --lsp --stdio` as the command. The link is pinned to the upstream commit it was adapted from, so a later version can be compared against it.

| Source | What it gave | Licence |
| --- | --- | --- |
| anthropics/claude-plugins-official _[typescript-lsp](https://github.com/anthropics/claude-plugins-official/tree/cb421c81df4274fd28fd1ead817bc6ffea723fed/plugins/typescript-lsp)_ | The `lspServers` entry and its extension map | [Apache 2.0](assets/LICENSE-claude-plugins-official.txt) |
