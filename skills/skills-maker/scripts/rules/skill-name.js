// Every skill's frontmatter `name` must match its own directory.
import path from "node:path";
import { FRONTMATTER_LINE, frontmatter, isSkillFile, keyLines, scalar } from "./frontmatter.js";

export function defects(fm, dir) {
  const line = keyLines(fm, "name")[0];
  if (line === undefined) return ["no name: nothing can match it"];
  const declared = scalar(line.slice(5).trim());
  if (declared !== dir) return [`name is ${JSON.stringify(declared)}, directory is ${JSON.stringify(dir)}`];
  return [];
}

export default {
  names: ["skill-name"],
  description: "A skill's frontmatter name matches its directory",
  tags: ["skills-maker"],
  parser: "none",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    const dir = path.basename(path.dirname(path.resolve(params.name)));
    for (const detail of defects(frontmatter(params) ?? [], dir)) onError({ lineNumber: FRONTMATTER_LINE, detail });
  },
};
