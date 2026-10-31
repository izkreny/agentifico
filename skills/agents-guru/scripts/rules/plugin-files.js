// Each limit is the hooks page's, the plugins reference's, the plugin components page's or the plugin dependencies page's, at https://code.claude.com/docs/en/hooks, https://code.claude.com/docs/en/plugins/manifest-reference, https://code.claude.com/docs/en/plugins/components and https://code.claude.com/docs/en/plugins/dependencies.
import fs from "node:fs";
import path from "node:path";
import semver from "semver";
import YAML from "yaml";

// Only the events without matcher support are listed, because a stale copy of this list then misses a warning where a list of the supported events would flag a correct file on a new event.
const NO_MATCHER = new Set([
  "CwdChanged",
  "UserPromptSubmit",
  "PostToolBatch",
  "Stop",
  "TeammateIdle",
  "TaskCreated",
  "TaskCompleted",
  "WorktreeCreate",
  "WorktreeRemove",
  "MessageDisplay",
]);

// WHY: only the events the field has no effect on are listed, because a stale copy of this list then misses a warning and flags no correct file.
const NO_ON_FAILURE = new Set(["Stop", "SubagentStop", "TaskCompleted", "TeammateIdle"]);

// WHY: only the events a tool name is matched on are listed, because a stale copy of this list then misses a warning and flags no correct file.
const TOOL_EVENTS = new Set(["PreToolUse", "PostToolUse", "PostToolUseFailure", "PermissionRequest", "PermissionDenied"]);

const REPLACES = [
  ["commands", "commands"],
  ["agents", "agents"],
  ["outputStyles", "output-styles"],
  ["workflows", "workflows"],
  ["experimental.themes", "themes"],
  ["experimental.monitors", "monitors/monitors.json"],
];

const HEADER_VARIABLE = /\$\{([A-Za-z_]\w*)\}|\$([A-Za-z_]\w*)/g;

// WHY: a command's first word holding no path separator is the program, so what follows it is arguments, where a path with spaces has its separator before the first space.
const PROGRAM_THEN_MORE = /^[^\s/\\]+\s/;

const POWERSHELL_BARE = /\$(CLAUDE_(?:PROJECT_DIR|PLUGIN_ROOT|PLUGIN_DATA))\b/g;
const POWERSHELL_BRACED = /\$\{CLAUDE_(?:PROJECT_DIR|PLUGIN_ROOT|PLUGIN_DATA)\}/;
// WHY: strings are walked in order rather than searched for quotes, because a single quote inside a double-quoted string opens nothing.
const POWERSHELL_STRING = /"(?:`.|[^"`])*"|'([^']*)'/g;

const EXACT_MATCHER = /^[\w\- ,|]*$/;
const SERVER_PREFIX_ONLY = /^mcp__(?:(?!__).)*(?:__)?$/;
// WHY: each key is tested whole rather than a segment captured, because a key may hold a dot or a space, and a wildcard may follow it only at the end of the part or a longer name would read as the key.
const namesServer = (part, server) => new RegExp(`^(?:\\^|\\(\\?:|\\()*mcp__${RegExp.escape(server)}(?:__|(?:\\.[*+])?[)$]*$)`).test(part);
// WHY: a tool name turns any other character in the key into an underscore, so a matcher written for the tool carries that form.
const toolSpelling = (name) => name.replace(/[^\w-]/g, "_");

export const isPluginRoot = (dir) => fs.statSync(path.join(dir, ".claude-plugin"), { throwIfNoEntry: false })?.isDirectory() ?? false;

// JSON.parse decides whether a file is read, because the yaml parser accepts what JSON rejects and is used only to place each key on its line.
function read(source) {
  try {
    JSON.parse(source);
  } catch {
    return null;
  }
  const lineCounter = new YAML.LineCounter();
  const doc = YAML.parseDocument(source, { lineCounter, uniqueKeys: false });
  return { root: doc.contents, lineOf: (node) => lineCounter.linePos(node.range[0]).line };
}

// Stryker disable next-line OptionalChaining: read() admits only JSON, whose every key is a scalar.
const pairOf = (map, key) => (YAML.isMap(map) ? map.items.find((pair) => pair.key?.value === key) : undefined);
// Stryker disable next-line ArrayDeclaration: an item that is no map is skipped wherever items are read, so a stray one changes nothing.
const itemsOf = (node) => (YAML.isSeq(node) || YAML.isMap(node) ? node.items : []);

const namesUserConfig = (pair) => String(pair?.value.value).includes(`\${user_config.`);

const jsonIn = (pluginDir, file) => {
  try {
    // Stryker disable next-line StringLiteral: JSON.parse reads the buffer an empty encoding returns just the same.
    return JSON.parse(fs.readFileSync(path.resolve(pluginDir, file), "utf8"));
  } catch {
    return null;
  }
};

export function ownServers(pluginDir) {
  // WHY: a bundle or a URL fails to read as JSON, so it needs no test of its own and adds no name.
  const declared = [jsonIn(pluginDir, ".claude-plugin/plugin.json")?.mcpServers]
    .flat()
    .map((entry) => (typeof entry === "string" ? jsonIn(pluginDir, entry) : entry));
  const names = [jsonIn(pluginDir, ".mcp.json"), ...declared].flatMap((config) => Object.keys(config?.mcpServers ?? config ?? {}));
  return new Set(names.flatMap((name) => [name, toolSpelling(name)]));
}

function matcherRules(matcher, event, own, report) {
  if (matcher && NO_MATCHER.has(event)) report(matcher, `matcher on ${event} is silently ignored: the event has no matcher support`);
  const matched = matcher?.value.value;
  if (!TOOL_EVENTS.has(event) || typeof matched !== "string") return;
  const parts = matched.split(/[|,]/).map((part) => part.trim());
  if (EXACT_MATCHER.test(matched))
    for (const part of parts.filter((each) => SERVER_PREFIX_ONLY.test(each)))
      report(matcher, `matcher part ${part} is compared as an exact tool name, so it matches no tool: add the .* a server prefix needs`);
  for (const part of parts)
    for (const server of own)
      if (namesServer(part, server))
        report(
          matcher,
          `matcher names the plugin's own MCP server ${server} by its bare key, so it never fires: write mcp__plugin_<plugin-name>_${toolSpelling(server)}__`,
        );
}

