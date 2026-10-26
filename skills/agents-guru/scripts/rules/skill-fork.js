import { FRONTMATTER_LINE, frontmatter, isSkillFile, parsed } from "./frontmatter.js";

// https://code.claude.com/docs/en/skills scopes `agent` to `context: fork`, and a skill without it runs inline with the field ignored and nothing said.
export function defects(fm) {
  const doc = parsed(fm);
  // Frontmatter that does not parse is `skill-frontmatter-parsed`'s, which reports it already.
  if (doc.errors.length) return [];
  const mapping = doc.toJS();
  if (mapping === null || typeof mapping !== "object" || !("agent" in mapping) || mapping.context === "fork") return [];
  return ["agent does nothing without context: fork, so the skill runs inline"];
}

export default {
  names: ["skill-fork"],
  description: "A skill that names an agent also sets context: fork, the only context that agent applies to",
  tags: ["agents-guru"],
  parser: "none",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    for (const detail of defects(frontmatter(params) ?? [])) onError({ lineNumber: FRONTMATTER_LINE, detail });
  },
};
