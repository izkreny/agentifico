import { FRONTMATTER_LINE, frontmatter, isSkillFile, keyLines, scalar } from "./frontmatter.js";

// https://code.claude.com/docs/en/skills scopes `agent` to `context: fork`, and a skill without it runs inline with the field ignored and nothing said.
const value = (fm, key) => {
  const last = keyLines(fm, key).at(-1);
  return last === undefined ? undefined : scalar(last.slice(key.length + 1).trim());
};

export function defects(fm) {
  if (value(fm, "agent") === undefined || value(fm, "context") === "fork") return [];
  return ["agent does nothing without context: fork, so the skill runs inline"];
}

export default {
  names: ["skill-fork"],
  description: "A skill that names an agent also sets context: fork, the only context that agent applies to",
  tags: ["skills-guru"],
  parser: "none",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    for (const detail of defects(frontmatter(params) ?? [])) onError({ lineNumber: FRONTMATTER_LINE, detail });
  },
};
