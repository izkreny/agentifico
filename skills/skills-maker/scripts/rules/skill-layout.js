// The search stops at the target so a skill above the tree being checked is never reported as enclosing one inside it.
import fs from "node:fs";
import path from "node:path";
import { FRONTMATTER_LINE, isSkillFile } from "./frontmatter.js";

export function enclosingSkill(file, root) {
  const stop = path.resolve(root);
  let dir = path.dirname(path.dirname(path.resolve(file)));
  // A plain prefix test puts /a/bc inside /a/b, and the filesystem root already ends in the separator, so a second one is not appended.
  const prefix = stop.endsWith(path.sep) ? stop : stop + path.sep;
  const inside = (d) => d === stop || d.startsWith(prefix);
  while (inside(dir)) {
    if (fs.existsSync(path.join(dir, "SKILL.md"))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

export default {
  names: ["skill-layout"],
  description: "A SKILL.md sits in no other skill's directory",
  tags: ["skills-maker"],
  parser: "none",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    const outer = enclosingSkill(params.name, params.config.root ?? process.cwd());
    if (outer)
      onError({ lineNumber: FRONTMATTER_LINE, detail: `a SKILL.md inside the skill at ${outer}: agents that discover recursively read it as a broken skill` });
  },
};
