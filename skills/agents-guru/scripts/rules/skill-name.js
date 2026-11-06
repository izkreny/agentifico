// The specification's charset and its 64-character ceiling are the half a name matching its directory can still fail.
import path from "node:path";
import { FRONTMATTER_LINE, frontmatter, isSkillFile, keyLines, scalar } from "./frontmatter.js";

const NAME_LIMIT = 64;

export function defects(fm, dir) {
  const [line] = keyLines(fm, "name");
  if (line === undefined) return ["no name: nothing can match it"];
  const declared = scalar(line.slice("name:".length).trim());
  const bad = [];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(declared)) bad.push(`name ${JSON.stringify(declared)} is not lowercase alphanumerics joined by single hyphens`);
  if (declared.length > NAME_LIMIT) bad.push(`name is ${declared.length} characters, over the spec's ${NAME_LIMIT}`);
  if (declared !== dir) bad.push(`name is ${JSON.stringify(declared)}, directory is ${JSON.stringify(dir)}`);
  return bad;
}

export default {
  names: ["skill-name"],
  description: "A skill's frontmatter name matches its directory",
  tags: ["agents-guru"],
  parser: "none",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    const dir = path.basename(path.dirname(path.resolve(params.name)));
    // Stryker disable next-line ArrayDeclaration: defects reads keys off the lines, and a line naming no key reads exactly as no lines.
    for (const detail of defects(frontmatter(params) ?? [], dir)) onError({ lineNumber: FRONTMATTER_LINE, detail });
  },
};