function fieldRules(hook, event, report) {
  const type = hook.get("type");
  const async = pairOf(hook, "async");
  if (async && type !== "command") report(async, `async on a ${type} hook is ignored: it is available on command hooks only`);
  const onFailure = pairOf(hook, "onFailure");
  if (onFailure && NO_ON_FAILURE.has(event))
    report(onFailure, `onFailure on ${event} has no effect: exit code 2 there sends Claude back to work, and Claude can't repair a hook that won't run`);
  const background = ["async", "asyncRewake"].find((field) => hook.get(field) === true);
  if (onFailure && type === "command" && background)
    report(onFailure, `onFailure on a command hook that sets ${background} has no effect: it runs in the background`);
  const once = pairOf(hook, "once");
  if (once) report(once, "once is ignored in a plugin's hooks file: Claude Code honours it only in a skill's frontmatter");
  const headers = pairOf(hook, "headers");
  // Stryker disable next-line BooleanLiteral: get() returns a sequence as its node either way, and a scalar holds no items either way.
  const allowed = new Set(itemsOf(hook.get("allowedEnvVars", true)).map((item) => item.value));
  for (const header of itemsOf(headers?.value)) {
    if (typeof header.value?.value !== "string") continue;
    for (const [, braced, bare] of header.value.value.matchAll(HEADER_VARIABLE))
      if (!allowed.has(braced ?? bare))
        report(header, `header ${header.key.value} names ${braced ?? bare}, which allowedEnvVars does not list, so it is sent empty`);
  }
}

function commandRules(hook, report) {
  if (hook.get("type") !== "command") return;
  const command = pairOf(hook, "command");
  const execForm = pairOf(hook, "args");
  const text = String(command?.value.value);
  if (execForm) {
    if (PROGRAM_THEN_MORE.test(text))
      report(command, "command holds more than the program while args is set, so the spawn fails: move the extra words into args");
    return;
  }
  if (namesUserConfig(command))
    report(command, `command names \${user_config.*} in shell form, so the hook fails instead of running: set args, or read $CLAUDE_PLUGIN_OPTION_<KEY>`);
  if (hook.get("shell") !== "powershell") return;
  for (const [, name] of text.matchAll(POWERSHELL_BARE))
    report(
      command,
      `command names a bare $${name}, which Claude Code does not rewrite, so PowerShell resolves it to $null unless it is escaped or single-quoted: write \${${name}} or $env:${name}`,
    );
  for (const [, singleQuoted] of text.matchAll(POWERSHELL_STRING)) {
    const placeholder = singleQuoted?.match(POWERSHELL_BRACED);
    if (placeholder) report(command, `command holds ${placeholder[0]} inside single quotes, where PowerShell never expands it: use double quotes`);
  }
}

function serverRule(hook, own, report) {
  const server = pairOf(hook, "server");
  if (hook.get("type") === "mcp_tool" && own.has(server?.value.value))
    report(server, `server ${server.value.value} names the plugin's own MCP server by its bare key: write plugin:<plugin-name>:${server.value.value}`);
}

