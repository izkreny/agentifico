// Each fact about reading a SKILL.md's frontmatter is decided once here, because two rules disagreeing about what a value is would each be right about a different string.
import path from "node:path";
import { parseDocument } from "yaml";

export const isSkillFile = (name) => path.basename(name) === "SKILL.md";

export function frontmatter(params) {
  const lines = params.frontMatterLines;
  if (!lines.length) return null;
  const body = lines.slice(1);
  // The default frontmatter pattern lets the closing delimiter swallow a blank line after it, so trailing blanks go before the delimiter does.
  while (body.length && body.at(-1).trim() === "") body.pop();
  if (/^---\s*$/.test(body.at(-1) ?? "")) body.pop();
  return body;
}

// A frontmatter finding is reported on the first body line because markdownlint offsets every line number by the frontmatter's length and admits no line inside it.
export const FRONTMATTER_LINE = 1;

// Every line for a key is kept because more than one is the last-wins trap.
export const keyLines = (fm, key) => fm.filter((l) => l.startsWith(`${key}:`));

// YAML folds a line break between two content lines into a space and a run of n empty lines into n newlines, so a rule reading the first line alone would call a legal fold a truncation.
export function folded(fm, i) {
  const first = fm[i].slice(fm[i].indexOf(":") + 1).trim();
  const parts = [first];
  // A comment line ends a plain scalar and is ordinary text inside a quoted one, so the guard has to know which style it is reading.
  const quoted = /^["']/.test(first);
  // Empty lines are crossed rather than ended on because empty lines with no content line after them belong to no value.
  let blanks = 0;
  for (let j = i + 1; j < fm.length; j++) {
    if (fm[j].trim() === "") {
      blanks++;
      continue;
    }
    if (!/^\s+\S/.test(fm[j])) break;
    if (!quoted && fm[j].trim().startsWith("#")) break;
    parts.push(blanks ? "\n".repeat(blanks) : " ", fm[j].trim());
    blanks = 0;
  }
  return parts.join("");
}

// A quoted value and a value carrying a trailing comment are compared by what they parse to rather than by their punctuation.
export function scalar(raw) {
  if (raw.startsWith('"')) {
    const m = raw.slice(1).match(/^((?:[^"\\]|\\.)*)"/);
    if (m) return m[1].replace(/\\(.)/g, "$1");
  }
  if (raw.startsWith("'")) {
    const m = raw.slice(1).match(/^((?:[^']|'')*)'/);
    if (m) return m[1].replace(/''/g, "'");
  }
  // YAML strips the space before ` #` however much there is, so the cut is trimmed rather than sliced raw.
  const cut = raw.search(/\s#/);
  return (cut >= 0 ? raw.slice(0, cut) : raw).trim();
}

// YAML allows a chomping indicator and an indentation indicator in either order after the `|` or `>`, plus a comment, and a header this misses is read as a plain scalar and libelled with its traps.
export const BLOCK_SCALAR = /^[|>](?:[+-][1-9]?|[1-9][+-]?)?(?:\s+#.*)?$/;

// Version 1.1 is the reading under which `yes` becomes a boolean, and duplicate keys are allowed so the document parses the way the last-wins parsers an agent runs read it.
export const parsed = (fm) => parseDocument(fm.join("\n"), { version: "1.1", uniqueKeys: false });

// The parser's value rather than the lines', because chomping, folding, the indentation indicator and the last-wins duplicate key are the parser's to decide and a reimplementation agreed with it on `|-` alone.
export function description(fm) {
  const doc = parsed(fm);
  if (!doc.errors.length) {
    const value = doc.toJS()?.description;
    if (typeof value === "string") return value;
  }
  return rough(fm);
}

// Reached when the parser rejects the frontmatter or reads a non-string description, so it only has to hand `statesPolicy` something to match a word and a slash token in.
function rough(fm) {
  const i = fm.findIndex((l) => l.startsWith("description:"));
  if (i < 0) return "";
  const raw = fm[i].slice(12).trim();
  if (!BLOCK_SCALAR.test(raw)) return folded(fm, i);
  const body = [];
  // A paragraph break inside a block scalar is an empty line, so the scalar ends at the first non-empty line with no indent.
  for (let j = i + 1; j < fm.length && (fm[j] === "" || /^\s/.test(fm[j])); j++) body.push(fm[j]);
  return body.join("\n");
}
