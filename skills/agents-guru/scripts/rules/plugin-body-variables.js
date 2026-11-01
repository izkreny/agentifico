// WHY: what each form does in a plugin's content is the manifest reference's, at https://code.claude.com/docs/en/plugins/manifest-reference.
import fs from "node:fs";
import path from "node:path";
import { agentFolder } from "./agent-frontmatter.js";
import { isSkillFile } from "./frontmatter.js";

const BARE = /\$(CLAUDE_PLUGIN_ROOT|CLAUDE_PLUGIN_DATA|CLAUDE_PROJECT_DIR)\b/g;

// WHY: the manifest is asked for by name because a marketplace's root holds a .claude-plugin folder too, above skills that belong to no plugin.
function inPlugin(file) {
  let dir = path.dirname(path.resolve(file));
  for (let up = path.dirname(dir); up !== dir; dir = up, up = path.dirname(dir))
    if (fs.existsSync(path.join(dir, ".claude-plugin", "plugin.json"))) return true;
  return false;
}

export default {
  names: ["plugin-body-variables"],
  description: "A plugin's skill or agent body writes a path variable in the form Claude Code substitutes",
  tags: ["agents-guru"],
  parser: "none",
  function(params, onError) {
    if (isSkillFile(params.name) ? !inPlugin(params.name) : agentFolder(params.name)?.kind !== "plugin") return;
    params.lines.forEach((line, i) => {
      for (const [bare, name] of line.matchAll(BARE))
        onError({
          lineNumber: i + 1,
          detail: `${bare} is not substituted here, and the Bash tool's environment lacks it: write \${${name}}`,
          context: line.trim(),
        });
    });
  },
};
