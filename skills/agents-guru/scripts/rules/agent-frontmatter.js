// Each limit is the sub-agents page's or the plugin components page's, at https://code.claude.com/docs/en/sub-agents and https://code.claude.com/docs/en/plugins/components.
import path from "node:path";
import { FRONTMATTER_LINE, frontmatter, parsed } from "./frontmatter.js";
import { isPluginRoot } from "./plugin-files.js";

const PLUGIN_IGNORES = ["permissionMode", "hooks", "mcpServers", "initialPrompt"];
const NAME_LIMIT = 256;

// The nearest agents folder decides, because both kinds of agents directory are scanned recursively.
export function agentKind(file) {
  const parts = path.resolve(file).split(path.sep);
  for (let i = parts.length - 2; i > 0; i--) {
    if (parts[i] !== "agents") continue;
    if (parts[i - 1] === ".claude") return "standalone";
    if (isPluginRoot(parts.slice(0, i).join(path.sep) || path.sep)) return "plugin";
  }
  return null;
}

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
  if (inPlugin)
    return PLUGIN_IGNORES.filter((key) => Object.hasOwn(mapping, key)).map(
      (key) => `${key} is ignored in a plugin's agent: Claude Code loads the agent without it`,
    );
  const bad = [];
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

// Only the length is warned on, because on Claude Code 2.1.310 a plugin's agent named "-x" or "a:b" loaded under that name, while one past 256 characters loaded under its file name.
export function pluginNameWarnings(fm) {
  if (!fm) return [];
  const doc = parsed(fm);
  if (doc.errors.length) return [];
  const name = doc.toJS()?.name;
  if (name === undefined || name === null) return [];
  const length = String(name).length;
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
    if (agentKind(params.name) !== "plugin") return;
    for (const detail of pluginNameWarnings(frontmatter(params))) onError({ lineNumber: FRONTMATTER_LINE, detail });
  },
};

export default {
  names: ["agent-frontmatter"],
  description: "An agent file's frontmatter is one Claude Code loads, and sets no field it ignores",
  tags: ["agents-guru"],
  parser: "none",
  function(params, onError) {
    const kind = agentKind(params.name);
    if (!kind) return;
    for (const detail of defects(frontmatter(params), kind === "plugin", params.lines)) onError({ lineNumber: FRONTMATTER_LINE, detail });
  },
};
