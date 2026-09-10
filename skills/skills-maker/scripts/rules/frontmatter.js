// What the frontmatter rules share, so each fact about reading a SKILL.md's
// frontmatter is decided once. A second copy of any of it drifts, and two
// rules disagreeing about what a value is would each be right about a
// different string, which is how a check comes to libel YAML that loads.
import path from "node:path";
import { parseDocument } from "yaml";

// The frontmatter rules apply to a skill file and nothing else; the general lint
// and the continuation rule read every markdown file.
export const isSkillFile = (name) => path.basename(name) === "SKILL.md";

// markdownlint strips the frontmatter before tokenising and hands it over as
// raw lines, delimiters included. Rules read it as strings; `parsed` below is
// the one reading of it as YAML, which the differential compares those strings
// against and which `description` returns to its caller.
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

// More than one line for a key is the last-wins trap, so every one is kept
// rather than the first.
export const keyLines = (fm, key) => fm.filter((l) => l.startsWith(`${key}:`));

// A plain or quoted scalar may continue on indented lines, and YAML folds a
// line break between two content lines into a space and a run of n empty lines
// between them into n newlines; a rule reading the first line alone would call
// a legal fold a truncation, and would miss a policy stated on the second line.
// Empty lines are crossed rather than ended on, and their newlines are written
// by the content line that arrives, because empty lines with no content line
// after them belong to no value: the scalar had already ended at the last one
// that carried text.
export function folded(fm, i) {
  const first = fm[i].slice(fm[i].indexOf(":") + 1).trim();
  const parts = [first];
  // A comment line ends a plain scalar, so it is not folded in; inside a quoted
  // one the same line is ordinary text, and a guard that did not ask which style
  // it was reading would cut a quoted value short of its own closing quote.
  const quoted = /^["']/.test(first);
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

// A block scalar's header line. YAML allows a chomping indicator and an
// indentation indicator in either order after the `|` or `>`, plus a comment,
// so a header this misses is read as a plain scalar instead and libelled with
// the plain scalar's own traps on YAML that loads correctly.
export const BLOCK_SCALAR = /^[|>](?:[+-][1-9]?|[1-9][+-]?)?(?:\s+#.*)?$/;

// One reading of the frontmatter as YAML, so two rules can never disagree
// about which parser they meant. Version 1.1 is the reading under which `yes`
// becomes a boolean, which is the trap the differential exists to catch, and
// duplicate keys are allowed so the document parses the way the last-wins
// parsers an agent actually runs read it.
export const parsed = (fm) => parseDocument(fm.join("\n"), { version: "1.1", uniqueKeys: false });

// The string a caller is given, read here because reading a description out of
// the frontmatter is a frontmatter concern rather than the business of whichever
// rule wants it. It is the parser's value rather than the lines': chomping, folding, the indentation indicator and the last-wins
// duplicate key are all the parser's to decide, and a reimplementation of them
// here agreed with it on `|-` alone. `folded` above stays raw because the
// differential compares it against this reading; a caller matching or
// measuring the description wants what the agent will be handed.
export function description(fm) {
  const doc = parsed(fm);
  if (!doc.errors.length) {
    const value = doc.toJS()?.description;
    if (typeof value === "string") return value;
  }
  return rough(fm);
}

// Only for frontmatter the parser rejected, where the differential is already
// reporting that the skill will not load at all. Its one consumer matches a
// word and a slash token, so neither the indentation nor the line endings
// change its answer, and a dedent-and-chomp implementation here would rebuild
// exactly what asking the parser removed.
function rough(fm) {
  const i = fm.findIndex((l) => l.startsWith("description:"));
  if (i < 0) return "";
  const raw = fm[i].slice(12).trim();
  if (!BLOCK_SCALAR.test(raw)) return folded(fm, i);
  const body = [];
  // A paragraph break inside a block scalar is an empty line, so the scalar
  // ends at the first non-empty line with no indent rather than at the first
  // line without one.
  for (let j = i + 1; j < fm.length && (fm[j] === "" || /^\s/.test(fm[j])); j++) body.push(fm[j]);
  return body.join("\n");
}
