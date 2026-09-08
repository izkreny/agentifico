// The differential workflows/check.md describes: this is where the comparison
// and the shapes it leaves alone are decided.
import { parseDocument } from "yaml";
import { FRONTMATTER_LINE, folded, frontmatter, isSkillFile } from "./frontmatter.js";

// A key at zero indent, which is what separates a mapping's own entries from
// the indented lines belonging to a nested value.
const TOP_LEVEL = /^([^\s:#][^:]*):/;

export function defects(fm) {
  // YAML 1.1 is the reading under which `yes` becomes a boolean, which is the
  // trap this exists to catch; under 1.2 it is a string and could never fail.
  // Duplicate keys are allowed so the document parses the way the last-wins
  // parsers read it, which is what the raw sweep reports as the trap.
  const doc = parseDocument(fm.join("\n"), { version: "1.1", uniqueKeys: false });
  if (doc.errors.length) return [`PARSE ERROR, skill will not load: ${doc.errors[0].message.split("\n")[0]}`];
  const parsed = doc.toJS();
  if (parsed === null || typeof parsed !== "object") return ["frontmatter is not a mapping"];
  const bad = [];
  const d = parsed.description;
  if (d !== undefined && d !== null && typeof d !== "string") bad.push(`description is ${typeof d}, not a string`);
  // A present key whose value is empty advertises exactly as much as an absent
  // one and is the worse of the two, because it reads as present to anyone
  // scanning the frontmatter. Judged here rather than in the raw sweep because
  // every empty shape - a bare key, a bodiless block scalar, "" and a
  // whitespace-only value - is the same value only once a parser has read it.
  // A bare key parses to null and a bodiless block scalar to the empty string,
  // so both shapes of present-but-empty are tested rather than only the second.
  if (d === null || (typeof d === "string" && d.trim() === "")) bad.push("empty description: never advertised");
  // The specification's ceiling, on the value rather than on the line, so the
  // quote characters and a trailing comment are not counted into it.
  else if (typeof d === "string" && d.length > 1024) bad.push(`description is ${d.length} characters, over the spec's 1024`);
  // Truncation at ` #` is not a description-only trap. The same edit anywhere
  // in the frontmatter drops the tail of whatever key it lands in, and this
  // package's own `compatibility` is that exact shape: a long plain scalar
  // whose tail carries a requirement.
  const seen = new Set();
  for (let i = 0; i < fm.length; i++) {
    const m = TOP_LEVEL.exec(fm[i]);
    if (!m) continue;
    const key = m[1];
    // The first line is the one a reader believes; a duplicate key later is
    // what a last-wins parser reads instead, and that difference is the
    // finding rather than a second comparison that would always agree.
    if (seen.has(key)) continue;
    seen.add(key);
    const raw = fm[i].slice(key.length + 1).trim();
    // A quoted or block value is immune to the whole family. An empty one means
    // the text begins on the following line, so this key's own line carries
    // nothing to compare it against.
    if (raw === "" || /^[|>"']/.test(raw)) continue;
    const value = parsed[key];
    // A value the parser did not read as text belongs to another rule:
    // `skill-invocation` owns the booleans, and a silent mutation is by
    // definition a change to text.
    if (typeof value !== "string") continue;
    const plain = folded(fm, i);
    if (value !== plain) bad.push(`${key} SILENTLY MUTATED: raw line says ${JSON.stringify(plain)} but parses as ${JSON.stringify(value)}`);
  }
  return bad;
}

export default {
  names: ["skill-frontmatter-parsed"],
  description:
    "A skill's frontmatter parses, every top-level plain scalar parses to its raw line, and the description is neither empty nor over the spec's ceiling",
  tags: ["skills-maker"],
  parser: "none",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    const fm = frontmatter(params);
    if (!fm) return;
    for (const detail of defects(fm)) onError({ lineNumber: FRONTMATTER_LINE, detail });
  },
};
