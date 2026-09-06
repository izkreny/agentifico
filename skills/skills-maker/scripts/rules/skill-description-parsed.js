// The differential: parse the frontmatter with a real YAML parser and compare
// the parsed description against the raw line. Any difference on a plain
// scalar means a silent trap fired; a parse error means the skill will not
// load at all. It supplements the raw sweep rather than replacing it, since the
// silent traps are valid YAML and a parser returns the corrupted value happily.
import { parseDocument } from "yaml";
import { FRONTMATTER_LINE, frontmatter, isSkillFile, keyLines } from "./frontmatter.js";

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
  // The first line is the one a reader believes; a duplicate key later is what
  // a last-wins parser reads instead, and the difference is the finding.
  const raw = (keyLines(fm, "description")[0] || "").slice(12).trim();
  // Only a plain scalar is compared: a quoted or block value is immune, and an
  // absent one is the raw sweep's finding.
  if (raw === "" || /^[|>"']/.test(raw)) return bad;
  if (d !== raw) bad.push(`SILENTLY MUTATED: raw line says ${JSON.stringify(raw)} but parses as ${JSON.stringify(d)}`);
  return bad;
}

export default {
  names: ["skill-description-parsed"],
  description: "A skill's frontmatter parses, and its description parses to the raw line",
  tags: ["skills-maker"],
  parser: "none",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    const fm = frontmatter(params);
    if (!fm) return;
    for (const detail of defects(fm)) onError({ lineNumber: FRONTMATTER_LINE, detail });
  },
};
