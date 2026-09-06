// What the frontmatter rules share, so each fact about reading a SKILL.md's
// frontmatter exists once: which files are skills, where the frontmatter is,
// what YAML makes of one raw scalar, and where the description's text is.
import path from "node:path";

// The frontmatter rules apply to a skill file and nothing else; the general lint
// and the continuation rule read every markdown file.
export const isSkillFile = (name) => path.basename(name) === "SKILL.md";

// markdownlint strips the frontmatter before tokenising and hands it over as
// raw lines, delimiters included. Rules read it as strings and never parse it,
// except the differential, whose whole job is to parse and compare.
export function frontmatter(params) {
  const lines = params.frontMatterLines;
  if (!lines.length) return null;
  const body = lines.slice(1);
  // The default frontmatter pattern lets the closing delimiter's `\s*` swallow
  // a blank line after it, so trailing blanks go before the delimiter does.
  while (body.length && body.at(-1).trim() === "") body.pop();
  if (/^---\s*$/.test(body.at(-1) ?? "")) body.pop();
  return body;
}

// A finding about the frontmatter is reported on the first body line, because
// markdownlint offsets every line number by the frontmatter's length and admits
// no line inside it; the detail names the key, which is what the reader needs.
export const FRONTMATTER_LINE = 1;

// Every raw line for one key. More than one is the last-wins trap.
export const keyLines = (fm, key) => fm.filter((l) => l.startsWith(`${key}:`));

// What YAML makes of one raw value, so a quoted value and a value carrying a
// trailing comment are compared by what they parse to rather than by their
// punctuation. The traps in how a value is quoted belong to the description
// rule; this only returns the value.
export function scalar(raw) {
  // A quoted value ends at its own closing quote, not at the end of the line,
  // so anything trailing it - a comment - is outside the value.
  if (raw.startsWith('"')) {
    const m = raw.slice(1).match(/^((?:[^"\\]|\\.)*)"/);
    if (m) return m[1].replace(/\\(.)/g, "$1");
  }
  if (raw.startsWith("'")) {
    const m = raw.slice(1).match(/^((?:[^']|'')*)'/);
    if (m) return m[1].replace(/''/g, "'");
  }
  // A plain scalar ends at the first ` #`, and YAML strips the space before it
  // however much there is, so the cut is trimmed rather than sliced raw.
  const cut = raw.search(/\s#/);
  return (cut >= 0 ? raw.slice(0, cut) : raw).trim();
}

// The description's text, whatever scalar style it uses.
export function description(fm) {
  const i = fm.findIndex((l) => l.startsWith("description:"));
  if (i < 0) return "";
  const raw = fm[i].slice(12).trim();
  if (!/^[|>][+-]?$/.test(raw)) return raw;
  const body = [];
  // A paragraph break inside a block scalar is an empty line, so the scalar
  // ends at the first non-empty line with no indent rather than at the first
  // line without one.
  for (let j = i + 1; j < fm.length && (fm[j] === "" || /^\s/.test(fm[j])); j++) body.push(fm[j]);
  return body.join("\n");
}
