> 🤖 Written by AI --- read/modified by izkreny! 🤓

# typescript-native-lsp

TypeScript and JavaScript code intelligence for Claude Code, from the language server built into the `tsc` of TypeScript 7.0. It gives Claude go-to-definition, find references, symbols and diagnostics for .ts, .tsx, .mts, .cts, .js, .jsx, .mjs and .cjs files.

The official `typescript-lsp` plugin starts `typescript-language-server`, which wraps the `tsserver` that TypeScript 6.0 and older ship. TypeScript 7.0 ships no `tsserver`, so with only TypeScript 7.0 installed that plugin never starts. Its `tsc` speaks the Language Server Protocol itself, as `tsc --lsp --stdio`. This plugin starts that instead, so you need neither `typescript-language-server` nor an older TypeScript.

## Requirements

- **TypeScript 7.0 or later, with its `tsc` on `PATH`.** An older `tsc` has no `--lsp` flag, so the server fails to start.
- **Node.js on `PATH`**, since the `tsc` command is a Node.js script that starts the native server.

**It checks code with the `tsc` on the `PATH` of the shell you start `claude` from, not the version a project pins in its own `node_modules`.** The manifest names `tsc`, so Claude Code runs whichever one that `PATH` finds. A version manager can set that `PATH` per project, and a project it pins to an older TypeScript gets no server at all.

## Install

Install TypeScript 7.0 or later globally first, with npm where Node.js is already installed:

```bash
npm install -g typescript@7
```

Or with [mise](https://mise.jdx.dev), which installs Node.js too, in a shell where mise is activated:

```bash
mise use -g node
mise use -g npm:typescript@7
```

Then the plugin:

```bash
claude plugin marketplace add izkreny/agentifico
claude plugin install typescript-native-lsp@agentifico
```

**Use it instead of the official `typescript-lsp`, and disable that one if you have it installed.** Both claim the same file extensions, so keep only one of them enabled:

```bash
claude plugin disable typescript-lsp@claude-plugins-official
```

Start a new session afterwards, since a plugin's server loads when a session starts.

## Use

Nothing is typed. The server starts the first time Claude edits a file with one of these extensions, and from then on Claude gets the errors and warnings it reports after each edit. If none ever appear, run `/plugin` and open its **Errors** tab, where `Executable not found in $PATH: "tsc"` means no `tsc` is on that `PATH`.

## Sources

The manifest is adapted from the official plugin's: the same server name and the same extension map, with `tsc --lsp --stdio` as the command. The link is pinned to the upstream commit it was adapted from, so a later version can be compared against it.

| Source | What it gave | Licence |
| --- | --- | --- |
| anthropics/claude-plugins-official _[typescript-lsp](https://github.com/anthropics/claude-plugins-official/tree/cb421c81df4274fd28fd1ead817bc6ffea723fed/plugins/typescript-lsp)_ | The `lspServers` entry and its extension map | [Apache 2.0](assets/LICENSE-claude-plugins-official.txt) |
