// Each limit is the sub-agents page's or the plugin components page's, at https://code.claude.com/docs/en/sub-agents and https://code.claude.com/docs/en/plugins/components.
import fs from "node:fs";
import path from "node:path";
import { FRONTMATTER_LINE, frontmatter, parsed } from "./frontmatter.js";

const PLUGIN_IGNORES = ["permissionMode", "hooks", "mcpServers", "initialPrompt"];

// The nearest agents folder decides, because both kinds of agents directory are scanned recursively.
export function agentKind(file) {
  const parts = path.resolve(file).split(path.sep);
  for (let i = parts.length - 2; i > 0; i--) {
    if (parts[i] !== "agents") continue;
    if (parts[i - 1] === ".claude") return "standalone";
    const plugin = path.join(parts.slice(0, i).join(path.sep) || path.sep, ".claude-plugin");
    if (fs.statSync(plugin, { throwIfNoEntry: false })?.isDirectory()) return "plugin";
  }
  return null;
}

export function defects(fm, inPlugin, lines = []) {
  if (!fm) {
    if (inPlugin) return [];
    // markdownlint hands a rule no frontmatter when anything precedes the opening delimiter, which is the shape Claude Code reads as none either.
    const first = lines.find((l) => l.trim() !== "");
    if (first !== undefined && /^---\s*$/.test(first))
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
    if (name.length > 256) bad.push(`name is ${name.length} characters, over the 256 Claude Code allows, so it skips the file`);
  }
  if (mapping.permissionMode === "bypassPermissions")
    bad.push("permissionMode: bypassPermissions does nothing in a subagent, which keeps the main conversation's mode instead");
  return bad;
}

export default {
  names: ["agent-frontmatter"],
  description: "An agent file's frontmatter is one Claude Code loads, and sets no field it ignores",
  tags: ["skills-guru"],
  parser: "none",
  function(params, onError) {
    const kind = agentKind(params.name);
    if (!kind) return;
    for (const detail of defects(frontmatter(params), kind === "plugin", params.lines)) onError({ lineNumber: FRONTMATTER_LINE, detail });
  },
};
