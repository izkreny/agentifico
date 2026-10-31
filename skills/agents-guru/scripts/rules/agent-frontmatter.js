// Each limit is the sub-agents page's or the plugin components page's, at https://code.claude.com/docs/en/sub-agents and https://code.claude.com/docs/en/plugins/components.
import fs from "node:fs";
import path from "node:path";
import { FRONTMATTER_LINE, frontmatter, parsed } from "./frontmatter.js";
import { filesIn, isPluginRoot } from "./plugin-files.js";

const PLUGIN_IGNORES = ["permissionMode", "hooks", "mcpServers", "initialPrompt"];
const NAME_LIMIT = 256;

// The nearest agents folder decides, because both kinds of agents directory are scanned recursively.
function agentFolder(file) {
  const parts = path.resolve(file).split(path.sep);
  for (let i = parts.length - 2; i > 0; i--) {
    if (parts[i] !== "agents") continue;
    const folder = parts.slice(0, i + 1).join(path.sep);
    if (parts[i - 1] === ".claude") return { kind: "standalone", folder };
    if (isPluginRoot(parts.slice(0, i).join(path.sep) || path.sep)) return { kind: "plugin", folder };
  }
  return null;
}

// A specifier can hold a comma, as in Agent(a, b), so entries are matched in the text rather than split on commas.
const SPECIFIED = /[^\s,()]+\([^)]*\)?/g;

const specifierDefects = (value) =>
  [value]
    .flat()
    .filter((entry) => typeof entry === "string")
    .flatMap((entry) => entry.match(SPECIFIED) ?? [])
    .map((entry) => `disallowedTools entry ${JSON.stringify(entry)} removes the whole tool, not only what it names: a permissions.deny rule blocks only that`);

// Stryker disable next-line ArrayDeclaration: every caller passes the lines, and a line that is no delimiter reads as no lines.
export function defects(fm, inPlugin, lines = []) {
  if (!fm) {
    if (inPlugin) return [];
    // markdownlint hands a rule no frontmatter both when anything precedes the opening delimiter and when nothing closes it, so the line the delimiter sits on is what says which happened.
    const at = lines.findIndex((l) => l.trim() !== "");
    if (at === 0 && /^---\s*$/.test(lines[0])) return ["the opening --- is never closed, so the file has no frontmatter and no name"];
    if (at > 0 && /^---\s*$/.test(lines[at]))
      return ["the opening --- is not the first line: Claude Code reads no frontmatter and skips the file as documentation"];
    return ["no name: Claude Code skips the file as documentation kept beside the agents"];
  }
  const doc = parsed(fm);
  // Frontmatter that does not parse is left to claude plugin validate, which reports it.
  if (doc.errors.length) return [];
  const value = doc.toJS();
  // Empty frontmatter parses to null, and it sets no name just as a mapping without one does.
  const mapping = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const specifiers = specifierDefects(mapping.disallowedTools);
  if (inPlugin)
    return [
      ...PLUGIN_IGNORES.filter((key) => Object.hasOwn(mapping, key)).map(
        (key) => `${key} is ignored in a plugin's agent: Claude Code loads the agent without it`,
      ),
      ...specifiers,
    ];
  const bad = [...specifiers];
  if (mapping.name === undefined || mapping.name === null) bad.push("no name: Claude Code skips the file as documentation kept beside the agents");
  else {
    const name = String(mapping.name);
    if (name.includes(":")) bad.push(`name ${JSON.stringify(name)} contains ":", which is reserved for plugin-scoped names, so Claude Code skips the file`);
    if (name.startsWith("-")) bad.push(`name ${JSON.stringify(name)} starts with "-", so Claude Code skips the file`);
    if (name.length > NAME_LIMIT) bad.push(`name is ${name.length} characters, over the ${NAME_LIMIT} Claude Code allows, so it skips the file`);
  }
  if (mapping.permissionMode === "bypassPermissions")
    bad.push("permissionMode: bypassPermissions does nothing in a subagent, which keeps the main conversation's mode instead");
  return bad;
}

function declaredName(fm) {
  if (!fm) return null;
  const doc = parsed(fm);
  if (doc.errors.length) return null;
  const name = doc.toJS()?.name;
  return name === undefined || name === null ? null : String(name);
}

// The shape defects reads, because a file opening any other way has no frontmatter and so declares no name.
function nameOnDisk(file) {
  let lines;
  try {
    lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  } catch {
    return null;
  }
  if (lines[0].trimEnd() !== "---") return null;
  const close = lines.findIndex((line, i) => i > 0 && line.trimEnd() === "---");
  return close < 0 ? null : declaredName(lines.slice(1, close));
}

// The tree is read from disk because a target rarely holds all of it, and a tree that cannot be listed compares nothing rather than stopping the run.
function duplicateNames(file, folder, fm) {
  const name = declaredName(fm);
  if (name === null) return [];
  let tree;
  try {
    tree = filesIn(folder);
  } catch {
    return [];
  }
  const others = tree
    .filter((other) => other.endsWith(".md") && other !== path.resolve(file) && nameOnDisk(other) === name)
    .map((other) => path.relative(folder, other))
    .sort();
  return others.length
    ? [
        `name ${JSON.stringify(name)} is also declared by ${others.join(", ")}: Claude Code loads only one of them from this .claude/agents folder, by read order`,
      ]
    : [];
}

// Only the length is warned on, because on Claude Code 2.1.310 a plugin's agent named "-x" or "a:b" loaded under that name, while one past 256 characters loaded under its file name.
export function pluginNameWarnings(fm) {
  const name = declaredName(fm);
  if (name === null) return [];
  const length = name.length;
  return length > NAME_LIMIT
    ? [`name is ${length} characters, over the ${NAME_LIMIT} Claude Code allows, so it loads the agent under its file name instead`]
    : [];
}

export const agentPluginName = {
  names: ["agent-plugin-name"],
  description: "A plugin's agent loads under the name its frontmatter gives it",
  tags: ["agents-guru"],
  parser: "none",
  function(params, onError) {
    if (agentFolder(params.name)?.kind !== "plugin") return;
    for (const detail of pluginNameWarnings(frontmatter(params))) onError({ lineNumber: FRONTMATTER_LINE, detail });
  },
};

export default {
  names: ["agent-frontmatter"],
  description: "An agent file's frontmatter is one Claude Code loads, and every field in it does what it says",
  tags: ["agents-guru"],
  parser: "none",
  function(params, onError) {
    const found = agentFolder(params.name);
    if (!found) return;
    const fm = frontmatter(params);
    const details = defects(fm, found.kind === "plugin", params.lines);
    if (found.kind === "standalone") details.push(...duplicateNames(params.name, found.folder, fm));
    for (const detail of details) onError({ lineNumber: FRONTMATTER_LINE, detail });
  },
};
