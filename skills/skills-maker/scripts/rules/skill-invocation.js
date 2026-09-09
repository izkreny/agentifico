// The frontmatter fields that decide who may invoke a skill. Both are Claude
// Code extensions that other agents ignore silently, so a skill relying on
// either has to state the same policy in its description, and that is the
// defect worth more than a bad value: a bad value misbehaves the first time it
// is tried, a policy held only by the field works exactly as intended on one
// agent and is wide open on every other.
import path from "node:path";
import { description, FRONTMATTER_LINE, frontmatter, isSkillFile, keyLines, scalar } from "./frontmatter.js";

// Each field with the value it defaults to; a field at its default relies on
// nothing, so only the other value triggers the description cross-check.
const FIELDS = { "disable-model-invocation": "false", "user-invocable": "true" };

// Whether the description says anything about invocation at all: the word
// itself, spawning, or the skill's own slash command, bare or under a plugin
// prefix ending in a colon - never another skill's command that this name only
// ends or only opens, so the name is bounded on both sides by something no
// skill name contains. Whether what it says matches the field is the
// reviewer's to judge; this only catches the description that is silent.
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
    // Lowercase true and false are what every parser reads as a boolean. yes,
    // on and True are booleans in some parsers and strings in others, so a
    // policy written that way holds on some agents; a quoted value is a string
    // in every parser, whatever it spells.
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
