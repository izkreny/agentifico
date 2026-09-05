// A list item carries at most one continuation paragraph, and that paragraph
// is the item's reason; a continuation opening with a bolded lead-in is over
// the cap whatever its count. workflows/new.md owns the rule and its reason.
// Usage: node check-continuations.js [target]   (defaults to the current directory)
// The target is one skill's own directory, a directory of skills, or a package
// root whose skills sit further down - a plugin's at <root>/skills/.
// It is a script rather than a grep in the docs for the reason check-names.js
// gives: a pattern written as prose is a claim nothing runs and nothing tests,
// and the indent widths, the leading characters, the frontmatter and the code
// fences it would have to disclaim are all decided here instead, where
// scripts/test-checks.sh has a fixture for each.
// The block model below is a deliberate approximation of CommonMark, not a
// parser. A real one - remark, or any mdast producer - would give listItem
// nodes whose paragraph children could simply be counted, and would need none
// of the content-column arithmetic, fence tracking or frontmatter skipping
// here. It is hand-rolled only because this skill has so far shipped with no
// dependency beyond Node, and #101 is where that constraint is being lifted;
// until it lands, what the approximation costs is written as fixtures rather
// than claimed here, so a shape it decides wrongly is a fixture nobody has
// written yet.
const fs = require("fs"), path = require("path");
const { skills } = require("./walk.js");

const MARKER = /^(\s*)(?:[-*+]|\d+[.)])(\s+)\S/;
const FENCE = /^(\s*)(`{3,}|~{3,})/;

// Every markdown file under a skill, since a rule about prose applies wherever
// the skill keeps prose - SKILL.md, workflows/, references/ and anything else
// the author added. Dot-directories are skipped, as in the walk.
function markdown(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) markdown(p, out);
    else if (e.name.endsWith(".md")) out.push(p);
  }
}

// Blocks are what the rule counts, so the file is reduced to them first: a
// block is a maximal run of non-blank lines, carrying the indent of its first
// line and whether that line opens a list item. Frontmatter and fenced code
// never become blocks at all - a block scalar's continuation lines and a
// fence's body are the two shapes that look like an indented paragraph and are
// not one, and dropping them here is what stops them being a caveat later.
function blocks(text) {
  const lines = text.split("\n");
  let i = 0;
  if (lines[0] === "---") {
    i = 1;
    while (i < lines.length && lines[i] !== "---") i++;
    i++;
  }
  const out = [];
  let fence = null, cur = null;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (fence) {
      const close = line.match(FENCE);
      if (close && close[2][0] === fence.char && close[2].length >= fence.len && line.trim() === close[2]) fence = null;
      continue;
    }
    const open = line.match(FENCE);
    if (open) { fence = { char: open[2][0], len: open[2].length }; cur = null; continue; }
    if (!line.trim()) { cur = null; continue; }
    const m = line.match(MARKER);
    // A marker always opens a block, even with no blank line above it: these
    // files run a continuation paragraph straight into the next numbered item,
    // and swallowing the marker into that paragraph loses the item entirely.
    if (cur && !m) continue;
    cur = {
      line: i + 1,
      indent: line.match(/^\s*/)[0].length,
      // A continuation sits at the item's content column, which is where the
      // text after the marker begins - so the width follows the marker rather
      // than being fixed at two or three by whoever wrote the pattern.
      content: m ? m[1].length + line.slice(m[1].length).indexOf(m[2]) + m[2].length : null,
      bold: /^\s*\*\*/.test(line),
    };
    out.push(cur);
  }
  return out;
}

function defects(file, text) {
  const found = [];
  const bs = blocks(text);
  for (let i = 0; i < bs.length; i++) {
    const item = bs[i];
    if (item.content === null) continue;
    const conts = [];
    let nested = null;
    for (let j = i + 1; j < bs.length; j++) {
      const b = bs[j];
      // A block below the content column has left the item. A sibling marker
      // sits below it too, so this one test ends the item either way.
      if (b.indent < item.content) break;
      // A marker at or beyond the content column is a nested item: inside the
      // parent, so it neither ends the scan nor counts as a paragraph, and the
      // blocks at or beyond its own content column are its rather than the
      // parent's. The parent's scan resumes on the first block that comes
      // back out below that column.
      if (nested && b.indent >= nested.content) continue;
      nested = null;
      if (b.content !== null) { nested = b; continue; }
      conts.push(b);
    }
    for (const c of conts) if (c.bold) found.push({ line: c.line, why: "continuation opens with a bolded lead-in", file });
    if (conts.length > 1) found.push({ line: item.line, why: conts.length + " continuation paragraphs, cap is 1", file });
  }
  return found;
}

const { root, skills: list } = skills(process.argv[2]);
let bad = 0;
for (const s of list) {
  const files = [];
  markdown(s.dir, files);
  const found = [];
  for (const f of files) found.push(...defects(path.relative(s.dir, f), fs.readFileSync(f, "utf8")));
  const label = s.rel || ".";
  if (found.length) {
    bad++;
    for (const d of found) console.log(label.padEnd(30) + "  " + d.file + ":" + d.line + "  " + d.why);
  }
}
// Checking nothing is a failure, for the same reason as in the sibling sweeps:
// a target with no skill under it is a wrong target, and its silence reads
// exactly like a clean sweep.
if (!list.length) console.log("no SKILL.md found in " + root + ": nothing was checked");
else console.log(list.length + " skill(s) checked, " + bad + " with defects");
process.exitCode = (bad || !list.length) ? 1 : 0;
