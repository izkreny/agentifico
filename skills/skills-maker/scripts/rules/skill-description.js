// The raw-line sweep workflows/check.md describes. SKILL.md owns the
// membership of the trap classes, under "YAML eats the description at `#`";
// this is where each one is decided.
import { BLOCK_SCALAR, FRONTMATTER_LINE, folded, frontmatter, isSkillFile, keyLines } from "./frontmatter.js";

// A comment after the closing quote sits outside the value, so it is not a
// defect; anything else there is a parse error.
const TRAILING = /^(\s+#.*)?$/;

export function defects(fm) {
  const bad = [];
  const dl = keyLines(fm, "description");
  if (!dl.length) bad.push("no description: never advertised");
  if (dl.length > 1) bad.push("duplicate description key: last silently wins");
  // The last `description:` line, because that is the one a last-wins parser
  // loads and therefore the only value whose traps can reach a reader;
  // skill-invocation reads its own fields the same way. Sweeping the first
  // line instead reports the duplicate and calls the winning value clean.
  // Anything judged against the value rather than against the line belongs to
  // skill-frontmatter-parsed, which has what a parser produced. Deciding it
  // here would mean measuring a value this rule is defined never to parse.
  const raw = (dl.at(-1) || "").slice(12).trim();
  const block = dl.length && BLOCK_SCALAR.test(raw);
  // The value under judgement, whatever its style, joined the way YAML folds a
  // run of continuation lines, a blank line among them included.
  // A continuation line can carry the same traps as the first, a quote may
  // close on it, and a legal fold is not a defect. `raw`, the winning key's
  // own line, decides which style the value has and carries the traps that
  // live on that line alone, a curly opening quote and a leading special
  // character.
  const value = dl.length ? folded(fm, fm.lastIndexOf(dl.at(-1))) : "";
  // Only a value that opens with a curly quote is pretending to be quoted; a
  // typographic apostrophe inside a value is harmless, and a block scalar is
  // immune to the whole family, so neither is a defect.
  if (!block && /^[“”‘’]/.test(raw)) bad.push("curly quotes are not YAML quotes");
  if (block) {
    // A block scalar reaches none of the style branches: it has no quotes to
    // close and no plain-scalar comment to be cut at. The checks it does reach
    // are the ones decided before this branch.
  } else if (raw.startsWith('"')) {
    // The value ends at its own closing quote, so a comment after it is outside
    // the value and not a defect; anything else after it is a parse error, and
    // an unescaped inner quote is the usual way that happens.
    const m = value.slice(1).match(/^((?:[^"\\]|\\.)*)"(.*)$/);
    if (!m) bad.push("unclosed double quote: parse error");
    else {
      if (/\\(?![\\"nt])/.test(m[1])) bad.push("risky backslash escape in double quotes");
      if (!TRAILING.test(m[2])) bad.push("text after the closing double quote, an unescaped inner double quote: parse error");
    }
  } else if (raw.startsWith("'")) {
    const m = value.slice(1).match(/^((?:[^']|'')*)'(.*)$/);
    if (!m || !TRAILING.test(m[2])) bad.push("stray apostrophe in single quotes, which must be doubled: parse error");
  } else if (dl.length) {
    const cut = value.search(/\s#/);
    if (cut >= 0) bad.push(`TRUNCATED at ' #', silently loses ${value.length - cut} chars`);
    if (/^[&*![{%@]/.test(raw)) bad.push(`leading ${raw[0]} changes meaning or is a parse error`);
    if (/:(\s|$)/.test(value)) bad.push("colon inside or ending an unquoted value: parse error");
    if (/^(yes|no|on|off|true|false|null|~)$/i.test(value)) bad.push("becomes boolean or null in some parsers");
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
