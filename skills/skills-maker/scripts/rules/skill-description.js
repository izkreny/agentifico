// Raw-line sweep over a skill's frontmatter description. A real YAML parser
// cannot replace it: the silent traps are valid YAML, so a parser returns the
// corrupted value without complaint. SKILL.md owns the membership of the trap
// classes, under "YAML eats the description at `#`"; this is where each is
// decided.
import { FRONTMATTER_LINE, folded, frontmatter, isSkillFile, keyLines } from "./frontmatter.js";

// What may follow a closing quote: nothing, or a comment.
const TRAILING = /^(\s+#.*)?$/;

export function defects(fm) {
  const bad = [];
  const dl = keyLines(fm, "description");
  if (!dl.length) bad.push("no description: never advertised");
  if (dl.length > 1) bad.push("duplicate description key: last silently wins");
  const raw = (dl[0] || "").slice(12).trim();
  const block = dl.length && /^[|>][+-]?$/.test(raw);
  // A plain or quoted scalar is judged on its folded value: a continuation line
  // can carry the same traps as the first, a quote may close on it, and a legal
  // fold is not a defect.
  const plain = dl.length ? folded(fm, fm.indexOf(dl[0])) : "";
  // Only a value that opens with a curly quote is pretending to be quoted; a
  // typographic apostrophe inside a value is harmless, and a block scalar is
  // immune to the whole family, so neither is a defect.
  if (!block && /^[“”‘’]/.test(raw)) bad.push("curly quotes are not YAML quotes");
  if (block) {
    // block scalar: immune to every trap below
  } else if (raw.startsWith('"')) {
    // The value ends at its own closing quote, so a comment after it is outside
    // the value and not a defect; anything else after it is a parse error, and
    // an unescaped inner quote is the usual way that happens.
    const m = plain.slice(1).match(/^((?:[^"\\]|\\.)*)"(.*)$/);
    if (!m) bad.push("unclosed double quote: parse error");
    else {
      if (/\\(?![\\"nt])/.test(m[1])) bad.push("risky backslash escape in double quotes");
      if (!TRAILING.test(m[2])) bad.push("text after the closing double quote, an unescaped inner double quote: parse error");
    }
  } else if (raw.startsWith("'")) {
    const m = plain.slice(1).match(/^((?:[^']|'')*)'(.*)$/);
    if (!m || !TRAILING.test(m[2])) bad.push("stray apostrophe in single quotes, which must be doubled: parse error");
  } else if (dl.length) {
    const cut = plain.search(/\s#/);
    if (cut >= 0) bad.push(`TRUNCATED at ' #', silently loses ${plain.length - cut} chars`);
    if (/^[&*![{%@]/.test(raw)) bad.push(`leading ${raw[0]} changes meaning or is a parse error`);
    if (/:(\s|$)/.test(plain)) bad.push("colon inside or ending an unquoted value: parse error");
    if (/^(yes|no|on|off|true|false|null|~)$/i.test(plain)) bad.push("becomes boolean or null in some parsers");
  }
  return bad;
}

export default {
  names: ["skill-description"],
  description: "A skill's frontmatter description carries none of the YAML traps that truncate it or make the skill vanish",
  tags: ["skills-maker"],
  parser: "none",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    const fm = frontmatter(params) ?? [];
    for (const detail of defects(fm)) onError({ lineNumber: FRONTMATTER_LINE, detail });
  },
};
