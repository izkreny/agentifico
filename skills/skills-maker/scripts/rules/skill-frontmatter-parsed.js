import { FRONTMATTER_LINE, folded, frontmatter, isSkillFile, parsed } from "./frontmatter.js";

const TOP_LEVEL = /^([^\s:#][^:]*):/;

// A clipped block scalar keeps one trailing newline the style adds rather than the author, so a ceiling measured raw would depend on which style carries the text.
const authored = (v) => v.replace(/\n$/, "");

export function defects(fm) {
  const doc = parsed(fm);
  if (doc.errors.length) return [`PARSE ERROR, skill will not load: ${doc.errors[0].message.split("\n")[0]}`];
  const mapping = doc.toJS();
  if (mapping === null || typeof mapping !== "object") return ["frontmatter is not a mapping"];
  const bad = [];
  const d = mapping.description;
  if (d !== undefined && d !== null && typeof d !== "string") bad.push(`description is ${typeof d}, not a string`);
  // A bare key parses to null and a bodiless block scalar to the empty string, so both shapes of present-but-empty are tested.
  if (d === null || (typeof d === "string" && d.trim() === "")) bad.push("empty description: never advertised");
  // The ceiling is measured on the value rather than the line so the quote characters and a trailing comment are not counted.
  else if (typeof d === "string" && authored(d).length > 1024) bad.push(`description is ${authored(d).length} characters, over the spec's 1024`);
  const c = mapping.compatibility;
  if (typeof c === "string" && authored(c).length > 500) bad.push(`compatibility is ${authored(c).length} characters, over the spec's 500`);
  // Truncation at ` #` drops the tail of whatever key it lands in, and this package's own `compatibility` is that exact shape.
  const seen = new Set();
  for (let i = 0; i < fm.length; i++) {
    const m = TOP_LEVEL.exec(fm[i]);
    if (!m) continue;
    const key = m[1];
    // A duplicate key later is what a last-wins parser reads instead of the first line a reader believes, and that difference is the finding.
    if (seen.has(key)) continue;
    seen.add(key);
    const raw = fm[i].slice(key.length + 1).trim();
    // A quoted or block value is immune to the family, and an empty one begins on the following line with nothing on its own line to compare.
    if (raw === "" || /^[|>"']/.test(raw)) continue;
    const value = mapping[key];
    // A non-string value is `skill-invocation`'s, since a silent mutation is by definition a change to text.
    if (typeof value !== "string") continue;
    const plain = folded(fm, i);
    if (value !== plain) bad.push(`${key} SILENTLY MUTATED: raw line says ${JSON.stringify(plain)} but parses as ${JSON.stringify(value)}`);
  }
  return bad;
}

export default {
  names: ["skill-frontmatter-parsed"],
  description:
    "A skill's frontmatter parses, every top-level plain scalar parses to its raw line, the description is neither empty nor over the spec's ceiling, and compatibility is within its own",
  tags: ["skills-maker"],
  parser: "none",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    const fm = frontmatter(params);
    if (!fm) return;
    for (const detail of defects(fm)) onError({ lineNumber: FRONTMATTER_LINE, detail });
  },
};
