// Each limit is the sub-agents page's or the plugin components page's, at https://code.claude.com/docs/en/sub-agents and https://code.claude.com/docs/en/plugins/components.
import fs from "node:fs";
import path from "node:path";
import { built, FRONTMATTER_LINE, frontmatter, parsed, unbuilt } from "./frontmatter.js";
import { byCodeUnit } from "./order.js";
import { isPluginRoot } from "./plugin-files.js";

const PLUGIN_IGNORES = ["permissionMode", "hooks", "mcpServers", "initialPrompt"];
const NAME_LIMIT = 256;

// WHY: a specifier can hold a comma, as in Agent(a, b), so entries are matched in the text rather than split on commas.
const SPECIFIED = /[^\s,()]+\([^)]*\)?/gu;

const specifierDefects = (value) =>
  [value]
    .flat()
    .filter((entry) => typeof entry === "string")
    .flatMap((entry) => entry.match(SPECIFIED) ?? [])
    .map((entry) => `disallowedTools entry ${JSON.stringify(entry)} removes the whole tool, not only what it names: a permissions.deny rule blocks only that`);

// WHY: claude plugin validate 2.1.318 reads name: 2026-11-06 as the text written, so an agent's frontmatter is read without YAML 1.1's timestamp tag.
const UNTIMED = { customTags: (tags) => tags.filter((tag) => tag.tag !== "tag:yaml.org,2002:timestamp") };

// WHY: a binary builds to an object, yet validate passes it as a name and rejects a mapping, a list or a set.
const nameText = (name) => (typeof name === "object" && !(name instanceof Uint8Array) ? null : String(name));

function declaredName(fm) {
  if (!fm) {
    return null;
  }
  const doc = parsed(fm, UNTIMED);
  if (doc.errors.length > 0) {
    return null;
  }
  const name = built(doc).value?.name;
  return name === undefined || name === null ? null : nameText(name);
}

// WHY: markdownlint drops a BOM before the judged file reaches this rule, so a sibling has to lose one too.
function nameInText(text) {
  const lines = text.replace(/^\uFEFF/u, "").split(/\r?\n/u);
  if (lines[0].trimEnd() !== "---") {
    return null;
  }
  const close = lines.findIndex((line, i) => i > 0 && line.trimEnd() === "---");
  // Stryker disable next-line EqualityOperator: the search starts past line 0, so close is never 0.
  return close < 0 ? null : declaredName(lines.slice(1, close));
}

// WHY: one entry that cannot be read should cost the comparison that entry alone.
function agentFilesIn(folder) {
  const files = [];
  const unread = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      // WHY: a folder that is not there holds no names, which is every fixture markdownlint is handed as a string.
      if (error.code !== "ENOENT") {
        unread.push([dir, error.code]);
      }
      return;
    }
    for (const entry of entries) {
      // WHY: the sub-agents page does not say Claude Code reads a dot-named entry.
      if (entry.name.startsWith(".")) {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".md")) {
        continue;
      }
      if (entry.isFile()) {
        files.push(full);
      } else if (
        // Stryker disable next-line ConditionalExpression: any other entry ending in .md, such as a pipe, stats as no file, so it is skipped either way.
        entry.isSymbolicLink()
      ) {
        try {
          if (fs.statSync(full, { throwIfNoEntry: false })?.isFile()) {
            files.push(full);
          }
        } catch (error) {
          unread.push([full, error.code]);
        }
      }
    }
  };
  walk(folder);
  return { files, unread };
}

// WHY: a target rarely holds the whole tree, so it is read from disk.
function duplicateNames(file, folder, fm) {
  const name = declaredName(fm);
  if (name === null) {
    return [];
  }
  const { files, unread } = agentFilesIn(folder);
  const others = [];
  for (const other of files.filter((candidate) => candidate !== path.resolve(file))) {
    let text;
    try {
      text = fs.readFileSync(other, "utf8");
    } catch (error) {
      unread.push([other, error.code]);
      continue;
    }
    if (nameInText(text) === name) {
      others.push(other);
    }
  }
  const relative = (entry) => path.relative(folder, entry) || ".";
  // WHY: a clean run would otherwise claim a comparison that never happened.
  const details = unread
    .map(([entry, code]) => [relative(entry), code])
    .sort(byCodeUnit)
    .map(([entry, code]) => `could not read ${entry} (${code}), so the name ${JSON.stringify(name)} was not compared with it`);
  if (others.length > 0) {
    details.unshift(
      `name ${JSON.stringify(name)} is also declared by ${others.map(relative).sort(byCodeUnit).join(", ")}: Claude Code loads only one of them from this .claude/agents folder, by read order`,
    );
  }
  return details;
}