export function hooksDefects(source, own = new Set()) {
  const file = read(source);
  if (!file) return [];
  const found = [];
  const report = (pair, detail) => found.push({ line: file.lineOf(pair.key), detail });
  const events = pairOf(file.root, "hooks")?.value;
  if (!YAML.isMap(events)) return found;
  for (const { key, value: groups } of events.items) {
    for (const group of itemsOf(groups)) {
      matcherRules(pairOf(group, "matcher"), key.value, own, report);
      for (const hook of itemsOf(pairOf(group, "hooks")?.value)) {
        if (!YAML.isMap(hook)) continue;
        fieldRules(hook, key.value, report);
        commandRules(hook, report);
        serverRule(hook, own, report);
      }
    }
  }
  return found;
}

export const filesIn = (location) => {
  const stat = fs.statSync(location, { throwIfNoEntry: false });
  if (!stat) return [];
  if (stat.isFile()) return [location];
  // A symlink is stated through, because a Dirent reports the link rather than the file it points at.
  const isFile = (entry) =>
    entry.isFile() || (entry.isSymbolicLink() && fs.statSync(path.join(entry.parentPath, entry.name), { throwIfNoEntry: false })?.isFile());
  // A file or folder named with a leading dot is skipped as the walk skips one, because a placeholder such as .gitkeep is no component and nothing could silence its warning.
  const hidden = (file) =>
    path
      .relative(location, file)
      .split(path.sep)
      .some((part) => part.startsWith("."));
  return fs
    .readdirSync(location, { recursive: true, withFileTypes: true })
    .filter(isFile)
    .map((entry) => path.join(entry.parentPath, entry.name))
    .filter((file) => !hidden(file));
};

// A commands object maps each name to a source, so its paths are the sources rather than the names.
const pathsOf = (value) =>
  typeof value === "string"
    ? [value]
    : Array.isArray(value)
      ? value.filter((item) => typeof item === "string")
      : value && typeof value === "object"
        ? Object.values(value).flatMap((entry) => (typeof entry?.source === "string" ? [entry.source] : []))
        : [];

const monitorDefects = (monitors, lineOf) =>
  itemsOf(monitors)
    .map((monitor) => pairOf(monitor, "command"))
    .filter(namesUserConfig)
    .map((command) => ({
      line: lineOf(command.key),
      detail: `monitor command names \${user_config.*}, so the monitor fails instead of running: its script has to obtain the value on its own`,
    }));

export function monitorFileDefects(source) {
  const file = read(source);
  return file ? monitorDefects(file.root, file.lineOf) : [];
}

// WHY: inline monitors are the manifest's own findings, so only a key holding a path, or no key at all, leaves a file to read.
export function monitorsFile(pluginDir) {
  const manifest = jsonIn(pluginDir, ".claude-plugin/plugin.json");
  const monitors = manifest?.experimental?.monitors ?? manifest?.monitors ?? "monitors/monitors.json";
  return typeof monitors === "string" ? monitors : undefined;
}

export function manifestDefects(source, pluginDir) {
  const file = read(source);
  if (!file) return [];
  const found = [];
  for (const [key, folder] of REPLACES) {
    const segments = key.split(".");
    const pair = pairOf(segments.length > 1 ? pairOf(file.root, segments[0])?.value : file.root, segments.at(-1));
    if (!pair) continue;
    const location = path.resolve(pluginDir, folder);
    // Stryker disable next-line OptionalChaining: read() admits only JSON, where a key always has a value node.
    const listed = pathsOf(pair.value?.toJSON()).map((p) => path.resolve(pluginDir, p));
    const loaded = (entry) => listed.some((p) => entry === p || entry.startsWith(p + path.sep));
    const held = filesIn(location);
    const ignored = held.filter((entry) => !loaded(entry));
    if (!ignored.length) continue;
    // A folder dropped whole is an error, because no plugin means to lose every file in it, while a file left beside a listed one is a warning, since a plugin may leave it out on purpose.
    if (ignored.length === held.length) {
      found.push({
        line: file.lineOf(pair.key),
        severity: "error",
        detail: folder.endsWith(".json")
          ? `${key} replaces the default ${folder}, which Claude Code now ignores`
          : `${key} replaces the default ${folder}/, which still holds files Claude Code now ignores`,
      });
      continue;
    }
    // Each file is named even where a listed path inside the folder silences Claude Code's own warning, because that file still never loads.
    for (const each of ignored)
      found.push({
        line: file.lineOf(pair.key),
        severity: "warning",
        detail: `${key} replaces the default ${folder}/, so Claude Code ignores ${path.relative(pluginDir, each)}`,
      });
  }
  for (const entry of itemsOf(pairOf(file.root, "dependencies")?.value)) {
    const version = pairOf(entry, "version");
    if (version && !semver.validRange(version.value.value))
      found.push({ line: file.lineOf(version.key), detail: `dependency version ${String(version.value)} is not a node-semver range such as ~2.1.0` });
  }
  const monitors = pairOf(pairOf(file.root, "experimental")?.value, "monitors") ?? pairOf(file.root, "monitors");
  found.push(...monitorDefects(monitors?.value, file.lineOf));
  return found;
}
