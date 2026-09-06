// A SKILL.md with another SKILL.md in an ancestor directory is a skill inside a
// skill. Some agents discover skills recursively and would read it as a broken
// skill, so an example quoted inside a skill's own tree is a finding rather
// than something the discovery tolerates. The search stops at the target the
// check was run over, which check.js passes as `root`; without one it stops at
// the working directory.
import fs from "node:fs";
import path from "node:path";
import { FRONTMATTER_LINE, isSkillFile } from "./frontmatter.js";

export function enclosingSkill(file, root) {
  const stop = path.resolve(root);
  let dir = path.dirname(path.dirname(path.resolve(file)));
  while (dir.startsWith(stop) && dir.length >= stop.length) {
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