// The nearest agents folder decides, because both kinds of agents directory are scanned recursively.
export function agentFolder(file) {
  const parts = path.resolve(file).split(path.sep);
  // Stryker disable next-line ArithmeticOperator,EqualityOperator: past the folder the path holds only the file's own .md name, and before it only the empty root segment, so neither end is ever agents.
  for (let i = parts.length - 2; i > 0; i -= 1) {
    if (parts[i] !== "agents") {
      continue;
    }
    const folder = parts.slice(0, i + 1).join(path.sep);
    if (parts[i - 1] === ".claude") {
      return { kind: "standalone", folder };
    }
    if (isPluginRoot(parts.slice(0, i).join(path.sep) || path.sep)) {
      return { kind: "plugin", folder };
    }
  }
  return null;
}

// Stryker disable next-line ArrayDeclaration: every caller passes the lines, and a line that is no delimiter reads as no lines.
export function defects(fm, inPlugin, lines = []) {
  if (!fm) {
    if (inPlugin) {
      return [];
    }
    // markdownlint hands a rule no frontmatter both when anything precedes the opening delimiter and when nothing closes it, so the line the delimiter sits on is what says which happened.
    const at = lines.findIndex((l) => l.trim() !== "");
    // Stryker disable next-line ConditionalExpression: when the first line that is not blank is not line 0, line 0 is blank and is no delimiter.
    if (at === 0 && /^---\s*$/u.test(lines[0])) {
      return ["the opening --- is never closed, so the file has no frontmatter and no name"];
    }
    // Stryker disable next-line ConditionalExpression,EqualityOperator: line 0 holding a delimiter has already returned, and with no line that is not blank there is no line at to test.
    if (at > 0 && /^---\s*$/u.test(lines[at])) {
      return ["the opening --- is not the first line: Claude Code reads no frontmatter and skips the file as documentation"];
    }
    return ["no name: Claude Code skips the file as documentation kept beside the agents"];
  }
  const doc = parsed(fm, UNTIMED);
  // Frontmatter that does not parse is left to claude plugin validate, which reports it.
  if (doc.errors.length > 0) {
    return [];
  }
  const { value, error } = built(doc);
  if (error) {
    return [unbuilt(error)];
  }
  // Empty frontmatter parses to null, and it sets no name just as a mapping without one does.
  // Stryker disable next-line ConditionalExpression: a string, number or boolean holds none of the keys read off the mapping, just as {} does
  const mapping = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const specifiers = specifierDefects(mapping.disallowedTools);
  if (inPlugin) {
    return [
      ...PLUGIN_IGNORES.filter((key) => Object.hasOwn(mapping, key)).map(
        (key) => `${key} is ignored in a plugin's agent: Claude Code loads the agent without it`,
      ),
      ...specifiers,
    ];
  }
  const bad = [...specifiers];
  if (mapping.name === undefined || mapping.name === null) {
    bad.push("no name: Claude Code skips the file as documentation kept beside the agents");
  } else {
    const name = nameText(mapping.name);
    if (name === null) {
      bad.push("name must be a string, not a mapping or a list: claude plugin validate rejects it");
    } else {
      if (name.includes(":")) {
        bad.push(`name ${JSON.stringify(name)} contains ":", which is reserved for plugin-scoped names, so Claude Code skips the file`);
      }
      if (name.startsWith("-")) {
        bad.push(`name ${JSON.stringify(name)} starts with "-", so Claude Code skips the file`);
      }
      if (name.length > NAME_LIMIT) {
        bad.push(`name is ${name.length} characters, over the ${NAME_LIMIT} Claude Code allows, so it skips the file`);
      }
    }
  }
  if (mapping.permissionMode === "bypassPermissions") {
    bad.push("permissionMode: bypassPermissions does nothing in a subagent, which keeps the main conversation's mode instead");
  }
  return bad;
}

// Only the length is warned on, because on Claude Code 2.1.310 a plugin's agent named "-x" or "a:b" loaded under that name, while one past 256 characters loaded under its file name.
export function pluginNameWarnings(fm) {
  const name = declaredName(fm);
  if (name === null) {
    return [];
  }
  const { length } = name;
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
    if (agentFolder(params.name)?.kind !== "plugin") {
      return;
    }
    for (const detail of pluginNameWarnings(frontmatter(params))) {
      onError({ lineNumber: FRONTMATTER_LINE, detail });
    }
  },
};

export default {
  names: ["agent-frontmatter"],
  description: "An agent file's frontmatter is one Claude Code loads, and every field in it does what it says",
  tags: ["agents-guru"],
  parser: "none",
  function(params, onError) {
    const found = agentFolder(params.name);
    if (!found) {
      return;
    }
    const fm = frontmatter(params);
    const details = defects(fm, found.kind === "plugin", params.lines);
    if (found.kind === "standalone") {
      details.push(...duplicateNames(params.name, found.folder, fm));
    }
    for (const detail of details) {
      onError({ lineNumber: FRONTMATTER_LINE, detail });
    }
  },
};
