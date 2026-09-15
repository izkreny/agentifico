import path from "node:path";
import { description, FRONTMATTER_LINE, frontmatter, isSkillFile, keyLines, scalar } from "./frontmatter.js";

// A field at its default relies on nothing, so only the other value triggers the description cross-check.
const FIELDS = { "disable-model-invocation": "false", "user-invocable": "true" };

// The name is bounded before and after by something no skill name contains, so another skill's command that this name only ends or only opens does not count.
export function statesPolicy(text, name) {
  const slash = new RegExp(`/(?:[\\w.-]+:)?${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`);
  return /invo[ck]|spawn/i.test(text) || slash.test(text);
}

export function defects(fm, name) {
  const bad = [];
  for (const [key, dflt] of Object.entries(FIELDS)) {
    const dl = keyLines(fm, key);
    if (!dl.length) continue;
    if (dl.length > 1) bad.push(`duplicate ${key} key: last silently wins`);
    const raw = dl
      .at(-1)
      .slice(key.length + 1)
      .trim();
    const value = scalar(raw);
    // `yes`, `on` and `True` are booleans in some parsers and strings in others, while a quoted value is a string in every parser.
    if (/^["']/.test(raw)) {
      bad.push(`${key} is quoted, so it is the string ${JSON.stringify(value)} rather than a boolean`);
      continue;
    }
    if (value !== "true" && value !== "false") {
      bad.push(`${key} is ${JSON.stringify(value)}, not true or false`);
      continue;
    }
    if (value !== dflt && !statesPolicy(description(fm), name)) {
      bad.push(`${key}: ${value} is a field other agents ignore, and the description says nothing about invocation`);
    }
  }
  return bad;
}

export default {
  names: ["skill-invocation"],
  description: "A skill's invocation fields are booleans, and a non-default one is stated in the description too",
  tags: ["skills-maker"],
  parser: "none",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    const name = path.basename(path.dirname(path.resolve(params.name)));
    for (const detail of defects(frontmatter(params) ?? [], name)) onError({ lineNumber: FRONTMATTER_LINE, detail });
  },
};
