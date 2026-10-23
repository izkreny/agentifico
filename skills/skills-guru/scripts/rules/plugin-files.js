// Each limit is the hooks page's or the plugins reference's, at https://code.claude.com/docs/en/hooks and https://code.claude.com/docs/en/plugins/manifest-reference.
import fs from "node:fs";
import path from "node:path";
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

const REPLACES = [
  ["commands", "commands"],
  ["agents", "agents"],
  ["outputStyles", "output-styles"],
  ["workflows", "workflows"],
  ["experimental.themes", "themes"],
  ["experimental.monitors", "monitors/monitors.json"],
];

const HEADER_VARIABLE = /\$\{([A-Za-z_]\w*)\}|\$([A-Za-z_]\w*)/g;

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

const pairOf = (map, key) => (YAML.isMap(map) ? map.items.find((pair) => pair.key?.value === key) : undefined);
const itemsOf = (node) => (YAML.isSeq(node) || YAML.isMap(node) ? node.items : []);

export function hooksDefects(source) {
  const file = read(source);
  if (!file) return [];
  const found = [];
  const report = (pair, detail) => found.push({ line: file.lineOf(pair.key), detail });
  const events = pairOf(file.root, "hooks")?.value;
  if (!YAML.isMap(events)) return found;
  for (const { key, value: groups } of events.items) {
    for (const group of itemsOf(groups)) {
      const matcher = pairOf(group, "matcher");
      if (matcher && NO_MATCHER.has(key.value)) report(matcher, `matcher on ${key.value} is silently ignored: the event has no matcher support`);
      for (const hook of itemsOf(pairOf(group, "hooks")?.value)) {
        if (!YAML.isMap(hook)) continue;
        const type = hook.get("type");
        const async = pairOf(hook, "async");
        if (async && type !== "command") report(async, `async on a ${type} hook is ignored: it is available on command hooks only`);
        const once = pairOf(hook, "once");
        if (once) report(once, "once is ignored in a plugin's hooks file: Claude Code honours it only in a skill's frontmatter");
        const headers = pairOf(hook, "headers");
        const allowed = new Set(itemsOf(hook.get("allowedEnvVars", true)).map((item) => item.value));
        for (const header of itemsOf(headers?.value)) {
          if (typeof header.value?.value !== "string") continue;
          for (const [, braced, bare] of header.value.value.matchAll(HEADER_VARIABLE))
            if (!allowed.has(braced ?? bare))
              report(header, `header ${header.key.value} names ${braced ?? bare}, which allowedEnvVars does not list, so it is sent empty`);
        }
        const command = pairOf(hook, "command");
        if (type === "command" && !pairOf(hook, "args") && String(command?.value?.value).includes(`\${user_config.`))
          report(command, `command names \${user_config.*} in shell form, so the hook fails instead of running: set args, or read $CLAUDE_PLUGIN_OPTION_<KEY>`);
      }
    }
  }
  return found;
}

const holdsFiles = (location) => {
  const stat = fs.statSync(location, { throwIfNoEntry: false });
  if (!stat) return false;
  // A symlink is stated through, because a Dirent reports the link rather than the file it points at.
  const isFile = (entry) =>
    entry.isFile() || (entry.isSymbolicLink() && fs.statSync(path.join(entry.parentPath, entry.name), { throwIfNoEntry: false })?.isFile());
  return stat.isFile() || fs.readdirSync(location, { recursive: true, withFileTypes: true }).some(isFile);
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

export function manifestDefects(source, pluginDir) {
  const file = read(source);
  if (!file) return [];
  const found = [];
  for (const [key, folder] of REPLACES) {
    const segments = key.split(".");
    const pair = pairOf(segments.length > 1 ? pairOf(file.root, segments[0])?.value : file.root, segments.at(-1));
    if (!pair) continue;
    const location = path.join(pluginDir, folder);
    if (!holdsFiles(location)) continue;
    // A path inside the default location keeps it loaded, which the plugins reference names as the way to silence Claude Code's own warning.
    const keeps = pathsOf(pair.value?.toJSON()).some((p) => {
      const resolved = path.resolve(pluginDir, p);
      return resolved === location || resolved.startsWith(location + path.sep);
    });
    const shown = folder.endsWith(".json") ? folder : `${folder}/`;
    if (!keeps) found.push({ line: file.lineOf(pair.key), detail: `${key} replaces the default ${shown}, which still holds files Claude Code now ignores` });
  }
  return found;
}
