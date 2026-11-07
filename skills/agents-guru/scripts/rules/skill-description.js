import { BLOCK_SCALAR, FRONTMATTER_LINE, folded, frontmatter, isSkillFile, keyLines, scalar } from "./frontmatter.js";

// A comment after the closing quote sits outside the value, so it is not a defect, and anything else there is a parse error.
const TRAILING = /^(\s+#.*)?$/;
// WHY: the platform's skills guide bars an XML tag from a description, at https://platform.claude.com/docs/en/build-with-claude/skills-guide.
const XML_TAG = /<\/?[A-Za-z][^<>]*>/;

export function defects(fm) {
  const bad = [];
  const dl = keyLines(fm, "description");
  if (!dl.length) bad.push("no description: never advertised");
  if (dl.length > 1) bad.push("duplicate description key: last silently wins");
  // The last `description:` line is swept because that is the one a last-wins parser loads, and sweeping the first would report the duplicate and call the winning value clean.
  // Stryker disable next-line StringLiteral: with no description line, no fallback opens with a quote
  const raw = (dl.at(-1) || "").slice(12).trim();
  const block = dl.length && BLOCK_SCALAR.test(raw);
  // The value is joined the way YAML folds continuation lines because a continuation can carry the same traps as the first line and a legal fold is not a defect.
  // Stryker disable next-line StringLiteral: with no description line, no fallback holds an XML tag
  const value = dl.length ? folded(fm, fm.lastIndexOf(dl.at(-1))) : "";
  // Only a value opening with a curly quote is pretending to be quoted, since an apostrophe inside a value is harmless and a block scalar is immune.
  if (!block && /^[“”‘’]/.test(raw)) bad.push("curly quotes are not YAML quotes");
  if (block) {
    // A block scalar has no quotes to close and no plain-scalar comment to be cut at, so it reaches none of the style branches.
  } else if (raw.startsWith('"')) {
    // Anything after the closing quote but a comment is a parse error, and an unescaped inner quote is the usual way that happens.
    const m = value.slice(1).match(/^((?:[^"\\]|\\.)*)"(.*)$/);
    if (!m) bad.push("unclosed double quote: parse error");
    else {
      if (/\\(?![\\"nt])/.test(m[1])) bad.push("risky backslash escape in double quotes");
      if (!TRAILING.test(m[2])) bad.push("text after the closing double quote, an unescaped inner double quote: parse error");
    }
  } else if (raw.startsWith("'")) {
    const m = value.slice(1).match(/^((?:[^']|'')*)'(.*)$/);
    if (!m || !TRAILING.test(m[2])) bad.push("stray apostrophe in single quotes, which must be doubled: parse error");
  } else if (
    // Stryker disable next-line ConditionalExpression: with no description line the value is empty, and an empty value passes every plain-scalar test.
    dl.length
  ) {
    const cut = value.search(/\s#/);
    // Stryker disable next-line EqualityOperator: a value opens on a non-space character or on a folded line that cannot open with #, so a cut is never at 0.
    if (cut >= 0) bad.push(`TRUNCATED at ' #', silently loses ${value.length - cut} chars`);
    if (/^[&*![{%@]/.test(raw)) bad.push(`leading ${raw[0]} changes meaning or is a parse error`);
    if (/:(\s|$)/.test(value)) bad.push("colon inside or ending an unquoted value: parse error");
    if (/^(yes|no|on|off|true|false|null|~)$/i.test(value)) bad.push("becomes boolean or null in some parsers");
  }
  if (XML_TAG.test(block ? value : scalar(value)))
    bad.push("an XML tag in the description, which the platform's skills guide bars: write a placeholder in square brackets or in argument-hint");
  return bad;
}

export default {
  names: ["skill-description"],
  description: "A skill's frontmatter description carries none of the YAML traps that truncate it or make the skill vanish",
  tags: ["agents-guru"],
  parser: "none",
  function(params, onError) {
    if (!isSkillFile(params.name)) return;
    // Stryker disable next-line ArrayDeclaration: defects reads keys off the lines, and a line naming no key reads exactly as no lines.
    const fm = frontmatter(params) ?? [];
    for (const detail of defects(fm)) onError({ lineNumber: FRONTMATTER_LINE, detail });
  },
};
