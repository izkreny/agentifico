// The directory match is the half a reader expects; the specification's
// charset and its 64-character ceiling are the half a matching name can still
// fail, which is why both live here rather than in the sweep's own reading.
import path from "node:path";
import { FRONTMATTER_LINE, frontmatter, isSkillFile, keyLines, scalar } from "./frontmatter.js";

export function defects(fm, dir) {
  const line = keyLines(fm, "name")[0];
  if (line === undefined) return ["no name: nothing can match it"];
  const declared = scalar(line.slice(5).trim());
  const bad = [];
  // Why the directory match cannot decide the charset: workflows/check.md.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(declared)) bad.push(`name ${JSON.stringify(declared)} is not lowercase alphanumerics joined by single hyphens`);
  if (declared.length > 64) bad.push(`name is ${declared.length} characters, over the spec's 64`);
  if (declared !== dir) bad.push(`name is ${JSON.stringify(declared)}, directory is ${JSON.stringify(dir)}`);
  return bad;
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
